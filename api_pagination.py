"""
페이지네이션 API 엔드포인트
무한 스크롤을 위한 데이터 제공
"""

from flask import Blueprint, jsonify, request
import os
import json
from pathlib import Path
from datetime import datetime

pagination_bp = Blueprint('pagination', __name__)

BLOG_ROOT = Path(__file__).parent
POSTS_PER_PAGE = 10

def get_posts_metadata(category):
    """카테고리별 포스트 메타데이터 가져오기"""
    posts = []
    category_path = BLOG_ROOT / category
    
    if not category_path.exists():
        return posts
    
    # posts.json 파일이 있는지 확인
    posts_json = category_path / 'posts.json'
    if posts_json.exists():
        with open(posts_json, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # 없으면 디렉토리에서 직접 읽기
    for item in category_path.iterdir():
        if item.is_dir() and (item / 'index.html').exists():
            # 메타데이터 파일 확인
            meta_file = item / 'meta.json'
            if meta_file.exists():
                with open(meta_file, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                    meta['url'] = f'/{category}/{item.name}/'
                    posts.append(meta)
            else:
                # 기본 메타데이터 생성
                posts.append({
                    'title': item.name.replace('-', ' ').title(),
                    'date': datetime.fromtimestamp(item.stat().st_mtime).isoformat(),
                    'url': f'/{category}/{item.name}/',
                    'excerpt': ''
                })
    
    # 날짜 기준 정렬 (최신순)
    posts.sort(key=lambda x: x.get('date', ''), reverse=True)
    return posts

@pagination_bp.route('/api/posts/<category>')
def get_posts(category):
    """카테고리별 포스트 목록 API"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', POSTS_PER_PAGE, type=int)
    
    # 전체 포스트 가져오기
    all_posts = get_posts_metadata(category)
    
    # 페이지네이션 계산
    total = len(all_posts)
    start = (page - 1) * per_page
    end = start + per_page
    
    posts = all_posts[start:end]
    
    return jsonify({
        'posts': posts,
        'page': page,
        'per_page': per_page,
        'total': total,
        'has_more': end < total
    })

@pagination_bp.route('/api/search')
def search_posts():
    """검색 API"""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', POSTS_PER_PAGE, type=int)
    
    if not query:
        return jsonify({'posts': [], 'total': 0})
    
    # 모든 카테고리에서 검색
    all_posts = []
    for category in ['life', 'review', 'portfolio']:
        posts = get_posts_metadata(category)
        for post in posts:
            # 제목과 설명에서 검색
            if (query.lower() in post.get('title', '').lower() or 
                query.lower() in post.get('excerpt', '').lower()):
                post['category'] = category
                all_posts.append(post)
    
    # 페이지네이션
    total = len(all_posts)
    start = (page - 1) * per_page
    end = start + per_page
    
    return jsonify({
        'posts': all_posts[start:end],
        'page': page,
        'per_page': per_page,
        'total': total,
        'has_more': end < total
    })