/**
 * 무한 스크롤 구현
 * 각 카테고리 페이지에서 사용
 */

class InfiniteScroll {
    constructor(options) {
        this.container = document.querySelector(options.container);
        this.itemsWrapper = document.querySelector(options.itemsWrapper);
        this.loadingElement = document.querySelector(options.loadingElement);
        this.category = options.category;
        this.page = 1;
        this.loading = false;
        this.hasMore = true;
        this.threshold = options.threshold || 100;
        
        this.init();
    }
    
    init() {
        // 기존 컨텐츠 제거
        this.itemsWrapper.innerHTML = '';
        
        // 로딩 인디케이터 생성
        if (!this.loadingElement) {
            this.createLoadingElement();
        }
        
        // 초기 데이터 로드
        this.loadMore();
        
        // 스크롤 이벤트 리스너
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }
    
    createLoadingElement() {
        const loading = document.createElement('div');
        loading.className = 'loading-indicator';
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>포스트 불러오는 중...</p>
        `;
        loading.style.display = 'none';
        this.container.appendChild(loading);
        this.loadingElement = loading;
    }
    
    handleScroll() {
        if (this.loading || !this.hasMore) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - this.threshold) {
            this.loadMore();
        }
    }
    
    async loadMore() {
        if (this.loading || !this.hasMore) return;
        
        this.loading = true;
        this.showLoading();
        
        try {
            const response = await fetch(`/api/posts/${this.category}?page=${this.page}&per_page=10`);
            const data = await response.json();
            
            if (data.posts && data.posts.length > 0) {
                this.renderPosts(data.posts);
                this.page++;
                this.hasMore = data.has_more;
            } else {
                this.hasMore = false;
            }
            
            if (!this.hasMore) {
                this.showEndMessage();
            }
        } catch (error) {
            console.error('포스트 로딩 실패:', error);
            this.showError();
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }
    
    renderPosts(posts) {
        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            this.itemsWrapper.appendChild(postElement);
        });
    }
    
    createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'post-item fade-in';
        
        // 썸네일 처리
        const thumbnail = post.thumbnail || this.getDefaultThumbnail();
        
        article.innerHTML = `
            <div class="post-thumbnail">
                <img src="${thumbnail}" alt="${post.title}" loading="lazy">
            </div>
            <div class="post-content">
                <h2 class="post-title">
                    <a href="${post.url}">${post.title}</a>
                </h2>
                <div class="post-meta">
                    <time>${this.formatDate(post.date)}</time>
                    ${post.tags ? `<span class="tags">${post.tags.join(', ')}</span>` : ''}
                </div>
                ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ''}
                <a href="${post.url}" class="read-more">자세히 보기 →</a>
            </div>
        `;
        
        // 애니메이션을 위한 타이밍
        setTimeout(() => {
            article.classList.add('visible');
        }, 50);
        
        return article;
    }
    
    getDefaultThumbnail() {
        const defaults = {
            'life': '/assets/images/thumbnails/daily.png',
            'review': '/assets/images/thumbnails/books.png',
            'portfolio': '/assets/images/thumbnails/coffee.png'
        };
        return defaults[this.category] || '/assets/images/default-thumbnail.png';
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'block';
        }
    }
    
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }
    
    showEndMessage() {
        const endMessage = document.createElement('div');
        endMessage.className = 'end-message';
        endMessage.innerHTML = '<p>모든 포스트를 불러왔습니다.</p>';
        this.container.appendChild(endMessage);
    }
    
    showError() {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <p>포스트를 불러오는 중 오류가 발생했습니다.</p>
            <button onclick="location.reload()">새로고침</button>
        `;
        this.container.appendChild(errorMessage);
    }
}

// CSS 스타일
const style = document.createElement('style');
style.textContent = `
    .post-item {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        margin-bottom: 2rem;
        padding: 1.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        display: flex;
        gap: 1.5rem;
    }
    
    .post-item.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .post-thumbnail {
        flex-shrink: 0;
        width: 200px;
        height: 150px;
        overflow: hidden;
        border-radius: 4px;
    }
    
    .post-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .post-content {
        flex: 1;
    }
    
    .post-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
    }
    
    .post-title a {
        color: inherit;
        text-decoration: none;
    }
    
    .post-title a:hover {
        color: #0066cc;
    }
    
    .post-meta {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
    }
    
    .post-excerpt {
        color: #333;
        line-height: 1.6;
        margin: 0.5rem 0;
    }
    
    .read-more {
        color: #0066cc;
        text-decoration: none;
        font-weight: 500;
    }
    
    .loading-indicator {
        text-align: center;
        padding: 2rem;
    }
    
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #333;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .end-message, .error-message {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
    
    .error-message button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    @media (max-width: 768px) {
        .post-item {
            flex-direction: column;
        }
        
        .post-thumbnail {
            width: 100%;
            height: 200px;
        }
    }
`;
document.head.appendChild(style);