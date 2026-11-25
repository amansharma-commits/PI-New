/* From the Field: six-card testimonial carousel.
   Two cards show on desktop, one on phones. Arrows, dots, keyboard, swipe and autoplay every 3 seconds.
   Autoplay pauses while the pointer is over the carousel or while keyboard focus is inside it. */
(function () {
  var root = document.getElementById('from-the-field');
  if (!root) return;

  var viewport = root.querySelector('.field-viewport');
  var track = root.querySelector('.field-track');
  var cards = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(root.querySelectorAll('.field-dots button'));
  var counter = root.querySelector('.field-count b');
  var total = root.querySelector('.field-total');
  var buttons = root.querySelectorAll('.field-btn');
  var phone = window.matchMedia('(max-width: 700px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 2000;

  var index = 0;
  var timer = null;
  var pointerInside = false;
  var keyboardFocus = false;

  function perView() { return phone.matches ? 1 : 2; }
  function maxIndex() { return cards.length - perView(); }
  function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }

  function layout() {
    var max = maxIndex();
    dots.forEach(function (d, k) { d.hidden = k > max; });
    total.textContent = String(max + 1).padStart(2, '0');
  }

  function go(i) {
    var max = maxIndex();
    var n = max + 1;
    index = ((i % n) + n) % n;
    var step = cards[0].getBoundingClientRect().width + gap();
    track.style.transform = 'translate3d(' + (-index * step) + 'px, 0, 0)';

    dots.forEach(function (d, k) {
      d.classList.toggle('is-active', k === index);
      d.setAttribute('aria-current', k === index ? 'true' : 'false');
    });

    cards.forEach(function (c, k) {
      c.classList.toggle('is-active', k >= index && k < index + perView());
    });

    counter.classList.remove('is-bumped');
    void counter.offsetWidth;
    counter.textContent = String(index + 1).padStart(2, '0');
    counter.classList.add('is-bumped');
  }

  /* The active dot fills across the interval, so the timing is visible in the dots */
  function fillActive() {
    dots.forEach(function (d) { d.classList.remove('is-filling'); });
    var active = dots[index];
    if (!active) return;
    void active.offsetWidth; /* restart the fill animation */
    active.classList.add('is-filling');
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function isPaused() {
    return pointerInside || keyboardFocus;
  }

  /* Starts or stops autoplay from the current state. Motion-sensitive users get no autoplay. */
  function sync() {
    stop();
    if (isPaused()) {
      root.classList.add('is-paused');
      return;
    }
    root.classList.remove('is-paused');
    if (reduce.matches) return;
    fillActive();
    timer = setInterval(function () { go(index + 1); }, DURATION);
  }

  /* A click or tap on an arrow or dot moves the carousel and restarts the 3-second timer */
  function moveBy(step) {
    go(index + step);
    sync();
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      moveBy(parseInt(b.getAttribute('data-dir'), 10));
    });
  });

  dots.forEach(function (d, k) {
    d.addEventListener('click', function () { go(k); sync(); });
  });

  root.addEventListener('mouseenter', function () { pointerInside = true; sync(); });
  root.addEventListener('mouseleave', function () { pointerInside = false; sync(); });

  /* Only keyboard focus pauses autoplay, so a mouse click on a button does not stop it */
  root.addEventListener('focusin', function (e) {
    if (e.target.matches(':focus-visible')) { keyboardFocus = true; sync(); }
  });
  root.addEventListener('focusout', function () {
    keyboardFocus = false;
    sync();
  });

  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') moveBy(1);
    if (e.key === 'ArrowLeft') moveBy(-1);
  });

  /* Swipe (touch and pen) */
  var startX = null;
  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    startX = e.clientX;
  });
  viewport.addEventListener('pointerup', function (e) {
    if (startX === null || e.pointerType === 'mouse') return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) moveBy(dx < 0 ? 1 : -1);
  });

  window.addEventListener('resize', function () { layout(); go(Math.min(index, maxIndex())); });
  if (phone.addEventListener) {
    phone.addEventListener('change', function () { layout(); go(Math.min(index, maxIndex())); });
  }

  root.style.setProperty('--dur', DURATION + 'ms');

  layout();
  go(0);
  sync();
})();
