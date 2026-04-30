"""
FastAPI 메인 (main.py)
======================
실험 결과 저장/조회 API.

엔드포인트:
  GET  /health                      서버 상태 확인
  GET  /api/v1/results              전체 결과 조회 (group/dataset 필터)
  POST /api/v1/results              결과 단건 저장
  GET  /api/v1/results/{group}/{dataset}  특정 실험 결과 조회
  POST /api/v1/results/import       experiments/outputs/ 에서 일괄 임포트

실행:
  cd capstone-financial-nlp
  uvicorn backend.app.api.main:app --reload
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# 프로젝트 루트를 sys.path에 추가
_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.app.models.database import Result, init_db, get_db

OUTPUTS_DIR = _ROOT / "experiments" / "outputs"

app = FastAPI(title="Financial NLP Experiment API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()


# ══════════════════════════════════════════════
# Pydantic 스키마
# ══════════════════════════════════════════════

class ResultIn(BaseModel):
    group_name: str
    dataset: str
    model: str
    strategy: str
    rag_active: bool = False
    accuracy: Optional[float] = None
    f1_macro: Optional[float] = None
    f1_micro: Optional[float] = None
    f1_weighted: Optional[float] = None
    exact_match_rate: Optional[float] = None
    numeric_close_rate: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    total_cost_usd: Optional[float] = None
    llm_judge_score: Optional[float] = None
    total_samples: Optional[int] = None
    valid_samples: Optional[int] = None
    error_count: Optional[int] = None


class ResultOut(ResultIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════
# 엔드포인트
# ══════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/results", response_model=List[ResultOut])
def get_results(
    group: Optional[str] = Query(None, description="실험군 (A~F)"),
    dataset: Optional[str] = Query(None, description="데이터셋"),
    db: Session = Depends(get_db),
):
    """전체 결과 조회. group/dataset 필터 가능."""
    q = db.query(Result)
    if group:
        q = q.filter(Result.group_name == group)
    if dataset:
        q = q.filter(Result.dataset == dataset)
    return q.order_by(Result.group_name, Result.dataset).all()


@app.post("/api/v1/results", response_model=ResultOut)
def post_result(body: ResultIn, db: Session = Depends(get_db)):
    """결과 단건 저장."""
    # 동일 (group, dataset) 이미 존재하면 업데이트
    existing = (
        db.query(Result)
        .filter(Result.group_name == body.group_name, Result.dataset == body.dataset)
        .first()
    )
    if existing:
        for k, v in body.model_dump().items():
            setattr(existing, k, v)
        existing.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    row = Result(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/api/v1/results/{group}/{dataset}", response_model=ResultOut)
def get_result(group: str, dataset: str, db: Session = Depends(get_db)):
    """특정 실험군 + 데이터셋 결과 조회."""
    row = (
        db.query(Result)
        .filter(Result.group_name == group, Result.dataset == dataset)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"{group}_{dataset} 결과 없음")
    return row


@app.post("/api/v1/results/import")
def import_from_outputs(db: Session = Depends(get_db)):
    """
    experiments/outputs/ 디렉터리의 metrics.json 파일을 읽어 DB에 일괄 저장.
    실험 완료 후 한 번 호출하면 됨.
    """
    if not OUTPUTS_DIR.exists():
        raise HTTPException(status_code=404, detail=f"outputs 디렉터리 없음: {OUTPUTS_DIR}")

    imported, skipped = 0, 0

    for metrics_file in sorted(OUTPUTS_DIR.glob("*/metrics.json")):
        experiment_id = metrics_file.parent.name   # 예: A_fpb
        parts = experiment_id.split("_", 1)
        if len(parts) != 2:
            skipped += 1
            continue

        group_name, dataset = parts[0], parts[1]

        # summary.json에서 model/strategy/rag 정보 가져오기
        summary_file = metrics_file.parent / "summary.json"
        summary = {}
        if summary_file.exists():
            summary = json.loads(summary_file.read_text(encoding="utf-8"))

        metrics = json.loads(metrics_file.read_text(encoding="utf-8"))

        body = ResultIn(
            group_name=group_name,
            dataset=dataset,
            model=summary.get("model", ""),
            strategy=summary.get("strategy", ""),
            rag_active=summary.get("rag_active", False),
            accuracy=metrics.get("accuracy"),
            f1_macro=metrics.get("f1_macro"),
            f1_micro=metrics.get("f1_micro"),
            f1_weighted=metrics.get("f1_weighted"),
            exact_match_rate=metrics.get("exact_match_rate"),
            numeric_close_rate=metrics.get("numeric_close_rate"),
            avg_latency_ms=metrics.get("avg_latency_ms"),
            total_cost_usd=metrics.get("total_cost_usd"),
            llm_judge_score=metrics.get("llm_judge", {}).get("avg_score") if metrics.get("llm_judge") else None,
            total_samples=metrics.get("total_samples"),
            valid_samples=metrics.get("valid_samples"),
            error_count=metrics.get("error_count"),
        )

        post_result(body, db)
        imported += 1

    return {"imported": imported, "skipped": skipped}
