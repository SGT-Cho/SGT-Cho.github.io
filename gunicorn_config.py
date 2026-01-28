"""
Gunicorn 프로덕션 서버 설정
"""

import os

# 서버 주소와 포트
bind = "0.0.0.0:8001"

# 워커 프로세스 수 (CPU 코어 수 * 2 + 1)
# 너무 많은 워커는 오히려 성능을 저하시킬 수 있습니다
workers = min(4, os.cpu_count() * 2 + 1)

# 워커 클래스 (비동기 처리를 위해 gevent 사용)
worker_class = "gevent"

# 각 워커가 처리할 수 있는 동시 연결 수
worker_connections = 1000

# 요청 타임아웃 (초)
timeout = 120

# 로그 설정
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"

# 프로세스 이름
proc_name = "blog_llm_server"

# 자동 재시작
reload = False  # 프로덕션에서는 False로 설정

# Keep-alive
keepalive = 5

# 워커 타임아웃 (대용량 파일 처리를 위해 증가)
graceful_timeout = 30

# 최대 요청 수 (메모리 누수 방지)
max_requests = 1000
max_requests_jitter = 50

# 최대 요청 크기 (100MB)
limit_request_line = 0
limit_request_fields = 100
limit_request_field_size = 0