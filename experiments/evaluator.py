"""
평가기 (evaluator.py)
=====================
실험 결과 평가: Accuracy, F1 (macro/micro/weighted), LLM Judge, 비용, 지연.

Codex audit 반영:
- 🔴2: _normalize_label 엄격 매칭, 실패 시 __unparseable__
- 🔴3: MMLU-KO 엄격 첫 행/답변 패턴 파싱
- 🟡4: FinQA 수치 비교 강화 (%, 통화, yes/no 분리)
- 🟡6: LLM Judge 고정 seed + 샘플 id 낙반
- 🟡10: Judge 분수 파싱 엄격화 + parse_error 기록
"""

import json
import re
import logging
import time
import random as _random
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import Counter

from config import (
    DATASETS, OUTPUT_DIR, RANDOM_SEED,
    LLM_JUDGE_MODEL, LLM_JUDGE_TEMPERATURE, LLM_JUDGE_MAX_TOKENS,
    OPENAI_API_KEY,
)
from prompts import build_llm_judge_prompt

logger = logging.getLogger(__name__)

UNPARSEABLE = "__unparseable__"


# ══════════════════════════════════════════════
# 핵심 지표 계산
# ══════════════════════════════════════════════

def compute_metrics(
    predictions: List[Dict[str, Any]],
    dataset_name: str,
) -> Dict[str, Any]:
    """예측 결과에서 전체 평가 지표 산출."""
    task_type = DATASETS[dataset_name]["task_type"]

    valid = [p for p in predictions if not p.get("error")]
    if not valid:
        return {"error": "No valid predictions", "total": len(predictions)}

    if task_type in ("classification", "multiple_choice"):
        metrics = _compute_classification_metrics(valid, dataset_name)
    elif task_type == "qa":
        metrics = _compute_qa_metrics(valid)
    else:
        metrics = {}

    # 공통 지표
    metrics["total_samples"] = len(predictions)
    metrics["valid_samples"] = len(valid)
    metrics["error_count"] = len(predictions) - len(valid)

    # 지연 (ms)
    latencies = [p["latency_ms"] for p in valid if p.get("latency_ms")]
    if latencies:
        sorted_lat = sorted(latencies)
        metrics["avg_latency_ms"] = round(sum(latencies) / len(latencies), 2)
        metrics["p50_latency_ms"] = round(sorted_lat[len(sorted_lat) // 2], 2)
        metrics["p95_latency_ms"] = round(sorted_lat[int(len(sorted_lat) * 0.95)], 2)
        metrics["max_latency_ms"] = round(max(latencies), 2)

    # 비용
    costs = [p.get("cost_usd", 0) for p in valid]
    metrics["total_cost_usd"] = round(sum(costs), 4)
    metrics["cost_per_item_usd"] = round(sum(costs) / max(len(costs), 1), 6)

    return metrics


# ──────────────────────────────────────────────
# 분류 지표 (FPB, FiQA-SA, MMLU-KO)
# ──────────────────────────────────────────────

def _compute_classification_metrics(
    predictions: List[Dict], dataset_name: str
) -> Dict[str, Any]:
    """Accuracy + F1 (macro/micro/weighted) + 클래스별 P/R/F1."""
    labels_list = DATASETS[dataset_name]["labels"]

    golds = []
    preds = []
    for p in predictions:
        gold = _normalize_label(str(p["gold_label"]), dataset_name)
        pred = _normalize_label(str(p["prediction"]), dataset_name)
        golds.append(gold)
        preds.append(pred)

    # Accuracy
    correct = sum(1 for g, p in zip(golds, preds) if g == p)
    accuracy = correct / len(golds) if golds else 0

    # unparseable 통계
    unparseable_count = sum(1 for p in preds if p == UNPARSEABLE)

    # 클래스별 TP, FP, FN
    all_labels = set(labels_list) | set(golds) | set(preds)
    per_class = {}
    for label in all_labels:
        if label == UNPARSEABLE:
            continue
        tp = sum(1 for g, p in zip(golds, preds) if g == label and p == label)
        fp = sum(1 for g, p in zip(golds, preds) if g != label and p == label)
        fn = sum(1 for g, p in zip(golds, preds) if g == label and p != label)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall) > 0
            else 0
        )

        per_class[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": sum(1 for g in golds if g == label),
        }

    # Macro F1
    f1_values = [per_class[l]["f1"] for l in labels_list if l in per_class]
    f1_macro = sum(f1_values) / len(f1_values) if f1_values else 0

    # Micro F1
    total_tp = sum(
        sum(1 for g, p in zip(golds, preds) if g == l and p == l) for l in labels_list
    )
    total_fp = sum(
        sum(1 for g, p in zip(golds, preds) if g != l and p == l) for l in labels_list
    )
    total_fn = sum(
        sum(1 for g, p in zip(golds, preds) if g == l and p != l) for l in labels_list
    )
    micro_p = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    micro_r = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    f1_micro = (
        2 * micro_p * micro_r / (micro_p + micro_r)
        if (micro_p + micro_r) > 0
        else 0
    )

    # Weighted F1
    total_support = sum(per_class[l]["support"] for l in labels_list if l in per_class)
    f1_weighted = (
        sum(
            per_class[l]["f1"] * per_class[l]["support"]
            for l in labels_list
            if l in per_class
        )
        / total_support
        if total_support > 0
        else 0
    )

    # 혼동 행렬
    confusion = {}
    for g_label in labels_list:
        row = {}
        for p_label in labels_list:
            row[p_label] = sum(
                1 for g, p in zip(golds, preds) if g == g_label and p == p_label
            )
        confusion[g_label] = row

    # 예측 분포
    pred_dist = Counter(preds)

    return {
        "accuracy": round(accuracy, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_micro": round(f1_micro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "prediction_distribution": dict(pred_dist),
        "unparseable_count": unparseable_count,
    }


# ──────────────────────────────────────────────
# 🔴2+3: 라벨 정규화 (엄격 매칭)
# ──────────────────────────────────────────────

def _normalize_label(text: str, dataset_name: str) -> str:
    """
    모델 출력을 정규화하여 정답 라벨과 비교.
    엄격 매칭: 파싱 실패 시 __unparseable__ 반환.
    """
    text = text.strip()

    if dataset_name in ("fpb", "fiqa_sa"):
        return _normalize_sentiment(text)
    elif dataset_name == "financial_mmlu_ko":
        return _normalize_mmlu_choice(text)
    else:
        return text.lower()


def _normalize_sentiment(text: str) -> str:
    """
    감성 분류 엄격 매칭.
    허용 패턴: 정확히 라벨만 / 따옴표 감싼 라벨 / JSON 형식
    """
    cleaned = text.lower().strip().strip('"').strip("'").strip(".")

    # 정확 일치
    if cleaned in ("positive", "negative", "neutral"):
        return cleaned

    # 첫 토큰만 확인 (모델이 "positive." 이나 "positive\n..." 같이 답할 때)
    first_token = cleaned.split()[0].strip(".,;:!") if cleaned else ""
    if first_token in ("positive", "negative", "neutral"):
        return first_token

    # JSON 형식: {"label": "positive"} 등
    json_match = re.search(r'"(?:label|sentiment|answer)"\s*:\s*"(positive|negative|neutral)"', cleaned)
    if json_match:
        return json_match.group(1)

    return UNPARSEABLE


def _normalize_mmlu_choice(text: str) -> str:
    """
    🔴3: MMLU-KO 선택지 번호 엄격 파싱.
    첫 행에서만 추출, 명확한 답변 패턴만 허용.
    """
    # 첫 행만 사용
    first_line = text.strip().split("\n")[0].strip()

    # 패턴 1: 숫자만 (공백 허용) → "3", " 4 "
    if re.match(r'^\s*[1-5]\s*$', first_line):
        return re.search(r'[1-5]', first_line).group()

    # 패턴 2: "정답: 3", "답: 2", "Answer: 1"
    answer_match = re.match(
        r'^(?:정답|답|답변|answer|정답은)\s*[:：]?\s*([1-5])\b',
        first_line,
        re.IGNORECASE,
    )
    if answer_match:
        return answer_match.group(1)

    # 패턴 3: "3번", "3."
    choice_match = re.match(r'^([1-5])\s*[번.)]\s*', first_line)
    if choice_match:
        return choice_match.group(1)

    return UNPARSEABLE


# ──────────────────────────────────────────────
# 🟡4: QA 지표 (FinQA) — 강화된 answer normalizer
# ──────────────────────────────────────────────

def _compute_qa_metrics(predictions: List[Dict]) -> Dict[str, Any]:
    """FinQA: Exact Match + 수치 근접도 + LLM Judge 필요 표시."""
    exact_match = 0
    numeric_close = 0
    type_mismatch = 0
    total = len(predictions)

    for p in predictions:
        gold_raw = str(p["gold_label"]).strip()
        pred_raw = str(p["prediction"]).strip()

        gold_norm = _normalize_answer(gold_raw)
        pred_norm = _normalize_answer(pred_raw)

        # 같은 타입인지 확인
        if gold_norm["type"] != pred_norm["type"] and pred_norm["type"] != "unknown":
            type_mismatch += 1

        # Exact match (정규화 후 비교)
        if gold_norm["canonical"] == pred_norm["canonical"]:
            exact_match += 1
            continue

        # 수치 근접 비교 (1% 이내)
        if gold_norm["value"] is not None and pred_norm["value"] is not None:
            # 백분율 vs 일반 숫자 혼동 방지
            if gold_norm["is_percent"] != pred_norm["is_percent"]:
                type_mismatch += 1
                continue

            if gold_norm["value"] == 0:
                if pred_norm["value"] == 0:
                    exact_match += 1
            elif abs(gold_norm["value"] - pred_norm["value"]) / abs(gold_norm["value"]) < 0.01:
                numeric_close += 1

    return {
        "exact_match_rate": round(exact_match / total, 4) if total else 0,
        "numeric_close_rate": round(numeric_close / total, 4) if total else 0,
        "combined_accuracy": round((exact_match + numeric_close) / total, 4) if total else 0,
        "type_mismatch_count": type_mismatch,
        "note": "FinQA는 LLM Judge로 추가 평가 권장",
    }


def _normalize_answer(text: str) -> Dict[str, Any]:
    """
    FinQA 답변 정규화.
    Returns: {canonical: str, value: Optional[float], type: str, is_percent: bool}
    """
    text = text.strip().lower()

    # Boolean
    if text in ("yes", "true"):
        return {"canonical": "yes", "value": 1.0, "type": "boolean", "is_percent": False}
    if text in ("no", "false"):
        return {"canonical": "no", "value": 0.0, "type": "boolean", "is_percent": False}

    # 백분율: "10%", "10.5%", "10 percent"
    pct_match = re.match(r'^[−\-]?\s*([\d,]+\.?\d*)\s*(%|percent)\s*$', text)
    if pct_match:
        val = float(pct_match.group(1).replace(",", ""))
        if text.startswith(("-", "−")):
            val = -val
        return {"canonical": f"{val}%", "value": val, "type": "percentage", "is_percent": True}

    # 통화: "$1,234", "$1.2 million"
    currency_match = re.match(r'^[−\-]?\s*\$?\s*([\d,]+\.?\d*)\s*(million|billion|thousand|m|b|k)?\s*$', text)
    if currency_match:
        val = float(currency_match.group(1).replace(",", ""))
        if text.startswith(("-", "−")):
            val = -val
        multiplier_str = currency_match.group(2) or ""
        multipliers = {"million": 1e6, "m": 1e6, "billion": 1e9, "b": 1e9, "thousand": 1e3, "k": 1e3}
        val *= multipliers.get(multiplier_str, 1)
        return {"canonical": str(val), "value": val, "type": "number", "is_percent": False}

    # 일반 숫자: "1234", "-3.5", "1,234.56"
    num_match = re.match(r'^[−\-]?\s*([\d,]+\.?\d*)\s*$', text)
    if num_match:
        val = float(num_match.group(1).replace(",", ""))
        if text.startswith(("-", "−")):
            val = -val
        return {"canonical": str(val), "value": val, "type": "number", "is_percent": False}

    return {"canonical": text, "value": None, "type": "unknown", "is_percent": False}


# ══════════════════════════════════════════════
# 🟡6+10: LLM Judge (고정 seed + 엄격 파싱)
# ══════════════════════════════════════════════

class LLMJudge:
    """LLM Judge 평가기 — GPT-5.4로 모델 응답 품질 판정."""

    def __init__(self):
        self._client = None
        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=OPENAI_API_KEY)
        except ImportError:
            logger.warning("openai 패키지 미설치")

    def evaluate_single(
        self,
        question: str,
        gold_answer: str,
        prediction: str,
        dataset_name: str,
    ) -> Dict[str, Any]:
        """단건 LLM Judge 평가."""
        if not self._client:
            return {"score": None, "error": "Client not initialized"}

        messages = build_llm_judge_prompt(question, gold_answer, prediction, dataset_name)

        try:
            completion = self._client.chat.completions.create(
                model=LLM_JUDGE_MODEL,
                messages=messages,
                temperature=LLM_JUDGE_TEMPERATURE,
                max_tokens=LLM_JUDGE_MAX_TOKENS,
            )
            response = completion.choices[0].message.content.strip()

            # 🟡10: 엄격 파싱 — 첫 행에서 0-5만 매칭
            score = _parse_judge_score(response)
            if score is None:
                return {
                    "score": None,
                    "raw_response": response,
                    "error": "judge_parse_error",
                }
            return {"score": score, "raw_response": response, "error": None}

        except Exception as e:
            return {"score": None, "error": str(e)}

    def evaluate_batch(
        self,
        predictions: List[Dict[str, Any]],
        dataset_name: str,
        sample_n: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        배치 LLM Judge 평가. 🟡6: 고정 seed + 샘플 id 낙반.
        """
        valid = [p for p in predictions if not p.get("error")]

        # 고정 seed 랜덤 샘플링
        rng = _random.Random(RANDOM_SEED)
        if sample_n and sample_n < len(valid):
            valid = rng.sample(valid, sample_n)

        # 샘플 id 기록
        sampled_ids = [p["id"] for p in valid]

        logger.info(f"[LLM Judge] {len(valid)}건 평가 시작 (seed={RANDOM_SEED})...")
        results = []
        scores = []
        parse_errors = 0

        for i, p in enumerate(valid):
            result = self.evaluate_single(
                question=p.get("input_text", ""),
                gold_answer=str(p["gold_label"]),
                prediction=str(p["prediction"]),
                dataset_name=dataset_name,
            )
            result["id"] = p["id"]
            results.append(result)

            if result["score"] is not None:
                scores.append(result["score"])
            if result.get("error") == "judge_parse_error":
                parse_errors += 1

            if (i + 1) % 50 == 0:
                logger.info(f"  [LLM Judge] {i+1}/{len(valid)} 완료")

            time.sleep(0.1)  # Rate limit 방지

        score_dist = Counter(scores)
        return {
            "avg_score": round(sum(scores) / len(scores), 3) if scores else 0,
            "score_distribution": dict(sorted(score_dist.items())),
            "total_evaluated": len(results),
            "parse_errors": parse_errors,
            "sampled_ids": sampled_ids,
            "seed": RANDOM_SEED,
            "results": results,
        }


def _parse_judge_score(response: str) -> Optional[int]:
    """
    🟡10: LLM Judge 응답에서 0-5 점수 엄격 파싱.
    첫 행에서만, 명확한 패턴만 허용.
    """
    first_line = response.strip().split("\n")[0].strip()

    # 패턴 1: 숫자만 ("3", "5")
    if re.match(r'^[0-5]$', first_line):
        return int(first_line)

    # 패턴 2: "Score: 3", "점수: 4"
    score_match = re.match(r'^(?:score|점수)\s*[:：]\s*([0-5])\b', first_line, re.IGNORECASE)
    if score_match:
        return int(score_match.group(1))

    # 패턴 3: "3/5" 형식
    frac_match = re.match(r'^([0-5])\s*/\s*5\s*$', first_line)
    if frac_match:
        return int(frac_match.group(1))

    return None


# ══════════════════════════════════════════════
# 전체 실험 결과 평가
# ══════════════════════════════════════════════

def evaluate_experiment(
    experiment_id: str,
    run_llm_judge: bool = False,
    llm_judge_sample_n: Optional[int] = 100,
) -> Dict[str, Any]:
    """실험 결과 파일을 읽어서 전체 평가."""
    group_name, dataset_name = experiment_id.split("_", 1)
    pred_file = OUTPUT_DIR / experiment_id / "predictions.jsonl"

    if not pred_file.exists():
        return {"error": f"Predictions file not found: {pred_file}"}

    predictions = []
    with open(pred_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                predictions.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    logger.info(f"\n📊 평가 시작: {experiment_id} ({len(predictions)}건)")

    # 기본 지표
    metrics = compute_metrics(predictions, dataset_name)

    # LLM Judge (선택)
    if run_llm_judge:
        judge = LLMJudge()
        judge_results = judge.evaluate_batch(
            predictions, dataset_name, sample_n=llm_judge_sample_n
        )
        metrics["llm_judge"] = {
            "avg_score": judge_results["avg_score"],
            "score_distribution": judge_results["score_distribution"],
            "total_evaluated": judge_results["total_evaluated"],
            "parse_errors": judge_results["parse_errors"],
            "seed": judge_results["seed"],
        }
        # Judge 결과 별도 저장
        judge_dir = OUTPUT_DIR / experiment_id
        judge_path = judge_dir / "llm_judge_results.jsonl"
        with open(judge_path, "w", encoding="utf-8") as f:
            for r in judge_results["results"]:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        # 샘플 id 목록 저장
        with open(judge_dir / "llm_judge_sampled_ids.json", "w") as f:
            json.dump(judge_results["sampled_ids"], f)

    # 평가 결과 저장
    metrics_path = OUTPUT_DIR / experiment_id / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    logger.info(f"✅ 평가 완료: {metrics_path}")
    _print_metrics_summary(metrics, experiment_id)

    return metrics


def _print_metrics_summary(metrics: Dict, experiment_id: str):
    """평가 결과 요약 출력."""
    print(f"\n{'─'*50}")
    print(f"📊 {experiment_id} 평가 결과")
    print(f"{'─'*50}")

    if "accuracy" in metrics:
        print(f"  Accuracy:     {metrics['accuracy']:.4f}")
        print(f"  F1 Macro:     {metrics['f1_macro']:.4f}")
        print(f"  F1 Micro:     {metrics['f1_micro']:.4f}")
        print(f"  F1 Weighted:  {metrics['f1_weighted']:.4f}")
        if metrics.get("unparseable_count"):
            print(f"  Unparseable:  {metrics['unparseable_count']}")

    if "exact_match_rate" in metrics:
        print(f"  Exact Match:  {metrics['exact_match_rate']:.4f}")
        print(f"  Numeric Close:{metrics['numeric_close_rate']:.4f}")
        print(f"  Combined:     {metrics['combined_accuracy']:.4f}")

    if "avg_latency_ms" in metrics:
        print(f"  Avg Latency:  {metrics['avg_latency_ms']:.0f}ms")

    if "total_cost_usd" in metrics:
        print(f"  Total Cost:   ${metrics['total_cost_usd']:.4f}")

    if "llm_judge" in metrics:
        judge = metrics["llm_judge"]
        print(f"  LLM Judge:    {judge['avg_score']:.2f}/5.0 (n={judge['total_evaluated']})")
        if judge.get("parse_errors"):
            print(f"  Judge Parse Errors: {judge['parse_errors']}")

    print(f"  Samples:      {metrics.get('valid_samples', '?')}/{metrics.get('total_samples', '?')}")
    print(f"{'─'*50}")


# ══════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="실험 결과 평가")
    parser.add_argument("experiment_id", help="실험 ID (예: A_fpb, B_finqa)")
    parser.add_argument("--llm-judge", action="store_true", help="LLM Judge 실행")
    parser.add_argument("--judge-sample", type=int, default=100, help="Judge 샘플 수")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    evaluate_experiment(
        args.experiment_id,
        run_llm_judge=args.llm_judge,
        llm_judge_sample_n=args.judge_sample,
    )
