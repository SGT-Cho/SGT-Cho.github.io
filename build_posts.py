import os
import json
from datetime import datetime
import re

POST_DIRS = ['life', 'review']

# 썸네일로 사용하지 않을 이미지 목록
EXCLUDED_IMAGES = [
    '/assets/images/minjae.png',
    'minjae.png',
    './minjae.png',
    '../assets/images/minjae.png',
    'assets/images/minjae.png'
]

# 카테고리별 기본 썸네일
BASE_THUMBNAILS = {
    'life': '/assets/images/thumbnails/daily.png',
    'review': '/assets/images/thumbnails/daily.png'
}

# 직접 설정된 썸네일 매핑
EXPLICIT_THUMBNAILS = {
    'review/2025-04-26-coffee-review-seoul.html': '/assets/images/thumbnails/coffee.png',
    'review/2025-04-25-book-review-grokking-ai.html': '/assets/images/thumbnails/book.png',
    'life/2025-04-27-daily-graduation-prep.html': '/assets/images/thumbnails/daily.png'
}

# 기본 대체 썸네일
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

def is_excluded_image(img_path):
    """해당 이미지가 제외 목록에 있는지 확인"""
    img_name = os.path.basename(img_path)
    
    # 파일명이 제외 목록의 파일명과 일치하는지 확인
    if img_name == 'minjae.png':
        return True
        
    # 전체 경로가 제외 목록에 있는지 확인
    for excluded in EXCLUDED_IMAGES:
        if excluded in img_path:
            return True
    
    return False

def extract_first_image(content):
    """게시물 내용에서 첫 번째 이미지 URL을 추출합니다. 제외 목록에 있는 이미지는 건너뜁니다."""
    # 모든 img 태그 찾기
    img_matches = re.finditer(r'<img\s+[^>]*src="([^"]+)"[^>]*>', content)
    
    for img_match in img_matches:
        img_src = img_match.group(1)
        
        # 제외 목록에 있는 이미지면 건너뛰기
        if is_excluded_image(img_src):
            continue
            
        return img_src
    
    return None

def get_teaser(filepath, title):
    # 1. 명시적으로 지정된 썸네일이 있는지 확인
    if filepath in EXPLICIT_THUMBNAILS:
        return EXPLICIT_THUMBNAILS[filepath]
    
    # 2. 파일 내용에서 첫 번째 적합한 이미지를 찾아 썸네일로 사용
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            first_image = extract_first_image(content)
            if first_image:
                # 상대 경로일 경우 절대 경로로 변환
                if first_image.startswith('./') or not (first_image.startswith('/') or first_image.startswith('http')):
                    # 현재 파일의 디렉토리 경로 가져오기
                    dir_path = os.path.dirname(filepath)
                    if first_image.startswith('./'):
                        first_image = first_image[2:]  # './' 제거
                    # 상대 경로를 절대 경로로 변환
                    first_image = '/' + os.path.normpath(os.path.join(dir_path, first_image))
                # 이미지가 웹 URL이 아니라면 로컬 경로로 간주
                if not (first_image.startswith('http://') or first_image.startswith('https://')):
                    # 경로가 '//'로 시작하면 '/'로 정규화
                    if first_image.startswith('//'):
                        first_image = first_image[1:]
                return first_image
    except Exception as e:
        print(f"파일 처리 중 오류 발생 ({filepath}): {e}")
    
    # 3. 카테고리별 기본 썸네일 사용
    category = filepath.split('/')[0]
    if category in BASE_THUMBNAILS:
        return BASE_THUMBNAILS[category]
            
    # 4. 아무것도 없으면 기본 이미지 사용
    return DEFAULT_THUMBNAIL

def main():
    posts = []
    skipped_images = []
    
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
            
            # minjae.png가 여전히 썸네일로 사용되고 있다면 DEFAULT_THUMBNAIL로 대체
            if 'minjae.png' in teaser:
                skipped_images.append(path)
                teaser = DEFAULT_THUMBNAIL
            
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
    print(f"minjae.png 이미지가 제외된 게시물: {len(skipped_images)}개")
    
    # 사용된 썸네일 통계
    thumbnail_count = {}
    for p in posts:
        thumb = p['teaser']
        thumbnail_count[thumb] = thumbnail_count.get(thumb, 0) + 1
    
    print("\n썸네일 사용 현황:")
    for thumb, count in sorted(thumbnail_count.items(), key=lambda x: x[1], reverse=True):
        print(f"- {thumb}: {count}개")

if __name__ == '__main__':
    main()