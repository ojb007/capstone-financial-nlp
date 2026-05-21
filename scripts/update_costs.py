"""
실험 비용 계산 및 DB 업데이트 (update_costs.py)
================================================

[배경]
- D군/E군은 RunPod GPU 서버(EXAONE 4.0 32B, vLLM)로 실행
- RunPod은 토큰 단가가 아닌 시간당 GPU 과금 방식
- E군은 RAG를 위해 추가적으로 OpenAI Embeddings API 호출

[RunPod 비용 산출]
- 실험 전 잔액: $7.50
- 실험 후 잔액: $1.74
- 총 사용 비용: $7.50 - $1.74 = $5.76

[D군 vs E군 비용 분배 방법]
- 각 실험의 summary.json에 기록된 total_time_sec(총 소요 시간)을 기준으로 비례 배분
  - D군 총 소요 시간: 3031.6초 (27.7%)
  - E군 총 소요 시간: 7910.1초 (72.3%)
  - E군이 RAG로 인한 임베딩 + 더 긴 프롬프트 때문에 약 2.6배 느림
- RunPod 비용 = $5.76 × (해당 군 시간 / 전체 시간)

[데이터셋별 비용 분배]
- 같은 군 안에서도 데이터셋마다 건수/복잡도가 달라 소요 시간이 다름
- 군 내 RunPod 비용 = 군 비용 × (해당 데이터셋 시간 / 군 전체 시간)

[E군 OpenAI 임베딩 비용]
- 모델: text-embedding-3-small ($0.020 / 1M 토큰, 2026-03 기준)
- E군은 각 쿼리마다 FAISS 검색을 위해 임베딩 API를 1회 호출
- 평균 입력 텍스트 길이: ~117자 ≈ 29 토큰 (영문 4자 ≈ 1토큰 기준)
- E군 총 쿼리: 7,455건
- 총 임베딩 토큰: ~218,846 토큰
- 임베딩 비용: 218,846 / 1,000,000 × $0.020 = $0.0044 (군 내 건수 비례로 분배)

[실행 방법]
  cd capstone-financial-nlp
  python scripts/update_costs.py
"""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from backend.app.models.database import SessionLocal, Result, init_db

# ── 실측값 ──────────────────────────────────────
RUNPOD_BALANCE_BEFORE = 7.50   # 실험 시작 전 RunPod 잔액 (USD)
RUNPOD_BALANCE_AFTER  = 1.74   # 실험 종료 후 RunPod 잔액 (USD)
RUNPOD_TOTAL_COST = RUNPOD_BALANCE_BEFORE - RUNPOD_BALANCE_AFTER  # = $5.76

# OpenAI text-embedding-3-small 단가 (2026-03 기준)
EMBED_PRICE_PER_1M_TOKENS = 0.020

# ── 각 실험의 총 소요 시간 (summary.json의 total_time_sec) ──
# D군: zero_shot, RAG 없음
D_TIMES = {
    "fpb":                 1658.5,
    "fiqa_sa":              347.0,
    "finqa":                910.8,
    "financial_mmlu_ko":    115.3,
}

# E군: optimized_prompt_rag, RAG 있음 (임베딩 API 호출 포함)
# D군 대비 약 2.6배 느림 → RAG 임베딩 + 더 긴 프롬프트 영향
E_TIMES = {
    "fpb":                 4614.2,
    "fiqa_sa":             1317.6,
    "finqa":               1633.3,
    "financial_mmlu_ko":    344.9,
}

# E군 데이터셋별 처리 건수 (임베딩 비용 분배용)
E_COUNTS = {
    "fpb":                 4846,
    "fiqa_sa":             1111,
    "finqa":               1147,
    "financial_mmlu_ko":    351,
}

# ── 임베딩 비용 계산 ─────────────────────────────
# 평균 입력 텍스트: ~117자 ≈ 29 토큰 (영문 4자 ≈ 1토큰)
AVG_QUERY_TOKENS = 29
E_TOTAL_COUNT    = sum(E_COUNTS.values())             # 7,455건
E_TOTAL_EMBED_TOKENS = AVG_QUERY_TOKENS * E_TOTAL_COUNT  # ~218,846 토큰
EMBED_COST_E_TOTAL = E_TOTAL_EMBED_TOKENS / 1_000_000 * EMBED_PRICE_PER_1M_TOKENS


def main():
    init_db()
    db = SessionLocal()

    D_TOTAL_SEC = sum(D_TIMES.values())
    E_TOTAL_SEC = sum(E_TIMES.values())
    ALL_TOTAL_SEC = D_TOTAL_SEC + E_TOTAL_SEC

    # D군 RunPod 비용 (시간 비례)
    d_runpod = RUNPOD_TOTAL_COST * (D_TOTAL_SEC / ALL_TOTAL_SEC)
    # E군 RunPod 비용 (시간 비례)
    e_runpod = RUNPOD_TOTAL_COST * (E_TOTAL_SEC / ALL_TOTAL_SEC)

    print(f"RunPod 총 비용: ${RUNPOD_TOTAL_COST:.2f}")
    print(f"D군 RunPod: ${d_runpod:.4f} ({D_TOTAL_SEC/ALL_TOTAL_SEC*100:.1f}%)")
    print(f"E군 RunPod: ${e_runpod:.4f} ({E_TOTAL_SEC/ALL_TOTAL_SEC*100:.1f}%)")
    print(f"E군 임베딩: ${EMBED_COST_E_TOTAL:.4f} (text-embedding-3-small, {E_TOTAL_COUNT}건)")
    print()

    for ds, t in D_TIMES.items():
        cost = round(d_runpod * t / D_TOTAL_SEC, 4)
        r = db.query(Result).filter(Result.group_name == "D", Result.dataset == ds).first()
        if r:
            r.total_cost_usd = cost
            print(f"D_{ds}: ${cost}")

    for ds, t in E_TIMES.items():
        embed = round(EMBED_COST_E_TOTAL * E_COUNTS[ds] / E_TOTAL_COUNT, 6)
        cost  = round(e_runpod * t / E_TOTAL_SEC + embed, 4)
        r = db.query(Result).filter(Result.group_name == "E", Result.dataset == ds).first()
        if r:
            r.total_cost_usd = cost
            print(f"E_{ds}: ${cost} (RunPod ${round(e_runpod * t / E_TOTAL_SEC, 4)} + 임베딩 ${embed})")

    db.commit()
    db.close()
    print("\nDB 업데이트 완료")


if __name__ == "__main__":
    main()
