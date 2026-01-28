#!/bin/bash

echo "블로그 서버 재시작 중..."

# 모든 gunicorn 프로세스 종료
echo "기존 프로세스 종료..."
pkill -f gunicorn
sleep 2

# 로그 파일 정리 (선택사항)
echo "로그 파일 정리..."
> logs/llm_server.log
> logs/error.log
> logs/access.log

# 서버 재시작
echo "서버 시작..."
./start_blog_with_llm.sh

echo "완료!"
echo ""
echo "서버 상태 확인:"
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 | grep -q "200"; then
    echo "✅ 서버가 정상적으로 실행 중입니다!"
else
    echo "❌ 서버 시작 실패. 로그를 확인하세요:"
    echo "tail -f logs/error.log"
fi