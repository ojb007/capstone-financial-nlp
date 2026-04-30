"""
FAISS 벡터 스토어 (vector_store.py)
=====================================
OpenAI text-embedding-3-small 기반 RAG 파이프라인.

build_index() : docs/ 문서 → 청크 → 임베딩 → FAISS 인덱스 저장 (1회)
search()      : 쿼리 임베딩 → FAISS 검색 → top-k Document 반환 (매 실험마다)
"""

import os
import pickle
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import numpy as np
import faiss
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
logger = logging.getLogger(__name__)

# ── 경로 ──────────────────────────────────────
_HERE = Path(__file__).resolve().parent           # backend/app/services/
_ROOT = _HERE.parent.parent.parent                # capstone-financial-nlp/
INDEX_DIR  = _HERE.parent.parent / "faiss_index"  # backend/faiss_index/
INDEX_FILE = INDEX_DIR / "index.faiss"
CHUNKS_FILE = INDEX_DIR / "chunks.pkl"

# ── 설정 ──────────────────────────────────────
EMBED_MODEL   = "text-embedding-3-small"
EMBED_DIM     = 1536
CHUNK_SIZE    = 300   # 단어 수 기준 청크 크기
CHUNK_OVERLAP = 50    # 청크 간 겹침 (문맥 연속성 유지)
BATCH_SIZE    = 100   # OpenAI API 배치 크기

# ── 모듈 레벨 캐시 (프로세스 내 재사용) ──────
_index: Optional[faiss.Index] = None
_chunks: Optional[List] = None


# ══════════════════════════════════════════════
# 공개 API
# ══════════════════════════════════════════════

@dataclass
class Document:
    page_content: str
    metadata: dict = field(default_factory=dict)


def build_index(docs_dir: Optional[Path] = None) -> None:
    """
    docs/ 디렉터리의 .txt 파일을 읽어 FAISS 인덱스를 빌드하고 저장.
    최초 1회 실행 후 backend/faiss_index/에 저장됨.
    """
    global _index, _chunks

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    client = _get_client()
    docs_dir = docs_dir or (_ROOT / "docs")

    logger.info("문서 로드 중...")
    raw_docs = _load_docs(docs_dir)
    logger.info(f"  {len(raw_docs)}개 문서 로드 완료")

    logger.info("청크 분할 중...")
    chunks: List[Document] = []
    for doc in raw_docs:
        chunks.extend(_chunk(doc))
    logger.info(f"  {len(chunks)}개 청크 생성 완료")

    logger.info("임베딩 생성 중 (OpenAI API)...")
    texts = [c.page_content for c in chunks]
    vectors = _embed_batch(texts, client)

    logger.info("FAISS 인덱스 빌드 중...")
    faiss.normalize_L2(vectors)               # 코사인 유사도를 위한 L2 정규화
    index = faiss.IndexFlatIP(EMBED_DIM)      # Inner Product = 정규화 후 코사인 유사도
    index.add(vectors)

    faiss.write_index(index, str(INDEX_FILE))
    with open(CHUNKS_FILE, "wb") as f:
        pickle.dump(chunks, f)

    _index, _chunks = index, chunks
    logger.info(f"✅ 인덱스 저장 완료: {INDEX_FILE} ({index.ntotal}개 벡터)")


def search(query: str, top_k: int = 3) -> List[Document]:
    """
    쿼리와 가장 유사한 top_k 청크를 반환.
    runner.py의 _get_rag_context()에서 호출됨.
    """
    _ensure_loaded()
    client = _get_client()

    query_vec = _embed_batch([query], client)
    faiss.normalize_L2(query_vec)

    _, indices = _index.search(query_vec, top_k)
    results = [_chunks[i] for i in indices[0] if i != -1]

    logger.debug(f"[RAG] '{query[:60]}...' → {len(results)}개 청크 검색")
    return results


# ══════════════════════════════════════════════
# 내부 헬퍼
# ══════════════════════════════════════════════

def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
    return OpenAI(api_key=api_key)


def _load_docs(docs_dir: Path) -> List[Document]:
    """docs/ 하위 모든 .txt 파일을 Document로 로드."""
    docs = []
    for txt_file in sorted(docs_dir.rglob("*.txt")):
        text = txt_file.read_text(encoding="utf-8", errors="ignore").strip()
        if text:
            docs.append(Document(
                page_content=text,
                metadata={"source": txt_file.name, "path": str(txt_file)},
            ))
    return docs


def _chunk(doc: Document) -> List[Document]:
    """단어 기준으로 청크 분할. CHUNK_OVERLAP만큼 겹침."""
    words = doc.page_content.split()
    step = CHUNK_SIZE - CHUNK_OVERLAP
    chunks = []
    for start in range(0, len(words), step):
        text = " ".join(words[start: start + CHUNK_SIZE])
        if text.strip():
            chunks.append(Document(page_content=text, metadata=doc.metadata))
    return chunks


def _embed_batch(texts: List[str], client: OpenAI) -> np.ndarray:
    """texts를 BATCH_SIZE 단위로 나눠 OpenAI 임베딩 API 호출."""
    all_vecs = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        resp = client.embeddings.create(model=EMBED_MODEL, input=batch)
        all_vecs.extend(item.embedding for item in resp.data)
        if len(texts) > BATCH_SIZE:
            logger.info(f"  임베딩 {min(i + BATCH_SIZE, len(texts))}/{len(texts)} 완료")
    return np.array(all_vecs, dtype=np.float32)


def _ensure_loaded() -> None:
    """인덱스가 메모리에 없으면 디스크에서 로드 (프로세스당 1회)."""
    global _index, _chunks
    if _index is not None:
        return
    if not INDEX_FILE.exists():
        raise FileNotFoundError(
            f"FAISS 인덱스가 없습니다. 먼저 빌드를 실행하세요:\n"
            f"  python backend/build_index.py"
        )
    _index = faiss.read_index(str(INDEX_FILE))
    with open(CHUNKS_FILE, "rb") as f:
        _chunks = pickle.load(f)
    logger.info(f"FAISS 인덱스 로드 완료: {_index.ntotal}개 벡터")
