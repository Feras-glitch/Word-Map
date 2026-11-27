// منطق «اختباراتي» بلا واجهة (يُختبر في node)
// لكل عنصر (علم دولة، موقعها، عاصمتها...) سجلّ: { s: النجوم ٠–٣، last: تاريخ آخر تغيّر، f: تاريخ أول إضاءة، miss: عدد الأخطاء }
// النجمة الأولى بأول إجابة صحيحة، والثانية بإجابة صحيحة بعد يومين أو أكثر، والثالثة بعد أسبوع أو أكثر.
// العنصر ذو النجوم الثلاث «متقَن»، ويعود للمراجعة بعد شهر.
export const GAP = [0, 2, 7, 30];
export const PASS = 0.8;

const toDate = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
export const addDays = (d, n) => { const x = toDate(d); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };

// هل حان وقت السؤال عن هذا العنصر؟ (غير المضاء دائماً مستحق)
export function isDue(rec, today) {
  if (!rec || !rec.s) return true;
  return daysBetween(rec.last, today) >= GAP[rec.s];
}

// يعيد سجلاً جديداً بعد الإجابة، ومعه ما تغيّر (gained: نجمة جديدة، lit: أضاء لأول مرة)
export function applyAnswer(rec, ok, today) {
  const r = { s: 0, miss: 0, ...(rec || {}) };
  let gained = false, lit = false;
  if (ok) {
    if (r.s === 0) { r.s = 1; r.last = today; r.f ||= today; gained = lit = true; }
    else if (daysBetween(r.last, today) >= GAP[r.s]) {
      // المتقَن يُراجع: يبقى بثلاث نجوم ويُحسب موعده من جديد
      if (r.s < 3) { r.s++; gained = true; }
      r.last = today;
    }
  } else {
    r.miss++;
    if (r.s > 0) { r.s--; r.last = today; }
  }
  return { rec: r, gained, lit };
}

// يختار عناصر الجولة: المراجعات المستحقة أولاً (حتى النصف)، ثم الجديدة، ثم بقية المستحقة، ثم الأقدم.
// ids مرتبة كما يعرضها الألبوم؛ rnd دالة خلط (تُمرَّر للاختبار)
export function pickRound(ids, recs, today, n = 10, rnd = (a) => a) {
  const R = (id) => recs?.[id];
  const reviews = rnd(ids.filter((id) => R(id)?.s && isDue(R(id), today)));
  const fresh = rnd(ids.filter((id) => !R(id)?.s));
  const rest = ids.filter((id) => R(id)?.s && !isDue(R(id), today)).sort((a, b) => (R(a).last < R(b).last ? -1 : 1));
  const out = [...reviews.slice(0, Math.ceil(n / 2))];
  for (const id of [...fresh, ...reviews.slice(Math.ceil(n / 2)), ...rest]) { if (out.length >= n) break; if (!out.includes(id)) out.push(id); }
  return out;
}

// تغطية ألبوم: كم متقَن، وكم يتعلمه، وكم لم يُضأ، وكم مستحق اليوم
export function coverage(ids, recs, today) {
  const c = { total: ids.length, mastered: 0, learning: 0, none: 0, due: 0 };
  for (const id of ids) {
    const r = recs?.[id];
    if (!r?.s) c.none++; else if (r.s === 3) c.mastered++; else c.learning++;
    if (r?.s && isDue(r, today)) c.due++;
  }
  c.lit = c.mastered + c.learning;
  return c;
}

// أضعف العناصر: أكثرها أخطاء مما لم يُتقن بعد
export function weakItems(ids, recs, n = 5) {
  return ids.filter((id) => recs?.[id]?.miss && recs[id].s < 3).sort((a, b) => recs[b].miss - recs[a].miss).slice(0, n);
}

// الاختبار الكبير: يوزّع الأسئلة على المواد بالتناوب، وعلى عناصر النطاق دون تكرار ما أمكن.
// subjects: [{ key, ok(id) }]، ids: عناصر النطاق. يعيد [{ subj, id }]
export function buildExam(ids, subjects, n, rnd = (a) => a) {
  const out = []; const used = {};
  const queues = Object.fromEntries(subjects.map((s) => [s.key, rnd(ids.filter((id) => s.ok(id)))]));
  const live = subjects.filter((s) => queues[s.key].length);
  let k = 0, guard = 0;
  while (out.length < n && live.length && guard++ < n * 20) {
    const s = live[k++ % live.length];
    const q = queues[s.key];
    // نفضّل دولة لم تُسأل في هذا الاختبار بعد
    let i = q.findIndex((id) => !used[id]);
    if (i < 0) i = 0;
    const id = q.splice(i, 1)[0];
    if (id === undefined) { live.splice(live.indexOf(s), 1); continue; }
    used[id] = 1; out.push({ subj: s.key, id });
    if (!q.length) live.splice(live.indexOf(s), 1);
  }
  return out;
}

export const passed = (score, total) => total > 0 && score / total >= PASS;

// الأسبوع (يبدأ السبت) لهدف العائلة
export function weekKey(d) {
  const x = toDate(d); const back = (x.getDay() + 1) % 7; x.setDate(x.getDate() - back);
  return x.toLocaleDateString('en-CA');
}
