#!/bin/bash

echo "Nginx 설정 중..."

# Nginx 디렉토리 생성 (homebrew 경로)
sudo mkdir -p /opt/homebrew/etc/nginx/servers

# 설정 파일 복사
sudo cp nginx_blog.conf /opt/homebrew/etc/nginx/servers/sgtcho-blog.conf

# Nginx 메인 설정에 include 추가 확인
if ! grep -q "include.*servers" /opt/homebrew/etc/nginx/nginx.conf; then
    echo "Nginx 메인 설정에 include 추가 필요"
    echo "다음을 /opt/homebrew/etc/nginx/nginx.conf의 http 블록 안에 추가하세요:"
    echo "    include servers/*;"
fi

# Nginx 테스트
sudo nginx -t

# Nginx 재시작
echo "Nginx 재시작..."
sudo nginx -s reload || sudo nginx

echo "완료! Nginx가 포트 8000에서 실행 중입니다."
echo ""
echo "확인:"
echo "- Nginx (프록시): http://localhost:8000"
echo "- Gunicorn (직접): http://localhost:8001"