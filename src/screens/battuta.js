import { h, confetti } from '../ui.js';
import { createMap, project, arcPath, svgEl, lighten } from '../map.js';
import { ibnBattuta, byId, flagUrl, contColors } from '../data.js';
import { store } from '../store.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';
import { openCard } from '../card.js';

export function battutaScreen(root) {
  const me = store.me;
  let i = Math.min(me.battuta || 0, ibnBattuta.length - 1);
  const pts = ibnBattuta.map((s) => project(s.lat, s.lon));
  let stops = [], camelPos = null;
  const m = createMap({ fill: (c) => lighten(contColors[c.cont] || '#ddd', 0.35), labels: false, onTap: (id) => id !== 'ATA' && openCard(id), onView: (k) => { stops.forEach((c, n) => c.setAttribute('r', (n === i ? 7 : 4.5) * k)); if (camelPos) place(camelPos); } });
  const g = m.overlay;
  const route = svgEl('g', { class: 'route' });
  g.append(route);
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const p = svgEl('path', { d: arcPath(pts[i - 1], pts[i], 0.18), class: 'seg' });
    route.append(p); segs.push(p);
  }
  stops = pts.map((p, i) => { const c = svgEl('circle', { cx: p[0], cy: p[1], r: 4, class: 'stop' }); c.dataset.i = i; route.append(c); return c; });
  const camel = svgEl('text', { class: 'camel', 'text-anchor': 'middle' });
  camel.textContent = '🐪';
  route.append(camel);

  const panel = h('div', { class: 'story-panel' });
  root.append(m.el, panel);

  function place(p) { camelPos = p; const k = m.kPx(); camel.setAttribute('x', p[0]); camel.setAttribute('y', p[1] - 4 * k); camel.setAttribute('font-size', 26 * k); }
  function draw(animate) {
    const s = ibnBattuta[i];
    segs.forEach((p, k) => p.classList.toggle('on', k < i));
    stops.forEach((c, k) => { c.classList.toggle('on', k <= i); c.classList.toggle('now', k === i); c.setAttribute('r', (k === i ? 7 : 4.5) * m.kPx()); });
    const a = pts[Math.max(0, i - 1)], b = pts[i];
    const pad = i === 0 ? 120 : 30;
    const bb = [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad];
    m.zoomTo(bb, animate ? 1100 : 0, 0.25).then(() => { place(b); stops.forEach((c, k) => c.setAttribute('r', (k === i ? 7 : 4.5) * m.kPx())); });
    if (animate && i > 0) {
      // تحريك الجمل على المسار
      const seg = segs[i - 1]; const L = seg.getTotalLength(); const t0 = performance.now(); sfx('whoosh');
      const step = (t) => { const p = Math.min(1, Math.max(0, (t - t0) / 1100)); const q = seg.getPointAtLength(L * p); place([q.x, q.y]); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    } else place(b);
    const c = byId[s.cc];
    panel.replaceChildren(
      h('div', { class: 'sp-head' },
        h('span', { class: 'sp-year' }, s.year.toLocaleString('ar-EG', { useGrouping: false }) + ' م'),
        h('b', {}, '📍 ' + s.city), c ? h('button', { class: 'chip', onclick: () => openCard(c.id) }, h('img', { src: flagUrl(c.f), alt: '' }), c.ar) : null,
        h('span', { class: 'sp-n' }, (i + 1).toLocaleString('ar-EG') + ' / ' + ibnBattuta.length.toLocaleString('ar-EG'))),
      h('p', {}, s.story),
      h('div', { class: 'row' },
        h('button', { class: 'btn soft', disabled: i === 0, onclick: () => { i--; draw(false); } }, '→ السابق'),
        h('button', { class: 'btn soft', onclick: () => speak(s.city + '. ' + s.story, LANG.ar) }, '🔊 اسمع'),
        i < ibnBattuta.length - 1
          ? h('button', { class: 'btn', onclick: () => { i++; store.patch((p) => { p.battuta = Math.max(p.battuta || 0, i); }); draw(true); setTimeout(() => speak(ibnBattuta[i].city + '. ' + ibnBattuta[i].story, LANG.ar), 1150); } }, 'التالي ←')
          : h('button', { class: 'btn', onclick: () => { i = 0; draw(true); } }, '🔁 من البداية')),
    );
    if (i === ibnBattuta.length - 1 && store.badge('battuta')) { confetti(); sfx('win'); speak('مبارك! أكملت رحلة ابن بطوطة كلها، قطعت معه العالم القديم!', LANG.ar); }
  }
  requestAnimationFrame(() => { draw(false); if (i === 0) setTimeout(() => speak('هيا نسافر مع ابن بطوطة، أعظم رحالة في التاريخ. ' + ibnBattuta[0].story, LANG.ar), 400); });
}
