// خريطة صغيرة داخل بطاقة الدولة: الدولة ملوّنة بين جيرانها، ليرتبط الاسم والعلم بالمكان
import { map as M, byId, contColors } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// صندوق العرض: الدولة في الوسط ومعها ما حولها
export function regionBox(c, pad = 1.7, minHalf = 70) {
  const bb = c.bb || [c.cen[0] - 4, c.cen[1] - 4, c.cen[0] + 4, c.cen[1] + 4];
  const [cx, cy] = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
  let hw = Math.max(((bb[2] - bb[0]) / 2) * pad, minHalf), hh = Math.max(((bb[3] - bb[1]) / 2) * pad, minHalf * 0.75);
  if (hw * 0.75 < hh) hw = hh / 0.75; else hh = hw * 0.75;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

export function miniMap(id, { highlight = [], box } = {}) {
  const c = byId[id];
  const b = box || regionBox(c);
  const svg = S('svg', { class: 'mini-map', viewBox: `${b[0]} ${b[1]} ${b[2] - b[0]} ${b[3] - b[1]}`, preserveAspectRatio: 'xMidYMid slice', role: 'img', 'aria-label': 'موقع ' + (c?.ar || '') + ' على الخريطة' });
  svg.append(S('rect', { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], fill: '#cfeeff' }));
  const hit = (x) => !x?.bb || !(x.bb[2] < b[0] || x.bb[0] > b[2] || x.bb[3] < b[1] || x.bb[1] > b[3]);
  const px = (b[2] - b[0]) / 170; // وحدة خريطة لكل بكسل تقريباً
  for (const sh of M.shapes) {
    const x = byId[sh.id]; if (sh.id === 'ATA' || !hit(x)) continue;
    const on = sh.id === id; const hl = highlight.includes(sh.id);
    svg.append(S('path', { d: sh.d, fill: on ? (contColors[c.cont] || '#f6a15b') : hl ? '#ffe9a8' : '#eef1f5', stroke: on ? '#1f2a44' : '#b9c2d0', 'stroke-width': (on ? 1.6 : 0.6) * px, 'stroke-linejoin': 'round' }));
  }
  // الدول الصغيرة جداً: دائرة تدل على مكانها
  if (c && (c.small || !c.bb || (c.bb[2] - c.bb[0]) < 9 * px)) {
    const [x, y] = c.cen || [(c.bb[0] + c.bb[2]) / 2, (c.bb[1] + c.bb[3]) / 2];
    svg.append(S('circle', { cx: x, cy: y, r: 9 * px, fill: 'none', stroke: '#e5484d', 'stroke-width': 2.2 * px }), S('circle', { cx: x, cy: y, r: 2.5 * px, fill: '#e5484d' }));
  }
  return svg;
}
