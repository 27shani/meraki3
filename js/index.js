/* =====================================================================
   MERAKI 2026 — MAIN ANIMATION SCRIPT
   Vanilla JS + GSAP + ScrollTrigger + Lenis
   Architecture mirrors lukebaffait.fr: direct DOM manipulation,
   gsap.quickTo for cursor lag, gsap.ticker for continuous tilt,
   DOM writes only on actual index change (no per-frame re-render).
   ===================================================================== */

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================================================================
     UTIL — character split + hover wipe (data-char-hover)
     =================================================================== */
  function splitIntoChars(el) {
    var text = el.textContent || '';
    el.innerHTML = '';
    el.classList.add('split-chars');
    var chars = [];
    text.split('').forEach(function (ch) {
      if (ch === ' ') {
        var space = document.createElement('span');
        space.className = 'char-space';
        space.innerHTML = '&nbsp;';
        el.appendChild(space);
        return;
      }
      var wrapper = document.createElement('span');
      wrapper.className = 'char';
      var top = document.createElement('span');
      top.className = 'ch-top';
      top.textContent = ch;
      var bot = document.createElement('span');
      bot.className = 'ch-bot';
      bot.textContent = ch;
      wrapper.appendChild(top);
      wrapper.appendChild(bot);
      el.appendChild(wrapper);
      chars.push({ top: top, bot: bot, wrapper: wrapper });
    });
    return chars;
  }

  function applyCharHover(chars, parent) {
    if (!chars.length) return;
    var stagger = 0.012;
    function onEnter() {
      chars.forEach(function (c, i) {
        gsap.to(c.top, { clipPath: 'inset(0 0 0 0)', duration: 0.45, ease: 'power3.out', delay: i * stagger, overwrite: true });
        gsap.to(c.bot, { yPercent: -100, duration: 0.45, ease: 'power3.out', delay: i * stagger, overwrite: true });
      });
    }
    function onLeave() {
      chars.forEach(function (c, i) {
        gsap.to(c.top, { clipPath: 'inset(100% 0 0 0)', duration: 0.4, ease: 'power3.out', delay: i * stagger, overwrite: true });
        gsap.to(c.bot, { yPercent: 0, duration: 0.4, ease: 'power3.out', delay: i * stagger, overwrite: true });
      });
    }
    parent.addEventListener('mouseenter', onEnter);
    parent.addEventListener('mouseleave', onLeave);
  }

  function initCharHover(root) {
    var nodes = (root || document).querySelectorAll('[data-char-hover]');
    nodes.forEach(function (el) {
      if (el.classList.contains('split-chars')) return;
      var chars = splitIntoChars(el);
      applyCharHover(chars, el);
    });
  }

  function splitWords(text) { return text.split(/(\s+)/); }
  function isSpace(s) { return !s || /^\s+$/.test(s); }

  // Word-wrap that preserves existing inline formatting (e.g. italic/gradient
  // spans) by copying an element child's classes onto its own word spans,
  // instead of flattening textContent (which would destroy the styling).
  function wrapLineWords(lineEl) {
    var wordEls = [];
    var childNodes = Array.prototype.slice.call(lineEl.childNodes);

    childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var frag = document.createDocumentFragment();
        splitWords(node.textContent).forEach(function (w) {
          if (isSpace(w)) { if (w) frag.appendChild(document.createTextNode(w)); return; }
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = w;
          frag.appendChild(span);
          wordEls.push(span);
        });
        lineEl.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        var extraClasses = node.className;
        var text = node.textContent;
        node.textContent = '';
        splitWords(text).forEach(function (w) {
          if (isSpace(w)) { if (w) node.appendChild(document.createTextNode(w)); return; }
          var span = document.createElement('span');
          span.className = 'word ' + extraClasses;
          span.textContent = w;
          node.appendChild(span);
          wordEls.push(span);
        });
      }
    });

    lineEl.classList.add('word-reveal');
    return wordEls;
  }

  /* ===================================================================
     LENIS — smooth scroll, exact lukebaffait.fr config
     =================================================================== */
  var html = document.documentElement;
  html.classList.add('lenis', 'lenis-smooth');

  var lenis = new Lenis({ lerp: 0.06 });
  window.__lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  lenis.stop();
  lenis.scrollTo(0, { immediate: true });
  html.classList.add('lenis-stopped');
  html.style.overflow = 'hidden';

  function unlockLenis() {
    if (!html.classList.contains('lenis-stopped')) return;
    html.style.overflow = '';
    html.classList.remove('lenis-stopped');
    lenis.start();
    lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }
  window.__unlockLenis = unlockLenis;

  var safetyUnlock = window.setTimeout(unlockLenis, 5000);
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ===================================================================
     LOADER
     =================================================================== */
(function loaderAnim() {
  var loader = document.getElementById('loader');
  var logo = document.getElementById('loaderLogo');
  var wipeRed = document.getElementById('wipeRed');
  var wipeBlack = document.getElementById('wipeBlack');
  var heroTitle = document.getElementById('heroTitle');

  // 🛡️ Debug: check if elements exist
  if (!loader || !logo || !wipeRed || !wipeBlack) {
    console.error('Loader elements missing! Check IDs.');
    return;
  }

  // ✅ FORCE reset: no CSS transform conflicts, use GSAP's 'y' (in %)
  gsap.set(loader, { opacity: 1, visibility: 'visible', pointerEvents: 'auto' });
  gsap.set(logo, { scale: 0.5, opacity: 0 });
  
  // CRITICAL: explicitly set y to 100% (down) and ensure they are opaque
  gsap.set(wipeRed, { y: '100%', opacity: 1 });
  gsap.set(wipeBlack, { y: '100%', opacity: 1 });

  var tl = gsap.timeline();

  tl
    // 1) Logo scales up big & fades in
    .to(logo, { scale: 0.78, opacity: 1, duration: 0.8, ease: 'expo.out' })

    // 2) Red wipe slides UP (from 100% to 0%)
    .to(wipeRed, { y: '0%', duration: 0.6, ease: 'power3.inOut' }, '+=0.2')

    // 3) Black wipe slides UP (overlaps red)
    .to(wipeBlack, { y: '0%', duration: 0.6, ease: 'power3.inOut' }, '-=0.4')

    // 4) Logo fades out instantly
    .set(logo, { opacity: 0 })

    // 5) Loader background becomes transparent
    .set(loader, { backgroundColor: 'transparent' })

    // 6) Red wipe slides back DOWN
    .to(wipeRed, { y: '100%', duration: 0.6, ease: 'power3.inOut' })

    // 7) Black wipe slides back DOWN (triggers completion)
    .to(wipeBlack, {
      y: '100%',
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: function () {
        gsap.set(loader, { visibility: 'hidden', pointerEvents: 'none' });
        window.clearTimeout(safetyUnlock);
        unlockLenis();
        ScrollTrigger.refresh();

        if (heroTitle) {
          var words = heroTitle.querySelectorAll('span');
          gsap.from(words, {
            opacity: 0,
            y: 50,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 0.2
          });
        }
      }
    }, '-=0.4');
})();
  /* ===================================================================
     SCROLL PROGRESS
     =================================================================== */
  (function scrollProgress() {
    var wrap = document.getElementById('scrollProgress');
    var bar = document.getElementById('scrollProgressBar');
    var pct = document.getElementById('scrollProgressPct');
    if (!wrap) return;

    lenis.on('scroll', function (e) {
      var progress = e.progress || 0;
      gsap.set(bar, { scaleY: progress });
      pct.textContent = String(Math.round(progress * 100)).padStart(2, '0');
      wrap.classList.toggle('is-visible', e.scroll > 40);
    });
  })();

  var mm = gsap.matchMedia();

  /* ===================================================================
     1. HERO — pinned expand-to-fullscreen reveal
     =================================================================== */
  (function hero() {
    var container = document.getElementById('hero');
    var titleWrap = document.getElementById('heroTitleWrap');
    var expandBox = document.getElementById('heroExpand');
    var expandContent = document.getElementById('heroExpandContent');
    if (!container) return;

    mm.add('(min-width: 768px)', function () {
      gsap.set(titleWrap, { y: 0 });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=160%', scrub: 0.6, pin: true }
      });
      tl.to(expandBox, { width: '350px', height: '200px', opacity: 1, borderRadius: '0px', ease: 'power3.out' })
        .to(expandBox, { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut' }, '+=0.1')
        .fromTo(expandContent, { opacity: 0, y: 60, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 1.5 }, '<0.2')
        .to(container, { scale: 0.85, opacity: 0.15, filter: 'blur(6px)', yPercent: -20, ease: 'power2.inOut', duration: 1.2 }, '+=0.3');
    });

    mm.add('(max-width: 767px)', function () {
      gsap.set(titleWrap, { y: '22vh' });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=180%', scrub: 0.6, pin: true }
      });
      tl.to(titleWrap, { y: 0, duration: 1.2, ease: 'power2.out' })
        .to(expandBox, { width: '220px', height: '350px', opacity: 1, borderRadius: '0px', ease: 'power3.out', duration: 1 }, '+=0.2')
        .to(expandBox, { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.2 }, '+=0.2')
        .fromTo(expandContent, { opacity: 0, y: 60, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 1.5 }, '<0.2')
        .to(container, { scale: 0.85, opacity: 0.15, filter: 'blur(6px)', yPercent: -20, ease: 'power2.inOut', duration: 1.2 }, '+=0.3');
    });
  })();

  /* ===================================================================
     2. ABOUT — word reveal + horizontal card slider
     =================================================================== */
  (function about() {
    var container = document.getElementById('about');
    var heading = document.getElementById('aboutHeading');
    var image = document.getElementById('aboutImage');
    var boxesWrapper = document.getElementById('aboutBoxes');
    var boxes = boxesWrapper ? Array.prototype.slice.call(boxesWrapper.querySelectorAll('[data-box]')) : [];
    if (!container) return;

    var lineDivs = heading.querySelectorAll(':scope > div');
    lineDivs.forEach(function (div, index) {
      var words = wrapLineWords(div);
      gsap.fromTo(words, { opacity: 0, filter: 'blur(8px)' }, {
        opacity: 1, filter: 'blur(0px)', stagger: 0.04, ease: 'power2.out',
        scrollTrigger: { trigger: heading, start: 'top 85%', toggleActions: 'play none none reverse' },
        delay: index * 0.2
      });
    });

    gsap.fromTo(container, { opacity: 0.15, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: container, start: 'top bottom', end: 'top center', scrub: 0.6 }
    });

    mm.add('(min-width: 768px)', function () {
      var containerWidth = container.clientWidth;
      var wrapperWidth = boxesWrapper.scrollWidth;
      var startOffset = containerWidth * 0.6;
      var finalX = -(wrapperWidth - containerWidth + 200);

      gsap.set(boxesWrapper, { x: startOffset });

      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=120%', pin: true, scrub: 0.6 }
      });
      tl.fromTo(image, { filter: 'blur(12px) brightness(0.6)', opacity: 0.3 }, { filter: 'blur(2px) brightness(1)', opacity: 1, duration: 1.0, ease: 'power2.out' }, 0)
        .to(boxesWrapper, { x: finalX, duration: 2.0, ease: 'power2.inOut' }, 0.1)
        .fromTo(boxes, { y: '80px', scale: 0.92 }, { y: 0, scale: 1, stagger: 0.35, duration: 1.2, ease: 'power2.out' }, 0.2);
    });

    mm.add('(max-width: 767px)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=130%', pin: true, scrub: 0.5, invalidateOnRefresh: true }
      });
      tl.fromTo(image, { filter: 'blur(12px) brightness(0.6)', opacity: 0.3 }, { filter: 'blur(2px) brightness(1)', opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
        .fromTo(boxes, { y: '40px', scale: 0.92 }, { y: 0, scale: 1, stagger: 0.2, duration: 0.9, ease: 'power2.out' }, 0.1)
        .to(boxesWrapper, {
          x: function () {
            var wrapperWidth = boxesWrapper.scrollWidth || 0;
            return -(wrapperWidth - window.innerWidth + 120);
          },
          duration: 1.8, ease: 'power2.inOut'
        }, 0.1);
    });
  })();

  /* ===================================================================
     3. HOW IT WORKS — sticky step list, 3D tilt card, quickTo cursor
     =================================================================== */
  (function howItWorks() {
    var container = document.getElementById('how');
    var pathEl = document.getElementById('ribbonPath');
    var list = document.getElementById('howList');
    var card = document.getElementById('howCard');
    var cover = document.getElementById('howCover');
    var cursor = document.getElementById('howCursor');
    if (!container) return;

    var STEPS = [
      { stepNum: '01', title: 'Apply' },
      { stepNum: '02', title: 'Get Evaluated' },
      { stepNum: '03', title: 'Make the Cut' },
      { stepNum: '04', title: 'Refine Your Pitch' },
      { stepNum: '05', title: 'Pitch at Meraki' },
      { stepNum: '06', title: 'Win' }
    ];

    var stepEls = Array.prototype.slice.call(list.querySelectorAll('.how__step'));
    var imgEls = Array.prototype.slice.call(card.querySelectorAll('[data-img]'));
    var descEls = Array.prototype.slice.call(container.querySelectorAll('[data-desc]'));
    var counterEl = document.getElementById('howCounter');
    var stepLabelEl = document.getElementById('howStepLabel');
    var coverTitleEl = document.getElementById('howCoverTitle');

    var ROW_HEIGHT = 130;
    var isCardHovered = false;
    var tilt = { targetRY: 0, targetRX: 0, ry: 0, rx: 0 };

    // Preload step images
    STEPS.forEach(function (s, i) {
      var img = imgEls[i] && imgEls[i].querySelector('img');
      if (img) { var pre = new Image(); pre.src = img.src; }
    });

    function onMouseMove(e) {
      if (!isCardHovered) return;
      var rect = card.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var ry = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      var rx = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      tilt.targetRY = ry * 7;
      tilt.targetRX = -rx * 5;
    }
    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseenter', function () {
      isCardHovered = true;
      gsap.to(cursor, { opacity: 1, duration: 0.25 });
      gsap.to(cover, { opacity: 1, y: -8, duration: 0.45, ease: 'power3.out' });
    });
    card.addEventListener('mouseleave', function () {
      isCardHovered = false;
      tilt.targetRY = 0; tilt.targetRX = 0;
      gsap.to(cursor, { opacity: 0, duration: 0.25 });
      gsap.to(cover, { opacity: 0, y: 0, duration: 0.45, ease: 'power3.out' });
    });

    mm.add({ isDesktop: '(min-width: 768px)', isMobile: '(max-width: 767px)' }, function (context) {
      var isMobile = context.conditions.isMobile;
      var isDesktop = context.conditions.isDesktop;
      var total = STEPS.length;
      var lastIndex = 0;

      function tickerFn() {
        if (!isCardHovered) return;
        tilt.ry += (tilt.targetRY - tilt.ry) * 0.12;
        tilt.rx += (tilt.targetRX - tilt.rx) * 0.12;
        card.style.transform = 'perspective(900px) rotateY(' + tilt.ry.toFixed(2) + 'deg) rotateX(' + tilt.rx.toFixed(2) + 'deg)';
      }
      gsap.ticker.add(tickerFn);

      var qCursorX = null, qCursorY = null;
      if (isDesktop) {
        qCursorX = gsap.quickTo(cursor, 'left', { duration: 0.35, ease: 'power3.out' });
        qCursorY = gsap.quickTo(cursor, 'top', { duration: 0.35, ease: 'power3.out' });
      }
      function onGlobalMove(e) {
        if (!isCardHovered || !qCursorX) return;
        var rect = card.getBoundingClientRect();
        qCursorX(e.clientX - rect.left);
        qCursorY(e.clientY - rect.top);
      }
      window.addEventListener('mousemove', onGlobalMove);

      var pathLength = pathEl ? pathEl.getTotalLength() : 0;
      if (pathEl) gsap.set(pathEl, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

      var vh = window.innerHeight;
      var startY = vh / 2 - ROW_HEIGHT / 2;
      var endY = vh / 2 - ((total - 1) * ROW_HEIGHT + ROW_HEIGHT / 2);
      gsap.set(list, { y: startY });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: container, start: 'top top', end: isMobile ? '+=70%' : '+=180%',
          pin: true, scrub: isMobile ? 0.3 : 0.5, anticipatePin: 1, invalidateOnRefresh: true
        }
      });

      tl.fromTo(stepEls, { y: 80, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 1.0, ease: 'power2.out' }, 0);

      if (isDesktop && pathEl) {
        tl.to(pathEl, { strokeDashoffset: 0, ease: 'power1.inOut', duration: 0.8 }, 0);
      }

      tl.to(list, {
        y: endY, ease: 'none', duration: 1,
        onUpdate: function () {
          var rawIndex = this.progress() * (total - 1);
          var idx = Math.min(Math.round(rawIndex), total - 1);
          if (idx === lastIndex) return;
          lastIndex = idx;

          if (counterEl) counterEl.textContent = '(' + STEPS[idx].stepNum + ')';
          if (stepLabelEl) stepLabelEl.textContent = 'STEP ' + STEPS[idx].stepNum;
          if (coverTitleEl) coverTitleEl.textContent = STEPS[idx].title;

          stepEls.forEach(function (el, i) {
            el.classList.toggle('is-active', i === idx);
            var distance = i - idx;
            var tx = 0;
            if (distance === 0) tx = -18;
            else tx = distance * 10;
            var h2 = el.querySelector('.how__step-title');
            h2.style.transform = 'translateX(' + tx + 'px)' + (i === idx ? ' scale(1.05)' : '');
          });

          imgEls.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
          descEls.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
        }
      }, 0);

      tl.to({}, { duration: 0.12 }, 0.9);

      return function cleanup() {
        gsap.ticker.remove(tickerFn);
        window.removeEventListener('mousemove', onGlobalMove);
      };
    });
  })();

  /* ===================================================================
     4. FLOATING GALLERY — dual opposite-direction marquee tracks
     =================================================================== */
  (function gallery() {
    var section = document.getElementById('gallery');
    var text = document.getElementById('galleryText');
    var trackOne = document.getElementById('trackOne');
    var trackTwo = document.getElementById('trackTwo');
    if (!section) return;

    var cardsOne = Array.prototype.slice.call(trackOne.querySelectorAll('[data-card]'));
    var cardsTwo = Array.prototype.slice.call(trackTwo.querySelectorAll('[data-card]'));

    gsap.context(function () {
      gsap.set(text, { opacity: 0, scale: 0.92, filter: 'blur(14px)' });
      gsap.set(cardsOne.concat(cardsTwo), { y: 40, opacity: 0, scale: 0.88 });

      var getStartXOne = function () { return -(trackOne.scrollWidth - window.innerWidth + 48); };
      gsap.set(trackOne, { x: getStartXOne() });
      gsap.set(trackTwo, { x: 0 });

      var tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: '+=800%', pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true }
      });

      tl.to(text, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }, 0);
      tl.to(cardsOne.concat(cardsTwo), { y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 1.2, ease: 'power2.out' }, 0.1);
      tl.to(trackOne, { x: 0, duration: 7, ease: 'none' }, 0.45);

      var targetXTwo = -(trackTwo.scrollWidth - window.innerWidth + 48);
      tl.to(trackTwo, { x: targetXTwo, duration: 7, ease: 'none' }, 0.45);

      tl.to(text, { opacity: 0, scale: 0.94, filter: 'blur(12px)', duration: 0.8, ease: 'power3.in' }, 6.3);
      tl.to(section, { scale: 0.88, opacity: 0.15, filter: 'blur(8px)', duration: 1.2, ease: 'power2.inOut' }, '+=0.5');
    }, section);

    window.addEventListener('resize', function () { ScrollTrigger.refresh(); });
  })();

  /* ===================================================================
     5. TRACKS — horizontal card slider + prize stagger + content pan
     =================================================================== */
  (function tracks() {
    var container = document.getElementById('tracks');
    var content = document.getElementById('tracksContent');
    var title = document.getElementById('tracksTitle');
    var wrapper = document.getElementById('tracksWrapper');
    var prizesWrap = document.getElementById('tracksPrizes');
    if (!container) return;

    var trackBoxes = Array.prototype.slice.call(wrapper.querySelectorAll('[data-track]'));
    var prizeBoxes = Array.prototype.slice.call(prizesWrap.querySelectorAll('[data-prize]'));

    gsap.fromTo(container, { opacity: 0.15, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', ease: 'power2.out',
      scrollTrigger: { trigger: container, start: 'top bottom', end: 'top center', scrub: 0.6 }
    });

    gsap.context(function () {
      var isMobile = window.innerWidth < 768;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: container, start: 'top top', end: isMobile ? '+=600%' : '+=450%',
          pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true
        }
      });

      gsap.set(title, { y: 40 });
      tl.to(title, { clipPath: 'inset(0 0 0% 0)', opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);

     var wrapperWidth = wrapper.getBoundingClientRect().width;
var viewportWidth = window.innerWidth;

var isDesktop = viewportWidth >= 768;

/*
 * DESKTOP:
 * Two cards should already be centered.
 *
 * MOBILE:
 * Keep the original horizontal entrance animation.
 */
var startOffset = isDesktop
  ? 0
  : viewportWidth * 0.8;

var finalX = 0;

if (!isDesktop && wrapperWidth > viewportWidth) {
  finalX = -(wrapperWidth - viewportWidth) - 20;
}

gsap.set(wrapper, {
  x: startOffset
});

tl.to(
  wrapper,
  {
    x: finalX,
    duration: isDesktop ? 1.2 : 3.0,
    ease: 'power2.inOut'
  },
  0.15
);

      /* Reveal both track cards — they start at opacity:0 in CSS. */
      tl.to(trackBoxes, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out'
      }, 0.3);

      /* Reveal the prize cards after the track cards.
         They were previously left at CSS opacity:0 with no timeline tween. */
      tl.to(prizesWrap, {
        opacity: 1,
        duration: 0.45,
        ease: 'power2.out'
      }, 1.05);

      tl.to(prizeBoxes, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.65,
        stagger: 0.08,
        ease: 'power2.out'
      }, 1.12);

      tl.to(content, {
        y: function () {
          var overflow = content.scrollHeight - window.innerHeight;
          return overflow > 0 ? -(overflow + 100) : 0;
        },
        ease: 'none', duration: 2.5
      }, isMobile ? 4.5 : 4.0);

      tl.to(container, { opacity: 0.12, filter: 'blur(10px)', duration: 1.0, ease: 'power2.inOut' }, '+=0.5');
    }, container);
  })();

  /* ===================================================================
     6. TIMELINE (SAVE THE DATES) — vertical scroll + accordion + arrow
     =================================================================== */
(function timeline() {
  var container = document.getElementById('timeline');
  var rightOuter = container ? container.querySelector('.timeline__right-outer') : null;
  var rightContent = document.getElementById('timelineRight');
  var arrow = document.getElementById('timelineArrow');
  if (!container || !rightOuter || !rightContent) return;

  initCharHover(container);

  // Get all accordion items
  var events = Array.prototype.slice.call(rightContent.querySelectorAll('[data-event]'));
  var openIndex = 0; // track which is open (-1 = none)

  // Function to open/close
  function setOpen(idx) {
    openIndex = idx;
    events.forEach(function (evt, i) {
      var body = evt.querySelector('[data-body]');
      var icon = evt.querySelector('.timeline__event-icon');
      var isOpen = (i === idx);

      // Update class and icon
      evt.classList.toggle('is-open', isOpen);
      icon.textContent = isOpen ? '—' : '+';

      // Kill any ongoing animation on this body
      gsap.killTweensOf(body);

      if (isOpen) {
        // Open: use scrollHeight (full content)
        var h = body.scrollHeight;
        gsap.to(body, {
          height: h,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.inOut',
          onComplete: function () {
            body.style.height = 'auto';
            ScrollTrigger.refresh();
          }
        });
      } else {
        // Close: collapse to 0
        gsap.to(body, {
          height: 0,
          opacity: 0,
          duration: 0.45,
          ease: 'power3.inOut',
          onComplete: function () {
            ScrollTrigger.refresh();
          }
        });
      }
    });
  }

  // --- SCROLL TRIGGER (pinning + arrow movement) ---
  function getMaxScroll() {
    return Math.max(0, rightContent.scrollHeight - rightOuter.clientHeight + 100);
  }

  gsap.context(function () {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: function () { return '+=' + (getMaxScroll() * 1.5); },
        pin: true,
        scrub: 2,
        invalidateOnRefresh: true
      }
    });
    tl.to(rightContent, { y: function () { return -getMaxScroll(); }, ease: 'none' }, 0);
    tl.fromTo(arrow, { x: '5vw' }, { x: '35vw', ease: 'power1.out' }, 0);
  }, container);

  // --- EVENT DELEGATION (works even after scroll) ---
  // Listen on the container that never moves
  rightContent.addEventListener('click', function (e) {
    // Find the closest clickable header
    var head = e.target.closest('[data-toggle]');
    if (!head) return;

    // Find the parent event item
    var evt = head.closest('[data-event]');
    if (!evt) return;

    var idx = events.indexOf(evt);
    if (idx === -1) return;

    // Toggle: if already open, close it (set -1), else open this one
    setOpen(openIndex === idx ? -1 : idx);
  });

  // --- INITIAL STATE: open the first one ---
  setOpen(0);

  // Safety: force pointer-events on the headers (just in case CSS blocks them)
  document.querySelectorAll('.timeline__event-head').forEach(function (btn) {
    btn.style.pointerEvents = 'auto';
  });
})();

  /* ===================================================================
     7. FAQ (AWARDS) — sequential row highlight + accordion + cursor
     =================================================================== */
  (function faq() {
    var section = document.getElementById('faq');
    var cursor = document.getElementById('faqCursor');
    if (!section) return;

    var rows = Array.prototype.slice.call(section.querySelectorAll('.faq__row'));
    var bgs = rows.map(function (r) { return r.querySelector('.faq__row-bg'); });

    // Live mobile check (matchMedia .matches is always current, no resize
    // listener needed) — used by the click handler to decide whether the
    // strip should be click-driven (mobile) or left to the scroll timeline (desktop).
    var mqMobile = window.matchMedia('(max-width: 767px)');

    // gsap.matchMedia cleanly separates desktop/mobile GSAP setup and
    // automatically reverts + re-runs the matching block if the viewport
    // crosses the breakpoint (e.g. device rotation).
    var mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', function () {
      // ---- DESKTOP ONLY: automatic scroll-driven spotlight cycle ----
      gsap.set(bgs, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(rows, { color: '#737373' });

      gsap.fromTo(section, { opacity: 0, filter: 'blur(14px)' }, {
        opacity: 1, filter: 'blur(0px)', ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top center', scrub: 0.6 }
      });

      if (!prefersReduced) {
        rows.forEach(function (row, i) {
          gsap.fromTo(row, { opacity: 0, y: 20, filter: 'blur(6px)' }, {
            opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out',
            scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 60%', scrub: 0.8 },
            delay: i * 0.03
          });
        });
      }

      var pinDuration = rows.length * 150;
      var enterDuration = 1.0;
      var staggerDelay = 0.6;

      var tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: '+=' + pinDuration + '%', pin: true, scrub: 1.0 }
      });

      var time = 0;
      var activeCount = 2;

      for (var i = 0; i < activeCount; i++) {
        tl.to(bgs[i], { scaleX: 1, duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[i], { color: '#191818', duration: enterDuration, ease: 'none' }, time);
        time += staggerDelay;
      }
      time += 0.3;

      for (var j = 0; j < rows.length - activeCount; j++) {
        var rowOut = j, rowIn = j + activeCount;
        tl.to(bgs[rowOut], { scaleX: 0, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[rowOut], { color: '#737373', duration: enterDuration, ease: 'none' }, time);
        tl.to(bgs[rowIn], { scaleX: 1, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[rowIn], { color: '#191818', duration: enterDuration, ease: 'none' }, time);
        time += enterDuration;
      }
      time += 0.3;

      for (var k = rows.length - activeCount; k < rows.length; k++) {
        tl.to(bgs[k], { scaleX: 0, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[k], { color: '#737373', duration: enterDuration, ease: 'none' }, time);
        time += staggerDelay;
      }
      tl.to({}, { duration: 0.5 }, time);
    });

    mm.add('(max-width: 767px)', function () {
      // ---- MOBILE: no scroll-jacked pin, strip is click-driven instead ----
      gsap.set(bgs, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(rows, { color: '#737373', opacity: 1, y: 0, filter: 'blur(0px)' });

      // Seed whichever row starts marked is-open in the HTML with the open state.
      rows.forEach(function (row, i) {
        if (row.classList.contains('is-open')) {
          gsap.set(bgs[i], { scaleX: 1 });
          gsap.set(row, { color: '#191818' });
        }
      });
    });

    function onMove(e) {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.35, ease: 'power3.out' });
    }
    window.addEventListener('mousemove', onMove);
    if (window.matchMedia('(min-width: 768px)').matches) cursor.style.display = 'block';

    rows.forEach(function (row, idx) {
      row.addEventListener('mouseenter', function () {
        gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
      });
      row.addEventListener('mouseleave', function () {
        gsap.to(cursor, { scale: 0.4, opacity: 0, duration: 0.3, ease: 'power3.out' });
      });
      var head = row.querySelector('[data-toggle]');
      head.addEventListener('click', function () {
        var isOpen = row.classList.contains('is-open');
        var mobileNow = mqMobile.matches;

        rows.forEach(function (r, ri) {
          r.classList.remove('is-open');
          r.querySelector('.faq__icon').textContent = '+';
          if (mobileNow) {
            gsap.to(bgs[ri], { scaleX: 0, duration: 0.4, ease: 'power2.inOut', transformOrigin: 'left center' });
            gsap.to(r, { color: '#737373', duration: 0.4, ease: 'power2.inOut' });
          }
        });

        if (!isOpen) {
          row.classList.add('is-open');
          row.querySelector('.faq__icon').textContent = '—';
          if (mobileNow) {
            gsap.to(bgs[idx], { scaleX: 1, duration: 0.45, ease: 'power2.out', transformOrigin: 'left center' });
            gsap.to(row, { color: '#191818', duration: 0.4, ease: 'power2.inOut' });
          }
        }
      });
    });
  })();

  /* ===================================================================
     8. CONTACT — expanding circle mask reveal
     =================================================================== */
  (function contact() {
    var container = document.getElementById('contact');
    var circle = document.getElementById('contactCircle');
    var content = document.getElementById('contactContent');
    if (!container) return;

    gsap.context(function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=100%', scrub: 1, pin: true }
      });
      if (circle) {
        gsap.set(circle, { scale: 0.08, transformOrigin: 'center center' });
        tl.to(circle, { scale: 32, ease: 'power2.inOut', duration: 1.2 }, 0);
      }

      if (content) {
        tl.fromTo(
          content,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, ease: 'power2.out', duration: 0.6 },
          0.55
        );
      }
    }, container);
  })();

  /* ===================================================================
     9. FOOTER — normal document-flow reveal + countdown
     =================================================================== */
  (function footer() {
    var footerEl = document.getElementById('siteFooter');
    if (!footerEl) return;

    var daysEl = document.getElementById('contactDays');
    var hoursEl = document.getElementById('contactHours');
    var minutesEl = document.getElementById('contactMinutes');

    function updateCountdown() {
      var target = new Date('2026-10-23T00:00:00+05:30').getTime();
      var now = Date.now();
      var diff = Math.max(0, target - now);

      var totalMinutes = Math.floor(diff / 60000);
      var days = Math.floor(totalMinutes / 1440);
      var hours = Math.floor((totalMinutes % 1440) / 60);
      var minutes = totalMinutes % 60;

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    }

    updateCountdown();
    window.setInterval(updateCountdown, 30000);

    gsap.context(function () {
      gsap.set(footerEl, { opacity: 0, y: 60 });

      var contact = footerEl.querySelector('.site-footer__contact');
      var brandLogo = footerEl.querySelector('.site-footer__brand-logo');
      var poweredWrap = footerEl.querySelector('.site-footer__powered-wrap');
      var instagram = footerEl.querySelector('.site-footer__instagram');

      var targets = [contact, brandLogo, poweredWrap, instagram].filter(Boolean);

      if (targets.length) {
        gsap.set(targets, { opacity: 0, y: 24 });
      }

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: footerEl,
          start: 'top 88%',
          end: 'top 62%',
          scrub: 1.1,
          invalidateOnRefresh: true
        }
      });

      tl.to(footerEl, {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        duration: 1
      }, 0);

      if (contact) tl.to(contact, { opacity: 1, y: 0, duration: .75, ease: 'power3.out' }, .12);
      if (poweredWrap) tl.to(poweredWrap, { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, .18);
      if (brandLogo) tl.to(brandLogo, { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, .2);
      if (instagram) tl.to(instagram, { opacity: 1, y: 0, duration: .55, ease: 'power3.out' }, .3);
    }, footerEl);
  })();

})();
