// تحدي العائلة: يلعب أفراد العائلة بالدور على جهاز واحد، ولكلٍّ أسئلة على قدر مستواه
import { h, owl, confetti, toast } from '../ui.js';
import { store } from '../store.js';
import { pool, LEVELS, shuffle } from '../data.js';
import { buildSet, runQuiz } from '../quiz.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const GUESTS = [['👨', 'بابا'], ['👩', 'ماما'], ['🧑', 'ضيف']];

export function familyScreen(root, { go }) {
  const chosen = new Set(store.profiles.map((p) => p.id));
  const guests = [];
  let rounds = 5;
  let same = false;

  function setup() {
    root.innerHTML = '';
    const list = h('div', { class: 'fam-players' });
    const drawList = () => list.replaceChildren(
      ...store.profiles.map((p) => h('button', { class: 'fam-p' + (chosen.has(p.id) ? ' on' : ''), onclick: () => { chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id); drawList(); } },
        h('span', { class: 'av' }, p.avatar), h('b', {}, p.name), h('small', {}, LEVELS[p.level].emoji + ' ' + LEVELS[p.level].name))),
      ...guests.map((g, i) => h('button', { class: 'fam-p on guest', onclick: () => { guests.splice(i, 1); drawList(); } },
        h('span', { class: 'av' }, g.avatar), h('b', {}, g.name), h('small', {}, LEVELS[g.level].emoji + ' ' + LEVELS[g.level].name + ' · ✕'))));
    drawList();
    const addGuest = h('div', { class: 'row wrap' }, GUESTS.map(([a, n]) => h('button', { class: 'btn small soft', onclick: () => { if (guests.length < 4) { guests.push({ id: 'g' + Date.now() + guests.length, avatar: a, name: n, level: 3, guest: true }); drawList(); } } }, '+ ' + a + ' ' + n)));
    const rsel = h('div', { class: 'row' }, [3, 5, 10].map((r) => h('button', { class: 'btn small' + (r === rounds ? '' : ' soft'), onclick: () => { rounds = r; setup(); } }, ar(r) + ' أسئلة لكل لاعب')));
    root.append(owl('تحدّي العائلة! كل لاعب يجيب بدوره. من يجمع نقاطاً أكثر؟'),
      h('h3', {}, 'من سيلعب؟'), list, h('p', { class: 'hint' }, 'أضف الكبار ليلعبوا معكم (المستوى الكبير):'), addGuest,
      h('h3', {}, 'عدد الأسئلة'), rsel,
      h('h3', {}, 'نوع الأسئلة'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small' + (same ? ' soft' : ''), onclick: () => { same = false; setup(); } }, 'كل لاعب على قدر مستواه'),
        h('button', { class: 'btn small' + (same ? '' : ' soft'), onclick: () => { same = true; setup(); } }, 'مستوى واحد للجميع')),
      h('p', { class: 'hint' }, same ? 'كل اللاعبين يُسألون بالمستوى المتوسط نفسه، وبأنواع الأسئلة نفسها وأربعة خيارات، عن دول مختلفة من المجموعة نفسها. فالمقارنة أعدل، لكنها ليست تامة.' : 'كل لاعب يُسأل بحسب مستواه، فالمقارنة بين النقاط تقريبية: هي للتشجيع لا للحكم.'),
      h('button', { class: 'btn big', onclick: start }, '🏁 ابدأ التحدي'));
  }

  function start() {
    const players = [...store.profiles.filter((p) => chosen.has(p.id)).map((p) => ({ id: p.id, avatar: p.avatar, name: p.name, level: p.level })), ...guests];
    if (players.length < 2) return toast('اختر لاعبَين على الأقل');
    const shared = shuffle(pool(2)).slice(0, rounds * players.length);
    players.forEach((pl, pi) => {
      const lvl = same ? 2 : pl.level;
      const kinds = lvl === 1 ? ['flag', 'continent'] : lvl === 2 ? ['flag', 'capital', 'continent', 'names'] : ['flag', 'capital', 'names', 'landmark', 'map'];
      const n = lvl === 1 ? 3 : 4;
      // في وضع «مستوى واحد» يأخذ كل لاعب دولاً مختلفة من المجموعة نفسها وبالترتيب نفسه لأنواع الأسئلة
      const cs = same ? shared.filter((_, k) => k % players.length === pi) : shuffle(pool(pl.level)).slice(0, rounds);
      pl.qlevel = lvl;
      pl.qs = cs.map((c, i) => ({ c, q: buildSet(c, [kinds[i % kinds.length]], n)[0] }));
      pl.score = 0; pl.done = 0;
    });
    let turn = 0;
    const total = players.length * rounds;
    const board = () => h('div', { class: 'fam-board' }, players.map((p, i) => h('div', { class: 'fb' + (i === turn % players.length ? ' now' : '') }, h('span', {}, p.avatar), h('b', {}, p.name), h('span', { class: 'sc' }, ar(p.score)))));

    function nextTurn() {
      if (turn >= total) return finish();
      const pl = players[turn % players.length];
      root.innerHTML = '';
      root.append(board(), h('div', { class: 'fam-turn' }, h('div', { class: 'big-av' }, pl.avatar), h('h2', {}, 'دور ' + pl.name),
        h('p', {}, `السؤال ${ar(pl.done + 1)} من ${ar(rounds)}`),
        h('button', { class: 'btn big', onclick: () => ask(pl) }, 'أنا جاهز! ←')));
      speak('دور ' + pl.name, LANG.ar);
    }
    function ask(pl) {
      const { c, q } = pl.qs[pl.done];
      runQuiz({ title: pl.avatar + ' ' + pl.name, country: c, questions: [q], level: pl.qlevel, pid: pl.guest ? null : pl.id, record: !pl.guest,
        // تُحسب النقطة لحظة الإجابة، وإغلاق النافذة قبل الإجابة يعيد الدور نفسه
        onDecide: (score) => { pl.score += score; pl.done++; turn++; },
        onClose: () => setTimeout(() => root.isConnected && nextTurn(), 200),
        onDone: (score, _r, box, m) => {
          box.append(h('div', { class: 'quiz-end' }, h('h3', {}, score ? '+١ نقطة 🎉' : 'لا بأس! الدور التالي'), h('button', { class: 'btn big', onclick: () => m.close() }, turn >= total ? 'النتيجة 🏆' : 'الدور التالي ←')));
        } });
    }
    function finish() {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const top = sorted[0].score;
      const winners = sorted.filter((p) => p.score === top);
      confetti(); sfx('win');
      speak(winners.length > 1 ? 'تعادل! أحسنتم جميعاً' : 'الفائز هو ' + winners[0].name + '! أحسنتم جميعاً', LANG.ar);
      root.innerHTML = '';
      root.append(h('div', { class: 'fam-end' }, h('div', { class: 'big-emoji' }, '🏆'),
        h('h2', {}, winners.length > 1 ? 'تعادل بين ' + winners.map((w) => w.name).join(' و') : 'الفائز: ' + winners[0].avatar + ' ' + winners[0].name),
        h('div', { class: 'podium' }, sorted.map((p, i) => h('div', { class: 'pd' + (p.score === top ? ' win' : '') }, h('span', {}, ['🥇', '🥈', '🥉'][[...new Set(sorted.map((x) => x.score))].indexOf(p.score)] || '🎖️'), h('b', {}, p.avatar + ' ' + p.name), h('span', {}, ar(p.score) + ' من ' + ar(rounds))))),
        h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: start }, '🔁 جولة أخرى'), h('button', { class: 'btn big soft', onclick: setup }, 'تغيير اللاعبين'))));
    }
    nextTurn();
  }
  setup();
}
