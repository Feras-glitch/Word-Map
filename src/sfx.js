// مؤثرات صوتية مولَّدة بالكود (بلا ملفات)
import { store } from './store.js';

let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.2, slide = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}
function noise(start, dur, vol = 0.3) {
  const c = ac(); if (!c) return;
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + start);
}

const fx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.12, 'triangle'); tone(1320, 0.2, 0.2, 'triangle', 0.15); },
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.08, 0.7); tone(180, 0.15, 0.22, 'sawtooth', 0.07, 0.7); },
  stamp: () => { noise(0, 0.18, 0.5); tone(90, 0, 0.18, 'sine', 0.4, 0.5); },
  whoosh: () => noise(0, 0.5, 0.15),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.15)),
  flip: () => tone(500, 0, 0.05, 'square', 0.04, 1.6),
};
export function sfx(name) { if (store.settings.sound !== false) fx[name]?.(); }
