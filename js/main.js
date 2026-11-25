(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const SUPPORT_EMAIL = 'support@projectinclusion.in';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => motionQuery.matches || root.classList.contains('a11y-motion-off');

  /* ---------- Settings for accessibility panel ---------- */
  const SETTINGS_KEY = 'pi-a11y';
  const defaults = { text: 0, contrast: false, motion: false, links: false, dyslexia: false, spacing: false };
  function loadSettings() {
    try {
      const saved = Object.assign({}, defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
      saved.text = Math.min(3, Math.max(0, Number(saved.text) || 0));
      return saved;
    } catch (e) { return { ...defaults }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
  }
  let settings = loadSettings();

  function applySettings() {
    root.classList.toggle('a11y-text-1', settings.text === 1);
    root.classList.toggle('a11y-text-2', settings.text === 2);
    root.classList.toggle('a11y-text-3', settings.text === 3);
    root.classList.toggle('a11y-contrast', settings.contrast);
    root.classList.toggle('a11y-motion-off', settings.motion);
    root.classList.toggle('a11y-links', settings.links);
    root.classList.toggle('a11y-dyslexia', settings.dyslexia);
    root.classList.toggle('a11y-spacing', settings.spacing);
    document.querySelectorAll('[data-a11y]').forEach(btn => {
      const key = btn.dataset.a11y;
      if (key === 'text') btn.setAttribute('aria-pressed', String(settings.text === Number(btn.dataset.val)));
      else btn.setAttribute('aria-checked', String(!!settings[key]));
    });
  }

  /* ---------- Header, scroll progress, back to top ---------- */
  const header = document.querySelector('.header');
  const toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.innerHTML =
      '<span class="tt-ring" aria-hidden="true">' +
        '<svg viewBox="0 0 40 40"><circle class="tt-track" cx="20" cy="20" r="18" pathLength="100"/><circle class="tt-fill" cx="20" cy="20" r="18" pathLength="100"/></svg>' +
        '<img src="assets/icons/arrow-up.svg" alt="">' +
      '</span>' +
      '<span class="tt-label">Back to top</span>';
  }
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.prepend(progress);

  let scrollQueued = false;
  let lastY = window.scrollY;
  let collapseTimer = null;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (toTop) {
      toTop.classList.toggle('show', y > 600);
      /* Smart label: it folds away while the reader scrolls down, and returns when they scroll up or pause */
      if (y !== lastY) {
        const goingDown = y > lastY;
        clearTimeout(collapseTimer);
        if (goingDown && y > 600) {
          toTop.classList.add('is-collapsed');
          collapseTimer = setTimeout(() => toTop.classList.remove('is-collapsed'), 1400);
        } else {
          toTop.classList.remove('is-collapsed');
        }
        lastY = y;
      }
      const ratio = max > 0 ? Math.min(1, y / max) : 0;
      const fill = toTop.querySelector('.tt-fill');
      if (fill) fill.setAttribute('stroke-dashoffset', (100 * (1 - ratio)).toFixed(2));
    }
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', () => {
    toTop.classList.remove('is-collapsed');
    toTop.classList.remove('is-launching');
    void toTop.offsetWidth;
    toTop.classList.add('is-launching');
    setTimeout(() => toTop.classList.remove('is-launching'), 900);
    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  });

  /* ---------- Mobile menu and desktop dropdowns ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  function setMenu(open) {
    mobileMenu.classList.toggle('open', open);
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  hamburger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
  mobileMenu.querySelectorAll('nav a').forEach((link, i) => {
    link.style.setProperty('--i', i);
    link.addEventListener('click', () => setMenu(false));
  });

  function closeFloating(except) {
    document.querySelectorAll('.nav-item.open, .cr-field.open').forEach(el => {
      if (el === except) return;
      el.classList.remove('open');
      const t = el.querySelector('[aria-expanded]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  document.querySelectorAll('.nav-item:not(.nav-mega)').forEach(item => {
    const trigger = item.querySelector('.nav-trigger');
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const open = !item.classList.contains('open');
      closeFloating(item);
      item.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Entrance and scroll reveal ---------- */
  const revealSelector = [
    'main > section > *',
    '.pillar', '.resource-card', '.feature', '.stat', '.reach-stat',
    '.logo-card', '.f-card', '.legal-block', '.login-card', '.partner-tag',
    '.s1-video', '.imp-card', '.s3-stage', '.adv-card', '.post', '.pm', '.dep-row'
  ].join(',');

  const revealTargets = [...new Set(document.querySelectorAll(revealSelector))].filter(el =>
    !el.closest('.hero') && !el.classList.contains('dot') && !el.closest('.a11y-panel') && !el.closest('.modal')
  );

  const counters = [...document.querySelectorAll('.stat-num, .reach-num, .imp-num')];

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const finalText = el.textContent.trim();
    const match = finalText.match(/^([\d.,]+)(.*)$/);
    if (!match || reduceMotion()) return;
    const raw = match[1];
    const suffix = match[2];
    const target = parseFloat(raw.replace(/,/g, ''));
    const decimals = (raw.split('.')[1] || '').length;
    const grouped = raw.includes(',');
    const format = v => {
      const fixed = v.toFixed(decimals);
      const body = grouped
        ? Number(fixed).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : fixed;
      return body + suffix;
    };
    const duration = 1400;
    const start = performance.now();
    el.textContent = format(0);
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? format(target * eased) : finalText;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (!reduceMotion()) {
    revealTargets.forEach(el => {
      el.classList.add('reveal');
      const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      const index = Math.min(siblings.indexOf(el), 5);
      el.style.setProperty('--d', `${index * 90}ms`);
    });

    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    const counterObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(el => counterObserver.observe(el));
  }

  /* ---------- Home hero carousel ---------- */
  const slideWrap = document.querySelector('.hero-slides');
  if (slideWrap) {
    const slides = [...slideWrap.querySelectorAll('img')];
    const copySlides = [...document.querySelectorAll('.hero-copy-slide')];
    const segments = [...document.querySelectorAll('.segments i')];
    const counter = document.querySelector('.carousel-count');
    const [prevBtn, nextBtn] = document.querySelectorAll('.carousel-nav .nav-btn');
    const heroCard = document.querySelector('.hero-card');
    const DURATION = 6000;
    let current = 0;
    let timer = null;
    let paused = false;

    segments.forEach((seg, i) => {
      seg.setAttribute('role', 'button');
      seg.setAttribute('tabindex', '0');
      seg.setAttribute('aria-label', `Show slide ${i + 1}`);
      seg.innerHTML = '<b></b>';
    });

    function schedule() {
      clearTimeout(timer);
      if (paused || reduceMotion() || document.hidden) return;
      timer = setTimeout(() => show(current + 1), DURATION);
    }

    let started = false;
    let leaveTimer = null;
    let copyTimer = null;

    function show(index, dir = 1) {
      const target = (index + slides.length) % slides.length;
      if (started && target === current) return;
      started = true;
      const previous = current;
      current = target;

      slides.forEach((img, i) => {
        img.classList.toggle('active', i === current);
        img.classList.toggle('leaving', i === previous && previous !== current);
        img.classList.toggle('from-prev', i === current && dir < 0);
      });
      copySlides.forEach((copy, i) => {
        copy.classList.toggle('active', i === current);
        copy.setAttribute('aria-hidden', String(i !== current));
      });
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        slides.forEach((img, i) => { if (i !== current) img.classList.remove('leaving'); });
      }, 1300);

      segments.forEach((seg, i) => {
        seg.classList.remove('on');
        seg.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
      const active = segments[current];
      void active.offsetWidth;
      active.classList.add('on');
      counter.textContent = `0${current + 1}/0${slides.length}`;

      heroCard.classList.remove('copy-changing');
      void heroCard.offsetWidth;
      heroCard.classList.add('copy-changing');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => heroCard.classList.remove('copy-changing'), 1000);
      schedule();
    }

    prevBtn.addEventListener('click', () => show(current - 1, -1));
    nextBtn.addEventListener('click', () => show(current + 1, 1));
    segments.forEach((seg, i) => {
      seg.addEventListener('click', () => show(i, i < current ? -1 : 1));
      seg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); } });
    });

    heroCard.addEventListener('mouseenter', () => {
      paused = true;
      clearTimeout(timer);
      heroCard.classList.add('paused');
    });
    heroCard.addEventListener('mouseleave', () => {
      paused = false;
      heroCard.classList.remove('paused');
      schedule();
    });

    /* Finger swipe (touch and pen). Pointer events work on every phone browser. */
    let swipe = null;
    heroCard.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now() };
    });
    heroCard.addEventListener('pointerup', e => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      const quick = Date.now() - swipe.t < 800;
      swipe = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && quick) {
        show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    });
    heroCard.addEventListener('pointercancel', () => { swipe = null; });
    /* Taps on touch screens should not leave the carousel paused */
    heroCard.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') { paused = false; heroCard.classList.remove('paused'); schedule(); }
    });

    document.addEventListener('visibilitychange', schedule);
    show(0);
  }

  /* ---------- Video player ---------- */
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Video player">
      <button class="modal-close" type="button" aria-label="Close video">&times;</button>
      <div class="modal-media"></div>
      <p class="modal-note"></p>
    </div>`;
  document.body.appendChild(modal);
  let lastTrigger = null;

  function openVideo(trigger) {
    const media = modal.querySelector('.modal-media');
    const note = modal.querySelector('.modal-note');
    media.innerHTML = '';
    note.textContent = '';
    const src = trigger.dataset.video;
    if (src) {
      const frame = document.createElement('iframe');
      frame.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.title = trigger.getAttribute('aria-label') || 'Video';
      media.appendChild(frame);
    } else {
      const poster = document.createElement('img');
      poster.src = trigger.dataset.poster || trigger.querySelector('img')?.src || '';
      poster.alt = '';
      media.appendChild(poster);
      note.textContent = 'This film is coming soon. Check back shortly.';
    }
    lastTrigger = trigger;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').focus();
  }

  function closeVideo() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.querySelector('.modal-media').innerHTML = '';
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  }

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('.modal-close')) closeVideo();
  });

  document.querySelectorAll('[data-video-open]').forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      openVideo(trigger);
    });
  });

  /* ---------- Accessibility panel ---------- */
  const a11yButton = document.querySelector('.a11y-btn');

  /* Polite live region so screen readers hear each change */
  const statusEl = document.createElement('div');
  statusEl.className = 'sr-only';
  statusEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(statusEl);
  function announce(msg) {
    statusEl.textContent = '';
    setTimeout(() => { statusEl.textContent = msg; }, 60);
  }

  /* Skip link for keyboard and screen reader users */
  const mainEl = document.querySelector('main');
  if (mainEl) {
    if (!mainEl.id) mainEl.id = 'main';
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#' + mainEl.id;
    skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
  }

  const SPEECH_OK = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const panel = document.createElement('div');
  panel.className = 'a11y-panel';
  panel.id = 'a11yPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'a11yTitle');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="a11y-head"><strong id="a11yTitle">Accessibility</strong><button class="a11y-x" type="button" aria-label="Close accessibility options">&times;</button></div>
    <div class="a11y-row">
      <span id="a11yTextLabel">Text size</span>
      <div class="a11y-seg" role="group" aria-labelledby="a11yTextLabel">
        <button type="button" data-a11y="text" data-val="0" aria-label="Normal text">A</button>
        <button type="button" data-a11y="text" data-val="1" aria-label="Large text">A+</button>
        <button type="button" data-a11y="text" data-val="2" aria-label="Larger text">A++</button>
        <button type="button" data-a11y="text" data-val="3" aria-label="Largest text">A+++</button>
      </div>
    </div>
    <div class="a11y-row"><span>High contrast</span><button class="a11y-toggle" type="button" role="switch" data-a11y="contrast" aria-label="High contrast"></button></div>
    <div class="a11y-row"><span>Dyslexia-friendly font</span><button class="a11y-toggle" type="button" role="switch" data-a11y="dyslexia" aria-label="Dyslexia-friendly font"></button></div>
    <div class="a11y-row"><span>Relaxed line spacing</span><button class="a11y-toggle" type="button" role="switch" data-a11y="spacing" aria-label="Relaxed line spacing"></button></div>
    <div class="a11y-row"><span>Reduce motion</span><button class="a11y-toggle" type="button" role="switch" data-a11y="motion" aria-label="Reduce motion"></button></div>
    <div class="a11y-row"><span>Underline links</span><button class="a11y-toggle" type="button" role="switch" data-a11y="links" aria-label="Underline links"></button></div>
    ${SPEECH_OK ? '<button class="a11y-action" type="button" data-speak aria-pressed="false">Read page aloud</button>' : ''}
    <button class="a11y-reset" type="button">Reset settings</button>
    <p class="a11y-tip">Shortcut: Alt + A opens this panel, Esc closes it.</p>`;
  document.body.appendChild(panel);

  function setPanel(open) {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    a11yButton.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.querySelector('[data-a11y]').focus();
    } else if (panel.contains(document.activeElement)) {
      a11yButton.focus();
    }
  }
  a11yButton.setAttribute('aria-expanded', 'false');
  a11yButton.setAttribute('aria-controls', 'a11yPanel');
  a11yButton.setAttribute('aria-label', 'Accessibility options (Alt + A)');
  a11yButton.addEventListener('click', e => { e.stopPropagation(); setPanel(!panel.classList.contains('open')); });
  panel.querySelector('.a11y-x').addEventListener('click', () => setPanel(false));

  /* Keyboard: Alt+A toggles, Esc closes, Tab stays inside the open panel */
  document.addEventListener('keydown', e => {
    const open = panel.classList.contains('open');
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setPanel(!open);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { setPanel(false); return; }
    if (e.key === 'Tab') {
      const items = [...panel.querySelectorAll('button')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Read page aloud (uses the browser's built-in speech; no data leaves the device) */
  const speakBtn = panel.querySelector('[data-speak]');
  let speaking = false;
  function setSpeaking(on) {
    speaking = on;
    if (speakBtn) {
      speakBtn.textContent = on ? 'Stop reading' : 'Read page aloud';
      speakBtn.setAttribute('aria-pressed', String(on));
    }
  }
  if (speakBtn) {
    speakBtn.addEventListener('click', () => {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        announce('Reading stopped');
        return;
      }
      const source = document.querySelector('main') || document.body;
      const text = source.innerText.replace(/\s+/g, ' ').trim().slice(0, 12000);
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-IN';
      utter.rate = 0.95;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => { setSpeaking(false); announce('Reading is not available on this device'); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      setSpeaking(true);
      announce('Reading page aloud');
    });
    window.addEventListener('pagehide', () => window.speechSynthesis.cancel());
  }

  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-a11y]');
    if (btn) {
      const key = btn.dataset.a11y;
      if (key === 'text') {
        settings.text = Number(btn.dataset.val);
        announce(['Normal text', 'Large text', 'Larger text', 'Largest text'][settings.text]);
      } else {
        settings[key] = !settings[key];
        announce(`${btn.getAttribute('aria-label')} ${settings[key] ? 'on' : 'off'}`);
      }
      saveSettings(settings);
      applySettings();
      return;
    }
    if (e.target.closest('.a11y-reset')) {
      settings = { ...defaults };
      saveSettings(settings);
      applySettings();
      announce('Accessibility settings reset');
    }
  });

  document.addEventListener('click', e => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && !a11yButton.contains(e.target)) setPanel(false);
  });

  /* ---------- Forms ---------- */
  function mailtoFallback(subject, lines) {
    const body = lines.join('\n');
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function setStatus(container, text, type) {
    const status = ensureStatus(container);
    status.textContent = text;
    status.className = `form-status ${type || ''}`;
  }

  function ensureStatus(container) {
    let status = container.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      container.appendChild(status);
    }
    return status;
  }

  function showMailFallback(container, message) {
    const status = ensureStatus(container);
    status.className = 'form-status ok';
    status.textContent = `${message} If nothing opens, email ${SUPPORT_EMAIL} `;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-email';
    copy.textContent = 'Copy address';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        copy.textContent = 'Copied';
      } catch (err) {
        copy.textContent = SUPPORT_EMAIL;
      }
    });
    status.appendChild(copy);
  }

  const contactForm = document.querySelector('.ct-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      const data = new FormData(contactForm);
      const name = (data.get('name') || '').toString().trim();
      const lines = [
        `Name: ${name}`,
        `Email: ${data.get('email')}`,
        `Mobile: ${data.get('mobile')}`,
        `Country: ${data.get('country')}`,
        '',
        data.get('message')
      ];
      mailtoFallback(`Website enquiry from ${name}`, lines);
      showMailFallback(contactForm, 'Your email app should open with your enquiry.');
    });
  }

  const alertButton = document.querySelector('.cr-signup');
  if (alertButton) {
    const alertInput = alertButton.parentElement.querySelector('input[type="email"]');
    alertButton.addEventListener('click', () => {
      const wrap = alertButton.closest('.cr-alerts-inner');
      if (!alertInput.checkValidity() || !alertInput.value.trim()) {
        setStatus(wrap, 'Please enter a valid email address.', 'error');
        alertInput.focus();
        return;
      }
      mailtoFallback('Job alerts sign-up', [`Please add this email to the job alerts list: ${alertInput.value.trim()}`]);
      showMailFallback(wrap, 'Your email app should open to confirm your job alert.');
    });
  }

  /* ---------- Careers filters ---------- */
  const jobs = [...document.querySelectorAll('.cr-job')];
  const filterButtons = [...document.querySelectorAll('.cr-select')];
  if (jobs.length && filterButtons.length) {
    const jobsList = document.querySelector('.cr-jobs');
    if (jobsList && !jobsList.id) jobsList.id = 'openings';

    const infos = job => [...job.querySelectorAll('.cr-job-info')].map(s => s.textContent.trim());
    const filters = [
      { label: 'Department', value: job => job.querySelector('.cr-job-cat')?.textContent.trim() || '' },
      { label: 'Employment Type', value: job => job.querySelector('.cr-type')?.textContent.trim() || '' },
      { label: 'Location', value: job => infos(job)[0] || '' }
    ];
    const selected = filters.map(() => '');

    const empty = document.createElement('p');
    empty.className = 'cr-empty';
    empty.hidden = true;
    empty.textContent = 'No openings match these filters right now. Check back soon or sign up for job alerts.';
    if (jobsList) jobsList.appendChild(empty);

    function applyFilters() {
      let visible = 0;
      jobs.forEach(job => {
        const match = filters.every((f, i) => !selected[i] || f.value(job) === selected[i]);
        job.hidden = !match;
        if (match) visible++;
      });
      empty.hidden = visible > 0;
    }

    filterButtons.forEach((btn, i) => {
      const filter = filters[i];
      if (!filter) return;
      const wrap = document.createElement('div');
      wrap.className = 'cr-field';
      btn.replaceWith(wrap);
      wrap.appendChild(btn);
      const labelEl = btn.querySelector('span');
      labelEl.textContent = `Select ${filter.label}`;
      const menu = document.createElement('ul');
      menu.className = 'cr-menu';
      menu.setAttribute('role', 'listbox');
      const options = ['', ...new Set(jobs.map(filter.value).filter(Boolean))];
      options.forEach(value => {
        const li = document.createElement('li');
        const option = document.createElement('button');
        option.type = 'button';
        option.setAttribute('role', 'option');
        option.textContent = value || `All ${filter.label.toLowerCase()}s`;
        option.dataset.value = value;
        option.addEventListener('click', e => {
          e.stopPropagation();
          selected[i] = value;
          labelEl.textContent = value || `Select ${filter.label}`;
          menu.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.value === value)));
          wrap.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          applyFilters();
        });
        li.appendChild(option);
        menu.appendChild(li);
      });
      menu.querySelector('button').setAttribute('aria-selected', 'true');
      wrap.appendChild(menu);
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = !wrap.classList.contains('open');
        closeFloating(wrap);
        wrap.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------- Global close handling ---------- */
  document.addEventListener('click', () => closeFloating(null));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('open')) closeVideo();
    if (panel.classList.contains('open')) setPanel(false);
    closeFloating(null);
    setMenu(false);
  });

  /* ---------- Milestone timeline ---------- */
  const stopsWrap = document.querySelector('.story-stops');
  if (stopsWrap) {
    const stops = [...stopsWrap.querySelectorAll('.story-stop')];
    const milestones = [
      {
        year: '2015-2016', title: 'Launch Phase',
        text: 'Placeholder text for the 2015-2016 milestone. Replace this with the story of how Project Inclusion began working with schools and educators.',
        points: ['Placeholder achievement one', 'Placeholder achievement two', 'Placeholder achievement three', 'Placeholder achievement four'],
        image: 'assets/about-story/mission.png'
      },
      {
        year: '2016-2017', title: 'Growth Phase',
        text: 'Placeholder text for the 2016-2017 milestone. Describe how the programme grew its partner network and reach during this period.',
        points: ['Placeholder achievement one', 'Placeholder achievement two', 'Placeholder achievement three', 'Placeholder achievement four'],
        image: 'assets/images/pillar-1.png'
      },
      {
        year: '2017-2018', title: 'Impact Phase',
        text: 'Placeholder text for the 2017-2018 milestone. Summarise the measurable impact on children, teachers and families in this period.',
        points: ['Placeholder achievement one', 'Placeholder achievement two', 'Placeholder achievement three', 'Placeholder achievement four'],
        image: 'assets/images/pillar-2.png'
      },
      {
        year: '2019-2020', title: 'Regional Expansion',
        text: 'During this pivotal period, Project Inclusion focused on establishing systemic change, enabling localized educator networks across diverse Indian landscapes.',
        points: ['Expanded to Tripura, D&NH, Andaman & Nicobar', '1,500+ teachers trained across multiple regions', '1,273 students screened as probable cases', '1,600+ psychometric assessments conducted'],
        image: 'assets/about-story/immersive.png'
      },
      {
        year: '2021-2023', title: 'Digital Expansion',
        text: 'Placeholder text for the 2021-2023 milestone. Explain how digital tools extended training and screening to more teachers.',
        points: ['Placeholder achievement one', 'Placeholder achievement two', 'Placeholder achievement three', 'Placeholder achievement four'],
        image: 'assets/about-story/digital.png'
      },
      {
        year: '2024-Present', title: 'Scale Phase',
        text: 'Placeholder text for the 2024-present milestone. Outline current scale, partnerships and the next steps for the programme.',
        points: ['Placeholder achievement one', 'Placeholder achievement two', 'Placeholder achievement three', 'Placeholder achievement four'],
        image: 'assets/images/partner.png'
      }
    ];

    const panel = document.querySelector('.story-immersive');
    const bg = panel && panel.querySelector('.story-immersive-bg');
    const yearEl = panel && panel.querySelector('.story-year');
    const titleEl = panel && panel.querySelector('.story-immersive-left h3');
    const textEl = panel && panel.querySelector('.story-immersive-left p:not(.story-year)');
    const glass = panel ? [...panel.querySelectorAll('.story-glass')] : [];
    let shown = Math.max(0, stops.findIndex(s => s.classList.contains('active')));
    if (bg) bg.classList.add('is-in');

    let renderToken = 0;
    let enterTimer = null;
    function renderMilestone(index, stop) {
      if (!panel || index === shown) return;
      const dir = index > shown ? 1 : -1;
      shown = index;
      const token = ++renderToken;
      const m = milestones[index];
      /* The background reveals as a circle that grows out of the clicked year */
      if (stop) {
        const pr = panel.getBoundingClientRect();
        const sr = stop.getBoundingClientRect();
        panel.style.setProperty('--ox', `${sr.left + sr.width / 2 - pr.left}px`);
        panel.style.setProperty('--oy', `${sr.top + sr.height / 2 - pr.top}px`);
      }
      panel.style.setProperty('--dir', String(dir));
      panel.classList.remove('is-entering');
      panel.classList.add('is-changing');
      setTimeout(() => {
        if (token !== renderToken) return;
        yearEl.textContent = m.year;
        titleEl.textContent = m.title;
        textEl.textContent = m.text;
        glass.forEach((g, k) => { g.lastChild.nodeValue = m.points[k]; });
        const current = panel.querySelector('.story-immersive-bg.is-in');
        const next = document.createElement('img');
        next.className = 'story-immersive-bg';
        next.alt = '';
        const reveal = () => {
          next.classList.add('is-in');
          if (current) setTimeout(() => current.remove(), reduceMotion() ? 0 : 1100);
        };
        next.onload = reveal;
        current.after(next);
        next.src = m.image;
        if (next.complete && next.naturalWidth) reveal();
        /* Text and cards leave one way and arrive from the other side */
        panel.classList.remove('is-changing');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
        clearTimeout(enterTimer);
        enterTimer = setTimeout(() => panel.classList.remove('is-entering'), reduceMotion() ? 0 : 1700);
      }, reduceMotion() ? 0 : 320);
    }
    function setActive(stop) {
      const index = stops.indexOf(stop);
      stops.forEach(s => {
        const on = s === stop;
        s.classList.toggle('active', on);
        s.setAttribute('aria-current', on ? 'step' : 'false');
      });
      stopsWrap.style.setProperty('--p', stops.length > 1 ? String(index / (stops.length - 1)) : '0');
      renderMilestone(index, stop);
    }

    stops.forEach(stop => {
      stop.addEventListener('click', () => setActive(stop));
      stop.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = stops[(stops.indexOf(stop) + (e.key === 'ArrowRight' ? 1 : -1) + stops.length) % stops.length];
        next.focus();
        next.click();
      });
    });

    function alignLine() {
      const pills = stops.map(s => s.querySelector('.story-pill'));
      const wr = stopsWrap.getBoundingClientRect();
      const first = pills[0].getBoundingClientRect();
      const last = pills[pills.length - 1].getBoundingClientRect();
      stopsWrap.style.setProperty('--line-y', `${first.top - wr.top + first.height / 2 - 1}px`);
      stopsWrap.style.setProperty('--line-x0', `${first.left - wr.left + first.width / 2}px`);
      stopsWrap.style.setProperty('--line-x1', `${wr.right - (last.left + last.width / 2)}px`);
    }
    alignLine();
    window.addEventListener('resize', alignLine);
    document.fonts && document.fonts.ready.then(alignLine);
    setActive(stops[shown]);
  }
  /* ---------- Programmes mega menu ---------- */
  const megaItems = [...document.querySelectorAll('.mega-item[data-program]')];
  const megaPanels = [...document.querySelectorAll('.mega-detail-panel[data-program]')];
  if (megaItems.length) {
    const audiences = {
      teachers: 'Teachers',
      special: 'Special Educators',
      therapy: 'Therapy Professionals',
      parents: 'Parents & Families'
    };
    megaPanels.forEach(panel => {
      const list = panel.querySelector('.mega-aud');
      panel.dataset.serves.split(',').forEach(id => {
        const li = document.createElement('li');
        li.textContent = audiences[id];
        list.appendChild(li);
      });
    });    const showProgramme = key => {
      megaItems.forEach(item => item.classList.toggle('is-active', item.dataset.program === key));
      megaPanels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.program === key));
    };
    megaItems.forEach(item => {
      item.addEventListener('mouseenter', () => showProgramme(item.dataset.program));
      item.addEventListener('focus', () => showProgramme(item.dataset.program));
    });
    /* Opening the menu always starts on Project Inclusion Digital */
    const megaNav = document.querySelector('.nav-mega');
    if (megaNav) megaNav.addEventListener('mouseenter', () => showProgramme('pi'));
  }
  /* ---------- Page transitions ---------- */
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    root.classList.add('page-leave');
    setTimeout(() => { location.href = url.href; }, reduceMotion() ? 0 : 260);
  });

  window.addEventListener('pageshow', () => root.classList.remove('page-leave'));

  applySettings();
})();
