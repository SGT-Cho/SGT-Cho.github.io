# Blog + Job Site 통합 배포 가이드

## 개요
sgtcho.com 블로그에 Job Site를 /jobs 경로로 통합하는 가이드입니다.

## 파일 구조
```
sgtcho-blog/
├── jobs/                    # Job Site React 빌드 파일
├── job-site-server/        # Job Site API 서버
│   ├── server/             # API 코드
│   ├── package.json
│   ├── start.js
│   └── Dockerfile
├── nginx_blog_with_jobs.conf  # 통합 Nginx 설정
├── docker-compose-with-jobs.yml # Docker 통합 설정
└── start-with-jobs.sh      # 로컬 테스트 스크립트
```

## 로컬 테스트

### 방법 1: 직접 실행
```bash
cd /Users/minjaecho/Sites/sgtcho-blog
./start-with-jobs.sh
```

### 방법 2: Docker Compose
```bash
cd /Users/minjaecho/Sites/sgtcho-blog
docker-compose -f docker-compose-with-jobs.yml up --build
```

## 프로덕션 배포

### 1. 서버에 파일 업로드
```bash
# Job Site 파일 업로드
scp -r jobs/ your-server:~/sgtcho-blog/
scp -r job-site-server/ your-server:~/sgtcho-blog/

# 설정 파일 업로드
scp nginx_blog_with_jobs.conf your-server:~/sgtcho-blog/
scp docker-compose-with-jobs.yml your-server:~/sgtcho-blog/
```

### 2. 서버에서 실행

#### Docker 방식 (권장)
```bash
cd ~/sgtcho-blog

# 기존 컨테이너 중지
docker-compose down

# 새 설정으로 시작
docker-compose -f docker-compose-with-jobs.yml up -d --build
```

#### 수동 방식
```bash
# 1. Nginx 설정 업데이트
sudo cp nginx_blog_with_jobs.conf /etc/nginx/sites-available/sgtcho.com
sudo nginx -t && sudo nginx -s reload

# 2. Job API 서버 시작
cd job-site-server
npm install --production
pm2 start start.js --name job-api

# 3. PM2 저장
pm2 save
pm2 startup
```

## 확인사항

### 1. 서비스 상태 확인
```bash
# Docker 방식
docker ps
docker logs blog-nginx
docker logs job-api

# PM2 방식
pm2 status
pm2 logs job-api
```

### 2. 엔드포인트 테스트
```bash
# 블로그 메인
curl http://localhost:8000/

# Job Site
curl http://localhost:8000/jobs/

# Job API
curl http://localhost:8000/jobs/api/health
```

### 3. 브라우저 접속
- 블로그: https://sgtcho.com
- Job Site: https://sgtcho.com/jobs

## 문제 해결

### Nginx 502 에러
```bash
# API 서버 확인
docker logs job-api
# 또는
pm2 logs job-api
```

### 정적 파일 404
```bash
# 파일 경로 확인
ls -la ~/sgtcho-blog/jobs/
```

### CORS 에러
```bash
# job-site-server/.env 확인
CORS_ORIGIN=https://sgtcho.com
```

## 업데이트 방법

### Job Site 업데이트
```bash
# 1. 새 빌드 업로드
scp -r jobs/ your-server:~/sgtcho-blog/

# 2. API 서버 재시작
docker restart job-api
# 또는
pm2 restart job-api
```

### 전체 재배포
```bash
docker-compose -f docker-compose-with-jobs.yml down
docker-compose -f docker-compose-with-jobs.yml up -d --build
```

## 백업 및 롤백

### 백업
```bash
# 현재 상태 백업
tar -czf backup-$(date +%Y%m%d).tar.gz jobs/ job-site-server/
```

### 롤백
```bash
# 이전 docker-compose.yml로 복원
docker-compose down
docker-compose up -d
```