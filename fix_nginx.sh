#!/bin/bash

echo "Nginx 설정 수정 중..."

# 1. 기본 서버 블록을 주석 처리하고 include 추가
sudo tee /opt/homebrew/etc/nginx/nginx.conf > /dev/null << 'EOF'

#user  nobody;
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Include all server configurations
    include servers/*;

    # 기본 서버 블록 주석 처리 (8080 포트 충돌 방지)
    # server {
    #     listen       8080;
    #     server_name  localhost;
    #     location / {
    #         root   html;
    #         index  index.html index.htm;
    #     }
    # }
}
EOF

echo "✅ nginx.conf 수정 완료"

# 2. servers 디렉토리가 없으면 생성
sudo mkdir -p /opt/homebrew/etc/nginx/servers

# 3. 블로그 설정 파일 복사
sudo cp /Users/minjaecho/Sites/sgtcho-blog/nginx_blog.conf /opt/homebrew/etc/nginx/servers/sgtcho-blog.conf

echo "✅ 블로그 설정 파일 복사 완료"

# 4. Nginx 테스트
echo "Nginx 설정 테스트..."
sudo nginx -t

# 5. Nginx 재시작
echo "Nginx 재시작..."
sudo nginx -s stop 2>/dev/null || true
sleep 1
sudo nginx

echo ""
echo "✅ 완료!"
echo ""
echo "테스트:"
echo "curl -I http://localhost:8000"
echo ""
echo "Gunicorn 서버가 8001 포트에서 실행 중인지 확인하세요:"
echo "sudo lsof -i :8001"