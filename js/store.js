// Holds the one game state, saves it to this browser, and tells the UI when it changes.
// Progress lives in localStorage only, which is enough for a prototype; it can come
// back empty (private windows, cleared site data), and then the game simply starts fresh.

import { createState, upgradeState, tick } from './engine.js';

const KEY = 'collecting-app/save-v1';
const listeners = new Set();

export const store = { state: null };

export function now() {
  return Date.now() + (store.state?.dev?.timeOffset || 0);
}

export function load() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY));
  } catch {
    saved = null;
  }
  store.state = upgradeState(saved, Date.now());
  tick(store.state, now());
  save();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch {
    // Storage blocked or full: keep playing in memory.
  }
}

// Run a change against the state, save, and redraw.
export function update(fn) {
  const result = fn(store.state, now());
  save();
  emit();
  return result;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  for (const fn of listeners) fn(store.state);
}

export function resetAll() {
  store.state = createState(Date.now());
  save();
  emit();
}
