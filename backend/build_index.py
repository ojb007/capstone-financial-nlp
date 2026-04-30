"""
FAISS 인덱스 빌드 스크립트 (최초 1회 실행)
==========================================
실행:
  cd capstone-financial-nlp
  python backend/build_index.py

결과:
  backend/faiss_index/index.faiss
  backend/faiss_index/chunks.pkl
"""

import sys
import logging
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.vector_store import build_index

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    build_index()
