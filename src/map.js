// خريطة SVG تفاعلية: سحب، تكبير بإصبعين أو بعجلة الفأرة، لمس الدول، وطبقات إضافية.
import { geoNaturalEarth1 } from 'd3-geo';
import { map as M, byId, contColors } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

export const projection = geoNaturalEarth1().scale(M.proj.scale).translate(M.proj.translate);
export const project = (lat, lon) => projection([lon, lat]);

export function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return `rgb(${r},${g},${b})`;
}
export const defaultFill = (c) => (c.kind === 'territory' && c.id !== 'ATA' ? lighten(contColors[c.cont] || '#ccc', 0.45) : contColors[c.cont] || '#ddd');

export function createMap({ fill = defaultFill, onTap, labels = true, minW = 30, onView } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'map-wrap';
  const svg = S('svg', { class: 'map', viewBox: `0 0 ${M.w} ${M.h}`, preserveAspectRatio: 'xMidYMid meet' });
  const defs = S('defs');
  defs.innerHTML = `<radialGradient id="sea" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#cfeeff"/><stop offset="1" stop-color="#8fcdf5"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.append(defs);
  svg.append(S('rect', { x: -3000, y: -3000, width: M.w + 6000, height: M.h + 6000, fill: 'url(#sea)' }));
  const gLand = S('g', { class: 'land' });
  const gDots = S('g', { class: 'dots' });
  const gOver = S('g', { class: 'overlay' });
  const gLabels = S('g', { class: 'labels' });
  svg.append(gLand, gDots, gOver, gLabels);
  wrap.append(svg);

  const paths = [];
  for (const s of M.shapes) {
    const c = byId[s.id];
    const p = S('path', { d: s.d, 'data-id': s.id, class: 'c' + (c.kind === 'territory' ? ' terr' : '') });
    if (s.sub) p.dataset.sub = s.sub;
    p.style.fill = fill(c);
    gLand.append(p); paths.push(p);
  }
  const dots = [];
  for (const c of Object.values(byId)) {
    if (!c.small || !c.cen || c.id === 'ATA') continue;
    const d = S('circle', { cx: c.cen[0], cy: c.cen[1], r: 3, 'data-id': c.id, class: 'dot' + (c.kind === 'territory' ? ' terr' : '') });
    d.style.fill = fill(c);
    gDots.append(d); dots.push(d);
  }
  const labelEls = [];
  if (labels) {
    for (const c of Object.values(byId)) {
      if (!c.cen || c.id === 'ATA') continue;
      const t = S('text', { x: c.cen[0], y: c.cen[1], class: 'lbl' + (c.kind === 'territory' ? ' terr' : '') });
      t.textContent = c.ar; t.style.display = 'none';
      gLabels.append(t); labelEls.push({ t, c, w: c.bb[2] - c.bb[0] });
    }
  }

  // ---------- العرض والتكبير ----------
  let vb = { x: 0, y: 0, w: M.w, h: M.h };
  const apply = () => { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); };
  const rect = () => svg.getBoundingClientRect();
  const kPx = () => { const r = rect(); return Math.max(vb.w / (r.width || 1), vb.h / (r.height || 1)); };

  function refresh() {
    const k = kPx();
    for (const d of dots) d.setAttribute('r', Math.max(1, (k > 0.6 ? 3.2 : 5.5) * k));
    svg.style.setProperty('--terr-dots', k < 0.6 ? 'inline' : 'none');
    svg.style.setProperty('--k', k);
    onView?.(k);
    if (labels) {
      const fs = 12 * k;
      let shown = 0;
      for (const L of labelEls) {
        const px = L.w / k;
        const inView = L.c.cen[0] > vb.x && L.c.cen[0] < vb.x + vb.w && L.c.cen[1] > vb.y && L.c.cen[1] < vb.y + vb.h;
        const show = inView && (px > 55 || (L.c.small && 1 / k > 3.5)) && shown < 140;
        L.t.style.display = show ? '' : 'none';
        if (show) { L.t.setAttribute('font-size', fs); shown++; }
      }
    }
  }
  let rq = 0;
  const schedule = () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; refresh(); }); };

  function clamp() {
    vb.w = Math.min(Math.max(vb.w, minW), M.w * 1.3);
    vb.h = vb.w * (M.h / M.w);
    const r = rect(); const asp = r.width > 0 && r.height > 0 ? r.height / r.width : M.h / M.w;
    vb.h = vb.w * Math.max(asp, 0.2);
    vb.x = Math.min(Math.max(vb.x, -vb.w * 0.5), M.w - vb.w * 0.5);
    vb.y = Math.min(Math.max(vb.y, -vb.h * 0.5), M.h - vb.h * 0.5);
  }
  function zoomAt(f, cx, cy) {
    const r = rect();
    const k = kPx();
    // نقطة المؤشر بوحدات الخريطة (مع مراعاة توسيط meet)
    const ox = (r.width * k - vb.w) / 2, oy = (r.height * k - vb.h) / 2;
    const mx = vb.x - ox + (cx - r.left) * k, my = vb.y - oy + (cy - r.top) * k;
    vb.w /= f; vb.h /= f;
    vb.x = mx - (mx - vb.x) / f; vb.y = my - (my - vb.y) / f;
    clamp(); apply(); schedule();
  }

  let anim = 0;
  function zoomTo(bb, ms = 700, pad = 0.15) {
    const r = rect(); const asp = r.width > 0 && r.height > 0 ? r.height / r.width : M.h / M.w;
    let w = (bb[2] - bb[0]) * (1 + pad * 2), h = (bb[3] - bb[1]) * (1 + pad * 2);
    w = Math.max(w, h / asp, minW * 1.5);
    h = w * asp;
    const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    const to = { x: cx - w / 2, y: cy - h / 2, w, h };
    const from = { ...vb };
    cancelAnimationFrame(anim);
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (t) => {
        const p = ms <= 0 ? 1 : Math.min(1, Math.max(0, (t - t0) / ms)); const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        vb = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
        apply(); refresh();
        if (p < 1) anim = requestAnimationFrame(step); else res();
      };
      anim = requestAnimationFrame(step);
    });
  }
  const world = (ms) => zoomTo([0, 0, M.w, M.h], ms, 0);
  const zoomToCountry = (id, ms) => { const c = byId[id]; if (c?.bb) return zoomTo(c.bb, ms, c.small ? 3 : 0.4); };

  // ---------- اللمس ----------
  const pts = new Map();
  let moved = false, start = null, pinch = null;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; start = { x: e.clientX, y: e.clientY, vb: { ...vb } }; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; moved = true; }
    cancelAnimationFrame(anim);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.d = d;
    } else if (pts.size === 1 && start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 8) return;
      moved = true;
      const k = kPx();
      vb.x = start.vb.x - dx * k; vb.y = start.vb.y - dy * k;
      clamp(); apply(); schedule();
    }
  });
  const end = (e) => {
    const wasTap = pts.size === 1 && !moved;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) { const p = [...pts.values()][0]; start = { x: p.x, y: p.y, vb: { ...vb } }; }
    if (wasTap && e.type === 'pointerup') {
      svg.releasePointerCapture?.(e.pointerId);
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]');
      if (el && onTap) onTap(el.dataset.id, el.dataset.sub, el);
    }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY); }, { passive: false });

  const zoomBtns = document.createElement('div');
  zoomBtns.className = 'zoom-btns';
  const mk = (txt, fn, label) => { const b = document.createElement('button'); b.textContent = txt; b.setAttribute('aria-label', label); b.onclick = fn; return b; };
  const centerZoom = (f) => { const r = rect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); };
  zoomBtns.append(mk('+', () => centerZoom(1.5), 'تكبير'), mk('−', () => centerZoom(1 / 1.5), 'تصغير'), mk('🌍', () => world(600), 'العالم كله'));
  wrap.append(zoomBtns);

  new ResizeObserver(() => { clamp(); apply(); refresh(); }).observe(wrap);

  const all = () => [...paths, ...dots];
  return {
    el: wrap, svg, overlay: gOver, zoomTo, zoomToCountry, world,
    setFill(fn) { for (const p of all()) p.style.fill = fn(byId[p.dataset.id]); },
    mark(id, cls, on = true) { for (const p of all()) if (p.dataset.id === id) p.classList.toggle(cls, on); },
    clearMarks(cls) { for (const p of all()) p.classList.remove(cls); },
    flash(id, cls = 'flash', ms = 1400) { this.mark(id, cls); setTimeout(() => this.mark(id, cls, false), ms); },
    kPx, refresh,
    get vb() { return vb; },
  };
}

// خط منحنٍ بين نقطتين (لمسارات الطيران والرحلات)
export function arcPath(a, b, bend = 0.25) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return `M${a[0]},${a[1]} Q${mx - dy * bend},${my + dx * bend} ${b[0]},${b[1]}`;
}
export const svgEl = S;
