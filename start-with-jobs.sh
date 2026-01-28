#!/bin/bash

echo "🚀 Starting Blog + Job Site Integration..."

# 1. Nginx 설정 업데이트
echo "📝 Updating Nginx configuration..."
sudo cp nginx_blog_with_jobs.conf /usr/local/etc/nginx/servers/sgtcho-blog.conf

# 2. Nginx 재시작
echo "🔄 Restarting Nginx..."
sudo nginx -t && sudo nginx -s reload

# 3. Job API 서버 시작
echo "🚀 Starting Job API server..."
cd job-site-server
npm install --production
PORT=5001 node start.js &
JOB_API_PID=$!
cd ..

# 4. 블로그 서버 시작 (기존 프로세스가 있으면 종료)
echo "🚀 Starting Blog server..."
pkill -f "gunicorn.*blog_server_with_llm" || true
gunicorn -c gunicorn_config.py blog_server_with_llm:app &
BLOG_PID=$!

echo "✅ All services started!"
echo "📍 Blog: http://localhost:8000"
echo "📍 Job Site: http://localhost:8000/jobs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Trap Ctrl+C
trap "echo '🛑 Stopping services...'; kill $JOB_API_PID $BLOG_PID; exit" INT

# Wait
wait