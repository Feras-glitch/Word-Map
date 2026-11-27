// حيوانات القارات: ما تشتهر به كل قارة، ثم ما تشتهر به دولها (حيوان أو طعام أو نبات)
import { h, owl } from '../ui.js';
import { states, continents } from '../data.js';
import { continentAnimals, secondPhoto, KIND } from '../photos.js';
import { openCard } from '../card.js';
import { speak, LANG } from '../speech.js';

const ORDER = ['asia', 'africa', 'europe', 'namerica', 'samerica', 'oceania', 'antarctica'];
const EMO = { asia: '🐼', africa: '🦁', europe: '🦊', namerica: '🦬', samerica: '🐆', oceania: '🐨', antarctica: '🐧' };

export function animalsScreen(root, { go }) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const list = ORDER.filter((k) => continentAnimals(k).length || states.some((s) => s.cont === k && secondPhoto(s.id)));
  if (!list.length) { root.append(owl('الصور في الطريق! ستظهر هنا قريباً.')); return; }
  let cur = list.includes(q.get('c')) ? q.get('c') : list[0];
  const tabs = h('div', { class: 'chips an-tabs' }); const body = h('div', {});
  root.append(owl('لكل قارة حيوانات تشتهر بها. المس الصورة لتسمع اسمها!'), tabs, body);
  draw();
  function draw() {
    tabs.replaceChildren(...list.map((k) => h('button', { class: 'chip' + (k === cur ? ' on' : ''), onclick: () => { cur = k; history.replaceState(null, '', '#animals?c=' + k); draw(); } }, EMO[k] + ' ' + continents[k])));
    const an = continentAnimals(cur);
    const sec = states.filter((s) => s.cont === cur && secondPhoto(s.id)).sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));
    body.replaceChildren(
      an.length ? h('h2', { class: 'sec-title' }, EMO[cur] + ' حيوانات تشتهر بها قارة ' + continents[cur]) : '',
      an.length ? h('div', { class: 'an-grid' }, an.map((a) => tile(a.url, a.ar, '🐾', () => speak(a.ar, LANG.ar), a))) : '',
      sec.length ? h('h2', { class: 'sec-title' }, '🗺️ وبماذا تشتهر دولها؟') : '',
      sec.length ? h('div', { class: 'an-grid small' }, sec.map((s) => { const p = secondPhoto(s.id); return tile(p.url, p.ar, (KIND[p.kind] || KIND.animal).icon, () => { speak(p.ar + '، من ' + s.ar, LANG.ar); openCard(s.id); }, p, s.ar); })) : '');
  }
  function tile(url, name, icon, onclick, p, sub) {
    return h('figure', { class: 'an-tile', onclick },
      h('img', { src: url, alt: name, loading: 'lazy' }),
      h('figcaption', {}, h('b', {}, icon + ' ' + name), sub ? h('small', {}, sub) : '', h('small', { class: 'cr', dir: 'ltr' }, '📷 ' + p.artist.slice(0, 40) + ' · ' + p.license)));
  }
}
