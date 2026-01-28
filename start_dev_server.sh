#!/bin/bash

# 개발 서버 시작 스크립트 (디버깅용)

echo "개발 서버를 시작합니다..."

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

# 가상환경 활성화
if [ -d "venv" ]; then
    echo "가상환경 활성화..."
    source venv/bin/activate
fi

# Flask 개발 서버 시작
echo "Flask 개발 서버 시작 (포트 8001)..."
export FLASK_ENV=development
export FLASK_DEBUG=1
python blog_server_with_llm.py