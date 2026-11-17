import { h } from '../ui.js';
import { createMap, defaultFill, lighten } from '../map.js';
import { contOrder, continents, contEmoji, contBox, contColors, search, flagUrl, byId } from '../data.js';
import { openCard } from '../card.js';
import { store } from '../store.js';
import { sfx } from '../sfx.js';

export function exploreScreen(root) {
  const me = store.me;
  // الدول المزارة بلون كامل، والباقي بلون أفتح قليلاً
  const fill = (c) => (c.kind === 'state' && !me.stamps[c.id] ? lighten(contColors[c.cont], 0.25) : defaultFill(c));
  const m = createMap({
    fill,
    onTap: (id, sub) => {
      if (id === 'ATA') return;
      openCard(id, { sub, onShowOnMap: show });
      setTimeout(() => m.setFill(fill), 1200);
    },
  });
  const show = (id) => { m.zoomToCountry(id); m.flash(id, 'flash', 2400); };

  const results = h('div', { class: 'search-results' });
  const input = h('input', { class: 'input search', type: 'search', placeholder: '🔎 ابحث عن دولة أو عاصمة…', oninput: () => {
    results.innerHTML = '';
    for (const c of search(input.value)) results.append(h('button', { class: 'res', onclick: () => {
      input.value = ''; results.innerHTML = ''; input.blur(); show(c.id); setTimeout(() => openCard(c.id, { onShowOnMap: show }), 750);
    } }, h('img', { src: flagUrl(c.f), alt: '' }), h('b', {}, c.ar), h('small', {}, c.en)));
  } });

  const conts = h('div', { class: 'cont-bar' }, contOrder.map((k) => h('button', { class: 'cont-btn', style: { '--c': contColors[k] }, onclick: () => { sfx('tap'); m.zoomTo(contBox[k]); } }, contEmoji[k] + ' ' + continents[k])));

  root.append(h('div', { class: 'map-tools' }, input, results), m.el, conts);
  requestAnimationFrame(() => {
    const r = m.el.getBoundingClientRect();
    // على الهاتف العمودي نبدأ من منطقتنا (الوطن العربي وما حوله) بدل العالم الصغير
    if (r.height > r.width * 1.1) m.zoomTo([820, 150, 1420, 560], 0, 0); else m.refresh();
  });
  // فتح مباشر لدولة من شاشة أخرى
  const want = sessionStorage.getItem('openCountry');
  if (want && byId[want]) { sessionStorage.removeItem('openCountry'); setTimeout(() => { show(want); openCard(want, { onShowOnMap: show }); }, 300); }
}
