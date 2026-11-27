// «اختباراتي»: ألبوم لكل مادة يضيء عنصراً عنصراً، وجولات قصيرة، واختبار كبير بشهادة
import { h, owl, confetti, toast } from '../ui.js';
import { store } from '../store.js';
import { byId, flagUrl, pool, states } from '../data.js';
import { runQuiz } from '../quiz.js';
import { openCard } from '../card.js';
import { landmarkPhoto } from '../photos.js';
import { sfx } from '../sfx.js';
import { speak, LANG } from '../speech.js';
import { today } from '../mastery.js';
import { buildExam, passed, PASS } from '../exams-core.js';
import { SUBJECTS, subjectsFor, itemsOf, questionFor, scopesFor, recsOf, recordAnswer, roundIds, coverageOf, familyGoal, bigScopes, BIG_SUBJECTS, triedToday, logExam } from '../exams.js';
import { shuffle } from '../data.js';
import { openExamCert } from '../certs.js';
import { cnt } from '../arnum.js';
import { natureById } from '../exam-questions.js';
import { knowledgeById, KNOWLEDGE_GROUPS, knowledgeGroup } from '../exam-questions.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const param = (k) => new URLSearchParams(location.hash.split('?')[1] || '').get(k);
const starsTxt = (s) => '★'.repeat(s || 0) + '☆'.repeat(3 - (s || 0));
const itemWord = (subj, n) => (subj === 'flags' ? cnt(n, 'علماً واحداً', 'علمين', 'أعلام', 'علماً') : cnt(n, 'عنصراً واحداً', 'عنصرين', 'عناصر', 'عنصراً'));

// شريط التغطية: متقَن (أخضر) ويتعلّمه (أصفر) من المجموع
export function coverBar(cv) {
  const w = (n) => (cv.total ? (n / cv.total) * 100 : 0) + '%';
  return h('div', { class: 'cover-bar', title: `${cv.mastered} متقن، ${cv.learning} يتعلمه، ${cv.none} لم يُضأ` }, h('i', { class: 'm', style: { width: w(cv.mastered) } }), h('i', { class: 'l', style: { width: w(cv.learning) } }));
}

export function familyGoalBar() {
  const g = familyGoal();
  if (g.per.length < 2) return null;
  const pct = Math.min(100, Math.round((g.got / g.target) * 100));
  return h('div', { class: 'fam-goal' + (g.got >= g.target ? ' done' : '') },
    h('b', {}, g.got >= g.target ? '🎉 حققت العائلة هدف الأسبوع!' : '🎯 هدف العائلة هذا الأسبوع'),
    h('div', { class: 'bar' }, h('i', { style: { width: pct + '%' } })),
    h('small', {}, `${ar(g.got)} من ${ar(g.target)} نجمة · ` + g.per.map((x) => `${x.avatar} ${ar(x.n)}`).join(' ')));
}

// ---------- الصفحة الرئيسية لاختباراتي ----------
export function examsScreen(root, { go }) {
  const me = store.me; const lv = me.level;
  const subs = subjectsFor(lv);
  const as = me.assigned && !me.assigned.done ? me.assigned : null;
  root.append(owl(lv === 1 ? 'اختر ألبوماً، وأجب لتضيء صوره واحدة بعد واحدة!' : 'لكل مادة ألبوم. أجب صحيحاً فيضيء العنصر، وفي أيام مختلفة تكتمل نجومه الثلاث.'),
    familyGoalBar() || '',
    as ? h('button', { class: 'next-step assigned', onclick: () => go(`exam?s=${as.subj}&sc=${encodeURIComponent(as.scope || 'all')}&w=1`) },
      h('span', { class: 'ne' }, '🎯'), h('span', {}, h('b', {}, 'اختبار الأسبوع من الوالدين'), h('small', {}, SUBJECTS[as.subj].icon + ' ' + SUBJECTS[as.subj].title + (as.scopeTitle ? ' · ' + as.scopeTitle : ''))), h('span', { class: 'na' }, '←')) : '',
    h('button', { class: 'play-card', style: { '--c': '#e5484d' }, onclick: () => go('world') }, h('span', { class: 'pe' }, '🥇'), h('span', { class: 'tt' }, h('b', {}, 'اختبار اليوم'), h('small', {}, 'عشرة أسئلة مختلطة لجمع الأختام الذهبية'))),
    h('h2', { class: 'sec-title' }, '📚 ألبومات المواد'),
    h('div', { class: 'albums' }, subs.filter((k) => !SUBJECTS[k].extra).map((k) => albumTile(k))),
    ...(subs.some((k) => SUBJECTS[k].extra) ? [h('h2', { class: 'sec-title' }, '➕ مادة إضافية'), h('div', { class: 'albums' }, subs.filter((k) => SUBJECTS[k].extra).map((k) => albumTile(k)))] : []),
    h('h2', { class: 'sec-title' }, lv === 1 ? '🏁 تحدي الرحلة' : '🎓 الاختبار الكبير'),
    h('p', { class: 'hint' }, lv === 1 ? 'عشرة أسئلة عن دول رحلة كاملة. إن أجبت عن ثمانية منها صحيحاً نلت شهادة!' : `أسئلة من كل المواد بلا تلميح. من يجيب عن ${ar(PASS * 100)}٪ منها صحيحاً ينال شهادة إتقان. مرة واحدة في اليوم لكل اختبار.`),
    h('div', { class: 'big-list' }, bigScopes(me).map((s) => {
      const won = me.examCerts?.[s.key];
      return h('button', { class: 'big-item' + (won ? ' won' : ''), onclick: () => go('bigexam?k=' + encodeURIComponent(s.key)) },
        h('span', {}, s.title), h('small', {}, won ? '🎓 ' + new Date(won).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : triedToday(me, s.key) ? 'غداً' : cnt(s.n, 'سؤال', 'سؤالان', 'أسئلة', 'سؤالاً')));
    })));

  function albumTile(k) {
    const S = SUBJECTS[k]; const cv = coverageOf(me, k);
    return h('button', { class: 'album-tile', style: { '--c': S.c }, onclick: () => { sfx('tap'); go('exam?s=' + k); } },
      cv.due && cv.lit ? h('span', { class: 'badge-dot' }, ar(cv.due)) : null,
      h('span', { class: 'te' }, S.icon), h('b', {}, S.title),
      coverBar(cv), h('small', {}, `أضأت ${ar(cv.lit)} من ${ar(cv.total)}` + (cv.mastered ? ` · ⭐ ${ar(cv.mastered)}` : '')));
  }
}

// ---------- ألبوم مادة ----------
export function albumScreen(root, { go }) {
  const me = store.me; const owner = me.id; const lv = me.level;
  const subj = SUBJECTS[param('s')] ? param('s') : 'flags';
  const S = SUBJECTS[subj];
  const weekly = param('w') === '1';
  const scopes = S.country ? scopesFor(me) : [{ key: 'all', title: 'الكل', ids: null }];
  let scope = scopes.find((s) => s.key === (param('sc') || '')) || scopes.find((s) => s.key === 'all');
  const head = h('div', { class: 'album-head' });
  const grid = h('div', { class: 'album-grid ' + subj });
  const chips = S.country ? h('div', { class: 'scope-chips' }, scopes.map((s) => h('button', { class: 'chip' + (s === scope ? ' on' : ''), onclick: (e) => { scope = s; chips.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); draw(); } }, s.title))) : null;
  root.append(h('div', { class: 'album-title' }, h('span', {}, S.icon), h('h2', {}, S.title)), chips || '', head, grid);
  draw();

  function draw() {
    const p = store.profiles.find((x) => x.id === owner);
    const recs = recsOf(p, subj);
    const ids = itemsOf(subj, lv, scope.ids);
    const cv = coverageOf(p, subj, scope.ids);
    head.replaceChildren(
      coverBar(cv),
      h('p', {}, `أضأت ${ar(cv.lit)} من ${ar(cv.total)}` + (cv.mastered ? ` · ⭐⭐⭐ ${ar(cv.mastered)}` : '') + (cv.due && cv.lit ? ` · 🔔 ${ar(cv.due)} للمراجعة` : '')),
      ids.length ? h('button', { class: 'btn big', onclick: () => round() }, cv.none === cv.total ? '▶ ابدأ أول جولة' : '▶ جولة جديدة (١٠ أسئلة)') : h('p', { class: 'hint' }, 'لا عناصر هنا بعد. زر دولاً في «رحلاتي» أولاً.'));
    // المفاهيم والرحلات: مجموعات بعناوين
    if (subj === 'knowledge') {
      const groups = {};
      for (const id of ids) (groups[knowledgeGroup(id)] ||= []).push(id);
      grid.replaceChildren(...Object.entries(groups).flatMap(([g, list]) => [h('h3', { class: 'album-sub' }, KNOWLEDGE_GROUPS[g]), h('div', { class: 'album-grid knowledge' }, list.map((id) => tile(id, recs[id])))]));
    } else grid.replaceChildren(...ids.map((id) => tile(id, recs[id])));
  }

  function tile(id, r) {
    const s = r?.s || 0;
    const c = S.country ? byId[id] : null;
    let pic = null, name = '';
    if (c) {
      name = c.ar;
      if (subj === 'landmarks') pic = h('img', { src: landmarkPhoto(id)?.url, alt: '', loading: 'lazy', class: 'ph' });
      else pic = h('img', { src: flagUrl(c.f), alt: '', loading: 'lazy' });
      if (subj === 'capitals' && s) name = c.capAr.replace(/\s*\(.*\)\s*/, '');
    } else if (subj === 'nature') { const it = natureById[id]; pic = h('span', { class: 'kn-ic' }, { ocean: '🌊', sea: '⛵', river: '🏞️', lake: '💧', range: '⛰️', peak: '🏔️', desert: '🏜️' }[it.kind]); name = it.ar; }
    else { const k = knowledgeById[id]; pic = h('span', { class: 'kn-ic' }, k.icon || '🐪'); name = k.q ? (s ? k.a : '؟') : (s ? '✓' : '؟'); }
    return h('button', { class: 'al-item' + (s ? ' lit' : '') + (s === 3 ? ' master' : ''), title: name, onclick: () => (c ? openCard(id) : toast(knowledgeById[id]?.explain || natureById[id]?.fact || name, 5000)) },
      pic, h('small', {}, name), h('i', { class: 'st' }, starsTxt(s)));
  }

  function round() {
    const p = store.profiles.find((x) => x.id === owner);
    const ids = roundIds(p, subj, scope.ids);
    const questions = ids.map((id) => questionFor(subj, id, lv));
    let lit = [], stars = 0, gold = [];
    runQuiz({ title: S.icon + ' ' + S.title, questions, requeue: true, recordSrc: 'quiz',
      onAnswer: (q, ok) => { const r = recordAnswer(owner, subj, q.examItem, ok, q.skill); if (r.lit) lit.push(q.examItem); if (r.gained) stars++; if (r.gold) gold.push(q.examItem); },
      onDecide: (score) => { if (weekly) logExam(owner, { kind: 'weekly', weekly: true, subj, key: scope.key, title: S.title + ' · ' + scope.title, score, total: questions.length }); },
      onDone: (score, _r, box, m) => {
        if (lit.length || gold.length) { confetti(40); sfx('win'); }
        speak(lit.length ? `أحسنت! أضأت ${lit.length} جديدة` : 'أحسنت! لنكمل في جولة أخرى', LANG.ar);
        box.append(h('div', { class: 'quiz-end' },
          h('div', { class: 'big-emoji' }, lit.length ? '✨' : score >= 7 ? '🌟' : '💪'),
          h('h3', {}, lit.length ? `أضأت ${itemWord(subj, lit.length)} جديدة!` : `${ar(score)} من ${ar(questions.length)}`),
          stars ? h('p', {}, `⭐ ${cnt(stars, 'نجمة واحدة', 'نجمتين', 'نجوم', 'نجمة')} جديدة`) : null,
          gold.length ? h('p', {}, '🥇 أختام ذهبية جديدة: ' + gold.map((id) => byId[id].ar).join('، ')) : null,
          lit.length && S.country ? h('div', { class: 'neighbors' }, lit.map((id) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar))) : null,
          h('p', { class: 'hint' }, `بقي ${ar(coverageOf(store.profiles.find((x) => x.id === owner), subj, scope.ids).none)} لم يُضأ بعد في هذا الألبوم.`),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn big', onclick: () => { m.close(); setTimeout(round, 300); } }, '▶ جولة أخرى'),
            h('button', { class: 'btn big soft', onclick: () => m.close() }, 'إنهاء'))));
      },
      onClose: () => { if (root.isConnected) draw(); } });
  }
}

// ---------- الاختبار الكبير ----------
export function bigExamScreen(root, { go }) {
  const me = store.me; const owner = me.id; const lv = me.level;
  const sc = bigScopes(me).find((s) => s.key === param('k')) || bigScopes(me)[0];
  const ids = sc.ids ? sc.ids.filter((id) => byId[id]?.kind === 'state') : pool(lv).map((c) => c.id);
  const subs = BIG_SUBJECTS.filter((k) => SUBJECTS[k].levels.includes(lv));
  const need = Math.ceil(sc.n * PASS);
  const won = me.examCerts?.[sc.key];
  const tried = triedToday(me, sc.key);
  const last = (me.examLog || []).find((x) => x.kind === 'big' && x.key === sc.key);
  root.append(owl(lv === 1 ? `تحدي ${sc.title}: عشرة أسئلة. أجب عن ثمانية صحيحاً لتنال شهادتك!` : `${cnt(sc.n, 'سؤال', 'سؤالان', 'أسئلة', 'سؤالاً')} من كل المواد عن ${sc.title}. تحتاج ${ar(need)} إجابة صحيحة لتنال شهادة الإتقان.`),
    h('div', { class: 'panel center' },
      h('h2', {}, sc.title),
      won ? h('p', {}, '🎓 نلت شهادة هذا الاختبار يوم ' + new Date(won).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })) : null,
      last ? h('p', { class: 'hint' }, `آخر محاولة: ${ar(last.score)} من ${ar(last.total)}`) : null,
      won ? h('button', { class: 'btn soft', onclick: () => openExamCert(me, { key: sc.key, title: sc.title, list: ids.map((id) => byId[id]).filter(Boolean), score: last?.score || need, total: last?.total || sc.n }) }, '🎓 شهادتي') : null,
      tried ? h('p', { class: 'strong' }, 'اختبرت هذا اليوم. راجع الألبومات، وعُد غداً 🌙') : h('button', { class: 'btn big', onclick: start }, '▶ ابدأ الاختبار')));

  function start() {
    const p = store.profiles.find((x) => x.id === owner);
    const plan = buildExam(ids, subs.map((k) => ({ key: k, ok: (id) => itemsOf(k, lv, [id]).length > 0 })), sc.n, shuffle);
    const questions = plan.map((x) => { const q = questionFor(x.subj, x.id, lv); delete q.remake; return q; });
    const missed = [];
    runQuiz({ title: (lv === 1 ? '🏁 ' : '🎓 ') + sc.title, questions, requeue: false,
      onAnswer: (q, ok) => { recordAnswer(owner, q.examSubj, q.examItem, ok, q.skill); if (!ok) missed.push(q.examItem); },
      onDecide: (score) => logExam(owner, { kind: 'big', key: sc.key, title: sc.title, score, total: questions.length, pass: passed(score, questions.length), missed: [...new Set(missed)].slice(0, 10) }),
      onAbort: (score, answered) => logExam(owner, { kind: 'big', key: sc.key, title: sc.title, score, total: questions.length, pass: false, aborted: answered }),
      onDone: (score, _r, box, m) => {
        const ok = passed(score, questions.length);
        if (ok) { confetti(); sfx('win'); speak('مبارك! نجحت ونلت شهادة الإتقان', LANG.ar); } else speak('اقتربت! راجع هذه الدول وعد غداً', LANG.ar);
        const p2 = store.profiles.find((x) => x.id === owner);
        box.append(h('div', { class: 'quiz-end' },
          h('div', { class: 'big-emoji' }, ok ? '🎓' : '💪'),
          h('h3', {}, `${ar(score)} من ${ar(questions.length)}`),
          ok ? h('p', {}, 'نجحت! هذه شهادتك.') : h('p', {}, `اقتربت! تحتاج ${ar(need)}. راجع هذه، وأعد الاختبار غداً:`),
          !ok && missed.length ? h('div', { class: 'neighbors' }, [...new Set(missed)].filter((id) => byId[id]).slice(0, 8).map((id) => h('button', { class: 'chip', onclick: () => openCard(id) }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar))) : null,
          h('div', { class: 'row wrap' },
            ok ? h('button', { class: 'btn big', onclick: () => openExamCert(p2, { key: sc.key, title: sc.title, list: ids.map((id) => byId[id]).filter(Boolean), score, total: questions.length }) }, '🎓 شهادتي') : null,
            h('button', { class: 'btn big soft', onclick: () => m.close() }, 'إنهاء'))));
      },
      onClose: () => { if (root.isConnected) { root.innerHTML = ''; bigExamScreen(root, { go }); } } });
  }
}
