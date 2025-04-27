import os
import json
from datetime import datetime

POST_DIRS = ['life', 'review']
THUMBNAILS = {
    'life': '/assets/images/thumbnails/daily.png',
    'review/2025-04-26-coffee-review-seoul.html': '/assets/images/thumbnails/coffee.png',
    'review/2025-04-25-book-review-grokking-ai.html': '/assets/images/thumbnails/book.png'
}
CATEGORY_MAP = {
    'life': 'Life',
    'review': 'Review'
}

def extract_title_and_date(filepath):
    with open(filepath, encoding='utf-8') as f:
        for line in f:
            if '<title>' in line:
                title = line.split('<title>')[1].split('</title>')[0].strip()
                break
        else:
            title = os.path.basename(filepath)
    date = os.path.basename(filepath)[:10]
    return title, date

def get_teaser(filepath):
    if filepath.startswith('life/'):
        return THUMBNAILS['life']
    elif filepath in THUMBNAILS:
        return THUMBNAILS[filepath]
    else:
        return '/assets/images/thumbnails/daily.png'

def main():
    posts = []
    for d in POST_DIRS:
        if not os.path.isdir(d):
            continue
        for fname in os.listdir(d):
            if not fname.endswith('.html'):
                continue
            path = os.path.join(d, fname)
            title, date = extract_title_and_date(path)
            url = '/' + path.replace('\\', '/')
            category = CATEGORY_MAP[d]
            teaser = get_teaser(path)
            posts.append({
                'title': title,
                'url': url,
                'date': date,
                'category': category,
                'teaser': teaser
            })
    posts.sort(key=lambda x: x['date'], reverse=True)
    with open('posts.json', 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()