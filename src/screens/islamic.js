import { h } from '../ui.js';
import { createMap, project, svgEl } from '../map.js';
import { holyPlaces, hajjRoutes, states } from '../data.js';
import { openCard } from '../card.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';

export function islamicScreen(root) {
  const fill = (c) => (c.oic ? '#3fb27f' : c.kind === 'territory' && c.id === 'ATA' ? '#eef4f8' : '#e6e1d6');
  let places = [], routeEls = [];
  const scale = () => { const k = m.kPx(); places.forEach((t) => t.setAttribute('font-size', Math.min(22 * k, 14))); };
  const m = createMap({ fill, labels: true, onView: () => scale(), onTap: (id, sub) => id !== 'ATA' && openCard(id, { sub }) });
  const g = m.overlay;

  const routesG = svgEl('g', { class: 'hajj' });
  routeEls = hajjRoutes.map((r) => {
    const d = 'M' + r.pts.map(([la, lo]) => project(la, lo).map((v) => v.toFixed(1)).join(',')).join(' L');
    const p = svgEl('path', { d, class: 'hajj-route', stroke: r.color });
    routesG.append(p); return p;
  });
  g.append(routesG);
  places = holyPlaces.map((pl, i) => {
    const [x, y] = project(pl.lat, pl.lon);
    const t = svgEl('text', { x, y, class: 'holy', 'text-anchor': 'middle' });
    t.textContent = ['🕋', '🕌', '🕌'][i];
    t.addEventListener('pointerup', (e) => { e.stopPropagation(); show(pl); });
    g.append(t); return t;
  });

  const info = h('div', { class: 'story-panel' });
  const show = (pl) => { sfx('tap'); info.replaceChildren(h('b', {}, pl.name), h('p', {}, pl.note), h('button', { class: 'btn soft small', onclick: () => speak(pl.name + '. ' + pl.note, LANG.ar) }, '🔊 اسمع')); speak(pl.name + '. ' + pl.note, LANG.ar); };
  const intro = () => info.replaceChildren(
    h('p', {}, h('span', { class: 'legend-sw', style: { background: '#3fb27f' } }), ` باللون الأخضر: ${states.filter((s) => s.oic).length.toLocaleString('ar-EG')} دولة في منظمة التعاون الإسلامي.`),
    h('div', { class: 'row wrap' },
      holyPlaces.map((pl, i) => h('button', { class: 'chip', onclick: () => { m.zoomTo([...project(pl.lat, pl.lon).map((v) => v - 40), ...project(pl.lat, pl.lon).map((v) => v + 40)]); show(pl); } }, ['🕋', '🕌', '🕌'][i] + ' ' + pl.name))),
    h('div', { class: 'row wrap' }, h('span', {}, '🐫 طرق الحج القديمة:'),
      hajjRoutes.map((r, i) => h('button', { class: 'chip', style: { borderColor: r.color }, onclick: () => {
        routeEls.forEach((p, k) => p.classList.toggle('dim', k !== i));
        const xs = r.pts.map(([la, lo]) => project(la, lo));
        m.zoomTo([Math.min(...xs.map((p) => p[0])), Math.min(...xs.map((p) => p[1])), Math.max(...xs.map((p) => p[0])), Math.max(...xs.map((p) => p[1]))], 900, 0.5).then(scale);
        info.querySelector('.route-note')?.remove();
        info.append(h('p', { class: 'route-note' }, h('b', { style: { color: r.color } }, r.name + ': '), r.note, ' (المسار تقريبي)'));
        speak(r.name + '. ' + r.note, LANG.ar);
      } }, h('i', { class: 'legend-line', style: { background: r.color } }), r.name))),
  );
  intro();
  root.append(m.el, info);
  requestAnimationFrame(() => m.zoomTo([900, 150, 1600, 520], 0, 0.05).then(scale));
}
