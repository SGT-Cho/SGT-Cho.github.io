"""
벡터 DB 사용 예시 (ChromaDB)
실제로 사용하려면: pip install chromadb
"""

import chromadb
from chromadb.config import Settings

# ChromaDB 클라이언트 생성
client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chroma_db"
))

# 컬렉션 생성
collection = client.create_collection(
    name="blog_posts",
    metadata={"hnsw:space": "cosine"}
)

# 문서 추가
collection.add(
    documents=["LLM은 대규모 언어 모델입니다", "Docker는 컨테이너 기술입니다"],
    metadatas=[{"url": "/post1"}, {"url": "/post2"}],
    ids=["1", "2"]
)

# 검색
results = collection.query(
    query_texts=["언어 모델이란?"],
    n_results=2
)