"""
실험 설정 (config.py)
=====================
6개 실험군 × 4개 데이터셋 = 24개 실험의 전체 설정.
"""
from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from dataclasses import dataclass

# ──────────────────────────────────────────────
# 경로
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────
# API 키 (.env 파일 또는 환경변수)
# ──────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")     # Gemini Embedding용
HF_TOKEN = os.getenv("HF_TOKEN", "")
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")  # RunPod vLLM 서버 주소

# ──────────────────────────────────────────────
# 재현성
# ──────────────────────────────────────────────
RANDOM_SEED = 42

# ──────────────────────────────────────────────
# 모델 설정
# ──────────────────────────────────────────────
MODELS = {
    "gpt-5.4": {
        "provider": "openai",
        "model_name": "gpt-5.4",
        "api_key_env": "OPENAI_API_KEY",
        "temperature": 0,
        "max_tokens": 512,
        "timeout": 60,
    },
    "exaone-4.0-32b": {
        "provider": "openai",           # vLLM이 OpenAI 호환 API 제공
        "model_name": "LGAI-EXAONE/EXAONE-4.0-32B",  # vLLM에 올린 모델명
        "base_url": VLLM_BASE_URL,      # RunPod vLLM 서버 주소
        "api_key": "EMPTY",             # vLLM은 키 불필요
        "temperature": 0,
        "max_tokens": 512,
        "timeout": 120,
    },
    "exaone-deep-7.8b": {
        "provider": "local_hf",
        "model_name": "qwe0100/exaone-deep-7.8b-finance",
        "temperature": 0,
        "max_tokens": 512,
    },
}

# ──────────────────────────────────────────────
# 데이터셋 설정
# ──────────────────────────────────────────────
DATASETS = {
    "fpb": {
        "file": DATA_DIR / "fpb.unified.jsonl",
        "task_type": "classification",       # 감성 3분류
        "labels": ["positive", "negative", "neutral"],
        "language": "en",
        "description": "Financial PhraseBank 감성 분류 (5K건)",
    },
    "fiqa_sa": {
        "file": DATA_DIR / "fiqa_sa.unified.jsonl",
        "task_type": "classification",       # 감성 3분류
        "labels": ["positive", "negative", "neutral"],
        "language": "en",
        "description": "FiQA Sentiment Analysis (1.2K건)",
    },
    "finqa": {
        "file": DATA_DIR / "finqa.unified.jsonl",
        "task_type": "qa",                   # 재무 수치 추론
        "labels": None,                      # 자유 형식 답변
        "language": "en",
        "description": "FinQA 재무 수치 추론 (8K건, test split만 사용)",
        "default_split": "test",             # 비용 절감: 8281→1147건 (test split만)
    },
    "financial_mmlu_ko": {
        "file": DATA_DIR / "financial_mmlu_ko.unified.jsonl",
        "task_type": "multiple_choice",      # 선택지
        "labels": ["1", "2", "3", "4", "5"],
        "language": "ko",
        "description": "한국어 금융 MMLU (455건)",
    },
}

# ──────────────────────────────────────────────
# 6개 실험군 설정
# ──────────────────────────────────────────────
@dataclass
class ExperimentGroup:
    name: str               # A, B, C, D, E, F
    model: str              # MODELS 키
    strategy: str           # zero_shot | optimized_prompt | optimized_prompt_rag | qlora_rag
    use_rag: bool = False
    use_finetuning: bool = False
    few_shot_n: int = 0     # Few-shot 예제 수
    description: str = ""

EXPERIMENT_GROUPS = {
    "A": ExperimentGroup(
        name="A",
        model="gpt-5.4",
        strategy="zero_shot",
        few_shot_n=0,
        description="GPT-5.4 제로샷 (글로벌 모델 기준선)",
    ),
    "B": ExperimentGroup(
        name="B",
        model="gpt-5.4",
        strategy="optimized_prompt",
        few_shot_n=3,
        description="GPT-5.4 + 최적화 프롬프트 (Few-shot 3례)",
    ),
    "C": ExperimentGroup(
        name="C",
        model="gpt-5.4",
        strategy="optimized_prompt_rag",
        use_rag=True,
        few_shot_n=3,
        description="GPT-5.4 + RAG + 최적화 프롬프트",
    ),
    "D": ExperimentGroup(
        name="D",
        model="exaone-4.0-32b",
        strategy="zero_shot",
        few_shot_n=0,
        description="EXAONE 4.0 32B 제로샷 (EXAONE 기준선)",
    ),
    "E": ExperimentGroup(
        name="E",
        model="exaone-4.0-32b",
        strategy="optimized_prompt_rag",
        use_rag=True,
        few_shot_n=3,
        description="EXAONE 4.0 32B + RAG + 최적화 프롬프트",
    ),
    "F": ExperimentGroup(
        name="F",
        model="exaone-deep-7.8b",
        strategy="qlora_rag",
        use_rag=True,
        use_finetuning=True,
        few_shot_n=0,
        description="EXAONE Deep 7.8B (QLoRA) + RAG",
    ),
}

# ──────────────────────────────────────────────
# 실행 옵션
# ──────────────────────────────────────────────
RETRY_MAX = 3                # 실패 시 재시도 횟수
RETRY_BASE_DELAY = 2.0       # 첫 재시도 대기(초), 이후 지수 퇴피
RETRY_MAX_WAIT = 60.0        # 재시도 최대 대기(초)
SAVE_EVERY = 50              # N건마다 중간 저장 (긴 실험 대비)
LOG_LEVEL = "INFO"

# ──────────────────────────────────────────────
# LLM Judge 설정
# ──────────────────────────────────────────────
LLM_JUDGE_MODEL = "gpt-5.4"
LLM_JUDGE_TEMPERATURE = 0
LLM_JUDGE_MAX_TOKENS = 256

# ──────────────────────────────────────────────
# 비용 추정 (USD per 1K tokens, 2026-03 기준)
# ──────────────────────────────────────────────
PRICING_VERSION = "2026-03-30-estimate"  # 가격 변경 시 업데이트
COST_PER_1K_TOKENS = {
    "gpt-5.4": {"input": 0.005, "output": 0.015},
    "exaone-deep-7.8b": {"input": 0.0, "output": 0.0},   # 로컬 추론
}