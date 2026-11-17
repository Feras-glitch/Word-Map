import { h, owl } from '../ui.js';
import { store } from '../store.js';
import { states, LEVELS } from '../data.js';
import { speak } from '../speech.js';
import { sfx } from '../sfx.js';

const TILES = [
  { k: 'explore', e: '🗺️', t: 'خريطة العالم', s: 'استكشف الدول وأعلامها', c: '#2b7fd4' },
  { k: 'daily', e: '✈️', t: 'رحلة اليوم', s: 'دولة جديدة كل يوم', c: '#e76f51' },
  { k: 'games', e: '🎮', t: 'الألعاب', s: 'أعلام، عواصم، خريطة، ذاكرة', c: '#8e44ad' },
  { k: 'passport', e: '🛂', t: 'جواز سفري', s: 'أختامي وجوائزي', c: '#d4a017' },
  { k: 'battuta', e: '🐪', t: 'رحلة ابن بطوطة', s: 'سافر مع الرحالة العظيم', c: '#a0522d' },
  { k: 'islamic', e: '🕋', t: 'العالم الإسلامي', s: 'الحرمان والأقصى وطرق الحج', c: '#1b8a5a' },
  { k: 'hello', e: '👋', t: 'قل مرحباً', s: 'التحية بلغات العالم', c: '#2a9d8f' },
];

export function homeScreen(root, { go }) {
  const me = store.me;
  const got = Object.keys(me.stamps).length;
  const greet = ['أهلاً', 'مرحباً', 'صباح الاستكشاف'][new Date().getHours() < 12 ? 2 : Math.floor(Math.random() * 2)];
  root.append(
    h('div', { class: 'home-top' },
      h('button', { class: 'me', onclick: () => go('profiles') }, h('span', { class: 'av' }, me.avatar), h('span', {}, h('b', {}, me.name), h('small', {}, LEVELS[me.level].emoji + ' ' + LEVELS[me.level].name))),
      h('div', { class: 'me-stats' }, h('span', {}, '🛂 ' + got.toLocaleString('ar-EG') + ' من ' + states.length.toLocaleString('ar-EG')),
        h('button', { class: 'icon-btn', 'aria-label': 'الإعدادات', onclick: () => go('settings') }, '⚙️'))),
    h('h1', { class: 'brand' }, '🌍 مستكشف العالم'),
    owl(`${greet} يا ${me.name}! ${got ? 'في جوازك ' + got.toLocaleString('ar-EG') + ' من الأختام. ' : ''}إلى أين نسافر اليوم؟`, { size: 84 }),
    h('div', { class: 'tiles' }, TILES.map((t) => h('button', { class: 'tile', style: { '--c': t.c }, onclick: () => { sfx('tap'); go(t.k); } },
      h('span', { class: 'te' }, t.e), h('b', {}, t.t), h('small', {}, t.s)))),
  );
  root.querySelector('.owl-wrap').addEventListener('click', () => speak(root.querySelector('.bubble').textContent, 'ar-SA'));
}
