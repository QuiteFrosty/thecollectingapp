import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG, RARITIES, MS } from '../js/config.js';
import { CARDS, CARDS_BY_RARITY } from '../js/cards.js';
import {
  createState, upgradeState, mulberry32, rollRarity, tick, openPack, packsAvailable, nextFreePackAt,
  addPulledCard, hatchEgg, eggReady, craftCard, canCraft, craftCost, claimMission, missionList,
  missionReward, isSetComplete, ownedCount, dayKey,
} from '../js/engine.js';

const T0 = new Date(2026, 10, 20, 9, 0, 0).getTime(); // a local-time morning

test('the set has 30 unique cards with every rarity present', () => {
  assert.equal(CARDS.length, 30);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 30);
  assert.deepEqual(CARDS.map((c) => c.n), Array.from({ length: 30 }, (_, i) => i + 1));
  for (const r of RARITIES) assert.ok(CARDS_BY_RARITY[r]?.length > 0, `no ${r} cards`);
});

test('odds tables sum to 1', () => {
  const sum = (o) => RARITIES.reduce((s, r) => s + o[r], 0);
  assert.ok(Math.abs(sum(CONFIG.cardOdds) - 1) < 1e-9);
  assert.ok(Math.abs(sum(CONFIG.egg.odds) - 1) < 1e-9);
});

test('rollRarity matches the published odds', () => {
  const rng = mulberry32(42);
  const n = 200_000;
  const counts = { common: 0, uncommon: 0, rare: 0, ultra: 0 };
  for (let i = 0; i < n; i++) counts[rollRarity(CONFIG.cardOdds, rng)]++;
  for (const r of RARITIES) {
    const observed = counts[r] / n;
    assert.ok(Math.abs(observed - CONFIG.cardOdds[r]) < 0.005, `${r}: ${observed}`);
  }
});

test('a pack holds packSize cards, sorted so the best is revealed last', () => {
  const s = createState(T0);
  const { cards } = openPack(s, T0, mulberry32(7));
  assert.equal(cards.length, CONFIG.packSize);
  const ranks = cards.map((c) => RARITIES.indexOf(c.card.rarity));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(s.stats.packsOpened, 1);
});

test('pity guarantees an ultra rare in the 40th pack without one, then resets', () => {
  const s = createState(T0);
  s.packs.bonus = 1000;
  const alwaysCommon = () => 0; // first bucket every time
  for (let i = 1; i < CONFIG.pityPacks; i++) {
    const { cards, pityTriggered } = openPack(s, T0, alwaysCommon);
    assert.ok(!pityTriggered);
    assert.ok(cards.every((c) => c.card.rarity === 'common'));
    assert.equal(s.pity, i);
  }
  const { cards, pityTriggered } = openPack(s, T0, alwaysCommon);
  assert.ok(pityTriggered);
  assert.equal(cards.filter((c) => c.card.rarity === 'ultra').length, 1);
  assert.equal(cards.at(-1).card.rarity, 'ultra');
  assert.equal(s.pity, 0);
});

test('a natural ultra rare resets pity', () => {
  const s = createState(T0);
  s.pity = 25;
  const alwaysUltra = () => 0.999999;
  openPack(s, T0, alwaysUltra);
  assert.equal(s.pity, 0);
});

test('duplicates turn into shards; new cards do not', () => {
  const s = createState(T0);
  const first = addPulledCard(s, 'wickfox', 'pack', T0);
  assert.ok(first.isNew);
  assert.equal(s.shards, 0);
  const dupe = addPulledCard(s, 'wickfox', 'pack', T0);
  assert.ok(!dupe.isNew);
  assert.equal(dupe.shards, CONFIG.shards.dupeValue.uncommon);
  assert.equal(s.shards, CONFIG.shards.dupeValue.uncommon);
  assert.equal(s.collection.wickfox.count, 2);
  assert.equal(s.collection.wickfox.pullNo, 1);
});

test('crafting buys exactly a missing card and refuses owned or unaffordable ones', () => {
  const s = createState(T0);
  assert.ok(!canCraft(s, 'mossmop'));
  assert.throws(() => craftCard(s, 'mossmop', T0), /Not enough/);
  s.shards = craftCost('mossmop') + 3;
  assert.ok(canCraft(s, 'mossmop'));
  const res = craftCard(s, 'mossmop', T0);
  assert.ok(res.isNew);
  assert.equal(s.shards, 3);
  assert.equal(s.collection.mossmop.source, 'crafted');
  assert.equal(s.collection.mossmop.pullNo, null);
  assert.throws(() => craftCard(s, 'mossmop', T0), /Already owned/);
});

test('free packs: start full plus starter bonus, refill faster early, cap at max', () => {
  const fp = CONFIG.freePacks;
  const s = createState(T0);
  assert.equal(packsAvailable(s), fp.maxStored + fp.starterPacks);
  assert.equal(nextFreePackAt(s), null);

  for (let i = 0; i < fp.maxStored + fp.starterPacks; i++) openPack(s, T0, mulberry32(i));
  assert.equal(packsAvailable(s), 0);
  assert.throws(() => openPack(s, T0, Math.random), /No packs/);

  // The first free pack used restarts the timer at T0.
  tick(s, T0 + fp.earlyRegenHours * MS.HOUR - 1);
  assert.equal(s.packs.stored, 0);
  tick(s, T0 + fp.earlyRegenHours * MS.HOUR);
  assert.equal(s.packs.stored, 1);
  tick(s, T0 + 10 * fp.earlyRegenHours * MS.HOUR);
  assert.equal(s.packs.stored, fp.maxStored);
});

test('free packs refill at the normal rate after the early days', () => {
  const fp = CONFIG.freePacks;
  const s = createState(T0);
  s.packs.bonus = 0;
  const later = T0 + (fp.earlyDays + 1) * MS.DAY;
  openPack(s, later, mulberry32(1));
  assert.equal(s.packs.stored, fp.maxStored - 1);
  assert.equal(nextFreePackAt(s), later + fp.regenHours * MS.HOUR);
  tick(s, later + fp.earlyRegenHours * MS.HOUR);
  assert.equal(s.packs.stored, fp.maxStored - 1);
  tick(s, later + fp.regenHours * MS.HOUR);
  assert.equal(s.packs.stored, fp.maxStored);
});

test('eggs hatch only when ready and prefer a card you are missing', () => {
  const s = createState(T0);
  assert.ok(!eggReady(s, T0));
  assert.throws(() => hatchEgg(s, T0, Math.random), /not ready/);
  // Own every common but one; an egg that rolls common must give the missing one.
  const commons = CARDS_BY_RARITY.common;
  for (const c of commons.slice(1)) addPulledCard(s, c.id, 'pack', T0);
  const ready = s.egg.hatchesAt;
  assert.ok(eggReady(s, ready));
  const res = hatchEgg(s, ready, () => 0); // rolls common, picks first missing
  assert.equal(res.card.id, commons[0].id);
  assert.ok(res.isNew);
  assert.equal(s.egg, null);
  assert.equal(s.collection[commons[0].id].source, 'egg');
});

test('missions track progress, pay once, reward an egg when the incubator is empty, and reset daily', () => {
  const s = createState(T0);
  s.egg = null;
  const rng = mulberry32(3);
  openPack(s, T0, rng);
  openPack(s, T0, rng);
  const open2 = missionList(s).find((m) => m.id === 'open2');
  assert.ok(open2.done);
  assert.deepEqual(missionReward(s, open2), { egg: true, shards: 0 });
  claimMission(s, 'open2', T0);
  assert.ok(s.egg);
  assert.throws(() => claimMission(s, 'open2', T0), /Already claimed/);

  const tomorrow = T0 + MS.DAY;
  tick(s, tomorrow);
  assert.equal(s.missions.day, dayKey(tomorrow));
  assert.ok(!missionList(s).find((m) => m.id === 'open2').done);
});

test('with an egg already incubating, the egg mission pays shards instead', () => {
  const s = createState(T0);
  const m = CONFIG.missions.find((x) => x.id === 'open2');
  assert.deepEqual(missionReward(s, m), { egg: false, shards: m.reward.shards });
});

test('collecting all 30 marks the set complete exactly once', () => {
  const s = createState(T0);
  let completions = 0;
  for (const c of CARDS) if (addPulledCard(s, c.id, 'pack', T0).completedSet) completions++;
  assert.equal(completions, 1);
  assert.ok(isSetComplete(s));
  assert.equal(ownedCount(s), 30);
  assert.equal(s.setCompletedAt, T0);
});

test('upgradeState keeps progress and fills in missing fields', () => {
  const s = createState(T0);
  addPulledCard(s, 'ashwyrm', 'pack', T0);
  const saved = JSON.parse(JSON.stringify(s));
  delete saved.stats.crafted;
  saved.collection.not_a_card = { count: 1 };
  const up = upgradeState(saved, T0 + 1);
  assert.equal(up.collection.ashwyrm.count, 1);
  assert.equal(up.stats.crafted, 0);
  assert.ok(!up.collection.not_a_card);
  assert.equal(upgradeState(null, T0).version, s.version);
});

test('over many packs, observed pack odds stay near the published odds', () => {
  const s = createState(T0);
  s.packs.bonus = 1e6;
  const rng = mulberry32(99);
  for (let i = 0; i < 20_000; i++) openPack(s, T0, rng);
  const total = RARITIES.reduce((n, r) => n + s.stats.packCardsByRarity[r], 0);
  assert.equal(total, 20_000 * CONFIG.packSize);
  for (const r of RARITIES) {
    const observed = s.stats.packCardsByRarity[r] / total;
    // Pity nudges ultra up a hair; the rest stay within half a point.
    assert.ok(Math.abs(observed - CONFIG.cardOdds[r]) < 0.005, `${r}: ${observed}`);
  }
});
