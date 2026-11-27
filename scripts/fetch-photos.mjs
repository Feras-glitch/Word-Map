// يجلب صوراً حرة الرخصة من ويكيبيديا/كومنز لمجموعة من القوائم:
//   PH_SET=second  → صورة ثانية لكل دولة (حيوان أو طعام أو نبات تشتهر به): content/second-photos-list.json
//   PH_SET=animals → حيوانات تشتهر بها كل قارة: content/continent-animals-list.json
// الصورة: الصورة الرئيسية لمقالة ويكيبيديا الإنجليزية (wiki)، أو نتائج بحث كومنز إن كتب المراجع «q: search:...|ملف مرفوض».
// كل صورة جديدة تُحفظ بحالة «pending»، ولا يعرضها التطبيق قبل أن يراجعها أحد بالنظر ويكتب «ok».
// يعمل على GitHub Actions (بيئة العمل المحلية لا تصل إلى ويكيميديا). يحتاج ImageMagick.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SET = process.env.PH_SET || 'second';
const CFG = {
  second: { list: 'content/second-photos-list.json', out: 'src/second-img', meta: 'content/second-photos.json', credits: 'content/SECOND-PHOTOS-CREDITS.md', title: 'الصور الثانية للدول' },
  animals: { list: 'content/continent-animals-list.json', out: 'src/animal-img', meta: 'content/animal-photos.json', credits: 'content/ANIMAL-PHOTOS-CREDITS.md', title: 'حيوانات القارات' },
}[SET];
const UA = 'WorldExplorerKidsApp/1.0 (https://github.com/Feras-glitch/Word-Map)';
const OUT = path.join(root, CFG.out); fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/ph-');
const ONLY = process.env.PH_ONLY ? process.env.PH_ONLY.split(',') : null;
const LIST = JSON.parse(fs.readFileSync(path.join(root, CFG.list), 'utf8'));
const old = fs.existsSync(path.join(root, CFG.meta)) ? JSON.parse(fs.readFileSync(path.join(root, CFG.meta), 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(base, params) {
  const u = base + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) return r.json(); await sleep(2000 * (i + 1)); }
  throw new Error('API ' + u);
}
const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const FREE = /^(CC0|CC[ -]BY(-SA)?( \d(\.\d)?)?|Public domain|PD|GFDL|Attribution|FAL|Free Art License)/i;
const BAD = /logo|map|plan|diagram|flag|coat|locator|collage|montage|satellite|nasa|stamp|banknote|coin|range|distribution|skeleton|drawing|illustration|\.svg/i;

const meta = {}; const miss = [];
for (const [key, it] of Object.entries(LIST)) {
  try {
    // ما اعتُمد أو رُفض بالقائمة نفسها يبقى كما هو، إلا إن طُلب بالاسم أو تغيّر استعلامه
    const q = it.q || 'wiki:' + it.wiki;
    if ((ONLY && !ONLY.includes(key)) || (!ONLY && old[key] && old[key].q === q)) { if (old[key]) meta[key] = old[key]; continue; }
    let cands = [];
    if (q.startsWith('search:')) {
      const [query, ...skip] = q.slice(7).split('|'); const sk = skip.map((x) => x.replace(/_/g, ' '));
      const s = await api('https://commons.wikimedia.org/w/api.php', { action: 'query', list: 'search', srsearch: query + ' filetype:bitmap', srnamespace: '6', srlimit: '25' });
      cands = (s.query?.search || []).map((x) => x.title.replace(/^File:/, '')).filter((t) => /\.jpe?g$/i.test(t) && !BAD.test(t) && !sk.includes(t.replace(/_/g, ' ')));
    } else {
      const p = await api('https://en.wikipedia.org/w/api.php', { action: 'query', titles: it.wiki, prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1' });
      const f = p.query?.pages?.[0]?.pageimage; if (f) cands = [f];
    }
    let file = null, ii = null;
    for (const cand of cands) {
      const c = await api('https://commons.wikimedia.org/w/api.php', { action: 'query', titles: 'File:' + cand, prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '960' });
      const x = c.query?.pages?.[0]?.imageinfo?.[0]; const em = x?.extmetadata || {};
      if (x && x.width >= 600 && !/\.svg$/i.test(cand) && em.NonFree?.value !== 'true' && FREE.test(strip(em.LicenseShortName?.value))) { file = cand; ii = x; break; }
    }
    if (!file) { miss.push(key + ': لا صورة حرة مناسبة'); continue; }
    const em = ii.extmetadata || {};
    const raw = path.join(TMP, key + '.src');
    const r = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA } });
    if (!r.ok) { miss.push(key + ': فشل التنزيل'); continue; }
    fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
    const out = path.join(OUT, key + '.jpg');
    execFileSync('convert', [raw + '[0]', '-auto-orient', '-resize', '600x450^', '-gravity', 'center', '-extent', '600x450', '-strip', '-interlace', 'Plane', '-quality', '66', out]);
    meta[key] = { q, file, artist: strip(em.Artist?.value).slice(0, 160) || 'غير معروف', license: strip(em.LicenseShortName?.value), licenseUrl: em.LicenseUrl?.value || '', page: ii.descriptionurl, review: old[key]?.file === file ? old[key].review : 'pending' };
    console.log('✓', key, file, meta[key].license);
    await sleep(300);
  } catch (e) { miss.push(key + ': ' + e.message); }
}
fs.writeFileSync(path.join(root, CFG.meta), JSON.stringify(meta, null, 1));
fs.writeFileSync(path.join(root, CFG.credits), `# ${CFG.title}: الصور ورخصها\n\nصور من ويكيميديا كومنز برخص حرة. لكل صورة صاحبها ورخصتها:\n\n`
  + Object.entries(meta).map(([k, m]) => `- **${k}** — [${m.file}](${m.page}) — ${m.artist} — ${m.license}${m.licenseUrl ? ` (${m.licenseUrl})` : ''}`).join('\n') + '\n');
console.log('صور:', Object.keys(meta).length, 'تعذّر:', miss.length); for (const m of miss) console.log('  ✗', m);
