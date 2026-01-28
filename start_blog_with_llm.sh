#!/bin/bash

# 블로그 LLM 서버 시작 스크립트

echo "블로그 LLM 서버를 시작합니다..."

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

# 기존 서버 프로세스 종료
echo "기존 서버 확인 중..."
OLD_PID=$(ps aux | grep "blog_server_with_llm.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$OLD_PID" ]; then
    echo "기존 서버 종료 중 (PID: $OLD_PID)..."
    kill -9 $OLD_PID
    sleep 2
fi

# 가상환경 활성화
if [ -d "venv" ]; then
    echo "가상환경 활성화..."
    source venv/bin/activate
fi

# 서버 시작 (프로덕션 모드)
echo "Gunicorn 프로덕션 서버 시작 (포트 8000)..."
nohup gunicorn -c gunicorn_config.py blog_server_with_llm:app > logs/llm_server.log 2>&1 &

# PID 저장
echo $! > logs/llm_server.pid

echo "서버가 시작되었습니다!"
echo "로그 확인: tail -f logs/llm_server.log"
echo "접속 주소: http://localhost:8000"