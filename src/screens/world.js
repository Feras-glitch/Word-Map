// التمرين الشامل: أسئلة مختلطة من دول العالم كلها، لا سياق فيها يكشف الجواب.
// هنا تُجمع أدلة الختم الذهبي، وتُجرى المراجعات المتباعدة مخفية بين الأسئلة،
// وبعد الانتهاء يمكن تحدّي الإخوة بالأسئلة نفسها.
import { h, owl, toast, confetti } from '../ui.js';
import { states, byId, pool, shuffle, continents, flagUrl } from '../data.js';
import { store } from '../store.js';
import { Q, usable, runQuiz } from '../quiz.js';
import { hasPhoto } from '../photos.js';
import { dueReviews, reviewResult, goldEligible, addEvidence, evAskable, goldPercent, OTHER_SKILLS, OTHER_NEEDED } from '../mastery.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const N = 10;
// أنواع الأسئلة لكل مهارة، بالاتجاهين
const BY_SKILL = {
  flag: ['flag', 'flagWho'], capital: ['capital', 'capWho', 'spell'], map: ['map'], landmark: ['landmarkPic'],
  names: ['names'], language: ['language'], neighbor: ['neighbor'], nature: ['natureWho'], continent: ['continent'],
};
export const requiredFor = (c) => ['flag', 'map', ...(usable('capital', c) ? ['capital'] : [])];
const kindFor = (skill, c) => { const ks = BY_SKILL[skill].filter((k) => usable(k, c)); return ks.length ? ks[Math.floor(Math.random() * ks.length)] : null; };

export function buildSession(p) {
  const level = p.level; const n = level === 1 ? 3 : 4;
  const specs = []; const used = new Set();
  const maps = () => specs.filter((s) => s.kind === 'map').length;
  const add = (c, skill, tag) => { if (skill === 'map' && maps() >= 3) return false; const k = kindFor(skill, c); if (k && specs.length < N) { specs.push({ id: c.id, kind: k, ...tag }); used.add(c.id); return true; } return false; };
  // ١) مراجعات مستحقة: سؤالان لكل دولة (مهارة إلزامية + أخرى)
  for (const id of dueReviews(p).slice(0, 2)) {
    const c = byId[id];
    add(c, shuffle(requiredFor(c))[0], { review: id });
    add(c, shuffle(OTHER_SKILLS.filter((k) => kindFor(k, c)))[0] || 'continent', { review: id });
  }
  // ٢) دول زارها الطفل ولم يتقنها: نسأل عن المهارات الناقصة، الإلزامية أولاً
  const cands = Object.keys(p.stamps || {}).map((id) => byId[id]).filter((c) => c && goldEligible(p, c.id));
  for (const c of shuffle(cands).slice(0, 3)) {
    const ev = p.evidence?.[c.id] || {};
    const missing = [...requiredFor(c).filter((k) => evAskable(ev, k)), ...(OTHER_SKILLS.filter((k) => ev[k]).length >= OTHER_NEEDED ? [] : shuffle(OTHER_SKILLS.filter((k) => !ev[k] && kindFor(k, c))))];
    for (const sk of missing.slice(0, 2)) add(c, sk, { gold: c.id });
  }
  // ٣) بقية الأسئلة من دول العالم على قدر المستوى
  const kinds = level === 1 ? ['flag', 'flagWho', 'continent', 'map', 'bigger', 'landmarkPic'] : ['flag', 'flagWho', 'capital', 'capWho', 'spell', 'map', 'landmarkWho', 'landmarkPic', 'names', 'natureWho', 'neighbor', 'language', 'continent', 'bigger', 'morePop', 'north'];
  const CMP = ['bigger', 'morePop', 'north']; const cmps = () => specs.filter((s) => CMP.includes(s.kind)).length;
  for (const c of shuffle(pool(level))) {
    if (specs.length >= N) break;
    if (used.has(c.id)) continue;
    const k = shuffle(kinds.filter((k) => usable(k, c) && !(k === 'map' && maps() >= 2) && !(CMP.includes(k) && cmps() >= 2)))[0];
    if (k) { specs.push({ id: c.id, kind: k }); used.add(c.id); }
  }
  return { specs: shuffle(specs), n };
}
// أسئلة الختم الذهبي والمراجعة بأربعة خيارات دائماً، مهما كان المستوى
export const toQ = (spec, n) => { const q = Q[spec.kind](byId[spec.id], spec.gold || spec.review ? 4 : n, spec.other ? byId[spec.other] : undefined); if (q.other) spec.other = q.other.id; return { ...q, spec, remake: () => ({ ...q.remake(), spec: {} }) }; };

export function worldScreen(root, { go }) {
  const me = store.me; const owner = me.id;
  const due = dueReviews(me).length;
  const ready = Object.keys(me.stamps || {}).filter((id) => goldEligible(me, id)).length;
  const ids = Object.keys(me.stamps || {}).filter((id) => goldEligible(me, id));
  const bars = ids.map((id) => [id, goldPercent(me, id, requiredFor(byId[id]))]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  root.append(owl('عشرة أسئلة من الدول التي زرتها ومن العالم كله.'),
    h('div', { class: 'panel' },
      due ? h('p', { class: 'strong' }, `🔔 فيه مراجعة لـ${ar(due)} من الدول التي أتقنتها.`) : null,
      h('p', {}, '🥇 أجب صحيحاً عن الدولة نفسها في أيام مختلفة، فيمتلئ شريطها وتنال ختمها الذهبي. الأسئلة التي تحمل 🥇 تملأ الشريط.'),
      bars.length ? h('div', { class: 'gold-bars' }, bars.map(([id, f]) => h('div', { class: 'gb' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), h('span', {}, byId[id].ar),
        h('div', { class: 'bar' }, h('i', { style: { width: Math.round(f * 100) + '%' } }))))) : h('p', { class: 'hint' }, ready ? '' : 'زر دولاً في «رحلاتي» أولاً، ومن الغد تبدأ أشرطتها.'),
      h('button', { class: 'btn big', onclick: () => start() }, '🧠 ابدأ')));

  function start() {
    const p = store.me; if (!p || p.id !== owner) return;
    const { specs, n } = buildSession(p);
    const questions = specs.map((s) => toQ(s, n));
    const newGold = []; const rev = {};
    runQuiz({ title: '🥇 الأختام الذهبية', questions, requeue: true,
      onAnswer: (q, ok) => {
        const c = q.c; const s = q.spec;
        if (s.review) { (rev[s.review] ||= []).push(ok); }
        // أي سؤال عن دولة تنتظر الذهبي يُحسب دليلاً (أو يُسقط دليلاً عند الخطأ)
        if (!['continent', 'compare'].includes(q.skill) && !(q.skill === 'landmark' && !hasPhoto(c.id)) && addEvidence(owner, c.id, q.skill, ok, requiredFor(c))) newGold.push(c.id);
      },
      onDecide: () => applyReviews(),
      onAbort: () => applyReviews(true),
      onDone: (score, _r, box, m) => {
        if (newGold.length) { confetti(); sfx('win'); speak('مبارك! نلت ختماً ذهبياً جديداً', LANG.ar); }
        box.append(h('div', { class: 'quiz-end' },
          h('div', { class: 'big-emoji' }, newGold.length ? '🥇' : score >= 7 ? '🌟' : '💪'),
          h('h3', {}, `${ar(score)} من ${ar(questions.length)}`),
          newGold.length ? h('p', {}, 'أختام ذهبية جديدة: ', ...newGold.map((id) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar))) : null,
          Object.keys(rev).length ? h('p', { class: 'hint' }, `راجعتَ ${ar(Object.keys(rev).length)} من الدول التي أتقنتها.`) : null,
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn big', onclick: () => { m.close(); } }, 'إنهاء'),
            store.profiles.length > 1 ? h('button', { class: 'btn big soft', onclick: () => { m.close(); setTimeout(() => contest(specs, score), 300); } }, '🏆 تحدَّ إخوتك بالأسئلة نفسها') : null)));
      },
    });
    // المراجعة تنجح إن أصاب في كل أسئلتها؛ إن انقطعت الجلسة نحكم بما أُجيب فقط
    function applyReviews(partial) {
      for (const [id, arr] of Object.entries(rev)) {
        const expected = specs.filter((s) => s.review === id).length;
        if (arr.some((x) => !x)) reviewResult(id, false);
        else if (!partial || arr.length === expected) reviewResult(id, true);
      }
    }
  }

  // ---------- مسابقة الإخوة: الأسئلة نفسها لكل لاعب، بالدور ----------
  function contest(specs, firstScore) {
    const first = store.profiles.find((p) => p.id === owner);
    const players = [{ id: first.id, name: first.name, avatar: first.avatar, score: firstScore, done: true },
      ...store.profiles.filter((p) => p.id !== owner).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: 0, done: false, chosen: true }))];
    const draw = () => {
      if (!root.isConnected) return;
      root.innerHTML = '';
      const waiting = players.filter((p) => !p.done && p.chosen);
      root.append(h('div', { class: 'panel center' }, h('h3', {}, '🏆 مسابقة الإخوة'),
        h('p', { class: 'hint' }, 'الأسئلة العشرة نفسها لكل لاعب، والخيارات بترتيب جديد. نتائج المسابقة للمتعة، ولا تُحسب في الأختام لأن اللاعبين قد يكونون شاهدوا الأسئلة.'),
        h('div', { class: 'podium' }, [...players].sort((a, b) => b.score - a.score).map((p) => h('div', { class: 'pd' + (p.done ? '' : ' wait') },
          h('span', {}, p.done ? '✅' : p.chosen ? '⏳' : '➖'), h('b', {}, p.avatar + ' ' + p.name), h('span', {}, p.done ? `${ar(p.score)} من ${ar(specs.length)}` : '')))),
        waiting.length ? h('button', { class: 'btn big', onclick: () => turn(waiting[0]) }, `دور ${waiting[0].avatar} ${waiting[0].name} ←`) : finish()));
    };
    const turn = (pl) => {
      const pr = store.profiles.find((x) => x.id === pl.id);
      const n = (pr?.level || 2) === 1 ? 3 : 4;
      runQuiz({ title: `🏆 ${pl.avatar} ${pl.name}`, questions: specs.map((s) => toQ(s, n)), level: pr?.level, pid: pl.id, recordSrc: 'practice',
        onDecide: (score) => { pl.score = score; pl.done = true; },
        onDone: (score, _r, box, m) => box.append(h('div', { class: 'quiz-end' }, h('h3', {}, `${ar(score)} من ${ar(specs.length)}`), h('button', { class: 'btn big', onclick: () => m.close() }, 'متابعة'))),
        onClose: () => setTimeout(draw, 200) });
    };
    const finish = () => {
      const top = Math.max(...players.filter((p) => p.done).map((p) => p.score));
      const win = players.filter((p) => p.done && p.score === top);
      confetti(); sfx('win');
      const t = win.length > 1 ? 'تعادل بين ' + win.map((w) => w.name).join(' و') : 'الفائز: ' + win[0].name;
      speak(t + '! أحسنتم جميعاً', LANG.ar);
      return h('div', {}, h('h2', {}, '🏆 ' + t), h('button', { class: 'btn big soft', onclick: () => go('home') }, 'إلى الرئيسية'));
    };
    draw();
  }
}
