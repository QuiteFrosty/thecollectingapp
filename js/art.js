// Draws each creature as SVG from the `art` spec in cards.js.
// Placeholder art for the prototype: original shapes, no outside assets.
// The art window is a 240×180 scene; "full art" (ultra rares) widens it to fill the card.

import { HABITATS } from './cards.js';

let uidCounter = 0;

// ---------- color helpers ----------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}
const shade = (hex, t) => (t < 0 ? mix(hex, '#000000', -t) : mix(hex, '#ffffff', t));
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

// ---------- shared parts ----------

function makePalette(s) {
  const dark = luminance(s.b) < 0.28;
  return {
    b: s.b,
    l: s.l,
    a: s.a,
    g: s.g || s.a,
    s: shade(s.b, -0.22),
    hi: shade(s.b, 0.35),
    o: shade(s.b, dark ? 0.35 : -0.5), // outline
    ink: dark ? '#f6f0ff' : '#231d33',
  };
}

function outline(p, w = 2.6) {
  return `stroke="${p.o}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
}

function eye(x, y, r, style, p, uid, side) {
  if (style === 'sleepy') {
    return `<path d="M${r1(x - r)} ${r1(y - r * 0.15)} Q${r1(x)} ${r1(y + r * 0.85)} ${r1(x + r)} ${r1(y - r * 0.15)}" stroke="${p.ink}" stroke-width="${r1(r * 0.42)}" fill="none" stroke-linecap="round"/>`;
  }
  if (style === 'glow') {
    return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 0.85)}" ry="${r1(r * 1.1)}" fill="${p.g}" filter="url(#${uid}-glow)"/>`
      + `<ellipse cx="${r1(x - r * 0.15)}" cy="${r1(y - r * 0.2)}" rx="${r1(r * 0.38)}" ry="${r1(r * 0.55)}" fill="#ffffff" opacity="0.9"/>`;
  }
  let out = `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 0.82)}" ry="${r1(r)}" fill="${p.ink === '#231d33' ? '#231d33' : '#120e1f'}"/>`
    + `<circle cx="${r1(x - r * 0.28)}" cy="${r1(y - r * 0.36)}" r="${r1(r * 0.34)}" fill="#fff"/>`
    + `<circle cx="${r1(x + r * 0.26)}" cy="${r1(y + r * 0.34)}" r="${r1(r * 0.15)}" fill="#fff" opacity="0.8"/>`;
  if (style === 'angry') {
    out += `<path d="M${r1(x + side * r * 1.15)} ${r1(y - r * 1.75)} L${r1(x - side * r * 1.15)} ${r1(y - r * 1.05)}" stroke="${p.o}" stroke-width="${r1(r * 0.45)}" stroke-linecap="round"/>`;
  }
  return out;
}

function face(x, y, sc, s, p, uid, { mouth = true, cheeks = true } = {}) {
  const dx = 15 * sc, r = 7 * sc;
  const style = s.eyes || 'round';
  let out = eye(x - dx, y, r, style, p, uid, -1) + eye(x + dx, y, r, style, p, uid, 1);
  if (cheeks && style !== 'glow') {
    out += `<ellipse cx="${r1(x - dx - 7 * sc)}" cy="${r1(y + 10 * sc)}" rx="${r1(6 * sc)}" ry="${r1(3.5 * sc)}" fill="#ff7a9a" opacity="0.45"/>`
      + `<ellipse cx="${r1(x + dx + 7 * sc)}" cy="${r1(y + 10 * sc)}" rx="${r1(6 * sc)}" ry="${r1(3.5 * sc)}" fill="#ff7a9a" opacity="0.45"/>`;
  }
  if (mouth) out += smile(x, y + 9 * sc, sc, p);
  return out;
}

function smile(x, y, sc, p) {
  return `<path d="M${r1(x - 5 * sc)} ${r1(y)} q${r1(2.5 * sc)} ${r1(3.2 * sc)} ${r1(5 * sc)} 0 q${r1(2.5 * sc)} ${r1(3.2 * sc)} ${r1(5 * sc)} 0" stroke="${p.ink}" stroke-width="${r1(1.8 * sc)}" fill="none" stroke-linecap="round"/>`;
}

function leafShape(x, y, len, angle, fill, stroke) {
  return `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})" d="M0 0 C ${r1(len * 0.3)} ${r1(-len * 0.35)}, ${r1(len * 0.75)} ${r1(-len * 0.3)}, ${r1(len)} 0 C ${r1(len * 0.75)} ${r1(len * 0.3)}, ${r1(len * 0.3)} ${r1(len * 0.35)}, 0 0 Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`
    + `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})" d="M2 0 L${r1(len * 0.85)} 0" stroke="${stroke}" stroke-width="1.2" opacity="0.6"/>`;
}

function flameShape(x, y, h, uid, p, tilt = 0) {
  const w = h * 0.55;
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${tilt})">`
    + `<path d="M0 ${r1(-h)} C ${r1(w * 0.9)} ${r1(-h * 0.45)}, ${r1(w)} ${r1(-h * 0.05)}, 0 0 C ${r1(-w)} ${r1(-h * 0.05)}, ${r1(-w * 0.8)} ${r1(-h * 0.5)}, ${r1(-w * 0.15)} ${r1(-h * 0.62)} C ${r1(-w * 0.1)} ${r1(-h * 0.8)}, ${r1(w * 0.05)} ${r1(-h * 0.85)}, 0 ${r1(-h)} Z" fill="url(#${uid}-flame)" filter="url(#${uid}-glow)"/>`
    + `<path d="M0 ${r1(-h * 0.55)} C ${r1(w * 0.45)} ${r1(-h * 0.3)}, ${r1(w * 0.45)} ${r1(-h * 0.05)}, 0 ${r1(-h * 0.02)} C ${r1(-w * 0.45)} ${r1(-h * 0.05)}, ${r1(-w * 0.4)} ${r1(-h * 0.3)}, 0 ${r1(-h * 0.55)} Z" fill="#fff6c8" opacity="0.85"/>`
    + `</g>`;
}

function sparkle(x, y, r, fill, opacity = 1) {
  return `<path d="M${r1(x)} ${r1(y - r)} Q${r1(x + r * 0.18)} ${r1(y - r * 0.18)} ${r1(x + r)} ${r1(y)} Q${r1(x + r * 0.18)} ${r1(y + r * 0.18)} ${r1(x)} ${r1(y + r)} Q${r1(x - r * 0.18)} ${r1(y + r * 0.18)} ${r1(x - r)} ${r1(y)} Q${r1(x - r * 0.18)} ${r1(y - r * 0.18)} ${r1(x)} ${r1(y - r)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

// ---------- head features ----------
// Each returns { back, front } so ears can sit behind the head and tufts in front.

function headTop(kind, hx, hy, hr, s, p, uid) {
  const o = outline(p);
  const back = [], front = [];
  switch (kind) {
    case 'ears-pointy':
    case 'ears-tufted':
      for (const side of [-1, 1]) {
        const bx = hx + side * hr * 0.55, by = hy - hr * 0.62;
        const tx = hx + side * hr * 0.95, ty = hy - hr * 1.55;
        back.push(`<path d="M${r1(bx - side * hr * 0.35)} ${r1(by + 4)} L${r1(tx)} ${r1(ty)} L${r1(bx + side * hr * 0.45)} ${r1(by + hr * 0.2)} Z" fill="${p.b}" ${o}/>`);
        back.push(`<path d="M${r1(bx - side * hr * 0.12)} ${r1(by + 2)} L${r1(tx - side * 2)} ${r1(ty + 9)} L${r1(bx + side * hr * 0.3)} ${r1(by + hr * 0.12)} Z" fill="${p.l}"/>`);
        if (kind === 'ears-tufted') back.push(`<path d="M${r1(tx)} ${r1(ty)} l${side * 3} -9 M${r1(tx)} ${r1(ty)} l${side * -2} -8" stroke="${p.o}" stroke-width="2.4" stroke-linecap="round"/>`);
      }
      break;
    case 'ears-round':
      for (const side of [-1, 1]) {
        back.push(`<circle cx="${r1(hx + side * hr * 0.72)}" cy="${r1(hy - hr * 0.72)}" r="${r1(hr * 0.46)}" fill="${p.b}" ${o}/>`);
        back.push(`<circle cx="${r1(hx + side * hr * 0.72)}" cy="${r1(hy - hr * 0.72)}" r="${r1(hr * 0.27)}" fill="${p.l}"/>`);
      }
      break;
    case 'ears-long':
    case 'ears-flame':
      for (const side of [-1, 1]) {
        const ex = hx + side * hr * 0.42, ey = hy - hr * 1.35;
        back.push(`<ellipse cx="${r1(ex)}" cy="${r1(ey)}" rx="${r1(hr * 0.28)}" ry="${r1(hr * 0.78)}" transform="rotate(${side * 12} ${r1(ex)} ${r1(ey)})" fill="${p.b}" ${o}/>`);
        back.push(`<ellipse cx="${r1(ex)}" cy="${r1(ey + 3)}" rx="${r1(hr * 0.13)}" ry="${r1(hr * 0.55)}" transform="rotate(${side * 12} ${r1(ex)} ${r1(ey)})" fill="${p.l}"/>`);
        if (kind === 'ears-flame') back.push(flameShape(ex + side * hr * 0.16, ey - hr * 0.55, hr * 0.7, uid, p, side * 12));
      }
      break;
    case 'sprout':
      front.push(`<path d="M${hx} ${r1(hy - hr + 2)} q2 -12 -2 -18" stroke="#4e8a3a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`);
      front.push(leafShape(hx - 1, hy - hr - 15, 20, -150, p.a, shade(p.a, -0.45)));
      front.push(leafShape(hx - 1, hy - hr - 15, 22, -30, p.a, shade(p.a, -0.45)));
      break;
    case 'leaf':
      front.push(`<path d="M${hx} ${r1(hy - hr + 3)} q-1 -8 4 -12" stroke="${shade(p.a, -0.2)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      front.push(leafShape(hx + 3, hy - hr - 8, 38, -55, shade(p.a, 0.25), shade(p.a, -0.35)));
      break;
    case 'tuft': {
      const c = s.kind === 'bird' ? p.a : p.a;
      front.push(`<path d="M${r1(hx - 10)} ${r1(hy - hr + 4)} q-4 -16 6 -20 q-2 10 4 14 q2 -14 12 -12 q-8 6 -4 18" fill="${c}" ${outline(p, 2)}/>`);
      break;
    }
    case 'drop':
      front.push(`<path d="M${hx} ${r1(hy - hr - 30)} C ${hx + 12} ${r1(hy - hr - 14)}, ${hx + 11} ${r1(hy - hr - 2)}, ${hx} ${r1(hy - hr - 2)} C ${hx - 11} ${r1(hy - hr - 2)}, ${hx - 12} ${r1(hy - hr - 14)}, ${hx} ${r1(hy - hr - 30)} Z" fill="${shade(p.b, 0.3)}" ${outline(p, 2)}/>`);
      front.push(`<ellipse cx="${hx - 3}" cy="${r1(hy - hr - 12)}" rx="2.5" ry="4" fill="#fff" opacity="0.85"/>`);
      break;
    case 'cloud':
      for (const [dx, dy, rr] of [[-26, -6, 16], [-12, -22, 18], [8, -26, 20], [26, -12, 17], [32, 4, 13], [-34, 6, 12]]) {
        back.push(`<circle cx="${r1(hx + dx)}" cy="${r1(hy + dy)}" r="${rr}" fill="${p.l}" stroke="${shade(p.a, -0.1)}" stroke-width="2.4"/>`);
      }
      break;
    case 'crescent':
      back.push(`<path d="M${hx + 8} ${r1(hy - hr - 40)} A 26 26 0 1 0 ${hx + 30} ${r1(hy - hr + 2)} A 20 20 0 1 1 ${hx + 8} ${r1(hy - hr - 40)} Z" fill="${p.g}" filter="url(#${uid}-glow)" opacity="0.95"/>`);
      break;
    case 'horns':
      for (const side of [-1, 1]) {
        back.push(`<path d="M${r1(hx + side * hr * 0.45)} ${r1(hy - hr * 0.6)} Q${r1(hx + side * hr * 1.1)} ${r1(hy - hr * 1.2)} ${r1(hx + side * hr * 1.35)} ${r1(hy - hr * 1.7)} Q${r1(hx + side * hr * 0.85)} ${r1(hy - hr * 1.15)} ${r1(hx + side * hr * 0.15)} ${r1(hy - hr * 0.8)} Z" fill="${shade(p.l, -0.1)}" ${o}/>`);
      }
      break;
    case 'antlers': {
      const col = s.eyes === 'glow' ? p.g : shade(p.b, -0.35);
      const glow = s.eyes === 'glow' ? `filter="url(#${uid}-glow)"` : '';
      for (const side of [-1, 1]) {
        const bx = hx + side * hr * 0.4, by = hy - hr * 0.75;
        const d = `M${r1(bx)} ${r1(by)} q${side * 6} -20 ${side * 22} -34 M${r1(bx + side * 8)} ${r1(by - 16)} q${side * -6} -12 ${side * -2} -24 M${r1(bx + side * 17)} ${r1(by - 28)} q${side * 4} -10 ${side * 14} -14 M${r1(bx + side * 13)} ${r1(by - 24)} q${side * 0} -12 ${side * -2} -18`;
        back.push(`<path d="${d}" stroke="${col}" stroke-width="4.5" fill="none" stroke-linecap="round" ${glow}/>`);
        if (s.extra === 'leaves') {
          back.push(`<circle cx="${r1(bx + side * 22)}" cy="${r1(by - 34)}" r="4" fill="${p.a}"/>`, `<circle cx="${r1(bx + side * 6)}" cy="${r1(by - 40)}" r="3.6" fill="${p.a}"/>`, `<circle cx="${r1(bx + side * 31)}" cy="${r1(by - 42)}" r="3.4" fill="${p.a}"/>`);
          back.push(leafShape(bx + side * 10, by - 10, 13, side > 0 ? -40 : -140, '#7cbf5a', '#3f6f2f'));
        }
      }
      break;
    }
    case 'puff': {
      const lines = [];
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        lines.push(`M${r1(hx + Math.cos(a) * hr * 0.6)} ${r1(hy + Math.sin(a) * hr * 0.6)} L${r1(hx + Math.cos(a) * hr * 1.45)} ${r1(hy + Math.sin(a) * hr * 1.45)}`);
      }
      back.push(`<circle cx="${hx}" cy="${hy}" r="${r1(hr * 1.5)}" fill="#ffffff" opacity="0.7"/>`);
      back.push(`<path d="${lines.join(' ')}" stroke="#d7d2c4" stroke-width="1.4"/>`);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        back.push(`<circle cx="${r1(hx + Math.cos(a) * hr * 1.45)}" cy="${r1(hy + Math.sin(a) * hr * 1.45)}" r="3" fill="#fff"/>`);
      }
      front.push(`<path d="M${r1(hx - hr * 0.35)} ${r1(hy - hr * 0.85)} q-6 -10 -2 -16 M${r1(hx + hr * 0.35)} ${r1(hy - hr * 0.85)} q6 -10 2 -16" stroke="${shade(p.b, -0.4)}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`);
      break;
    }
    case 'fins':
      for (const side of [-1, 1]) {
        for (const k of [-1, 0, 1]) {
          const x0 = hx + side * hr * 0.8, y0 = hy - hr * 0.1 + k * 8;
          back.push(`<path d="M${r1(x0)} ${r1(y0)} q${side * 10} ${k * 4 - 6} ${side * 18} ${k * 7 - 3}" stroke="${p.a}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
        }
      }
      break;
    case 'crest':
    case 'crest-bolt':
      for (const [dx, h, rot] of [[-7, 22, -22], [0, 28, 0], [7, 20, 22]]) {
        back.push(`<ellipse cx="${hx + dx}" cy="${r1(hy - hr - h * 0.35)}" rx="5" ry="${r1(h * 0.55)}" transform="rotate(${rot} ${hx + dx} ${r1(hy - hr + 4)})" fill="${kind === 'crest' ? p.l : p.b}" ${outline(p, 2)}/>`);
      }
      if (kind === 'crest-bolt') {
        front.push(`<path d="M${hx + 2} ${r1(hy - hr - 30)} l-9 16 h8 l-6 14 l14 -18 h-8 l6 -12 Z" fill="${p.a}" stroke="${shade(p.a, -0.5)}" stroke-width="1.6" stroke-linejoin="round" filter="url(#${uid}-glow)"/>`);
      }
      break;
    case 'crown':
      back.push(`<g filter="url(#${uid}-glow)">${[-2, -1, 0, 1, 2].map((k) => {
        const a = (-90 + k * 24) * (Math.PI / 180);
        const x = hx + Math.cos(a) * (hr + 12), y = hy + Math.sin(a) * (hr + 12);
        return sparkle(x, y, k === 0 ? 9 : 6, p.g);
      }).join('')}</g>`);
      break;
    default:
      break;
  }
  return { back: back.join(''), front: front.join('') };
}

// ---------- tails, backs, marks ----------

function tail(kind, x, y, s, p, uid) {
  const o = outline(p);
  switch (kind) {
    case 'thin':
      return `<path d="M${x} ${y} Q${x + 28} ${y - 6} ${x + 24} ${y - 32}" stroke="${p.o}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M${x} ${y} Q${x + 28} ${y - 6} ${x + 24} ${y - 32}" stroke="${p.b}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'flame-tip':
      return tail('thin', x, y, s, p, uid) + flameShape(x + 24, y - 30, 24, uid, p, 10);
    case 'thistle':
      return tail('thin', x, y, s, p, uid)
        + `<circle cx="${x + 24}" cy="${y - 36}" r="8" fill="${p.a}" ${outline(p, 2)}/>`
        + `<path d="M${x + 18} ${y - 42} l-3 -9 M${x + 24} ${y - 44} l0 -10 M${x + 30} ${y - 42} l3 -9" stroke="${shade(p.b, 0.1)}" stroke-width="3" stroke-linecap="round"/>`;
    case 'fluffy':
      return `<ellipse cx="${x + 18}" cy="${y - 22}" rx="15" ry="30" transform="rotate(35 ${x + 18} ${y - 22})" fill="${p.b}" ${o}/>`
        + `<ellipse cx="${x + 27}" cy="${y - 42}" rx="8" ry="10" transform="rotate(35 ${x + 27} ${y - 42})" fill="${s.eyes === 'glow' ? p.l : p.l}"/>`;
    case 'flame':
      return flameShape(x + 14, y + 6, 62, uid, p, 38);
    case 'leafy':
      return tail('thin', x, y, s, p, uid) + leafShape(x + 22, y - 30, 22, -70, '#7cbf5a', '#3f6f2f') + leafShape(x + 22, y - 26, 18, -10, '#9fd08a', '#3f6f2f');
    case 'coral': {
      const c = p.a;
      const d = `M${x} ${y} Q${x + 18} ${y - 4} ${x + 22} ${y - 26} M${x + 22} ${y - 26} q-2 -14 -12 -20 M${x + 22} ${y - 26} q8 -12 18 -14 M${x + 12} ${y - 40} q-6 -6 -6 -14 M${x + 12} ${y - 40} q4 -10 10 -12 M${x + 34} ${y - 38} q4 -8 2 -16 M${x + 34} ${y - 38} q8 -2 12 4`;
      return `<path d="${d}" stroke="${shade(c, -0.45)}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`
        + `<circle cx="${x + 40}" cy="${y - 52}" r="3" fill="#ffd166"/><circle cx="${x + 4}" cy="${y - 56}" r="2.6" fill="#7ff0ff"/>`;
    }
    case 'ribbon':
      return `<path d="M${x} ${y} C ${x + 30} ${y + 20}, ${x + 40} ${y - 30}, ${x + 70} ${y - 10} S ${x + 100} ${y - 50}, ${x + 112} ${y - 40}" stroke="${p.a}" stroke-width="5" fill="none" stroke-linecap="round"/>`
        + [[30, 6], [58, -14], [92, -38]].map(([dx, dy]) => `<path d="M${x + dx} ${y + dy} l-6 -6 l0 12 Z M${x + dx} ${y + dy} l6 -6 l0 12 Z" fill="${shade(p.a, 0.25)}" stroke="${shade(p.a, -0.4)}" stroke-width="1.4" stroke-linejoin="round"/>`).join('');
    default:
      return '';
  }
}

function shellBack(kind, cx, cy, p, uid) {
  if (kind === 'shell-flower') {
    const shell = shade(p.b, -0.15);
    let out = `<path d="M${cx - 50} ${cy + 6} C ${cx - 52} ${cy - 44}, ${cx + 52} ${cy - 44}, ${cx + 50} ${cy + 6} Z" fill="${shell}" ${outline(p)}/>`;
    out += `<path d="M${cx - 30} ${cy + 4} L${cx - 22} ${cy - 18} L${cx} ${cy - 26} L${cx + 22} ${cy - 18} L${cx + 30} ${cy + 4} M${cx - 22} ${cy - 18} L${cx - 10} ${cy + 4} M${cx + 22} ${cy - 18} L${cx + 10} ${cy + 4} M${cx} ${cy - 26} L${cx} ${cy - 8}" stroke="${shade(p.b, -0.4)}" stroke-width="2" fill="none" opacity="0.6"/>`;
    for (const [dx, dy, rr] of [[-18, -30, 7], [4, -36, 9], [24, -26, 6.5]]) {
      out += [0, 72, 144, 216, 288].map((a) => {
        const rad = (a * Math.PI) / 180;
        return `<circle cx="${r1(cx + dx + Math.cos(rad) * rr * 0.6)}" cy="${r1(cy + dy + Math.sin(rad) * rr * 0.6)}" r="${r1(rr * 0.5)}" fill="${p.a}"/>`;
      }).join('') + `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r1(rr * 0.35)}" fill="#ffe08a"/>`;
    }
    out += leafShape(cx - 6, cy - 30, 16, 200, '#7cbf5a', '#3f6f2f') + leafShape(cx + 12, cy - 36, 14, -20, '#7cbf5a', '#3f6f2f');
    return out;
  }
  if (kind === 'shell-kiln') {
    const brick = shade(p.b, -0.12);
    let out = `<path d="M${cx - 48} ${cy + 6} C ${cx - 50} ${cy - 40}, ${cx + 50} ${cy - 40}, ${cx + 48} ${cy + 6} Z" fill="${brick}" ${outline(p)}/>`;
    out += `<path d="M${cx - 44} ${cy - 8} H${cx + 44} M${cx - 34} ${cy - 22} H${cx + 34} M${cx - 20} ${cy + 6} V${cy - 8} M${cx + 8} ${cy + 6} V${cy - 8} M${cx + 30} ${cy + 6} V${cy - 8} M${cx - 8} ${cy - 8} V${cy - 22} M${cx + 20} ${cy - 8} V${cy - 22} M${cx - 26} ${cy - 8} V${cy - 22}" stroke="${p.a}" stroke-width="2.2" filter="url(#${uid}-glow)" opacity="0.9"/>`;
    out += `<rect x="${cx + 8}" y="${cy - 46}" width="12" height="16" rx="2" fill="${shade(p.b, -0.3)}" ${outline(p, 2)}/>`;
    out += `<circle cx="${cx + 16}" cy="${cy - 56}" r="5" fill="#d9d4cf" opacity="0.7"/><circle cx="${cx + 22}" cy="${cy - 66}" r="6.5" fill="#d9d4cf" opacity="0.5"/><circle cx="${cx + 30}" cy="${cy - 78}" r="8" fill="#d9d4cf" opacity="0.3"/>`;
    return out;
  }
  return '';
}

// ---------- body kinds ----------

function blob(s, p, uid) {
  const cx = 120, cy = 110, rx = 54, ry = 46;
  const top = headTop(s.top, cx, cy - 4, ry, s, p, uid);
  let out = top.back;
  out += `<ellipse cx="${cx - 24}" cy="${cy + ry - 6}" rx="15" ry="9" fill="${p.s}" ${outline(p)}/>`;
  out += `<ellipse cx="${cx + 24}" cy="${cy + ry - 6}" rx="15" ry="9" fill="${p.s}" ${outline(p)}/>`;
  out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${uid}-b)" ${outline(p)}/>`;
  out += `<ellipse cx="${cx}" cy="${cy + 18}" rx="${rx * 0.56}" ry="${ry * 0.48}" fill="${p.l}" opacity="0.9"/>`;
  if (s.marks === 'moss') {
    for (const [dx, dy, rr] of [[-40, -22, 9], [-26, -36, 10], [-8, -43, 10], [12, -42, 9], [30, -34, 9], [44, -18, 7], [-48, -6, 6]]) {
      out += `<circle cx="${cx + dx}" cy="${cy + dy}" r="${rr}" fill="${p.a}" opacity="0.75"/>`;
    }
  }
  out += face(cx, cy - 4, 1.1, s, p, uid);
  return out + top.front;
}

function sprite(s, p, uid) {
  const cx = 120, cy = 92, r = 33;
  const top = headTop(s.top, cx, cy, r, s, p, uid);
  let out = top.back;
  out += `<ellipse cx="${cx - r - 4}" cy="${cy + 8}" rx="9" ry="6" transform="rotate(-25 ${cx - r - 4} ${cy + 8})" fill="${p.b}" ${outline(p)}/>`;
  out += `<ellipse cx="${cx + r + 4}" cy="${cy + 8}" rx="9" ry="6" transform="rotate(25 ${cx + r + 4} ${cy + 8})" fill="${p.b}" ${outline(p)}/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}-b)" ${outline(p)} ${s.g ? `filter="url(#${uid}-softglow)"` : ''}/>`;
  out += `<ellipse cx="${cx}" cy="${cy + 13}" rx="${r * 0.55}" ry="${r * 0.4}" fill="${p.l}" opacity="0.85"/>`;
  out += face(cx, cy - 2, 0.85, s, p, uid);
  if (s.top === 'cloud') {
    // Drizzlet is the cloud: puffs in front at the base too.
    for (const [dx, rr] of [[-24, 11], [-8, 12], [10, 12], [26, 10]]) {
      out += `<circle cx="${cx + dx}" cy="${cy + r - 4}" r="${rr}" fill="${p.l}" stroke="${shade(p.a, -0.1)}" stroke-width="2.4"/>`;
    }
  }
  return out + top.front;
}

function wisp(s, p, uid) {
  let out = `<path d="M120 36 C 168 66, 170 112, 144 134 C 130 146, 108 146, 96 134 C 72 112, 82 74, 120 36 Z" fill="url(#${uid}-b)" ${outline(p)} filter="url(#${uid}-softglow)"/>`;
  out += `<path d="M104 138 C 92 150, 104 166, 122 160 C 110 158, 106 150, 114 144 Z" fill="${p.b}" ${outline(p, 2)}/>`;
  out += `<ellipse cx="120" cy="112" rx="18" ry="20" fill="${p.l}" opacity="0.45"/>`;
  out += face(120, 100, 0.95, s, p, uid, { cheeks: false });
  return out;
}

function quad(s, p, uid) {
  const o = outline(p);
  const bx = 132, by = 112;
  const hx = 86, hy = 84, hr = 29;
  const top = headTop(s.top, hx, hy, hr, s, p, uid);
  let out = '';
  out += tail(s.tail ?? 'thin', 176, 104, s, p, uid);
  // far legs
  out += `<rect x="104" y="114" width="13" height="34" rx="6.5" fill="${p.s}" ${o}/><rect x="162" y="114" width="13" height="34" rx="6.5" fill="${p.s}" ${o}/>`;
  out += `<ellipse cx="${bx}" cy="${by}" rx="48" ry="27" fill="url(#${uid}-b)" ${o}/>`;
  out += `<ellipse cx="${bx}" cy="${by + 12}" rx="32" ry="10" fill="${p.l}" opacity="0.85"/>`;
  if (s.marks === 'stripes') {
    out += `<path d="M120 88 q6 10 2 20 M136 86 q6 10 2 22 M152 88 q6 10 2 20" stroke="${p.s}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  if (s.marks === 'spots') {
    for (const [dx, dy, rr] of [[-6, -12, 4.5], [10, -16, 3.5], [24, -8, 4.5], [14, 0, 3], [-18, -4, 3]]) out += `<circle cx="${bx + dx}" cy="${by + dy}" r="${rr}" fill="${shade(p.a, 0.1)}" opacity="0.8"/>`;
  }
  if (s.marks === 'smudge') {
    out += `<ellipse cx="${bx + 10}" cy="${by - 10}" rx="14" ry="7" fill="#1d1a22" opacity="0.28"/><ellipse cx="${bx - 18}" cy="${by - 2}" rx="8" ry="5" fill="#1d1a22" opacity="0.22"/>`;
  }
  if (s.marks === 'veil') {
    out += `<path d="M104 96 C 130 84, 160 92, 178 104 C 170 120, 140 126, 112 118 Z" fill="${p.g}" opacity="0.22" filter="url(#${uid}-glow)"/>`;
    for (const [dx, dy] of [[-10, -10], [8, -16], [26, -6], [0, 2]]) out += sparkle(bx + dx, by + dy, 3.5, p.g, 0.9);
  }
  if (s.back) out += shellBack(s.back, bx, by - 6, p, uid);
  // near legs
  out += `<rect x="94" y="118" width="14" height="34" rx="7" fill="${p.b}" ${o}/><rect x="150" y="118" width="14" height="34" rx="7" fill="${p.b}" ${o}/>`;
  out += `<ellipse cx="101" cy="151" rx="9" ry="5" fill="${p.l}" ${outline(p, 2)}/><ellipse cx="157" cy="151" rx="9" ry="5" fill="${p.l}" ${outline(p, 2)}/>`;
  out += top.back;
  out += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="url(#${uid}-b)" ${o}/>`;
  if (s.marks === 'collar') {
    out += `<path d="M94 108 l4 10 l5 -9 l5 9 l5 -10 l5 9 l4 -9" stroke="${shade(p.a, -0.35)}" stroke-width="2" fill="${p.a}" stroke-linejoin="round"/>`;
  }
  out += `<ellipse cx="${hx - 14}" cy="${hy + 13}" rx="15" ry="11" fill="${p.l}"/>`;
  out += `<ellipse cx="${hx - 24}" cy="${hy + 7}" rx="4.2" ry="3.2" fill="${p.ink === '#231d33' ? '#231d33' : '#0d0a18'}"/>`;
  out += face(hx - 2, hy - 2, 0.72, s, p, uid, { mouth: false });
  out += smile(hx - 16, hy + 16, 0.7, p);
  if (s.marks === 'smudge') out += `<ellipse cx="${hx + 12}" cy="${hy + 6}" rx="6" ry="4" fill="#1d1a22" opacity="0.25"/>`;
  return out + top.front;
}

function bun(s, p, uid) {
  const o = outline(p);
  const hx = 120, hy = 80, hr = 30;
  const top = headTop(s.top, hx, hy, hr, s, p, uid);
  let out = top.back;
  out += `<ellipse cx="101" cy="152" rx="14" ry="7.5" fill="${p.s}" ${o}/><ellipse cx="139" cy="152" rx="14" ry="7.5" fill="${p.s}" ${o}/>`;
  out += `<ellipse cx="120" cy="124" rx="36" ry="32" fill="url(#${uid}-b)" ${o}/>`;
  out += `<ellipse cx="120" cy="132" rx="22" ry="19" fill="${p.l}" opacity="0.9"/>`;
  if (s.marks === 'crystal') {
    out += `<g transform="translate(120 132)" stroke="${p.a}" stroke-width="2.2" stroke-linecap="round">${[0, 60, 120].map((a) => `<path transform="rotate(${a})" d="M0 -11 V11 M-3 -8 L0 -5 L3 -8 M-3 8 L0 5 L3 8"/>`).join('')}</g>`;
  }
  out += `<ellipse cx="90" cy="120" rx="7" ry="11" transform="rotate(25 90 120)" fill="${p.b}" ${o}/><ellipse cx="150" cy="120" rx="7" ry="11" transform="rotate(-25 150 120)" fill="${p.b}" ${o}/>`;
  out += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="url(#${uid}-b)" ${o}/>`;
  out += face(hx, hy + 2, 0.82, s, p, uid);
  return out + top.front;
}

function bird(s, p, uid) {
  const o = outline(p);
  const cx = 120, cy = 104, r = 42;
  const top = headTop(s.top, cx, cy - 8, r * 0.95, s, p, uid);
  let out = '';
  if (s.tail) out += tail(s.tail, cx + 30, cy + 24, s, p, uid);
  else out += `<path d="M${cx + 22} ${cy + 30} l26 16 l-4 -14 l12 4 Z" fill="${p.s}" ${o}/>`;
  if (s.wings === 'spread') {
    for (const side of [-1, 1]) {
      const m = (x) => cx + side * x;
      out += `<path d="M${m(26)} ${cy - 14} C ${m(60)} ${cy - 64}, ${m(98)} ${cy - 70}, ${m(112)} ${cy - 54} C ${m(98)} ${cy - 48}, ${m(102)} ${cy - 38}, ${m(92)} ${cy - 30} C ${m(96)} ${cy - 22}, ${m(86)} ${cy - 12}, ${m(74)} ${cy - 10} C ${m(76)} ${cy}, ${m(60)} ${cy + 8}, ${m(30)} ${cy + 10} Z" fill="${p.s}" ${o}/>`;
      out += `<path d="M${m(40)} ${cy - 18} Q ${m(70)} ${cy - 46} ${m(100)} ${cy - 52} M${m(40)} ${cy - 8} Q ${m(66)} ${cy - 26} ${m(88)} ${cy - 30} M${m(38)} ${cy + 2} Q ${m(56)} ${cy - 8} ${m(72)} ${cy - 10}" stroke="${p.l}" stroke-width="2" fill="none" opacity="0.55"/>`;
    }
  }
  out += top.back;
  out += `<path d="M${cx - 12} ${cy + r - 4} v10 m-5 0 h10 M${cx + 12} ${cy + r - 4} v10 m-5 0 h10" stroke="#e8973a" stroke-width="3.2" stroke-linecap="round"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}-b)" ${o}/>`;
  out += `<ellipse cx="${cx}" cy="${cy + 16}" rx="${r * 0.62}" ry="${r * 0.52}" fill="${p.l}" opacity="0.9"/>`;
  if (s.wings !== 'spread') {
    out += `<ellipse cx="${cx - r + 6}" cy="${cy + 8}" rx="13" ry="24" transform="rotate(18 ${cx - r + 6} ${cy + 8})" fill="${p.s}" ${o}/>`;
    out += `<ellipse cx="${cx + r - 6}" cy="${cy + 8}" rx="13" ry="24" transform="rotate(-18 ${cx + r - 6} ${cy + 8})" fill="${p.s}" ${o}/>`;
  }
  out += face(cx, cy - 10, 0.92, s, p, uid, { mouth: false });
  out += `<path d="M${cx - 7} ${cy - 1} L${cx + 7} ${cy - 1} L${cx} ${cy + 9} Z" fill="${s.top === 'crown' ? p.g : '#f2a33a'}" stroke="${shade('#f2a33a', -0.45)}" stroke-width="1.8" stroke-linejoin="round"/>`;
  if (s.extra === 'lantern') {
    out += `<path d="M${cx} ${cy + r - 2} v12" stroke="${p.o}" stroke-width="2.4"/>`;
    out += `<circle cx="${cx}" cy="${cy + r + 22}" r="22" fill="${p.g}" opacity="0.18" filter="url(#${uid}-glow)"/>`;
    out += `<rect x="${cx - 10}" y="${cy + r + 10}" width="20" height="24" rx="5" fill="${p.g}" stroke="${shade(p.g, -0.55)}" stroke-width="2.2" filter="url(#${uid}-glow)"/>`;
    out += `<path d="M${cx - 12} ${cy + r + 10} h24 M${cx - 12} ${cy + r + 34} h24" stroke="${shade(p.g, -0.55)}" stroke-width="3" stroke-linecap="round"/>`;
    out += `<ellipse cx="${cx}" cy="${cy + r + 22}" rx="4" ry="6" fill="#fff"/>`;
  }
  return out + top.front;
}

function serpent(s, p, uid) {
  const d = 'M58 150 C 30 140, 44 112, 86 118 C 130 124, 192 132, 188 100 C 185 76, 146 84, 136 66';
  let out = `<path d="${d}" stroke="${p.o}" stroke-width="32" fill="none" stroke-linecap="round"/>`;
  out += `<path d="${d}" stroke="${p.b}" stroke-width="27" fill="none" stroke-linecap="round"/>`;
  out += `<path d="${d}" stroke="${p.l}" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.55" transform="translate(0 6)"/>`;
  if (s.marks === 'seams') out += `<path d="${d}" stroke="${p.a}" stroke-width="3" fill="none" stroke-dasharray="7 11" filter="url(#${uid}-glow)"/>`;
  for (const [x, y] of [[96, 105], [140, 112], [176, 92], [70, 135]]) {
    out += `<path d="M${x} ${y} l6 -10 l6 10 Z" fill="${shade(p.b, 0.15)}" ${outline(p, 2)}/>`;
  }
  const hx = 132, hy = 56, hr = 24;
  const top = headTop(s.top, hx, hy, hr, s, p, uid);
  out += top.back;
  out += `<ellipse cx="${hx}" cy="${hy}" rx="28" ry="22" fill="url(#${uid}-b)" ${outline(p)}/>`;
  out += `<ellipse cx="${hx - 16}" cy="${hy + 8}" rx="14" ry="9" fill="${p.l}" opacity="0.6"/>`;
  out += `<circle cx="${hx - 24}" cy="${hy + 4}" r="1.8" fill="${p.a}"/>`;
  out += face(hx + 2, hy - 4, 0.75, { ...s, eyes: 'glow' }, { ...p, g: p.a }, uid, { mouth: false });
  out += `<path d="M${hx - 26} ${hy + 12} q10 4 20 0" stroke="${p.o}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return out + top.front;
}

function ray(s, p, uid) {
  let out = `<path d="M120 145 Q 128 166 158 170" stroke="${p.o}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  out += `<path d="M120 64 C 166 64, 206 92, 224 118 C 192 116, 160 124, 140 140 Q 120 152 100 140 C 80 124, 48 116, 16 118 C 34 92, 74 64, 120 64 Z" fill="url(#${uid}-b)" ${outline(p)}/>`;
  out += `<path d="M60 112 C 90 106, 150 106, 180 112" stroke="${p.l}" stroke-width="3" fill="none" opacity="0.5"/>`;
  if (s.marks === 'spots') {
    for (const [x, y, rr] of [[70, 100, 4], [56, 110, 3], [170, 100, 4], [184, 110, 3], [100, 122, 3], [140, 122, 3], [120, 128, 3.5]]) out += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${p.a}" opacity="0.9"/>`;
  }
  out += face(120, 90, 0.8, s, p, uid);
  return out;
}

function whale(s, p, uid) {
  let out = `<path d="M40 104 C 40 70, 92 58, 140 62 C 176 65, 194 80, 204 92 L 220 70 C 228 86, 226 100, 214 108 C 226 116, 228 132, 220 142 L 202 118 C 190 134, 160 148, 120 148 C 70 148, 40 132, 40 104 Z" fill="url(#${uid}-b)" ${outline(p)}/>`;
  out += `<path d="M48 116 C 72 140, 132 146, 176 128 C 140 138, 82 136, 48 116 Z" fill="${p.l}" opacity="0.8"/>`;
  out += `<path d="M64 128 q40 12 84 4 M58 122 q44 14 98 2" stroke="${shade(p.l, -0.25)}" stroke-width="1.4" fill="none" opacity="0.7"/>`;
  out += `<path d="M112 128 Q 98 158 128 152 Q 126 140 124 130 Z" fill="${p.s}" ${outline(p, 2)}/>`;
  out += `<g filter="url(#${uid}-glow)">`;
  for (const [x, y, rr] of [[100, 86, 3.2], [118, 82, 2.6], [136, 82, 3.4], [154, 86, 2.6], [170, 92, 3], [186, 98, 2.4], [110, 98, 2.2], [146, 96, 2.2]]) out += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${p.g}"/>`;
  out += `</g>`;
  out += eye(80, 96, 7, 'glow', p, uid, -1);
  out += `<path d="M44 112 Q 60 120 80 113" stroke="${p.o}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  out += `<g stroke="${p.g}" fill="none" stroke-width="2.4" stroke-linecap="round" filter="url(#${uid}-glow)" opacity="0.85">`;
  out += `<path d="M32 98 q-8 14 0 28"/><path d="M22 90 q-12 22 0 44" opacity="0.7"/><path d="M12 82 q-16 30 0 60" opacity="0.45"/></g>`;
  return out;
}

function moth(s, p, uid) {
  const o = outline(p);
  let out = '';
  const wing = shade(p.a, -0.05), wing2 = shade(p.a, -0.2);
  out += `<ellipse cx="94" cy="122" rx="24" ry="17" transform="rotate(28 94 122)" fill="${wing2}" ${o}/><ellipse cx="146" cy="122" rx="24" ry="17" transform="rotate(-28 146 122)" fill="${wing2}" ${o}/>`;
  out += `<ellipse cx="84" cy="88" rx="38" ry="26" transform="rotate(-22 84 88)" fill="${wing}" ${o}/><ellipse cx="156" cy="88" rx="38" ry="26" transform="rotate(22 156 88)" fill="${wing}" ${o}/>`;
  for (const side of [-1, 1]) {
    out += `<circle cx="${120 + side * 40}" cy="86" r="10" fill="${p.l}"/><circle cx="${120 + side * 40}" cy="86" r="5" fill="${p.b}"/>`;
    out += `<circle cx="${120 + side * 26}" cy="124" r="5" fill="${p.l}" opacity="0.8"/>`;
    out += `<path d="M${120 + side * 8} 70 q${side * 8} -22 ${side * 24} -26" stroke="${p.o}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < 4; k++) out += `<path d="M${120 + side * (11 + k * 4.5)} ${62 - k * 4} l${side * 5} -3" stroke="${p.o}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  out += `<circle cx="120" cy="136" r="24" fill="${p.g}" opacity="0.22" filter="url(#${uid}-glow)"/>`;
  out += `<ellipse cx="120" cy="106" rx="13" ry="30" fill="url(#${uid}-b)" ${o}/>`;
  out += `<ellipse cx="120" cy="134" rx="11" ry="12" fill="${p.g}" stroke="${shade(p.g, -0.45)}" stroke-width="2" filter="url(#${uid}-glow)"/>`;
  out += `<path d="M110 128 h20 M110 138 h20" stroke="${shade(p.g, -0.45)}" stroke-width="1.6" opacity="0.6"/>`;
  out += `<circle cx="120" cy="78" r="16" fill="url(#${uid}-b)" ${o}/>`;
  out += `<circle cx="112" cy="68" r="5" fill="${p.l}" opacity="0.5"/><circle cx="128" cy="68" r="5" fill="${p.l}" opacity="0.5"/>`;
  out += face(120, 79, 0.55, s, p, uid);
  return out;
}

const KINDS = { blob, sprite, wisp, quad, bun, bird, serpent, ray, whale, moth };

// ---------- extras and backgrounds ----------

function extras(s, p, uid, rng, full) {
  const spread = full ? [20, 220, -30, 200] : [6, 234, 8, 172];
  const rx = () => spread[0] + rng() * (spread[1] - spread[0]);
  const ry = () => spread[2] + rng() * (spread[3] - spread[2]);
  let out = '';
  switch (s.extra) {
    case 'bubbles':
      for (let i = 0; i < 9; i++) {
        const r = 2 + rng() * 6;
        out += `<circle cx="${r1(rx())}" cy="${r1(ry() * 0.8)}" r="${r1(r)}" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.4"/>`;
      }
      break;
    case 'embers':
      out += `<g filter="url(#${uid}-glow)">`;
      for (let i = 0; i < 12; i++) out += `<circle cx="${r1(rx())}" cy="${r1(ry() * 0.85)}" r="${r1(1 + rng() * 2.2)}" fill="${rng() > 0.5 ? '#ffcf3d' : '#ff7a2b'}"/>`;
      out += `</g>`;
      break;
    case 'sparkles':
    case 'stars':
      for (let i = 0; i < 8; i++) out += sparkle(rx(), ry() * 0.8, 2.5 + rng() * 4, s.extra === 'stars' ? '#fff6c8' : '#ffffff', 0.9);
      break;
    case 'rain':
      for (let i = 0; i < 7; i++) {
        const x = 96 + i * 8 + rng() * 4, y = 140 + rng() * 14;
        out += `<path d="M${r1(x)} ${r1(y)} l-2 8" stroke="${p.a}" stroke-width="2.4" stroke-linecap="round"/>`;
      }
      break;
    case 'leaves':
      for (let i = 0; i < 4; i++) out += leafShape(rx(), ry() * 0.7, 10 + rng() * 6, rng() * 360, '#9fd08a', '#3f6f2f');
      break;
    case 'seeds':
      for (let i = 0; i < 5; i++) {
        const x = rx(), y = ry() * 0.7;
        out += `<path d="M${r1(x)} ${r1(y)} v10" stroke="#cfc6a8" stroke-width="1.2"/>`;
        for (let k = 0; k < 7; k++) {
          const a = Math.PI + (k / 6) * Math.PI;
          out += `<path d="M${r1(x)} ${r1(y)} l${r1(Math.cos(a) * 6)} ${r1(Math.sin(a) * 6)}" stroke="#ffffff" stroke-width="1.1"/>`;
        }
      }
      break;
    case 'wind':
      out += `<g stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8">`;
      out += `<path d="M10 60 q30 -10 60 0 t50 -6"/><path d="M150 40 q24 -8 48 0 t36 -4"/><path d="M16 150 q24 -8 46 0"/><path d="M176 146 q20 -6 40 0"/></g>`;
      break;
    default:
      break;
  }
  return out;
}

function background(habitat, uid, rng, full) {
  const h = HABITATS[habitat];
  // (sky colors come from the gradient in defs, which may be a per-card override)
  const [x0, y0, w, hgt] = full ? [-60, -80, 360, 380] : [0, 0, 240, 180];
  let out = `<rect x="${x0}" y="${y0}" width="${w}" height="${hgt}" fill="url(#${uid}-sky)"/>`;
  const rnd = (a, b) => a + rng() * (b - a);
  switch (habitat) {
    case 'moss':
      out += `<path d="M${x0} 146 Q 60 124 120 140 T ${x0 + w} 138 V ${y0 + hgt} H ${x0} Z" fill="${h.ground}" opacity="0.75"/>`;
      for (let i = 0; i < 14; i++) {
        const x = rnd(x0, x0 + w), y = rnd(148, full ? 260 : 178);
        out += `<path d="M${r1(x)} ${r1(y)} q2 -8 -1 -12 M${r1(x + 3)} ${r1(y)} q1 -6 4 -9" stroke="#4f8f3e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      }
      for (let i = 0; i < 4; i++) out += `<circle cx="${r1(rnd(x0 + 10, x0 + w - 10))}" cy="${r1(rnd(150, 172))}" r="2.6" fill="#fff4a8"/>`;
      break;
    case 'ember':
      out += `<path d="M${x0} 130 L 30 96 L 60 112 L 96 70 L 112 78 L 128 66 L 170 116 L 200 100 L ${x0 + w} 124 V ${y0 + hgt} H ${x0} Z" fill="#d97a55" opacity="0.45"/>`;
      out += `<path d="M106 70 q6 -10 0 -18 q10 6 10 18" fill="#ffcf3d" opacity="0.5"/>`;
      out += `<path d="M${x0} 148 Q 80 138 140 146 T ${x0 + w} 144 V ${y0 + hgt} H ${x0} Z" fill="${h.ground}" opacity="0.8"/>`;
      break;
    case 'tide':
      out += `<g fill="#ffffff" opacity="0.14"><path d="M40 ${y0} L70 ${y0} L120 180 L90 180 Z"/><path d="M130 ${y0} L150 ${y0} L190 180 L170 180 Z"/></g>`;
      out += `<path d="M${x0} 150 Q 40 142 80 150 T 160 150 T ${x0 + w} 148 V ${y0 + hgt} H ${x0} Z" fill="#f2deb0" opacity="0.65"/>`;
      out += `<path d="M10 40 q12 -6 24 0 t24 0 M180 28 q12 -6 24 0 t24 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.6"/>`;
      break;
    case 'gale':
      for (const [cx, cy, sc] of [[40, 40, 1], [196, 30, 0.8], [180, 140, 1.1], [30, 150, 0.9]]) {
        out += `<g opacity="0.9" fill="#ffffff"><ellipse cx="${cx}" cy="${cy}" rx="${22 * sc}" ry="${10 * sc}"/><circle cx="${cx - 8 * sc}" cy="${cy - 6 * sc}" r="${10 * sc}"/><circle cx="${cx + 8 * sc}" cy="${cy - 8 * sc}" r="${12 * sc}"/></g>`;
      }
      break;
    case 'dusk':
      for (let i = 0; i < 26; i++) out += `<circle cx="${r1(rnd(x0, x0 + w))}" cy="${r1(rnd(y0, 130))}" r="${r1(rnd(0.5, 1.6))}" fill="#fff" opacity="${r1(rnd(0.4, 1))}"/>`;
      out += `<circle cx="196" cy="34" r="16" fill="#fff6d6" opacity="0.9"/><circle cx="203" cy="30" r="14" fill="${h.sky[0]}"/>`;
      out += `<path d="M${x0} 150 Q 60 130 120 146 T ${x0 + w} 140 V ${y0 + hgt} H ${x0} Z" fill="${h.ground}" opacity="0.9"/>`;
      break;
    default:
      break;
  }
  return out;
}

// ---------- entry point ----------

const FLOATING = new Set(['sprite', 'wisp', 'moth', 'ray', 'whale']);

/**
 * @param card a card from cards.js
 * @param opts.full   fill a whole card (ultra rares)
 * @param opts.bare   creature only, no background (binder silhouettes)
 */
export function renderArt(card, { full = false, bare = false } = {}) {
  const uid = `art${++uidCounter}`;
  const s = card.art;
  const p = makePalette(s);
  const rng = seeded(card.id);
  const h = { ...HABITATS[card.habitat], ...(s.sky ? { sky: s.sky } : {}) };
  const viewBox = full ? '24 -46 192 268' : '0 0 240 180';

  const defs = `<defs>`
    + `<radialGradient id="${uid}-b" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="${p.hi}"/><stop offset="0.55" stop-color="${p.b}"/><stop offset="1" stop-color="${p.s}"/></radialGradient>`
    + `<linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${h.sky[0]}"/><stop offset="1" stop-color="${h.sky[1]}"/></linearGradient>`
    + `<linearGradient id="${uid}-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${s.a}"/><stop offset="1" stop-color="#ffe066"/></linearGradient>`
    + `<filter id="${uid}-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    + `<filter id="${uid}-softglow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${p.g}" flood-opacity="0.75"/></filter>`
    + `<radialGradient id="${uid}-aura"><stop offset="0" stop-color="${p.g}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.g}" stop-opacity="0"/></radialGradient>`
    + `</defs>`;

  let scene = '';
  if (!bare) {
    scene += background(card.habitat, uid, rng, full);
    if (card.rarity === 'ultra' || card.rarity === 'rare') {
      const rays = [];
      const n = card.rarity === 'ultra' ? 18 : 12;
      for (let i = 0; i < n; i++) {
        const a1 = (i / n) * Math.PI * 2, a2 = a1 + Math.PI / n / 1.6;
        rays.push(`M120 100 L${r1(120 + Math.cos(a1) * 260)} ${r1(100 + Math.sin(a1) * 260)} L${r1(120 + Math.cos(a2) * 260)} ${r1(100 + Math.sin(a2) * 260)} Z`);
      }
      scene += `<g class="art-rays"><path d="${rays.join(' ')}" fill="#ffffff" opacity="${card.rarity === 'ultra' ? 0.16 : 0.1}"/></g>`;
      scene += `<circle cx="120" cy="100" r="${card.rarity === 'ultra' ? 110 : 80}" fill="url(#${uid}-aura)" opacity="${card.rarity === 'ultra' ? 0.7 : 0.4}"/>`;
    }
  }

  const floating = FLOATING.has(s.kind);
  const size = s.size || 1;
  if (!bare) scene += `<ellipse cx="120" cy="${floating ? 164 : 156}" rx="${r1((floating ? 34 : 54) * size)}" ry="${floating ? 5 : 7}" fill="#000" opacity="${floating ? 0.12 : 0.18}"/>`;

  const body = KINDS[s.kind](s, p, uid);
  const transform = size !== 1 ? `transform="translate(120 156) scale(${size}) translate(-120 -156)"` : '';
  scene += `<g class="creature${floating ? ' floating' : ''}"><g ${transform}>${body}</g></g>`;
  if (!bare) scene += extras(s, p, uid, rng, full);

  return `<svg class="art-svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${scene}</svg>`;
}
