# Job Site 통합 설정 가이드

## 현재 상황
- Blog는 Docker로 실행 중 (포트 8000, 8001)
- Job Site를 /jobs 경로로 통합

## 설정 단계

### 1. Nginx 설정 및 시작
```bash
# Nginx 설정 복사
sudo cp /Users/minjaecho/Sites/sgtcho-blog/nginx_blog_with_jobs.conf /usr/local/etc/nginx/servers/sgtcho-blog.conf

# Nginx 시작 (이미 실행 중이면 reload)
sudo nginx -t
sudo nginx
# 또는
sudo nginx -s reload
```

### 2. Job API 서버 시작
새 터미널에서:
```bash
cd /Users/minjaecho/Sites/sgtcho-blog
./start-jobs-only.sh
```

### 3. 확인
- Blog: http://localhost:8000
- Job Site: http://localhost:8000/jobs
- Job API 테스트: http://localhost:5001/api/health

## 문제 해결

### "nginx: [error] invalid PID number"
```bash
# nginx 프로세스 확인
ps aux | grep nginx

# nginx 재시작
sudo nginx -s stop
sudo nginx
```

### Job API 서버 에러
```bash
# 직접 실행
cd /Users/minjaecho/Sites/sgtcho-blog/job-site-server
node start.js
```

### 포트 충돌
```bash
# 5001 포트 사용 확인
lsof -i :5001

# 프로세스 종료
kill -9 <PID>
```

## Docker로 전체 실행 (권장)

### 1. 기존 Docker 컨테이너 중지
```bash
cd /Users/minjaecho/Sites/sgtcho-blog
docker-compose down
```

### 2. 새 Docker Compose로 시작
```bash
docker-compose -f docker-compose-with-jobs.yml up --build
```

이렇게 하면 모든 서비스가 자동으로 시작됩니다:
- Nginx (포트 8000)
- Blog 서버 (내부 8001)
- Job API 서버 (내부 5001)
- PostgreSQL
- Redis

## 빠른 테스트 (Docker 없이)

1. **터미널 1 - Job API 서버**:
```bash
cd /Users/minjaecho/Sites/sgtcho-blog/job-site-server
PORT=5001 node start.js
```

2. **터미널 2 - Nginx 확인**:
```bash
sudo nginx -s reload
```

3. **브라우저에서 확인**:
- http://localhost:8000/jobs

## API 엔드포인트 테스트
```bash
# Health check
curl http://localhost:5001/api/health

# Companies
curl http://localhost:5001/api/companies

# Jobs
curl http://localhost:5001/api/jobs

# Through Nginx proxy
curl http://localhost:8000/jobs/api/health
```