// Sound and vibration for every tear, pop and reveal.
// Sounds are synthesized with Web Audio, so there are no audio files to load.
// Vibration uses navigator.vibrate, which Android browsers support; iOS Safari ignores it.

let ctx = null;
let noiseBuf = null;
const prefs = { sound: true, haptics: true };

export function setFeedbackPrefs({ sound, haptics }) {
  prefs.sound = !!sound;
  prefs.haptics = !!haptics;
}

function audio() {
  if (!prefs.sound) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Browsers only allow audio after a user gesture; call this from one.
export function unlockAudio() {
  audio();
}

function noise(ac) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

function env(ac, gainNode, t, attack, peak, decay) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq, { type = 'sine', at = 0, attack = 0.005, decay = 0.25, gain = 0.15, slideTo } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + attack + decay);
  env(ac, g, t, attack, gain, decay);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

function hiss({ at = 0, dur = 0.12, gain = 0.2, type = 'bandpass', freq = 2000, freqTo, q = 1 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const src = noise(ac);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = ac.createGain();
  env(ac, g, t, 0.004, gain, dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function vibrate(pattern) {
  if (!prefs.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

export const fx = {
  tap() {
    tone(660, { decay: 0.05, gain: 0.04, type: 'triangle' });
    vibrate(4);
  },
  // Little fibers giving way while you drag across the tear line.
  tearTick(progress) {
    hiss({ dur: 0.035, gain: 0.07 + progress * 0.08, freq: 2500 + progress * 2500, q: 3 });
    vibrate(5);
  },
  rip() {
    hiss({ dur: 0.28, gain: 0.35, freq: 4500, freqTo: 900, q: 0.8 });
    tone(140, { decay: 0.15, gain: 0.12, slideTo: 60 });
    vibrate([22, 20, 12]);
  },
  slide() {
    hiss({ dur: 0.22, gain: 0.08, type: 'lowpass', freq: 1800, freqTo: 400 });
  },
  swipe() {
    hiss({ dur: 0.14, gain: 0.07, type: 'highpass', freq: 1200, freqTo: 3000 });
    vibrate(6);
  },
  peelTick(progress) {
    hiss({ dur: 0.03, gain: 0.05, freq: 3000 + progress * 3000, q: 4 });
    vibrate(Math.round(3 + progress * 10));
  },
  // A rare is waiting face down.
  anticipation() {
    tone(220, { type: 'sine', attack: 0.15, decay: 0.6, gain: 0.08, slideTo: 330 });
    vibrate([15, 90, 15]);
  },
  reveal(rarity) {
    if (rarity === 'common') {
      tone(520, { decay: 0.12, gain: 0.1, slideTo: 300 });
      vibrate(10);
    } else if (rarity === 'uncommon') {
      tone(NOTES[2], { type: 'triangle', decay: 0.25, gain: 0.12 });
      tone(NOTES[4], { type: 'triangle', at: 0.08, decay: 0.35, gain: 0.12 });
      vibrate([12, 40, 16]);
    } else if (rarity === 'rare') {
      [0, 2, 4, 5].forEach((n, i) => tone(NOTES[n], { type: 'triangle', at: i * 0.07, decay: 0.45, gain: 0.13 }));
      hiss({ at: 0.25, dur: 0.5, gain: 0.05, type: 'highpass', freq: 6000 });
      vibrate([20, 40, 30, 40, 60]);
    } else {
      tone(65, { decay: 0.9, gain: 0.25, slideTo: 40 });
      [0, 2, 4, 5, 7, 8].forEach((n, i) => tone(NOTES[n], { type: 'triangle', at: 0.05 + i * 0.07, decay: 0.7, gain: 0.12 }));
      [4, 7, 8].forEach((n) => tone(NOTES[n], { type: 'sine', at: 0.55, attack: 0.05, decay: 1.4, gain: 0.07 }));
      hiss({ at: 0.4, dur: 1.2, gain: 0.06, type: 'highpass', freq: 7000 });
      vibrate([30, 50, 30, 50, 30, 50, 140]);
    }
  },
  shards() {
    tone(1318.5, { type: 'triangle', decay: 0.12, gain: 0.07 });
    tone(1760, { type: 'triangle', at: 0.06, decay: 0.2, gain: 0.07 });
  },
  crack(stage) {
    hiss({ dur: 0.08, gain: 0.3, type: 'highpass', freq: 1500 + stage * 500 });
    tone(180 - stage * 20, { decay: 0.12, gain: 0.14, slideTo: 90 });
    vibrate(18 + stage * 8);
  },
  hatch() {
    hiss({ dur: 0.3, gain: 0.3, freq: 1800, freqTo: 600, q: 0.7 });
    tone(392, { type: 'triangle', at: 0.05, decay: 0.3, gain: 0.12, slideTo: 784 });
    vibrate([40, 30, 20]);
  },
  pageFlip() {
    hiss({ dur: 0.18, gain: 0.1, type: 'bandpass', freq: 1200, freqTo: 3200, q: 0.6 });
    vibrate(6);
  },
  claim() {
    [4, 6, 8].forEach((n, i) => tone(NOTES[n], { type: 'triangle', at: i * 0.06, decay: 0.25, gain: 0.1 }));
    vibrate([10, 30, 10]);
  },
  fanfare() {
    [0, 2, 4, 7, 4, 7, 8].forEach((n, i) => tone(NOTES[n], { type: 'triangle', at: i * 0.12, decay: 0.5, gain: 0.13 }));
    tone(65, { at: 0.8, decay: 1.2, gain: 0.2, slideTo: 50 });
    vibrate([30, 60, 30, 60, 30, 60, 200]);
  },
  nope() {
    tone(200, { type: 'square', decay: 0.12, gain: 0.05, slideTo: 150 });
    vibrate([10, 40, 10]);
  },
};
