import { h, stars } from '../ui.js';
import { store } from '../store.js';
import { states, contOrder, continents, contEmoji, contColors, flagUrl, byId } from '../data.js';
import { openCard } from '../card.js';

const GAME_NAMES = { flag: '🚩 خمّن العلم', where: '📍 أين الدولة؟', capital: '🏛️ العاصمة', memory: '🧠 الذاكرة' };

export function passportScreen(root, { go }) {
  const me = store.me;
  const got = Object.keys(me.stamps);
  const cover = h('div', { class: 'passport-cover' },
    h('div', { class: 'pc-emblem' }, '🌍'),
    h('div', {}, h('small', {}, 'جواز سفر المستكشف'), h('h2', {}, me.avatar + ' ' + me.name),
      h('div', { class: 'pc-count' }, 'الأختام: ' + got.length.toLocaleString('ar-EG') + ' من ' + states.length.toLocaleString('ar-EG'))));
  const showOnMap = (id) => { try { sessionStorage.setItem('openCountry', id); } catch { /* */ } go('explore'); };

  const progress = h('div', { class: 'cont-progress' }, contOrder.map((k) => {
    const all = states.filter((s) => s.cont === k);
    const n = all.filter((s) => me.stamps[s.id]).length;
    return h('div', { class: 'cp' + (n === all.length ? ' done' : '') },
      h('span', {}, contEmoji[k] + ' ' + continents[k]),
      h('div', { class: 'bar' }, h('i', { style: { width: (n / all.length) * 100 + '%', background: contColors[k] } })),
      h('small', {}, n.toLocaleString('ar-EG') + ' من ' + all.length.toLocaleString('ar-EG') + (n === all.length ? ' 🏅' : '')));
  }));

  const badges = h('div', { class: 'badges' },
    Object.entries(GAME_NAMES).map(([k, t]) => h('div', { class: 'badge-row' }, h('span', {}, t), stars(me.stars[k] || 0))),
    h('div', { class: 'badge-row' }, h('span', {}, '🐪 رحلة ابن بطوطة'), h('span', {}, me.badges.battuta ? '🏅 أكملتها' : (me.battuta || 0).toLocaleString('ar-EG') + ' محطة')),
    h('div', { class: 'badge-row' }, h('span', {}, '✈️ رحلات يومية متتالية'), h('span', {}, '🔥 ' + (me.daily.streak || 0).toLocaleString('ar-EG'))),
  );

  const sorted = got.sort((a, b) => (me.stamps[b] > me.stamps[a] ? 1 : -1));
  const grid = h('div', { class: 'stamps' }, sorted.length ? sorted.map((id, i) => {
    const c = byId[id];
    return h('button', { class: 'stamp', style: { '--r': ((i * 37) % 17) - 8 + 'deg' }, onclick: () => openCard(id, { onShowOnMap: showOnMap }) },
      h('img', { src: flagUrl(c.f), alt: '' }), h('span', {}, c.ar), h('small', {}, new Date(me.stamps[id]).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })));
  }) : h('p', { class: 'empty' }, 'جوازك فارغ! افتح الخريطة والمس أي دولة لتحصل على أول ختم.'));

  root.append(cover, h('h3', {}, 'تقدمي في القارات'), progress, h('h3', {}, 'جوائزي'), badges, h('h3', {}, 'أختامي'), grid);
}
