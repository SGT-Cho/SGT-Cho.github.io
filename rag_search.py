#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) 검색 시스템
벡터 검색과 LLM 통합을 위한 모듈
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple
import requests
from collections import defaultdict

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 설정
BLOG_ROOT = Path(__file__).parent
INDEX_DIR = BLOG_ROOT / 'index'
LLM_ENDPOINT = "http://127.0.0.1:1234"

class RAGSearchEngine:
    def __init__(self):
        self.chunks = []
        self.embeddings = None
        self.posts_metadata = {}
        self.load_index()
    
    def load_index(self):
        """저장된 인덱스 로드"""
        try:
            # 청크 로드
            chunks_file = INDEX_DIR / 'chunks.json'
            if chunks_file.exists():
                with open(chunks_file, 'r', encoding='utf-8') as f:
                    self.chunks = json.load(f)
                logger.info(f"Loaded {len(self.chunks)} chunks")
            
            # 임베딩 로드
            embeddings_file = INDEX_DIR / 'embeddings.npy'
            if embeddings_file.exists():
                self.embeddings = np.load(embeddings_file)
                logger.info(f"Loaded embeddings with shape {self.embeddings.shape}")
            
            # 포스트 메타데이터 로드
            posts_file = INDEX_DIR / 'posts_metadata.json'
            if posts_file.exists():
                with open(posts_file, 'r', encoding='utf-8') as f:
                    posts_list = json.load(f)
                    self.posts_metadata = {p['url']: p for p in posts_list}
                logger.info(f"Loaded metadata for {len(self.posts_metadata)} posts")
                
        except Exception as e:
            logger.error(f"Error loading index: {e}")
    
    def get_embedding(self, text: str) -> np.ndarray:
        """텍스트의 임베딩 벡터 생성"""
        try:
            response = requests.post(
                f"{LLM_ENDPOINT}/v1/embeddings",
                json={
                    "input": text,
                    "model": "text-embedding-ada-002"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return np.array(result['data'][0]['embedding'])
            else:
                # 폴백: 랜덤 임베딩
                logger.warning("Embedding API failed, using random embedding")
                return np.random.rand(768)
                
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            return np.random.rand(768)
    
    def search_chunks(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """쿼리와 유사한 청크 검색"""
        if not self.chunks:
            logger.warning("No chunks loaded")
            return []
        
        # 임베딩이 없으면 키워드 기반 검색으로 폴백
        if self.embeddings is None:
            logger.info("Using keyword-based search (no embeddings)")
            return self.keyword_search_chunks(query, top_k)
        
        # 쿼리 임베딩 생성
        query_embedding = self.get_embedding(query)
        
        # 코사인 유사도 계산
        similarities = np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
        
        # 상위 k개 선택
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if idx < len(self.chunks):
                chunk = self.chunks[idx].copy()
                chunk['similarity'] = float(similarities[idx])
                results.append(chunk)
        
        return results
    
    def keyword_search_chunks(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """키워드 기반 청크 검색"""
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        scored_chunks = []
        for chunk in self.chunks:
            score = 0
            content_lower = chunk['content'].lower()
            title_lower = chunk['title'].lower()
            
            # 제목에서 매칭
            for word in query_words:
                if word in title_lower:
                    score += 10
            
            # 내용에서 매칭
            for word in query_words:
                score += content_lower.count(word) * 2
            
            # 전체 쿼리가 포함된 경우 보너스
            if query_lower in content_lower:
                score += 20
            
            if score > 0:
                chunk_copy = chunk.copy()
                chunk_copy['similarity'] = min(1.0, score / 100)  # 정규화
                scored_chunks.append((score, chunk_copy))
        
        # 점수 기준 정렬
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        return [chunk for _, chunk in scored_chunks[:top_k]]
    
    def generate_context(self, chunks: List[Dict[str, Any]], max_length: int = 2000) -> str:
        """검색된 청크로부터 컨텍스트 생성"""
        context_parts = []
        current_length = 0
        
        # 중복 제거를 위한 세트
        seen_posts = set()
        
        for chunk in chunks:
            # 길이 체크
            chunk_text = f"[{chunk['title']}] {chunk['content']}"
            chunk_length = len(chunk_text)
            
            if current_length + chunk_length > max_length:
                break
            
            # 같은 포스트에서 너무 많은 청크가 포함되지 않도록
            post_url = chunk['post_url']
            if post_url in seen_posts and len(seen_posts) > 2:
                continue
            
            context_parts.append(chunk_text)
            current_length += chunk_length
            seen_posts.add(post_url)
        
        return "\n\n".join(context_parts)
    
    def search_with_rag(self, query: str, conversation_history: List[Dict] = None) -> Tuple[str, List[Dict]]:
        """RAG를 사용한 검색 및 응답 생성"""
        # 관련 청크 검색
        relevant_chunks = self.search_chunks(query, top_k=5)
        
        if not relevant_chunks:
            return "관련 정보를 찾을 수 없습니다.", []
        
        # 컨텍스트 생성
        context = self.generate_context(relevant_chunks)
        
        # 관련 포스트 정보 수집
        related_posts = []
        seen_urls = set()
        
        for chunk in relevant_chunks[:3]:  # 상위 3개만
            url = chunk['post_url']
            if url not in seen_urls:
                seen_urls.add(url)
                post_info = self.posts_metadata.get(url, {})
                related_posts.append({
                    'title': chunk['title'],
                    'url': url,
                    'date': post_info.get('date', ''),
                    'similarity': chunk['similarity']
                })
        
        # LLM에 전달할 프롬프트 구성
        system_prompt = self.get_rag_system_prompt()
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # 대화 히스토리 추가 (있으면)
        if conversation_history:
            for msg in conversation_history[-6:]:  # 최근 3턴만
                if msg['role'] in ['user', 'assistant']:
                    messages.append({
                        'role': msg['role'],
                        'content': msg['content']
                    })
        
        # 현재 질문과 컨텍스트
        user_prompt = f"""다음 컨텍스트를 참고하여 질문에 답변해주세요:

컨텍스트:
{context}

질문: {query}

답변 시 컨텍스트에 있는 정보를 우선적으로 활용하고, 관련 블로그 글이 있다면 언급해주세요."""
        
        messages.append({"role": "user", "content": user_prompt})
        
        # LLM 호출
        try:
            response = requests.post(
                f"{LLM_ENDPOINT}/v1/chat/completions",
                json={
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result['choices'][0]['message']['content']
                return answer, related_posts
            else:
                return "LLM 서버와 통신할 수 없습니다.", related_posts
                
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            return f"오류가 발생했습니다: {str(e)}", related_posts
    
    def get_rag_system_prompt(self) -> str:
        """RAG용 시스템 프롬프트"""
        return """당신은 민재님의 기술 블로그 AI 어시스턴트입니다.
이 블로그는 sgtcho.com 도메인에서 운영되며, 티스토리나 다른 플랫폼이 아닙니다.

주요 역할:
1. 제공된 컨텍스트를 기반으로 정확한 정보 제공
2. 블로그에 있는 내용을 우선적으로 참조
3. 관련 글이 있다면 적극적으로 추천
4. 컨텍스트에 없는 정보는 일반적인 지식으로 보충

응답 가이드라인:
- 친근하고 전문적인 톤 유지
- 기술적 내용을 쉽게 설명
- 구체적인 예시 제공
- 관련 블로그 글 언급 시 제목과 함께 소개
- 한국어로 자연스럽게 대화

URL 형식:
- 블로그 글 링크는 상대 경로로 제공 (예: /review/2024-08-10-ai-ml-dl-concepts.html)
- 절대 티스토리(tistory.com) URL을 생성하지 말 것
- 외부 링크가 필요한 경우 명시적으로 외부 사이트임을 표시

주의사항:
- 컨텍스트에 있는 정보와 모순되는 내용은 피하기
- 불확실한 정보는 추측하지 말고 솔직하게 답변
- 블로그 외부 정보 참조 시 명시하기"""
    
    def search_posts_by_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """키워드 기반 포스트 검색 (비벡터)"""
        results = []
        keyword_lower = keyword.lower()
        
        for post_url, metadata in self.posts_metadata.items():
            score = 0
            
            # 제목 매칭
            if keyword_lower in metadata.get('title', '').lower():
                score += 10
            
            # 카테고리 매칭
            if keyword_lower in metadata.get('category', '').lower():
                score += 5
            
            # 태그 매칭
            for tag in metadata.get('tags', []):
                if keyword_lower in tag.lower():
                    score += 3
            
            # 콘텐츠 매칭 (청크에서)
            for chunk in self.chunks:
                if chunk['post_url'] == post_url and keyword_lower in chunk['content'].lower():
                    score += 1
            
            if score > 0:
                result = metadata.copy()
                result['score'] = score
                results.append(result)
        
        # 점수 순으로 정렬
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results[:10]  # 상위 10개만

# 싱글톤 인스턴스
_rag_engine = None

def get_rag_engine() -> RAGSearchEngine:
    """RAG 엔진 싱글톤 인스턴스 반환"""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGSearchEngine()
    return _rag_engine

if __name__ == '__main__':
    # 테스트
    engine = get_rag_engine()
    
    test_queries = [
        "LLM이 뭐야?",
        "Docker 사용법",
        "AI 윤리에 대해 알려줘",
        "최신 글 추천해줘"
    ]
    
    for query in test_queries:
        logger.info(f"\n질문: {query}")
        answer, related_posts = engine.search_with_rag(query)
        logger.info(f"답변: {answer[:200]}...")
        logger.info(f"관련 글: {len(related_posts)}개")
        for post in related_posts:
            logger.info(f"  - {post['title']} (유사도: {post['similarity']:.3f})")