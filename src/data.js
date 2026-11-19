import countries from './data/countries.json';
import map from './data/map.json';
import { continents, continents3, greetings, ibnBattuta, hajjRoutes, holyPlaces } from '../scripts/content.mjs';
import languages from './data/languages.json';

export { map, continents, continents3, greetings, ibnBattuta, hajjRoutes, holyPlaces, languages };

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
  1: { name: 'مستكشف', ages: '٦–٧ سنوات', emoji: '🌱' },
  2: { name: 'رحّالة', ages: '٨–٩ سنوات', emoji: '🌿' },
  3: { name: 'قبطان', ages: '١٠ سنوات فأكثر', emoji: '🌳' },
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

// أسماء أخرى يبحث بها الأطفال: الشائع منها، وأجزاء الدول التي تُعرض ضمن دولها
const ALIAS = {
  USA: ['أمريكا', 'أميركا', 'الولايات المتحدة الأمريكية', 'America', 'USA'], GBR: ['المملكة المتحدة', 'إنجلترا', 'إنكلترا', 'انجلترا', 'إسكتلندا', 'ويلز', 'England', 'UK'],
  CHN: ['تايوان', 'هونغ كونغ', 'ماكاو', 'Taiwan'], SYR: ['الجولان'], MAR: ['الصحراء الغربية', 'الصحراء المغربية'], SOM: ['أرض الصومال', 'صوماليلاند'],
  PSE: ['القدس', 'غزة', 'الضفة الغربية', 'بيت المقدس'], GRL: ['جرينلاند', 'Greenland'], CZE: ['تشيكيا'], CIV: ['كوت ديفوار'], MMR: ['بورما'], SWZ: ['سوازيلاند', 'سوازيلند'],
  MKD: ['مقدونيا'], CPV: ['الرأس الأخضر'], NLD: ['Holland'], CYP: ['قبرص الشمالية'], KOR: ['كوريا'], PRK: ['كوريا'], COD: ['زائير'],
};
export function search(q) {
  // يزيل التشكيل والنبرات (البينين بلا نبرات) ويوحّد الهمزات
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u0655\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^ال/, '').replace(/\s+/g, ' ');
  q = norm(q.trim());
  if (!q) return [];
  const score = (c) => {
    const names = [c.ar, c.en, c.zh, c.capAr, c.capEn, c.cap3?.zh, c.py, c.cap3?.py, (c.py || '').replace(/ /g, ''), (c.cap3?.py || '').replace(/ /g, ''), ...(ALIAS[c.id] || [])].map(norm);
    if (names.some((n) => n === q)) return 0;
    if (names.some((n) => n.startsWith(q))) return 1;
    if (names.some((n) => n.includes(q))) return 2;
    return 9;
  };
  return countries.map((c) => [score(c), c]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || (a[1].kind === 'state' ? -1 : 1)).slice(0, 8).map(([, c]) => c);
}
