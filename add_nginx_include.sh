#!/bin/bash

# Nginx 설정에 include 추가
echo "Nginx 설정에 include 추가 중..."

# 백업 생성
sudo cp /opt/homebrew/etc/nginx/nginx.conf /opt/homebrew/etc/nginx/nginx.conf.backup

# include가 이미 있는지 확인
if grep -q "include.*servers" /opt/homebrew/etc/nginx/nginx.conf; then
    echo "✅ include servers/*; 가 이미 추가되어 있습니다."
else
    # http 블록 안에 include 추가
    sudo sed -i '' '/http {/,/^}/ s|#gzip  on;|#gzip  on;\
\
    include servers/*;|' /opt/homebrew/etc/nginx/nginx.conf
    echo "✅ include servers/*; 를 추가했습니다."
fi

# 설정 테스트
echo "Nginx 설정 테스트..."
sudo nginx -t

# Nginx 재시작
echo "Nginx 재시작..."
sudo nginx -s reload

echo "완료!"