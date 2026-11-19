// اختبارات آلية تُشغَّل قبل كل بناء (npm test). فشل أي منها يوقف النشر.
// تغطي البيانات والمنطق الذي لا يحتاج متصفحاً: الأختام، التأنيث، التشكيل، قوائم الأسئلة.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const json = (f) => JSON.parse(read(f));
let n = 0;
const test = async (name, fn) => { try { await fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name, '\n ', e.message); process.exitCode = 1; } };
const strip = (t) => t.replace(/[ً-ْٰـ]/g, '');

const countries = json('src/data/countries.json');
const states = countries.filter((c) => c.kind === 'state');
const byId = Object.fromEntries(countries.map((c) => [c.id, c]));

await test('١٩٥ دولة، ولكل دولة علم وعاصمة وقارة وموقع', () => {
  assert.equal(states.length, 195);
  for (const c of states) {
    assert.ok(c.ar && c.en && c.zh, c.id + ' أسماء');
    assert.ok(c.capAr, c.id + ' عاصمة');
    assert.ok(c.cont, c.id + ' قارة');
    assert.ok(c.cen || c.bb, c.id + ' موقع');
    assert.ok(fs.existsSync(new URL(`../src/flags/${c.f}.svg`, import.meta.url)), c.id + ' علم');
  }
});

await test('الجوار متبادل، وكل جار موجود', () => {
  for (const c of states) for (const b of c.borders) { assert.ok(byId[b], `${c.id}: جار مجهول ${b}`); if (byId[b].kind === 'state') assert.ok(byId[b].borders.includes(c.id), `${c.id}↔${b}`); }
});

await test('الثوابت التحريرية', () => {
  assert.ok(!byId.ISR || byId.ISR.kind !== 'state', 'لا تُعرض إسرائيل دولة');
  assert.equal(byId.PSE.capAr, 'القدس الشريف (بيت المقدس)');
  assert.equal(byId.PSE.gov.type, 'occupied');
  assert.ok(byId.XKX?.kind === 'state', 'كوسوفو دولة');
  assert.ok(!states.some((c) => ['ESH', 'TWN'].includes(c.id)), 'الصحراء الغربية وتايوان ليستا دولتين منفصلتين');
});

await test('قائمة الأعلام المتشابهة تستعمل رموزاً موجودة', () => {
  const m = read('src/quiz.js').match(/const LOOKALIKE = (\[\[[\s\S]*?\]\]);/);
  assert.ok(m, 'القائمة موجودة');
  const groups = JSON.parse(m[1].replace(/'/g, '"'));
  for (const g of groups) for (const id of g) assert.ok(byId[id], 'رمز مجهول في الأعلام المتشابهة: ' + id);
  assert.ok(groups.some((g) => g.includes('ARE') && g.includes('KWT')), 'الإمارات والكويت معاً');
});

await test('التشكيل لا يغيّر الحروف', () => {
  // قاموس الكلمات قد يعدّل الإملاء عمداً ليصحّ النطق الآلي (مثل «سول»)، فالشرط على قاموس النصوص
  for (const f of ['content/tashkeel-text.json']) {
    const d = json(f); const o = d.texts;
    for (const [k, v] of Object.entries(o)) assert.equal(strip(v), strip(k), `${f}: ${k}`);
  }
});

await test('كل معلومة ومعلم له تشكيل', () => {
  const T = json('content/tashkeel-text.json').texts; const W = json('content/tashkeel.json').words;
  for (const c of states) {
    if (c.fact) assert.ok(T[c.fact], 'معلومة بلا تشكيل: ' + c.id);
    if (c.landmark) assert.ok(T[c.landmark] || W[c.landmark], 'معلم بلا تشكيل: ' + c.id);
  }
});

// ----- منطق يحتاج تخزيناً: نضع بديلاً بسيطاً عن localStorage -----
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = { dispatchEvent() {} };
const { store } = await import('../src/store.js');
const M = await import('../src/mastery.js');
const G = await import('../src/gender.js');

await test('الختم الذهبي: العلم والعاصمة في يومين مختلفين', () => {
  const p = store.addProfile({ name: 'اختبار', avatar: '🦁', level: 2, gender: 'f' });
  const day = (d) => new Date(Date.now() + d * 864e5).toLocaleDateString('en-CA');
  store.patch((x) => { x.stamps.EGY = day(-3); });
  const req = ['flag', 'map', 'capital'];
  const add = (k, ok = true) => M.addEvidence(p.id, 'EGY', k, ok, req);
  for (const k of ['flag', 'capital', 'map', 'names', 'language']) assert.equal(add(k), false);
  assert.equal(add('flag'), false, 'جواب ثانٍ في اليوم نفسه لا يُحسب');
  assert.ok(!store.me.gold.EGY, 'لا ذهبي في يوم واحد');
  // نحاكي مرور يوم: نؤرّخ الدليل الأول بالأمس
  store.patch((x) => { x.evidence.EGY.flag = day(-1); x.evidence.EGY.capital = day(-1); });
  assert.equal(add('flag'), false);
  assert.equal(add('capital'), true, 'يكتمل الذهبي عند الدليل الثاني للعاصمة');
  assert.ok(store.me.gold.EGY && store.me.review.EGY);
  // الخطأ يمحو أدلة المهارة
  store.patch((x) => { x.stamps.FRA = day(-3); });
  M.addEvidence(p.id, 'FRA', 'flag', true, req); store.patch((x) => { x.evidence.FRA.flag = day(-1); });
  M.addEvidence(p.id, 'FRA', 'flag', true, req); assert.equal(M.evCount(store.me.evidence.FRA, 'flag'), 2);
  M.addEvidence(p.id, 'FRA', 'flag', false, req); assert.equal(M.evCount(store.me.evidence.FRA, 'flag'), 0);
});

await test('التأنيث: يحوّل خطاب الواجهة ولا يمسّ نصوص البيانات', async () => {
  const f = G.toFem;
  assert.equal(f('اختر مهمة'), 'اختاري مهمة');
  assert.equal(f('هل أنت مستعد؟'), 'هل أنت مستعدة؟');
  assert.equal(f('مررتَ بمصر'), 'مررتِ بمصر');
  assert.equal(f('صلى الله عليه وسلم'), 'صلى الله عليه وسلم');
  assert.equal(G.isFem(), true); assert.equal(G.fem('اكتب اسمك'), 'اكتبي اسمك');
  G.setFemOff(true); assert.equal(G.fem('اكتب اسمك'), 'اكتب اسمك'); G.setFemOff(false);
  const texts = new Set();
  const walk = (o) => { if (typeof o === 'string') texts.add(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  walk(countries); walk(json('src/data/nature.json')); walk(json('src/data/languages.json')); walk(await import('./content.mjs'));
  for (const t of texts) assert.equal(f(t), t, 'نص بيانات تغيّر بالتأنيث: ' + t.slice(0, 60));
});

await test('ملف الطفل: الحقول تُصحَّح عند التحميل', async () => {
  const { normalizeProfile } = await import('../src/store.js');
  const q = normalizeProfile({ id: 'a', name: 'س', level: 9, gender: 'x', stamps: { EGY: 'bad', FRA: '2026-01-01' } });
  assert.equal(q.level, 2); assert.equal(q.gender, null); assert.deepEqual(Object.keys(q.stamps), ['FRA']);
});

await test('الرحلات: تبدأ بفلسطين، وتغطي الدول كلها مرة واحدة', async () => {
  const J = await import('../src/journeys-core.js');
  const C = await import('./content.mjs');
  const contOrder = ['asia', 'africa', 'europe', 'namerica', 'samerica', 'oceania'];
  const D = { states, byId, continents: C.continents, contEmoji: {}, contOrder, pool: (l) => (l <= 1 ? states.filter((c) => c.famous) : l === 2 ? states.filter((c) => c.famous || c.area > 60000) : states) };
  const list = J.buildJourneys(D, 3);
  assert.equal(list[0].ids[0], 'PSE'); assert.deepEqual([...list[0].ids].sort(), ['EGY', 'JOR', 'LBN', 'PSE', 'SYR']);
  const all = list.flatMap((j) => j.ids);
  assert.equal(all.length, 195); assert.equal(new Set(all).size, 195);
  for (const id of all) assert.ok(byId[id]?.kind === 'state', id);
  const st = J.stateOf(J.buildJourneys(D, 1), { stamps: { PSE: '2026-01-01' } });
  assert.equal(st.current.id, 'pal'); assert.equal(st.current.next, 'JOR');
});

await test('لكل معلم رمز، والمعلم لا يُحسب دليلاً للذهبي إلا بصورته', async () => {
  const { landmarkIcon } = await import('../src/landmarks.js');
  for (const c of states) assert.ok(landmarkIcon(c.landmark), c.id);
  assert.ok(M.OTHER_SKILLS.includes('landmark'));
  const w = read('src/screens/world.js');
  assert.ok(/landmark: \['landmarkPic'\]/.test(w) && /q\.skill === 'landmark' && !hasPhoto/.test(w), 'شرط الصورة في التمرين الشامل');
});

await test('صور المعالم: لكل صورة معتمدة ملف ورخصة حرة وصاحب', () => {
  const meta = json('content/landmark-photos.json');
  const ok = Object.entries(meta).filter(([, m]) => m.review === 'ok');
  assert.ok(ok.length >= 40, 'عدد الصور المعتمدة ' + ok.length);
  for (const [id, m] of ok) {
    assert.ok(byId[id], id);
    assert.ok(fs.existsSync(new URL(`../src/landmark-img/${id}.jpg`, import.meta.url)), 'ملف ' + id);
    assert.match(m.license, /^(CC0|CC BY|Public domain|PD|FAL|GFDL|Attribution)/i, 'رخصة ' + id);
    assert.ok(m.artist && m.page, 'صاحب ' + id);
  }
});

await test('سؤال ترتيب الحروف: لا تشكيل في البلاطات', () => {
  const q = read('src/quiz.js');
  assert.ok(/capName\(c\)\.replace\(\/\[\\u064B-\\u0652/.test(q), 'الحروف تُنزع منها الحركات والشدة');
});

await test('البحث: الدولة قبل البحر والنهر', () => {
  const ex = read('src/screens/explore.js');
  assert.ok(ex.indexOf('const countries = search(') < ex.indexOf('NAT.items.filter((x) => x.ar.includes(q)'), 'ترتيب نتائج البحث');
});

console.log(process.exitCode ? '\nفشل بعض الاختبارات' : `\nنجحت الاختبارات كلها (${n})`);
