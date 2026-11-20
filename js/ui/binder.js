// The binder: pages of nine pockets, empty slots that fill in, and a close look at each card.

import { CONFIG, RARITY_LABEL } from '../config.js';
import { CARDS, CARD_BY_ID, HABITATS } from '../cards.js';
import { ownedCount, craftCost, canCraft, craftCard } from '../engine.js';
import { store, update } from '../store.js';
import { cardFace, cardBackOwned, attachTilt, requestGyro, esc, cardNumber } from '../cardview.js';
import { renderArt } from '../art.js';
import { fx } from '../feedback.js';
import { $, $$, openModal, toast, burst, reducedMotion } from './common.js';

const PER_PAGE = 9;
const PAGES = Math.ceil(CARDS.length / PER_PAGE);
let page = 0;

export function renderBinder(container, { onSetComplete } = {}) {
  const s = store.state;
  const owned = ownedCount(s);
  const pct = Math.round((owned / CARDS.length) * 100);
  container.innerHTML = `
    <section class="binder">
      <header class="binder-head">
        <div>
          <h1>${esc(CONFIG.setName)}</h1>
          <p class="muted">${owned} of ${CARDS.length} collected${s.setCompletedAt ? ' · <span class="gold">Set complete</span>' : ''}</p>
        </div>
        <div class="shards-chip" title="Shards from duplicates. Spend them to craft cards you're missing."><span class="shard-icon">✧</span>${s.shards}</div>
      </header>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="binder-book">
        <div class="binder-page" aria-live="polite"></div>
      </div>
      <nav class="binder-nav">
        <button class="icon-btn prev" aria-label="Previous page">‹</button>
        <div class="page-dots">${Array.from({ length: PAGES }, (_, i) => `<button class="dot" data-page="${i}" aria-label="Page ${i + 1}"></button>`).join('')}</div>
        <button class="icon-btn next" aria-label="Next page">›</button>
      </nav>
      <p class="muted small center">Tap an empty pocket to craft that card with shards.</p>
    </section>`;

  const pageEl = $('.binder-page', container);
  const draw = () => {
    const slice = CARDS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    pageEl.innerHTML = slice.map((card) => pocket(card)).join('');
    $$('.dot', container).forEach((d, i) => d.classList.toggle('on', i === page));
    $('.prev', container).disabled = page === 0;
    $('.next', container).disabled = page === PAGES - 1;
  };
  draw();

  const turn = (dir) => {
    const target = page + dir;
    if (target < 0 || target >= PAGES) return;
    fx.pageFlip();
    if (reducedMotion()) {
      page = target;
      draw();
      return;
    }
    pageEl.classList.remove('turn-in-next', 'turn-in-prev');
    pageEl.classList.add(dir > 0 ? 'turn-out-next' : 'turn-out-prev');
    setTimeout(() => {
      page = target;
      draw();
      pageEl.classList.remove('turn-out-next', 'turn-out-prev');
      pageEl.classList.add(dir > 0 ? 'turn-in-next' : 'turn-in-prev');
    }, 180);
  };

  $('.prev', container).addEventListener('click', () => turn(-1));
  $('.next', container).addEventListener('click', () => turn(1));
  $$('.dot', container).forEach((d) => d.addEventListener('click', () => turn(Number(d.dataset.page) - page)));

  // Swipe between pages.
  let sx = null, sy = null;
  pageEl.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  pageEl.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      pageEl.dataset.swiped = '1';
      turn(dx < 0 ? 1 : -1);
      setTimeout(() => delete pageEl.dataset.swiped, 50);
    }
  });

  pageEl.addEventListener('click', (e) => {
    if (pageEl.dataset.swiped) return;
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    const id = slot.dataset.slot;
    if (store.state.collection[id]) openCardDetail(id);
    else openCraft(id, { onSetComplete });
  });
}

function pocket(card) {
  const entry = store.state.collection[card.id];
  if (entry) {
    return `<button class="pocket owned" data-slot="${card.id}" aria-label="${esc(card.name)}, ${RARITY_LABEL[card.rarity]}">
      ${cardFace(card, { entry })}
      ${entry.count > 1 ? `<span class="count">×${entry.count}</span>` : ''}
    </button>`;
  }
  const affordable = canCraft(store.state, card.id);
  return `<button class="pocket empty${affordable ? ' craftable' : ''}" data-slot="${card.id}" aria-label="Empty pocket ${card.n}. Craft for ${craftCost(card.id)} shards.">
    <div class="silhouette">${renderArt(card, { bare: true })}</div>
    <span class="pocket-no">${String(card.n).padStart(3, '0')}</span>
    ${affordable ? '<span class="craft-tag">Craft</span>' : ''}
  </button>`;
}

// ---------- card detail ----------

export function openCardDetail(id) {
  const card = CARD_BY_ID[id];
  const entry = store.state.collection[id];
  requestGyro();
  const { modal, close } = openModal(`
    <div class="detail">
      <div class="detail-card" tabindex="0" role="button" aria-label="Flip card">
        <div class="tilt"><div class="flipper">
          <div class="face front">${cardFace(card, { entry })}</div>
          <div class="face back">${cardBackOwned(card, entry, store.state.player.name)}</div>
        </div></div>
      </div>
      <p class="muted small center">Tilt to catch the light · tap to flip</p>
      <label class="field">
        <span>Give it a name</span>
        <input class="nick" maxlength="20" placeholder="${esc(card.name)}" value="${esc(entry.nickname)}" autocomplete="off" />
      </label>
      <button class="btn" data-close>Close</button>
    </div>`, { className: 'detail-modal' });

  const tiltEl = $('.tilt', modal);
  const detach = attachTilt(tiltEl, { max: 16 });
  const flipper = $('.flipper', modal);
  const flip = () => {
    flipper.classList.toggle('flipped');
    fx.swipe();
  };
  const cardBtn = $('.detail-card', modal);
  cardBtn.addEventListener('click', flip);
  cardBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });

  const input = $('.nick', modal);
  input.addEventListener('change', () => {
    const name = input.value.trim().slice(0, 20);
    update((s) => { s.collection[id].nickname = name; });
    $('.face.front', modal).innerHTML = cardFace(card, { entry: store.state.collection[id] });
    if (name) toast(`Named ${esc(card.name)} “${esc(name)}”`);
  });
  modal.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === input) input.blur(); });
  const observer = new MutationObserver(() => { if (!modal.isConnected) { detach(); observer.disconnect(); } });
  observer.observe(document.body, { childList: true });
  return close;
}

// ---------- crafting ----------

function openCraft(id, { onSetComplete } = {}) {
  const card = CARD_BY_ID[id];
  const cost = craftCost(id);
  const have = store.state.shards;
  const ok = have >= cost;
  const { modal, close } = openModal(`
    <div class="craft">
      <div class="craft-art">${renderArt(card, { bare: true })}</div>
      <h2>No. ${cardNumber(card)}</h2>
      <p class="muted">${HABITATS[card.habitat].label} · ${RARITY_LABEL[card.rarity]}</p>
      <p>Craft this card for <strong>${cost} shards</strong>. You have <strong>${have}</strong>.</p>
      ${ok ? '' : `<p class="muted small">Duplicates turn into shards. ${cost - have} more to go.</p>`}
      <div class="row">
        <button class="btn" data-close>Not now</button>
        <button class="btn primary do-craft" ${ok ? '' : 'disabled'}>Craft</button>
      </div>
    </div>`, { className: 'craft-modal' });
  $('.do-craft', modal)?.addEventListener('click', () => {
    let res;
    try {
      res = update((s, t) => craftCard(s, id, t));
    } catch {
      fx.nope();
      return;
    }
    fx.reveal(card.rarity);
    const box = $('.craft-art', modal).getBoundingClientRect();
    burst(document.body, box.left + box.width / 2, box.top + box.height / 2, { rarity: card.rarity === 'common' ? 'uncommon' : card.rarity });
    close();
    toast(`Crafted ${esc(card.name)}`, { icon: '✧' });
    setTimeout(() => {
      openCardDetail(id);
      if (res.completedSet) onSetComplete?.();
    }, 260);
  });
}
