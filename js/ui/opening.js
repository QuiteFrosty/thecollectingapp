// The pack ritual: swipe across the top to tear it open, then reveal the cards one by one.
// Rares and better come face down and are revealed with the slow peel, corner first.

import { CONFIG, RARITY_RANK } from '../config.js';
import { CARDS_BY_RARITY } from '../cards.js';
import { openPack, packsAvailable } from '../engine.js';
import { store, update } from '../store.js';
import { cardFace, cardBackGeneric, attachTilt } from '../cardview.js';
import { renderArt } from '../art.js';
import { fx, unlockAudio } from '../feedback.js';
import { $, $$, el, openOverlay, closeOverlay, burst, flash, wait, reducedMotion } from './common.js';

const isPeel = (card) => RARITY_RANK[card.rarity] >= RARITY_RANK[CONFIG.slowPeelFrom];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function packArt() {
  const featured = [...CARDS_BY_RARITY.rare, ...CARDS_BY_RARITY.ultra];
  return featured[Math.floor(Math.random() * featured.length)];
}

export function packMarkup(featuredCard, { interactive = false } = {}) {
  return `
  <div class="pack${interactive ? ' interactive' : ''}" ${interactive ? 'tabindex="0" role="button" aria-label="Sealed pack. Swipe across the top to tear it open, or press Enter."' : ''}>
    <div class="pack-body">
      <div class="pack-art">${renderArt(featuredCard, { full: true })}</div>
      <div class="pack-label">
        <div class="pack-set">${CONFIG.setName}</div>
        <div class="pack-sub">${CONFIG.packSize} cards</div>
      </div>
      <div class="pack-crimp bottom"></div>
      <div class="pack-foil"></div>
    </div>
    <div class="pack-top"><div class="pack-crimp"></div><div class="pack-foil"></div></div>
    ${interactive ? '<div class="tear-guide"><div class="tear-progress"></div></div>' : ''}
  </div>`;
}

export function startPackOpening({ onClose } = {}) {
  unlockAudio();
  if (packsAvailable(store.state) === 0) return;

  // Roll the pack before any animation and save it, so closing mid-reveal can't re-roll it.
  const result = update((s, now) => openPack(s, now));

  const root = openOverlay('opening');
  root.innerHTML = `
    <div class="opening-top">
      <span class="opening-title">${CONFIG.setName}</span>
      <button class="icon-btn ghost close-btn" aria-label="Close">✕</button>
    </div>
    <div class="stage"></div>
    <div class="opening-hint" aria-live="polite"></div>`;
  const stage = $('.stage', root);
  const hint = $('.opening-hint', root);
  const setHint = (text) => { hint.textContent = text; };

  let finished = false;
  const close = () => {
    if (finished) return;
    finished = true;
    closeOverlay(root);
    onClose?.(result);
  };
  // Closing early still keeps every card: the pack was already added to the collection.
  $('.close-btn', root).addEventListener('click', close);

  tearPhase();

  // ---------- 1. tear ----------
  function tearPhase() {
    stage.innerHTML = `<div class="pack-wrap">${packMarkup(packArt(), { interactive: true })}</div>`;
    setHint('Swipe across the top to tear it open');
    const pack = $('.pack', stage);
    const top = $('.pack-top', stage);
    const bar = $('.tear-progress', stage);
    const detachTilt = attachTilt($('.pack-wrap', stage), { max: 8 });

    let lo = null, hi = null; // torn span across the top, 0..1
    let tearing = false;
    let progress = 0;
    let lastTick = 0;
    let done = false;

    const setProgress = (p) => {
      progress = p;
      bar.style.transform = `scaleX(${p})`;
      top.style.transform = `translateY(${-p * 5}px) rotate(${-p * 4}deg)`;
      pack.classList.toggle('tearing', p > 0);
    };

    const finishTear = async () => {
      if (done) return;
      done = true;
      setProgress(1);
      fx.rip();
      pack.classList.add('torn');
      setHint('');
      await wait(380);
      detachTilt();
      pack.classList.add('drop');
      fx.slide();
      await wait(420);
      revealPhase();
    };

    pack.addEventListener('pointerdown', (e) => {
      if (done) return;
      const r = pack.getBoundingClientRect();
      const yRel = (e.clientY - r.top) / r.height;
      if (yRel > 0.38) {
        pack.classList.remove('nudge');
        void pack.offsetWidth;
        pack.classList.add('nudge');
        setHint('Tear along the dotted line at the top');
        fx.tap();
        return;
      }
      tearing = true;
      pack.setPointerCapture(e.pointerId);
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      if (lo === null) lo = hi = x;
    });

    pack.addEventListener('pointermove', (e) => {
      if (!tearing || done) return;
      const r = pack.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
      const p = clamp((hi - lo) / 0.82, 0, 1);
      if (p > progress) {
        setProgress(p);
        if (p - lastTick > 0.07) {
          lastTick = p;
          fx.tearTick(p);
        }
      }
      if (p >= 1) finishTear();
    });

    const endDrag = () => { tearing = false; };
    pack.addEventListener('pointerup', endDrag);
    pack.addEventListener('pointercancel', endDrag);

    // Keyboard and switch users: tear it in one go.
    const autoTear = async () => {
      if (done) return;
      for (let p = progress; p < 1; p += 0.12) {
        setProgress(p);
        fx.tearTick(p);
        await wait(45);
      }
      finishTear();
    };
    pack.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        autoTear();
      }
    });
    pack.focus({ preventScroll: true });
  }

  // ---------- 2. reveal ----------
  function revealPhase() {
    const pulls = result.cards;
    stage.innerHTML = `<div class="stack">${pulls.map((r, i) => `
      <div class="reveal-card${isPeel(r.card) ? ' peelable charged' : ''}" data-i="${i}" style="z-index:${100 - i}">
        <div class="tilt">
          ${cardFace(r.card)}
          ${isPeel(r.card) ? `<div class="peel-back">${cardBackGeneric()}</div><div class="peel-flap-wrap"><div class="peel-flap"></div></div>` : ''}
        </div>
        <div class="reveal-badge"></div>
      </div>`).join('')}</div>`;
    const cardEls = $$('.reveal-card', stage);
    cardEls.forEach((c, i) => c.style.setProperty('--depth', i));
    requestAnimationFrame(() => stage.querySelector('.stack').classList.add('risen'));

    let index = 0;
    activate(0);

    function layout() {
      cardEls.forEach((c, i) => c.style.setProperty('--depth', Math.max(0, i - index)));
    }

    function activate(i) {
      index = i;
      layout();
      const c = cardEls[i];
      c.classList.add('active');
      const r = pulls[i];
      setHint(`${i + 1} of ${pulls.length}`);
      if (isPeel(r.card)) {
        fx.anticipation();
        setHint('Something special… drag a corner to peel it');
        setupPeel(c, () => revealed(i));
      } else {
        revealed(i);
      }
    }

    function revealed(i) {
      const c = cardEls[i];
      const r = pulls[i];
      c.classList.remove('charged');
      c.classList.add('revealed', `glow-${r.card.rarity}`);
      fx.reveal(r.card.rarity);
      const badge = $('.reveal-badge', c);
      if (r.isNew) badge.innerHTML = '<span class="badge badge-new">New</span>';
      else badge.innerHTML = `<span class="badge badge-dupe">Duplicate · +${r.shards} shards</span>`;
      if (r.card.rarity === 'ultra' && result.pityTriggered) {
        badge.innerHTML += '<span class="badge badge-pity">Pity counter: guaranteed ultra rare</span>';
      }
      if (!r.isNew) setTimeout(() => fx.shards(), 250);

      const rank = RARITY_RANK[r.card.rarity];
      if (rank >= 1) {
        const box = c.getBoundingClientRect();
        const host = root.getBoundingClientRect();
        burst(root, box.left - host.left + box.width / 2, box.top - host.top + box.height / 2, {
          rarity: r.card.rarity,
          count: [0, 14, 30, 60][rank],
          spread: [0, 0.7, 1, 1.5][rank],
        });
      }
      if (r.card.rarity === 'ultra') flash(root, '#fff7d6');

      const detachTilt = attachTilt($('.tilt', c), { max: 12 });
      const isLast = i === pulls.length - 1;
      setHint(isLast ? 'Swipe or tap to see everything you pulled' : 'Swipe or tap for the next card');
      enableDismiss(c, () => {
        detachTilt();
        if (isLast) summaryPhase();
        else activate(i + 1);
      });
    }

    function enableDismiss(c, next) {
      const readyAt = performance.now() + (reducedMotion() ? 0 : 350);
      let start = null;
      let dx = 0;
      let gone = false;
      const flyOff = (dir) => {
        if (gone) return;
        gone = true;
        fx.swipe();
        c.classList.add('gone');
        c.style.transform = `translate(${dir * 130}vw, -6vh) rotate(${dir * 28}deg)`;
        setTimeout(() => c.remove(), 420);
        next();
      };
      c.addEventListener('pointerdown', (e) => {
        if (gone) return;
        start = { x: e.clientX, y: e.clientY, t: performance.now() };
        dx = 0;
        c.setPointerCapture(e.pointerId);
        c.classList.add('dragging');
      });
      c.addEventListener('pointermove', (e) => {
        if (!start || gone) return;
        dx = e.clientX - start.x;
        c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      });
      const end = (e) => {
        if (!start || gone) return;
        c.classList.remove('dragging');
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        const fast = Math.abs(dx) / Math.max(1, performance.now() - start.t) > 0.6;
        start = null;
        if (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 25)) return flyOff(Math.sign(dx));
        c.style.transform = '';
        if (moved < 8 && performance.now() > readyAt) flyOff(-1);
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', () => { start = null; c.classList.remove('dragging'); c.style.transform = ''; });
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', 'Next card');
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          flyOff(e.key === 'ArrowRight' ? 1 : -1);
        }
      });
      c.focus({ preventScroll: true });
    }
  }

  // ---------- slow peel ----------
  // The face-down back is clipped away from one corner while a folded flap follows your finger.
  function setupPeel(c, onDone) {
    const back = $('.peel-back', c);
    const flap = $('.peel-flap', c);
    const tilt = $('.tilt', c);
    let W = 0, H = 0;
    const measure = () => { W = tilt.offsetWidth; H = tilt.offsetHeight; };
    measure();

    let corner = { x: 1, y: 1 }; // 1 = right/bottom
    let d = 0; // how far the fold has travelled from the corner, in px
    let dragging = false;
    let start = null;
    let startD = 0;
    let lastTick = 0;
    let done = false;
    let anim = 0;
    const threshold = () => (W + H) * 0.42;

    const map = ([x, y]) => [corner.x ? x : W - x, corner.y ? y : H - y];
    const poly = (pts, off = 0) => (pts.length ? `polygon(${pts.map(([x, y]) => `${(x + off * W).toFixed(1)}px ${(y + off * H).toFixed(1)}px`).join(',')})` : 'polygon(0 0)');

    // Clip the card rectangle against the half-plane x + y <= cut (keep) or >= cut (fold).
    function clip(cut, keep) {
      const pts = [[0, 0], [W, 0], [W, H], [0, H]];
      const inside = (p) => (keep ? p[0] + p[1] <= cut : p[0] + p[1] >= cut);
      const out = [];
      for (let i = 0; i < 4; i++) {
        const P = pts[i], Q = pts[(i + 1) % 4];
        const pin = inside(P), qin = inside(Q);
        if (pin) out.push(P);
        if (pin !== qin) {
          const t = (cut - (P[0] + P[1])) / ((Q[0] + Q[1]) - (P[0] + P[1]));
          out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
        }
      }
      return out;
    }

    function render() {
      const cut = W + H - d;
      back.style.clipPath = poly(clip(cut, true).map(map));
      // Reflect the peeled part across the fold line to get the flap.
      const folded = clip(cut, false).map(([x, y]) => [cut - y, cut - x]).map(map);
      flap.style.clipPath = poly(folded, 1);
      const angle = { '1,1': 315, '0,1': 45, '1,0': 225, '0,0': 135 }[`${corner.x},${corner.y}`];
      flap.style.setProperty('--flap-angle', `${angle}deg`);
    }

    function animateTo(target, ms, then) {
      cancelAnimationFrame(anim);
      const from = d;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        d = from + (target - from) * e;
        render();
        if (k < 1) anim = requestAnimationFrame(step);
        else then?.();
      };
      anim = requestAnimationFrame(step);
    }

    // Idle invitation: the corner lifts and settles.
    let idle = true;
    const idleLoop = (t) => {
      if (!idle) return;
      d = 16 + Math.sin(t / 380) * 6;
      render();
      anim = requestAnimationFrame(idleLoop);
    };
    if (reducedMotion()) { d = 18; render(); } else anim = requestAnimationFrame(idleLoop);

    const complete = () => {
      if (done) return;
      done = true;
      idle = false;
      dragging = false;
      animateTo((W + H) * 1.05, reducedMotion() ? 1 : 260, () => {
        back.remove();
        flap.parentElement.remove();
        onDone();
      });
    };

    c.addEventListener('pointerdown', (e) => {
      if (done) return;
      idle = false;
      cancelAnimationFrame(anim);
      measure();
      const r = tilt.getBoundingClientRect();
      if (d < 26) {
        corner = { x: e.clientX - r.left > r.width / 2 ? 1 : 0, y: e.clientY - r.top > r.height / 2 ? 1 : 0 };
      }
      dragging = true;
      start = { x: e.clientX, y: e.clientY };
      startD = d;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!dragging || done) return;
      let dx = e.clientX - start.x;
      let dy = e.clientY - start.y;
      if (!corner.x) dx = -dx;
      if (!corner.y) dy = -dy;
      d = clamp(startD + Math.max(0, -(dx + dy)) * 0.8, 0, W + H);
      render();
      if (d - lastTick > 12) {
        lastTick = d;
        fx.peelTick(clamp(d / threshold(), 0, 1));
      } else if (d < lastTick) {
        lastTick = d;
      }
      if (d >= threshold()) complete();
    });
    const release = (e) => {
      if (!dragging || done) return;
      dragging = false;
      const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 0;
      if (moved < 8) {
        // A tap: lift the corner a little further to show how it works.
        setHint('Drag the corner across the card to peel it');
        animateTo(Math.max(d, 60), 200, () => animateTo(18, 380));
      } else {
        animateTo(18, 300);
      }
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'Face-down card. Drag a corner to peel it, or press Enter.');
    c.addEventListener('keydown', (e) => {
      if (!done && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        complete();
      }
    });
    c.focus({ preventScroll: true });
  }

  // ---------- 3. summary ----------
  function summaryPhase() {
    const pulls = result.cards;
    const shards = pulls.reduce((n, r) => n + r.shards, 0);
    const newCount = pulls.filter((r) => r.isNew).length;
    const left = packsAvailable(store.state);
    setHint('');
    stage.innerHTML = `
      <div class="summary">
        <h2>${newCount ? `${newCount} new for your binder` : 'All duplicates this time'}</h2>
        <p class="muted">${shards ? `Duplicates became <strong>+${shards} shards</strong> for crafting.` : 'No duplicates. Every card was new.'}</p>
        <div class="summary-grid">
          ${pulls.map((r) => `<div class="summary-item">${cardFace(r.card)}${r.isNew ? '<span class="badge badge-new">New</span>' : `<span class="badge badge-dupe">+${r.shards}</span>`}</div>`).join('')}
        </div>
        <div class="summary-actions">
          ${left > 0 ? `<button class="btn primary again">Open another <span class="pill">${left}</span></button>` : ''}
          <button class="btn ${left > 0 ? '' : 'primary'} done">${result.completedSet ? 'Celebrate' : 'Done'}</button>
        </div>
      </div>`;
    const items = $$('.summary-item', stage);
    items.forEach((it, i) => { it.style.animationDelay = `${i * 70}ms`; });
    $('.done', stage).addEventListener('click', close);
    $('.again', stage)?.addEventListener('click', () => {
      finished = true;
      closeOverlay(root);
      onClose?.(result, { again: true });
    });
    $('.done', stage).focus({ preventScroll: true });
  }
}
