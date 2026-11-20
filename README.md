# thecollectingapp

A free app where you open packs and eggs, then keep and display what you pull.
**Everything is earned, never bought.**

This is **Phase 1: Prototype** from the concept doc's roadmap: one card set, packs and egg
hatching, a binder, rarity and pity. Its gate is **"opening feels fun"**.

## Run it

No build step and no dependencies. Serve the folder with any static server:

```bash
npm start
```

Then open http://localhost:8080. (`npm start` runs `python3 -m http.server 8080`; any static
server works.) To try it on your phone, open the same address over your local network, or
deploy the folder as-is to any static host (Netlify, GitHub Pages).

Run the rules tests (Node 20+):

```bash
npm test
```

## What's in the prototype

| Concept doc | In the prototype |
| --- | --- |
| Card packs: swipe to tear, cards one by one | Drag across the dotted line to tear (sound and vibration as it gives), then swipe or tap through the cards. The best card comes last. |
| Slow peel for rares | Rares and ultra rares come face down and glowing. Drag a corner and the back peels away, so you see the frame's corner first: gold means rare, rainbow means ultra. |
| Egg hatching (12 h) | One incubator. Tap the egg to crack it when it's ready. Eggs lean better than packs and prefer a card you're missing. |
| Rarity 70 / 22 / 7 / 1 % | Exactly these odds per card, with 5 cards per pack. |
| Pity counter, 40 packs | The 40th pack in a row with no ultra rare upgrades its lowest card to one. Progress is shown on the Odds screen. |
| Duplicates become currency | Duplicates turn into shards on the spot. In the binder, tap an empty pocket to craft exactly that card. |
| Sets of 20–40 with empty slots | 30 original creatures in five habitats, in a 9-pocket binder whose empty pockets show a silhouette. Finishing the set triggers a celebration. |
| Free packs on a timer, generous early | 2 free slots that refill every 12 h (every 6 h for the first 3 days), plus 4 starter packs. |
| Daily missions about collecting | Open 2 packs (earns an egg), find a new card, pull a rare or better. They reset at midnight. |
| Handle it: tilt, flip | Holo shimmer and glare follow the pointer or the phone's tilt. Tap a card to flip it. |
| Make it yours | The back of each card is stamped "Pulled by [you] · date" with your pull number. You can nickname any card. |
| Show the odds anyway | The Odds tab lists every rate, the pity status, egg odds and crafting costs. |
| Sound and haptics on every action | Synthesized Web Audio, with no sound files, plus `navigator.vibrate` (Android browsers; iOS Safari ignores it). |

**Playtest tools** (Settings → Playtest tools): skip the clock 1 h, 12 h or 1 day, add packs or
shards, see observed against target pull rates, and reset. These are there for tuning Phase 2.

## Tuning

Every number lives in [`js/config.js`](js/config.js): odds, pack size, pity, timers, egg odds,
shard values, craft costs and missions. Change them there and the Odds screen and tests follow.

## Code map

- `js/config.js`: all tunable numbers.
- `js/cards.js`: the 30 cards (name, rarity, habitat, flavor text, art recipe).
- `js/engine.js`: game rules with no DOM (packs, pity, eggs, crafting, timers, missions). Covered by `tests/engine.test.mjs`.
- `js/art.js`: draws each creature as SVG from its recipe.
- `js/cardview.js`: card front and back, and the tilt and shimmer.
- `js/feedback.js`: sounds and vibration.
- `js/store.js`: saves progress to `localStorage`.
- `js/ui/`: the pack ritual (`opening.js`), the egg (`egg.js`), the binder and crafting (`binder.js`), the odds, settings and celebration panels (`panels.js`).

## Placeholders and deliberate gaps

These are open questions in the concept doc. The prototype uses neutral stand-ins so none of
them is decided by accident:

- **App name**: "Collecting App". **Collection name**: "Set 01". Both are one-line changes in `config.js`.
- **Creature theme**: five habitats (Moss, Ember, Tide, Gale, Dusk). All 30 names, creatures and flavor texts are original.
- **Art**: simple vector placeholders generated in code, so there's no AI art and no outside art to own. Swapping in real art means replacing `renderArt` with image files.
- **Serial numbers** ("#0042 of 500") need a server that counts every pull across all players. The prototype shows *your* pull number instead.
- **Progress lives on one device** (`localStorage`). Clearing site data starts over. Accounts and sync come later.
- **Not in Phase 1** (per the roadmap): blind boxes, the shelf or room, trading, print-your-pulls, and later reveal types.
