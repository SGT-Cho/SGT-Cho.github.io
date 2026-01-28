#!/usr/bin/env python3
"""
Life 페이지를 원래 상태로 복구
"""

import re

# Life 페이지 읽기
with open('/Users/minjaecho/Sites/sgtcho-blog/life/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 무한 스크롤 관련 스크립트 제거
# 더 포괄적인 패턴으로 제거
content = re.sub(r'<script[^>]*src="/static/js/infinite-scroll\.js"[^>]*>\s*</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<script>\s*document\.addEventListener\([\'"]DOMContentLoaded[\'"],\s*function\(\)\s*{\s*new\s+InfiniteScroll\({[^}]+}\);\s*}\);\s*</script>', '', content, flags=re.DOTALL)

# 3. posts-wrapper div 제거 (있다면)
content = re.sub(r'<div id="posts-wrapper">\s*</div>', '', content)

# 4. posts-container가 비어있지 않은지 확인
if 'id="posts-container"' in content and not re.search(r'<div[^>]*id="posts-container"[^>]*>[\s\S]*?</div>', content):
    # posts-container가 비어있다면 원래 구조로 복구
    content = re.sub(
        r'<div[^>]*id="posts-container"[^>]*>\s*</div>',
        '<div id="posts-container" class="posts-grid">\n    <!-- 게시물이 여기에 동적으로 로드됩니다 -->\n  </div>',
        content
    )

# loading-initial 요소 추가 (없다면)
if 'id="loading-initial"' not in content:
    # posts-container 찾기
    posts_container_match = re.search(r'(<div[^>]*id="posts-container"[^>]*>)', content)
    if posts_container_match:
        # posts-container 앞에 loading-initial 추가
        insert_pos = posts_container_match.start()
        loading_html = '''  <div id="loading-initial" class="loading-container">
    <div class="spinner"></div>
    <p>게시물을 불러오는 중...</p>
  </div>
  
  '''
        content = content[:insert_pos] + loading_html + content[insert_pos:]

# 파일 저장
with open('/Users/minjaecho/Sites/sgtcho-blog/life/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Life 페이지가 복구되었습니다.")
print("브라우저를 새로고침(Cmd+R)해보세요.")