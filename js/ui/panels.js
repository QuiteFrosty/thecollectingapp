// Odds disclosure, settings with playtest tools, and the set-complete celebration.

import { CONFIG, RARITIES, RARITY_LABEL, RARITY_SYMBOL, MS } from '../config.js';
import { CARDS, CARDS_BY_RARITY } from '../cards.js';
import { packsUntilPity, tick } from '../engine.js';
import { store, update, resetAll, now } from '../store.js';
import { cardFace, esc } from '../cardview.js';
import { setFeedbackPrefs, fx } from '../feedback.js';
import { $, openModal, toast, confetti } from './common.js';

const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

export function openOdds() {
  const s = store.state;
  const fp = CONFIG.freePacks;
  openModal(`
    <div class="sheet">
      <h2>Odds and rules</h2>
      <p class="lede">Packs are never sold. Everything here is earned, and the odds are the same for everyone.</p>

      <h3>Each card in a pack</h3>
      <table class="odds">
        <thead><tr><th>Rarity</th><th>Chance</th><th>Cards in set</th></tr></thead>
        <tbody>${RARITIES.map((r) => `<tr><td><span class="sym r-${r}">${RARITY_SYMBOL[r]}</span> ${RARITY_LABEL[r]}</td><td>${pct(CONFIG.cardOdds[r])}</td><td>${CARDS_BY_RARITY[r].length}</td></tr>`).join('')}</tbody>
      </table>
      <p class="small muted">A pack has ${CONFIG.packSize} cards, each rolled on its own. Every card of a rarity is equally likely.</p>

      <h3>Pity counter</h3>
      <p>An ultra rare is guaranteed at least once every <strong>${CONFIG.pityPacks} packs</strong>. Bad luck has a ceiling; earlier pulls stay random.</p>
      <div class="pity">
        <div class="pity-bar"><div style="width:${(s.pity / CONFIG.pityPacks) * 100}%"></div></div>
        <span class="small">${s.pity} of ${CONFIG.pityPacks} · guaranteed within ${packsUntilPity(s)} pack${packsUntilPity(s) === 1 ? '' : 's'}</span>
      </div>

      <h3>Eggs</h3>
      <p>An egg hatches ${CONFIG.egg.hatchHours} hours after you get it. It leans better than a pack card${CONFIG.egg.preferMissing ? ', and gives you a card you don\'t have yet when it can' : ''}.</p>
      <table class="odds compact"><tbody><tr>${RARITIES.map((r) => `<td><span class="sym r-${r}">${RARITY_SYMBOL[r]}</span> ${pct(CONFIG.egg.odds[r])}</td>`).join('')}</tr></tbody></table>

      <h3>Duplicates and crafting</h3>
      <table class="odds">
        <thead><tr><th>Rarity</th><th>Duplicate gives</th><th>Craft costs</th></tr></thead>
        <tbody>${RARITIES.map((r) => `<tr><td>${RARITY_LABEL[r]}</td><td>${CONFIG.shards.dupeValue[r]} ✧</td><td>${CONFIG.shards.craftCost[r]} ✧</td></tr>`).join('')}</tbody>
      </table>

      <h3>Free packs</h3>
      <p>A free pack every ${fp.regenHours} hours, holding up to ${fp.maxStored}. For your first ${fp.earlyDays} days they come every ${fp.earlyRegenHours} hours, and new players start with ${fp.starterPacks} bonus packs.</p>
      <button class="btn" data-close>Got it</button>
    </div>`, { className: 'sheet-modal' });
}

export function openSettings() {
  const s = store.state;
  const st = s.stats;
  const pulled = RARITIES.reduce((n, r) => n + st.packCardsByRarity[r], 0);
  const { modal } = openModal(`
    <div class="sheet">
      <h2>Settings</h2>
      <label class="field">
        <span>Your name, stamped on the back of every card</span>
        <input class="player-name" maxlength="24" placeholder="you" value="${esc(s.player.name)}" autocomplete="nickname" />
      </label>
      <label class="toggle"><input type="checkbox" class="opt-sound" ${s.settings.sound ? 'checked' : ''}/> <span>Sound</span></label>
      <label class="toggle"><input type="checkbox" class="opt-haptics" ${s.settings.haptics ? 'checked' : ''}/> <span>Vibration <span class="muted small">(Android)</span></span></label>

      <details class="playtest">
        <summary>Playtest tools</summary>
        <p class="small muted">For tuning odds and pacing. These skip the clock on this device only.</p>
        <div class="row wrap">
          <button class="btn small" data-skip="1">+1 hour</button>
          <button class="btn small" data-skip="12">+12 hours</button>
          <button class="btn small" data-skip="24">+1 day</button>
          <button class="btn small" data-packs="5">+5 packs</button>
          <button class="btn small" data-shards="500">+500 shards</button>
        </div>
        <h3>Your numbers</h3>
        <table class="odds">
          <tbody>
            <tr><td>Packs opened</td><td>${st.packsOpened}</td></tr>
            <tr><td>Eggs hatched</td><td>${st.eggsHatched}</td></tr>
            <tr><td>Cards crafted</td><td>${st.crafted}</td></tr>
            <tr><td>Shards earned</td><td>${st.shardsEarned}</td></tr>
            <tr><td>Pity saves</td><td>${st.pityTriggers}</td></tr>
            <tr><td>Collected</td><td>${Object.keys(s.collection).length} / ${CARDS.length}</td></tr>
          </tbody>
        </table>
        <table class="odds">
          <thead><tr><th>Pack cards</th><th>Pulled</th><th>Seen</th><th>Target</th></tr></thead>
          <tbody>${RARITIES.map((r) => `<tr><td>${RARITY_LABEL[r]}</td><td>${st.packCardsByRarity[r]}</td><td>${pulled ? pct(st.packCardsByRarity[r] / pulled) : '–'}</td><td>${pct(CONFIG.cardOdds[r])}</td></tr>`).join('')}</tbody>
        </table>
        <button class="btn danger reset">Reset all progress</button>
      </details>
      <button class="btn" data-close>Done</button>
    </div>`, { className: 'sheet-modal' });

  const nameInput = $('.player-name', modal);
  nameInput.addEventListener('change', () => update((st2) => { st2.player.name = nameInput.value.trim().slice(0, 24); }));
  const prefs = () => {
    update((st2) => {
      st2.settings.sound = $('.opt-sound', modal).checked;
      st2.settings.haptics = $('.opt-haptics', modal).checked;
    });
    setFeedbackPrefs(store.state.settings);
    fx.tap();
  };
  $('.opt-sound', modal).addEventListener('change', prefs);
  $('.opt-haptics', modal).addEventListener('change', prefs);

  modal.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.skip) {
      update((st2) => { st2.dev.timeOffset += Number(b.dataset.skip) * MS.HOUR; tick(st2, now()); });
      toast(`Skipped ${b.textContent.replace('+', '')}`);
    } else if (b.dataset.packs) {
      update((st2) => { st2.packs.bonus += Number(b.dataset.packs); });
      toast(`Added ${b.dataset.packs} packs`);
    } else if (b.dataset.shards) {
      update((st2) => { st2.shards += Number(b.dataset.shards); });
      toast(`Added ${b.dataset.shards} shards`);
    } else if (b.classList.contains('reset')) {
      if (confirm('Reset all progress on this device? Your collection will be gone.')) {
        resetAll();
        setFeedbackPrefs(store.state.settings);
        toast('Progress reset. Fresh start!');
        modal.querySelector('[data-close]').click();
      }
    }
  });
}

export function celebrateSetComplete() {
  const showcase = [...CARDS_BY_RARITY.ultra, ...CARDS_BY_RARITY.rare].slice(0, 3);
  const { modal } = openModal(`
    <div class="celebrate">
      <div class="celebrate-fan">${showcase.map((c, i) => `<div class="fan-card" style="--i:${i - 1}">${cardFace(c)}</div>`).join('')}</div>
      <h2>Set complete!</h2>
      <p>You collected all ${CARDS.length} cards in ${esc(CONFIG.setName)}. That's the whole binder, every pocket filled.</p>
      <p class="muted small">Duplicates still turn into shards. New sets are on the roadmap.</p>
      <button class="btn primary" data-close>Admire the binder</button>
    </div>`, { className: 'celebrate-modal' });
  fx.fanfare();
  confetti(modal.parentElement);
}
