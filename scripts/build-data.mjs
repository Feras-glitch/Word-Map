// يبني ملفات البيانات التي يستخدمها التطبيق بلا إنترنت:
//   src/data/countries.json  — الدول والأقاليم بالأسماء الثلاثة والعواصم والمعلومات
//   src/data/map.json        — مسارات الخريطة المسقطة مسبقاً
//   public/flags/*.svg       — الأعلام المستخدمة فقط
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo';
import { pinyin, customPinyin } from 'pinyin-pro';
// قراءات صحيحة لحروف متعددة النطق في أسماء الأعلام
customPinyin({ 藏语: 'zàng yǔ', 西藏: 'xī zàng', 什: 'shí' });
import * as C from './content.mjs';
import { policy } from './policy.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = require('world-countries');
const topo = JSON.parse(fs.readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'));

const byNum = {}; const by3 = {};
for (const c of countries) { if (c.ccn3) byNum[c.ccn3] = c; by3[c.cca3] = c; }

const ID = (c) => (c.cca3 === 'UNK' ? 'XKX' : c.cca3);
const isState = (c) => (c.unMember || policy.extraStates.includes(ID(c))) && !policy.hidden.includes(ID(c));

function contOf(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'samerica' : 'namerica';
  return { Asia: 'asia', Africa: 'africa', Europe: 'europe', Oceania: 'oceania' }[c.region] || null;
}

function greetingKey(c) {
  const id = ID(c);
  if (C.greetPriority[id]) return C.greetPriority[id];
  const langs = Object.keys(c.languages || {});
  return langs.find((l) => C.greetings[l]) || 'eng';
}

const fixBorder = (b) => policy.borderAlias[b] ?? b;

const out = [];
for (const c of countries) {
  const id = ID(c);
  if (policy.hidden.includes(id) || policy.mergeInto[id]) continue;
  const state = isState(c);
  const terr = !state && c.cca3 !== 'ATA' ? (policy.parents[id] || null) : null;
  if (!state && !terr && c.cca3 !== 'ATA') continue;
  const ar = C.nameFixes[id] || c.translations.ara?.common || c.name.common;
  const zh = (policy.zhFix[id]) || c.translations.zho?.common || '';
  const fx = { ...(C.facts[id] || {}), ...(policy.facts[id] || {}) };
  const ov = policy.overrides[id] || {};
  let borders = (c.borders || []).map(fixBorder).filter((b) => b && b !== id);
  if (ov.borders) borders = ov.borders;
  out.push({
    id,
    f: (id === 'XKX' ? 'xk' : (ov.flag || c.cca2).toLowerCase()),
    ar, en: ov.en || c.name.common, zh,
    py: zh ? pinyin(zh, { toneType: 'symbol', type: 'array' }).join(' ') : '',
    capAr: ov.capAr || C.capitalsAr[id] || '',
    capEn: ov.capEn || C.capitalsEnFix[id] || (c.capital || [])[0] || '',
    cont: c.cca3 === 'ATA' ? 'antarctica' : contOf(c),
    sub: C.subregionsAr[c.subregion] || '',
    area: ov.area || Math.round(c.area || 0),
    borders: [...new Set(borders)],
    landlocked: !!c.landlocked,
    greet: greetingKey(c),
    kind: state ? 'state' : 'territory',
    parent: terr ? terr.p : undefined,
    note: ov.note || (terr ? terr.note : undefined),
    fact: fx.fact, landmark: fx.landmark,
    famous: C.famous.includes(id),
    oic: C.oic.includes(id),
    ll: c.latlng,
  });
}
// ---------- المحتوى الموثّق (الإصدار ١٫٢) ----------
const cldrMain = (loc, file, pick) => pick(JSON.parse(fs.readFileSync(require.resolve(`cldr-localenames-full/main/${loc}/${file}.json`), 'utf8')).main[loc]);
const langNames = Object.fromEntries(['ar', 'en', 'zh'].map((l) => [l, cldrMain(l, 'languages', (m) => m.localeDisplayNames.languages)]));
const curNames = Object.fromEntries(['ar', 'en', 'zh'].map((l) => [l, JSON.parse(fs.readFileSync(require.resolve(`cldr-numbers-full/main/${l}/currencies.json`), 'utf8')).main[l].numbers.currencies]));
const territory = JSON.parse(fs.readFileSync(require.resolve('cldr-core/supplemental/territoryInfo.json'), 'utf8')).supplemental.territoryInfo;
const lexicon = JSON.parse(fs.readFileSync(path.join(root, 'content/languages.json'), 'utf8'));
const curFix = { INR: { ar: 'روبية هندية' } };
const usedLangs = new Set();
const cdir = path.join(root, 'content/countries');
for (const c of out) {
  const f = path.join(cdir, c.id + '.json');
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  c.v2 = true;
  c.cap3 = d.capital; c.capAr = d.capital.ar; c.capEn = d.capital.en;
  if (d.capitalNote) c.capNote = d.capitalNote;
  if (d.landmark) { c.lm3 = d.landmark; c.landmark = d.landmark.ar; }
  if (d.fact) c.fact = d.fact;
  c.langs = d.languages;
  for (const k of ['official', 'regional', 'widespread']) for (const l of d.languages[k] || []) usedLangs.add(l);
  if (d.currency) {
    const code = typeof d.currency === 'string' ? d.currency : null;
    c.cur = code ? { code, ar: curFix[code]?.ar || curNames.ar[code].displayName, en: curNames.en[code].displayName, zh: curNames.zh[code].displayName } : d.currency;
  }
  const t = territory[c.f.toUpperCase()];
  if (t) c.pop = +t._population;
  if (d.currencyNote) c.curNote = d.currencyNote;
  if (d.currencyStory) c.curStory = d.currencyStory;
  c.sources = d.sources;
}
const languages = {};
for (const l of usedLangs) {
  const x = lexicon[l] || {};
  languages[l] = { ar: x.ar || langNames.ar[l] || l, en: x.en || langNames.en[l] || l, zh: x.zh || langNames.zh[l] || '', greet: x.greet || null, sign: !!x.sign };
  if (languages[l].zh) languages[l].py = pinyin(languages[l].zh, { toneType: 'symbol', type: 'array' }).join(' ');
}
for (const c of out) {
  if (c.cap3?.zh) c.cap3.py = pinyin(c.cap3.zh, { toneType: 'symbol', type: 'array' }).join(' ');
  if (c.cur?.zh) c.cur.py = pinyin(c.cur.zh, { toneType: 'symbol', type: 'array' }).join(' ');
  if (c.lm3?.zh) c.lm3.py = pinyin(c.lm3.zh, { toneType: 'symbol', type: 'array' }).join(' ');
}

const ids = new Set(out.map((c) => c.id));
for (const c of out) c.borders = c.borders.filter((b) => ids.has(b));

// ---------- الخريطة ----------
let t = presimplify(topo);
t = simplify(t, quantile(t, 0.55));
const fc = feature(t, t.objects.countries);
const W = 2000, H = 1000;
const proj = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], fc);
const gp = geoPath(proj).digits(1);

const shapes = [];
const unmatched = [];
for (const f of fc.features) {
  let c = f.id ? byNum[f.id] : null;
  let id = c ? ID(c) : (policy.nameToId[f.properties.name] || null);
  if (!id) { unmatched.push(f.properties.name); continue; }
  const sub = policy.subLabels[id];
  if (policy.mergeInto[id]) id = policy.mergeInto[id];
  if (!ids.has(id)) { unmatched.push(f.properties.name + '→' + id); continue; }
  const d = gp(f);
  if (!d) continue;
  shapes.push({ id, d, ...(sub ? { sub } : {}) });
}

// مربع الإحاطة والمركز لكل كيان: نعتمد "الأرض الأم" (أكبر جزء وما قرب منه أو كبر)
// حتى لا يبتعد التكبير إلى جزر بعيدة مثل غويانا الفرنسية أو سفالبارد
const parts = {};
for (const f of fc.features) {
  const c = f.id ? byNum[f.id] : null;
  let id = c ? ID(c) : policy.nameToId[f.properties.name];
  if (!id) continue;
  if (policy.mergeInto[id]) id = policy.mergeInto[id];
  if (!ids.has(id)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const coords of polys) {
    const g = { type: 'Polygon', coordinates: coords };
    (parts[id] ||= []).push({ a: gp.area(g), b: gp.bounds(g), c: gp.centroid(g) });
  }
}
const geo = {};
for (const [id, ps] of Object.entries(parts)) {
  ps.sort((x, y) => y.a - x.a);
  const L = ps[0];
  const near = (p) => Math.hypot(p.c[0] - L.c[0], p.c[1] - L.c[1]) < 60;
  const main = ps.filter((p) => p === L || p.a >= L.a * 0.35 || near(p));
  const b = [[Math.min(...main.map((p) => p.b[0][0])), Math.min(...main.map((p) => p.b[0][1]))], [Math.max(...main.map((p) => p.b[1][0])), Math.max(...main.map((p) => p.b[1][1]))]];
  let cen = L.c;
  if (!isFinite(cen[0])) cen = [(L.b[0][0] + L.b[1][0]) / 2, (L.b[0][1] + L.b[1][1]) / 2];
  // روسيا تعبر خط الطول ١٨٠ فيظهر طرفها الشرقي في أقصى يسار الخريطة
  if (id === 'RUS') b[0][0] = Math.max(b[0][0], 950);
  geo[id] = { b, a: ps.reduce((s, p) => s + p.a, 0), cen };
}
const r1 = (v) => Math.round(v * 10) / 10;
for (const c of out) {
  const g = geo[c.id];
  if (g) {
    c.bb = [r1(g.b[0][0]), r1(g.b[0][1]), r1(g.b[1][0]), r1(g.b[1][1])];
    c.cen = [r1(g.cen[0]), r1(g.cen[1])];
    c.small = g.a < 40; // مساحة صغيرة جداً على الشاشة: نضيف دائرة يسهل لمسها
  } else if (c.ll) {
    const p = proj([c.ll[1], c.ll[0]]);
    c.cen = [r1(p[0]), r1(p[1])];
    c.bb = [c.cen[0] - 2, c.cen[1] - 2, c.cen[0] + 2, c.cen[1] + 2];
    c.small = true; c.dotOnly = true;
  }
  delete c.ll;
}

const pr = { scale: proj.scale(), translate: proj.translate() };
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/countries.json'), JSON.stringify(out));
fs.writeFileSync(path.join(root, 'src/data/map.json'), JSON.stringify({ w: W, h: H, proj: pr, shapes }));
fs.writeFileSync(path.join(root, 'src/data/languages.json'), JSON.stringify(languages));

// ---------- الأعلام ----------
const flagDir = path.join(root, 'src/flags');
fs.rmSync(flagDir, { recursive: true, force: true });
fs.mkdirSync(flagDir, { recursive: true });
const src = path.join(path.dirname(require.resolve('flag-icons/package.json')), 'flags/4x3');
let missing = [];
for (const c of out) {
  const s = path.join(src, c.f + '.svg');
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(flagDir, c.f + '.svg')); else missing.push(c.id);
}

const states = out.filter((c) => c.kind === 'state');
console.log(`محتوى موثّق: ${out.filter((c) => c.v2).length} دولة | لغات: ${Object.keys(languages).length}`);
console.log(`دول: ${states.length} | أقاليم: ${out.length - states.length} | أشكال: ${shapes.length}`);
console.log('بلا شكل على الخريطة (نقطة):', out.filter((c) => c.dotOnly).map((c) => c.id).join(' '));
console.log('أشكال غير مطابقة:', unmatched.join(', ') || '—');
console.log('أعلام ناقصة:', missing.join(' ') || '—');
console.log('دول بلا عاصمة عربية:', states.filter((c) => !c.capAr).map((c) => c.id).join(' ') || '—');
