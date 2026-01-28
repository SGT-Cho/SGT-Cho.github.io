/**
 * 블로그 챗봇 UI 모듈
 * 플로팅 버튼, 채팅 모달, 스트리밍 응답 지원
 */

class BlogChatbot {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.isOpen = false;
        this.messages = [];
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // 챗봇 HTML 구조 생성
        this.createChatbotHTML();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 로컬 스토리지에서 대화 복원
        this.loadConversation();
        
        // 초기 메시지
        if (this.messages.length === 0) {
            this.addMessage('assistant', '안녕하세요! 민재님의 기술 블로그 AI 어시스턴트입니다. 궁금한 점이 있으시면 언제든 물어보세요! 😊');
        }
    }
    
    createChatbotHTML() {
        // 챗봇 컨테이너
        const chatbotContainer = document.createElement('div');
        chatbotContainer.id = 'chatbot-container';
        chatbotContainer.innerHTML = `
            <!-- 플로팅 버튼 -->
            <button id="chatbot-toggle" class="chatbot-toggle" aria-label="챗봇 열기">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
            
            <!-- 채팅 모달 -->
            <div id="chatbot-modal" class="chatbot-modal hidden">
                <div class="chatbot-header">
                    <h3>AI 어시스턴트</h3>
                    <button id="chatbot-close" class="chatbot-close" aria-label="챗봇 닫기">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div id="chatbot-messages" class="chatbot-messages">
                    <!-- 메시지가 여기에 표시됩니다 -->
                </div>
                
                <div class="chatbot-input-container">
                    <input 
                        type="text" 
                        id="chatbot-input" 
                        class="chatbot-input" 
                        placeholder="메시지를 입력하세요..."
                        aria-label="메시지 입력"
                    >
                    <button id="chatbot-send" class="chatbot-send" aria-label="메시지 전송">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatbotContainer);
        
        // CSS 스타일 추가
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #chatbot-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            .chatbot-toggle {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .chatbot-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
            }
            
            .chatbot-modal {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;
                opacity: 1;
                transform: translateY(0);
            }
            
            .chatbot-modal.hidden {
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
            }
            
            .chatbot-header {
                padding: 16px 20px;
                background: #007bff;
                color: white;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chatbot-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .chatbot-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }
            
            .chatbot-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .chatbot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .chatbot-message {
                max-width: 80%;
                padding: 12px 16px;
                border-radius: 12px;
                line-height: 1.5;
                word-wrap: break-word;
            }
            
            .chatbot-message.user {
                align-self: flex-end;
                background: #007bff;
                color: white;
            }
            
            .chatbot-message.assistant {
                align-self: flex-start;
                background: #f1f3f5;
                color: #333;
            }
            
            .chatbot-message.loading {
                display: flex;
                gap: 4px;
                padding: 12px 20px;
            }
            
            .chatbot-message.loading span {
                width: 8px;
                height: 8px;
                background: #999;
                border-radius: 50%;
                animation: loading 1.4s ease-in-out infinite;
            }
            
            .chatbot-message.loading span:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .chatbot-message.loading span:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes loading {
                0%, 60%, 100% {
                    transform: translateY(0);
                }
                30% {
                    transform: translateY(-10px);
                }
            }
            
            .chatbot-input-container {
                padding: 16px 20px;
                border-top: 1px solid #e9ecef;
                display: flex;
                gap: 8px;
            }
            
            .chatbot-input {
                flex: 1;
                padding: 10px 16px;
                border: 1px solid #dee2e6;
                border-radius: 24px;
                outline: none;
                font-size: 14px;
                transition: border-color 0.2s;
            }
            
            .chatbot-input:focus {
                border-color: #007bff;
            }
            
            .chatbot-send {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .chatbot-send:hover {
                background: #0056b3;
                transform: scale(1.05);
            }
            
            .chatbot-send:disabled {
                background: #6c757d;
                cursor: not-allowed;
                transform: scale(1);
            }
            
            .chatbot-related-posts {
                margin-top: 12px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .chatbot-related-posts h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #666;
            }
            
            .chatbot-related-posts a {
                display: block;
                padding: 4px 0;
                color: #007bff;
                text-decoration: none;
                font-size: 14px;
                transition: color 0.2s;
            }
            
            .chatbot-related-posts a:hover {
                color: #0056b3;
                text-decoration: underline;
            }
            
            /* 모바일 반응형 */
            @media (max-width: 480px) {
                .chatbot-modal {
                    width: 100vw;
                    height: 100vh;
                    bottom: 0;
                    right: 0;
                    border-radius: 0;
                    max-height: 100vh;
                }
                
                .chatbot-toggle {
                    bottom: 20px;
                    right: 20px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // 토글 버튼
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggle();
        });
        
        // 닫기 버튼
        document.getElementById('chatbot-close').addEventListener('click', () => {
            this.close();
        });
        
        // 전송 버튼
        document.getElementById('chatbot-send').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // 엔터키로 전송
        document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        const modal = document.getElementById('chatbot-modal');
        modal.classList.remove('hidden');
        this.isOpen = true;
        
        // 입력창에 포커스
        setTimeout(() => {
            document.getElementById('chatbot-input').focus();
        }, 300);
        
        // 메시지 스크롤
        this.scrollToBottom();
    }
    
    close() {
        const modal = document.getElementById('chatbot-modal');
        modal.classList.add('hidden');
        this.isOpen = false;
    }
    
    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;
        
        // 사용자 메시지 추가
        this.addMessage('user', message);
        
        // 입력창 초기화
        input.value = '';
        
        // 로딩 표시
        this.showLoading();
        
        try {
            // API 호출
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error('서버 응답 오류');
            }
            
            const data = await response.json();
            
            // 로딩 제거
            this.hideLoading();
            
            // 응답 메시지 추가
            this.addMessage('assistant', data.response);
            
            // 관련 글이 있으면 표시
            if (data.related_posts && data.related_posts.length > 0) {
                this.showRelatedPosts(data.related_posts);
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.hideLoading();
            this.addMessage('assistant', '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    }
    
    addMessage(role, content) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${role}`;
        messageDiv.textContent = content;
        
        messagesContainer.appendChild(messageDiv);
        
        // 메시지 저장
        this.messages.push({ role, content, timestamp: new Date().toISOString() });
        this.saveConversation();
        
        // 스크롤
        this.scrollToBottom();
    }
    
    showLoading() {
        this.isLoading = true;
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'chatbot-loading';
        loadingDiv.className = 'chatbot-message assistant loading';
        loadingDiv.innerHTML = '<span></span><span></span><span></span>';
        
        messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
        
        // 전송 버튼 비활성화
        document.getElementById('chatbot-send').disabled = true;
    }
    
    hideLoading() {
        this.isLoading = false;
        const loadingDiv = document.getElementById('chatbot-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        // 전송 버튼 활성화
        document.getElementById('chatbot-send').disabled = false;
    }
    
    showRelatedPosts(posts) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const relatedDiv = document.createElement('div');
        relatedDiv.className = 'chatbot-related-posts';
        
        let html = '<h4>관련 글:</h4>';
        posts.forEach(post => {
            html += `<a href="${post.url}" target="_blank">${post.title}</a>`;
        });
        
        relatedDiv.innerHTML = html;
        messagesContainer.appendChild(relatedDiv);
        
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    saveConversation() {
        localStorage.setItem('chatbot_messages', JSON.stringify(this.messages.slice(-50))); // 최근 50개만 저장
        localStorage.setItem('chatbot_session_id', this.sessionId);
    }
    
    loadConversation() {
        const savedMessages = localStorage.getItem('chatbot_messages');
        const savedSessionId = localStorage.getItem('chatbot_session_id');
        
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
            
            // 저장된 메시지 표시
            const messagesContainer = document.getElementById('chatbot-messages');
            this.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `chatbot-message ${msg.role}`;
                messageDiv.textContent = msg.content;
                messagesContainer.appendChild(messageDiv);
            });
        }
        
        if (savedSessionId) {
            this.sessionId = savedSessionId;
        }
    }
}

// 페이지 로드 시 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.blogChatbot = new BlogChatbot();
});