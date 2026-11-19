// حفظ الملفات الشخصية والتقدم على الجهاز
const KEY = 'world-explorer.v1';

let mem = null;
let saveFailed = false;
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// يصحّح ملف طفل ويكمل حقوله الناقصة؛ يعيد null إن كان غير صالح
export function normalizeProfile(p) {
  if (!isObj(p) || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim()) return null;
  const q = { ...p };
  q.level = [1, 2, 3].includes(+q.level) ? +q.level : 2;
  q.avatar = typeof q.avatar === 'string' && q.avatar ? q.avatar : '🧭';
  for (const k of ['stamps', 'gold', 'stars', 'daily', 'badges', 'mastery', 'practice', 'review', 'examFail', 'visitFail', 'activity', 'found', 'visitAt']) q[k] = isObj(q[k]) ? q[k] : {};
  for (const k of ['stamps', 'gold']) for (const [id, d] of Object.entries(q[k])) if (typeof d !== 'string' || !DATE.test(d)) delete q[k][id];
  for (const [id, r] of Object.entries(q.review)) if (!isObj(r) || !DATE.test(r.due || '')) delete q.review[id];
  q.gender = q.gender === 'f' ? 'f' : q.gender === 'm' ? 'm' : null;
  q.battuta = Number.isFinite(+q.battuta) ? +q.battuta : 0;
  return q;
}
function normalizeState(d) {
  if (!isObj(d) || !Array.isArray(d.profiles)) return null;
  const profiles = d.profiles.map(normalizeProfile);
  if (profiles.some((p) => !p)) return null;
  if (new Set(profiles.map((p) => p.id)).size !== profiles.length) return null;
  const out = { profiles, current: d.current, settings: isObj(d.settings) ? d.settings : { sound: true, rate: 0.9 }, parent: isObj(d.parent) ? d.parent : {} };
  if (!profiles.some((p) => p.id === out.current)) out.current = profiles[0]?.id || null;
  return out;
}

function load() {
  if (mem) return mem;
  try { mem = normalizeState(JSON.parse(localStorage.getItem(KEY))); } catch { mem = null; }
  if (!mem) mem = { profiles: [], current: null, settings: { sound: true, rate: 0.9 }, parent: {} };
  // ترحيل: الرقم السري يُحفظ مُجزّأً لا كما هو
  if (mem.parent.pin) { mem.parent.pinHash = pinHash(mem.parent.pin); delete mem.parent.pin; save(); }
  return mem;
}
// يعيد true إن نجح الحفظ. عند الفشل نُعلم الواجهة مرة واحدة
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); saveFailed = false; return true; }
  catch {
    if (!saveFailed) { saveFailed = true; try { window.dispatchEvent(new CustomEvent('store-save-failed')); } catch { /* */ } }
    return false;
  }
}
// تجزئة بسيطة للرقم السري (القفل يمنع الصغار، وليس حماية أمنية)
export function pinHash(pin) {
  let h = 2166136261;
  for (const ch of 'world-explorer:' + pin) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}

export const store = {
  get state() { return load(); },
  get settings() { return load().settings; },
  setSetting(k, v) { load().settings[k] = v; save(); },
  get profiles() { return load().profiles; },
  get me() { const s = load(); return s.profiles.find((p) => p.id === s.current) || null; },
  addProfile({ name, avatar, level, gender = null }) {
    const s = load();
    const p = { id: Date.now().toString(36), name, avatar, level, gender, stamps: {}, stars: {}, daily: {}, battuta: 0, badges: {} };
    s.profiles.push(p); s.current = p.id; save(); return p;
  },
  updateProfile(id, patch) { const p = load().profiles.find((x) => x.id === id); Object.assign(p, patch); save(); },
  removeProfile(id) { const s = load(); s.profiles = s.profiles.filter((p) => p.id !== id); if (s.current === id) s.current = s.profiles[0]?.id || null; save(); },
  switchTo(id) { load().current = id; save(); },
  stamp(cid) {
    const p = this.me; if (!p || p.stamps[cid]) return false;
    p.stamps[cid] = new Date().toLocaleDateString('en-CA'); save(); return true;
  },
  setStars(game, stars) {
    const p = this.me; if (!p) return;
    p.stars[game] = Math.max(p.stars[game] || 0, stars); save();
  },
  badge(key) { const p = this.me; if (!p || p.badges[key]) return false; p.badges[key] = true; save(); return true; },
  patch(fn) { const p = this.me; if (!p) return; fn(p); save(); },
  patchProfile(id, fn) { const p = load().profiles.find((x) => x.id === id); if (!p) return; fn(p); save(); },
  // لوحة الوالدين
  get parent() { return (load().parent ||= {}); },
  setParent(patch) { Object.assign(this.parent, patch); save(); },
  // النسخة الاحتياطية
  exportData() {
    const d = JSON.parse(JSON.stringify(load()));
    if (d.parent) { delete d.parent.pin; delete d.parent.pinHash; }
    return JSON.stringify({ app: 'world-explorer', v: 2, at: new Date().toISOString(), data: d });
  },
  // يقرأ النسخة ويتحقق منها دون أن يغيّر شيئاً
  parseBackup(text) {
    let o; try { o = JSON.parse(String(text).trim()); } catch { return { error: 'الملف ليس نسخة احتياطية صالحة' }; }
    if (o?.app !== 'world-explorer') return { error: 'الملف ليس نسخة احتياطية من مستكشف العالم' };
    if (![1, 2].includes(o.v)) return { error: 'إصدار النسخة غير مدعوم' };
    const d = normalizeState(o.data);
    if (!d) return { error: 'النسخة تالفة أو ناقصة؛ لم يتغير شيء' };
    return { data: d, at: o.at, summary: d.profiles.map((p) => ({ name: p.name, avatar: p.avatar, stamps: Object.keys(p.stamps).length, gold: Object.keys(p.gold).length })) };
  },
  // يستبدل البيانات فقط إن نجح الحفظ، وإلا تبقى القديمة كما هي
  importData(text) {
    const r = this.parseBackup(text);
    if (r.error) return r.error;
    const old = mem;
    const keep = old?.parent || {};
    mem = r.data; mem.parent = { ...r.data.parent, pinHash: keep.pinHash };
    if (!save()) { mem = old; return 'تعذّر الحفظ على الجهاز؛ بقيت بياناتك السابقة كما هي'; }
    return null;
  },
  get saveFailed() { return saveFailed; },
};
