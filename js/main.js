import { CONFIG } from './config.js';
import { CARDS } from './cards.js';
import {
  tick, packsAvailable, nextFreePackAt, eggReady, missionList, missionReward, claimMission, ownedCount,
} from './engine.js';
import { store, load, update, subscribe, now, save, emit } from './store.js';
import { esc } from './cardview.js';
import { fx, setFeedbackPrefs, unlockAudio } from './feedback.js';
import { startPackOpening, packMarkup, packArt } from './ui/opening.js';
import { startEggHatch, eggSvg } from './ui/egg.js';
import { renderBinder } from './ui/binder.js';
import { openOdds, openSettings, celebrateSetComplete } from './ui/panels.js';
import { $, $$, toast, fmtDuration } from './ui/common.js';

const view = document.getElementById('view');
const featured = packArt();

function route() {
  return location.hash === '#binder' ? 'binder' : 'home';
}

function render() {
  const r = route();
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.route === r));
  $$('.tab').forEach((t) => t.setAttribute('aria-current', t.dataset.route === r ? 'page' : 'false'));
  if (r === 'binder') renderBinder(view, { onSetComplete: celebrateSetComplete });
  else renderHome();
  updateTimers();
}

// ---------- home ----------

function renderHome() {
  const s = store.state;
  const avail = packsAvailable(s);
  const owned = ownedCount(s);
  const firstVisit = s.stats.packsOpened === 0 && owned === 0;
  const ready = eggReady(s, now());
  const missions = missionList(s);

  view.innerHTML = `
    <section class="home">
      <header class="topbar">
        <div class="brand">${esc(CONFIG.appName)}<span class="tag">prototype</span></div>
        <div class="shards-chip" title="Shards from duplicates. Spend them in the binder to craft cards you're missing."><span class="shard-icon">✧</span>${s.shards}</div>
      </header>

      ${firstVisit ? `<p class="welcome">Welcome! Your first packs are waiting. Nothing here is ever for sale: every pack is earned, never bought.</p>` : ''}

      <div class="hero">
        <button class="pack-showcase${avail ? '' : ' empty'}" aria-label="${avail ? 'Open a pack' : 'No packs right now'}">
          ${packMarkup(featured)}
          ${avail > 1 ? `<span class="stack-shadow"></span>` : ''}
        </button>
        <div class="hero-side">
          <button class="btn primary big open-pack" ${avail ? '' : 'disabled'}>
            ${avail ? 'Open a pack' : 'No packs right now'} ${avail ? `<span class="pill">${avail}</span>` : ''}
          </button>
          <p class="timer small muted" data-timer="pack"></p>
          ${s.packs.bonus ? `<p class="small muted">${s.packs.stored} free + ${s.packs.bonus} bonus</p>` : ''}
        </div>
      </div>

      <div class="panel egg-panel ${ready ? 'ready' : ''}">
        <button class="egg-slot" ${ready ? '' : 'disabled'} aria-label="${ready ? 'Hatch your egg' : 'Incubator'}">
          ${s.egg ? eggSvg({ glow: ready, className: ready ? 'jiggle' : '' }) : '<div class="incubator-empty">∅</div>'}
        </button>
        <div class="egg-info">
          <h2>Incubator</h2>
          ${s.egg
            ? (ready ? '<p><strong>It\'s hatching!</strong> Tap the egg.</p>' : '<p class="small muted">Something is growing inside.</p><div class="egg-progress"><div data-egg-bar></div></div><p class="small" data-timer="egg"></p>')
            : '<p class="small muted">Empty. Finish today\'s "Open 2 packs" mission to earn an egg.</p>'}
        </div>
      </div>

      <div class="panel missions">
        <h2>Today's missions</h2>
        <ul>
          ${missions.map((m) => {
            const rw = missionReward(s, m);
            const reward = rw.egg ? '🥚 Egg' : `✧ ${rw.shards}`;
            return `<li class="mission ${m.done ? 'done' : ''} ${m.claimed ? 'claimed' : ''}">
              <div class="mission-text">
                <span>${esc(m.label)}</span>
                <div class="mini-progress"><div style="width:${(m.progress / m.goal) * 100}%"></div></div>
              </div>
              ${m.claimed
                ? '<span class="claimed-mark" aria-label="Claimed">✓</span>'
                : `<button class="btn small ${m.done ? 'primary' : ''} claim" data-mission="${m.id}" ${m.done ? '' : 'disabled'}>${reward}</button>`}
            </li>`;
          }).join('')}
        </ul>
        <p class="small muted" data-timer="reset"></p>
      </div>

      <a class="panel set-link" href="#binder">
        <div>
          <h2>${esc(CONFIG.setName)}</h2>
          <p class="small muted">${owned} of ${CARDS.length} in your binder${s.setCompletedAt ? ' · <span class="gold">complete</span>' : ''}</p>
        </div>
        <div class="ring" style="--p:${owned / CARDS.length}"><span>${Math.round((owned / CARDS.length) * 100)}%</span></div>
      </a>
    </section>`;

  const open = () => {
    if (!packsAvailable(store.state)) {
      fx.nope();
      return;
    }
    openPackFlow();
  };
  $('.open-pack', view).addEventListener('click', open);
  $('.pack-showcase', view).addEventListener('click', open);
  $('.egg-slot', view)?.addEventListener('click', () => {
    if (!eggReady(store.state, now())) return;
    startEggHatch({ onClose: afterReveal });
  });
  $$('.claim', view).forEach((b) => b.addEventListener('click', () => {
    unlockAudio();
    try {
      const rw = update((st, t) => claimMission(st, b.dataset.mission, t));
      fx.claim();
      toast(rw.egg ? 'A new egg is in the incubator' : `+${rw.shards} shards`, { icon: rw.egg ? '🥚' : '✧' });
    } catch {
      fx.nope();
    }
  }));
}

function openPackFlow() {
  startPackOpening({
    onClose: (result, opts = {}) => {
      if (result?.completedSet) {
        setTimeout(celebrateSetComplete, 300);
        return;
      }
      if (opts.again && packsAvailable(store.state)) setTimeout(openPackFlow, 280);
    },
  });
}

function afterReveal(result) {
  if (result?.completedSet) setTimeout(celebrateSetComplete, 300);
}

// ---------- timers ----------

function updateTimers() {
  const s = store.state;
  const t = now();
  const packEl = $('[data-timer="pack"]', view);
  if (packEl) {
    const next = nextFreePackAt(s);
    packEl.textContent = next ? `Next free pack in ${fmtDuration(next - t)}` : `Free packs full (${CONFIG.freePacks.maxStored}/${CONFIG.freePacks.maxStored})`;
  }
  const eggEl = $('[data-timer="egg"]', view);
  if (eggEl && s.egg) {
    eggEl.textContent = `Hatches in ${fmtDuration(s.egg.hatchesAt - t)}`;
    const bar = $('[data-egg-bar]', view);
    if (bar) bar.style.width = `${Math.min(100, ((t - s.egg.startedAt) / (s.egg.hatchesAt - s.egg.startedAt)) * 100)}%`;
  }
  const resetEl = $('[data-timer="reset"]', view);
  if (resetEl) {
    const d = new Date(t);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    resetEl.textContent = `New missions in ${fmtDuration(midnight - t)}`;
  }
}

function signature(s) {
  return JSON.stringify([s.packs.stored, s.missions.day, eggReady(s, now())]);
}

setInterval(() => {
  const s = store.state;
  const before = signature(s);
  tick(s, now());
  if (signature(s) !== before) {
    save();
    emit();
  } else {
    updateTimers();
  }
}, 1000);

// Coming back to the tab after hours away: catch up right away.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    tick(store.state, now());
    save();
    emit();
  }
});

// ---------- boot ----------

load();
setFeedbackPrefs(store.state.settings);
subscribe(render);
window.addEventListener('hashchange', () => {
  fx.tap();
  render();
  window.scrollTo({ top: 0 });
});
$('.nav-odds').addEventListener('click', () => { unlockAudio(); openOdds(); });
$('.nav-settings').addEventListener('click', () => { unlockAudio(); openSettings(); });
document.addEventListener('pointerdown', unlockAudio, { once: true });
render();
