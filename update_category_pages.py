#!/usr/bin/env python3
"""
카테고리 페이지들을 무한 스크롤로 업데이트하는 스크립트
"""

import os
from pathlib import Path
from bs4 import BeautifulSoup

BLOG_ROOT = Path(__file__).parent
CATEGORIES = ['life', 'review', 'portfolio']

def update_category_page(category):
    """카테고리 페이지를 무한 스크롤로 업데이트"""
    index_path = BLOG_ROOT / category / 'index.html'
    
    if not index_path.exists():
        print(f"❌ {category}/index.html 파일을 찾을 수 없습니다.")
        return
    
    # 기존 HTML 읽기
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # BeautifulSoup으로 파싱
    soup = BeautifulSoup(content, 'html.parser')
    
    # 기존 포스트 목록 영역 찾기
    main_content = soup.find('main') or soup.find('div', class_='content') or soup.find('div', id='content')
    
    if not main_content:
        print(f"⚠️  {category}: 메인 컨텐츠 영역을 찾을 수 없습니다.")
        return
    
    # 무한 스크롤 컨테이너로 교체
    main_content.clear()
    
    # 새로운 구조 추가
    new_content = soup.new_tag('div', id='posts-container')
    posts_wrapper = soup.new_tag('div', id='posts-wrapper')
    new_content.append(posts_wrapper)
    main_content.append(new_content)
    
    # 무한 스크롤 스크립트 추가
    script_tag = soup.new_tag('script', src='/static/js/infinite-scroll.js')
    soup.body.append(script_tag)
    
    # 초기화 스크립트 추가
    init_script = soup.new_tag('script')
    init_script.string = f"""
    document.addEventListener('DOMContentLoaded', function() {{
        new InfiniteScroll({{
            container: '#posts-container',
            itemsWrapper: '#posts-wrapper',
            category: '{category}',
            threshold: 200
        }});
    }});
    """
    soup.body.append(init_script)
    
    # 업데이트된 HTML 저장
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(str(soup.prettify()))
    
    print(f"✅ {category}/index.html 업데이트 완료")

def create_posts_metadata(category):
    """포스트 메타데이터 JSON 파일 생성"""
    category_path = BLOG_ROOT / category
    posts = []
    
    if not category_path.exists():
        return
    
    # HTML 파일 직접 스캔
    for item in sorted(category_path.iterdir()):
        # HTML 파일이고 index.html이 아닌 경우
        if item.is_file() and item.suffix == '.html' and item.name != 'index.html':
            # HTML에서 메타데이터 추출
            with open(item, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
            
            title = soup.find('title')
            title_text = title.text if title else item.stem.replace('-', ' ').title()
            
            # 첫 번째 단락을 excerpt로 사용
            first_p = soup.find('p')
            excerpt = first_p.text[:200] + '...' if first_p else ''
            
            # 이미지 찾기
            img = soup.find('img')
            thumbnail = img.get('src') if img else None
            
            posts.append({
                'title': title_text,
                'url': f'/{category}/{item.name}',
                'date': item.stat().st_mtime,
                'excerpt': excerpt,
                'thumbnail': thumbnail
            })
    
    # 날짜순 정렬 (최신순)
    posts.sort(key=lambda x: x['date'], reverse=True)
    
    # 날짜를 ISO 형식으로 변환
    from datetime import datetime
    for post in posts:
        post['date'] = datetime.fromtimestamp(post['date']).isoformat()
    
    # JSON 파일로 저장
    import json
    posts_json_path = category_path / 'posts.json'
    with open(posts_json_path, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {category}/posts.json 생성 완료 ({len(posts)}개 포스트)")

if __name__ == "__main__":
    print("카테고리 페이지 무한 스크롤 업데이트 시작...")
    
    for category in CATEGORIES:
        print(f"\n{category} 처리 중...")
        create_posts_metadata(category)
        update_category_page(category)
    
    print("\n✅ 모든 카테고리 업데이트 완료!")
    print("\n다음 단계:")
    print("1. 서버 재시작: ./restart_blog.sh")
    print("2. Nginx 설정: sudo ./setup_nginx.sh")
    print("3. 브라우저에서 확인: https://sgtcho.com")