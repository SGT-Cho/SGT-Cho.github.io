#!/usr/bin/env python3
"""
Build script that:
1. Parses front-matter from all blog posts
2. Generates posts.json with metadata
3. Creates feed.xml (RSS)
4. Generates sitemap.xml
5. Creates tag directory pages if they don't exist
"""

import os
import re
import json
import time
import math
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
POST_DIRS = ['life', 'review']
TEMPLATE_DIR = ROOT_DIR / 'templates'
TAG_DIR = ROOT_DIR / 'tags'
READ_WORDS_PER_MINUTE = 200  # Average reading speed

def extract_frontmatter(file_path: Path) -> Dict[str, Any]:
    """Extract front-matter from HTML comments at the beginning of a file."""
    content = file_path.read_text(encoding='utf-8')
    
    # Look for front-matter in HTML comments
    frontmatter_pattern = r'<!--\s*(.*?)\s*-->'
    match = re.search(frontmatter_pattern, content, re.DOTALL)
    
    if not match:
        print(f"No frontmatter found in {file_path}")
        return {}
    
    frontmatter_text = match.group(1)
    metadata = {}
    
    # Extract key-value pairs
    for line in frontmatter_text.split('\n'):
        line = line.strip()
        if ':' in line:
            key, value = line.split(':', 1)
            metadata[key.strip()] = value.strip()
    
    # Convert date string to proper format
    if 'date' in metadata:
        date_obj = datetime.strptime(metadata['date'], '%Y-%m-%d')
        metadata['date'] = date_obj.strftime('%Y-%m-%d')
        metadata['iso_date'] = date_obj.strftime('%Y-%m-%dT%H:%M:%S+09:00')  # KST timezone
    
    # Extract tags as a list
    if 'tags' in metadata:
        metadata['tags'] = [tag.strip() for tag in metadata['tags'].split(',')]
    
    # Calculate read time if not provided
    if 'readtime' not in metadata:
        text_content = re.sub(r'<[^>]+>', '', content)  # Remove HTML tags
        word_count = len(text_content.split())
        metadata['readtime'] = math.ceil(word_count / READ_WORDS_PER_MINUTE)
    else:
        metadata['readtime'] = int(metadata['readtime'])
    
    # Add file path
    rel_path = str(file_path.relative_to(ROOT_DIR))
    metadata['url'] = f"/{rel_path}"
    
    return metadata

def collect_posts() -> List[Dict[str, Any]]:
    """Collect metadata from all posts in designated directories."""
    posts = []
    
    for post_dir in POST_DIRS:
        dir_path = ROOT_DIR / post_dir
        if not dir_path.exists():
            continue
            
        for file_path in dir_path.glob('*.html'):
            # Skip index.html
            if file_path.name == 'index.html':
                continue
                
            post_data = extract_frontmatter(file_path)
            if post_data:
                posts.append(post_data)
    
    # Sort posts by date (newest first)
    posts.sort(key=lambda x: x.get('date', ''), reverse=True)
    return posts

def generate_posts_json(posts: List[Dict[str, Any]]):
    """Generate posts.json file with all post metadata."""
    output_path = ROOT_DIR / 'posts.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    
    print(f"Generated posts.json with {len(posts)} entries")

def generate_feed_xml(posts: List[Dict[str, Any]]):
    """Generate RSS feed (feed.xml)."""
    output_path = ROOT_DIR / 'feed.xml'
    
    rss_items = []
    for post in posts[:10]:  # Limit to 10 most recent posts
        description = post.get('teaser', '')
        if description:
            description = description.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        rss_items.append(f"""
        <item>
            <title>{post.get('title', '').replace('&', '&amp;')}</title>
            <link>https://sgt-cho.github.io{post.get('url', '')}</link>
            <guid>https://sgt-cho.github.io{post.get('url', '')}</guid>
            <pubDate>{format_rfc822_date(post.get('date', ''))}</pubDate>
            <description>{description}</description>
            <category>{post.get('category', '')}</category>
        </item>
        """)
    
    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Minjae's Life &amp; Review Blog</title>
        <description>Personal blog of Minjae Cho - Life stories and reviews</description>
        <link>https://sgt-cho.github.io</link>
        <atom:link href="https://sgt-cho.github.io/feed.xml" rel="self" type="application/rss+xml" />
        <language>en-us</language>
        <lastBuildDate>{format_rfc822_date(datetime.now().strftime('%Y-%m-%d'))}</lastBuildDate>
        {''.join(rss_items)}
    </channel>
</rss>"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(rss_content)
    
    print(f"Generated feed.xml with {len(rss_items)} items")

def format_rfc822_date(date_str: str) -> str:
    """Format a date string as RFC 822 format for RSS feed."""
    if not date_str:
        return ''
    
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%a, %d %b %Y %H:%M:%S +0900')  # KST timezone
    except ValueError:
        return ''

def generate_sitemap_xml(posts: List[Dict[str, Any]]):
    """Generate sitemap.xml for search engines."""
    output_path = ROOT_DIR / 'sitemap.xml'
    
    # Static pages
    static_urls = [
        'https://sgt-cho.github.io/',
        'https://sgt-cho.github.io/about/',
        'https://sgt-cho.github.io/life/',
        'https://sgt-cho.github.io/review/',
        'https://sgt-cho.github.io/portfolio/',
        'https://sgt-cho.github.io/archive/',
    ]
    
    url_entries = []
    
    # Add static pages
    for url in static_urls:
        url_entries.append(f"""
    <url>
        <loc>{url}</loc>
        <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>""")
    
    # Add posts
    for post in posts:
        url = f"https://sgt-cho.github.io{post.get('url', '')}"
        date = post.get('date', datetime.now().strftime('%Y-%m-%d'))
        url_entries.append(f"""
    <url>
        <loc>{url}</loc>
        <lastmod>{date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>""")
    
    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{''.join(url_entries)}
</urlset>"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sitemap_content)
    
    print(f"Generated sitemap.xml with {len(url_entries)} URLs")

def collect_tags(posts: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Collect all tags and posts by tag."""
    tags = {}
    
    for post in posts:
        post_tags = post.get('tags', [])
        for tag in post_tags:
            if tag not in tags:
                tags[tag] = []
            tags[tag].append(post)
    
    return tags

def generate_tag_pages(tags: Dict[str, List[Dict[str, Any]]]):
    """Generate tag pages for each unique tag."""
    tag_template_path = TEMPLATE_DIR / 'list.html'
    
    if not tag_template_path.exists():
        print("Tag template not found at", tag_template_path)
        return
    
    tag_template = tag_template_path.read_text(encoding='utf-8')
    
    # Create tags directory if it doesn't exist
    TAG_DIR.mkdir(exist_ok=True)
    
    for tag, tag_posts in tags.items():
        tag_dir = TAG_DIR / tag
        tag_dir.mkdir(exist_ok=True)
        
        tag_index = tag_dir / 'index.html'
        
        # Prepare post entries
        post_entries = []
        for post in tag_posts:
            post_entries.append(f"""
      <article class="post-card">
        <div class="post-card-image">
          <img src="/assets/images/thumbnails/{post.get('thumbnail', '')}" alt="{post.get('title', '')}" loading="lazy">
        </div>
        <div class="post-card-content">
          <span class="post-card-badge">{post.get('category', '')}</span>
          <h3><a href="{post.get('url', '')}">{post.get('title', '')}</a></h3>
          <div class="post-card-meta">
            <span>{format_display_date(post.get('date', ''))}</span>
            <span>{post.get('readtime', 0)} min read</span>
          </div>
          <p class="post-card-excerpt">{post.get('teaser', '')}</p>
          <a href="{post.get('url', '')}" class="post-card-link">
            Read more
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </article>""")
        
        tag_content = tag_template.replace('{{title}}', f"Posts tagged with: {tag}")
        tag_content = tag_content.replace('{{description}}', f"All posts tagged with {tag}")
        tag_content = tag_content.replace('{{content}}', ''.join(post_entries))
        
        with open(tag_index, 'w', encoding='utf-8') as f:
            f.write(tag_content)
        
        print(f"Generated tag page for '{tag}' with {len(tag_posts)} posts")

def format_display_date(date_str: str) -> str:
    """Format a date string for display (e.g., 'April 25, 2025')."""
    if not date_str:
        return ''
    
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%B %d, %Y')
    except ValueError:
        return ''

def generate_service_worker():
    """Generate service-worker.js for offline capabilities."""
    output_path = ROOT_DIR / 'service-worker.js'
    
    service_worker_js = """// Service Worker for Minjae's Blog
const CACHE_NAME = 'minjae-blog-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/css/light.css',
  '/js/main.js',
  '/assets/images/avatar-minjae.jpg',
  '/assets/images/banner.jpg',
  '/posts.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseToCache = response.clone();
        
        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // If network fetch fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});

// Cache recent posts for offline reading
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_POSTS') {
    const postsToCache = event.data.posts;
    
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(postsToCache.map(postUrl => {
          return fetch(postUrl)
            .then(response => {
              if (response.status === 200) {
                return cache.put(postUrl, response);
              }
            });
        }));
      });
  }
});
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(service_worker_js)
    
    print(f"Generated service-worker.js")

def generate_manifest_json():
    """Generate manifest.json for PWA support."""
    output_path = ROOT_DIR / 'manifest.json'
    
    manifest_content = {
        "name": "Minjae's Life & Review Blog",
        "short_name": "Minjae's Blog",
        "description": "Personal blog of Minjae Cho",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#18181b",
        "theme_color": "#22d3ee",
        "icons": [
            {
                "src": "/assets/images/avatar-minjae.jpg",
                "sizes": "192x192",
                "type": "image/jpeg"
            }
        ]
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest_content, f, ensure_ascii=False, indent=2)
    
    print(f"Generated manifest.json")

def main():
    """Run all generation tasks."""
    print("Starting build process...")
    start_time = time.time()
    
    # Collect post data
    posts = collect_posts()
    print(f"Found {len(posts)} posts")
    
    # Generate files
    generate_posts_json(posts)
    generate_feed_xml(posts)
    generate_sitemap_xml(posts)
    
    # Collect tags and generate tag pages
    tags = collect_tags(posts)
    generate_tag_pages(tags)
    
    # Generate PWA support files
    generate_service_worker()
    generate_manifest_json()
    
    end_time = time.time()
    print(f"Build completed in {end_time - start_time:.2f} seconds")

if __name__ == "__main__":
    main()