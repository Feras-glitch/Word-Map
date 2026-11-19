// يجلب صورة حرة الرخصة لمعلم كل دولة من ويكيبيديا/ويكيميديا كومنز، ويصغّرها، ويحفظ صاحبها ورخصتها.
// يعمل على GitHub Actions (بيئة العمل المحلية لا تصل إلى ويكيميديا). يحتاج ImageMagick.
// الصورة: الصورة الرئيسية لمقالة المعلم في ويكيبيديا الإنجليزية، بشرط أن تكون في كومنز برخصة حرة.
// كل صورة تُحفظ بحالة «pending»، ولا يعرضها التطبيق حتى تُراجع بالنظر ويُكتب لها «ok».
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'WorldExplorerKidsApp/1.0 (https://github.com/Feras-glitch/Word-Map)';
const OUT_DIR = path.join(root, 'src/landmark-img');
const META = path.join(root, 'content/landmark-photos.json');
const CREDITS = path.join(root, 'content/LANDMARK-PHOTOS-CREDITS.md');
const TMP = fs.mkdtempSync('/tmp/lm-');
fs.mkdirSync(OUT_DIR, { recursive: true });

// عنوان مقالة المعلم في ويكيبيديا الإنجليزية: الدول الخمسون المشهورة، ودول الرحلات العربية
const TITLES = {
  AFG: 'Blue Mosque, Mazar-i-Sharif', ARE: 'Burj Khalifa', ARG: 'Iguazu Falls', AUS: 'Sydney Opera House', BGD: 'Sundarbans', BRA: 'Amazon rainforest',
  CAN: 'Niagara Falls', CHE: 'Matterhorn', CHN: 'Great Wall of China', DEU: 'Brandenburg Gate', DZA: 'Maqam Echahid', EGY: 'Giza pyramid complex', ESP: 'Alhambra',
  ETH: 'Rock-Hewn Churches, Lalibela', FRA: 'Eiffel Tower', GBR: 'Big Ben', GRC: 'Parthenon', IDN: 'Borobudur', IND: 'Taj Mahal', IRN: 'Naqsh-e Jahan Square',
  IRQ: 'Great Mosque of Samarra', ITA: 'Leaning Tower of Pisa', JOR: 'Petra', JPN: 'Mount Fuji', KEN: 'Maasai Mara', KOR: 'Gyeongbokgung', KWT: 'Kuwait Towers',
  LBN: 'Cedars of God', LBY: 'Leptis Magna', MAR: 'University of al-Qarawiyyin', MEX: 'Teotihuacan', MRT: 'Chinguetti', MYS: 'Petronas Towers', NGA: 'Zuma Rock',
  NLD: 'Kinderdijk', OMN: 'Nizwa Fort', PAK: 'Faisal Mosque', PSE: 'Dome of the Rock', QAT: 'Museum of Islamic Art, Doha', RUS: 'Moscow Kremlin',
  SAU: 'Great Mosque of Mecca', SDN: 'Pyramids of Meroë', SOM: 'Laas Geel', SWE: 'Gamla stan', SYR: 'Umayyad Mosque', TUN: 'Mosque of Uqba', TUR: 'Hagia Sophia',
  USA: 'Statue of Liberty', YEM: 'Shibam', ZAF: 'Table Mountain', BHR: "Qal'at al-Bahrain", DJI: 'Lake Assal (Djibouti)', COM: 'Mount Karthala',
};
// صور بديلة يختارها المراجع إن رُفضت الصورة الرئيسية (اسم ملف في كومنز)
const OVERRIDE = fs.existsSync(path.join(root, 'content/landmark-photo-overrides.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'content/landmark-photo-overrides.json'), 'utf8')) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(base, params) {
  const u = base + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error('API ' + u);
}
const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const FREE = /^(CC0|CC[ -]BY(-SA)?( \d(\.\d)?)?|Public domain|PD|GFDL|Attribution)/i;

const old = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};
const meta = {};
const miss = [];
for (const [id, title] of Object.entries(TITLES)) {
  try {
    let file = OVERRIDE[id];
    if (!file) {
      const q = await api('https://en.wikipedia.org/w/api.php', { action: 'query', titles: title, prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1' });
      file = q.query?.pages?.[0]?.pageimage;
    }
    if (!file) { miss.push(id + ': لا صورة رئيسية'); continue; }
    file = file.replace(/^File:/, '');
    const c = await api('https://commons.wikimedia.org/w/api.php', { action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640' });
    const ii = c.query?.pages?.[0]?.imageinfo?.[0];
    if (!ii) { miss.push(id + ': ليست في كومنز ' + file); continue; }
    const em = ii.extmetadata || {};
    const lic = strip(em.LicenseShortName?.value);
    if (em.NonFree?.value === 'true' || !FREE.test(lic)) { miss.push(`${id}: رخصة غير حرة (${lic})`); continue; }
    const raw = path.join(TMP, id + '.src');
    const r = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA } });
    if (!r.ok) { miss.push(id + ': فشل التنزيل'); continue; }
    fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
    const out = path.join(OUT_DIR, id + '.jpg');
    // ٤٢٠ بكسل عرضاً، مقصوصة إلى نسبة ٤:٣، وجودة ٦٨: نحو ٣٠ كيلوبايت للصورة
    execFileSync('convert', [raw + '[0]', '-auto-orient', '-resize', '420x315^', '-gravity', 'center', '-extent', '420x315', '-strip', '-interlace', 'Plane', '-quality', '68', out]);
    const same = old[id]?.file === file;
    meta[id] = { file, title, artist: strip(em.Artist?.value).slice(0, 160) || 'غير معروف', license: lic, licenseUrl: em.LicenseUrl?.value || '', page: ii.descriptionurl, review: same ? old[id].review : 'pending' };
    console.log('✓', id, file, lic, Math.round(fs.statSync(out).size / 1024) + 'KB');
    await sleep(300);
  } catch (e) { miss.push(id + ': ' + e.message); }
}
fs.writeFileSync(META, JSON.stringify(meta, null, 1));
fs.writeFileSync(CREDITS, '# صور المعالم ورخصها\n\nصور من ويكيميديا كومنز برخص حرة. لكل صورة صاحبها ورخصتها:\n\n'
  + Object.entries(meta).map(([id, m]) => `- **${id}** — [${m.file}](${m.page}) — ${m.artist} — ${m.license}${m.licenseUrl ? ` (${m.licenseUrl})` : ''}`).join('\n') + '\n');
console.log('صور:', Object.keys(meta).length, 'تعذّر:', miss.length); for (const m of miss) console.log('  ✗', m);
