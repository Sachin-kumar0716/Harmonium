/* ============================================================================
   The Soul of the Harmonium: script.js

   TABLE OF CONTENTS
     1. Helpers & shared state
     2. Harmonium image (photo if present, built-in SVG otherwise) + hotspot layout
     3. Anatomy: hotspots, chips and the detail card
     4. Navigation: smooth scrolling, menu, dots, progress bar, active section
     5. SCROLL ANIMATION (GSAP + ScrollTrigger)  <-- the main storytelling logic
     6. Fallback mode (no GSAP, or reduced motion)
     7. "How it works" airflow diagram
     8. Learn to play: Web Audio synth, virtual keyboard, bellows air, demo melodies
     9. Boot
   ============================================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. HELPERS & SHARED STATE
  ------------------------------------------------------------------------ */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };

  var body = document.body;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var panels = $$('.panel');
  var hm = $('#harmonium');
  var depthEl = $('#hm-depth');
  var floatEl = $('#hm-float');
  var stageEl = $('#stage');

  var activeIndex = -1;           // index of the section currently nearest the viewport centre
  var airflow = null;             // set in initAirflow()
  var layoutHotspots = function () {};

  /* ------------------------------------------------------------------------
     2. HARMONIUM IMAGE
     To use a real photo, drop a transparent-background image at assets/harmonium.webp
     (or .png). If it loads, it replaces the built-in SVG illustration; the same single
     element is still used for every section. Set USE_PHOTO to false to force the SVG.
  ------------------------------------------------------------------------ */
  var PHOTO_SRC = '';   // e.g. 'assets/harmonium.webp'. Empty = use the built-in SVG (no extra network request).
  var USE_PHOTO = !!PHOTO_SRC;
  var PHOTO_CANDIDATES = PHOTO_SRC ? [PHOTO_SRC] : [];

  /* Hotspot positions. `svg` = coordinates inside the built-in illustration's viewBox.
     `photo` = [x%, y%] of the image, used when a custom photo is loaded. Tweak the
     `photo` values to line the dots up with the parts in your own picture. */
  var PARTS = [
    { id: 'keyboard', label: 'Keyboard',    svg: [467, 372], photo: [50, 68] },
    { id: 'bellows',  label: 'Bellows',     svg: [567, 262], photo: [70, 24] },
    { id: 'reeds',    label: 'Reeds',       svg: [607, 302], photo: [62, 42] },
    { id: 'stops',    label: 'Stops',       svg: [344, 300], photo: [34, 40] },
    { id: 'drone',    label: 'Drone knobs', svg: [778, 300], photo: [86, 42] },
    { id: 'chamber',  label: 'Air chamber', svg: [300, 481], photo: [38, 84] },
    { id: 'body',     label: 'Wooden body', svg: [805, 490], photo: [90, 70] }
  ];

  function initImage() {
    var photo = $('#hm-photo');
    if (!USE_PHOTO || !photo || !floatEl) return;
    var tryNext = function (i) {
      if (i >= PHOTO_CANDIDATES.length) return;          // keep the SVG illustration
      var probe = new Image();
      probe.onload = function () {
        photo.src = PHOTO_CANDIDATES[i];
        photo.hidden = false;
        floatEl.style.aspectRatio = probe.naturalWidth + ' / ' + probe.naturalHeight;
        floatEl.classList.add('has-photo');
        layoutHotspots();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      };
      probe.onerror = function () { tryNext(i + 1); };
      probe.src = PHOTO_CANDIDATES[i];
    };
    tryNext(0);
  }

  /* ------------------------------------------------------------------------
     3. ANATOMY: hotspots + chips + detail card
  ------------------------------------------------------------------------ */
  var selectPart = function () {};

  function initHotspots() {
    var layer = $('#hotspots');
    var svg = $('#hm-svg');
    if (!layer) return;

    var vb = [95, 205, 830, 405];
    if (svg && svg.getAttribute('viewBox')) {
      vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    }

    PARTS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot';
      b.dataset.part = p.id;
      b.dataset.label = p.label;
      b.setAttribute('aria-label', p.label + ': show explanation');
      b.textContent = String(i + 1);
      b.addEventListener('click', function () { selectPart(p.id); });
      layer.appendChild(b);
    });

    layoutHotspots = function () {
      var usingPhoto = floatEl.classList.contains('has-photo');
      $$('.hotspot', layer).forEach(function (b, i) {
        var p = PARTS[i], x, y;
        if (usingPhoto) { x = p.photo[0]; y = p.photo[1]; }
        else { x = (p.svg[0] - vb[0]) / vb[2] * 100; y = (p.svg[1] - vb[1]) / vb[3] * 100; }
        b.style.left = x + '%';
        b.style.top = y + '%';
      });
    };
    layoutHotspots();
  }

  function initParts() {
    var dl = $('#part-dl'), wrap = $('#parts');
    if (!dl || !wrap) return;

    var data = $$('[data-part]', dl).map(function (el) {
      return { id: el.dataset.part, title: $('dt', el).textContent.trim(), text: $('dd', el).textContent.trim() };
    });
    var chips = $('#part-chips'), title = $('#part-title'), text = $('#part-text'), count = $('#part-count'), next = $('#part-next');
    var current = 0;

    data.forEach(function (d) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.part = d.id; b.textContent = d.title;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { selectPart(d.id); });
      li.appendChild(b); chips.appendChild(li);
    });

    selectPart = function (id) {
      var idx = data.findIndex(function (d) { return d.id === id; });
      if (idx < 0) return;
      current = idx;
      var d = data[idx];
      title.textContent = d.title;
      text.textContent = d.text;
      count.textContent = 'Part ' + (idx + 1) + ' of ' + data.length;
      $$('.chip', chips).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.part === id)); });
      $$('.hotspot').forEach(function (h) { h.classList.toggle('is-active', h.dataset.part === id); });
      floatEl.classList.toggle('hl-air', id === 'chamber');
    };

    next.addEventListener('click', function () { selectPart(data[(current + 1) % data.length].id); });

    dl.hidden = true;       // the plain list is the no-JS fallback; now we have the interactive version
    wrap.hidden = false;
    selectPart(data[0].id);
  }

  /* ------------------------------------------------------------------------
     4. NAVIGATION, PROGRESS, ACTIVE SECTION
  ------------------------------------------------------------------------ */
  var navLinks = $$('.main-nav a');
  var dotsWrap = $('#dots');
  var progressBar = $('#progress-bar');
  var decos = $$('.deco');
  var menuBtn = $('#menu-toggle');

  function closeMenu() {
    body.classList.remove('menu-open');
    if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
  }

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var top = id === 'hero' ? 0 : el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  function initNav() {
    // dots
    if (dotsWrap) {
      panels.forEach(function (p, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.target = p.id;
        b.dataset.label = ['Intro', 'History', 'Anatomy', 'Mechanism', 'Play', 'Culture', 'Finale'][i] || p.id;
        b.setAttribute('aria-label', 'Go to ' + b.dataset.label);
        b.addEventListener('click', function () { scrollToId(p.id); });
        dotsWrap.appendChild(b);
      });
    }

    // every in-page link with data-scroll
    $$('[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          closeMenu();
          scrollToId(href.slice(1));
        }
      });
    });

    // mobile menu
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        var open = !body.classList.contains('menu-open');
        body.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
      window.addEventListener('resize', function () { if (window.innerWidth > 860) closeMenu(); });
    }
  }

  /* Which section is "current"? The last panel whose top has passed the viewport centre.
     This drives: theme colours, nav + dots highlight, hotspot visibility, airflow demo,
     and (in fallback mode) the instrument's position via body[data-section]. */
  function setActive(i) {
    activeIndex = i;
    var p = panels[i];
    body.dataset.theme = p.dataset.theme;
    body.dataset.section = String(i + 1);
    body.classList.toggle('show-hotspots', p.id === 'anatomy');
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + p.id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    $$('button', dotsWrap || document.createElement('div')).forEach(function (d) {
      var on = d.dataset.target === p.id;
      d.classList.toggle('is-active', on);
      if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    if (airflow) airflow.setActive(p.id === 'mechanism');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', { ivory: '#F6F0E5', cream: '#E8DCC8', walnut: '#3A2418', charcoal: '#171513' }[p.dataset.theme] || '#F6F0E5');
  }

  function updateActive() {
    var mid = window.innerHeight * 0.5, idx = 0;
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].getBoundingClientRect().top <= mid) idx = i;
    }
    if (idx !== activeIndex) setActive(idx);
  }

  /* One lightweight rAF-throttled scroll handler: progress bar, active section, ornament drift. */
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
    updateActive();
    if (!reduceMQ.matches) {
      // small parallax drift on decorative background ornaments (each has its own speed)
      for (var i = 0; i < decos.length; i++) {
        var sp = parseFloat(decos[i].dataset.speed) || 0.1;
        decos[i].style.transform = 'translate3d(0,' + (-y * sp).toFixed(1) + 'px,0)';
      }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } }

  /* ------------------------------------------------------------------------
     5. SCROLL ANIMATION (GSAP + ScrollTrigger)

     THE IDEA
       * There is ONE instrument (#harmonium) inside a fixed stage. It never gets duplicated or
         swapped; only its transform changes.
       * Each section has a "pose": which side the instrument sits on, plus scale, tilt (rotation),
         yaw (rotationY, turns the instrument toward the text) and a small vertical lift.
       * For every pair of neighbouring sections (i -> i+1) we add one SEGMENT to a single master timeline.
         It starts when section i has been read (centre of the panel, or the bottom of its text
         if the text is taller than the screen) and ends when section i+1 is centred.
         Inside that single timeline, in sync with the same scroll progress:
             0.00 - 1.00  instrument glides from pose i to pose i+1   (power2.inOut = ease in/out)
             0.00 - 1.00  a gentle scale "fly-by" pulse on #hm-depth  (depth effect)
             0.06 - 0.36  text i fades + blurs + lifts away            (finishes before the instrument
                                                                         crosses the centre of the page)
             0.62 - 0.95  text i+1 fades in, un-blurs, and its children stagger up one by one
         Because the text leaves early and arrives late, the instrument crosses the middle while
         both columns are nearly empty, so it never collides with copy.
       * scrub: the animation follows the scrollbar, reversible, with a touch of smoothing.
         Scrolling itself is never hijacked: it is the normal native scroll.
       * gsap.matchMedia() rebuilds everything when the layout crosses the 860px mobile breakpoint.
  ------------------------------------------------------------------------ */
  var SIDE  = [1, -1, 1, -1, 1, -1, 0];                  // +1 right, -1 left, 0 centre
  var TILT  = [-3, 2.5, -1.5, 2, -2, 2.5, 0];            // z rotation, degrees
  var YAW   = [-12, 12, -6, 10, -10, 10, 0];             // y rotation, degrees (turns toward the text)
  var SCALE_D = [1, 0.96, 1.06, 0.98, 1, 0.97, 1.14];    // desktop scale per section
  var SCALE_M = [1, 0.97, 1.04, 0.98, 1, 0.97, 1.06];    // mobile scale per section
  var LIFT  = [0, -2, 0, -1, 1, 0, 1];                   // vertical offset in vh (desktop only)

  /* Pose of the instrument in section i, in pixels, computed from the current viewport. */
  function pose(i, mobile) {
    var w = window.innerWidth, h = window.innerHeight;
    var offset = mobile ? w * 0.085 : w * 0.24;         // how far from the centre line it sits
    return {
      x: SIDE[i] * offset,
      y: mobile ? 0 : LIFT[i] * h / 100,
      scale: (mobile ? SCALE_M : SCALE_D)[i],
      rotation: TILT[i] * (mobile ? 0.7 : 1),
      rotationY: YAW[i] * (mobile ? 0.5 : 1)
    };
  }
  function absTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function initGSAPMode() {
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    // We rebuild on resize ourselves (see build()), so ScrollTrigger needn't auto-refresh on it.
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });
    body.classList.add('fx-gsap');

    var copies  = panels.map(function (p) { return $$('.copy', p); });
    var reveals = panels.map(function (p) { return $$('.reveal', p); });
    var last = panels.length - 1;

    /* Where (in scroll pixels) does the transition out of section i begin and end? */
    function centreScroll(i) { return absTop(panels[i]) + panels[i].offsetHeight / 2 - window.innerHeight / 2; }
    function readScroll(i) {
      // scroll position at which the bottom of section i's text is comfortably on screen
      var bottom = 0;
      copies[i].forEach(function (c) { bottom = Math.max(bottom, c.offsetTop + c.offsetHeight); });
      return absTop(panels[i]) + bottom - window.innerHeight * 0.88;
    }
    function startScroll(i) { return Math.max(centreScroll(i), readScroll(i)); }
    /* The transition must be finished by the time the next section's top reaches the viewport top,
       so jumping to a section with the nav never lands on half-faded text (matters for sections
       taller than the screen, e.g. on phones). For 100vh sections centre === top, so nothing changes. */
    function endScroll(i) { return Math.max(Math.min(centreScroll(i + 1), absTop(panels[i + 1])), startScroll(i) + window.innerHeight * 0.7); }

    /* Intro, once on load: the first section's text and the instrument settle into view. */
    gsap.from(reveals[0], { opacity: 0, y: 34, filter: 'blur(8px)', stagger: 0.12, duration: 1.1, ease: 'power3.out', delay: 0.25 });
    gsap.from(floatEl, { autoAlpha: 0, duration: 1.6, ease: 'power2.out', delay: 0.1 });
    gsap.from(depthEl, { y: 50, scale: 0.92, duration: 1.7, ease: 'power3.out', delay: 0.1 });

    /* ONE MASTER TIMELINE (important design choice)
       Every segment (section i -> i+1) lives inside a single timeline whose time unit is "scroll
       pixels". A single timeline is rendered in strict time order, so the page is always in the
       correct state even when the scroll position jumps (deep link, dragging the scrollbar,
       "Back to top", keyboard Home/End). Many separate timelines animating the same elements
       would fight each other on such jumps. */
    var master = null, rebuild = function () {};

    function build(mobile) {
      if (master) { if (master.scrollTrigger) master.scrollTrigger.kill(); master.kill(); master = null; }
      var vh = window.innerHeight;

      // 1. Work out, in scroll pixels, where each segment begins and ends (never overlapping).
      var segs = [], prevEnd = -Infinity;
      for (var i = 0; i < last; i++) {
        var s = Math.max(startScroll(i), prevEnd);
        var e = Math.max(endScroll(i), s + vh * 0.7);
        segs.push({ s: s, e: e, d: e - s });
        prevEnd = e;
      }
      var t0 = segs[0].s, t1 = segs[last - 1].e;

      // 2. Reset every animated element to the state it has before any scrolling happens.
      gsap.set(hm, Object.assign({ transformPerspective: 1400 }, pose(0, mobile)));
      gsap.set(depthEl, { scale: 1 });
      copies.forEach(function (c, i) { gsap.set(c, i === 0 ? { autoAlpha: 1, y: 0, filter: 'blur(0px)' } : { autoAlpha: 0, y: 30, filter: 'blur(10px)' }); });
      reveals.forEach(function (r, i) { if (i > 0) gsap.set(r, { opacity: 0, y: 26 }); });

      // 3. Build the timeline: time (px) = scroll position - t0; the ScrollTrigger scrubs it.
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: document.body, start: t0, end: t1, scrub: 0.85 }
      });
      segs.forEach(function (g, i) {
        var at = g.s - t0, d = g.d;
        // (a) the one instrument glides to its next pose
        tl.fromTo(hm, pose(i, mobile), Object.assign({ duration: d, ease: 'power2.inOut', immediateRender: false }, pose(i + 1, mobile)), at);
        // (b) depth: a soft scale swell mid-journey, then settle
        tl.fromTo(depthEl, { scale: 1 }, { scale: 1.05, duration: d * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1, immediateRender: false }, at);
        // (c) the current text leaves early (fade + blur + lift)...
        tl.fromTo(copies[i], { autoAlpha: 1, y: 0, filter: 'blur(0px)' },
          { autoAlpha: 0, y: -26, filter: 'blur(8px)', duration: d * 0.3, ease: 'power1.in', immediateRender: false }, at + d * 0.06);
        // (d) ...and the next text arrives late, its children staggering in one by one
        tl.fromTo(copies[i + 1], { autoAlpha: 0, y: 30, filter: 'blur(10px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: d * 0.28, ease: 'power1.out', immediateRender: false }, at + d * 0.62);
        tl.fromTo(reveals[i + 1], { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: d * 0.26, stagger: d * 0.035, ease: 'power2.out', immediateRender: false }, at + d * 0.64);
      });
      master = tl;
      // jump straight to the right place (no glide-in when we rebuild mid-page)
      tl.progress(tl.scrollTrigger.progress);
    }

    var mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, function (ctx) {
      var mobile = !!ctx.conditions.mobile;
      var lastW = window.innerWidth, lastH = window.innerHeight, timer = null;
      rebuild = function () { build(mobile); };
      build(mobile);

      // Layout changed (resize / rotate / fonts loaded)? Recompute the pixel positions.
      // Small height changes (phone address bar showing/hiding) are ignored on purpose.
      function onResize() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (window.innerWidth !== lastW || Math.abs(window.innerHeight - lastH) > 120) {
            lastW = window.innerWidth; lastH = window.innerHeight; build(mobile);
          }
        }, 200);
      }
      window.addEventListener('resize', onResize);
      return function () {
        window.removeEventListener('resize', onResize); clearTimeout(timer);
        if (master) { if (master.scrollTrigger) master.scrollTrigger.kill(); master.kill(); master = null; }
        rebuild = function () {};
      };
    });

    // When the footer arrives, the instrument fades out instead of floating over it.
    var footer = $('#footer');
    if (footer) {
      gsap.to(stageEl, {
        autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top 92%', end: 'top 50%', scrub: true }
      });
    }

    var refresh = function () { rebuild(); ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }

  /* ------------------------------------------------------------------------
     6. FALLBACK MODE: no GSAP (CDN blocked/offline) or the visitor prefers reduced motion.
        The instrument glides between CSS-defined positions (body[data-section]) and text fades
        in via IntersectionObserver. Everything still works; it just isn't scrubbed.
  ------------------------------------------------------------------------ */
  function initFallbackMode() {
    body.classList.add('fx-fallback');
    panels.forEach(function (p) {
      $$('.reveal', p).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-seen'); });
      }, { threshold: 0.15 });
      panels.forEach(function (p) { io.observe(p); });
    } else {
      panels.forEach(function (p) { p.classList.add('is-seen'); });
    }
    panels[0].classList.add('is-seen');
  }

  /* ------------------------------------------------------------------------
     7. HOW IT WORKS: airflow diagram. Loops "press / release" while the section is on screen,
        until the visitor takes control with the button.
  ------------------------------------------------------------------------ */
  function initAirflow() {
    var svg = $('#airflow'), btn = $('#af-toggle');
    if (!svg || !btn) return { setActive: function () {} };
    var pressed = true, auto = true, timer = null;

    function set(v) {
      pressed = v;
      svg.classList.toggle('is-pressed', v);
      btn.setAttribute('aria-pressed', String(v));
      btn.textContent = v ? 'Release the key' : 'Press the key';
    }
    function startAuto() {
      if (!auto || timer || reduceMQ.matches) return;
      timer = setInterval(function () { set(!pressed); }, 2800);
    }
    function stopAuto() { clearInterval(timer); timer = null; }

    btn.addEventListener('click', function () { auto = false; stopAuto(); set(!pressed); });
    if (reduceMQ.matches && svg.pauseAnimations) svg.pauseAnimations();

    return { setActive: function (on) { if (on) startAuto(); else stopAuto(); } };
  }

  /* ------------------------------------------------------------------------
     8. LEARN TO PLAY
  ------------------------------------------------------------------------ */

  /* 8a. A small additive "reed" synthesizer using the Web Audio API (no audio files needed).
         Each note layers detuned sawtooth/square oscillators plus an octave-up and octave-down
         rank, through a low-pass filter: a reedy, organ-like tone with a soft attack. */
  var Synth = (function () {
    var ctx = null, master = null;
    var voices = {};

    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(comp); comp.connect(ctx.destination);
      return ctx;
    }
    function resume() {
      var c = ensure();
      if (c && c.state === 'suspended') c.resume();
      return c;
    }
    function pressure(p) {                // p: 0..1 air pressure from the bellows meter
      if (master) master.gain.setTargetAtTime(0.15 + 0.85 * p, ctx.currentTime, 0.12);
    }
    function on(id, freq) {
      var c = resume();
      if (!c || voices[id]) return;
      var now = c.currentTime;
      var out = c.createGain();
      out.gain.setValueAtTime(0, now);
      out.gain.linearRampToValueAtTime(0.2, now + 0.07);
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = Math.min(5200, freq * 7 + 900); filt.Q.value = 0.6;
      var ranks = [['sawtooth', 1, 0.55], ['square', 1.004, 0.28], ['sawtooth', 2, 0.22], ['sine', 0.5, 0.18]];
      var oscs = ranks.map(function (r) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = r[0]; o.frequency.value = freq * r[1]; g.gain.value = r[2];
        o.connect(g); g.connect(filt); o.start(now);
        return o;
      });
      filt.connect(out); out.connect(master);
      voices[id] = { oscs: oscs, out: out };
    }
    function off(id) {
      var v = voices[id];
      if (!v || !ctx) return;
      delete voices[id];
      var now = ctx.currentTime;
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setValueAtTime(v.out.gain.value, now);
      v.out.gain.setTargetAtTime(0, now, 0.07);
      v.oscs.forEach(function (o) { try { o.stop(now + 0.5); } catch (e) { /* already stopped */ } });
    }
    return {
      on: on, off: off, pressure: pressure, resume: resume,
      count: function () { return Object.keys(voices).length; }
    };
  })();

  function freqOf(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /* 8b. Keyboard layout: C4 to E5 (ten white keys). Sa = C in this demo. */
  var KEYS = [
    { midi: 60, name: 'C',  sa: 'Sa',  kbd: 'a' }, { midi: 61, name: 'C♯', black: true, kbd: 'w' },
    { midi: 62, name: 'D',  sa: 'Re',  kbd: 's' }, { midi: 63, name: 'D♯', black: true, kbd: 'e' },
    { midi: 64, name: 'E',  sa: 'Ga',  kbd: 'd' },
    { midi: 65, name: 'F',  sa: 'Ma',  kbd: 'f' }, { midi: 66, name: 'F♯', black: true, kbd: 't' },
    { midi: 67, name: 'G',  sa: 'Pa',  kbd: 'g' }, { midi: 68, name: 'G♯', black: true, kbd: 'y' },
    { midi: 69, name: 'A',  sa: 'Dha', kbd: 'h' }, { midi: 70, name: 'A♯', black: true, kbd: 'u' },
    { midi: 71, name: 'B',  sa: 'Ni',  kbd: 'j' },
    { midi: 72, name: 'C',  sa: "Sa′", kbd: 'k' }, { midi: 73, name: 'C♯', black: true, kbd: 'o' },
    { midi: 74, name: 'D',  sa: "Re′", kbd: 'l' }, { midi: 75, name: 'D♯', black: true, kbd: 'p' },
    { midi: 76, name: 'E',  sa: "Ga′", kbd: ';' }
  ];
  var SWARA = { 'Sa': 60, 'Re': 62, 'Ga': 64, 'Ma': 65, 'Pa': 67, 'Dha': 69, 'Ni': 71, "Sa'": 72, "Re'": 74, "Ga'": 76 };
  var EXERCISES = {
    scale:   "Sa Re Ga Ma Pa Dha Ni Sa' Ni Dha Pa Ma Ga Re Sa",
    alankar: "Sa Re Ga|Re Ga Ma|Ga Ma Pa|Ma Pa Dha|Pa Dha Ni|Dha Ni Sa'",
    bhupali: "Sa Re Ga Pa Dha Sa' Dha Pa Ga Re Sa"
  };

  function initPiano() {
    var piano = $('#piano');
    if (!piano) return;
    var status = $('#piano-status'), fill = $('#air-fill'), pumpBtn = $('#pump');
    var demoBtn = $('#demo-play'), select = $('#exercise');
    var idleText = status ? status.textContent : '';
    var els = {};          // midi -> button
    var held = {};         // midi -> true while a user press is active

    // build keys
    var whiteCount = 0;
    KEYS.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'key ' + (k.black ? 'black' : 'white');
      b.dataset.midi = k.midi;
      b.setAttribute('aria-label', k.name + (k.sa ? ' (' + k.sa + ')' : ''));
      if (k.black) {
        // sits on the boundary after the previous white key (each white key is 10% of the width)
        b.style.left = (whiteCount * 10) + '%';
        b.style.marginLeft = '6px';       // compensates for the 6px side padding of the case
      } else {
        b.innerHTML = '<span class="k-sa">' + k.sa + '</span><span class="k-note">' + k.name + '</span><span class="k-kbd">' + k.kbd + '</span>';
        whiteCount++;
      }
      els[k.midi] = b;
      piano.appendChild(b);
    });

    function label(k) { return k.sa ? k.sa + ' (' + k.name + ')' : k.name; }
    function say(t) { if (status) status.textContent = t; }

    /* bellows air: drains slowly while notes sound; pumping refills. */
    var air = 1, demoRunning = false;
    function setAir(v) {
      air = clamp(v, 0, 1);
      if (fill) fill.style.transform = 'scaleX(' + air.toFixed(3) + ')';
      Synth.pressure(Math.min(1, air * 4));
    }
    setInterval(function () {
      if (Synth.count() > 0 && !demoRunning) {
        setAir(air - 0.0035);
        if (air < 0.12) say('The bellows are running low, so pump (press B) to keep the tone full.');
      }
    }, 100);

    function pump() {
      setAir(air + 0.3);
      if (air >= 0.12 && status && /running low/.test(status.textContent)) say(idleText);
      var g = $('#hm-bellows');            // squeeze the real bellows on the big instrument
      if (g && g.animate && !reduceMQ.matches) {
        g.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(9px,-8px)' }, { transform: 'translate(0,0)' }], { duration: 520, easing: 'ease-in-out' });
      }
    }
    if (pumpBtn) pumpBtn.addEventListener('click', pump);

    function press(k, src) {
      if (held[k.midi]) return;
      held[k.midi] = true;
      els[k.midi].classList.add('is-down');
      Synth.pressure(Math.min(1, air * 4));
      Synth.on('k' + k.midi, freqOf(k.midi));
      say(label(k));
    }
    function release(k) {
      if (!held[k.midi]) return;
      delete held[k.midi];
      els[k.midi].classList.remove('is-down');
      Synth.off('k' + k.midi);
    }

    // pointer (mouse + touch + pen)
    KEYS.forEach(function (k) {
      var b = els[k.midi];
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(k); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { b.addEventListener(t, function () { release(k); }); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      // keyboard activation when a key button has focus
      b.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); press(k); } });
      b.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); release(k); } });
    });

    // computer keyboard, active while the Play section is current
    var kbdMap = {};
    KEYS.forEach(function (k) { kbdMap[k.kbd] = k; });
    document.addEventListener('keydown', function (e) {
      if (activeIndex !== 4 || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target && e.target.tagName;
      if (t === 'SELECT' || t === 'INPUT' || t === 'TEXTAREA') return;
      var key = e.key.toLowerCase();
      if (key === 'b') { pump(); return; }
      if (kbdMap[key]) { press(kbdMap[key]); }
    });
    document.addEventListener('keyup', function (e) {
      var k = kbdMap[e.key.toLowerCase()];
      if (k) release(k);
    });
    window.addEventListener('blur', function () { KEYS.forEach(release); });

    // demo melodies
    var timers = [];
    function stopDemo() {
      timers.forEach(clearTimeout); timers = [];
      KEYS.forEach(function (k) { els[k.midi].classList.remove('is-demo'); Synth.off('demo' + k.midi); });
      demoRunning = false;
      if (demoBtn) demoBtn.textContent = 'Play demo';
    }
    function playDemo() {
      stopDemo();
      Synth.resume();
      var groups = EXERCISES[select.value].split('|');
      var seq = [];
      groups.forEach(function (g, gi) {
        var names = g.trim().split(/\s+/);
        names.forEach(function (n, ni) {
          var lastInGroup = ni === names.length - 1;
          var lastOverall = gi === groups.length - 1 && lastInGroup;
          seq.push({ midi: SWARA[n], name: n, dur: lastOverall ? 1100 : (lastInGroup && groups.length > 1 ? 620 : 480) });
        });
      });
      demoRunning = true;
      setAir(1);
      if (demoBtn) demoBtn.textContent = 'Stop demo';
      var t = 120;
      seq.forEach(function (s, idx) {
        timers.push(setTimeout(function () {
          var k = KEYS.filter(function (x) { return x.midi === s.midi; })[0];
          els[s.midi].classList.add('is-demo');
          Synth.on('demo' + s.midi, freqOf(s.midi));
          say('Demo: ' + (k ? label(k) : s.name) + '   (' + (idx + 1) + '/' + seq.length + ')');
        }, t));
        timers.push(setTimeout(function () {
          els[s.midi].classList.remove('is-demo');
          Synth.off('demo' + s.midi);
        }, t + s.dur - 70));
        t += s.dur;
      });
      timers.push(setTimeout(function () { stopDemo(); say('Your turn: try it yourself. ' + idleText); }, t + 200));
    }
    if (demoBtn) demoBtn.addEventListener('click', function () { if (demoRunning) { stopDemo(); say(idleText); } else playDemo(); });
    if (select) select.addEventListener('change', function () { if (demoRunning) stopDemo(); });

    setAir(1);
  }

  /* ------------------------------------------------------------------------
     9. BOOT
  ------------------------------------------------------------------------ */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* Make sure GSAP is available: page tags first, then local copies, then the CDN. */
  function ensureGSAP() {
    var ok = function () { return !!(window.gsap && window.ScrollTrigger); };
    if (ok()) return Promise.resolve(true);
    var attempts = [
      ['assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js'],
      ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js']
    ];
    return attempts.reduce(function (p, pair) {
      return p.then(function () {
        if (ok()) return;
        return loadScript(pair[0]).then(function () { return loadScript(pair[1]); }).catch(function () { /* try next */ });
      });
    }, Promise.resolve()).then(ok);
  }

  function boot() {
    initImage();
    initHotspots();
    initParts();
    initNav();
    airflow = initAirflow();
    initPiano();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();                                   // set initial theme / active section

    if (reduceMQ.matches) { initFallbackMode(); return; }
    ensureGSAP().then(function (ok) {
      if (ok) {
        try { initGSAPMode(); }
        catch (err) { console.warn('GSAP mode failed, using fallback:', err); body.classList.remove('fx-gsap'); initFallbackMode(); }
      } else {
        initFallbackMode();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
