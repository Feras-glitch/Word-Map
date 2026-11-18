// طبقة الجغرافيا الطبيعية: نختار من Natural Earth أشكال المعالم الواردة في content/nature.json فقط
import fs from 'node:fs';
import path from 'node:path';
import { pinyin } from 'pinyin-pro';

export function buildNature(root, proj) {
  const C = JSON.parse(fs.readFileSync(path.join(root, 'content/nature.json'), 'utf8'));
  if (C.review === 'pending' && !process.env.PREVIEW) return null;
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(root, 'content/ne', f), 'utf8')).features;
  const rivers = rd('ne_50m_rivers_lake_centerlines.geojson');
  const lakes = rd('ne_50m_lakes.geojson');
  const regions = rd('ne_50m_geography_regions_polys.geojson');
  const near = (geom, at, deg = 25) => JSON.stringify(geom.coordinates).match(/-?\d+\.?\d*,-?\d+\.?\d*/g).some((s) => { const [x, y] = s.split(',').map(Number); return Math.abs(x - at[0]) < deg && Math.abs(y - at[1]) < deg; });

  // تبسيط دوغلاس-بوكر على النقاط المسقطة
  const simp = (pts, tol) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); let md = 0, mi = -1;
      const [x1, y1] = pts[a], [x2, y2] = pts[b]; const dx = x2 - x1, dy = y2 - y1; const L = Math.hypot(dx, dy) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > md) { md = d; mi = i; } }
      if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const line = (coords, close, tol) => {
    const p = simp(coords.map((c) => proj(c)).filter(Boolean), tol);
    if (p.length < 2) return '';
    return 'M' + p.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join('L') + (close ? 'Z' : '');
  };
  const pathOf = (g, tol) => {
    const T = g.type;
    if (T === 'LineString') return line(g.coordinates, false, tol);
    if (T === 'MultiLineString') return g.coordinates.map((l) => line(l, false, tol)).join('');
    if (T === 'Polygon') return g.coordinates.map((r) => line(r, true, tol)).join('');
    if (T === 'MultiPolygon') return g.coordinates.flatMap((p) => p.map((r) => line(r, true, tol))).join('');
    return '';
  };

  const items = C.items.map((it) => {
    const [x, y] = proj(it.at);
    const o = { id: it.id, kind: it.kind, ar: it.ar, en: it.en, zh: it.zh, py: pinyin(it.zh.replace(/[（）()]/g, ' '), { toneType: 'symbol', type: 'array' }).filter((s) => s.trim()).join(' '), fact: it.fact, xy: [+x.toFixed(1), +y.toFixed(1)] };
    Object.defineProperty(o, '_at', { value: it.at, enumerable: false });
    if (it.ne) {
      const names = new Set(it.ne);
      let src = [];
      if (it.kind === 'river') src = rivers.filter((f) => names.has(f.properties.name) && near(f.geometry, it.at));
      else if (it.kind === 'lake') src = lakes.filter((f) => names.has(f.properties.name) && near(f.geometry, it.at, 10));
      else src = regions.filter((f) => names.has(f.properties.NAME) && near(f.geometry, it.at, 40));
      if (!src.length) console.warn('⚠️ لم يُعثر على شكل:', it.id);
      const tol = it.kind === 'river' ? 0.6 : 0.8;
      o.d = src.map((f) => pathOf(f.geometry, tol)).join('');
      Object.defineProperty(o, '_geo', { value: src.map((f) => f.geometry), enumerable: false });
    }
    return o;
  });
  return { kinds: C.kinds, items };
}
