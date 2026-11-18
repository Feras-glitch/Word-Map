// أسئلة الختمين والمراجعة واختبار المستوى
import { h, modal, confetti } from './ui.js';
import { states, byId, flagUrl, continents, contBox, shuffle, pick, contColors } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { record } from './mastery.js';
import { createMap, lighten } from './map.js';
import { store } from './store.js';

const capName = (c) => (c.capAr || '').replace(/\s*\(.*\)\s*/, '');
const others = (c, n, filter = () => true) => {
  const same = states.filter((s) => s.id !== c.id && s.cont === c.cont && filter(s));
  const src = same.length >= n ? same : states.filter((s) => s.id !== c.id && filter(s));
  return pick(src, n);
};
const flagOpt = (s) => h('span', { class: 'qo-flag' }, h('img', { src: flagUrl(s.f), alt: '' }), h('b', {}, s.ar));

export const Q = {
  flag(c, n) {
    const opts = shuffle([c, ...others(c, n - 1)]);
    return { skill: 'flag', say: `أيّ هذه الأعلام علم ${c.ar}؟`, prompt: h('p', {}, 'أيّ هذه الأعلام علم ', h('b', {}, c.ar), '؟'),
      flags: true, options: opts.map((o) => ({ correct: o.id === c.id, el: h('img', { class: 'qo-big-flag', src: flagUrl(o.f), alt: o.ar }), label: o.ar })) };
  },
  capital(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.capAr)]);
    return { skill: 'capital', say: `ما عاصمة ${c.ar}؟`, prompt: h('div', {}, h('img', { class: 'q-flag small', src: flagUrl(c.f), alt: '' }), h('p', {}, 'ما عاصمة ', h('b', {}, c.ar), '؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, capName(o)), label: capName(o) })) };
  },
  continent(c, n) {
    const keys = shuffle(Object.keys(continents).filter((k) => k !== 'antarctica' && k !== c.cont)).slice(0, n - 1);
    const opts = shuffle([c.cont, ...keys]);
    return { skill: 'continent', say: `في أي قارة تقع ${c.ar}؟`, prompt: h('div', {}, h('img', { class: 'q-flag small', src: flagUrl(c.f), alt: '' }), h('p', {}, 'في أي قارة تقع ', h('b', {}, c.ar), '؟')),
      options: opts.map((k) => ({ correct: k === c.cont, el: h('b', { style: { color: '#1f2a44' } }, continents[k]), label: continents[k], bg: contColors[k] })) };
  },
  names(c, n) {
    const useZh = c.zh && Math.random() < 0.5;
    const opts = shuffle([c, ...others(c, n - 1)]);
    const text = useZh ? c.zh : c.en;
    return { skill: 'names', sayFn: () => speak(text, useZh ? LANG.zh : LANG.en),
      prompt: h('div', {}, h('p', {}, useZh ? '🇨🇳 اسمع الاسم بالصينية: أيّ دولة هذه؟' : '🔤 اسمع الاسم بالإنجليزية: أيّ دولة هذه؟'),
        h('button', { class: 'btn small soft', onclick: () => speak(text, useZh ? LANG.zh : LANG.en) }, '🔊 اسمع مرة أخرى'),
        h('div', { class: 'q-word', dir: 'ltr' }, text, useZh && c.py ? h('small', {}, c.py) : null)),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  landmark(c, n) {
    if (!c.landmark) return Q.continent(c, n);
    const opts = shuffle([c, ...others(c, n - 1)]);
    return { skill: 'landmark', say: `${c.landmark}، من معالم أي دولة؟`, prompt: h('p', {}, '⭐ «', h('b', {}, c.landmark), '» من معالم أي دولة؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  map(c) {
    if (!c.bb || c.small || c.dotOnly) return Q.continent(c, 4);
    return { skill: 'map', type: 'map', say: `المس ${c.ar} على الخريطة`, prompt: h('p', {}, '📍 المس ', h('b', {}, c.ar), ' على الخريطة') };
  },
};

// يعرض الأسئلة واحداً بعد الآخر، ويستدعي onDone(score, results) في النهاية
export function runQuiz({ title, country, questions, passMark, onDone, intro, level: lv, pid, record: rec = true }) {
  const level = lv || store.me?.level || 2;
  const box = h('div', { class: 'quiz' });
  const m = modal(box, { cls: 'quiz-modal' });
  let i = 0, score = 0;
  const results = [];
  const head = () => h('div', { class: 'q-head' },
    h('b', {}, title),
    h('div', { class: 'q-dots' }, questions.map((_, k) => h('i', { class: k < i ? (results[k] ? 'done' : 'miss') : k === i ? 'now' : '' }))));

  function finish() {
    box.replaceChildren(head());
    onDone(score, results, box, m);
  }
  function next() {
    if (i >= questions.length) return finish();
    const q = questions[i];
    const fb = h('div', { class: 'feedback' });
    let locked = false;
    const answer = (ok, el) => {
      if (locked) return; locked = true;
      results[i] = ok; if (ok) score++;
      if (country && rec) record(country.id, q.skill, ok, pid);
      sfx(ok ? 'correct' : 'wrong');
      speak(ok ? ['أحسنت!', 'رائع!', 'صحيح!'][i % 3] : 'ليست هذه', LANG.ar);
      el?.classList.add(ok ? 'right' : 'wrong');
      fb.replaceChildren(h('button', { class: 'btn', onclick: () => { i++; next(); } }, i + 1 >= questions.length ? 'النتيجة 🏁' : 'التالي ←'));
    };
    if (q.type === 'map') {
      const c = country;
      const mp = createMap({ labels: false, fill: (x) => lighten(contColors[x.cont] || '#ccc', x.kind === 'state' ? 0.1 : 0.5),
        onTap: (id) => { if (locked || id === 'ATA') return; const ok = id === c.id; mp.mark(id, ok ? 'right' : 'wrong'); if (!ok) mp.mark(c.id, 'right'); answer(ok); } });
      mp.el.classList.add('quiz-map');
      box.replaceChildren(head(), h('div', { class: 'question' }, q.prompt), mp.el, fb);
      requestAnimationFrame(() => mp.zoomTo(contBox[c.cont] || [0, 0, 2000, 1000], 0));
    } else {
      const opts = h('div', { class: 'options' + (q.flags ? ' flag-opts' : '') });
      for (const o of q.options) {
        const b = h('button', { class: 'opt', style: o.bg ? { background: o.bg } : null, onclick: () => {
          if (locked) return;
          answer(o.correct, b);
          if (!o.correct) opts.querySelector('[data-c="1"]')?.classList.add('right');
        } }, o.el);
        if (o.correct) b.dataset.c = '1';
        // للصغار: لمسة طويلة تقرأ الخيار
        if (level === 1 && o.label) b.addEventListener('contextmenu', (e) => { e.preventDefault(); speak(o.label, LANG.ar); });
        opts.append(b);
      }
      box.replaceChildren(head(), h('div', { class: 'question' }, q.prompt), opts, fb);
    }
    setTimeout(() => (q.sayFn ? q.sayFn() : speak(q.say, LANG.ar)), 200);
  }
  if (intro) {
    box.replaceChildren(intro, h('button', { class: 'btn big', onclick: next }, 'ابدأ ←'));
  } else next();
  return m;
}

// ---------- ختم الزيارة: سؤال واحد ----------
export function visitQuestion(c, onPass) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const kinds = level === 1 ? ['flag', 'continent'] : ['flag', 'capital', 'continent'];
  const q = Q[kinds[Math.floor(Math.random() * kinds.length)]](c, n);
  runQuiz({ title: '🛂 سؤال ختم الزيارة', country: c, questions: [q], onDone: (score, _r, box, m) => {
    if (score === 1) {
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🛂'), h('h3', {}, 'أحسنت! حصلت على ختم زيارة ' + c.ar), h('button', { class: 'btn big', onclick: () => { m.close(); onPass(); } }, 'خذ الختم ✓')));
    } else {
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '📖'), h('h3', {}, 'اقرأ البطاقة جيداً ثم حاول مرة أخرى'), h('button', { class: 'btn big soft', onclick: () => m.close() }, 'عودة إلى البطاقة')));
    }
  } });
}

// ---------- امتحان الإتقان: ٥ أسئلة ----------
export function masteryExam(c, onDone) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const questions = [Q.flag(c, n), Q.capital(c, n), Q.map(c), Q.names(c, n), Q.landmark(c, n)];
  runQuiz({ title: '⭐ امتحان الإتقان: ' + c.ar, country: c, questions,
    intro: h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '⭐'), h('h3', {}, 'امتحان إتقان ' + c.ar),
      h('p', {}, 'خمسة أسئلة: العلم، العاصمة، الموقع، الاسم بلغة أخرى، والمعالم. أجب عن أربعة صحيحاً لتنال الختم الذهبي.')),
    onDone: (score, _r, box, m) => {
      const pass = score >= 4;
      if (pass) { confetti(); sfx('win'); speak(`مبارك! نلت الختم الذهبي لدولة ${c.ar}`, LANG.ar); }
      else speak(`حصلت على ${score} من خمسة. راجع البطاقة وعد غداً`, LANG.ar);
      box.append(h('div', { class: 'quiz-end' },
        h('div', { class: 'big-emoji' }, pass ? '🥇' : '📖'),
        h('h3', {}, `${score.toLocaleString('ar-EG')} من ٥`),
        h('p', {}, pass ? 'نلت الختم الذهبي! سنذكّرك بمراجعة هذه الدولة بعد ٣ أيام.' : 'تحتاج ٤ من ٥. راجع البطاقة، ويمكنك المحاولة من جديد غداً.'),
        h('button', { class: 'btn big', onclick: () => { m.close(); onDone(score); } }, pass ? 'خذ الختم الذهبي 🥇' : 'حسناً')));
    } });
}

// ---------- المراجعة: ٣ أسئلة ----------
export function reviewQuiz(c, onDone) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  runQuiz({ title: '🔔 مراجعة: ' + c.ar, country: c, questions: shuffle([Q.flag(c, n), Q.capital(c, n), Q.map(c)]),
    onDone: (score, _r, box, m) => {
      const pass = score >= 2;
      sfx(pass ? 'win' : 'wrong');
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, pass ? '✅' : '🔁'),
        h('h3', {}, pass ? 'ما زلت تتذكرها! أحسنت' : 'نسيت شيئاً، لا بأس'),
        h('p', {}, pass ? 'سنذكّرك بها بعد مدة أطول.' : 'سنعيدها إليك بعد ٣ أيام.'),
        h('button', { class: 'btn big', onclick: () => { m.close(); onDone(pass); } }, 'متابعة')));
    } });
}

// ---------- اختبار تحديد المستوى ----------
export function placementTest(onDone) {
  const fam = states.filter((s) => s.famous);
  const mid = states.filter((s) => !s.famous && s.area > 200000);
  const hard = states.filter((s) => !s.famous && s.area <= 200000);
  const set = [
    ...pick(fam, 3).map((c) => [c, 'flag']), ...pick(fam, 2).map((c) => [c, 'continent']),
    ...pick(mid, 2).map((c) => [c, 'capital']), ...pick(mid, 1).map((c) => [c, 'flag']),
    ...pick(hard, 1).map((c) => [c, 'capital']), ...pick(hard, 1).map((c) => [c, 'flag']),
  ];
  const questions = set.map(([c, k]) => Q[k](c, 4));
  runQuiz({ title: '🧭 اختبار تحديد المستوى', questions,
    intro: h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🧭'), h('h3', {}, 'لنعرف مستواك!'), h('p', {}, 'عشرة أسئلة قصيرة تبدأ سهلة ثم تصعب. لا تقلق إن لم تعرف الإجابة.')),
    onDone: (score, _r, box, m) => {
      const level = score <= 3 ? 1 : score <= 7 ? 2 : 3;
      const names = { 1: '🌱 صغير', 2: '🌿 متوسط', 3: '🌳 كبير' };
      speak(`أحسنت! مستواك ${names[level].slice(2)}`, LANG.ar);
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🎯'),
        h('h3', {}, `${score.toLocaleString('ar-EG')} من ١٠`), h('p', {}, 'مستواك المقترح: ', h('b', {}, names[level])),
        h('button', { class: 'btn big', onclick: () => { m.close(); onDone(level, score); } }, 'موافق')));
    } });
}
