"""
finetune_train.jsonl 생성 스크립트
- finqa (train split) + fiqa_sa (train split)
- FPB / financial_mmlu_ko 는 전량 평가 전용 → 제외
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
OUT_FILE = DATA_DIR / "finetune_train.jsonl"

SYSTEM_FINQA = (
    "You are a financial analyst. Answer the question based on the given "
    "financial data. Provide only the final answer (number, percentage, or yes/no)."
)
SYSTEM_FIQA = (
    "You are a financial sentiment analyst. "
    "Classify the given financial text as exactly one of: positive, negative, neutral. "
    "Reply with only the label, nothing else."
)


def score_to_label(score: float) -> str:
    if score > 0.1:
        return "positive"
    if score < -0.1:
        return "negative"
    return "neutral"


def format_table(table: list) -> str:
    if not table:
        return ""
    lines = [" | ".join(str(c) for c in row) for row in table]
    if len(lines) > 1:
        lines.insert(1, "-" * len(lines[0]))
    return "\n".join(lines)


def build_finqa_context(meta: dict) -> str:
    parts = []
    pre = " ".join(meta.get("pre_text", []))
    table_text = format_table(meta.get("table", []))
    post = " ".join(meta.get("post_text", []))
    if pre:
        parts.append(f"[Background]\n{pre}")
    if table_text:
        parts.append(f"[Table]\n{table_text}")
    if post:
        parts.append(f"[Additional Info]\n{post}")
    return "\n\n".join(parts)


def build_records(path: Path, dataset: str) -> list:
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if rec.get("split") != "train":
                continue

            if dataset == "fiqa_sa":
                label = score_to_label(float(rec["label"]))
                entry = {
                    "messages": [
                        {"role": "system", "content": SYSTEM_FIQA},
                        {"role": "user", "content": f"Text: {rec['text']}"},
                        {"role": "assistant", "content": label},
                    ],
                    "dataset": "fiqa_sa",
                }

            elif dataset == "finqa":
                context = build_finqa_context(rec.get("metadata", {}))
                user_content = (
                    f"{context}\n\nQuestion: {rec['text']}" if context
                    else f"Question: {rec['text']}"
                )
                entry = {
                    "messages": [
                        {"role": "system", "content": SYSTEM_FINQA},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": str(rec["label"])},
                    ],
                    "dataset": "finqa",
                }

            records.append(entry)
    return records


def main():
    fiqa_records = build_records(DATA_DIR / "fiqa_sa.unified.jsonl", "fiqa_sa")
    finqa_records = build_records(DATA_DIR / "finqa.unified.jsonl", "finqa")

    all_records = fiqa_records + finqa_records

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for rec in all_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"FiQA-SA train: {len(fiqa_records):,}")
    print(f"FinQA   train: {len(finqa_records):,}")
    print(f"합계          : {len(all_records):,}")
    print(f"저장 완료 → {OUT_FILE}")


if __name__ == "__main__":
    main()
