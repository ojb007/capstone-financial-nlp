#!/bin/bash
# RunPod에서 F군 실험 실행 스크립트
# 사용법: bash scripts/run_f_on_pod.sh

set -e

echo "=== 패키지 설치 ==="
# transformers 4.46.2 + peft 0.13.2: PyTorch 2.4.x 호환 확인된 버전
pip install -q transformers==4.46.2 peft==0.13.2
pip install -q openai python-dotenv faiss-cpu \
    accelerate bitsandbytes datasets huggingface_hub

echo "=== FAISS 인덱스 확인 ==="
if [ -f "backend/faiss_index/index.faiss" ]; then
    echo "인덱스 이미 존재, 빌드 생략"
else
    echo "인덱스 없음, 빌드 시작..."
    python backend/build_index.py
fi

echo "=== F군 실험 실행 ==="
cd experiments
python - <<'EOF'
import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
from runner import run_all_experiments
run_all_experiments(groups=["F"])
EOF

echo "=== 완료 ==="
echo "결과물 위치: experiments/outputs/F_*/"
