#!/bin/bash

echo "🚀 Starting Job Site API Server..."

# 1. Job API 서버 시작
cd job-site-server

# 환경변수 설정
export NODE_ENV=production
export PORT=5001
export DB_ENABLED=false
export CACHE_ENABLED=false

# 서버 시작
echo "📦 Starting server on port 5001..."
node start.js