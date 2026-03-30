"""
데이터 로더 (data_loader.py)
============================
Unified JSONL 포맷의 4개 데이터셋을 로드하고 전처리.

Codex audit 반영:
- 🟡8: _extract_choices 정규식 확장 + 파싱 실패 경고
"""

import json
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from config import DATASETS

logger = logging.getLogger(__name__)


def load_dataset(dataset_name: str, split: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    unified JSONL 파일에서 데이터 로드.

    Args:
        dataset_name: fpb | fiqa_sa | finqa | financial_mmlu_ko
        split: train | valid | test | None(전체)

    Returns:
        List of records: [{id, text, label, source_dataset, split, metadata}, ...]
    """
    if dataset_name not in DATASETS:
        raise ValueError(f"Unknown dataset: {dataset_name}. Available: {list(DATASETS.keys())}")

    file_path = DATASETS[dataset_name]["file"]
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if split is None or record.get("split") == split:
                records.append(record)

    return records


def get_dataset_info(dataset_name: str) -> Dict[str, Any]:
    """데이터셋 메타 정보 반환."""
    cfg = DATASETS[dataset_name]
    records = load_dataset(dataset_name)

    from collections import Counter
    split_counts = Counter(r.get("split", "unknown") for r in records)
    label_counts = Counter(str(r["label"]) for r in records)

    return {
        "name": dataset_name,
        "description": cfg["description"],
        "task_type": cfg["task_type"],
        "language": cfg["language"],
        "total_count": len(records),
        "split_counts": dict(split_counts),
        "label_distribution": dict(label_counts),
    }


def format_for_experiment(record: Dict[str, Any], dataset_name: str) -> Dict[str, Any]:
    """
    실험 입력용으로 레코드를 변환.
    데이터셋 유형에 따라 text/context/choices 등을 구조화.
    """
    result = {
        "id": record["id"],
        "gold_label": str(record["label"]),
        "metadata": record.get("metadata", {}),
        "context": None,
        "choices": None,
    }

    if dataset_name in ("fpb", "fiqa_sa"):
        result["input_text"] = record["text"]

    elif dataset_name == "finqa":
        result["input_text"] = record["text"]  # 질문
        meta = record.get("metadata", {})

        table = meta.get("table", [])
        table_text = _format_table(table) if table else ""

        pre = " ".join(meta.get("pre_text", []))
        post = " ".join(meta.get("post_text", []))

        context_parts = []
        if pre:
            context_parts.append(f"[Background]\n{pre}")
        if table_text:
            context_parts.append(f"[Table]\n{table_text}")
        if post:
            context_parts.append(f"[Additional Info]\n{post}")

        result["context"] = "\n\n".join(context_parts)

    elif dataset_name == "financial_mmlu_ko":
        result["input_text"] = record["text"]
        choices = _extract_choices(record["text"], record["id"])
        result["choices"] = choices

    return result


def _format_table(table: List[List[str]]) -> str:
    """FinQA 테이블을 읽기 좋은 텍스트로 변환."""
    if not table:
        return ""

    lines = []
    for row in table:
        lines.append(" | ".join(str(cell) for cell in row))

    if len(lines) > 1:
        header = lines[0]
        sep = "-" * len(header)
        lines.insert(1, sep)

    return "\n".join(lines)


def _extract_choices(text: str, record_id: str = "") -> List[str]:
    """
    🟡8: MMLU-KO 텍스트에서 선택지 목록 추출.
    여러 형식 지원: "1. xxx", "1) xxx", "①xxx" 등.
    파싱 실패 시 경고.
    """
    choices = []

    # 패턴 1: "1. xxx" (가장 일반적)
    pattern_dot = re.findall(r'(?:^|\n)\s*([1-5])\.\s*(.+?)(?=\n\s*[1-5][\.\)]|\n\s*$|$)', text, re.DOTALL)
    if pattern_dot:
        for num, content in pattern_dot:
            choices.append(f"{num}. {content.strip()}")
        if len(choices) >= 3:
            return choices

    # 패턴 2: "1) xxx"
    choices = []
    pattern_paren = re.findall(r'(?:^|\n)\s*([1-5])\)\s*(.+?)(?=\n\s*[1-5][\)\.]|\n\s*$|$)', text, re.DOTALL)
    if pattern_paren:
        for num, content in pattern_paren:
            choices.append(f"{num}. {content.strip()}")
        if len(choices) >= 3:
            return choices

    # 패턴 3: 원문 그대로 (파싱 실패)
    if not choices:
        logger.warning(
            f"[data_loader] 선택지 추출 실패 (id={record_id}): "
            f"텍스트 앞 80자: {text[:80]}..."
        )

    return choices


# ──────────────────────────────────────────────
# CLI: 데이터셋 정보 확인용
# ──────────────────────────────────────────────
if __name__ == "__main__":
    for name in DATASETS:
        info = get_dataset_info(name)
        print(f"\n{'='*50}")
        print(f"📊 {info['name']} — {info['description']}")
        print(f"   총 {info['total_count']}건 | 유형: {info['task_type']} | 언어: {info['language']}")
        print(f"   Split: {info['split_counts']}")
        print(f"   Label: {info['label_distribution']}")
