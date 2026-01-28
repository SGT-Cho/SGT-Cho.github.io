#!/bin/bash

# 블로그 LLM 서버 시작 스크립트

echo "블로그 LLM 서버를 시작합니다..."

# 가상환경 활성화 (있는 경우)
if [ -d "venv" ]; then
    echo "가상환경 활성화..."
    source venv/bin/activate
fi

# 필요한 패키지 설치 확인
echo "패키지 확인 중..."
pip install -r requirements.txt

# 인덱스 디렉토리 확인
if [ ! -d "index" ]; then
    echo "인덱스가 없습니다. 콘텐츠 인덱싱을 먼저 실행합니다..."
    python content_indexer.py
fi

# 서버 실행
echo "Flask 서버 시작 (포트 8000)..."
export FLASK_APP=blog_server_with_llm.py
export FLASK_ENV=development
python blog_server_with_llm.py