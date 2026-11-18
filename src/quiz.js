// أسئلة الختمين والمراجعة واختبار المستوى
import { h, modal, confetti } from './ui.js';
import { states, byId, flagUrl, continents, contBox, shuffle, pick, contColors, languages } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { record } from './mastery.js';
import { createMap, lighten, NAT } from './map.js';
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
    const qt = c.capQ || `ما عاصمة ${c.ar}؟`;
    return { skill: 'capital', say: qt, prompt: h('p', {}, qt),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, capName(o)), label: capName(o) })) };
  },
  continent(c, n) {
    // الدول العابرة للقارات: لا نضع قارتها الثانية بين الخيارات الخاطئة
    const keys = shuffle(Object.keys(continents).filter((k) => k !== 'antarctica' && k !== c.cont && k !== c.cont2)).slice(0, n - 1);
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
        label: useZh ? o.zh : o.en, say: [useZh ? o.zh : o.en, useZh ? LANG.zh : LANG.en],
        el: h('span', { class: 'qo-name', dir: 'ltr' }, useZh ? h('span', { class: 'zh-opt' }, h('b', {}, o.zh), h('small', {}, o.py)) : h('b', {}, o.en)) })) };
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
    const cat = L.official?.length ? 'official' : L.defacto?.length ? 'defacto' : 'working';
    const main = (L[cat] || []).filter((x) => languages[x] && !languages[x].sign);
    const right = main[Math.floor(Math.random() * main.length)];
    const catQ = { official: 'لغة رسمية في', defacto: 'هي اللغة التي تستعملها حكومة', working: 'لغة عمل في حكومة' }[cat];
    const pool = [...new Set(states.filter((s) => s.cont === c.cont).flatMap((s) => s.langs?.official || []))].filter((x) => languages[x] && !mine.has(x) && !languages[x].sign);
    const wrong = shuffle(pool.length >= n - 1 ? pool : Object.keys(languages).filter((x) => !mine.has(x) && !languages[x].sign)).slice(0, n - 1);
    const opts = shuffle([right, ...wrong]);
    const lbl = (x) => languages[x].ar.replace(/\s*\(.*\)\s*/, '');
    return { skill: 'language', say: `أيّ هذه ${catQ} ${c.ar}؟`, prompt: h('p', {}, '🗣️ أيّ هذه ' + catQ + ' ', h('b', {}, c.ar), '؟'),
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
  // ---------- الاتجاه المعاكس (للتمرين الشامل فقط، حيث لا سياق يكشف الجواب) ----------
  flagWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => !look(c.id, s.id))]);
    return { skill: 'flag', say: 'لأي دولة هذا العلم؟', prompt: h('div', {}, h('img', { class: 'q-flag', src: flagUrl(c.f), alt: 'علم' }), h('p', {}, 'لأي دولة هذا العلم؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, o.ar), label: o.ar })) };
  },
  capWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.capAr && capName(s) !== capName(c))]);
    return { skill: 'capital', say: `${capName(c)} عاصمة أي دولة؟`, prompt: h('p', {}, '🏛️ ', h('b', {}, capName(c)), ' عاصمة أي دولة؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  landmarkWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.landmark !== c.landmark)]);
    return { skill: 'landmark', say: `${c.landmark}: في أي دولة؟`, prompt: h('p', {}, '⭐ ', h('b', {}, c.landmark), ': في أي دولة؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  natureWho(c, n) {
    const its = NAT.items.filter((it) => it.countries?.includes(c.id) && ['river', 'desert', 'range', 'lake'].includes(it.kind));
    const it = its[Math.floor(Math.random() * its.length)];
    const verb = { river: 'يجري', lake: 'تقع', desert: 'تمتد', range: 'تمتد' }[it.kind];
    const opts = shuffle([c, ...others(c, n - 1, (s) => !it.countries.includes(s.id))]);
    return { skill: 'nature', say: `في أي دولة من هذه ${verb} ${it.ar}؟`, prompt: h('p', {}, NAT.kinds[it.kind].icon + ' في أي دولة من هذه ' + verb + ' ', h('b', {}, it.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  map(c) {
    return { skill: 'map', type: 'map', say: `المس ${c.ar} على الخريطة`, prompt: h('p', {}, '📍 المس ', h('b', {}, c.ar), ' على الخريطة') };
  },
};

// كل سؤال يحمل دولته (q.c) لتسجيل النتيجة لها حتى في الجلسات المختلطة
for (const k of Object.keys(Q)) { const f = Q[k]; Q[k] = (c, ...a) => ({ ...f(c, ...a), c, kind: k }); }

// هل يكشف السؤالُ الإجابةَ أو لا يصلح لهذه الدولة؟
const nameIn = (c, t) => { const b = bare(c.ar); return b.length >= 3 && (t || '').includes(b.slice(0, Math.max(3, b.length - 1))); };
export function usable(kind, c) {
  switch (kind) {
    case 'capital': return !!c.capAr && c.capQ !== null && !nameIn(c, capName(c)) && !c.ar.includes(bare(capName(c)).split(' ')[0]);
    case 'landmark': case 'landmarkWho': return !!c.landmark && !nameIn(c, c.landmark);
    case 'capWho': return usable('capital', c);
    case 'continent': return !c.ar.includes(bare(continents[c.cont]));
    case 'natureWho': return !!NAT.countriesReviewed && NAT.items.some((it) => it.countries?.includes(c.id) && ['river', 'desert', 'range', 'lake'].includes(it.kind));
    case 'map': return !!(c.cen || c.bb);
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

// يعرض الأسئلة واحداً بعد الآخر.
// onDecide(score, results, questions): يُستدعى فور الإجابة عن آخر سؤال، قبل إعلان النتيجة، ليُحفظ القرار مرة واحدة.
// onAbort(score, answered): إن أُغلقت النافذة بعد إجابة سؤال واحد على الأقل وقبل القرار.
// onDone(score, results, box, m): عرض النتيجة فقط. onClose: بعد إغلاق النافذة بأي طريقة.
export function runQuiz({ title, country, questions, onDone, onDecide, onAbort, onClose, onAnswer, intro, level: lv, pid, record: rec = true, recordSrc = 'quiz', mapCountries }) {
  const level = lv || store.me?.level || 2;
  const box = h('div', { class: 'quiz', role: 'dialog', 'aria-label': title });
  let i = 0, score = 0, answered = 0, decided = false;
  const results = [];
  const m = modal(box, { cls: 'quiz-modal', onClose: () => { if (!decided && answered > 0) onAbort?.(score, answered); onClose?.(); } });
  const head = () => h('div', { class: 'q-head' },
    h('b', {}, title),
    h('div', { class: 'q-dots', 'aria-hidden': 'true' }, questions.map((_, k) => h('i', { class: k < i ? (results[k] ? 'done' : 'miss') : k === i ? 'now' : '' }))));

  function finish() {
    box.replaceChildren(head());
    onDone?.(score, results, box, m);
  }
  function next() {
    if (i >= questions.length) return finish();
    const q = questions[i];
    const fb = h('div', { class: 'feedback' });
    let locked = false;
    const answer = (ok, el) => {
      if (locked) return; locked = true;
      results[i] = ok; if (ok) score++; answered++;
      const qc = q.c || country;
      if (qc && rec) record(qc.id, q.skill, ok, { pid, src: recordSrc });
      onAnswer?.(q, ok);
      if (i + 1 >= questions.length && !decided) { decided = true; onDecide?.(score, results, questions); }
      sfx(ok ? 'correct' : 'wrong');
      speak(ok ? ['أحسنت!', 'رائع!', 'صحيح!'][i % 3] : 'ليست هذه', LANG.ar);
      el?.classList.add(ok ? 'right' : 'wrong');
      const nb = h('button', { class: 'btn', onclick: () => { i++; next(); } }, i + 1 >= questions.length ? 'النتيجة 🏁' : 'التالي ←');
      fb.replaceChildren(nb); nb.focus();
    };
    const say = () => (q.sayFn ? q.sayFn() : speak(q.say, LANG.ar));
    const again = h('button', { class: 'say-again', 'aria-label': 'أعد قراءة السؤال', onclick: say }, '🔊');
    const qBox = h('div', { class: 'question', tabindex: '-1' }, again, q.prompt);
    if (q.type === 'map') {
      const c = mapCountries?.[i] || q.c || country;
      const tiny = c.small || !c.bb || (c.bb[2] - c.bb[0]) < 12;
      const mp = createMap({ labels: false, dotPx: tiny ? 13 : undefined, fill: (x) => lighten(contColors[x.cont] || '#ccc', x.kind === 'state' ? 0.1 : 0.5),
        onTap: (id) => { if (locked || id === 'ATA') return; const ok = id === c.id; mp.mark(id, ok ? 'right' : 'wrong'); if (!ok) mp.mark(c.id, 'right'); answer(ok); } });
      mp.el.classList.add('quiz-map');
      box.replaceChildren(head(), qBox, mp.el, fb);
      // الدول الصغيرة: خريطة إقليمية مقرّبة حولها حتى يمكن لمسها
      const [cx, cy] = c.cen || [(c.bb[0] + c.bb[2]) / 2, (c.bb[1] + c.bb[3]) / 2];
      const box0 = tiny ? [cx - 45, cy - 30, cx + 45, cy + 30] : (contBox[c.cont] || [0, 0, 2000, 1000]);
      requestAnimationFrame(() => mp.zoomTo(box0, 0, tiny ? 0 : 0.15));
    } else {
      const opts = h('div', { class: 'options' + (q.flags ? ' flag-opts' : '') });
      q.options.forEach((o, k) => {
        const b = h('button', { class: 'opt', 'aria-label': 'الخيار ' + (k + 1).toLocaleString('ar-EG') + (o.label && !q.flags ? ': ' + o.label : ''), style: o.bg ? { background: o.bg } : null, onclick: () => {
          if (locked) return;
          answer(o.correct, b);
          if (!o.correct) opts.querySelector('[data-c="1"]')?.classList.add('right');
        } }, o.el);
        if (o.correct) b.dataset.c = '1';
        // للصغار: لمسة طويلة تقرأ الخيار
        if (level === 1 && o.label) b.addEventListener('contextmenu', (e) => { e.preventDefault(); speak(o.label, LANG.ar); });
        // زر الاستماع منفصل عن زر الاختيار (لا زر داخل زر)
        opts.append(o.say ? h('div', { class: 'opt-wrap' }, b, h('button', { class: 'opt-say', 'aria-label': 'استمع إلى الخيار ' + (k + 1).toLocaleString('ar-EG'), onclick: () => speak(o.say[0], o.say[1]) }, '🔊')) : b);
      });
      box.replaceChildren(head(), qBox, opts, fb);
    }
    qBox.focus();
    setTimeout(say, 200);
  }
  if (intro) {
    const st = h('button', { class: 'btn big', onclick: next }, 'ابدأ ←');
    box.replaceChildren(intro, st); setTimeout(() => st.focus(), 50);
  } else next();
  return m;
}

// ---------- ختم الزيارة: سؤال واحد ----------
// يُحفظ القرار فور الإجابة: الختم عند الصواب، وبدء الانتظار عند الخطأ
export function visitQuestion(c, { onPass, onFail, onClose } = {}) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const kinds = (level === 1 ? ['flag', 'continent'] : ['flag', 'capital', 'continent']).filter((k) => usable(k, c));
  const q = Q[kinds[Math.floor(Math.random() * kinds.length)]](c, n);
  runQuiz({ title: '🛂 سؤال ختم الزيارة', country: c, questions: [q], onClose,
    onDecide: (score) => (score === 1 ? onPass?.() : onFail?.()),
    onDone: (score, _r, box, m) => {
      if (score === 1) box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🛂'), h('h3', {}, 'أحسنت! حصلت على ختم زيارة ' + c.ar), h('button', { class: 'btn big', onclick: () => m.close() }, 'خذ الختم ✓')));
      else box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '📖'), h('h3', {}, 'اقرأ البطاقة جيداً، ويمكنك المحاولة بعد دقيقتين'), h('button', { class: 'btn big soft', onclick: () => m.close() }, 'عودة إلى البطاقة')));
    } });
}

// ---------- امتحان الإتقان: ٥ أسئلة ----------
// الختم الذهبي: ٤ من ٥، بشرط إصابة العلم والموقع، والعاصمة إن سُئل عنها.
export const REQUIRED = ['flag', 'map', 'capital'];
export function examVerdict(score, results, questions) {
  const missed = questions.map((q, k) => (!results[k] && REQUIRED.includes(q.skill) ? q.skill : null)).filter(Boolean);
  return { pass: score >= 4 && missed.length === 0, missed };
}
const SKILL_AR = { flag: 'العلم', map: 'الموقع على الخريطة', capital: 'العاصمة' };
export function masteryExam(c, { onResult, onClose } = {}) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const questions = buildSet(c, ['flag', 'capital', 'map', 'names', 'landmark'], n);
  const hasCap = questions.some((q) => q.skill === 'capital');
  let verdict = null;
  runQuiz({ title: '⭐ امتحان الإتقان: ' + c.ar, country: c, questions, onClose,
    intro: h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '⭐'), h('h3', {}, 'امتحان إتقان ' + c.ar),
      h('p', {}, 'خمسة أسئلة عن ' + c.ar + '. تنال الختم الذهبي إن أجبت عن أربعة صحيحاً، على أن يكون منها العلم والموقع على الخريطة' + (hasCap ? ' والعاصمة.' : '.'))),
    onDecide: (score, results, qs) => { verdict = { ...examVerdict(score, results, qs), score }; onResult?.(verdict.pass, score); },
    onAbort: (score) => onResult?.(false, score, true),
    onDone: (score, _r, box, m) => {
      const { pass, missed } = verdict;
      if (pass) { confetti(); sfx('win'); speak(`مبارك! نلت الختم الذهبي لدولة ${c.ar}`, LANG.ar); }
      else speak(`حصلت على ${score} من خمسة. راجع البطاقة وعد غداً`, LANG.ar);
      box.append(h('div', { class: 'quiz-end' },
        h('div', { class: 'big-emoji' }, pass ? '🥇' : '📖'),
        h('h3', {}, `${score.toLocaleString('ar-EG')} من ٥`),
        h('p', {}, pass ? 'نلت الختم الذهبي! سنذكّرك بمراجعة هذه الدولة بعد ٣ أيام.'
          : missed.length ? `لنيل الختم الذهبي يجب أن تصيب في: ${missed.map((k) => SKILL_AR[k]).join('، ')}. راجع البطاقة، وحاول من جديد غداً.`
            : 'تحتاج ٤ من ٥. راجع البطاقة، ويمكنك المحاولة من جديد غداً.'),
        h('button', { class: 'btn big', onclick: () => m.close() }, pass ? 'خذ الختم الذهبي 🥇' : 'حسناً')));
    } });
}

// ---------- المراجعة: ٤ أسئلة، النجاح ٣، تدور على ما أثبته الختم الذهبي ----------
export function reviewQuiz(c, { onResult, onClose } = {}) {
  const level = store.me?.level || 2;
  const n = level === 1 ? 3 : 4;
  const extra = ['names', 'landmark', 'language'][Math.floor(Math.random() * 3)];
  let pass = false;
  runQuiz({ title: '🔔 مراجعة: ' + c.ar, country: c, questions: shuffle(buildSet(c, ['flag', 'map', 'capital', extra], n)), onClose,
    onDecide: (score) => { pass = score >= 3; onResult?.(pass); },
    onAbort: () => onResult?.(false, true),
    onDone: (score, _r, box, m) => {
      sfx(pass ? 'win' : 'wrong');
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, pass ? '✅' : '🔁'),
        h('h3', {}, pass ? 'ما زلت تتذكرها! أحسنت' : 'نسيت شيئاً، لا بأس'),
        h('p', {}, pass ? 'سنذكّرك بها بعد مدة أطول.' : 'سنعيدها إليك بعد ٣ أيام.'),
        h('button', { class: 'btn big', onclick: () => m.close() }, 'متابعة')));
    } });
}

// ---------- اختبار تحديد المستوى: تقدير بداية فقط ----------
export function placementTest(onDone, onCancel) {
  const fam = states.filter((s) => s.famous);
  const mid = states.filter((s) => !s.famous && s.area > 200000);
  const hard = states.filter((s) => !s.famous && s.area <= 200000);
  const set = [
    ...pick(fam, 2).map((c) => [c, 'flag']), ...pick(fam, 2).map((c) => [c, 'continent']), ...pick(fam, 1).map((c) => [c, 'map']),
    ...pick(mid, 2).map((c) => [c, 'capital']), ...pick(mid, 1).map((c) => [c, 'flag']),
    ...pick(hard, 1).map((c) => [c, 'capital']), ...pick(hard, 1).map((c) => [c, 'flag']),
  ];
  const questions = set.map(([c, k]) => (usable(k, c) ? Q[k](c, 3) : Q.continent(c, 3)));
  // سؤال الخريطة يحتاج الدولة نفسها: نمرّرها بوضع خاص
  let done = false;
  const runOne = () => runQuiz({ title: '🧭 تقدير البداية', questions, country: null, record: false, mapCountries: set.map(([c]) => c),
    intro: h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🧭'), h('h3', {}, 'لنقدّر من أين تبدأ'),
      h('p', {}, 'عشرة أسئلة قصيرة تبدأ سهلة ثم تصعب، ويُقرأ كل سؤال بصوت عالٍ. هذا ليس امتحاناً: يقترح مستوى بداية، ويمكن تغييره لاحقاً من لوحة الوالدين.')),
    onClose: () => { if (!done) onCancel?.(); },
    onDone: (score, _r, box, m) => {
      const level = score <= 3 ? 1 : score <= 7 ? 2 : 3;
      const names = { 1: '🌱 صغير', 2: '🌿 متوسط', 3: '🌳 كبير' };
      speak(`أحسنت! المستوى المقترح ${names[level].slice(2)}`, LANG.ar);
      box.append(h('div', { class: 'quiz-end' }, h('div', { class: 'big-emoji' }, '🎯'),
        h('h3', {}, `${score.toLocaleString('ar-EG')} من ١٠`), h('p', {}, 'المستوى المقترح للبداية: ', h('b', {}, names[level])),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn big', onclick: () => { done = true; m.close(); onDone(level, score); } }, 'موافق'),
          level > 1 ? h('button', { class: 'btn big soft', onclick: () => { done = true; m.close(); onDone(1, score); } }, '🌱 أفضّل البدء من الأساس') : null)));
    } });
  runOne();
}
if (import.meta.env.DEV) window.__Q = { Q, buildSet, usable };
