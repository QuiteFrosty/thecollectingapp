// The slow reveal: an egg incubates for 12 hours, then you tap it until it cracks open.

import { hatchEgg, eggReady } from '../engine.js';
import { store, update, now } from '../store.js';
import { cardFace, attachTilt } from '../cardview.js';
import { fx, unlockAudio } from '../feedback.js';
import { $, openOverlay, closeOverlay, burst, flash, wait } from './common.js';

// Cracks appear in stages as you tap.
const CRACKS = [
  'M62 70 l8 10 l-6 8 l9 9',
  'M70 80 l12 -4 l6 9 l11 -3',
  'M52 96 l10 -6 l7 8 l12 -10 l10 7 l9 -6',
  'M99 82 l8 12 l-4 10 M45 110 l14 -6',
];

export function eggSvg({ cracks = 0, glow = false, className = '' } = {}) {
  const paths = CRACKS.slice(0, cracks).map((d) => `<path d="${d}" />`).join('');
  return `
  <svg class="egg-svg ${className}" viewBox="0 0 150 180" aria-hidden="true">
    <defs>
      <radialGradient id="eggShade" cx="0.38" cy="0.3" r="0.85">
        <stop offset="0" stop-color="#fffdf6"/><stop offset="0.6" stop-color="#f3e7cf"/><stop offset="1" stop-color="#d7c39e"/>
      </radialGradient>
      <radialGradient id="eggGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
    </defs>
    ${glow ? '<circle class="egg-glow" cx="75" cy="98" r="74" fill="url(#eggGlow)"/>' : ''}
    <ellipse cx="75" cy="166" rx="40" ry="7" fill="#000" opacity="0.2"/>
    <g class="egg-shell">
      <path d="M75 14 C 116 14, 132 80, 132 108 C 132 142, 106 162, 75 162 C 44 162, 18 142, 18 108 C 18 80, 34 14, 75 14 Z" fill="url(#eggShade)" stroke="#b89c6c" stroke-width="2.5"/>
      <g fill="#6fc6c0" opacity="0.85">
        <ellipse cx="54" cy="58" rx="9" ry="7"/><ellipse cx="96" cy="70" rx="7" ry="6"/><ellipse cx="80" cy="40" rx="5" ry="4"/>
        <ellipse cx="42" cy="104" rx="6" ry="8"/><ellipse cx="108" cy="116" rx="9" ry="8"/><ellipse cx="72" cy="136" rx="8" ry="6"/>
      </g>
      <path d="M40 46 C 46 30, 58 22, 66 22" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
      <g class="egg-cracks" stroke="#5a4626" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
    </g>
  </svg>`;
}

export function startEggHatch({ onClose } = {}) {
  unlockAudio();
  if (!eggReady(store.state, now())) return;
  // Decide the result now and save it, so closing early can't re-roll it.
  const result = update((s, t) => hatchEgg(s, t));

  const root = openOverlay('hatching');
  root.innerHTML = `
    <div class="opening-top"><span class="opening-title">Egg</span><button class="icon-btn ghost close-btn" aria-label="Close">✕</button></div>
    <div class="stage"><button class="egg-button" aria-label="Egg. Tap to crack it open.">${eggSvg({ glow: true })}</button></div>
    <div class="opening-hint" aria-live="polite">It's moving! Tap to help it hatch</div>`;
  const stage = $('.stage', root);
  const hint = $('.opening-hint', root);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    closeOverlay(root);
    onClose?.(result);
  };
  $('.close-btn', root).addEventListener('click', close);

  const btn = $('.egg-button', stage);
  btn.focus({ preventScroll: true });
  let cracks = 0;
  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    cracks += 1;
    btn.classList.remove('wobble');
    void btn.offsetWidth;
    btn.classList.add('wobble');
    if (cracks <= CRACKS.length) {
      fx.crack(cracks);
      btn.innerHTML = eggSvg({ cracks, glow: true });
      hint.textContent = ['Keep going…', 'Almost…', 'One more!', 'Here it comes!'][cracks - 1];
      if (cracks < CRACKS.length) return;
    }
    busy = true;
    await wait(250);
    fx.hatch();
    btn.classList.add('burst');
    flash(root, '#fff3c4');
    await wait(320);
    reveal();
  });

  function reveal() {
    const r = result;
    stage.innerHTML = `
      <div class="hatched">
        <div class="hatched-card glow-${r.card.rarity}"><div class="tilt">${cardFace(r.card)}</div></div>
        <div class="reveal-badge">${r.isNew ? '<span class="badge badge-new">New</span>' : `<span class="badge badge-dupe">Duplicate · +${r.shards} shards</span>`}</div>
        <button class="btn primary done">Add to binder</button>
      </div>`;
    hint.textContent = `${r.card.name} hatched!`;
    fx.reveal(r.card.rarity);
    const box = $('.hatched-card', stage).getBoundingClientRect();
    const host = root.getBoundingClientRect();
    burst(root, box.left - host.left + box.width / 2, box.top - host.top + box.height / 2, { rarity: r.card.rarity === 'common' ? 'uncommon' : r.card.rarity, count: 36 });
    attachTilt($('.tilt', stage), { max: 12 });
    $('.done', stage).addEventListener('click', close);
    $('.done', stage).focus({ preventScroll: true });
  }
}
