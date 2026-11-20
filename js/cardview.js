// Card faces, card backs, and the tilt that makes the holo shimmer.
// Cards keep the real trading-card ratio (63 × 88 mm), ready for "print your pulls" later.

import { CONFIG, RARITY_LABEL, RARITY_SYMBOL } from './config.js';
import { CARDS, HABITATS } from './cards.js';
import { renderArt } from './art.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad3 = (n) => String(n).padStart(3, '0');

export function cardNumber(card) {
  return `${pad3(card.n)}/${pad3(CARDS.length)}`;
}

export function cardFace(card, { entry = null, extraClass = '' } = {}) {
  const full = card.rarity === 'ultra';
  const nickname = entry?.nickname ? `<div class="card-nick">“${esc(entry.nickname)}”</div>` : '';
  return `
  <div class="card card-front r-${card.rarity} h-${card.habitat} ${extraClass}" data-card="${card.id}">
    <div class="card-frame">
      <div class="card-art${full ? ' full' : ''}">${renderArt(card, { full })}<div class="card-holo"></div></div>
      <div class="card-head"><span class="card-name">${esc(card.name)}</span><span class="card-sym" title="${RARITY_LABEL[card.rarity]}">${RARITY_SYMBOL[card.rarity]}</span></div>
      ${nickname}
      <div class="card-text">
        <div class="card-type">${HABITATS[card.habitat].label} · ${RARITY_LABEL[card.rarity]}</div>
        <div class="card-flavor">${esc(card.flavor)}</div>
      </div>
      <div class="card-foot"><span>${cardNumber(card)}</span><span>${esc(CONFIG.setCode)}</span></div>
    </div>
    <div class="card-glare"></div>
  </div>`;
}

// The shared back every card has before it's revealed.
export function cardBackGeneric(extraClass = '') {
  return `<div class="card card-back-generic ${extraClass}"><div class="back-pattern"><div class="back-emblem"><span>✦</span></div></div><div class="card-glare"></div></div>`;
}

const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const SOURCE_LABEL = { pack: 'Pulled from a pack', egg: 'Hatched from an egg', crafted: 'Crafted from shards' };

// The back of a card you own: who pulled it and when.
export function cardBackOwned(card, entry, playerName) {
  const who = playerName?.trim() ? esc(playerName.trim()) : 'you';
  const verb = entry.source === 'egg' ? 'Hatched' : entry.source === 'crafted' ? 'Crafted' : 'Pulled';
  return `
  <div class="card card-back-owned r-${card.rarity}">
    <div class="back-pattern">
      <div class="stamp">
        <div class="stamp-ring">
          <div class="stamp-verb">${verb} by</div>
          <div class="stamp-who">${who}</div>
          <div class="stamp-date">${fmtDate(entry.firstAt)}</div>
        </div>
      </div>
      <dl class="back-facts">
        <div><dt>Card</dt><dd>${esc(card.name)} · ${cardNumber(card)}</dd></div>
        <div><dt>How</dt><dd>${SOURCE_LABEL[entry.source] || 'Collected'}</dd></div>
        ${entry.pullNo ? `<div><dt>Your pull</dt><dd>#${String(entry.pullNo).padStart(4, '0')}</dd></div>` : ''}
        <div><dt>Times found</dt><dd>${entry.count}</dd></div>
      </dl>
    </div>
    <div class="card-glare"></div>
  </div>`;
}

// ---------- tilt ----------
// Tilt with the pointer, or with the phone itself where motion sensors are allowed.

let gyroPermission = 'unknown';

export async function requestGyro() {
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function') {
    if (gyroPermission !== 'unknown') return gyroPermission === 'granted';
    try {
      gyroPermission = await DOE.requestPermission();
    } catch {
      gyroPermission = 'denied';
    }
    return gyroPermission === 'granted';
  }
  return true;
}

export function attachTilt(el, { max = 14, gyro = true } = {}) {
  let base = null;
  let raf = 0;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };

  const apply = () => {
    current.x += (target.x - current.x) * 0.18;
    current.y += (target.y - current.y) * 0.18;
    el.style.setProperty('--rx', `${(-current.y * max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(current.x * max).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(50 + current.x * 50).toFixed(1)}%`);
    el.style.setProperty('--my', `${(50 + current.y * 50).toFixed(1)}%`);
    el.style.setProperty('--tilt', Math.min(1, Math.hypot(current.x, current.y)).toFixed(3));
    if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) raf = requestAnimationFrame(apply);
    else raf = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };

  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    kick();
  };
  const onLeave = () => { target = { x: 0, y: 0 }; kick(); };
  const onOrient = (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { beta: e.beta, gamma: e.gamma };
    target.x = Math.max(-1, Math.min(1, (e.gamma - base.gamma) / 25));
    target.y = Math.max(-1, Math.min(1, (e.beta - base.beta) / 25));
    kick();
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  if (gyro) window.addEventListener('deviceorientation', onOrient);
  kick();
  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('deviceorientation', onOrient);
    cancelAnimationFrame(raf);
  };
}
