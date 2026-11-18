// سجل الإتقان والمراجعة المتباعدة
// لكل طفل ولكل دولة ولكل مهارة: عدد الإجابات الصحيحة والخاطئة وآخر محاولة.
// ختم الزيارة: بعد سؤال واحد صحيح. ختم الإتقان (الذهبي): ٤ من ٥ في الامتحان، ومن يرسب يعيد بعد يوم.
// المراجعة: بعد الختم الذهبي تُستحق مراجعة بعد ٣ أيام، ثم ٧، ثم ٣٠. الخطأ في المراجعة يعيدها إلى ٣ أيام.
import { store } from './store.js';

export const SKILLS = { flag: 'العلم', capital: 'العاصمة', map: 'الموقع', names: 'الأسماء باللغات', landmark: 'المعالم', continent: 'القارة' };
export const INTERVALS = [3, 7, 30];
const DAY = 864e5;
export const today = () => new Date().toLocaleDateString('en-CA');
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY).toLocaleDateString('en-CA');

function ensure(p) {
  p.mastery ||= {};
  p.gold ||= {};
  p.examFail ||= {};
  p.review ||= {};
  return p;
}

// تسجيل محاولة في مهارة (من الألعاب والامتحانات والأسئلة)
export function record(id, skill, ok, pid) {
  const fn = (p) => {
    ensure(p);
    const m = (p.mastery[id] ||= {});
    const s = (m[skill] ||= { ok: 0, bad: 0 });
    if (ok) s.ok++; else s.bad++;
    s.last = today();
    // سجل النشاط اليومي للوحة الوالدين
    p.activity ||= {};
    const a = (p.activity[today()] ||= { q: 0, ok: 0 });
    a.q++; if (ok) a.ok++;
  };
  if (pid) store.patchProfile(pid, fn); else store.patch(fn);
}

export const hasVisit = (id) => !!store.me?.stamps?.[id];
export const hasGold = (id) => !!store.me?.gold?.[id];

export function canTakeExam(id) {
  const p = store.me; if (!p) return { ok: false };
  if (!hasVisit(id)) return { ok: false, why: 'احصل على ختم الزيارة أولاً' };
  const f = p.examFail?.[id];
  if (f && f === today()) return { ok: false, why: 'حاولت اليوم؛ راجع البطاقة وعد غداً' };
  return { ok: true };
}

export function giveVisit(id) { return store.stamp(id); }

export function examResult(id, score) {
  let gold = false;
  store.patch((p) => {
    ensure(p);
    if (score >= 4) {
      gold = !p.gold[id];
      p.gold[id] = p.gold[id] || today();
      p.review[id] = { step: 0, due: addDays(today(), INTERVALS[0]) };
      delete p.examFail[id];
    } else {
      p.examFail[id] = today();
    }
  });
  return gold;
}

export function dueReviews(p = store.me) {
  if (!p) return [];
  ensure(p);
  const t = today();
  return Object.entries(p.review).filter(([, r]) => r.due <= t).map(([id]) => id);
}

export function reviewResult(id, passed) {
  store.patch((p) => {
    ensure(p);
    const r = p.review[id] || { step: 0 };
    if (passed) {
      r.step = Math.min(r.step + 1, INTERVALS.length - 1);
      r.due = addDays(today(), INTERVALS[r.step]);
      r.done = (r.done || 0) + 1;
    } else {
      r.step = 0;
      r.due = addDays(today(), INTERVALS[0]);
    }
    p.review[id] = r;
  });
}

// ملخص مهارات الطفل (للوحة الوالد لاحقاً وللجواز)
export function skillSummary(p = store.me) {
  if (!p) return {};
  ensure(p);
  const sum = {};
  for (const m of Object.values(p.mastery)) for (const [k, s] of Object.entries(m)) {
    const x = (sum[k] ||= { ok: 0, bad: 0 }); x.ok += s.ok; x.bad += s.bad;
  }
  return sum;
}

// الدول التي يخطئ فيها الطفل أكثر (للمراجعة)
export function weakest(n = 8, p = store.me) {
  if (!p) return [];
  ensure(p);
  return Object.entries(p.mastery)
    .map(([id, m]) => { let ok = 0, bad = 0; for (const s of Object.values(m)) { ok += s.ok; bad += s.bad; } return [id, bad - ok * 0.5, bad]; })
    .filter(([, , bad]) => bad > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}
