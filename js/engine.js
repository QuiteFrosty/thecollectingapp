// Game rules with no DOM access, so they can be unit tested with `node --test`.
// Every function takes `now` (ms) and, when it rolls dice, an `rng` returning [0, 1).

import { CONFIG, RARITIES, RARITY_RANK, MS } from './config.js';
import { CARDS, CARDS_BY_RARITY, CARD_BY_ID } from './cards.js';

export const STATE_VERSION = 1;

export function createState(now) {
  return {
    version: STATE_VERSION,
    createdAt: now,
    player: { name: '' },
    settings: { sound: true, haptics: true },
    packs: { stored: CONFIG.freePacks.maxStored, lastRegenAt: now, bonus: CONFIG.freePacks.starterPacks },
    shards: 0,
    pity: 0,
    collection: {},
    egg: newEgg(now),
    missions: { day: dayKey(now), progress: {}, claimed: {} },
    stats: {
      packsOpened: 0,
      totalPulls: 0,
      pulledByRarity: { common: 0, uncommon: 0, rare: 0, ultra: 0 },
      packCardsByRarity: { common: 0, uncommon: 0, rare: 0, ultra: 0 },
      eggsHatched: 0,
      crafted: 0,
      shardsEarned: 0,
      pityTriggers: 0,
    },
    setCompletedAt: null,
    dev: { timeOffset: 0 },
  };
}

// Fill in fields a saved game from an older build might be missing.
export function upgradeState(saved, now) {
  const fresh = createState(now);
  if (!saved || typeof saved !== 'object' || saved.version !== STATE_VERSION) return fresh;
  const merged = { ...fresh, ...saved };
  for (const key of ['player', 'settings', 'packs', 'missions', 'stats', 'dev']) {
    merged[key] = { ...fresh[key], ...(saved[key] || {}) };
  }
  merged.stats.pulledByRarity = { ...fresh.stats.pulledByRarity, ...(saved.stats?.pulledByRarity || {}) };
  merged.stats.packCardsByRarity = { ...fresh.stats.packCardsByRarity, ...(saved.stats?.packCardsByRarity || {}) };
  // Drop cards that no longer exist in the set.
  merged.collection = Object.fromEntries(
    Object.entries(saved.collection || {}).filter(([id]) => CARD_BY_ID[id]),
  );
  return merged;
}

// ---------- randomness ----------

// Small seeded generator for tests and reproducible playtests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollRarity(odds, rng) {
  const total = RARITIES.reduce((sum, r) => sum + (odds[r] || 0), 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= odds[r] || 0;
    if (roll < 0) return r;
  }
  return RARITIES[RARITIES.length - 1];
}

function pickFrom(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function pickCard(rarity, rng, { preferMissingFrom } = {}) {
  const pool = CARDS_BY_RARITY[rarity];
  if (preferMissingFrom) {
    const missing = pool.filter((c) => !preferMissingFrom[c.id]);
    if (missing.length) return pickFrom(missing, rng);
  }
  return pickFrom(pool, rng);
}

// ---------- time ----------

export function dayKey(now) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function regenPeriodMs(state, at) {
  const fp = CONFIG.freePacks;
  const early = at - state.createdAt < fp.earlyDays * MS.DAY;
  return (early ? fp.earlyRegenHours : fp.regenHours) * MS.HOUR;
}

// Bring timers and daily missions up to date. Safe to call as often as you like.
export function tick(state, now) {
  const p = state.packs;
  const max = CONFIG.freePacks.maxStored;
  while (p.stored < max) {
    const period = regenPeriodMs(state, p.lastRegenAt);
    if (now - p.lastRegenAt < period) break;
    p.lastRegenAt += period;
    p.stored += 1;
  }
  // The timer only runs while there's room for another free pack.
  if (p.stored >= max) p.lastRegenAt = now;

  const today = dayKey(now);
  if (state.missions.day !== today) state.missions = { day: today, progress: {}, claimed: {} };
}

export function packsAvailable(state) {
  return state.packs.stored + state.packs.bonus;
}

// When the next free pack arrives, or null while the free slots are full.
export function nextFreePackAt(state) {
  if (state.packs.stored >= CONFIG.freePacks.maxStored) return null;
  return state.packs.lastRegenAt + regenPeriodMs(state, state.packs.lastRegenAt);
}

// ---------- collection ----------

export function ownedCount(state) {
  return CARDS.filter((c) => state.collection[c.id]).length;
}

export function isSetComplete(state) {
  return ownedCount(state) === CARDS.length;
}

function bumpMission(state, event, amount = 1) {
  for (const m of CONFIG.missions) {
    if (m.event !== event) continue;
    state.missions.progress[m.id] = Math.min(m.goal, (state.missions.progress[m.id] || 0) + amount);
  }
}

function markSetComplete(state, now) {
  if (!state.setCompletedAt && isSetComplete(state)) {
    state.setCompletedAt = now;
    return true;
  }
  return false;
}

// Record one pulled card. Duplicates turn straight into shards so no pull is wasted.
export function addPulledCard(state, cardId, source, now) {
  const card = CARD_BY_ID[cardId];
  state.stats.totalPulls += 1;
  state.stats.pulledByRarity[card.rarity] += 1;
  if (RARITY_RANK[card.rarity] >= RARITY_RANK.rare) bumpMission(state, 'rarePull');

  const entry = state.collection[cardId];
  if (!entry) {
    state.collection[cardId] = { count: 1, firstAt: now, pullNo: state.stats.totalPulls, source, nickname: '' };
    bumpMission(state, 'newCard');
    return { card, isNew: true, shards: 0, completedSet: markSetComplete(state, now) };
  }
  entry.count += 1;
  const shards = CONFIG.shards.dupeValue[card.rarity];
  state.shards += shards;
  state.stats.shardsEarned += shards;
  return { card, isNew: false, shards, completedSet: false };
}

// ---------- packs ----------

export function openPack(state, now, rng = Math.random) {
  tick(state, now);
  if (state.packs.stored > 0) state.packs.stored -= 1;
  else if (state.packs.bonus > 0) state.packs.bonus -= 1;
  else throw new Error('No packs available');

  const pulls = [];
  for (let i = 0; i < CONFIG.packSize; i++) {
    const rarity = rollRarity(CONFIG.cardOdds, rng);
    pulls.push(pickCard(rarity, rng));
  }

  let pityTriggered = false;
  const hasUltra = () => pulls.some((c) => c.rarity === 'ultra');
  if (!hasUltra() && state.pity + 1 >= CONFIG.pityPacks) {
    // Upgrade the lowest card in the pack.
    let lowest = 0;
    pulls.forEach((c, i) => { if (RARITY_RANK[c.rarity] < RARITY_RANK[pulls[lowest].rarity]) lowest = i; });
    pulls[lowest] = pickCard('ultra', rng);
    pityTriggered = true;
    state.stats.pityTriggers += 1;
  }
  state.pity = hasUltra() ? 0 : state.pity + 1;

  // Reveal the best cards last.
  pulls.sort((x, y) => RARITY_RANK[x.rarity] - RARITY_RANK[y.rarity]);

  for (const c of pulls) state.stats.packCardsByRarity[c.rarity] += 1;
  const results = pulls.map((c) => addPulledCard(state, c.id, 'pack', now));
  state.stats.packsOpened += 1;
  bumpMission(state, 'packOpened');
  return { cards: results, pityTriggered, completedSet: results.some((r) => r.completedSet) };
}

export function packsUntilPity(state) {
  return CONFIG.pityPacks - state.pity;
}

// ---------- eggs ----------

export function newEgg(now) {
  return { startedAt: now, hatchesAt: now + CONFIG.egg.hatchHours * MS.HOUR };
}

export function eggReady(state, now) {
  return !!state.egg && now >= state.egg.hatchesAt;
}

export function hatchEgg(state, now, rng = Math.random) {
  if (!eggReady(state, now)) throw new Error('Egg is not ready');
  const rarity = rollRarity(CONFIG.egg.odds, rng);
  const card = pickCard(rarity, rng, { preferMissingFrom: CONFIG.egg.preferMissing ? state.collection : null });
  state.egg = null;
  state.stats.eggsHatched += 1;
  return addPulledCard(state, card.id, 'egg', now);
}

// ---------- crafting ----------

export function craftCost(cardId) {
  return CONFIG.shards.craftCost[CARD_BY_ID[cardId].rarity];
}

export function canCraft(state, cardId) {
  return !state.collection[cardId] && state.shards >= craftCost(cardId);
}

export function craftCard(state, cardId, now) {
  if (state.collection[cardId]) throw new Error('Already owned');
  const cost = craftCost(cardId);
  if (state.shards < cost) throw new Error('Not enough shards');
  state.shards -= cost;
  state.collection[cardId] = { count: 1, firstAt: now, pullNo: null, source: 'crafted', nickname: '' };
  state.stats.crafted += 1;
  bumpMission(state, 'newCard');
  return { card: CARD_BY_ID[cardId], isNew: true, shards: 0, completedSet: markSetComplete(state, now) };
}

// ---------- missions ----------

export function missionList(state) {
  return CONFIG.missions
    .filter((m) => !(m.event === 'newCard' && state.setCompletedAt && !state.missions.claimed[m.id]
      && !(state.missions.progress[m.id] >= m.goal)))
    .map((m) => {
      const progress = state.missions.progress[m.id] || 0;
      return { ...m, progress, done: progress >= m.goal, claimed: !!state.missions.claimed[m.id] };
    });
}

// Describe a mission's reward as it would be paid right now.
export function missionReward(state, mission) {
  if (mission.reward.egg && !state.egg) return { egg: true, shards: 0 };
  return { egg: false, shards: mission.reward.shards || 0 };
}

export function claimMission(state, missionId, now) {
  tick(state, now);
  const m = CONFIG.missions.find((x) => x.id === missionId);
  if (!m) throw new Error('Unknown mission');
  if (state.missions.claimed[m.id]) throw new Error('Already claimed');
  if ((state.missions.progress[m.id] || 0) < m.goal) throw new Error('Not finished');
  const reward = missionReward(state, m);
  if (reward.egg) state.egg = newEgg(now);
  state.shards += reward.shards;
  state.stats.shardsEarned += reward.shards;
  state.missions.claimed[m.id] = true;
  return reward;
}
