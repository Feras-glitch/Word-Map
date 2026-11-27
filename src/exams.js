// «اختباراتي»: المواد، وعناصر كل مادة، وسؤال كل عنصر، وحفظ النجوم
import { states, byId, pool, shuffle, continents, contOrder } from './data.js';
import { Q, usable, look } from './quiz.js';
import { hasPhoto } from './photos.js';
import { store } from './store.js';
import { today, addEvidence, goldEligible } from './mastery.js';
import { requiredFor } from './screens/world.js';
import { applyAnswer, coverage, pickRound, weekKey } from './exams-core.js';
import { KNOWLEDGE, knowledgeById, greetOf, greetQ, natureItems, natureById, natureQ, moneyOk, currencyQ, govQ } from './exam-questions.js';
import { journeys, journeyState } from './journeys.js';
import { h } from './ui.js';
import { flagUrl } from './data.js';

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
// أعلام متشابهة للمستوى الثالث: الخيارات من مجموعة الشبه نفسها حين توجد
function flagHard(c, n) {
  const sim = states.filter((s) => s.id !== c.id && look(c.id, s.id));
  if (sim.length < 1) return Q.flag(c, n);
  const q = Q.flag(c, n);
  const fill = shuffle(sim).slice(0, n - 1);
  const rest = shuffle(states.filter((s) => s.id !== c.id && !fill.includes(s) && s.cont === c.cont)).slice(0, n - 1 - fill.length);
  const opts = shuffle([c, ...fill, ...rest]);
  return { ...q, options: opts.map((o) => ({ correct: o.id === c.id, el: h('img', { class: 'qo-big-flag', src: flagUrl(o.f), alt: '' }) })), explain: `هذا علم ${c.ar}. انظر جيداً: أعلام ${fill.map((s) => s.ar).join(' و')} تشبهه.` };
}

// كل مادة: items(level) عناصرها، q(id, level) سؤال العنصر، ok(id, level) هل يصلح، country: هل العنصر دولة
export const SUBJECTS = {
  flags: { icon: '🚩', title: 'الأعلام', c: '#e5484d', country: true, levels: [1, 2, 3],
    q: (c, lv) => (lv === 1 ? Q.flag(c, 3) : lv === 2 ? (Math.random() < 0.5 ? Q.flagWho(c, 4) : Q.flag(c, 4)) : (Math.random() < 0.5 ? flagHard(c, 4) : Q.flagWho(c, 4))) },
  map: { icon: '📍', title: 'الخريطة', c: '#2b7fd4', country: true, levels: [1, 2, 3], ok: (c) => !!(c.cen || c.bb), q: (c) => Q.map(c) },
  capitals: { icon: '🏛️', title: 'العواصم', c: '#7b5cd6', country: true, levels: [2, 3], ok: (c) => usable('capital', c),
    q: (c, lv) => (lv === 3 && usable('spell', c) && Math.random() < 0.4 ? Q.spell(c) : Math.random() < 0.5 ? Q.capital(c, 4) : Q.capWho(c, 4)) },
  landmarks: { icon: '⭐', title: 'المعالم', c: '#d4a017', country: true, levels: [1, 2, 3], ok: (c) => hasPhoto(c.id),
    q: (c, lv) => (lv === 3 && Math.random() < 0.4 ? Q.landmark(c, 4) : Q.landmarkPic(c, lv === 1 ? 3 : 4)) },
  continents: { icon: '🌍', title: 'القارات والجيران', c: '#1a9b55', country: true, levels: [1, 2, 3], ok: (c, lv) => usable('continent', c) || (lv > 1 && usable('neighbor', c)),
    q: (c, lv) => (lv === 1 || !usable('neighbor', c) ? Q.continent(c, lv === 1 ? 3 : 4) : lv === 2 && Math.random() < 0.5 && usable('continent', c) ? Q.continent(c, 4) : Q.neighbor(c, 4)) },
  languages: { icon: '🗣️', title: 'اللغات والتحيات', c: '#2a9d8f', country: true, levels: [1, 2, 3], ok: (c, lv) => (lv === 1 ? !!greetOf(c) : !!greetOf(c) || usable('language', c)),
    q: (c, lv) => {
      if (lv === 1 || !usable('language', c)) return greetQ(c, lv === 1 ? 3 : 4);
      const k = rnd(lv === 2 ? ['language', 'greet'] : ['language', 'greet', 'names']);
      return k === 'greet' && greetOf(c) ? greetQ(c, 4) : k === 'names' ? Q.names(c, 4, 'en') : Q.language(c, 4);
    } },
  nature: { icon: '🏞️', title: 'الطبيعة', c: '#0f766e', country: false, levels: [1, 2, 3], items: (lv) => natureItems(lv).map((x) => x.id),
    q: (id, lv) => natureQ(natureById[id], lv === 1 ? 3 : 4, lv), label: (id) => natureById[id]?.ar },
  knowledge: { icon: '📘', title: 'المفاهيم والرحلات', c: '#0ea5e9', country: false, levels: [1, 2, 3], items: (lv) => KNOWLEDGE.filter((k) => k.lv <= lv).map((k) => k.id),
    q: (id, lv) => knowledgeById[id].gen(lv === 1 ? 3 : 4), label: (id) => knowledgeById[id]?.q || knowledgeById[id]?.id },
  money: { icon: '💰', title: 'العملة ونظام الحكم', c: '#a0522d', country: true, levels: [3], extra: true, ok: (c) => moneyOk(c, 'cur') || moneyOk(c, 'gov'),
    q: (c) => (moneyOk(c, 'gov') && (!moneyOk(c, 'cur') || Math.random() < 0.5) ? govQ(c, 4) : currencyQ(c, 4)) },
};
export const SUBJECT_ORDER = ['flags', 'map', 'capitals', 'landmarks', 'continents', 'languages', 'nature', 'knowledge', 'money'];
export const subjectsFor = (lv) => SUBJECT_ORDER.filter((k) => SUBJECTS[k].levels.includes(lv));

// عناصر المادة لمستوى الطفل، داخل نطاق (null = كل عناصر المستوى)
export function itemsOf(subj, lv, scopeIds = null) {
  const S = SUBJECTS[subj];
  if (!S.country) return S.items(lv);
  const base = (scopeIds ? scopeIds.map((id) => byId[id]).filter((c) => c && c.kind === 'state') : pool(lv));
  return base.filter((c) => !S.ok || S.ok(c, lv)).map((c) => c.id);
}
// سؤال عنصر، مع remake لإعادته في آخر الجولة
export function questionFor(subj, id, lv) {
  const S = SUBJECTS[subj];
  const make = () => { const q = S.country ? S.q(byId[id], lv) : S.q(id, lv); return { ...q, examItem: id, examSubj: subj, remake: () => ({ ...make(), again: true }) }; };
  return make();
}

// النطاقات: الرحلة الحالية، ما زرته، كل قارة، العالم كله
export function scopesFor(p) {
  const lv = p.level;
  const js = journeyState(p); const cur = js.current || js.list?.[0];
  const out = [];
  if (cur) out.push({ key: 'j:' + cur.id, title: cur.icon + ' ' + cur.title, ids: cur.ids });
  const visited = Object.keys(p.stamps || {});
  if (visited.length) out.push({ key: 'visited', title: '🛂 ما زرته', ids: visited });
  if (lv > 1) for (const k of contOrder) out.push({ key: 'c:' + k, title: 'قارة ' + continents[k], ids: states.filter((s) => s.cont === k).map((s) => s.id) });
  out.push({ key: 'all', title: '🌐 كل ما في مستواي', ids: null });
  return out;
}

// ---------- الحفظ ----------
export const recsOf = (p, subj) => p.exam?.[subj] || {};
// يسجّل إجابة: النجوم، وهدف العائلة الأسبوعي، والختم الذهبي (للدول)
export function recordAnswer(pid, subj, id, ok, skill) {
  let res = null;
  store.patchProfile(pid, (p) => {
    p.exam ||= {}; const bag = (p.exam[subj] ||= {});
    res = applyAnswer(bag[id], ok, today());
    bag[id] = res.rec;
    if (res.gained) { const w = weekKey(today()); if (p.weekStars?.w !== w) p.weekStars = { w, n: 0 }; p.weekStars.n++; }
  });
  const c = SUBJECTS[subj].country ? byId[id] : null;
  // الإجابة في الاختبار تُحسب للختم الذهبي بشروطه نفسها (قرار فراس)
  let gold = false;
  if (c && skill && !['continent', 'compare', 'money', 'knowledge'].includes(skill) && !(skill === 'landmark' && !hasPhoto(c.id))) {
    const p = store.profiles.find((x) => x.id === pid);
    if (p && goldEligible(p, c.id)) gold = addEvidence(pid, c.id, skill, ok, requiredFor(c));
  }
  return { ...res, gold };
}

export function roundIds(p, subj, scopeIds) {
  return pickRound(shuffle(itemsOf(subj, p.level, scopeIds)), recsOf(p, subj), today(), 10, shuffle);
}
export const coverageOf = (p, subj, scopeIds) => coverage(itemsOf(subj, p.level, scopeIds), recsOf(p, subj), today());

// هدف العائلة: عشر نجوم لكل مستكشف في الأسبوع
export function familyGoal() {
  const w = weekKey(today());
  const ps = store.profiles.filter((p) => !p.guest);
  const got = ps.reduce((s, p) => s + (p.weekStars?.w === w ? p.weekStars.n : 0), 0);
  return { got, target: Math.max(10, ps.length * 10), per: ps.map((p) => ({ name: p.name, avatar: p.avatar, n: p.weekStars?.w === w ? p.weekStars.n : 0 })) };
}

// ---------- الاختبار الكبير ----------
export function bigScopes(p) {
  const lv = p.level; const out = [];
  for (const j of journeys(lv)) out.push({ key: 'j:' + j.id, title: j.icon + ' ' + j.title, ids: j.ids, n: lv === 1 ? 10 : 20 });
  if (lv > 1) for (const k of contOrder) out.push({ key: 'c:' + k, title: 'قارة ' + continents[k], ids: states.filter((s) => s.cont === k).map((s) => s.id), n: 30 });
  if (lv > 1) out.push({ key: 'world', title: '🌐 العالم كله', ids: null, n: 40 });
  return out;
}
export const BIG_SUBJECTS = ['flags', 'map', 'capitals', 'landmarks', 'continents', 'languages'];
export const triedToday = (p, key) => (p.examLog || []).some((x) => x.kind === 'big' && x.key === key && x.date === today());
export function logExam(pid, entry) {
  store.patchProfile(pid, (p) => {
    (p.examLog ||= []).unshift({ ...entry, date: today() }); p.examLog = p.examLog.slice(0, 80);
    if (entry.pass && entry.kind === 'big') (p.examCerts ||= {})[entry.key] = today();
    if (entry.weekly && p.assigned && !p.assigned.done) p.assigned.done = { date: today(), score: entry.score, total: entry.total };
  });
}
