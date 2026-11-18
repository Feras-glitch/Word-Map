// يدمج حزم أصوات المطور: content/audio/*.json (المعتمدة) و content/audio-inbox/*.json (المرفوعة حديثاً).
// يفحص كل مقطع (المفتاح، نوع الملف، الحجم)، ويكتب الملفات في public/voices وفهرسها في src/data/devvoices.json.
// الأحدث يغلب عند تكرار المفتاح. أي مقطع معطوب يُتجاهل مع تحذير، ولا يوقف البناء.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['content/audio', 'content/audio-inbox'].map((d) => path.join(root, d));
const outDir = path.join(root, 'public/voices');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac' };
const best = new Map(); let bad = 0, packs = 0;
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json'))) {
    let o; try { o = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch { console.warn('⚠️ حزمة غير صالحة: ' + f); continue; }
    if (o.app !== 'world-explorer-voices' || o.kind !== 'dev' || !Array.isArray(o.items)) { console.warn('⚠️ ليست حزمة مطور: ' + f); continue; }
    packs++;
    for (const x of o.items) {
      const mime = String(x.mime || '').split(';')[0];
      const ok = typeof x.key === 'string' && /^[a-z]{2,3}:\S/.test(x.key) && EXT[mime] && typeof x.data === 'string' && x.data.length < 600000;
      if (!ok) { bad++; continue; }
      const date = x.date || o.at || '';
      const prev = best.get(x.key);
      if (!prev || date > prev.date) best.set(x.key, { ...x, mime, date, by: x.by || o.by });
    }
  }
}
const index = {};
for (const [key, x] of best) {
  const buf = Buffer.from(x.data, 'base64');
  const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '.' + EXT[x.mime];
  fs.writeFileSync(path.join(outDir, name), buf);
  index[key] = { f: name, trim: x.trim, gain: x.gain, by: x.by };
}
fs.writeFileSync(path.join(root, 'src/data/devvoices.json'), JSON.stringify(index));
console.log(`أصوات المطور: ${best.size} مقطعاً من ${packs} حزمة${bad ? ` | تُجوهل ${bad} مقطعاً معطوباً` : ''}`);
