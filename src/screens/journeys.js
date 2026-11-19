// شاشة «رحلاتي»: المسار المرتب، والدولة التالية بارزة
import { h, owl } from '../ui.js';
import { store } from '../store.js';
import { byId, flagUrl } from '../data.js';
import { journeyState } from '../journeys.js';
import { openCard } from '../card.js';
import { sfx } from '../sfx.js';

const A = (n) => n.toLocaleString('ar-EG');
export function journeysScreen(root, { go }) {
  const showOnMap = (id) => { try { sessionStorage.setItem('openCountry', id); } catch { /* */ } go('explore'); };
  const draw = () => {
    const me = store.me; const { list, current } = journeyState(me);
    root.innerHTML = '';
    root.append(owl(current ? `رحلتنا الآن: «${current.title}». الدولة التالية: ${byId[current.next].ar}.` : 'أكملت الرحلات كلها! ما أروع هذا.'));
    for (const j of list) {
      const isCur = current && j.id === current.id;
      root.append(h('details', { class: 'panel journey' + (j.complete ? ' done' : '') + (isCur ? ' current' : ''), open: isCur || null },
        h('summary', {}, h('span', { class: 'j-icon' }, j.icon), h('span', { class: 'j-title' }, h('b', {}, j.title), j.sub ? h('small', {}, j.sub) : null),
          h('span', { class: 'j-count' }, j.complete ? '🏅' : `${A(j.done)} من ${A(j.total)}`)),
        h('div', { class: 'bar' }, h('i', { style: { width: (j.done / j.total) * 100 + '%' } })),
        h('div', { class: 'j-list' }, j.ids.map((id) => {
          const c = byId[id]; const visited = !!me.stamps[id]; const next = isCur && id === j.next;
          return h('button', { class: 'j-item' + (visited ? ' on' : '') + (next ? ' next' : ''), onclick: () => { sfx('tap'); openCard(id, { onShowOnMap: showOnMap, onClose: draw }); } },
            h('img', { src: flagUrl(c.f), alt: '' }), h('span', {}, c.ar), h('small', {}, me.gold?.[id] ? '🥇' : visited ? '✅' : next ? 'التالي ←' : ''));
        }))));
    }
  };
  draw();
}
