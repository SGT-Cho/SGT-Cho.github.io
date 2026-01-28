#!/usr/bin/env python3
"""
블로그 서버 with LLM 통합
기존 정적 파일 서빙 + LLM API 엔드포인트
"""

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os
import json
import requests
from datetime import datetime
import logging
from pathlib import Path
import mimetypes

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 필수 모듈 import
from rag_search import get_rag_engine
from api_pagination import pagination_bp

app = Flask(__name__)
CORS(app)

# Blueprint 등록
app.register_blueprint(pagination_bp)

# 설정
BLOG_ROOT = Path(__file__).parent
LLM_ENDPOINT = "http://127.0.0.1:1234"
STATIC_EXTENSIONS = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.json', '.xml', '.webp', '.avif', '.mp4'}

# 대화 히스토리 저장 (메모리에 임시 저장, 실제로는 DB 사용 권장)
conversations = {}

# MIME 타입 설정
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

@app.route('/')
def index():
    """메인 페이지"""
    return send_from_directory(BLOG_ROOT, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """정적 파일 서빙"""
    file_path = BLOG_ROOT / path
    
    # 디렉토리인 경우 index.html 찾기
    if file_path.is_dir():
        index_file = file_path / 'index.html'
        if index_file.exists():
            return send_from_directory(file_path.parent, f"{path}/index.html")
    
    # 파일이 존재하는 경우
    if file_path.exists() and file_path.suffix.lower() in STATIC_EXTENSIONS:
        return send_from_directory(file_path.parent, file_path.name)
    
    # 404 처리
    return send_from_directory(BLOG_ROOT, '404.html'), 404

@app.route('/api/chat', methods=['POST'])
def chat():
    """기본 채팅 API"""
    try:
        data = request.json
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'default')
        
        if not user_message:
            return jsonify({'error': '메시지가 비어있습니다.'}), 400
        
        # 대화 히스토리 가져오기
        if session_id not in conversations:
            conversations[session_id] = []
        
        # 사용자 메시지 추가
        conversations[session_id].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        
        # RAG 엔진으로 검색 및 응답 생성
        rag_engine = get_rag_engine()
        llm_response, related_posts = rag_engine.search_with_rag(
            user_message, 
            conversations[session_id]
        )
        
        # 응답 저장
        conversations[session_id].append({
            'role': 'assistant',
            'content': llm_response,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'response': llm_response,
            'session_id': session_id,
            'related_posts': related_posts
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """스트리밍 채팅 API (SSE)"""
    def generate():
        try:
            data = request.json
            user_message = data.get('message', '')
            session_id = data.get('session_id', 'default')
            
            # LLM 스트리밍 요청
            response = requests.post(
                f"{LLM_ENDPOINT}/v1/chat/completions",
                json={
                    "messages": [
                        {"role": "system", "content": get_system_prompt()},
                        {"role": "user", "content": user_message}
                    ],
                    "stream": True,
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                stream=True
            )
            
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        yield f"{line}\n\n"
                        
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/search', methods=['POST'])
def search():
    """콘텐츠 검색 API (RAG 기반)"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': '검색어가 비어있습니다.'}), 400
        
        # RAG 엔진으로 검색
        rag_engine = get_rag_engine()
        
        # 벡터 검색
        relevant_chunks = rag_engine.search_chunks(query, top_k=10)
        
        # 중복 제거하며 결과 정리
        results = []
        seen_urls = set()
        
        for chunk in relevant_chunks:
            url = chunk['post_url']
            if url not in seen_urls:
                seen_urls.add(url)
                results.append({
                    'title': chunk['title'],
                    'url': url,
                    'date': chunk.get('date', ''),
                    'summary': chunk['content'][:200] + '...',
                    'similarity': chunk['similarity']
                })
        
        # 키워드 검색 보충
        if len(results) < 5:
            keyword_results = rag_engine.search_posts_by_keyword(query)
            for post in keyword_results:
                if post['url'] not in seen_urls:
                    seen_urls.add(post['url'])
                    results.append({
                        'title': post['title'],
                        'url': post['url'],
                        'date': post.get('date', ''),
                        'summary': post.get('content', '')[:200] + '...'
                    })
        
        return jsonify({
            'results': results[:10],
            'total': len(results)
        })
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/suggest', methods=['POST'])
def suggest():
    """관련 글 추천 API"""
    try:
        data = request.json
        current_url = data.get('current_url', '')
        
        # TODO: 실제 추천 로직 구현
        # 현재는 임시로 최신 글 반환
        posts_file = BLOG_ROOT / 'posts.json'
        if posts_file.exists():
            with open(posts_file, 'r', encoding='utf-8') as f:
                posts = json.load(f)
            
            # 현재 글 제외하고 최신 5개
            suggestions = [p for p in posts if p.get('url') != current_url][:5]
            
            return jsonify({
                'suggestions': suggestions
            })
        
        return jsonify({'suggestions': []})
        
    except Exception as e:
        logger.error(f"Suggest error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def api_health():
    """API 헬스 체크 엔드포인트"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'llm_endpoint': LLM_ENDPOINT
    })

@app.route('/health', methods=['GET'])
def health():
    """기본 헬스 체크 엔드포인트"""
    return 'OK', 200

def call_llm(message: str, history: list = None) -> str:
    """LLM API 호출"""
    try:
        messages = [{"role": "system", "content": get_system_prompt()}]
        
        # 히스토리 추가 (최근 5개만)
        if history:
            for h in history[-10:]:  # 최근 5턴만 사용
                if h['role'] in ['user', 'assistant']:
                    messages.append({
                        'role': h['role'],
                        'content': h['content']
                    })
        
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
            return result['choices'][0]['message']['content']
        else:
            return "죄송합니다. LLM 서버와 통신할 수 없습니다."
            
    except requests.exceptions.Timeout:
        return "응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        return f"오류가 발생했습니다: {str(e)}"

def get_system_prompt() -> str:
    """시스템 프롬프트 반환"""
    return """당신은 민재님의 기술 블로그 AI 어시스턴트입니다.
이 블로그는 sgtcho.com 도메인에서 운영되며, 티스토리나 다른 플랫폼이 아닙니다.

역할:
- 블로그 콘텐츠를 기반으로 친근하고 전문적인 답변 제공
- 기술적 질문에 대한 명확한 설명
- 관련 블로그 글 추천
- 한국어로 자연스럽게 대화

주요 주제:
- AI/ML/DL 기술
- LLM (Large Language Models)
- 컴퓨터 비전 (YOLO, CNN 등)
- 자연어 처리 (BERT, Transformer 등)
- 소프트웨어 개발 도구 (Docker, TensorFlow 등)

톤앤매너:
- 친근하면서도 전문적
- 기술적 내용을 쉽게 설명
- 적절한 예시 사용

중요: 
- 절대 티스토리(tistory.com) URL을 생성하거나 언급하지 마세요
- 블로그 글 링크는 항상 상대 경로(예: /review/글제목.html) 형식으로 제공하세요"""

if __name__ == '__main__':
    # 포트 설정
    port = int(os.environ.get('PORT', 8000))
    
    logger.info(f"Starting blog server with LLM on port {port}")
    logger.info(f"Blog root: {BLOG_ROOT}")
    logger.info(f"LLM endpoint: {LLM_ENDPOINT}")
    
    # 서버 실행
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )