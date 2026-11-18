// يجلب تسجيلات حرة بأصوات ناطقين أصليين من Lingua Libre (ويكيميديا كومنز) ويصنع منها حزمة مطور.
// يعمل على GitHub Actions (بيئة العمل المحلية لا تصل إلى ويكيميديا). يحتاج ffmpeg لتحويل الصوت إلى opus.
// ما يُجلب: أسماء الدول والعواصم بالإنجليزية والصينية، والتحيات بلغاتها. العربية تُترك لتسجيلات العائلة والمطور.
// المطابقة حرفية: اسم الملف في كومنز يجب أن ينتهي بالكلمة نفسها تماماً. كل مقطع يُحفظ مع اسم المسجّل والرخصة والرابط.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { iso6393 } from 'iso-639-3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = JSON.parse(fs.readFileSync(path.join(root, 'src/data/countries.json'), 'utf8')).filter((c) => c.kind === 'state');
const languages = JSON.parse(fs.readFileSync(path.join(root, 'src/data/languages.json'), 'utf8'));
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'WorldExplorerKidsApp/1.0 (https://github.com/Feras-glitch/Word-Map)';
const OUT = path.join(root, 'content/audio/lingualibre.json');
const CREDITS = path.join(root, 'content/audio/LINGUALIBRE-CREDITS.md');
const TMP = fs.mkdtempSync('/tmp/ll-');
const LIMIT = +(process.env.LL_LIMIT || 2000);

// رمز اللغة في التطبيق ← رمز ISO 639-3 الذي تستعمله Lingua Libre في أسماء الملفات
const SPECIAL = { zh: ['cmn', 'zho'], ar: ['ara', 'arb'], ms: ['zsm', 'msa'], fa: ['pes', 'fas'], prs: ['prs'], sw: ['swa', 'swh'], uz: ['uzb', 'uzn'], et: ['est', 'ekk'], lv: ['lav', 'lvs'], ne: ['nep', 'npi'], om: ['orm', 'gaz'], qu: ['que', 'quz'], mn: ['mon', 'khk'], no: ['nor', 'nob'], sq: ['sqi', 'als'], ku: ['kmr'], ckb: ['ckb'] };
const iso3 = (code) => {
  const base = String(code).toLowerCase().split('-')[0];
  if (SPECIAL[base]) return SPECIAL[base];
  if (base.length === 3) return [base];
  const r = iso6393.find((x) => x.iso6391 === base);
  return r ? [r.iso6393] : [];
};
const langOf = (l) => String(l).toLowerCase().split('-')[0];
const norm = (t) => String(t).replace(/[؟?!.،,:]+$/g, '').trim();

// ---------- الأهداف ----------
const targets = [];
for (const c of countries) {
  for (const [l, t] of [['en', c.en], ['zh', c.zh], ['en', c.cap3?.en], ['zh', c.cap3?.zh]]) if (t) targets.push({ key: l + ':' + norm(t), text: t, lang: l, codes: iso3(l), what: c.ar });
}
for (const [code, L] of Object.entries(languages)) {
  const g = L.greet; if (!g?.t || langOf(g.tts || code) === 'ar') continue;
  targets.push({ key: langOf(g.tts || code) + ':' + norm(g.t), text: g.t, lang: g.tts || code, codes: iso3(g.tts || code), what: 'تحية ' + L.ar });
}
const uniq = [...new Map(targets.map((t) => [t.key, t])).values()].filter((t) => t.codes.length).slice(0, LIMIT);
console.log('أهداف: ' + uniq.length);

// ---------- البحث في كومنز ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const u = API + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error('API ' + u);
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function findFile(t) {
  for (const code of t.codes) {
    const word = norm(t.text);
    const re = new RegExp('^File:LL-Q\\d+ \\(' + code + '\\)-.+-' + esc(word) + '\\.(wav|ogg|flac|mp3|webm)$', 'i');
    // بحثان: بالعنوان، ثم بالنص (الكلمات الصينية لا تُجزّأ جيداً في بحث العناوين)
    for (const q of [`intitle:"(${code})" intitle:"${word.replace(/"/g, '')}" LL`, `"${word.replace(/"/g, '')}" intitle:"LL-" intitle:"(${code})"`]) {
      const res = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '50', srsearch: q });
      const hit = (res.query?.search || []).map((x) => x.title).find((x) => re.test(x));
      if (hit) return hit;
      await sleep(120);
    }
    await sleep(150);
  }
  return null;
}
async function info(title) {
  const r = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata|size' });
  const ii = r.query?.pages?.[0]?.imageinfo?.[0]; if (!ii) return null;
  const md = ii.extmetadata || {};
  const strip = (s) => String(s?.value || '').replace(/<[^>]+>/g, '').trim();
  // «Speaker: X Recorder: Y» ← اسم الناطق فقط
  const artist = strip(md.Artist).replace(/\s+/g, ' ').replace(/^Speaker:\s*([^ ]+).*$/i, '$1');
  return { url: ii.url, page: ii.descriptionurl, license: strip(md.LicenseShortName), artist, size: ii.size };
}

// ---------- الجلب والتحويل ----------
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { items: [] };
const have = new Map((old.v2 ? old.items : []).map((x) => [x.key, { ...x, by: String(x.by).replace(/\s+/g, ' ').replace(/^Speaker:\s*([^ ]+).*?— /i, '$1 — ') }]));
const items = []; let found = 0, miss = 0, kept = 0;
for (const [i, t] of uniq.entries()) {
  if (have.has(t.key)) { items.push(have.get(t.key)); kept++; continue; }
  try {
    const title = await findFile(t);
    if (!title) { miss++; continue; }
    const inf = await info(title);
    if (!inf || !/CC|Public domain|PD/i.test(inf.license) || inf.size > 3e6) { miss++; continue; }
    const src = path.join(TMP, 'in'); const dst = path.join(TMP, 'out.webm');
    fs.writeFileSync(src, Buffer.from(await (await fetch(inf.url, { headers: { 'User-Agent': UA } })).arrayBuffer()));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '24000', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2', '-c:a', 'libopus', '-b:a', '24k', dst]);
    const data = fs.readFileSync(dst).toString('base64');
    items.push({ key: t.key, text: t.text, lang: t.lang, mime: 'audio/webm', data, date: new Date().toISOString(), approved: true,
      by: `${inf.artist || 'Lingua Libre'} — Lingua Libre (${inf.license})`, source: inf.page, license: inf.license, what: t.what });
    found++;
    if (found % 20 === 0) console.log(`… ${i + 1}/${uniq.length}: وُجد ${found}`);
    await sleep(200);
  } catch (e) { miss++; console.warn('⚠️ ' + t.key + ': ' + e.message); }
}
const pack = { app: 'world-explorer-voices', v: 1, v2: true, kind: 'dev', pack: 'dev', by: 'Lingua Libre', at: new Date().toISOString(), items };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(pack));
// ملف الإسناد (شرط رخصة CC BY-SA)
const lines = ['# تسجيلات Lingua Libre المستعملة في التطبيق', '', 'تسجيلات بأصوات ناطقين أصليين من مشروع Lingua Libre على ويكيميديا كومنز. لكل تسجيل رخصته واسم صاحبه.', '', '| النص | اللغة | المسجّل والرخصة | المصدر |', '|---|---|---|---|',
  ...items.map((x) => `| ${x.text} | ${x.lang} | ${x.by} | ${x.source || ''} |`)];
fs.writeFileSync(CREDITS, lines.join('\n') + '\n');
console.log(`انتهى: ${items.length} مقطعاً (جديد ${found}، محفوظ ${kept})، لم يوجد ${miss}`);
