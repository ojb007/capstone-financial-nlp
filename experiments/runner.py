"""
실험 러너 (runner.py)
=====================
API 호출, 배치 처리, 중간 저장, 비용/지연 추적을 담당.

Codex audit 반영:
- 🔴1: RAG 미연동 시 C/E/F 차단 또는 rag_active=false 태깅
- 🔴4: 완전한 prompt/context/rag_context 낙반, 로그만 截断
- 🟡1: checkpoint 추가 쓰기 + 나쁜 행 내성
- 🟡2: 오류 유형 분류 + 지수 퇴피 + jitter
- 🟡3: 미사용 asyncio/BATCH_SIZE 삭제
- 🟡9: avg_latency 분모를 유효 latency 수로 수정
"""

import sys
import json
import time
import random
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# 프로젝트 루트를 sys.path에 추가 (backend 패키지 import용)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from config import (
    MODELS, EXPERIMENT_GROUPS, DATASETS, OUTPUT_DIR,
    RETRY_MAX, RETRY_BASE_DELAY, RETRY_MAX_WAIT, SAVE_EVERY,
    COST_PER_1K_TOKENS, PRICING_VERSION,
    OPENAI_API_KEY, HF_TOKEN,
)
from data_loader import load_dataset, format_for_experiment
from prompts import build_prompt

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════
# API 클라이언트
# ══════════════════════════════════════════════

class LLMClient:
    """OpenAI API 클라이언트 (A/B/C군)."""

    def __init__(self, model_key: str):
        self.model_cfg = MODELS[model_key]
        self.provider = self.model_cfg["provider"]
        self.model_name = self.model_cfg["model_name"]
        self.temperature = self.model_cfg["temperature"]
        self.max_tokens = self.model_cfg["max_tokens"]
        self.timeout = self.model_cfg.get("timeout", 60)
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.provider == "openai":
            try:
                from openai import OpenAI
                self._client = OpenAI(
                    api_key=OPENAI_API_KEY,
                    timeout=self.timeout,
                )
            except ImportError:
                logger.warning("openai 패키지 미설치. pip install openai")

    def call(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        단건 API 호출.
        Returns: {response, latency_ms, input_tokens, output_tokens, error, error_type}
        """
        if self._client is None:
            return {
                "response": "",
                "latency_ms": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "error": f"Client not initialized for {self.provider}",
                "error_type": "client_init",
            }

        start = time.perf_counter()
        try:
            completion = self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                max_completion_tokens=self.max_tokens,
            )
            elapsed = (time.perf_counter() - start) * 1000

            usage = completion.usage
            return {
                "response": completion.choices[0].message.content.strip(),
                "latency_ms": round(elapsed, 2),
                "input_tokens": usage.prompt_tokens if usage else 0,
                "output_tokens": usage.completion_tokens if usage else 0,
                "error": None,
                "error_type": None,
            }
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            error_type = _classify_error(e)
            return {
                "response": "",
                "latency_ms": round(elapsed, 2),
                "input_tokens": 0,
                "output_tokens": 0,
                "error": str(e),
                "error_type": error_type,
            }

    def call_with_retry(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """오류 유형별 지수 퇴피 + jitter 재시도."""
        for attempt in range(RETRY_MAX):
            result = self.call(messages)
            if result["error"] is None:
                return result

            error_type = result["error_type"]

            # 4xx (인증/파라미터 오류) → 재시도 무의미
            if error_type == "auth_error" or error_type == "bad_request":
                logger.error(f"비재시도 오류: {result['error']}")
                return result

            # 429 / 5xx / timeout → 재시도
            logger.warning(
                f"API 오류 (시도 {attempt+1}/{RETRY_MAX}, 유형={error_type}): "
                f"{result['error']}"
            )
            if attempt < RETRY_MAX - 1:
                delay = min(
                    RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 1),
                    RETRY_MAX_WAIT,
                )
                time.sleep(delay)

        return result  # 마지막 시도 결과


class LocalHFClient:
    """로컬 transformers 추론 클라이언트 (F군 QLoRA 파인튜닝 모델)."""

    def __init__(self, model_id: str, max_tokens: int = 512):
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        from peft import PeftModel, PeftConfig

        token = HF_TOKEN or None
        if token:
            from huggingface_hub import login as _hf_login
            _hf_login(token=token, add_to_git_credential=False)

        logger.info(f"HF 모델 로딩 (LoRA 어댑터): {model_id}")
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_id, trust_remote_code=True
        )

        # adapter_config.json에서 베이스 모델 ID 파악
        peft_cfg = PeftConfig.from_pretrained(model_id)
        base_model_id = peft_cfg.base_model_name_or_path
        logger.info(f"베이스 모델: {base_model_id}")

        base = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True,
        )

        # EXAONE 커스텀 모델의 get_input_embeddings를 PEFT가 찾을 수 있도록 패치
        try:
            _embed = base.model.embed_tokens
            base.get_input_embeddings = lambda: _embed
            base.set_input_embeddings = lambda x: setattr(base.model, "embed_tokens", x)
        except AttributeError:
            pass

        self.model = PeftModel.from_pretrained(base, model_id)
        self.model.eval()
        self.max_tokens = max_tokens
        logger.info(f"모델 로딩 완료: {model_id}")

    def call(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        import torch

        try:
            text = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
        except Exception:
            text = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in messages
            ) + "\nASSISTANT:"

        inputs = self.tokenizer(text, return_tensors="pt").to(self.model.device)
        input_len = inputs["input_ids"].shape[1]

        start = time.perf_counter()
        try:
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=self.max_tokens,
                    do_sample=False,
                    pad_token_id=self.tokenizer.eos_token_id,
                )
            elapsed = (time.perf_counter() - start) * 1000
            generated_ids = outputs[0][input_len:]
            response = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            return {
                "response": response,
                "latency_ms": round(elapsed, 2),
                "input_tokens": input_len,
                "output_tokens": len(generated_ids),
                "error": None,
                "error_type": None,
            }
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            return {
                "response": "",
                "latency_ms": round(elapsed, 2),
                "input_tokens": input_len,
                "output_tokens": 0,
                "error": str(e),
                "error_type": "inference_error",
            }

    def call_with_retry(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        return self.call(messages)


def _classify_error(e: Exception) -> str:
    """예외를 분류하여 재시도 여부 결정에 사용."""
    error_str = str(e).lower()
    error_class = type(e).__name__

    if "rate" in error_str or "429" in error_str or "too many" in error_str:
        return "rate_limit"
    elif "timeout" in error_str or "timed out" in error_str:
        return "timeout"
    elif "500" in error_str or "502" in error_str or "503" in error_str:
        return "server_error"
    elif "401" in error_str or "auth" in error_str or "api key" in error_str:
        return "auth_error"
    elif "400" in error_str or "invalid" in error_str:
        return "bad_request"
    elif "connection" in error_str:
        return "connection_error"
    else:
        return "unknown"


# ══════════════════════════════════════════════
# 실험 실행기
# ══════════════════════════════════════════════

class ExperimentRunner:
    """단일 실험 (실험군 × 데이터셋) 실행."""

    def __init__(
        self,
        group_name: str,
        dataset_name: str,
        split: Optional[str] = None,
        dry_run: bool = False,
        dry_run_n: int = 5,
        allow_rag_placeholder: bool = False,
    ):
        self.group = EXPERIMENT_GROUPS[group_name]
        self.dataset_name = dataset_name
        self.dataset_cfg = DATASETS[dataset_name]
        self.split = split
        self.dry_run = dry_run
        self.dry_run_n = dry_run_n
        self.allow_rag_placeholder = allow_rag_placeholder

        # 🔴1: RAG 연동 확인 (import 성공 여부로 판단)
        self.rag_active = False
        if self.group.use_rag and not self.allow_rag_placeholder:
            try:
                from backend.app.services.vector_store import search as _rag_check  # noqa: F401
            except Exception as e:
                raise RuntimeError(
                    f"실험군 {group_name}은 RAG가 필요하지만 RAG 파이프라인 임포트 실패: {e}. "
                    f"FAISS 인덱스가 빌드되었는지 확인하세요."
                ) from e

        self.experiment_id = f"{group_name}_{dataset_name}"
        self.output_dir = OUTPUT_DIR / self.experiment_id
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if self.group.use_finetuning:
            model_cfg = MODELS[self.group.model]
            self.client = LocalHFClient(
                model_id=model_cfg["model_name"],
                max_tokens=model_cfg.get("max_tokens", 512),
            )
        else:
            self.client = LLMClient(self.group.model)
        self.results: List[Dict[str, Any]] = []
        self.total_cost = 0.0

        # 체크포인트에서 이어서 실행 (resume)
        self._completed_ids = set()
        self._load_checkpoint()

    def _load_checkpoint(self):
        """중간 저장 파일이 있으면 이미 완료된 ID를 로드. 🟡1: 나쁜 행 내성."""
        checkpoint_file = self.output_dir / "predictions.jsonl"
        if checkpoint_file.exists():
            bad_lines = 0
            with open(checkpoint_file, "r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        self._completed_ids.add(rec["id"])
                        self.results.append(rec)
                    except (json.JSONDecodeError, KeyError) as e:
                        bad_lines += 1
                        logger.warning(
                            f"[{self.experiment_id}] 체크포인트 {line_num}행 손상, 건너뜀: {e}"
                        )
            if bad_lines:
                logger.warning(
                    f"[{self.experiment_id}] 체크포인트 {bad_lines}행 손상 발견, "
                    f"{len(self._completed_ids)}건 정상 복원"
                )
            elif self._completed_ids:
                logger.info(
                    f"[{self.experiment_id}] 체크포인트 발견: "
                    f"{len(self._completed_ids)}건 이미 완료, 이어서 실행"
                )

    def run(self) -> Dict[str, Any]:
        """실험 실행 메인."""
        logger.info(f"\n{'='*60}")
        logger.info(f"실험 시작: {self.experiment_id}")
        logger.info(f"  실험군: {self.group.name} — {self.group.description}")
        logger.info(f"  데이터셋: {self.dataset_name} — {self.dataset_cfg['description']}")
        logger.info(f"  모델: {self.group.model}")
        logger.info(f"  전략: {self.group.strategy}")
        logger.info(f"  RAG: {'활성' if self.rag_active else '비활성 (placeholder)'}")
        logger.info(f"{'='*60}")

        # 데이터 로드
        records = load_dataset(self.dataset_name, split=self.split)
        if self.dry_run:
            records = records[:self.dry_run_n]
            logger.info(f"[DRY RUN] {self.dry_run_n}건만 실행")

        total = len(records)
        skipped = 0
        processed = 0
        errors = 0
        start_time = time.time()

        # 🟡1: 추가 쓰기 모드로 checkpoint 파일 열기
        checkpoint_file = self.output_dir / "predictions.jsonl"
        with open(checkpoint_file, "a", encoding="utf-8") as ckpt_f:
            for i, record in enumerate(records):
                record_id = record["id"]

                # 이미 완료된 건은 스킵
                if record_id in self._completed_ids:
                    skipped += 1
                    continue

                # 입력 데이터 변환
                formatted = format_for_experiment(record, self.dataset_name)

                # RAG 컨텍스트 (C/E/F군)
                rag_context = None
                if self.group.use_rag:
                    rag_context = self._get_rag_context(formatted)

                # 프롬프트 생성
                messages = build_prompt(
                    strategy=self.group.strategy,
                    dataset_name=self.dataset_name,
                    input_text=formatted["input_text"],
                    context=formatted["context"],
                    rag_context=rag_context,
                    few_shot_n=self.group.few_shot_n,
                )

                # API 호출
                api_result = self.client.call_with_retry(messages)

                # 🔴4: 완전한 데이터 낙반 (로그만 截断)
                prediction_record = {
                    "id": record_id,
                    "experiment": self.experiment_id,
                    "group": self.group.name,
                    "dataset": self.dataset_name,
                    "model": self.group.model,
                    "strategy": self.group.strategy,
                    "input_text": formatted["input_text"],     # 전체 보존
                    "context": formatted["context"],           # FinQA 테이블 등 전체
                    "choices": formatted.get("choices"),       # MMLU 선택지
                    "rag_context": rag_context,                # RAG 검색 결과
                    "rag_active": self.rag_active,             # 🔴1
                    "gold_label": formatted["gold_label"],
                    "prediction": api_result["response"],
                    "latency_ms": api_result["latency_ms"],
                    "input_tokens": api_result["input_tokens"],
                    "output_tokens": api_result["output_tokens"],
                    "error": api_result["error"],
                    "error_type": api_result.get("error_type"),
                    "prompt_messages": messages,               # 전체 프롬프트 보존
                    "timestamp": datetime.now().isoformat(),
                }

                # 비용 계산
                cost_info = COST_PER_1K_TOKENS.get(self.group.model, {})
                item_cost = (
                    api_result["input_tokens"] * cost_info.get("input", 0) / 1000
                    + api_result["output_tokens"] * cost_info.get("output", 0) / 1000
                )
                prediction_record["cost_usd"] = round(item_cost, 6)
                prediction_record["pricing_version"] = PRICING_VERSION
                self.total_cost += item_cost

                self.results.append(prediction_record)
                self._completed_ids.add(record_id)
                processed += 1
                if api_result["error"]:
                    errors += 1

                # 🟡1: 즉시 추가 쓰기
                ckpt_f.write(json.dumps(prediction_record, ensure_ascii=False) + "\n")
                if processed % SAVE_EVERY == 0:
                    ckpt_f.flush()

                # 진행 로그 (input_text 截断은 로그 표시에서만)
                if processed % 50 == 0 or processed == 1:
                    elapsed = time.time() - start_time
                    rate = processed / elapsed if elapsed > 0 else 0
                    remaining = (total - skipped - processed) / rate if rate > 0 else 0
                    logger.info(
                        f"  [{self.experiment_id}] "
                        f"{processed + skipped}/{total} "
                        f"({processed} new, {skipped} resumed) "
                        f"| {rate:.1f} req/s "
                        f"| ETA {remaining/60:.1f}min "
                        f"| cost ${self.total_cost:.4f}"
                    )

        elapsed_total = time.time() - start_time

        # 🟡9: avg_latency 분모를 유효 latency 수로 수정
        valid_latencies = [r["latency_ms"] for r in self.results if r.get("latency_ms") and not r.get("error")]
        avg_latency = round(sum(valid_latencies) / len(valid_latencies), 2) if valid_latencies else 0

        # 요약
        summary = {
            "experiment_id": self.experiment_id,
            "group": self.group.name,
            "dataset": self.dataset_name,
            "model": self.group.model,
            "strategy": self.group.strategy,
            "rag_active": self.rag_active,
            "total_records": total,
            "processed": processed,
            "skipped_resumed": skipped,
            "errors": errors,
            "total_cost_usd": round(self.total_cost, 4),
            "pricing_version": PRICING_VERSION,
            "total_time_sec": round(elapsed_total, 2),
            "avg_latency_ms": avg_latency,
            "timestamp": datetime.now().isoformat(),
        }

        summary_path = self.output_dir / "summary.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        logger.info(f"\n✅ 실험 완료: {self.experiment_id}")
        logger.info(f"   처리: {processed}건 | 오류: {errors}건 | 비용: ${self.total_cost:.4f}")
        logger.info(f"   RAG: {'활성' if self.rag_active else '비활성'}")
        logger.info(f"   출력: {self.output_dir}")

        return summary

    def _get_rag_context(self, formatted: Dict[str, Any]) -> Optional[str]:
        """FAISS 벡터 스토어에서 유사 문서 검색."""
        from backend.app.services.vector_store import search
        results = search(formatted["input_text"], top_k=3)
        self.rag_active = True
        return "\n\n".join(r.page_content for r in results) if results else None


# ══════════════════════════════════════════════
# 일괄 실행 헬퍼
# ══════════════════════════════════════════════

def run_experiment(
    group: str,
    dataset: str,
    split: Optional[str] = None,
    dry_run: bool = False,
    dry_run_n: int = 5,
    allow_rag_placeholder: bool = False,
) -> Dict[str, Any]:
    """단일 실험 실행 래퍼."""
    # 데이터셋에 default_split 설정이 있으면 적용 (명시적 split 우선)
    if split is None:
        split = DATASETS.get(dataset, {}).get("default_split", None)
        if split:
            logger.info(f"[{group}_{dataset}] default_split 적용: {split}")

    runner = ExperimentRunner(
        group_name=group,
        dataset_name=dataset,
        split=split,
        dry_run=dry_run,
        dry_run_n=dry_run_n,
        allow_rag_placeholder=allow_rag_placeholder,
    )
    return runner.run()


def run_all_experiments(
    groups: Optional[List[str]] = None,
    datasets: Optional[List[str]] = None,
    split: Optional[str] = None,
    dry_run: bool = False,
    dry_run_n: int = 5,
    allow_rag_placeholder: bool = False,
) -> List[Dict[str, Any]]:
    """다중 실험 일괄 실행."""
    groups = groups or list(EXPERIMENT_GROUPS.keys())
    datasets = datasets or list(DATASETS.keys())

    summaries = []
    total = len(groups) * len(datasets)
    count = 0

    for g in groups:
        for d in datasets:
            count += 1
            logger.info(f"\n🔬 실험 {count}/{total}: {g}_{d}")
            try:
                summary = run_experiment(
                    group=g, dataset=d, split=split,
                    dry_run=dry_run, dry_run_n=dry_run_n,
                    allow_rag_placeholder=allow_rag_placeholder,
                )
                summaries.append(summary)
            except Exception as e:
                logger.error(f"❌ 실험 실패: {g}_{d} — {e}")
                summaries.append({
                    "experiment_id": f"{g}_{d}",
                    "error": str(e),
                })

    # 전체 요약 저장
    all_summary_path = OUTPUT_DIR / "all_experiments_summary.json"
    with open(all_summary_path, "w", encoding="utf-8") as f:
        json.dump(summaries, f, indent=2, ensure_ascii=False)

    logger.info(f"\n{'='*60}")
    logger.info(f"🏁 전체 실험 완료: {len(summaries)}/{total}")
    logger.info(f"   요약: {all_summary_path}")

    return summaries
