#!/usr/bin/env python3
"""
블로그 콘텐츠 인덱싱 시스템
HTML 파싱, 텍스트 청킹, 임베딩 생성 및 벡터 DB 저장
"""

import os
import json
import re
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from bs4 import BeautifulSoup
import requests
import numpy as np
from collections import defaultdict

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 설정
BLOG_ROOT = Path(__file__).parent
LLM_ENDPOINT = "http://127.0.0.1:1234"
CHUNK_SIZE = 500  # 문자 단위
CHUNK_OVERLAP = 100  # 청크 간 겹침
EMBEDDING_DIM = 768  # 임베딩 차원

class ContentIndexer:
    def __init__(self, blog_root: Path = BLOG_ROOT):
        self.blog_root = blog_root
        self.posts_data = []
        self.chunks = []
        self.embeddings = []
        
    def parse_html_file(self, file_path: Path) -> Dict[str, Any]:
        """HTML 파일 파싱하여 메타데이터와 콘텐츠 추출"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # 메타데이터 추출
            title = soup.find('h1', class_='post-title')
            title = title.text.strip() if title else soup.find('title').text.strip()
            
            # 날짜 추출
            date_elem = soup.find('time', class_='post-date')
            if date_elem:
                date = date_elem.get('datetime', '')
            else:
                # 파일명에서 날짜 추출 (YYYY-MM-DD 형식)
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', file_path.name)
                date = date_match.group(1) if date_match else ''
            
            # 카테고리 추출
            category = file_path.parent.name
            
            # 태그 추출
            tags = []
            tag_elements = soup.find_all('span', class_='post-tag')
            for tag in tag_elements:
                tags.append(tag.text.strip())
            
            # 본문 추출
            content = soup.find('article', class_='post-content')
            if not content:
                content = soup.find('div', class_='content')
            if not content:
                content = soup.find('main')
            
            # 텍스트만 추출
            if content:
                # 코드 블록은 보존
                code_blocks = content.find_all('pre')
                for i, code in enumerate(code_blocks):
                    code.string = f"[CODE_BLOCK_{i}]"
                
                text_content = content.get_text(separator='\n', strip=True)
                
                # 코드 블록 복원
                for i, code in enumerate(code_blocks):
                    text_content = text_content.replace(
                        f"[CODE_BLOCK_{i}]", 
                        code.get_text(strip=True)
                    )
            else:
                text_content = soup.get_text(separator='\n', strip=True)
            
            # 상대 URL 계산
            relative_url = '/' + str(file_path.relative_to(self.blog_root)).replace('\\', '/')
            
            return {
                'title': title,
                'date': date,
                'category': category,
                'tags': tags,
                'content': text_content,
                'url': relative_url,
                'file_path': str(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None
    
    def chunk_text(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """텍스트를 청크로 분할"""
        chunks = []
        
        # 문단 단위로 먼저 분할
        paragraphs = text.split('\n\n')
        
        current_chunk = ""
        current_length = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            para_length = len(para)
            
            # 현재 청크에 추가할 수 있는 경우
            if current_length + para_length <= CHUNK_SIZE:
                if current_chunk:
                    current_chunk += "\n\n"
                current_chunk += para
                current_length += para_length + 2
            else:
                # 현재 청크 저장
                if current_chunk:
                    chunks.append(self._create_chunk(current_chunk, metadata, len(chunks)))
                
                # 문단이 너무 긴 경우 문장 단위로 분할
                if para_length > CHUNK_SIZE:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    current_chunk = ""
                    current_length = 0
                    
                    for sent in sentences:
                        sent_length = len(sent)
                        if current_length + sent_length <= CHUNK_SIZE:
                            if current_chunk:
                                current_chunk += " "
                            current_chunk += sent
                            current_length += sent_length + 1
                        else:
                            if current_chunk:
                                chunks.append(self._create_chunk(current_chunk, metadata, len(chunks)))
                            current_chunk = sent
                            current_length = sent_length
                else:
                    current_chunk = para
                    current_length = para_length
        
        # 마지막 청크 저장
        if current_chunk:
            chunks.append(self._create_chunk(current_chunk, metadata, len(chunks)))
        
        return chunks
    
    def _create_chunk(self, content: str, metadata: Dict[str, Any], chunk_index: int) -> Dict[str, Any]:
        """청크 객체 생성"""
        chunk_id = f"{metadata['url']}#chunk{chunk_index}"
        return {
            'chunk_id': chunk_id,
            'content': content,
            'post_url': metadata['url'],
            'title': metadata['title'],
            'date': metadata['date'],
            'category': metadata['category'],
            'tags': metadata['tags'],
            'chunk_index': chunk_index
        }
    
    def get_embedding(self, text: str) -> List[float]:
        """텍스트의 임베딩 벡터 생성"""
        try:
            response = requests.post(
                f"{LLM_ENDPOINT}/v1/embeddings",
                json={
                    "input": text,
                    "model": "text-embedding-ada-002"  # 또는 사용 가능한 모델
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['data'][0]['embedding']
            else:
                # 임시 랜덤 임베딩 (실제로는 사용하지 않음)
                logger.warning(f"Embedding API failed, using random embedding")
                return np.random.rand(EMBEDDING_DIM).tolist()
                
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            # 임시 랜덤 임베딩
            return np.random.rand(EMBEDDING_DIM).tolist()
    
    def index_all_posts(self):
        """모든 블로그 포스트 인덱싱"""
        logger.info("Starting content indexing...")
        
        # HTML 파일 찾기
        html_files = []
        for category in ['review', 'life', 'portfolio']:
            category_path = self.blog_root / category
            if category_path.exists():
                html_files.extend(category_path.glob('*.html'))
        
        logger.info(f"Found {len(html_files)} HTML files")
        
        # 각 파일 처리
        for file_path in html_files:
            logger.info(f"Processing {file_path.name}")
            
            # HTML 파싱
            post_data = self.parse_html_file(file_path)
            if not post_data:
                continue
            
            self.posts_data.append(post_data)
            
            # 텍스트 청킹
            chunks = self.chunk_text(post_data['content'], post_data)
            
            # 각 청크에 대한 임베딩 생성
            for chunk in chunks:
                embedding = self.get_embedding(chunk['content'])
                chunk['embedding'] = embedding
                self.chunks.append(chunk)
        
        logger.info(f"Indexed {len(self.posts_data)} posts with {len(self.chunks)} chunks")
    
    def save_index(self, output_dir: Path = None):
        """인덱스 저장"""
        if output_dir is None:
            output_dir = self.blog_root / 'index'
        
        output_dir.mkdir(exist_ok=True)
        
        # 포스트 메타데이터 저장
        posts_file = output_dir / 'posts_metadata.json'
        with open(posts_file, 'w', encoding='utf-8') as f:
            json.dump(self.posts_data, f, ensure_ascii=False, indent=2)
        
        # 청크 저장 (임베딩 제외)
        chunks_file = output_dir / 'chunks.json'
        chunks_without_embeddings = []
        for chunk in self.chunks:
            chunk_copy = chunk.copy()
            chunk_copy.pop('embedding', None)
            chunks_without_embeddings.append(chunk_copy)
        
        with open(chunks_file, 'w', encoding='utf-8') as f:
            json.dump(chunks_without_embeddings, f, ensure_ascii=False, indent=2)
        
        # 임베딩 별도 저장 (numpy 형식)
        embeddings_file = output_dir / 'embeddings.npy'
        embeddings_array = np.array([chunk['embedding'] for chunk in self.chunks])
        np.save(embeddings_file, embeddings_array)
        
        # 인덱스 정보 저장
        index_info = {
            'created_at': datetime.now().isoformat(),
            'total_posts': len(self.posts_data),
            'total_chunks': len(self.chunks),
            'chunk_size': CHUNK_SIZE,
            'chunk_overlap': CHUNK_OVERLAP,
            'embedding_dim': EMBEDDING_DIM
        }
        
        info_file = output_dir / 'index_info.json'
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(index_info, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Index saved to {output_dir}")
    
    def search_similar_chunks(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """쿼리와 유사한 청크 검색"""
        # 쿼리 임베딩 생성
        query_embedding = np.array(self.get_embedding(query))
        
        # 모든 청크 임베딩 로드
        embeddings = np.array([chunk['embedding'] for chunk in self.chunks])
        
        # 코사인 유사도 계산
        similarities = np.dot(embeddings, query_embedding) / (
            np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
        
        # 상위 k개 선택
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            chunk = self.chunks[idx].copy()
            chunk['similarity'] = float(similarities[idx])
            chunk.pop('embedding', None)  # 임베딩은 제외
            results.append(chunk)
        
        return results

def main():
    """메인 실행 함수"""
    indexer = ContentIndexer()
    
    # 모든 포스트 인덱싱
    indexer.index_all_posts()
    
    # 인덱스 저장
    indexer.save_index()
    
    # 테스트 검색
    logger.info("\n테스트 검색 실행...")
    test_queries = ["AI", "LLM", "Docker", "딥러닝"]
    
    for query in test_queries:
        logger.info(f"\n검색어: {query}")
        results = indexer.search_similar_chunks(query, top_k=3)
        for i, result in enumerate(results):
            logger.info(f"  {i+1}. {result['title']} (유사도: {result['similarity']:.3f})")
            logger.info(f"     URL: {result['post_url']}")
            logger.info(f"     내용: {result['content'][:100]}...")

if __name__ == '__main__':
    main()