// بطاقات المفاهيم: كلمات الجغرافيا الأساسية مشروحة برسم وجملتين بصوت البومة
import { h, modal, owlSVG } from './ui.js';
import { map as M, byId, contColors, continents } from './data.js';
import { miniMap, regionBox } from './minimap.js';
import { speak, LANG } from './speech.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text) e.textContent = text; return e; };
// إسقاط Natural Earth نفسه المستعمل في رسم الخريطة: من خط الطول والعرض إلى موضع على الخريطة
export function project(lon, lat) {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return [M.proj.translate[0] + M.proj.scale * x, M.proj.translate[1] - M.proj.scale * y];
}
// خريطة العالم الصغيرة، تُلوَّن الدول بدالة
function world(fill, extra = []) {
  const svg = S('svg', { class: 'concept-map', viewBox: '40 60 1920 800', role: 'img' });
  svg.append(S('rect', { x: 0, y: 0, width: 2000, height: 1000, fill: '#cfeeff' }));
  for (const sh of M.shapes) if (sh.id !== 'ATA') svg.append(S('path', { d: sh.d, fill: fill(byId[sh.id]) || '#eef1f5', stroke: '#fff', 'stroke-width': 1 }));
  svg.append(...extra);
  return svg;
}

export const CONCEPTS = {
  continent: {
    icon: '🌍', title: 'ما القارة؟',
    lines: ['القارة أرض واسعة جداً فيها دول كثيرة.', 'في العالم سبع قارات: آسيا وأفريقيا وأوروبا وأمريكا الشمالية وأمريكا الجنوبية وأوقيانوسيا، والقارة القطبية الجنوبية التي يغطيها الجليد.', 'كل لون على هذه الخريطة قارة.'],
    draw: () => world((c) => contColors[c?.cont]),
    legend: () => h('div', { class: 'legend' }, Object.entries(continents).filter(([k]) => k !== 'antarctica').map(([k, t]) => h('span', {}, h('i', { style: { background: contColors[k] } }), t))),
  },
  capital: {
    icon: '🏛️', title: 'ما العاصمة؟',
    lines: ['العاصمة هي المدينة التي فيها حكومة الدولة.', 'لكل دولة عاصمة. عاصمة مصر هي القاهرة، وهي النجمة على هذه الخريطة.', 'والعاصمة ليست دائماً أكبر مدينة في الدولة.'],
    draw: () => { const svg = miniMap('EGY'); const [x, y] = project(31.24, 30.04); svg.append(S('text', { x, y, 'font-size': 9, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, '⭐'), S('text', { x, y: y + 13, 'font-size': 8, 'font-weight': 800, 'text-anchor': 'middle', fill: '#1f2a44', stroke: '#fff', 'stroke-width': 2.5, 'paint-order': 'stroke' }, 'القاهرة')); return svg; },
  },
  border: {
    icon: '🤝', title: 'ما الحدود، ومن الجيران؟',
    lines: ['الحدود خط يفصل أرض دولة عن أرض الدولة التي بجانبها.', 'والدول التي تشترك مع دولة في حدودها هي جيرانها.', 'على هذه الخريطة مصر بلون، وجيرانها بلون أصفر: فلسطين وليبيا والسودان.'],
    draw: () => miniMap('EGY', { highlight: byId.EGY.borders, box: regionBox(byId.EGY, 2.3) }),
  },
  directions: {
    icon: '🧭', title: 'الجهات الأربع',
    lines: ['في الخريطة: الشمال في الأعلى، والجنوب في الأسفل، والشرق إلى اليمين، والغرب إلى اليسار.', 'تشرق الشمس من الشرق وتغرب في الغرب.', 'والبوصلة تدلّنا دائماً على الشمال.'],
    draw: () => {
      const svg = S('svg', { class: 'concept-map', viewBox: '0 0 240 200', role: 'img' });
      svg.append(S('rect', { x: 0, y: 0, width: 240, height: 200, fill: '#fff8ec' }), S('circle', { cx: 120, cy: 100, r: 62, fill: '#fff', stroke: '#1f2a44', 'stroke-width': 3 }),
        S('path', { d: 'M120 46 L132 100 L108 100 Z', fill: '#e5484d' }), S('path', { d: 'M120 154 L132 100 L108 100 Z', fill: '#9aa5b8' }),
        S('text', { x: 120, y: 30, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#e5484d' }, 'الشمال'), S('text', { x: 120, y: 188, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900 }, 'الجنوب'),
        S('text', { x: 232, y: 106, 'text-anchor': 'start', 'font-size': 20, 'font-weight': 900 }, 'الشرق'), S('text', { x: 8, y: 106, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 900 }, 'الغرب'));
      return svg;
    },
  },
  equator: {
    icon: '☀️', title: 'ما خط الاستواء؟',
    lines: ['خط الاستواء خط نتخيّله حول وسط الأرض، يقسمها نصفين: شمالي وجنوبي.', 'البلاد القريبة منه حارّة طوال السنة.', 'وكلما ابتعدنا عنه نحو الشمال أو الجنوب صار الجو أبرد.'],
    draw: () => { const y = M.proj.translate[1]; return world((c) => (c ? '#e6ecd9' : '#eef1f5'), [S('line', { x1: 40, x2: 1960, y1: y, y2: y, stroke: '#e5484d', 'stroke-width': 7, 'stroke-dasharray': '26 14' }), S('text', { x: 1000, y: y - 16, 'text-anchor': 'middle', 'font-size': 60, 'font-weight': 900, fill: '#e5484d', stroke: '#fff', 'stroke-width': 10, 'paint-order': 'stroke' }, 'خط الاستواء')]); },
  },
  language: {
    icon: '🗣️', title: 'لماذا تختلف اللغات؟',
    lines: ['عاش الناس قديماً في أماكن متباعدة، فصار لكل قوم كلماتهم التي يتفاهمون بها.', 'في العالم اليوم آلاف اللغات، وبعض الدول فيها لغات كثيرة.', 'واللغة الرسمية هي التي تكتب بها الدولة قوانينها وتعلّم بها في مدارسها.'],
    draw: () => h('div', { class: 'hello-bubbles' }, [['مرحباً', 'ar'], ['Hello', 'en'], ['你好', 'zh'], ['Hola', 'es'], ['Bonjour', 'fr'], ['Merhaba', 'tr']].map(([t, l]) => h('span', { lang: l }, t))),
  },
};
export const CONCEPT_ORDER = ['continent', 'capital', 'border', 'directions', 'equator', 'language'];

const sayAll = (c) => speak(c.title + ' ' + c.lines.join(' '), LANG.ar);
export function conceptView(key) {
  const c = CONCEPTS[key];
  return h('div', { class: 'concept' },
    h('div', { class: 'concept-head' }, h('div', { class: 'owl-wrap', html: owlSVG(56) }), h('h3', {}, c.icon + ' ' + c.title), h('button', { class: 'say', 'aria-label': 'استمع', onclick: () => sayAll(c) }, '🔊')),
    h('div', { class: 'concept-draw' }, c.draw()), c.legend?.(),
    c.lines.map((l) => h('p', {}, l)));
}
export function openConcept(key) { modal(conceptView(key), { cls: 'concept-modal' }); setTimeout(() => sayAll(CONCEPTS[key]), 300); }
// زر «؟» صغير بجانب الكلمة يفتح شرحها
export const conceptBtn = (key) => h('button', { class: 'q-mark', 'aria-label': 'ما معنى هذا؟', onclick: (e) => { e.stopPropagation(); openConcept(key); } }, '؟');

export function conceptsScreen(root) {
  root.append(h('p', { class: 'hint' }, 'كلمات يستعملها كل مستكشف. المس البطاقة لتسمع شرحها.'),
    ...CONCEPT_ORDER.map((k) => h('div', { class: 'panel' }, conceptView(k))));
}
