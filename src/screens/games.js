import { h, owl, confetti, stars as starsEl } from '../ui.js';
import { store } from '../store.js';
import { pool, pick, shuffle, flagUrl, states, contBox, byId, contColors } from '../data.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';
import { createMap, lighten, questionBox } from '../map.js';
import { openCard } from '../card.js';
import { record, weakest } from '../mastery.js';
import { look, namedCapital } from '../quiz.js';
import { cnt } from '../arnum.js';

const ROUNDS = 10;
const PRAISE = ['أحسنت!', 'رائع!', 'ممتاز!', 'بطل!', 'صحيح!', 'ما شاء الله!'];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

export function gamesScreen(root, { go }) {
  const me = store.me;
  const G = [
    { k: 'flag', r: 'g-flag', e: '🚩', t: 'خمّن العلم', s: 'أرى علماً… لأي دولة هو؟' },
    { k: 'where', r: 'g-where', e: '📍', t: 'أين هذه الدولة؟', s: 'المسها على الخريطة' },
    { k: 'capital', r: 'g-capital', e: '🏛️', t: 'ما العاصمة؟', s: 'اعرف عواصم الدول' },
    { k: 'memory', r: 'g-memory', e: '🧠', t: 'ذاكرة الأعلام', s: 'اقلب البطاقات وطابق' },
  ];
  root.append(
    owl('اختر لعبة! كل لعبة فيها ١٠ أسئلة، واجمع ٣ نجوم.'),
    h('div', { class: 'tiles games' }, G.map((g) => h('button', { class: 'tile', onclick: () => { sfx('tap'); go(g.r); } },
      h('span', { class: 'te' }, g.e), h('b', {}, g.t), h('small', {}, g.s), starsEl(me.stars[g.k] || 0)))),
  );
}

function finish(root, key, score, total, replay, misses = [], title = null) {
  const st = score >= total * 0.9 ? 3 : score >= total * 0.6 ? 2 : score >= total * 0.3 ? 1 : 0;
  store.setStars(key, st);
  if (st >= 2) { confetti(); sfx('win'); }
  const msg = st === 3 ? 'مذهل! أنت خبير حقيقي!' : st === 2 ? 'أحسنت! أداء رائع.' : st === 1 ? 'بداية جيدة! جرّب مرة أخرى.' : 'لا بأس، كل مستكشف يتعلم بالتجربة!';
  speak(msg, LANG.ar);
  root.innerHTML = '';
  root.append(h('div', { class: 'panel result' },
    h('div', { class: 'big-stars' }, starsEl(st)),
    h('h2', {}, title || score.toLocaleString('ar-EG') + ' من ' + total.toLocaleString('ar-EG')),
    owl(msg),
    // ما فات الطفل في هذه الجولة، مع بطاقة كل دولة: الخطأ فرصة للتعلم
    misses.length ? h('div', { class: 'missed' }, h('b', {}, '📖 لنتعرّف على ما فاتنا:'), h('div', { class: 'neighbors' }, [...new Set(misses)].map((id) => h('button', { class: 'chip', onclick: () => openCard(id) }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar)))) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: replay }, '🔁 العب مرة أخرى'), h('button', { class: 'btn big soft', onclick: () => history.back() }, '🎮 الألعاب'))));
}

// أسئلة التمرين: نحو ثلثها من دول أخطأ فيها الطفل، وخُمسها من دول زارها، والباقي جديد من مستواه
function practiceSet(level, n, cands = pool(level)) {
  const p = store.me; const ok = new Set(cands.map((c) => c.id));
  const errs = Object.entries(p.practice || {}).map(([id, m]) => { let a = 0, b = 0; for (const x of Object.values(m)) { a += x.ok || 0; b += x.bad || 0; } return [id, b / (a + b || 1), b]; })
    .filter((x) => x[2] > 0).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
  const weak = [...new Set([...weakest(8, p), ...errs])].filter((id) => ok.has(id)).slice(0, Math.ceil(n * 0.3));
  const visited = shuffle(Object.keys(p.stamps || {}).filter((id) => ok.has(id) && !weak.includes(id))).slice(0, Math.ceil(n * 0.2));
  const chosen = [...weak, ...visited];
  const rest = shuffle(cands.filter((c) => !chosen.includes(c.id))).slice(0, n - chosen.length);
  return shuffle([...chosen.map((id) => byId[id]), ...rest]);
}

// hist: نتيجة كل سؤال مضى ('ok' | 'half' | 'bad') فتتلوّن النقطة بحسبها
function header(i, score, hist = []) {
  return h('div', { class: 'q-head' },
    h('div', { class: 'q-dots' }, Array.from({ length: ROUNDS }, (_, k) => h('i', { class: k < i ? (hist[k] === 'bad' ? 'miss' : hist[k] === 'half' ? 'half' : 'done') : k === i ? 'now' : '' }))),
    h('span', { class: 'score' }, '⭐ ' + score.toLocaleString('ar-EG')));
}

// لعبة اختيار من متعدد عامة
function choiceGame(root, key, makeQ) {
  const level = store.me.level;
  const nOpt = level === 1 ? 3 : 4;
  const qs = practiceSet(level, ROUNDS);
  let i = 0, score = 0; const hist = [], misses = [];
  const next = () => {
    if (i >= ROUNDS) return finish(root, key, score, ROUNDS, () => choiceGame(root, key, makeQ), misses);
    const c = qs[i];
    const q = makeQ(c, level, nOpt);
    root.innerHTML = '';
    const opts = h('div', { class: 'options' + (q.flags ? ' flag-opts' : '') + (q.options.length === 3 ? ' three' : '') });
    let locked = false;
    for (const o of q.options) {
      const b = h('button', { class: 'opt', onclick: () => {
        if (locked) return; locked = true;
        const ok = o.correct;
        record(c.id, key === 'capital' ? 'capital' : 'flag', ok, { src: 'practice' });
        b.classList.add(ok ? 'right' : 'wrong');
        hist[i] = ok ? 'ok' : 'bad'; if (!ok) misses.push(c.id);
        if (ok) { score++; sfx('correct'); speak(praise() + ' ' + q.answerSpeech, LANG.ar); }
        else { sfx('wrong'); opts.querySelector('[data-c="1"]').classList.add('right'); speak('الجواب: ' + q.answerSpeech, LANG.ar); }
        feedback.replaceChildren(h('button', { class: 'btn', onclick: () => { i++; next(); } }, i + 1 >= ROUNDS ? 'النتيجة 🏁' : 'التالي ←'),
          h('button', { class: 'btn soft', onclick: () => openCard(c.id, { stamp: true }) }, '📖 بطاقة ' + c.ar));
      } }, o.el);
      if (o.correct) b.dataset.c = '1';
      // للصغار الذين لا يقرؤون بعد: زر استماع بجانب كل خيار مكتوب
      const txt = level === 1 && !q.flags ? b.textContent.trim() : '';
      opts.append(txt ? h('div', { class: 'opt-wrap' }, b, h('button', { class: 'opt-say', 'aria-label': 'استمع إلى الخيار', onclick: () => speak(txt, LANG.ar) }, '🔊')) : b);
    }
    const feedback = h('div', { class: 'feedback' });
    root.append(header(i, score, hist), h('div', { class: 'question' }, q.prompt), opts, feedback);
    q.onShow?.();
  };
  next();
}

export function flagGame(root) {
  choiceGame(root, 'flag', (c, level, n) => {
    const src = (level === 3 ? states.filter((s) => s.cont === c.cont && s.id !== c.id) : pool(level).filter((s) => s.id !== c.id)).filter((s) => !look(c.id, s.id));
    const opts = shuffle([c, ...pick(src, n - 1)]);
    return {
      prompt: h('div', {}, h('img', { class: 'q-flag', src: flagUrl(c.f), alt: 'علم' }), h('p', {}, 'لأي دولة هذا العلم؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('span', {}, o.ar) })),
      answerSpeech: 'هذا علم ' + c.ar,
    };
  });
}

export function capitalGame(root) {
  choiceGame(root, 'capital', (c, level, n) => {
    const src = (level === 3 ? states.filter((s) => s.cont === c.cont) : pool(level)).filter((s) => s.id !== c.id && s.capAr && !namedCapital(s));
    const opts = shuffle([c, ...pick(src, n - 1)]);
    const reverse = level === 3 && Math.random() < 0.4;
    if (reverse) {
      return {
        prompt: h('div', {}, h('div', { class: 'q-big' }, '🏛️ ' + c.capAr), h('p', {}, 'هي عاصمة أي دولة؟')),
        options: opts.map((o) => ({ correct: o.id === c.id, el: h('span', { class: 'with-flag' }, h('img', { src: flagUrl(o.f), alt: '' }), o.ar) })),
        answerSpeech: c.capAr + ' عاصمة ' + c.ar,
      };
    }
    return {
      prompt: h('div', {}, h('img', { class: 'q-flag small', src: flagUrl(c.f), alt: '' }), h('p', {}, 'ما عاصمة ', h('b', {}, c.ar), '؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('span', {}, o.capAr) })),
      answerSpeech: 'عاصمة ' + c.ar + ' هي ' + c.capAr,
      onShow: () => speak('ما عاصمة ' + c.ar + '؟', LANG.ar),
    };
  });
}

export function whereGame(root) {
  const level = store.me.level;
  const candidates = pool(level).filter((c) => c.bb && !c.dotOnly && (level === 3 || !c.small));
  const qs = practiceSet(level, ROUNDS, candidates);
  let i = 0, score = 0, tries = 0, locked = false; const hist = [], misses = [];
  const fill = (c) => (c.kind === 'state' ? contColors[c.cont] : lighten(contColors[c.cont] || '#ccc', 0.5));
  const m = createMap({ fill, labels: level === 1, onTap: (id, _s, _el, e) => tap(id, e), onMiss: (e) => { if (locked) return; if (m.near(qs[i].id, e)) tap(qs[i].id, e); else speak('هذا في البحر. المس اليابسة', LANG.ar); } });
  const top = h('div', { class: 'where-top' });
  const fb = h('div', { class: 'feedback floating' });
  root.append(top, m.el, fb);

  function ask() {
    if (i >= ROUNDS) { root.classList.remove('full'); return finish(root, 'where', score, ROUNDS, () => { root.innerHTML = ''; root.classList.add('full'); whereGame(root); }, misses); }
    const c = qs[i]; tries = 0; locked = false;
    top.replaceChildren(header(i, score, hist), h('div', { class: 'where-q' },
      level < 3 ? h('img', { src: flagUrl(c.f), alt: '' }) : null,
      h('span', {}, 'أين ', h('b', {}, c.ar), '؟'),
      h('button', { class: 'say', onclick: () => speak('أين ' + c.ar + '؟', LANG.ar) }, '🔊')));
    fb.replaceChildren();
    m.clearMarks('right'); m.clearMarks('wrong');
    const qb = level < 3 ? questionBox(c, level) : null; m.setHome(qb);
    if (qb) m.zoomTo(qb, 700, 0); else m.world();
    speak('أين ' + c.ar + '؟', LANG.ar);
  }
  function tap(id, e) {
    if (locked || id === 'ATA') return;
    const c = qs[i];
    if (id !== c.id && m.near(c.id, e)) id = c.id;
    if (id === c.id) {
      record(c.id, 'map', tries === 0, { src: 'practice' });
      locked = true; score += tries === 0 ? 1 : 0.5; hist[i] = tries === 0 ? 'ok' : 'half'; if (tries) misses.push(c.id); sfx('correct'); m.mark(id, 'right');
      speak(praise() + ' هذه ' + c.ar, LANG.ar);
      done();
    } else {
      tries++; sfx('wrong'); m.flash(id, 'wrong', 900);
      const t = byId[id];
      if (tries >= 2) {
        record(c.id, 'map', false, { src: 'practice' });
        locked = true; hist[i] = 'bad'; misses.push(c.id); m.mark(c.id, 'right'); m.zoomToCountry(c.id);
        speak('هذه ' + t.ar + '. و' + c.ar + ' هنا', LANG.ar); done();
      } else speak('هذه ' + t.ar + '. حاول مرة أخرى', LANG.ar);
    }
  }
  function done() {
    fb.replaceChildren(h('button', { class: 'btn', onclick: () => { i++; ask(); } }, i + 1 >= ROUNDS ? 'النتيجة 🏁' : 'التالي ←'));
  }
  requestAnimationFrame(ask);
}

export function memoryGame(root) {
  const level = store.me.level;
  const pairs = level === 1 ? 6 : level === 2 ? 6 : 8;
  const withNames = level > 1;
  const cs = pick(pool(level), pairs);
  const cards = shuffle(cs.flatMap((c) => [{ c, t: 'flag' }, { c, t: withNames ? 'name' : 'flag' }]));
  let open = [], matched = 0, moves = 0, busy = false;
  const info = h('div', { class: 'q-head' }, h('span', {}, '🔁 المحاولات: ', h('b', { class: 'mv' }, '٠')), h('span', {}, '✅ ', h('b', { class: 'mt' }, '٠'), ' / ' + pairs.toLocaleString('ar-EG')));
  const grid = h('div', { class: 'memory ' + (pairs > 6 ? 'm16' : 'm12') });
  for (const card of cards) {
    const face = card.t === 'flag' ? h('img', { src: flagUrl(card.c.f), alt: '' }) : h('b', {}, card.c.ar);
    const el = h('button', { class: 'mcard' }, h('div', { class: 'mback' }, '🌍'), h('div', { class: 'mface' }, face));
    el.onclick = () => {
      if (busy || el.classList.contains('open')) return;
      sfx('flip'); el.classList.add('open'); open.push({ el, card });
      if (open.length === 2) {
        moves++; info.querySelector('.mv').textContent = moves.toLocaleString('ar-EG');
        const [a, b] = open;
        if (a.card.c.id === b.card.c.id) {
          matched++; open = []; sfx('correct'); speak(a.card.c.ar, LANG.ar);
          a.el.classList.add('matched'); b.el.classList.add('matched');
          info.querySelector('.mt').textContent = matched.toLocaleString('ar-EG');
          if (matched === pairs) setTimeout(() => {
            if (!root.isConnected) return;
            const score = Math.max(0, Math.min(10, Math.round(10 - (moves - pairs) * (10 / (pairs * 1.6)))));
            finish(root, 'memory', score, 10, () => { root.innerHTML = ''; memoryGame(root); }, [], `وجدت ${cnt(pairs, 'زوجاً واحداً', 'زوجين', 'أزواج', 'زوجاً')} في ${cnt(moves, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة')}`);
          }, 900);
        } else {
          busy = true;
          setTimeout(() => { a.el.classList.remove('open'); b.el.classList.remove('open'); open = []; busy = false; }, 950);
        }
      }
    };
    grid.append(el);
  }
  root.append(info, grid);
}
