// قارن بين دولتين: جنباً إلى جنب في المساحة والسكان والموقع
import { h, owl } from '../ui.js';
import { store } from '../store.js';
import { states, byId, flagUrl, continents, languages } from '../data.js';
import { miniMap } from '../minimap.js';
import { openCard } from '../card.js';
import { speak, LANG } from '../speech.js';
import { bigNum, times } from '../arnum.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const capName = (c) => (c.capAr || '').replace(/\s*\(.*\)\s*/, '');
const popTxt = (p) => (p >= 1e6 ? 'نحو ' + bigNum(p >= 1e7 ? Math.round(p / 1e6) : Math.round(p / 1e5) / 10, 'm') : p >= 1500 ? 'نحو ' + bigNum(Math.round(p / 1e3), 'k') : ar(p));
const langs = (c) => (c.langs?.official?.length ? c.langs.official : c.langs?.defacto || []).map((x) => languages[x]?.ar?.replace(/\s*\(.*\)\s*/, '')).filter(Boolean).slice(0, 3).join('، ') || '—';

export function compareScreen(root) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const me = store.me;
  const visited = Object.keys(me.stamps || {});
  let a = byId[q.get('a')] || byId[visited[visited.length - 1]] || byId.EGY;
  let b = byId[q.get('b')] || byId[visited.find((id) => id !== a.id)] || byId[a.id === 'PSE' ? 'EGY' : 'PSE'];
  const sorted = [...states].sort((x, y) => x.ar.localeCompare(y.ar, 'ar'));
  const sel = (cur, set) => h('select', { class: 'cmp-sel', onchange: (e) => { set(byId[e.target.value]); draw(); } }, sorted.map((s) => h('option', { value: s.id, selected: s.id === cur.id || null }, s.ar)));
  const body = h('div', { class: 'cmp' });
  root.append(owl('اختر دولتين، وانظر كيف تختلفان!'), h('div', { class: 'cmp-pick' }, sel(a, (x) => { a = x; }), h('b', {}, '⚖️'), sel(b, (x) => { b = x; })), body);
  draw();

  function bar(va, vb, fmt) {
    const mx = Math.max(va, vb) || 1;
    const one = (v, c) => h('div', { class: 'cb' }, h('i', { style: { width: Math.max(2, (v / mx) * 100) + '%', background: c } }), h('small', {}, fmt(v)));
    return [one(va, '#2b7fd4'), one(vb, '#e76f51')];
  }
  function draw() {
    const big = a.area >= b.area ? a : b, small = big === a ? b : a;
    const many = a.pop >= b.pop ? a : b, few = many === a ? b : a;
    const north = a.cen && b.cen ? (a.cen[1] < b.cen[1] ? a : b) : null;
    const nb = a.borders.includes(b.id);
    const row = (t, x, y) => h('div', { class: 'cmp-row' }, h('span', { class: 'cl' }, t), h('div', { class: 'cv' }, x), h('div', { class: 'cv' }, y));
    body.replaceChildren(
      h('div', { class: 'cmp-row head' }, h('span'), ...[a, b].map((c) => h('button', { class: 'cmp-c', onclick: () => openCard(c.id) }, h('img', { src: flagUrl(c.f), alt: '' }), h('b', {}, c.ar)))),
      h('div', { class: 'cmp-row maps' }, h('span'), ...[a, b].map((c) => h('div', { class: 'cmp-map' }, miniMap(c.id)))),
      row('🌍 القارة', continents[a.cont], continents[b.cont]),
      row('🏛️ العاصمة', capName(a), capName(b)),
      row('📏 المساحة', ...bar(a.area, b.area, (v) => ar(Math.round(v)) + ' كم²')),
      row('👨‍👩‍👧 السكان', ...(a.id === 'PSE' || b.id === 'PSE' ? [popTxt(a.pop), popTxt(b.pop)] : bar(a.pop, b.pop, popTxt))),
      row('🗣️ اللغة', langs(a), langs(b)),
      row('💰 العملة', a.cur?.ar || '—', b.cur?.ar || '—'),
      h('div', { class: 'panel cmp-sum' },
        h('p', {}, `📏 ${big.ar} أكبر مساحة من ${small.ar}` + (big.area / small.area >= 1.15 ? ` بنحو ${times(Math.round(big.area / small.area))}.` : ' قليلاً.')),
        a.id !== 'PSE' && b.id !== 'PSE' ? h('p', {}, `👨‍👩‍👧 سكان ${many.ar} أكثر من سكان ${few.ar}` + (many.pop / few.pop >= 1.15 ? ` بنحو ${times(Math.round(many.pop / few.pop))}.` : ' قليلاً.')) : null,
        north ? h('p', {}, `🧭 ${north.ar} أبعد شمالاً.`) : null,
        h('p', {}, nb ? `🤝 ${a.ar} و${b.ar} جارتان، بينهما حدود.` : a.cont === b.cont ? `🌍 كلتاهما في قارة ${continents[a.cont]}، لكن لا حدود بينهما.` : '✈️ في قارتين مختلفتين.'),
        h('button', { class: 'btn small soft', onclick: () => speak(body.querySelector('.cmp-sum').innerText.replace('🔊 اسمع', ''), LANG.ar) }, '🔊 اسمع')));
  }
}
