#!/bin/bash

echo "블로그 Docker 환경 시작..."

# 기존 로컬 서비스 중지
echo "기존 로컬 서비스 중지..."
pkill -f gunicorn 2>/dev/null
sudo nginx -s stop 2>/dev/null

# Docker 이미지 빌드
echo "Docker 이미지 빌드..."
docker-compose build

# Docker 컨테이너 시작
echo "Docker 컨테이너 시작..."
docker-compose up -d

# 로그 확인
echo ""
echo "서비스 상태:"
docker-compose ps

echo ""
echo "로그 확인:"
echo "docker-compose logs -f"

echo ""
echo "서비스 중지:"
echo "docker-compose down"

echo ""
echo "접속 주소: http://localhost:8000"