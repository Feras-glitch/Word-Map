// خريطة SVG تفاعلية: سحب، تكبير بإصبعين أو بعجلة الفأرة، لمس الدول، وطبقات إضافية.
import { geoNaturalEarth1 } from 'd3-geo';
import { map as M, byId, contColors } from './data.js';
import NAT from './data/nature.json';
export { NAT };

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

export function createMap({ fill = defaultFill, onTap, onMiss, labels = true, minW = 30, onView, onNature, dotPx, compass = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'map-wrap';
  const svg = S('svg', { class: 'map', viewBox: `0 0 ${M.w} ${M.h}`, preserveAspectRatio: 'xMidYMid meet' });
  const defs = S('defs');
  defs.innerHTML = `<radialGradient id="sea" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#cfeeff"/><stop offset="1" stop-color="#8fcdf5"/></radialGradient>
    <pattern id="occ" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="transparent"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#7a1f1f" stroke-width="0.55" stroke-opacity=".55"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.append(defs);
  svg.append(S('rect', { x: -3000, y: -3000, width: M.w + 6000, height: M.h + 6000, fill: 'url(#sea)' }));
  const gLand = S('g', { class: 'land' });
  const gDots = S('g', { class: 'dots' });
  const gOver = S('g', { class: 'overlay' });
  const gLabels = S('g', { class: 'labels' });
  const gNat = S('g', { class: 'nature' }); gNat.style.display = 'none';
  const gNatL = S('g', { class: 'nat-labels' }); gNatL.style.display = 'none';
  svg.append(gLand, gNat, gDots, gOver, gLabels, gNatL);
  // الطبقة الطبيعية تُبنى عند أول تشغيل
  let natOn = false, natBuilt = false; const natLbl = [];
  const PRI = { ocean: 0, sea: 1, range: 2, desert: 2, river: 2, lake: 3, peak: 3 };
  function buildNature() {
    natBuilt = true;
    for (const it of NAT.items) {
      if (it.d) gNat.append(S('path', { d: it.d, class: 'nat ' + it.kind, 'data-nat-shape': it.id }));
      const t = S('text', { x: it.xy[0], y: it.xy[1], class: 'nlbl ' + it.kind, 'data-nat': it.id });
      const icon = it.kind === 'peak' ? '▲ ' : '';
      t.textContent = icon + it.ar;
      gNatL.append(t); natLbl.push({ t, it, p: PRI[it.kind] ?? 3 });
    }
    natLbl.sort((a, b) => a.p - b.p);
  }
  function natLabels(k, placed) {
    for (const L of natLbl) {
      const { it } = L; const [cx, cy] = it.xy;
      const inView = cx > vb.x && cx < vb.x + vb.w && cy > vb.y && cy < vb.y + vb.h;
      const lim = [99, 3.2, 2.4, 2.4][L.p] ?? 1.6;
      let show = inView && k < lim;
      const fs = (it.kind === 'ocean' ? 15 : it.kind === 'sea' ? 11.5 : 11) * k;
      if (show) {
        const hw = L.t.textContent.length * fs * 0.3 + fs * 0.3, hh = fs * 0.75;
        const box = [cx - hw, cy - hh, cx + hw, cy + hh];
        if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) show = false; else placed.push(box);
      }
      L.t.style.display = show ? '' : 'none';
      if (show) L.t.setAttribute('font-size', fs);
    }
  }
  wrap.append(svg);

  const paths = [];
  for (const s of M.shapes) {
    const c = byId[s.id];
    const p = S('path', { d: s.d, 'data-id': s.id, class: 'c' + (c.kind === 'territory' ? ' terr' : '') });
    if (s.sub) p.dataset.sub = s.sub;
    p.style.fill = fill(c);
    gLand.append(p); paths.push(p);
  }
  // أراضٍ محتلة: تخطيط فوق الدولة صاحبة الأرض، ولمسها يفتح بطاقة تلك الدولة
  for (const o of M.occupied || []) {
    const p = S('path', { d: o.d, 'data-id': o.of, 'data-sub': 'لمستَ الجولان: أرض سورية محتلة منذ عام ١٩٦٧', class: 'occ' });
    gLand.append(p);
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
    labelEls.sort((a, b) => b.w - a.w);
  }

  // ---------- العرض والتكبير ----------
  let vb = { x: 0, y: 0, w: M.w, h: M.h };
  const apply = () => { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); };
  const rect = () => svg.getBoundingClientRect();
  const kPx = () => { const r = rect(); return Math.max(vb.w / (r.width || 1), vb.h / (r.height || 1)); };

  function refresh() {
    const k = kPx();
    for (const d of dots) d.setAttribute('r', dotPx ? dotPx * k : Math.max(1, (k > 0.6 ? 3.2 : 5.5) * k));
    svg.style.setProperty('--terr-dots', k < 0.6 ? 'inline' : 'none');
    svg.style.setProperty('--k', k);
    onView?.(k);
    const placed = [];
    if (natOn) natLabels(k, placed);
    if (labels) {
      // الأكبر أولاً، ولا نعرض اسماً يتداخل مع اسم ظاهر
      const fs = 12 * k;
      let shown = 0;
      for (const L of labelEls) {
        const px = L.w / k;
        const [cx, cy] = L.c.cen;
        const inView = cx > vb.x && cx < vb.x + vb.w && cy > vb.y && cy < vb.y + vb.h;
        let show = inView && (px > 55 || (L.c.small && 1 / k > 3.5)) && shown < 140;
        if (show) {
          const hw = L.t.textContent.length * fs * 0.3 + fs * 0.3, hh = fs * 0.75;
          const box = [cx - hw, cy - hh, cx + hw, cy + hh];
          if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) show = false;
          else placed.push(box);
        }
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
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      // عناصر مضافة فوق الخريطة (محطات المهام): تستقبل حدث maptap
      const custom = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.closest?.('[data-tap]'))?.closest('[data-tap]');
      if (custom) return custom.dispatchEvent(new Event('maptap'));
      const nat = natOn ? hit?.closest?.('[data-nat]') : null;
      if (nat && onNature) return onNature(nat.dataset.nat);
      const el = hit?.closest?.('[data-id]');
      if (el && onTap) onTap(el.dataset.id, el.dataset.sub, el);
      else if (!el && onMiss) onMiss();
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
  // سهم الشمال (في هذا الإسقاط يبقى الشمال إلى الأعلى)
  if (compass) { const cp = document.createElement('div'); cp.className = 'compass'; cp.setAttribute('aria-label', 'الشمال إلى الأعلى'); cp.innerHTML = '<span>▲</span><b>ش</b><small>N</small>'; wrap.append(cp); }

  new ResizeObserver(() => { clamp(); apply(); refresh(); }).observe(wrap);

  const all = () => [...paths, ...dots];
  return {
    el: wrap, svg, overlay: gOver, zoomTo, zoomToCountry, world,
    setFill(fn) { for (const p of all()) p.style.fill = fn(byId[p.dataset.id]); },
    mark(id, cls, on = true) { for (const p of all()) if (p.dataset.id === id) p.classList.toggle(cls, on); },
    clearMarks(cls) { for (const p of all()) p.classList.remove(cls); },
    flash(id, cls = 'flash', ms = 1400) { this.mark(id, cls); setTimeout(() => this.mark(id, cls, false), ms); },
    kPx, refresh,
    setNature(on) { natOn = on; if (on && !natBuilt) buildNature(); gNat.style.display = gNatL.style.display = on ? '' : 'none'; svg.classList.toggle('nat-on', on); refresh(); },
    zoomToNature(id) {
      const it = NAT.items.find((x) => x.id === id); if (!it) return;
      const sh = gNat.querySelector(`[data-nat-shape="${id}"]`);
      if (sh) { const b = sh.getBBox(); return zoomTo([b.x, b.y, b.x + b.width, b.y + b.height], 700, 0.25); }
      const r = it.kind === 'ocean' ? 300 : it.kind === 'sea' ? 90 : 40;
      return zoomTo([it.xy[0] - r, it.xy[1] - r, it.xy[0] + r, it.xy[1] + r], 700, 0);
    },
    flashNature(id) { const el = gNatL.querySelector(`[data-nat="${id}"]`); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 2400); },
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
