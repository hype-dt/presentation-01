/* HypeMind v0.1 — runtime da apresentação.
   Substitui o componente deck-stage do canvas por um palco estático:
   escala 1920x1080 para a viewport, navega entre slides e toca as
   revelações declaradas no markup (data-a, data-cell, data-bar, ...). */

(function () {
  'use strict';

  var EASE = 'cubic-bezier(.2,0,0,1)';
  var SPEED = 1;                 // 1 = velocidade original do canvas
  var CASCADE = true;            // revelação em cascata (vs. bloco)
  var k = 1 / SPEED;

  var deck = document.querySelector('[data-deck]');
  var stage = deck.querySelector('[data-stage]');
  var slides = Array.prototype.slice.call(stage.querySelectorAll('section'));
  var bar = document.querySelector('[data-bar]');
  var progress = document.querySelector('[data-progress] i');
  var counter = document.querySelector('[data-counter]');
  var labelEl = document.querySelector('[data-slide-label]');
  var prevBtn = document.querySelector('[data-prev]');
  var nextBtn = document.querySelector('[data-next]');
  var notes = document.querySelector('[data-notes]');
  var notesBody = document.querySelector('[data-notes-body]');
  var indexPanel = document.querySelector('[data-index]');
  var indexList = document.querySelector('[data-index-list]');

  var index = 0;

  function animOn() {
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- escala do palco ------------------------------------------------ */

  function fit() {
    var pad = 0;
    var scale = Math.min(
      (innerWidth - pad) / 1920,
      (innerHeight - pad) / 1080
    );
    stage.style.transform = 'scale(' + scale + ')';
  }

  /* ---- alvos de animação ---------------------------------------------- */

  function targets(s) {
    return {
      a: Array.prototype.slice.call(s.querySelectorAll('[data-a]')),
      cells: Array.prototype.slice.call(s.querySelectorAll('[data-cell]')),
      paths: Array.prototype.slice.call(s.querySelectorAll('[data-p]')),
      bars: Array.prototype.slice.call(s.querySelectorAll('[data-bar]')),
      rules: Array.prototype.slice.call(s.querySelectorAll('[data-rule]')),
      nums: Array.prototype.slice.call(s.querySelectorAll('[data-count]')),
      arcs: Array.prototype.slice.call(s.querySelectorAll('[data-arc]'))
    };
  }

  function fmt(v, mode) {
    return mode === 'br' ? Math.round(v).toLocaleString('pt-BR') : String(Math.round(v));
  }

  function final(e) {
    var target = parseFloat(e.dataset.count);
    if (!isNaN(target)) e.textContent = fmt(target, e.dataset.format);
  }

  function count(e, dur) {
    if (e.dataset.done === '1') return;
    var target = parseFloat(e.dataset.count), mode = e.dataset.format;
    if (isNaN(target)) return;
    if (!animOn() || !dur) { final(e); e.dataset.done = '1'; return; }
    e.dataset.done = '1';
    var t0 = performance.now();
    function tick(t) {
      var p = Math.min(1, (t - t0) / dur), q = 1 - Math.pow(1 - p, 3);
      if (p >= 1) { final(e); return; }
      e.textContent = fmt(target * q, mode);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // rAF é congelado em aba de fundo e na impressão: crava o valor no timer.
    setTimeout(function () { final(e); }, dur + 150);
  }

  function commit(t) {
    t.nums.forEach(final);
    t.a.concat(t.cells).forEach(function (e) { e.style.opacity = '1'; e.style.transform = ''; });
    t.rules.forEach(function (e) { e.style.transform = 'none'; });
    t.bars.forEach(function (e) { e.style.width = e.dataset.w; });
    t.paths.forEach(function (p) { p.style.opacity = '1'; p.style.strokeDashoffset = '0'; });
    t.arcs.forEach(function (c) {
      var C = 2 * Math.PI * parseFloat(c.getAttribute('r'));
      c.style.strokeDashoffset = C * (1 - parseFloat(c.dataset.frac));
    });
  }

  function reset(s) {
    if (!animOn()) return;
    var t = targets(s);
    t.a.concat(t.cells).forEach(function (e) { e.style.opacity = '0'; });
    t.rules.forEach(function (e) { e.style.transform = 'scaleX(0)'; });
    t.bars.forEach(function (e) { e.style.width = '0'; });
    t.paths.forEach(function (p) {
      var L = p.getTotalLength ? p.getTotalLength() : 0;
      if (L) {
        p.style.strokeDasharray = p.getAttribute('stroke-dasharray') || (L + ' ' + L);
        p.style.strokeDashoffset = L;
      }
      p.style.opacity = '0';
    });
    t.arcs.forEach(function (c) {
      var C = 2 * Math.PI * parseFloat(c.getAttribute('r'));
      c.style.strokeDasharray = C;
      c.style.strokeDashoffset = C;
    });
    t.nums.forEach(function (n) { n.dataset.done = ''; n.textContent = '0'; });
    s.dataset.played = '';
  }

  function play(s) {
    if (!s || s.dataset.played === '1') return;
    s.dataset.played = '1';
    var t = targets(s);
    [].concat(t.a, t.cells, t.paths, t.bars, t.rules, t.arcs).forEach(function (e) {
      if (e.getAnimations) e.getAnimations().forEach(function (a) { a.cancel(); });
    });

    if (!animOn()) { commit(t); return; }

    var step = CASCADE ? 60 * k : 0;
    var base = t.a.length * step + 100 * k;
    var dashOf = new Map();
    t.paths.forEach(function (p) { dashOf.set(p, p.style.strokeDashoffset || 0); });

    // Estado final entra primeiro: um slide que ainda não renderizou nunca
    // pode ficar em branco por causa de uma animação que não rodou.
    commit(t);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var anims = [];
        t.rules.forEach(function (e) {
          anims.push(e.animate(
            [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
            { duration: 260 * k, delay: 120 * k, easing: EASE, fill: 'backwards' }));
        });
        t.a.forEach(function (e, n) {
          anims.push(e.animate(
            [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
            { duration: 300 * k, delay: n * step, easing: EASE, fill: 'backwards' }));
        });
        t.cells.forEach(function (e, n) {
          anims.push(e.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 180 * k, delay: base + n * (CASCADE ? 45 * k : 0), easing: EASE, fill: 'backwards' }));
        });
        t.paths.forEach(function (p, n) {
          anims.push(p.animate(
            [{ strokeDashoffset: dashOf.get(p) }, { strokeDashoffset: 0 }],
            { duration: 320 * k, delay: base + n * (CASCADE ? 26 * k : 0), easing: EASE, fill: 'backwards' }));
        });
        t.bars.forEach(function (b, n) {
          anims.push(b.animate(
            [{ width: '0%' }, { width: b.dataset.w }],
            { duration: 420 * k, delay: base + n * (CASCADE ? 70 * k : 0), easing: EASE, fill: 'backwards' }));
        });
        t.arcs.forEach(function (c) {
          var C = 2 * Math.PI * parseFloat(c.getAttribute('r'));
          anims.push(c.animate(
            [{ strokeDashoffset: C }, { strokeDashoffset: C * (1 - parseFloat(c.dataset.frac)) }],
            { duration: 700 * k, delay: base, easing: EASE, fill: 'backwards' }));
        });
        setTimeout(function () { t.nums.forEach(function (n) { count(n, 560 * k); }); }, base);
        var total = base + 900 * k + t.bars.length * 70 * k;
        setTimeout(function () {
          anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
          commit(t);
        }, total);
      });
    });
  }

  function finalAll() {
    slides.forEach(function (s) {
      s.querySelectorAll('[data-count]').forEach(final);
    });
  }

  /* ---- navegação ------------------------------------------------------ */

  function go(i, opts) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var prev = index;
    if (i === prev && slides[i].hasAttribute('data-active')) return;

    slides.forEach(function (s, n) {
      if (n === i) s.setAttribute('data-active', '');
      else s.removeAttribute('data-active');
    });
    index = i;

    if (prev !== i && slides[prev]) reset(slides[prev]);
    play(slides[i]);
    sync();
    if (!opts || opts.hash !== false) {
      var h = '#' + (i + 1);
      if (location.hash !== h) history.replaceState(null, '', h);
    }
  }

  function sync() {
    var s = slides[index];
    counter.textContent = (index + 1) + ' / ' + slides.length;
    labelEl.textContent = s.dataset.label || '';
    progress.style.width = ((index + 1) / slides.length * 100) + '%';
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    notesBody.textContent = s.dataset.speakerNotes || 'Sem notas para este slide.';
    Array.prototype.forEach.call(indexList.querySelectorAll('button'), function (b, n) {
      b.setAttribute('aria-current', n === index ? 'true' : 'false');
    });
  }

  function toggleNotes() {
    notes.hidden = !notes.hidden;
  }

  function toggleIndex(force) {
    indexPanel.hidden = force === undefined ? !indexPanel.hidden : !force;
  }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }

  /* ---- índice --------------------------------------------------------- */

  slides.forEach(function (s, n) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    var tag = document.createElement('span');
    tag.textContent = s.dataset.screenLabel || String(n + 1);
    b.appendChild(tag);
    b.appendChild(document.createTextNode(s.dataset.label || ('Slide ' + (n + 1))));
    b.addEventListener('click', function () { toggleIndex(false); go(n); });
    li.appendChild(b);
    indexList.appendChild(li);
  });

  /* ---- eventos -------------------------------------------------------- */

  prevBtn.addEventListener('click', function () { go(index - 1); });
  nextBtn.addEventListener('click', function () { go(index + 1); });
  document.querySelector('[data-toggle-notes]').addEventListener('click', toggleNotes);
  document.querySelector('[data-toggle-index]').addEventListener('click', function () { toggleIndex(); });
  document.querySelector('[data-fullscreen]').addEventListener('click', fullscreen);
  document.querySelector('[data-close-index]').addEventListener('click', function () { toggleIndex(false); });

  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': case 'Enter':
        e.preventDefault(); go(index + 1); break;
      case 'ArrowLeft': case 'PageUp': case 'Backspace':
        e.preventDefault(); go(index - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(slides.length - 1); break;
      case 'f': case 'F': fullscreen(); break;
      case 'n': case 'N': toggleNotes(); break;
      case 'g': case 'G': toggleIndex(); break;
      case 'Escape': toggleIndex(false); notes.hidden = true; break;
    }
  });

  // Swipe no toque, sem atrapalhar a rolagem do bloco de prompt.
  var tx = 0, ty = 0;
  addEventListener('touchstart', function (e) {
    tx = e.changedTouches[0].clientX;
    ty = e.changedTouches[0].clientY;
  }, { passive: true });
  addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  addEventListener('resize', fit);
  addEventListener('beforeprint', finalAll);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') finalAll();
  });

  // A barra de controles aparece ao mover o mouse e some sozinha.
  var uiTimer;
  addEventListener('mousemove', function () {
    document.body.dataset.ui = 'on';
    clearTimeout(uiTimer);
    uiTimer = setTimeout(function () { document.body.dataset.ui = 'off'; }, 2600);
  });

  /* ---- anexo: prompt copiável ----------------------------------------- */

  var promptEl = document.querySelector('[data-prompt]');
  var copyBtn = document.querySelector('[data-copy]');
  var copyLabel = document.querySelector('[data-copy-label]');
  var promptText = '';

  if (promptEl) {
    fetch('prompt.txt')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (t) { promptText = t; promptEl.textContent = t; })
      .catch(function () {
        promptEl.textContent = 'Não foi possível carregar prompt.txt.';
      });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var say = function (msg) {
        copyLabel.textContent = msg;
        setTimeout(function () { copyLabel.textContent = 'Copiar'; }, 2200);
      };
      if (!promptText) return say('Sem conteúdo');
      navigator.clipboard.writeText(promptText)
        .then(function () { say('Copiado'); })
        .catch(function () { say('Selecione e copie'); });
    });
  }

  /* ---- início --------------------------------------------------------- */

  fit();
  slides.forEach(function (s, i) { if (i !== 0) reset(s); });
  var fromHash = parseInt((location.hash || '').replace('#', ''), 10);
  go(isNaN(fromHash) ? 0 : fromHash - 1, { hash: false });
  addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (!isNaN(n)) go(n - 1, { hash: false });
  });
})();
