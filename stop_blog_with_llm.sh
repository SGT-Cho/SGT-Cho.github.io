#!/bin/bash

# 블로그 LLM 서버 중지 스크립트

echo "블로그 LLM 서버를 중지합니다..."

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

# PID 파일에서 프로세스 ID 읽기
if [ -f "logs/llm_server.pid" ]; then
    PID=$(cat logs/llm_server.pid)
    if ps -p $PID > /dev/null; then
        echo "서버 중지 중 (PID: $PID)..."
        kill -9 $PID
        rm logs/llm_server.pid
        echo "서버가 중지되었습니다."
    else
        echo "서버가 실행 중이지 않습니다."
        rm logs/llm_server.pid
    fi
else
    # PID 파일이 없으면 프로세스 검색
    PID=$(ps aux | grep "blog_server_with_llm.py" | grep -v grep | awk '{print $2}')
    if [ ! -z "$PID" ]; then
        echo "서버 중지 중 (PID: $PID)..."
        kill -9 $PID
        echo "서버가 중지되었습니다."
    else
        echo "실행 중인 서버를 찾을 수 없습니다."
    fi
fi