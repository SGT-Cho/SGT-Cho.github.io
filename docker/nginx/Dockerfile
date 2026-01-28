FROM nginx:alpine

# 필요한 패키지 설치
RUN apk add --no-cache curl

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]