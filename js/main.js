document.addEventListener('DOMContentLoaded', function () {
  // Hamburger menu
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }

  // Collapsible category cards
  document.querySelectorAll('.category-card h2').forEach(function (h2) {
    h2.addEventListener('click', function () {
      h2.parentElement.classList.toggle('open');
    });
  });

  // Latest Posts loader
  const latestPostsList = document.querySelector('.latest-posts-list');
  if (latestPostsList) {
    fetch('/posts.json')
      .then(r => r.json())
      .then(posts => {
        latestPostsList.innerHTML = '';
        posts.slice(0, 6).forEach(post => {
          const li = document.createElement('li');
          li.className = 'latest-post';
          li.innerHTML = `
            <img src="${post.teaser}" alt="">
            <div class="latest-post-info">
              <a class="latest-post-title" href="${post.url}">${post.title}</a>
              <div class="latest-post-meta">${post.date} · ${post.category}</div>
            </div>
          `;
          latestPostsList.appendChild(li);
        });
      });
  }

  // Portfolio modal
  document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('click', function () {
      const modalId = card.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('open');
    });
  });
  document.querySelectorAll('.project-modal-close').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.closest('.project-modal').classList.remove('open');
    });
  });
  document.querySelectorAll('.project-modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
});