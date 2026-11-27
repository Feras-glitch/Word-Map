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

await test('التمييز العددي: ٣ ملايين، ألف، ١١ سؤالاً، ١٠٠ سؤال', async () => {
  const { cnt, bigNum, times, stampsWord } = await import('../src/arnum.js');
  const Q = (n) => cnt(n, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤالاً');
  assert.equal(Q(1), 'سؤال واحد'); assert.equal(Q(2), 'سؤالين'); assert.equal(Q(3), '٣ أسئلة'); assert.equal(Q(10), '١٠ أسئلة');
  assert.equal(Q(11), '١١ سؤالاً'); assert.equal(Q(100), '١٠٠ سؤال'); assert.equal(Q(103), '١٠٣ أسئلة');
  assert.equal(bigNum(3, 'm'), '٣ ملايين'); assert.equal(bigNum(1, 'k'), 'ألف'); assert.equal(bigNum(9, 'k'), '٩ آلاف'); assert.equal(bigNum(15, 'm'), '١٥ مليون'); assert.equal(bigNum(2.5, 'm'), '٢٫٥ مليون');
  assert.equal(times(2), 'مرتين'); assert.equal(stampsWord(0), 'لا أختام بعد'); assert.equal(stampsWord(1), 'ختم واحد');
});

await test('لا تُكتب الأعداد بلا تمييز صحيح في الشاشات', () => {
  for (const f of fs.readdirSync(new URL('../src/screens/', import.meta.url))) {
    const t = read('src/screens/' + f);
    assert.ok(!/\$\{ar\([^}]*\)\} سؤالاً/.test(t), f + ': «سؤالاً» بعد عدد بلا cnt');
    assert.ok(!/toLocaleString\('ar-EG'\) \+ ' (ختم|يوم|محطة|تحية|سؤال)'/.test(t), f + ': تمييز عددي يدوي');
  }
});

await test('بيانات المراجعة: جيران الصين بلا أقاليمها، وجنوب السودان في شرق أفريقيا، والعملات مصححة', () => {
  assert.ok(!byId.CHN.borders.includes('HKG') && !byId.CHN.borders.includes('MAC'));
  assert.equal(byId.SSD.sub, 'شرق أفريقيا');
  const bad = ['هنداروس', 'قرطبة', 'روبية باكستاني', 'روبية نيبالي', 'نولتوم', 'لارى', 'جوردى', 'أثيوبي', 'أريتري', 'بروندي', 'رييال', 'قيرغستاني', 'ترينداد', 'هريفنيا أوكراني'];
  for (const c of states) if (c.cur?.ar) for (const b of bad) assert.ok(!new RegExp(b + '(?![ء-ي])').test(c.cur.ar), `${c.id}: ${c.cur.ar}`);
  assert.equal(byId.GRL.ar, 'غرينلاند');
});

await test('غزة: أرقام نوفمبر ٢٠٢٦، وسبتة ومليلية مدينتان محتلتان', () => {
  const t = byId.PSE.popInfo?.gaza?.text || '';
  assert.ok(t.includes('٧٤ ألف') && t.includes('٢٠ ألف طفل'), 'أرقام غزة');
  assert.ok(read('src/card.js').includes('سبتة ومليلية') && read('src/screens/missions.js').includes('مدينتان مغربيتان تحتلهما إسبانيا'));
  assert.ok(byId.MAR.borders.includes('ESP'), 'إسبانيا تبقى جارة للمغرب');
});

await test('الصينية خيار لكل طفل، والوقت لا يُتجاوز بمستكشف جديد', () => {
  const q = read('src/quiz.js');
  assert.ok(/useZh = zhOn\(\) &&/.test(q) && /names_zh' && !zhOn\(\)/.test(q), 'أسئلة الصينية مشروطة بخيار الطفل');
  assert.ok(read('src/store.js').includes('q.zh = q.zh === true'));
  assert.ok(/limitFor\(\) \? parentLock\(\(\) => newProfile/.test(read('src/screens/profiles.js')), 'إنشاء مستكشف بالرقم السري حين يُفعَّل الحد');
  assert.ok(/if \(setting && !gated\) return mathGate/.test(read('src/lock.js')), 'سؤال حساب قبل اختيار الرقم أول مرة');
});

await test('لعبة «أين هذه الدولة؟» بلا أسماء على الخريطة لكل المستويات، والخروج من جولة جارية يُسأل عنه', () => {
  const g = read('src/screens/games.js');
  assert.ok(/createMap\(\{ fill, labels: false/.test(g), 'لا أسماء في لعبة أين');
  assert.ok((g.match(/setPageGuard\(/g) || []).length >= 3, 'حارس الخروج في الألعاب الثلاث');
  assert.ok(/guard: \(\) => \(!decided && answered > 0/.test(read('src/quiz.js')), 'حارس الخروج في الأسئلة');
  assert.ok(/minutesLeft\(\) <= 0\) parentLock\(sw\)/.test(read('src/screens/profiles.js')), 'الانتقال إلى ملف أخ بعد انتهاء الوقت بالرقم السري');
});

await test('اختباراتي: النجوم في أيام متباعدة، والجولة تبدأ بالمستحق، والاختبار الكبير يوزّع المواد', async () => {
  const X = await import('../src/exams-core.js');
  let r = X.applyAnswer(undefined, true, '2026-12-01');
  assert.equal(r.rec.s, 1); assert.ok(r.lit && r.gained);
  r = X.applyAnswer(r.rec, true, '2026-12-02'); assert.equal(r.rec.s, 1, 'لا نجمة ثانية في اليوم التالي مباشرة');
  r = X.applyAnswer(r.rec, true, '2026-12-03'); assert.equal(r.rec.s, 2, 'الثانية بعد يومين');
  r = X.applyAnswer(r.rec, true, '2026-12-06'); assert.equal(r.rec.s, 2, 'الثالثة تحتاج أسبوعاً');
  r = X.applyAnswer(r.rec, true, '2026-12-10'); assert.equal(r.rec.s, 3);
  assert.ok(!X.isDue(r.rec, '2026-12-20') && X.isDue(r.rec, '2027-01-09'), 'المتقن يعود بعد شهر');
  r = X.applyAnswer(r.rec, false, '2027-01-09'); assert.equal(r.rec.s, 2); assert.equal(r.rec.miss, 1);
  const recs = { A: { s: 1, last: '2026-12-01' }, B: { s: 2, last: '2026-12-09' } };
  const ids = ['A', 'B', 'C', 'D'];
  assert.deepEqual(X.pickRound(ids, recs, '2026-12-10', 3), ['A', 'C', 'D']);
  const cv = X.coverage(ids, recs, '2026-12-10'); assert.equal(cv.lit, 2); assert.equal(cv.none, 2); assert.equal(cv.due, 1);
  const plan = X.buildExam(['P', 'Q', 'R', 'S', 'T'], [{ key: 'f', ok: () => true }, { key: 'm', ok: () => true }], 6);
  assert.equal(plan.length, 6); assert.ok(plan.filter((x) => x.subj === 'f').length === 3, 'توزيع متساوٍ');
  assert.equal(new Set(plan.slice(0, 5).map((x) => x.id)).size, 5, 'دول مختلفة قبل التكرار');
  assert.ok(X.passed(8, 10) && !X.passed(7, 10));
  assert.equal(X.weekKey('2026-11-27'), '2026-11-21', 'الأسبوع يبدأ السبت');
});

await test('قفل الوالدين: «نسيت الرقم» بسؤال الاسترجاع، ولا يُحفظ في النسخة الاحتياطية', () => {
  const L = read('src/lock.js'), S = read('src/store.js');
  assert.ok(/store\.parent\.recHash \? secretGate\(reset/.test(L), 'سؤال الاسترجاع قبل سؤال الحساب');
  assert.ok(/via: resetVia/.test(L) && read('src/screens/parent.js').includes("pc?.via === 'forgot'"), 'أثر التغيير ظاهر للأب');
  assert.ok(/delete d\.parent\.recHash/.test(S), 'سؤال الاسترجاع لا يخرج في النسخة');
});

await test('أسئلة المعرفة المكتوبة: كل سؤال له جواب واحد صحيح وخيارات خاطئة مختلفة عنه', () => {
  const t = read('src/exam-questions.js');
  const items = [...t.matchAll(/\{ id: '([a-z0-9-]+)', lv: (\d), icon: '[^']*', q: '([^']+)', a: ([^,]+), w: \[([^\]]+)\]/g)];
  assert.ok(items.length >= 25, 'عدد الأسئلة المكتوبة ' + items.length);
  const ids = new Set();
  for (const [, id, lv, q, a, w] of items) {
    assert.ok(!ids.has(id), 'مكرر ' + id); ids.add(id);
    assert.ok(+lv >= 1 && +lv <= 3);
    const ws = [...w.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.ok(ws.length >= 1 && !ws.includes(a.replace(/'/g, '').trim()), id + ': جواب ضمن الخطأ');
  }
});

await test('عناصر المفاهيم والرحلات بلا معرّف مكرر', () => {
  const t = read('src/exam-questions.js');
  assert.ok(/id: 'bs-' \+ s\.cc \+ '-' \+ s\.year \+ '-' \+ k/.test(t), 'معرّف محطات ابن بطوطة فريد (مدينتان في الدولة نفسها والسنة نفسها)');
});

await test('الدول المذكّرة تشمل الأردن والعراق والصومال والفاتيكان', async () => {
  const { MASC } = await import('../src/arnum.js');
  for (const id of ['JOR', 'IRQ', 'MAR', 'SDN', 'LBN', 'YEM', 'SOM', 'VAT', 'NER']) assert.ok(MASC.has(id), id);
  assert.ok(!/ar\(taps\) \+ ' محاولات'/.test(read('src/screens/missions.js')), 'تمييز عدد المحاولات في قصص المهام');
});

await test('معاني الأعلام: لكل دولة نص، بلا ذكر إسرائيل، بأرقام عربية', () => {
  const F = JSON.parse(read('content/flag-symbols.json'));
  const C = JSON.parse(read('src/data/countries.json')).filter((c) => c.kind === 'state');
  for (const c of C) assert.ok(F[c.id] && F[c.id].length > 20, 'لا نص لعلم ' + c.id);
  for (const [k, v] of Object.entries(F)) { assert.ok(!/إسرائيل|اسرائيل|صهيون/.test(v), k); assert.ok(!/[0-9]/.test(v), k + ': أرقام لاتينية'); }
});

await test('الصور الثانية وحيوانات القارات: قوائم سليمة بلا خنزير ولا خمر، ولا صورة تُعرض قبل مراجعتها', () => {
  const L = JSON.parse(read('content/second-photos-list.json')); const A = JSON.parse(read('content/continent-animals-list.json'));
  const ids = new Set(JSON.parse(read('src/data/countries.json')).map((c) => c.id));
  for (const [k, v] of Object.entries(L)) { assert.ok(ids.has(k), k); assert.ok(['animal', 'food', 'plant'].includes(v.kind), k); assert.ok(!/pork|bacon|ham\b|wine|beer|sausage|خنزير|نبيذ|خمر/i.test(v.wiki + v.ar + (v.q || '').split('|')[0]), k); }
  for (const [k, v] of Object.entries(A)) assert.ok(['asia', 'africa', 'europe', 'namerica', 'samerica', 'oceania', 'antarctica'].includes(v.cont), k);
  const P = read('src/photos.js'); assert.ok((P.match(/review === 'ok'/g) || []).length >= 3, 'شرط المراجعة في كل أنواع الصور');
});

console.log(process.exitCode ? '\nفشل بعض الاختبارات' : `\nنجحت الاختبارات كلها (${n})`);
