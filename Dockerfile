FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 모든 필요한 파일들을 먼저 복사
COPY requirements.txt .
COPY rag_search.py .
COPY api_pagination.py .
COPY content_indexer.py .

# Python 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn gevent

# 나머지 애플리케이션 코드 복사
COPY . .

# 인덱스 디렉토리가 있으면 복사
RUN mkdir -p /app/index

# 포트 노출
EXPOSE 8001

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# 실행
CMD ["gunicorn", "-c", "gunicorn_config.py", "blog_server_with_llm:app"]