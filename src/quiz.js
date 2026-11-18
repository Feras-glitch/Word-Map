// أسئلة الختمين والمراجعة واختبار المستوى
import { h, modal, confetti } from './ui.js';
import { states, byId, flagUrl, continents, contBox, shuffle, pick, contColors, languages } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { record } from './mastery.js';
import { createMap, lighten } from './map.js';
import { store } from './store.js';

const capName = (c) => (c.capAr || '').replace(/\s*\(.*\)\s*/, '');
const bare = (t) => (t || '').replace(/^ال/, '').trim();

// أعلام متشابهة لا تُوضع خياراً مع بعضها (التمييز بينها ليس هدف السؤال)
const LOOKALIKE = [['TCD', 'ROU', 'AND', 'MDA'], ['IDN', 'MCO', 'POL', 'SGP'], ['IRL', 'CIV', 'ITA'], ['NLD', 'LUX', 'PRY', 'HRV'], ['AUS', 'NZL'],
  ['SEN', 'MLI', 'GIN', 'CMR'], ['COL', 'ECU', 'VEN'], ['SVK', 'SVN', 'RUS', 'SRB'], ['NOR', 'ISL'], ['HND', 'NIC', 'SLV', 'GTM'], ['QAT', 'BHR'],
  ['EGY', 'SYR', 'IRQ', 'YEM', 'SDN'], ['JOR', 'PSE'], ['GHA', 'BOL'], ['LTU', 'MMR'], ['DNK', 'CHE'], ['NER', 'IND'], ['MYS', 'LBR', 'USA'], ['UAE', 'KWT']];
const look = (a, b) => LOOKALIKE.some((g) => g.includes(a) && g.includes(b));

const others = (c, n, filter = () => true) => {
  const same = states.filter((s) => s.id !== c.id && s.cont === c.cont && filter(s));
  const src = same.length >= n ? same : states.filter((s) => s.id !== c.id && filter(s));
  return pick(src, n);
};
const flagOpt = (s) => h('span', { class: 'qo-flag' }, h('img', { src: flagUrl(s.f), alt: '' }), h('b', {}, s.ar));
const sayBtn = (text, lang) => h('span', { class: 'opt-say', role: 'button', 'aria-label': 'استمع', onclick: (e) => { e.stopPropagation(); speak(text, lang); } }, '🔊');

// كل سؤال يذكر الدولة، والخيارات هي الصفات (عاصمة، معلم، اسم بلغة أخرى، لغة، جارة...)،
// ولا يُعرض في السؤال ما يكشف الإجابة. leaks(c) تخبر إن كان السؤال مكشوفاً لهذه الدولة.
export const Q = {
  flag(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => !look(c.id, s.id))]);
    return { skill: 'flag', say: `أيّ هذه الأعلام علم ${c.ar}؟`, prompt: h('p', {}, 'أيّ هذه الأعلام علم ', h('b', {}, c.ar), '؟'),
      flags: true, options: opts.map((o) => ({ correct: o.id === c.id, el: h('img', { class: 'qo-big-flag', src: flagUrl(o.f), alt: '' }) })) };
  },
  capital(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.capAr && capName(s) !== capName(c))]);
    return { skill: 'capital', say: `ما عاصمة ${c.ar}؟`, prompt: h('p', {}, 'ما عاصمة ', h('b', {}, c.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, capName(o)), label: capName(o) })) };
  },
  continent(c, n) {
    const keys = shuffle(Object.keys(continents).filter((k) => k !== 'antarctica' && k !== c.cont)).slice(0, n - 1);
    const opts = shuffle([c.cont, ...keys]);
    return { skill: 'continent', say: `في أي قارة تقع ${c.ar}؟`, prompt: h('p', {}, 'في أي قارة تقع ', h('b', {}, c.ar), '؟'),
      options: opts.map((k) => ({ correct: k === c.cont, el: h('b', { style: { color: '#1f2a44' } }, continents[k]), label: continents[k], bg: contColors[k] })) };
  },
  // اسم الدولة بالإنجليزية أو الصينية: نذكر الدولة بالعربية، والخيارات أسماء بتلك اللغة (مع زر استماع)
  names(c, n, force) {
    const useZh = force ? force === 'zh' : Math.random() < 0.5;
    const opts = shuffle([c, ...others(c, n - 1, (s) => (useZh ? s.zh !== c.zh : s.en !== c.en))]);
    const lang = useZh ? 'بالصينية' : 'بالإنجليزية';
    return { skill: 'names', say: `ما اسم ${c.ar} ${lang}؟`, prompt: h('div', {}, h('p', {}, 'ما اسم ', h('b', {}, c.ar), ' ' + lang + '؟'), h('small', { class: 'hint' }, 'اضغط 🔊 لتسمع كل خيار، ثم اختر')),
      options: opts.map((o) => ({ correct: o.id === c.id,
        el: h('span', { class: 'qo-name', dir: 'ltr' }, useZh ? h('span', { class: 'zh-opt' }, h('b', {}, o.zh), h('small', {}, o.py)) : h('b', {}, o.en), sayBtn(useZh ? o.zh : o.en, useZh ? LANG.zh : LANG.en)) })) };
  },
  landmark(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.landmark && s.landmark !== c.landmark)]);
    return { skill: 'landmark', say: `أيّ هذه من أشهر معالم ${c.ar}؟`, prompt: h('p', {}, '⭐ أيّ هذه من أشهر معالم ', h('b', {}, c.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, o.landmark), label: o.landmark })) };
  },
  // اللغة الرسمية (أو لغة العمل الفعلية)، والخيارات لغات لا يتكلمها أهل هذه الدولة رسمياً
  language(c, n) {
    const L = c.langs || {};
    const mine = new Set(['official', 'defacto', 'working', 'second', 'regional', 'widespread'].flatMap((k) => L[k] || []));
    const main = (L.official?.length ? L.official : L.defacto?.length ? L.defacto : L.working || []).filter((x) => languages[x] && !languages[x].sign);
    const right = main[Math.floor(Math.random() * main.length)];
    const pool = [...new Set(states.filter((s) => s.cont === c.cont).flatMap((s) => s.langs?.official || []))].filter((x) => languages[x] && !mine.has(x) && !languages[x].sign);
    const wrong = shuffle(pool.length >= n - 1 ? pool : Object.keys(languages).filter((x) => !mine.has(x) && !languages[x].sign)).slice(0, n - 1);
    const opts = shuffle([right, ...wrong]);
    const lbl = (x) => languages[x].ar.replace(/\s*\(.*\)\s*/, '');
    return { skill: 'language', say: `أيّ هذه لغة رسمية في ${c.ar}؟`, prompt: h('p', {}, '🗣️ أيّ هذه لغة رسمية في ', h('b', {}, c.ar), '؟'),
      options: opts.map((x) => ({ correct: x === right, el: h('b', {}, lbl(x)), label: lbl(x) })) };
  },
  neighbor(c, n) {
    const nb = c.borders.map((id) => byId[id]).filter((s) => s && s.kind === 'state');
    const right = nb[Math.floor(Math.random() * nb.length)];
    const wrong = others(c, n - 1, (s) => !c.borders.includes(s.id) && s.id !== right.id);
    const opts = shuffle([right, ...wrong]);
    return { skill: 'neighbor', say: `أيّ هذه الدول جارة لـ${c.ar}؟`, prompt: h('p', {}, '🤝 أيّ هذه الدول جارة لـ', h('b', {}, c.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === right.id, el: flagOpt(o), label: o.ar })) };
  },
  map(c) {
    return { skill: 'map', type: 'map', say: `المس ${c.ar} على الخريطة`, prompt: h('p', {}, '📍 المس ', h('b', {}, c.ar), ' على الخريطة') };
  },
};

// هل يكشف السؤالُ الإجابةَ أو لا يصلح لهذه الدولة؟
const nameIn = (c, t) => { const b = bare(c.ar); return b.length >= 3 && (t || '').includes(b.slice(0, Math.max(3, b.length - 1))); };
export function usable(kind, c) {
  switch (kind) {
    case 'capital': return !!c.capAr && !nameIn(c, capName(c)) && !c.ar.includes(bare(capName(c)).split(' ')[0]);
    case 'landmark': return !!c.landmark && !nameIn(c, c.landmark);
    case 'map': return !!c.bb && !c.small && !c.dotOnly;
    case 'neighbor': return c.borders.some((id) => byId[id]?.kind === 'state');
    case 'language': {
      const L = c.langs || {}; const main = (L.official?.length ? L.official : L.defacto?.length ? L.defacto : L.working || []).filter((x) => languages[x] && !languages[x].sign);
      return main.length > 0 && !main.some((x) => nameIn(c, languages[x].ar));
    }
    default: return true;
  }
}
// يبني قائمة أسئلة من الأنواع المطلوبة، ويستبدل غير الصالح ببديل غير مكرر
const FALLBACK = ['language', 'neighbor', 'continent', 'names_en', 'names_zh'];
export function buildSet(c, kinds, n) {
  const used = new Set();
  return kinds.map((k) => {
    if (k === 'names') k = Math.random() < 0.5 ? 'names_en' : 'names_zh';
    const kind = usable(k, c) && !used.has(k) ? k : FALLBACK.find((f) => !used.has(f) && usable(f, c)) || 'continent';
    used.add(kind);
    if (kind === 'names_en' || kind === 'names_zh') return Q.names(c, n, kind.slice(6));
    return Q[kind](c, n);
  });
}

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
export function visitQuestion(c, onPass, onFail) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const kinds = (level === 1 ? ['flag', 'continent'] : ['flag', 'capital', 'continent']).filter((k) => usable(k, c));
  const q = Q[kinds[Math.floor(Math.random() * kinds.length)]](c, n);
  runQuiz({ title: '🛂 سؤال ختم الزيارة', country: c, questions: [q], onDone: (score, _r, box, m) => {
    if (score === 1) {
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🛂'), h('h3', {}, 'أحسنت! حصلت على ختم زيارة ' + c.ar), h('button', { class: 'btn big', onclick: () => { m.close(); onPass(); } }, 'خذ الختم ✓')));
    } else {
      onFail?.();
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '📖'), h('h3', {}, 'اقرأ البطاقة جيداً، ويمكنك المحاولة بعد دقيقتين'), h('button', { class: 'btn big soft', onclick: () => m.close() }, 'عودة إلى البطاقة')));
    }
  } });
}

// ---------- امتحان الإتقان: ٥ أسئلة ----------
export function masteryExam(c, onDone) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const questions = buildSet(c, ['flag', 'capital', 'map', 'names', 'landmark'], n);
  runQuiz({ title: '⭐ امتحان الإتقان: ' + c.ar, country: c, questions,
    intro: h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '⭐'), h('h3', {}, 'امتحان إتقان ' + c.ar),
      h('p', {}, 'خمسة أسئلة عن ' + c.ar + ': العلم، والعاصمة، والموقع على الخريطة، وغيرها. أجب عن أربعة صحيحاً لتنال الختم الذهبي.')),
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
  runQuiz({ title: '🔔 مراجعة: ' + c.ar, country: c, questions: shuffle(buildSet(c, ['flag', 'capital', 'map', 'landmark'], n)),
    onDone: (score, _r, box, m) => {
      const pass = score >= 3;
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
  const questions = set.map(([c, k]) => (usable(k, c) ? Q[k](c, 4) : Q.continent(c, 4)));
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
if (import.meta.env.DEV) window.__Q = { Q, buildSet, usable };
