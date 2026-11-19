// سجل الإتقان والمراجعة المتباعدة
// لكل طفل ولكل دولة ولكل مهارة: عدد الإجابات الصحيحة والخاطئة وآخر محاولة.
// ختم الزيارة: بعد سؤال واحد صحيح.
// الختم الذهبي: أدلة تتراكم في التمرين الشامل (انظر آخر الملف): العلم والعاصمة صحيحان في يومين مختلفين، والموقع، ومهارتان أخريان.
// المراجعة: بعد الختم الذهبي تُستحق مراجعة بعد ٣ أيام، ثم ٧، ثم ٣٠. الخطأ في المراجعة يعيدها إلى ٣ أيام.
import { store } from './store.js';

export const SKILLS = { flag: 'العلم', capital: 'العاصمة', map: 'الموقع', names: 'الأسماء باللغات', landmark: 'المعالم', continent: 'القارة', language: 'اللغات', neighbor: 'الجيران', nature: 'الأنهار والجبال' };
export const INTERVALS = [3, 7, 30];
const DAY = 864e5;
export const today = () => new Date().toLocaleDateString('en-CA');
// جمع أيام تقويمية بالتوقيت المحلي (لا UTC)
const addDays = (d, n) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd + n).toLocaleDateString('en-CA'); };

function ensure(p) {
  p.mastery ||= {};
  p.gold ||= {};
  p.review ||= {};
  return p;
}

// تسجيل محاولة في مهارة (من الألعاب والامتحانات والأسئلة)
// src: 'quiz' (أسئلة الختم والامتحان والمراجعة والتحدي: إجابة أولى مستقلة) أو 'practice' (ألعاب التدريب، تُحفظ منفصلة)
export function record(id, skill, ok, { pid, src = 'quiz' } = {}) {
  const fn = (p) => {
    ensure(p);
    p.practice ||= {};
    const m = ((src === 'practice' ? p.practice : p.mastery)[id] ||= {});
    const s = (m[skill] ||= { ok: 0, bad: 0 });
    if (ok) s.ok++; else s.bad++;
    s.last = today();
    // سجل النشاط اليومي للوحة الوالدين
    p.activity ||= {};
    const a = (p.activity[today()] ||= { q: 0, ok: 0 });
    a.q++; if (ok) a.ok++;
    if (src === 'practice') { a.pq = (a.pq || 0) + 1; }
  };
  if (pid) store.patchProfile(pid, fn); else store.patch(fn);
}

export const hasVisit = (id) => !!store.me?.stamps?.[id];
export const hasGold = (id) => !!store.me?.gold?.[id];

// بعد خطأ في سؤال الزيارة ينتظر الطفل دقيقتين ويقرأ البطاقة، حتى لا يصل إلى الختم بالتخمين المتكرر
export const VISIT_WAIT = 120e3;
export function visitWait(id) {
  const t = store.me?.visitFail?.[id]; if (!t) return 0;
  return Math.max(0, t + VISIT_WAIT - Date.now());
}
export function visitFailed(id) { store.patch((p) => { (p.visitFail ||= {})[id] = Date.now(); }); }

export function giveVisit(id) { const ok = store.stamp(id); if (ok) store.patch((p) => { (p.visitAt ||= {})[id] = Date.now(); }); return ok; }

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
  // نسبة الخطأ في الأسئلة المستقلة (لا الألعاب)، بحد أدنى محاولتين، مع ترجيح الأحدث
  const t = Date.now();
  return Object.entries(p.mastery)
    .map(([id, m]) => {
      let ok = 0, bad = 0, last = '';
      for (const s of Object.values(m)) { ok += s.ok; bad += s.bad; if ((s.last || '') > last) last = s.last; }
      const days = last ? (t - new Date(last + 'T12:00:00').getTime()) / 864e5 : 99;
      return [id, (bad / (ok + bad)) * (days < 14 ? 1 : 0.6), ok + bad, bad];
    })
    .filter(([, r, n, bad]) => n >= 2 && bad > 0 && r >= 0.34).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}

// ---------- الختم الذهبي بالأدلة المتراكمة في التمرين الشامل ----------
// الدليل: إجابة صحيحة من المحاولة الأولى عن مهارة لهذه الدولة، داخل جلسة مختلطة لا سياق فيها.
// الإلزامي: العلم والموقع، والعاصمة إن كانت صالحة للسؤال. ومعها مهارتان أخريان.
// العلم والعاصمة أسئلة اختيار يمكن تخمينها، فيلزم لكل منهما جوابان صحيحان في يومين مختلفين. والخطأ يمحو أدلة تلك المهارة.
export const OTHER_SKILLS = ['names', 'landmark', 'language', 'neighbor', 'nature'];
export const OTHER_NEEDED = 2;
export const TWICE = ['flag', 'capital'];
const need = (k) => (TWICE.includes(k) ? 2 : 1);
// عدد الأدلة المحفوظة لمهارة: ev[k] تاريخ الأول، ev[k+'2'] تاريخ الثاني
export const evCount = (ev, k) => (ev?.[k] ? (ev[k + '2'] ? 2 : 1) : 0);
// هل يفيد السؤال عن هذه المهارة اليوم؟ (الدليل الثاني لا يُقبل في يوم الأول)
export const evAskable = (ev, k) => evCount(ev, k) < need(k) && !(evCount(ev, k) === 1 && ev[k] >= today());
// يُحسب الدليل فقط من اليوم التالي للزيارة وبعد ٨ ساعات منها
export function goldEligible(p, id) {
  if (!p.stamps?.[id] || p.gold?.[id]) return false;
  if (p.stamps[id] >= today()) return false;
  const at = p.visitAt?.[id];
  return !(at && Date.now() - at < 8 * 36e5);
}
export function goldProgress(p, id, required) {
  const ev = p.evidence?.[id] || {};
  const req = required.map((k) => [k, evCount(ev, k) >= need(k), evCount(ev, k), need(k)]);
  const others = OTHER_SKILLS.filter((k) => ev[k]).length;
  return { req, others, done: req.every(([, v]) => v) && others >= OTHER_NEEDED };
}
// يسجّل الدليل ويمنح الذهبي عند اكتماله. يعيد true إن صار ذهبياً الآن
export function addEvidence(pid, id, skill, ok, required) {
  let became = false;
  store.patchProfile(pid, (p) => {
    ensure(p);
    if (!goldEligible(p, id)) return;
    const ev = ((p.evidence ||= {})[id] ||= {});
    if (!ok) { delete ev[skill]; delete ev[skill + '2']; }
    else if (!ev[skill]) ev[skill] = today();
    else if (need(skill) === 2 && !ev[skill + '2'] && ev[skill] < today()) ev[skill + '2'] = today();
    if (goldProgress(p, id, required).done) {
      p.gold[id] = today();
      p.review[id] = { step: 0, due: addDays(today(), INTERVALS[0]) };
      became = true;
    }
  });
  return became;
}
