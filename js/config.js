// Every number here is a starting point to tune in playtesting (Phase 2).
// The concept doc's values are used where it gives one.

const HOUR = 60 * 60 * 1000;

export const CONFIG = {
  // Working titles: the app name and the first collection's name are still
  // open questions (see "Naming" in the concept doc).
  appName: 'Collecting App',
  setName: 'Set 01',
  setCode: 'S01',

  packSize: 5,

  // Odds per card, from the concept doc's rarity table.
  cardOdds: { common: 0.70, uncommon: 0.22, rare: 0.07, ultra: 0.01 },

  // An ultra rare is guaranteed in the 40th pack in a row that has none.
  pityPacks: 40,

  // Free packs on a timer. The doc points at two a day (Pocket's rate). Pacing
  // is "generous early, slower later": during the first days packs refill
  // twice as fast, and a new player starts with a few bonus packs.
  freePacks: {
    maxStored: 2,
    regenHours: 12,
    earlyRegenHours: 6,
    earlyDays: 3,
    starterPacks: 4,
  },

  egg: {
    hatchHours: 12,
    // Eggs are the slow reveal, so they lean better than a single pack card.
    odds: { common: 0.40, uncommon: 0.40, rare: 0.17, ultra: 0.03 },
    // When possible, an egg hatches a card you don't own yet (in the rarity it rolled).
    preferMissing: true,
  },

  // Duplicates become shards; shards craft the exact card you're missing.
  shards: {
    dupeValue: { common: 5, uncommon: 15, rare: 50, ultra: 200 },
    craftCost: { common: 40, uncommon: 120, rare: 400, ultra: 1500 },
  },

  // Rarities at or above this one come face down and are revealed with the slow peel.
  slowPeelFrom: 'rare',

  // Daily missions are about collecting, not chores. They reset at local midnight.
  missions: [
    { id: 'open2', label: 'Open 2 packs', goal: 2, event: 'packOpened', reward: { egg: true, shards: 30 } },
    { id: 'newcard', label: "Find a card you don't have yet", goal: 1, event: 'newCard', reward: { shards: 25 } },
    { id: 'rare', label: 'Pull a rare or better', goal: 1, event: 'rarePull', reward: { shards: 40 } },
  ],
};

export const RARITIES = ['common', 'uncommon', 'rare', 'ultra'];
export const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, ultra: 3 };
export const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', ultra: 'Ultra rare' };
export const RARITY_SYMBOL = { common: '●', uncommon: '◆', rare: '★', ultra: '✦' };
export const MS = { HOUR, DAY: 24 * HOUR };
