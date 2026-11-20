// The first card set: 30 original creatures in five habitats.
// The theme is a placeholder until "Theme for the first card set" is decided.
// The art is drawn from each card's `art` spec by js/art.js.

export const HABITATS = {
  moss:  { label: 'Moss',  sky: ['#dff3c9', '#9fd08a'], ground: '#6fae5c' },
  ember: { label: 'Ember', sky: ['#ffe2bf', '#f59a6a'], ground: '#b65a3c' },
  tide:  { label: 'Tide',  sky: ['#d4f1ff', '#6fb8e6'], ground: '#3f86b8' },
  gale:  { label: 'Gale',  sky: ['#f4f8ff', '#b8cdf2'], ground: '#93a9d6' },
  dusk:  { label: 'Dusk',  sky: ['#5b4a8f', '#211a3d'], ground: '#191431' },
};

// Palette keys: b body, l light/belly, a accent, g glow (optional).
const C = (n, id, name, habitat, rarity, art, flavor) => ({ n, id, name, habitat, rarity, art, flavor });

export const CARDS = [
  // Moss
  C(1, 'mossmop', 'Mossmop', 'moss', 'common',
    { kind: 'blob', b: '#7cbf5a', l: '#d7efb8', a: '#4e8a3a', top: 'tuft', marks: 'moss', eyes: 'sleepy' },
    'Rolls downhill on purpose. Picks up a new passenger every time.'),
  C(2, 'burrowbean', 'Burrowbean', 'moss', 'common',
    { kind: 'bun', b: '#b98a5e', l: '#f1dcc0', a: '#7cbf5a', top: 'sprout' },
    'Plants itself at night and wakes up an inch taller.'),
  C(3, 'fernwick', 'Fernwick', 'moss', 'common',
    { kind: 'sprite', b: '#a7d88a', l: '#eaf7dc', a: '#3f8a3a', top: 'leaf', extra: 'sparkles' },
    'Follows anyone humming. Stops if you hum off key.'),
  C(4, 'thistlepup', 'Thistlepup', 'moss', 'uncommon',
    { kind: 'quad', b: '#9a7fc4', l: '#e8def6', a: '#6fae5c', top: 'ears-pointy', tail: 'thistle', marks: 'collar' },
    'Prickly on the outside. Asks for belly rubs anyway.'),
  C(5, 'elderbloom', 'Elderbloom', 'moss', 'uncommon',
    { kind: 'quad', b: '#8fae7a', l: '#e3ecd6', a: '#f2a7c3', top: 'none', back: 'shell-flower', tail: 'none', eyes: 'sleepy' },
    'Its shell blooms once a century. It is in no hurry.'),
  C(6, 'bramblehorn', 'Bramblehorn', 'moss', 'rare',
    { kind: 'quad', b: '#6b8f4e', l: '#d6e6c3', a: '#c0392b', top: 'antlers', tail: 'leafy', marks: 'stripes', extra: 'leaves' },
    'Berries grow on its antlers. Birds follow it for miles.'),

  // Ember
  C(7, 'cindermouse', 'Cindermouse', 'ember', 'common',
    { kind: 'quad', b: '#d98a5f', l: '#fbe1cf', a: '#ffb12b', top: 'ears-round', tail: 'flame-tip', size: 0.85 },
    'Warms its paws on its own tail. Never cold, often singed.'),
  C(8, 'sootkit', 'Sootkit', 'ember', 'common',
    { kind: 'quad', b: '#5f5a66', l: '#c9c3cf', a: '#ff8a3d', top: 'ears-pointy', tail: 'fluffy', marks: 'smudge', eyes: 'sleepy' },
    'Naps in chimneys. Leaves paw prints on everything.'),
  C(9, 'emberbun', 'Emberbun', 'ember', 'common',
    { kind: 'bun', b: '#f0a35e', l: '#ffe8cc', a: '#ff5a36', top: 'ears-flame' },
    'Its ears flicker brighter when it is happy to see you.'),
  C(10, 'wickfox', 'Wickfox', 'ember', 'uncommon',
    { kind: 'quad', b: '#e26a3c', l: '#ffe3cf', a: '#ffcf3d', top: 'ears-pointy', tail: 'flame', extra: 'embers' },
    'Lights the way home for lost travelers, then demands a snack.'),
  C(11, 'kilnback', 'Kilnback', 'ember', 'uncommon',
    { kind: 'quad', b: '#a65a45', l: '#efc9b6', a: '#ffb12b', top: 'none', back: 'shell-kiln', tail: 'thin', size: 1.05 },
    'Bakers keep one by the oven. It keeps the bread and the baker warm.'),
  C(12, 'ashwyrm', 'Ashwyrm', 'ember', 'rare',
    { kind: 'serpent', b: '#3d3540', l: '#8f8494', a: '#ff6a2b', top: 'horns', marks: 'seams', extra: 'embers' },
    'Sleeps inside old volcanoes. Snores in smoke rings.'),

  // Tide
  C(13, 'puddlepuff', 'Puddlepuff', 'tide', 'common',
    { kind: 'blob', b: '#6cc4ef', l: '#e2f6ff', a: '#2f86c4', top: 'drop', extra: 'bubbles' },
    'Every puddle is home. Every big puddle is a party.'),
  C(14, 'bubblenewt', 'Bubblenewt', 'tide', 'common',
    { kind: 'quad', b: '#f59ab8', l: '#ffe4ee', a: '#e0567f', top: 'fins', tail: 'thin', marks: 'spots', size: 0.85, extra: 'bubbles' },
    'Blows a bubble for every thought. Thinks a lot.'),
  C(15, 'drizzlet', 'Drizzlet', 'tide', 'common',
    { kind: 'sprite', b: '#e9f2fb', l: '#ffffff', a: '#6fb8e6', top: 'cloud', extra: 'rain' },
    'A cloud too small to rain on more than one flower at a time.'),
  C(16, 'reefray', 'Reefray', 'tide', 'uncommon',
    { kind: 'ray', b: '#3aa6b9', l: '#c9f1f4', a: '#ffd166', marks: 'spots', extra: 'bubbles' },
    'Glides past the reef so smoothly the fish forget it is there.'),
  C(17, 'coralynx', 'Coralynx', 'tide', 'rare',
    { kind: 'quad', b: '#f2b880', l: '#fff0e0', a: '#ff6f91', top: 'ears-tufted', tail: 'coral', marks: 'spots', extra: 'bubbles' },
    'Its tail is a living reef. Tiny fish rent rooms in it.'),
  C(18, 'deepchoir', 'Deepchoir', 'tide', 'ultra',
    { kind: 'whale', b: '#3a56b8', l: '#a9c6ff', a: '#7ff0ff', g: '#7ff0ff', extra: 'bubbles', sky: ['#1f5a9e', '#06122e'] },
    'Sings once a year from the deepest trench. The whole ocean goes quiet to listen.'),

  // Gale
  C(19, 'puffwing', 'Puffwing', 'gale', 'common',
    { kind: 'bird', b: '#ffffff', l: '#fdf3d9', a: '#ffb347', top: 'tuft', wings: 'tuck' },
    'More fluff than bird. Floats when it should fly.'),
  C(20, 'dandelope', 'Dandelope', 'gale', 'common',
    { kind: 'quad', b: '#e8c37a', l: '#fff4d6', a: '#ffffff', top: 'puff', tail: 'thin', size: 0.9, extra: 'seeds' },
    'Make a wish and blow. It will grow a new mane by morning.'),
  C(21, 'hailhop', 'Hailhop', 'gale', 'common',
    { kind: 'bun', b: '#cfe6f7', l: '#ffffff', a: '#6fa8dc', top: 'ears-long', marks: 'crystal' },
    'Each hop leaves a tiny snowflake. It is very proud of them.'),
  C(22, 'kitewhisk', 'Kitewhisk', 'gale', 'uncommon',
    { kind: 'bird', b: '#ffd166', l: '#fff4d6', a: '#ef476f', top: 'none', wings: 'tuck', tail: 'ribbon' },
    'Rides the wind with no plan at all. Always lands somewhere nice.'),
  C(23, 'stormquill', 'Stormquill', 'gale', 'uncommon',
    { kind: 'bird', b: '#5c6f99', l: '#dde5f5', a: '#ffe14d', top: 'crest-bolt', wings: 'tuck', eyes: 'angry' },
    'Its feathers crackle before a storm. Farmers keep one on the fence.'),
  C(24, 'galeharrier', 'Galeharrier', 'gale', 'rare',
    { kind: 'bird', b: '#3f6fb5', l: '#e7f0ff', a: '#ffffff', top: 'crest', wings: 'spread', extra: 'wind' },
    'One wingbeat turns a breeze into a gale. It is careful with its wings indoors.'),

  // Dusk
  C(25, 'gloomwisp', 'Gloomwisp', 'dusk', 'common',
    { kind: 'wisp', b: '#7e6bd6', l: '#cfc6ff', a: '#b8a8ff', g: '#c6b8ff', eyes: 'glow' },
    'Shy in daylight. At dusk it follows you just to see where you go.'),
  C(26, 'lanternmoth', 'Lanternmoth', 'dusk', 'common',
    { kind: 'moth', b: '#6d5a8c', l: '#e9dcff', a: '#f7c86a', g: '#ffd36b' },
    'Carries its own light. Is still drawn to everyone else\'s.'),
  C(27, 'shadepaw', 'Shadepaw', 'dusk', 'uncommon',
    { kind: 'quad', b: '#3a3357', l: '#7d72a8', a: '#8ff7d6', g: '#8ff7d6', top: 'ears-pointy', tail: 'fluffy', eyes: 'glow' },
    'You only ever see its eyes. That is usually enough.'),
  C(28, 'moonmote', 'Moonmote', 'dusk', 'uncommon',
    { kind: 'sprite', b: '#f6f0c8', l: '#ffffff', a: '#c9b8ff', g: '#fff6b0', top: 'crescent', extra: 'stars' },
    'A crumb of moonlight that wandered off. Glows brighter when found.'),
  C(29, 'veilstag', 'Veilstag', 'dusk', 'rare',
    { kind: 'quad', b: '#4b3f7a', l: '#b9acef', a: '#9ef0ff', g: '#9ef0ff', top: 'antlers', tail: 'fluffy', marks: 'veil', eyes: 'glow', extra: 'stars' },
    'Its antlers catch starlight like a net. It lets the light go at dawn.'),
  C(30, 'umbraleth', 'Umbraleth', 'dusk', 'ultra',
    { kind: 'bird', b: '#2a2150', l: '#8e7fd6', a: '#ffd36b', g: '#ffd36b', top: 'crown', wings: 'spread', eyes: 'glow', extra: 'lantern' },
    'Keeper of the last lantern. When the night is longest, it lights the way back.'),
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const CARDS_BY_RARITY = CARDS.reduce((acc, c) => {
  (acc[c.rarity] ||= []).push(c);
  return acc;
}, {});
