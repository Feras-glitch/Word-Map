// خلاصات للوالدين: ملخص الأسبوع، وأخطاء التمرين، وأسئلة العشاء
import { byId, states, continents, shuffle } from './data.js';
import { SUBJECTS, recsOf, itemsOf } from './exams.js';
import { knowledgeById, natureById, iconLabel } from './exam-questions.js';
import { cnt, li } from './arnum.js';
import { gp } from './gender.js';
import { weakest } from './mastery.js';

const DAY = 864e5;
const ar = (n) => Number(n).toLocaleString('ar-EG');
const SKILL_NAME = { flag: 'علم', capital: 'عاصمة', map: 'موقع', landmark: 'معلم', continent: 'قارة', neighbor: 'جيران', language: 'لغة', names: 'اسم', nature: 'طبيعة', compare: 'مقارنة' };
const capName = (c) => (c.capAr || '').replace(/\s*\(.*\)\s*/, '');

// اسم عنصر في مادة: «علم الأردن»، «عاصمة لبنان»، «نهر النيل»
export function itemName(subj, id) {
  const c = byId[id];
  if (c && SUBJECTS[subj].country) return ({ flags: 'علم ', map: 'موقع ', capitals: 'عاصمة ', landmarks: 'معلم ', continents: '', languages: 'لغة ', money: 'عملة ' }[subj] || '') + c.ar;
  if (subj === 'icons') return iconLabel(id);
  return natureById[id]?.ar || knowledgeById[id]?.q || id;
}

// أخطاء ألعاب التمرين: دولة ومهارة أخطأ فيها مرتين على الأقل وأكثر مما أصاب
export function practiceErrors(p, n = 6) {
  const out = [];
  for (const [id, m] of Object.entries(p.practice || {})) for (const [k, x] of Object.entries(m)) {
    if (byId[id] && x.bad >= 2 && x.bad > x.ok) out.push({ id, k, bad: x.bad, ok: x.ok, text: `${SKILL_NAME[k] || k} ${byId[id].ar} ✗${ar(x.bad)}` });
  }
  return out.sort((a, b) => b.bad - a.bad).slice(0, n);
}

// سطر واحد عن الأسبوع: كم سؤالاً، وكم عنصراً أضاء، وأكثر ما يخطئ فيه
export function weekSummary(p) {
  const days = [...Array(7)].map((_, i) => new Date(Date.now() - i * DAY).toLocaleDateString('en-CA'));
  const q = days.reduce((s, d) => s + (p.activity?.[d]?.q || 0), 0);
  let lit = 0; let worst = null;
  for (const [subj, bag] of Object.entries(p.exam || {})) for (const [id, r] of Object.entries(bag)) {
    if (r.f && days.includes(r.f)) lit++;
    if (r.miss && r.s < 3 && (!worst || r.miss > worst.miss)) worst = { subj, id, miss: r.miss };
  }
  const prErr = practiceErrors(p, 1)[0];
  const parts = [];
  parts.push(q ? `${gp(p, 'أجاب', 'أجابت')} عن ${cnt(q, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤالاً')}` : gp(p, 'لم يلعب هذا الأسبوع', 'لم تلعب هذا الأسبوع'));
  if (lit) parts.push(`${gp(p, 'وأضاء', 'وأضاءت')} ${cnt(lit, 'عنصراً واحداً', 'عنصرين', 'عناصر', 'عنصراً')} في اختباراتي`);
  const w = worst ? itemName(worst.subj, worst.id) : prErr ? prErr.text.replace(/ ✗.*/, '') : (weakest(1, p)[0] ? byId[weakest(1, p)[0]].ar : null);
  if (w) parts.push(`وأكثر ما ${gp(p, 'يخطئ', 'تخطئ')} فيه: ${w}`);
  return parts.join('، ') + '.';
}

// ثلاثة أسئلة شفهية مما تعلّمه الطفل مؤخراً (أو من دوله المزورة)
export function dinnerQuestions(p) {
  const recent = [];
  for (const [subj, bag] of Object.entries(p.exam || {})) for (const [id, r] of Object.entries(bag)) if (r.s) recent.push({ subj, id, t: r.last || '' });
  recent.sort((a, b) => (a.t < b.t ? 1 : -1));
  const ids = [...new Set([...recent.filter((x) => byId[x.id]).map((x) => x.id), ...Object.keys(p.stamps || {})])].filter((id) => byId[id]?.kind === 'state');
  const kn = recent.filter((x) => x.subj === 'knowledge' && knowledgeById[x.id]?.a).map((x) => knowledgeById[x.id]);
  const out = [];
  for (const id of shuffle(ids.slice(0, 12))) {
    const c = byId[id];
    const opts = [
      p.level > 1 && c.capAr ? { q: `ما عاصمة ${c.ar}؟`, a: capName(c) } : null,
      { q: `في أي قارة ${c.ar}؟`, a: continents[c.cont] },
      c.landmark ? { q: `اذكر معلماً مشهوراً في ${c.ar}.`, a: c.landmark } : null,
      p.level > 1 && c.borders.filter((b) => byId[b]?.kind === 'state').length ? { q: `اذكر دولة جارة ${li(c.ar)}.`, a: c.borders.filter((b) => byId[b]?.kind === 'state').map((b) => byId[b].ar).slice(0, 4).join(' أو ') } : null,
      p.level === 1 ? { q: `ما ألوان علم ${c.ar}؟ (اطلب منه أن يصفه)`, a: 'افتحوا بطاقة الدولة وقارنوا' } : null,
    ].filter(Boolean);
    out.push(shuffle(opts)[0]);
    if (out.length >= 3) break;
  }
  if (out.length < 3 && kn.length) out.push({ q: kn[0].q, a: kn[0].a });
  while (out.length < 3) { const c = shuffle(states.filter((s) => s.famous))[0]; out.push({ q: `في أي قارة ${c.ar}؟`, a: continents[c.cont] }); }
  return out.slice(0, 3);
}
export { itemsOf, recsOf };
