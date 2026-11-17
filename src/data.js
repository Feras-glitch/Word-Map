import countries from './data/countries.json';
import map from './data/map.json';
import { continents, greetings, ibnBattuta, hajjRoutes, holyPlaces } from '../scripts/content.mjs';

export { map, continents, greetings, ibnBattuta, hajjRoutes, holyPlaces };

const flags = import.meta.glob('./flags/*.svg', { eager: true, query: '?url', import: 'default' });
export const flagUrl = (f) => flags[`./flags/${f}.svg`] || '';

export const all = countries;
export const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
export const states = countries.filter((c) => c.kind === 'state');

export const contColors = {
  asia: '#ffcf56', africa: '#f6a15b', europe: '#8fd17a', namerica: '#f58f8f',
  samerica: '#c49bf0', oceania: '#5fd0c9', antarctica: '#e8f1fb',
};
export const contEmoji = { asia: '🐼', africa: '🦁', europe: '🏰', namerica: '🦅', samerica: '🦜', oceania: '🦘' };
export const contOrder = ['asia', 'africa', 'europe', 'namerica', 'samerica', 'oceania'];

// مربع الإحاطة لكل قارة (لتقريب الخريطة)
export const contBox = {};
for (const k of contOrder) {
  const cs = states.filter((c) => c.cont === k && c.bb && c.id !== 'RUS' && c.id !== 'FJI' && c.id !== 'KIR');
  const xs = cs.flatMap((c) => [c.bb[0], c.bb[2]]);
  const ys = cs.flatMap((c) => [c.bb[1], c.bb[3]]);
  contBox[k] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
contBox.europe = [930, 120, 1260, 300];

// مجموعات الدول حسب المستوى
export const LEVELS = {
  1: { name: 'صغير', ages: '٦–٧ سنوات', emoji: '🌱' },
  2: { name: 'متوسط', ages: '٨–٩ سنوات', emoji: '🌿' },
  3: { name: 'كبير', ages: '١٠ سنوات فأكثر', emoji: '🌳' },
};
export function pool(level) {
  if (level <= 1) return states.filter((c) => c.famous);
  if (level === 2) return states.filter((c) => c.famous || c.area > 60000);
  return states;
}

export const num = (n) => Number(n).toLocaleString('ar-EG');

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = (a, n) => shuffle(a).slice(0, n);

export function search(q) {
  q = q.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  if (!q) return [];
  const norm = (s) => (s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  return countries.filter((c) => (norm(c.ar).includes(q) || norm(c.en).includes(q) || (c.zh || '').includes(q) || norm(c.capAr).includes(q))).slice(0, 8);
}
