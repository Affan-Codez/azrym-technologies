(function () {
  'use strict';

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Sticky navbar */
  var header = document.getElementById('site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav */
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.classList.toggle('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('is-open');
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      });
    });
  }

  /* Active nav link on scroll */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  function setActiveNav() {
    var scrollPos = window.scrollY + 120;
    var current = '';
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href').slice(1);
      link.classList.toggle('is-active', href === current);
    });
  }
  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();

  /* Smooth scroll for anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', id);
    });
  });

  /* IntersectionObserver fade-in */
  var fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window) {
    var fadeObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            fadeObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    fadeEls.forEach(function (el) { fadeObs.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Counter animation */
  var counters = document.querySelectorAll('.stat__number');
  var counted = false;

  function animateCounters() {
    if (counted) return;
    var statsSection = document.querySelector('.stats');
    if (!statsSection) return;
    var rect = statsSection.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) return;

    counted = true;
    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10) || 0;
      var duration = 1800;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target;
        }
      }
      requestAnimationFrame(step);
    });
  }

  window.addEventListener('scroll', animateCounters, { passive: true });
  animateCounters();

  /* Product tabs */
  var tabBtns = document.querySelectorAll('.tabs__btn');
  var tabPanels = document.querySelectorAll('.tabs__panel');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(function (panel) {
        panel.classList.remove('is-active');
        panel.hidden = true;
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      var panel = document.getElementById('panel-' + tabId);
      if (panel) {
        panel.classList.add('is-active');
        panel.hidden = false;
      }
    });
  });

  /* Hero particles canvas */
  var canvas = document.getElementById('hero-particles');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ctx = canvas.getContext('2d');
    var particles = [];
    var particleCount = 50;

    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
      particles = [];
      for (var i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(91, 164, 245, ' + p.opacity + ')';
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      requestAnimationFrame(draw);
    }

    resizeCanvas();
    createParticles();
    draw();
    window.addEventListener('resize', function () {
      resizeCanvas();
      createParticles();
    });
  }
})();
