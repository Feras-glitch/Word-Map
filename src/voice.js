// محرك الأصوات المسجّلة: قبل القراءة الآلية نبحث عن تسجيل للنص نفسه.
// ترتيب الطبقات: صوت الطفل الذي اختاره الطفل ← تسجيل الأهل ← تسجيل المطور (مدمج في التطبيق) ← القراءة الآلية.
// التخزين: IndexedDB على الجهاز (أصوات الأهل والأطفال لا تغادر الجهاز إلا بملف يصدّره الأهل).
import { store } from './store.js';
import DEV_INDEX from './data/devvoices.json';

// ---------- المفتاح: اللغة + النص بلا تشكيل ولا علامات ترقيم طرفية ----------
const TASHKEEL = /[ً-ْٰـ]/g;
export const langOf = (lang) => String(lang || 'ar').toLowerCase().split('-')[0];
export const normText = (t) => String(t || '').replace(TASHKEEL, '').replace(/[؟?!.،,:؛]+\s*$/g, '').replace(/^[\s«»"]+|[\s«»"]+$/g, '').replace(/\s+/g, ' ').trim();
export const keyOf = (text, lang) => langOf(lang) + ':' + normText(text);

// ---------- IndexedDB ----------
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('world-explorer-voices', 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore('clips', { keyPath: 'id' }); s.createIndex('pack', 'pack'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('clips', mode); const st = t.objectStore('clips'); const out = fn(st); t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out); t.onerror = () => rej(t.error); }); };
// clip: { id: pack|key, pack, key, text, lang, blob, mime, by, date, trim:[start,end], gain, approved }
export const putClip = (clip) => tx('readwrite', (s) => s.put({ ...clip, id: clip.pack + '|' + clip.key }));
export const delClip = (pack, key) => tx('readwrite', (s) => s.delete(pack + '|' + key));
export const getClip = (pack, key) => tx('readonly', (s) => s.get(pack + '|' + key)).catch(() => null);
export async function listPack(pack) {
  const d = await db();
  return new Promise((res) => { const out = []; const t = d.transaction('clips'); const req = t.objectStore('clips').index('pack').openCursor(IDBKeyRange.only(pack)); req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } else res(out); }; req.onerror = () => res(out); });
}
export async function listPacks() {
  const d = await db();
  return new Promise((res) => { const out = new Set(); const t = d.transaction('clips'); const req = t.objectStore('clips').openCursor(); req.onsuccess = () => { const c = req.result; if (c) { out.add(c.value.pack); c.continue(); } else res([...out]); }; req.onerror = () => res([...out]); });
}

// ---------- أي طبقة تُستعمل لهذا الطفل؟ ----------
// p.voice: 'family' (الافتراضي) أو 'child:<الاسم>' أو 'kids' (كل تسجيلات الإخوة المعتمدة)
export function layersFor(p = store.me) {
  const v = p?.voice || 'family';
  const own = p ? 'child:' + p.name : null;
  const L = [];
  if (v.startsWith('child:')) L.push({ pack: v, needApproval: v !== own });
  if (v === 'kids') L.push({ kids: true });
  L.push({ pack: 'family' }, { dev: true });
  return L;
}
async function findClip(key) {
  for (const l of layersFor()) {
    if (l.dev) { const d = DEV_INDEX[key]; if (d) return { dev: true, ...d }; continue; }
    if (l.kids) {
      const packs = (await listPacks().catch(() => [])).filter((x) => x.startsWith('child:'));
      for (const pk of packs) { const c = await getClip(pk, key); if (c && c.approved) return c; }
      continue;
    }
    const c = await getClip(l.pack, key);
    if (c && (!l.needApproval || c.approved)) return c;
  }
  return null;
}

// ---------- التشغيل ----------
let ctx = null; let cur = null;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
const bufCache = new Map();
async function bufferOf(clip) {
  const id = clip.dev ? 'dev|' + clip.f : clip.id + '|' + clip.date;
  if (bufCache.has(id)) return bufCache.get(id);
  const ab = clip.dev ? await (await fetch(DEV_BASE + clip.f)).arrayBuffer() : await clip.blob.arrayBuffer();
  const b = await ac().decodeAudioData(ab);
  bufCache.set(id, b); return b;
}
const DEV_BASE = (import.meta.env.BASE_URL || './') + 'voices/';
export function stopClip() { try { cur?.stop(); } catch { /* */ } cur = null; }
// يشغّل مقطعاً ويعيد وعداً ينتهي بانتهائه
export async function playClip(clip) {
  const b = await bufferOf(clip);
  const a = ac(); if (a.state === 'suspended') await a.resume();
  const src = a.createBufferSource(); src.buffer = b;
  const g = a.createGain(); g.gain.value = clip.gain || 1;
  src.connect(g).connect(a.destination);
  const [s0, s1] = clip.trim || [0, b.duration];
  stopClip(); cur = src;
  return new Promise((res) => { src.onended = res; src.start(0, s0, Math.max(0.05, s1 - s0)); });
}
// يحاول تشغيل تسجيل للنص أو لأجزائه كلها؛ يعيد false إن نقص شيء (فتُستعمل القراءة الآلية للنص كاملاً)
export async function playRecorded(parts, lang) {
  try {
    const list = (Array.isArray(parts) ? parts : [parts]).map((t) => normText(t)).filter(Boolean);
    if (!list.length) return false;
    const clips = [];
    for (const t of list) { const c = await findClip(langOf(lang) + ':' + t); if (!c) return false; clips.push(c); }
    for (const c of clips) await playClip(c);
    return true;
  } catch { return false; }
}

// ---------- معالجة التسجيل: قصّ الصمت وتسوية الصوت (تُحفظ كإعدادات تشغيل، والملف الأصلي كما هو) ----------
export async function analyze(blob) {
  const b = await ac().decodeAudioData(await blob.arrayBuffer());
  const d = b.getChannelData(0); const sr = b.sampleRate; const win = Math.floor(sr * 0.02);
  let peak = 0; const rms = [];
  for (let i = 0; i < d.length; i += win) { let s = 0; for (let j = i; j < Math.min(i + win, d.length); j++) { s += d[j] * d[j]; peak = Math.max(peak, Math.abs(d[j])); } rms.push(Math.sqrt(s / win)); }
  const thr = Math.max(0.01, Math.max(...rms) * 0.08);
  let a = rms.findIndex((x) => x > thr); let z = rms.length - 1 - [...rms].reverse().findIndex((x) => x > thr);
  if (a < 0) { a = 0; z = rms.length - 1; }
  const start = Math.max(0, a * win / sr - 0.08), end = Math.min(b.duration, (z + 1) * win / sr + 0.12);
  return { trim: [+start.toFixed(3), +end.toFixed(3)], gain: peak > 0 ? Math.min(4, +(0.9 / peak).toFixed(2)) : 1, duration: b.duration, silent: Math.max(...rms) < 0.005 };
}

// ---------- التسجيل بالميكروفون ----------
export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('nomic');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return { stop: () => new Promise((res) => { rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); }; rec.stop(); }) };
}

// ---------- الحزم: تصدير واستيراد (ملف واحد فيه الصوت بترميز base64) ----------
const b64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
const unb64 = (s, mime) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };
export async function exportPack(pack, { kind, by } = {}) {
  const clips = await listPack(pack);
  const items = [];
  for (const c of clips) items.push({ key: c.key, text: c.text, lang: c.lang, mime: c.mime, trim: c.trim, gain: c.gain, by: c.by, date: c.date, approved: !!c.approved, data: await b64(c.blob) });
  return JSON.stringify({ app: 'world-explorer-voices', v: 1, kind: kind || pack.split(':')[0], pack, by: by || '', at: new Date().toISOString(), items });
}
export function parsePack(text) {
  let o; try { o = JSON.parse(text); } catch { return { error: 'الملف ليس حزمة أصوات' }; }
  if (o?.app !== 'world-explorer-voices' || !Array.isArray(o.items)) return { error: 'الملف ليس حزمة أصوات من مستكشف العالم' };
  const items = o.items.filter((x) => typeof x.key === 'string' && /^[a-z]{2,3}:/.test(x.key) && typeof x.data === 'string' && /^audio\//.test(x.mime || ''));
  return { pack: o.pack, kind: o.kind, by: o.by, at: o.at, items };
}
// يدمج الحزمة في حزمة محلية. conflicts: 'keepOld' | 'useNew' | Map(key → 'old'|'new')
export async function importPack(parsed, target, conflicts = 'useNew', { approved } = {}) {
  let added = 0, replaced = 0, kept = 0;
  for (const x of parsed.items) {
    const old = await getClip(target, x.key);
    const choice = conflicts instanceof Map ? conflicts.get(x.key) : conflicts;
    if (old && (choice === 'keepOld' || choice === 'old')) { kept++; continue; }
    await putClip({ pack: target, key: x.key, text: x.text, lang: x.lang, mime: x.mime, blob: unb64(x.data, x.mime), trim: x.trim, gain: x.gain, by: x.by || parsed.by, date: x.date || parsed.at, approved: approved ?? !!x.approved });
    old ? replaced++ : added++;
  }
  return { added, replaced, kept };
}
export async function conflictsOf(parsed, target) {
  const out = [];
  for (const x of parsed.items) { const old = await getClip(target, x.key); if (old) out.push({ key: x.key, text: x.text, lang: x.lang, old, neu: { ...x, blob: unb64(x.data, x.mime) } }); }
  return out;
}
export const devIndex = DEV_INDEX;
