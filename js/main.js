/* main.js - Core functionality for Minjae's Blog */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  initTheme();
  
  // Setup mobile navigation
  setupMobileNav();
  
  // Setup search functionality
  setupSearch();
  
  // Setup project modal functionality
  setupProjectModals();
  
  // Setup code highlighting
  setupCodeHighlighting();
  
  // Register service worker for PWA support
  registerServiceWorker();
});

// Theme switcher
function initTheme() {
  const themeToggle = document.querySelector('.theme-toggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = localStorage.getItem('theme');
  
  // Set the initial theme
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  } else {
    const theme = prefersDarkScheme.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update theme toggle icon (optional animation)
      themeToggle.classList.add('theme-transition');
      setTimeout(() => themeToggle.classList.remove('theme-transition'), 300);
    });
  }
}

// Mobile navigation
function setupMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      // Toggle active class
      this.classList.toggle('active');
      navLinks.classList.toggle('active');
      
      // Prevent body scrolling when menu is open
      document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      const isClickInside = hamburger.contains(event.target) || navLinks.contains(event.target);
      
      if (!isClickInside && navLinks.classList.contains('active')) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
      }
    });
  }
}

// Setup project modals for portfolio page
function setupProjectModals() {
  const projectCards = document.querySelectorAll('.project-card');
  const projectModals = document.querySelectorAll('.project-modal');
  const closeButtons = document.querySelectorAll('.project-modal-close');
  
  if (projectCards.length > 0) {
    // Open modal when clicking on a project card
    projectCards.forEach(card => {
      card.addEventListener('click', function() {
        const modalId = this.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        
        if (modal) {
          modal.style.display = 'flex';
          document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
      });
    });
    
    // Close modal when clicking on close button
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const modal = this.closest('.project-modal');
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
      });
    });
    
    // Close modal when clicking outside content
    projectModals.forEach(modal => {
      modal.addEventListener('click', function(event) {
        if (event.target === this) {
          this.style.display = 'none';
          document.body.style.overflow = ''; // Re-enable scrolling
        }
      });
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        projectModals.forEach(modal => {
          if (modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
          }
        });
      }
    });
  }
}

// Search functionality
function setupSearch() {
  const searchToggle = document.querySelector('.search-toggle');
  const searchModal = document.querySelector('.search-modal');
  const searchClose = document.querySelector('.search-close');
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');
  
  if (searchToggle && searchModal) {
    // Toggle search modal
    searchToggle.addEventListener('click', function() {
      searchModal.classList.add('active');
      document.body.classList.add('modal-open');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    });
    
    // Close search modal
    if (searchClose) {
      searchClose.addEventListener('click', function() {
        searchModal.classList.remove('active');
        document.body.classList.remove('modal-open');
      });
    }
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        searchModal.classList.remove('active');
        document.body.classList.remove('modal-open');
      }
    });
    
    // Setup search functionality
    if (searchInput && searchResults) {
      let posts = [];
      
      // Fetch post data
      fetch('/posts.json')
        .then(response => response.json())
        .then(data => {
          posts = data;
        })
        .catch(error => console.error('Error loading posts:', error));
      
      // Search on input
      searchInput.addEventListener('input', debounce(function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
          searchResults.innerHTML = '<p>Please enter at least 2 characters</p>';
          return;
        }
        
        // Filter posts
        const results = posts.filter(post => {
          const titleMatch = post.title && post.title.toLowerCase().includes(query);
          const tagsMatch = post.tags && post.tags.some(tag => tag.toLowerCase().includes(query));
          const contentMatch = post.teaser && post.teaser.toLowerCase().includes(query);
          
          return titleMatch || tagsMatch || contentMatch;
        });
        
        // Display results
        if (results.length === 0) {
          searchResults.innerHTML = '<p>No results found</p>';
        } else {
          let resultsHTML = '';
          
          results.forEach(post => {
            resultsHTML += `
              <div class="result-item">
                <a href="${post.url}">
                  <h3>${post.title}</h3>
                  <div class="result-meta">
                    <span>${formatDate(post.date)}</span>
                    <span>${post.category}</span>
                  </div>
                  <p>${post.teaser}</p>
                </a>
              </div>
            `;
          });
          
          searchResults.innerHTML = resultsHTML;
        }
      }, 300));
    }
  }
}

// Code highlighting using Prism.js (if included in HTML)
function setupCodeHighlighting() {
  // Check if Prism is available (in case you choose to include it later)
  if (window.Prism) {
    Prism.highlightAll();
  } else {
    // Simple code highlighting fallback
    document.querySelectorAll('pre code').forEach(block => {
      // Add default class for styling
      block.parentElement.classList.add('code-block');
    });
  }
}

// Register service worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

// Cache recent posts for offline reading
function cacheRecentPosts(posts) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const postUrls = posts.map(post => post.url);
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_POSTS',
      posts: postUrls
    });
  }
}

// Helper: Format date
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Helper: Debounce function for search input
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// Lazy loading for images
document.addEventListener('DOMContentLoaded', function() {
  // Check if native lazy loading is supported
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading is supported, already using 'loading="lazy"' attribute
  } else {
    // Apply simple lazy loading for browsers that don't support it
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => {
      img.dataset.src = img.src;
      img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjwvc3ZnPg==';
      observer.observe(img);
    });
  }
});

// Add reading progress bar for posts
document.addEventListener('DOMContentLoaded', function() {
  const post = document.querySelector('.post');
  
  if (post) {
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);
    
    // Update progress on scroll
    window.addEventListener('scroll', function() {
      const windowHeight = window.innerHeight;
      const fullHeight = document.body.offsetHeight;
      const scrolled = window.scrollY;
      
      const percentScrolled = (scrolled / (fullHeight - windowHeight)) * 100;
      progressBar.style.width = percentScrolled + '%';
    });
  }
});

// Share functionality
document.addEventListener('DOMContentLoaded', function() {
  const shareButtons = document.querySelectorAll('.share-button');
  
  if (shareButtons.length > 0) {
    shareButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        const shareData = {
          title: document.title,
          text: document.querySelector('meta[name="description"]')?.content || 'Check out this post!',
          url: window.location.href
        };
        
        // Use Web Share API if available
        if (navigator.share) {
          navigator.share(shareData)
            .catch(error => console.error('Error sharing:', error));
        } else {
          // Fallback to clipboard
          navigator.clipboard.writeText(window.location.href)
            .then(() => {
              // Show a temporary tooltip or notification
              const tooltip = document.createElement('div');
              tooltip.className = 'tooltip';
              tooltip.textContent = 'Link copied!';
              document.body.appendChild(tooltip);
              
              setTimeout(() => {
                tooltip.remove();
              }, 2000);
            })
            .catch(error => console.error('Error copying link:', error));
        }
      });
    });
  }
});