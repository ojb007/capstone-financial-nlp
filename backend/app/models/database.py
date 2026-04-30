"""
DB 모델 (database.py)
=====================
SQLAlchemy + SQLite 기반 실험 결과 저장.
"""

from datetime import datetime
from pathlib import Path
from sqlalchemy import (
    create_engine, Column, Integer, Float, String, Boolean, DateTime,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# ── DB 경로 ──
_HERE = Path(__file__).resolve().parent
DB_PATH = _HERE.parent.parent / "results.db"   # backend/results.db
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


# ── 테이블 ──────────────────────────────────
class Result(Base):
    __tablename__ = "results"

    id            = Column(Integer, primary_key=True, index=True)
    group_name    = Column(String, nullable=False)   # A~F
    dataset       = Column(String, nullable=False)   # fpb, fiqa_sa, finqa, financial_mmlu_ko
    model         = Column(String, nullable=False)
    strategy      = Column(String, nullable=False)
    rag_active    = Column(Boolean, default=False)

    # 분류 지표 (FPB / FiQA-SA / MMLU-KO)
    accuracy      = Column(Float, nullable=True)
    f1_macro      = Column(Float, nullable=True)
    f1_micro      = Column(Float, nullable=True)
    f1_weighted   = Column(Float, nullable=True)

    # QA 지표 (FinQA)
    exact_match_rate   = Column(Float, nullable=True)
    numeric_close_rate = Column(Float, nullable=True)

    # 공통 지표
    avg_latency_ms  = Column(Float, nullable=True)
    total_cost_usd  = Column(Float, nullable=True)
    llm_judge_score = Column(Float, nullable=True)
    total_samples   = Column(Integer, nullable=True)
    valid_samples   = Column(Integer, nullable=True)
    error_count     = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
