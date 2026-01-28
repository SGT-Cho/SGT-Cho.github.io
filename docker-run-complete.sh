#!/bin/bash

echo "🚀 블로그 Docker 환경 완전 재구성 시작..."

# 1. 기존 서비스 정리
echo "1️⃣ 기존 서비스 정리 중..."
docker-compose down -v
docker system prune -f
pkill -f gunicorn 2>/dev/null
sudo nginx -s stop 2>/dev/null

# 2. 필요한 디렉토리 생성
echo "2️⃣ 디렉토리 생성 중..."
mkdir -p logs/nginx
mkdir -p docker/nginx

# 3. 로그 파일 초기화
echo "3️⃣ 로그 파일 초기화..."
> logs/error.log
> logs/access.log
> logs/llm_server.log

# 4. Docker 이미지 재빌드
echo "4️⃣ Docker 이미지 빌드 중..."
docker-compose build --no-cache

# 5. 컨테이너 시작
echo "5️⃣ 컨테이너 시작 중..."
docker-compose up -d

# 6. 상태 확인
echo ""
echo "⏳ 서비스 시작 대기 중..."
sleep 5

echo ""
echo "📊 서비스 상태:"
docker-compose ps

echo ""
echo "🔍 헬스 체크:"
curl -s http://localhost:8001/health && echo " ✅ Blog App OK" || echo " ❌ Blog App Failed"
curl -s http://localhost:8000/health && echo " ✅ Nginx OK" || echo " ❌ Nginx Failed"

echo ""
echo "📝 로그 확인 명령어:"
echo "  - 전체 로그: docker-compose logs -f"
echo "  - Blog 앱 로그: docker-compose logs -f blog"
echo "  - Nginx 로그: docker-compose logs -f nginx"

echo ""
echo "🛑 서비스 중지:"
echo "  docker-compose down"

echo ""
echo "🌐 접속 주소:"
echo "  - 로컬: http://localhost:8000"
echo "  - 외부: https://sgtcho.com"

echo ""
echo "✅ 완료!"