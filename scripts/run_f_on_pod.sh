#!/bin/bash
# RunPod에서 F군 실험 실행 스크립트
# 사용법: bash scripts/run_f_on_pod.sh

set -e

echo "=== 패키지 설치 ==="
# bitsandbytes: 4-bit 양자화 필수 (exaone_qlora_runpod.ipynb 와 동일 환경)
pip install -q --upgrade transformers
pip install -q openai python-dotenv faiss-cpu \
    accelerate peft bitsandbytes datasets huggingface_hub

echo "=== FAISS 인덱스 빌드 ==="
python backend/build_index.py

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
