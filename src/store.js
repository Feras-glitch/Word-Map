// حفظ الملفات الشخصية والتقدم على الجهاز
const KEY = 'world-explorer.v1';

let mem = null;
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY)) || null; } catch { mem = null; }
  if (!mem) mem = { profiles: [], current: null, settings: { sound: true, rate: 0.9 } };
  mem.settings ||= { sound: true, rate: 0.9 };
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* التخزين غير متاح */ } }

export const store = {
  get state() { return load(); },
  get settings() { return load().settings; },
  setSetting(k, v) { load().settings[k] = v; save(); },
  get profiles() { return load().profiles; },
  get me() { const s = load(); return s.profiles.find((p) => p.id === s.current) || null; },
  addProfile({ name, avatar, level }) {
    const s = load();
    const p = { id: Date.now().toString(36), name, avatar, level, stamps: {}, stars: {}, daily: {}, battuta: 0, badges: {} };
    s.profiles.push(p); s.current = p.id; save(); return p;
  },
  updateProfile(id, patch) { const p = load().profiles.find((x) => x.id === id); Object.assign(p, patch); save(); },
  removeProfile(id) { const s = load(); s.profiles = s.profiles.filter((p) => p.id !== id); if (s.current === id) s.current = s.profiles[0]?.id || null; save(); },
  switchTo(id) { load().current = id; save(); },
  stamp(cid) {
    const p = this.me; if (!p || p.stamps[cid]) return false;
    p.stamps[cid] = new Date().toISOString().slice(0, 10); save(); return true;
  },
  setStars(game, stars) {
    const p = this.me; if (!p) return;
    p.stars[game] = Math.max(p.stars[game] || 0, stars); save();
  },
  badge(key) { const p = this.me; if (!p || p.badges[key]) return false; p.badges[key] = true; save(); return true; },
  patch(fn) { const p = this.me; if (!p) return; fn(p); save(); },
};
