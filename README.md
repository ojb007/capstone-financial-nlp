# 금융 NLP를 위한 LLM 최적화 전략 비교 연구

GPT-5.4와 EXAONE 모델을 대상으로 Zero-shot, Few-shot, RAG, QLoRA 등 다양한 전략을 4개 금융 데이터셋에서 비교 평가하는 캡스톤 프로젝트입니다.

---

## 프로젝트 구조

```
capstone-financial-nlp/
├── data/                        # 데이터셋 (unified JSONL)
│   ├── fpb.unified.jsonl
│   ├── fiqa_sa.unified.jsonl
│   ├── finqa.unified.jsonl
│   └── financial_mmlu_ko.unified.jsonl
├── docs/                        # RAG 소스 문서
│   ├── Financial News20/        # 영문 금융 뉴스 20개
│   └── Financialreports/        # 재무 리포트 10개
├── experiments/                 # 실험 프레임워크 (Python)
│   ├── config.py                # 모델/데이터셋/실험군 설정
│   ├── data_loader.py           # 데이터 로드 및 전처리
│   ├── prompts.py               # 전략별 프롬프트 템플릿
│   ├── runner.py                # 실험 실행 (API 호출, 결과 저장)
│   ├── evaluator.py             # 평가 지표 계산
│   └── outputs/                 # 실험 결과 자동 저장 위치
├── backend/                     # FastAPI 서버
│   ├── app/
│   │   ├── api/main.py          # API 엔드포인트
│   │   ├── models/database.py   # SQLite DB 모델
│   │   └── services/
│   │       └── vector_store.py  # RAG (FAISS 벡터 스토어)
│   ├── build_index.py           # FAISS 인덱스 빌드 스크립트
│   ├── faiss_index/             # 빌드된 FAISS 인덱스 저장 위치
│   └── results.db               # SQLite DB (자동 생성)
├── frontend/                    # Next.js 대시보드
│   └── app/
│       ├── dashboard/page.tsx   # 실험 결과 시각화
│       ├── admin/page.tsx       # 결과 테이블 조회
│       └── lib/api.ts           # 백엔드 API 연동
├── .env                         # API 키 (git 제외)
├── requirements.txt             # Python 패키지 목록
└── README.md
```

---

## 실험군 구성 (6개 × 4개 데이터셋 = 24개 실험)

| 군 | 모델 | 전략 | RAG | 파인튜닝 | 담당 |
|---|---|---|---|---|---|
| A | GPT-5.4 | Zero-shot | X | X | 장준위 |
| B | GPT-5.4 | Few-shot (3-shot) | X | X | 장준위 |
| C | GPT-5.4 | Optimized Prompt + RAG | O | X | 장준위 |
| D | EXAONE 4.0 32B | Zero-shot | X | X | 오정빈 |
| E | EXAONE 4.0 32B | Optimized Prompt + RAG | O | X | 오정빈 |
| F | EXAONE Deep 7.8B | QLoRA + RAG | O | O | 오정빈 |

---

## 데이터셋 (4개)

| 데이터셋 | 태스크 | 언어 | 규모 |
|---|---|---|---|
| FPB (Financial PhraseBank) | 감성 3분류 | EN | 5K건 |
| FiQA-SA | 감성 3분류 | EN | 1.2K건 |
| FinQA | 재무 수치 추론 QA | EN | 1.1K건 (test split) |
| Financial MMLU-KO | 객관식 | KO | 455건 |

---

## 환경 설정

### 1. Python 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정 (.env)

프로젝트 루트에 `.env` 파일 생성:

```
OPENAI_API_KEY=sk-...
EXAONE_API_KEY=...        # 멘토에게 수령
EXAONE_API_BASE=...       # 멘토에게 수령 (EXAONE API 서버 주소)
```

### 3. FAISS 인덱스 빌드 (최초 1회)

```bash
cd capstone-financial-nlp
python backend/build_index.py
```

`docs/` 폴더의 문서 30개 → 청크 102개 → FAISS 인덱스 저장

---

## 실험 실행

### 단일 실험

```bash
cd experiments
python -c "from runner import run_experiment; run_experiment(group='A', dataset='fpb')"
```

### 전체 실험 (24개 일괄)

```bash
cd experiments
python -c "from runner import run_all_experiments; run_all_experiments()"
```

### 테스트 (dry run, 5건만)

```bash
cd experiments
python -c "from runner import run_experiment; run_experiment(group='A', dataset='fpb', dry_run=True, dry_run_n=5)"
```

### 평가 (metrics.json 생성)

```bash
cd experiments
python evaluator.py A_fpb
```

---

## 전체 파이프라인 흐름

```
1. runner.py 실행
        ↓
   experiments/outputs/{group}_{dataset}/predictions.jsonl  (예측 결과)

2. evaluator.py 실행
        ↓
   experiments/outputs/{group}_{dataset}/metrics.json  (평가 지표)

3. FastAPI 서버 실행 후 import 호출
        ↓
   backend/results.db  (SQLite DB 저장)

4. 프론트엔드 대시보드에서 시각화
```

---

## 백엔드 서버 실행

```bash
cd capstone-financial-nlp
python -m uvicorn backend.app.api.main:app --reload
```

서버 주소: `http://localhost:8000`
API 문서: `http://localhost:8000/docs`

### API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 서버 상태 확인 |
| GET | `/api/v1/results` | 전체 결과 조회 (`?group=A`, `?dataset=fpb` 필터 가능) |
| POST | `/api/v1/results` | 결과 단건 저장 |
| GET | `/api/v1/results/{group}/{dataset}` | 특정 실험 결과 조회 |
| POST | `/api/v1/results/import` | `experiments/outputs/` 에서 DB 일괄 임포트 |

---

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

대시보드: `http://localhost:3000/dashboard`

---

## 평가 지표

| 지표 | 적용 데이터셋 | 설명 |
|---|---|---|
| Accuracy | FPB, FiQA-SA, MMLU-KO | 전체 정확도 |
| F1 Macro/Micro/Weighted | FPB, FiQA-SA, MMLU-KO | F1 스코어 |
| Exact Match | FinQA | 정답과 완전 일치 비율 |
| Numeric Close | FinQA | 1% 오차 이내 비율 |
| LLM Judge | 전체 | GPT-5.4가 0~5점으로 채점 |
| Avg Latency (ms) | 전체 | 평균 응답 시간 |
| Total Cost (USD) | 전체 | API 비용 합계 |

---

## 주의사항

- **EXAONE 연동**: D/E/F군 실행을 위해 `EXAONE_API_BASE` 환경변수 필요 (멘토 수령)
- **테스트 데이터**: DB에 더미 데이터(id:1)와 dry run 결과(A_fpb 3건)가 존재. 실제 실험 전 삭제 권장
- **RAG**: C/E/F군은 `backend/faiss_index/`가 빌드된 상태여야 실행 가능
- **비용**: FinQA는 데이터가 많아 test split(1,147건)만 사용 (config.py `default_split`)
