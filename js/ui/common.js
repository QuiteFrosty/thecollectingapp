// Small UI helpers shared by every screen.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 60) : ms));

export function html(strings, ...values) {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] ?? '' : ''), '');
}

export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

// ---------- full-screen overlays (pack opening, egg hatching) ----------

export function openOverlay(className) {
  const root = el(`<div class="overlay ${className}" role="dialog" aria-modal="true"></div>`);
  document.body.appendChild(root);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => root.classList.add('in'));
  return root;
}

export function closeOverlay(root) {
  root.classList.remove('in');
  root.classList.add('out');
  setTimeout(() => {
    root.remove();
    if (!document.querySelector('.overlay, .modal-backdrop')) document.body.classList.remove('no-scroll');
  }, reducedMotion() ? 0 : 260);
}

// ---------- modals ----------

export function openModal(inner, { className = '', onClose } = {}) {
  const prevFocus = document.activeElement;
  const backdrop = el(`<div class="modal-backdrop ${className}"><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`);
  const modal = backdrop.firstElementChild;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.classList.add('out');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      backdrop.remove();
      if (!document.querySelector('.overlay, .modal-backdrop')) document.body.classList.remove('no-scroll');
      prevFocus?.focus?.();
      onClose?.();
    }, reducedMotion() ? 0 : 200);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => {
    backdrop.classList.add('in');
    (modal.querySelector('[autofocus]') || modal.querySelector('button, [href], input, [tabindex]'))?.focus({ preventScroll: true });
  });
  return { modal, close };
}

// ---------- toasts ----------

export function toast(message, { icon = '', ms = 2200 } = {}) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = el('<div class="toasts" aria-live="polite"></div>');
    document.body.appendChild(host);
  }
  const t = el(`<div class="toast">${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${message}</span></div>`);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ---------- particles ----------

const RARITY_COLORS = {
  common: ['#ffffff', '#d9d4ff'],
  uncommon: ['#e6edf5', '#9fb2c8', '#ffffff'],
  rare: ['#ffe27a', '#ffc83d', '#fff6cf', '#ffffff'],
  ultra: ['#ff7ad9', '#7ad7ff', '#ffe27a', '#9dff9d', '#c69bff', '#ffffff'],
};

export function burst(host, x, y, { rarity = 'rare', count = 26, spread = 1, shapes = ['dot', 'star'] } = {}) {
  if (reducedMotion()) return;
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.rare;
  const layer = el('<div class="particles" aria-hidden="true"></div>');
  host.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = (60 + Math.random() * 140) * spread;
    const shape = shapes[i % shapes.length];
    const p = el(`<i class="p p-${shape}"></i>`);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * dist - 40}px`);
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--s', `${4 + Math.random() * 8}px`);
    p.style.setProperty('--d', `${600 + Math.random() * 700}ms`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    layer.appendChild(p);
  }
  setTimeout(() => layer.remove(), 1600);
}

export function confetti(host, { count = 90 } = {}) {
  if (reducedMotion()) return;
  const colors = RARITY_COLORS.ultra;
  const layer = el('<div class="particles confetti" aria-hidden="true"></div>');
  host.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const p = el('<i class="p p-confetti"></i>');
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--d', `${1600 + Math.random() * 1800}ms`);
    p.style.setProperty('--delay', `${Math.random() * 600}ms`);
    p.style.setProperty('--sx', `${Math.random() * 120 - 60}px`);
    p.style.setProperty('--r', `${Math.random() * 1080}deg`);
    layer.appendChild(p);
  }
  setTimeout(() => layer.remove(), 4200);
}

export function flash(host, color = '#ffffff') {
  if (reducedMotion()) return;
  const f = el(`<div class="flash" style="--c:${color}"></div>`);
  host.appendChild(f);
  setTimeout(() => f.remove(), 700);
}

// ---------- time formatting ----------

export function fmtDuration(ms) {
  if (ms <= 0) return 'now';
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}
