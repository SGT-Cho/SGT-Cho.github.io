# Node.js 이미지 사용
FROM node:18-alpine

# PDF 생성을 위한 폰트 설치
RUN apk add --no-cache \
    ttf-freefont \
    fontconfig

# 작업 디렉토리 설정
WORKDIR /app

# package.json 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 애플리케이션 소스 복사
COPY . .

# 포트 노출
EXPOSE 5001

# 애플리케이션 실행
CMD ["node", "start.js"]