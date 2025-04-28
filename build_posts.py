import os
import json
from datetime import datetime
import re

POST_DIRS = ['life', 'review']

# 실제 존재하는 썸네일 파일 목록
# 현재 coffee.png, book.png, daily.png만 존재함
AVAILABLE_THUMBNAILS = [
    '/assets/images/thumbnails/coffee.png',
    '/assets/images/thumbnails/book.png',
    '/assets/images/thumbnails/daily.png',
]

# 카테고리별 기본 썸네일 (존재하는 파일로 변경)
BASE_THUMBNAILS = {
    'life': '/assets/images/thumbnails/daily.png',
    'review': '/assets/images/thumbnails/daily.png'  # ai.png가 없으므로 daily.png로 대체
}

# 직접 설정된 썸네일 매핑
EXPLICIT_THUMBNAILS = {
    'review/2025-04-26-coffee-review-seoul.html': '/assets/images/thumbnails/coffee.png',
    'review/2025-04-25-book-review-grokking-ai.html': '/assets/images/thumbnails/book.png',
    'life/2025-04-27-daily-graduation-prep.html': '/assets/images/thumbnails/daily.png'
}

# 키워드 기반 썸네일 매핑 (실제 존재하는 파일만 사용)
KEYWORD_THUMBNAILS = {
    # 리뷰 카테고리 키워드
    'coffee': '/assets/images/thumbnails/coffee.png',
    'cafe': '/assets/images/thumbnails/coffee.png',
    'book': '/assets/images/thumbnails/book.png',
}

# 기본 대체 썸네일 (empty.png는 존재하는지 확인 필요)
DEFAULT_THUMBNAIL = '/assets/images/empty.png'

CATEGORY_MAP = {
    'life': 'Life',
    'review': 'Review'
}

def extract_title_and_date(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
            title_match = re.search(r'<title>(.*?)</title>', content)
            title = title_match.group(1).strip() if title_match else os.path.basename(filepath)
    except:
        title = os.path.basename(filepath)
    
    # 파일명에서 날짜 추출
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', os.path.basename(filepath))
    date = date_match.group(1) if date_match else "2025-01-01"  # 기본 날짜
    
    return title, date

def get_teaser(filepath, title):
    # 1. 명시적으로 지정된 썸네일이 있는지 확인
    if filepath in EXPLICIT_THUMBNAILS:
        return EXPLICIT_THUMBNAILS[filepath]
    
    # 2. 파일 경로와 제목을 소문자로 변환하여 키워드 검색
    path_lower = filepath.lower()
    title_lower = title.lower()
    
    # 카테고리 가져오기
    category = filepath.split('/')[0]
    
    # 3. 파일 내용 읽기
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read().lower()
    except:
        content = ""
    
    # 4. 키워드 검색으로 썸네일 결정
    for keyword, thumbnail in KEYWORD_THUMBNAILS.items():
        if (keyword in path_lower) or (keyword in title_lower) or (keyword in content):
            return thumbnail
    
    # 5. 카테고리별 기본 썸네일 사용
    if category in BASE_THUMBNAILS:
        return BASE_THUMBNAILS[category]
            
    # 6. 아무것도 없으면 기본 이미지 사용
    return DEFAULT_THUMBNAIL

def main():
    posts = []
    for d in POST_DIRS:
        if not os.path.isdir(d):
            continue
        for fname in os.listdir(d):
            if not fname.endswith('.html'):
                continue
            if fname == 'index.html':
                continue  # 인덱스 페이지 제외
                
            path = os.path.join(d, fname)
            title, date = extract_title_and_date(path)
            url = '/' + path.replace('\\', '/')
            category = CATEGORY_MAP[d]
            teaser = get_teaser(path, title)
            
            # 읽기 시간 추정 (1000단어당 5분)
            read_time = 5  # 기본 읽기 시간
            
            posts.append({
                'title': title,
                'url': url,
                'date': date,
                'category': category,
                'teaser': teaser,
                'readtime': read_time
            })
    
    # 날짜 기준 내림차순 정렬
    posts.sort(key=lambda x: x['date'], reverse=True)
    
    with open('posts.json', 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    
    print(f"총 {len(posts)}개의 게시물이 posts.json 파일에 저장되었습니다.")
    print(f"사용된 썸네일: {', '.join(set(p['teaser'] for p in posts))}")

if __name__ == '__main__':
    main()