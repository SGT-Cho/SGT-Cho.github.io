# 블로그 LLM 통합 가이드

민재님의 기술 블로그에 LLM 챗봇을 통합하는 시스템입니다.

## 구현 완료 기능

### 1. Flask 기반 서버 (`blog_server_with_llm.py`)
- ✅ 기존 정적 파일 서빙 유지
- ✅ LLM API 엔드포인트 추가
  - `/api/chat` - 기본 대화 API
  - `/api/chat/stream` - 스트리밍 응답 (SSE)
  - `/api/search` - RAG 기반 콘텐츠 검색
  - `/api/suggest` - 관련 글 추천
  - `/api/health` - 헬스 체크

### 2. 콘텐츠 인덱싱 시스템 (`content_indexer.py`)
- ✅ HTML 파일 파싱 및 메타데이터 추출
- ✅ 텍스트 청킹 (500자 단위, 100자 오버랩)
- ✅ 임베딩 생성 (LLM 엔드포인트 활용)
- ✅ 인덱스 저장 (JSON + NumPy)

### 3. 프론트엔드 챗봇 UI (`js/chatbot.js`)
- ✅ 플로팅 챗봇 버튼
- ✅ 채팅 모달 인터페이스
- ✅ 실시간 메시지 전송/수신
- ✅ 대화 히스토리 저장 (로컬 스토리지)
- ✅ 모바일 반응형 디자인
- ✅ 관련 글 표시 기능

### 4. RAG 시스템 (`rag_search.py`)
- ✅ 벡터 유사도 검색
- ✅ 컨텍스트 기반 응답 생성
- ✅ 키워드 폴백 검색
- ✅ 관련 포스트 추천

## 설치 및 실행 방법

### 1. 필수 요구사항
- Python 3.8+
- LLM 엔드포인트 (http://127.0.0.1:1234)
- 클라우드플레어 터널 (선택사항)

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 콘텐츠 인덱싱
```bash
python content_indexer.py
```
- 모든 블로그 포스트를 인덱싱
- `index/` 디렉토리에 인덱스 파일 생성

### 4. 서버 실행
```bash
# 방법 1: 스크립트 사용
./start_llm_server.sh

# 방법 2: 직접 실행
python blog_server_with_llm.py
```

### 5. 접속
- 로컬: http://localhost:8000
- 클라우드플레어 터널 사용 시: 설정된 도메인

## 파일 구조

```
sgtcho-blog/
├── blog_server_with_llm.py    # Flask 서버 (LLM 통합)
├── content_indexer.py          # 콘텐츠 인덱싱 시스템
├── rag_search.py              # RAG 검색 엔진
├── js/
│   ├── main.js                # 기존 메인 스크립트
│   └── chatbot.js             # 챗봇 UI 모듈
├── index/                     # 인덱스 파일 저장 디렉토리
│   ├── posts_metadata.json    # 포스트 메타데이터
│   ├── chunks.json            # 텍스트 청크
│   ├── embeddings.npy         # 임베딩 벡터
│   └── index_info.json        # 인덱스 정보
├── requirements.txt           # Python 패키지 목록
├── start_llm_server.sh       # 서버 시작 스크립트
└── LLM_INTEGRATION_README.md  # 이 문서
```

## 클라우드플레어 터널 설정

### 1. 터널 설정 시 고려사항
- WebSocket/SSE 지원 활성화
- 타임아웃 설정 조정 (최소 100초)
- 요청 크기 제한 확인 (무료: 100MB)

### 2. 보안 설정
- LLM 엔드포인트는 로컬에서만 접근 가능
- API 요청 제한 설정 권장
- CORS 설정 확인

## 커스터마이징

### 1. 시스템 프롬프트 수정
`blog_server_with_llm.py`의 `get_system_prompt()` 함수 수정

### 2. 청킹 설정 변경
`content_indexer.py`의 상단 설정값 수정:
```python
CHUNK_SIZE = 500      # 청크 크기
CHUNK_OVERLAP = 100   # 오버랩 크기
```

### 3. UI 스타일 변경
`js/chatbot.js`의 `addStyles()` 함수에서 CSS 수정

## 향후 개선 사항

1. **성능 최적화**
   - 임베딩 캐싱
   - 응답 캐싱
   - 벡터 DB 최적화 (Pinecone, ChromaDB 등)

2. **기능 추가**
   - 다국어 지원
   - 음성 입력/출력
   - 코드 실행 기능
   - 피드백 시스템

3. **분석 기능**
   - 사용자 질문 분석
   - 인기 주제 추적
   - 응답 품질 모니터링

## 문제 해결

### LLM 엔드포인트 연결 실패
- 엔드포인트 URL 확인 (http://127.0.0.1:1234)
- 방화벽 설정 확인
- LLM 서버 실행 상태 확인

### 인덱싱 오류
- `index/` 디렉토리 권한 확인
- HTML 파일 인코딩 확인 (UTF-8)
- 메모리 부족 시 청크 크기 줄이기

### UI 표시 안 됨
- JavaScript 콘솔 에러 확인
- chatbot.js 로드 확인
- CSS 충돌 확인

## 라이선스
이 프로젝트는 민재님의 블로그를 위해 제작되었습니다.