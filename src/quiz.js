// مولّدات الأسئلة، وعارض الأسئلة، وسؤال ختم الزيارة، واختبار المستوى
import { h, modal, confetti } from './ui.js';
import { states, byId, flagUrl, continents, contBox, shuffle, pick, contColors, languages, pool } from './data.js';
import { landmarkIcon } from './landmarks.js';
import { landmarkPhoto, hasPhoto } from './photos.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { record } from './mastery.js';
import { createMap, lighten, NAT } from './map.js';
import { store } from './store.js';
import { setAddressee } from './gender.js';

// عبارات التشجيع تتنوع ولا تتكرر مرتين متتاليتين
const PRAISE = ['أحسنت!', 'رائع!', 'صحيح!', 'ممتاز!', 'إجابة موفقة!', 'ما شاء الله!'];
let lastPraise = -1;
const praise = () => { let k; do k = Math.floor(Math.random() * PRAISE.length); while (k === lastPraise); lastPraise = k; return PRAISE[k]; };

const capName = (c) => (c.capAr || '').replace(/\s*\(.*\)\s*/, '');
const bare = (t) => (t || '').replace(/^ال/, '').trim();
// عاصمة تحمل اسم دولة (مدينة الكويت، سنغافورة): لا تصلح خياراً خاطئاً لأنها تُستبعد بالمنطق لا بالمعرفة
const NAMES = states.map((s) => bare(s.ar)).filter((n) => n.length >= 3);
export const namedCapital = (s) => { const cp = capName(s); return NAMES.some((n) => cp.split(/\s+/).some((w) => bare(w) === n)); };

// أعلام متشابهة لا تُوضع خياراً مع بعضها (التمييز بينها ليس هدف السؤال)
const LOOKALIKE = [['TCD', 'ROU', 'AND', 'MDA'], ['IDN', 'MCO', 'POL', 'SGP'], ['IRL', 'CIV', 'ITA'], ['NLD', 'LUX', 'PRY', 'HRV'], ['AUS', 'NZL'],
  ['SEN', 'MLI', 'GIN', 'CMR'], ['COL', 'ECU', 'VEN'], ['SVK', 'SVN', 'RUS', 'SRB'], ['NOR', 'ISL'], ['HND', 'NIC', 'SLV', 'GTM'], ['QAT', 'BHR'],
  ['EGY', 'SYR', 'IRQ', 'YEM', 'SDN'], ['JOR', 'PSE', 'SDN', 'KWT', 'ARE'], ['GHA', 'BOL'], ['LTU', 'MMR'], ['DNK', 'CHE'], ['NER', 'IND'], ['MYS', 'LBR', 'USA']];
export const look = (a, b) => LOOKALIKE.some((g) => g.includes(a) && g.includes(b));

const others = (c, n, filter = () => true) => {
  const same = states.filter((s) => s.id !== c.id && s.cont === c.cont && filter(s));
  const src = same.length >= n ? same : states.filter((s) => s.id !== c.id && filter(s));
  return pick(src, n);
};
// شريك المقارنة: دولة من دول المستوى يتحقق فيها الشرط
const partner = (c, ok) => { const P = shuffle(pool(store.me?.level || 2).filter((s) => s.id !== c.id && ok(s))); return P[0] || shuffle(states.filter((s) => s.id !== c.id && ok(s)))[0]; };
const timesAr = (r) => (r >= 2.5 ? `بنحو ${Math.round(r).toLocaleString('ar-EG')} ${Math.round(r) <= 10 ? 'مرات' : 'مرة'}` : r >= 1.75 ? 'بنحو مرتين' : 'بنحو مرة ونصف');
function compareQ(c, o, key, text, word) {
  // فرق واضح بين الدولتين (ضعف على الأقل للمستوى الأول ثلاثة أضعاف) حتى لا يكون السؤال تخميناً في المتقاربَين
  const min = (store.me?.level || 2) === 1 ? 3 : 1.6;
  o = o || partner(c, (s) => s[key] && c[key] && Math.max(s[key] / c[key], c[key] / s[key]) >= min);
  const win = c[key] > o[key] ? c : o; const lose = win === c ? o : c;
  return { skill: 'compare', explain: `${win.ar} ${word} من ${lose.ar} ${timesAr(win[key] / lose[key])}.`, say: text, prompt: h('p', {}, (key === 'area' ? '📏 ' : '👨‍👩‍👧 ') + text), other: o,
    options: shuffle([c, o]).map((x) => ({ correct: x.id === win.id, el: flagOpt(x), label: x.ar })) };
}
const flagOpt = (s) => h('span', { class: 'qo-flag' }, h('img', { src: flagUrl(s.f), alt: '' }), h('b', {}, s.ar));

// كل سؤال يذكر الدولة، والخيارات هي الصفات (عاصمة، معلم، اسم بلغة أخرى، لغة، جارة...)،
// ولا يُعرض في السؤال ما يكشف الإجابة. leaks(c) تخبر إن كان السؤال مكشوفاً لهذه الدولة.
export const Q = {
  flag(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => !look(c.id, s.id))]);
    return { skill: 'flag', explain: `هذا علم ${c.ar}.`, say: `أيّ هذه الأعلام علم ${c.ar}؟`, parts: ['أيّ هذه الأعلام علم', c.ar], prompt: h('p', {}, 'أيّ هذه الأعلام علم ', h('b', {}, c.ar), '؟'),
      flags: true, options: opts.map((o) => ({ correct: o.id === c.id, el: h('img', { class: 'qo-big-flag', src: flagUrl(o.f), alt: '' }) })) };
  },
  capital(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.capAr && capName(s) !== capName(c) && !namedCapital(s))]);
    const qt = c.capQ || `ما عاصمة ${c.ar}؟`;
    return { skill: 'capital', explain: `عاصمة ${c.ar} هي ${capName(c)}.`, say: qt, parts: c.capQ ? [c.capQ] : ['ما عاصمة', c.ar], prompt: h('p', {}, qt),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, capName(o)), label: capName(o) })) };
  },
  continent(c, n) {
    // الدول العابرة للقارات: لا نضع قارتها الثانية بين الخيارات الخاطئة
    const keys = shuffle(Object.keys(continents).filter((k) => k !== 'antarctica' && k !== c.cont && k !== c.cont2)).slice(0, n - 1);
    const opts = shuffle([c.cont, ...keys]);
    return { skill: 'continent', explain: `${c.ar} تقع في قارة ${continents[c.cont]}.`, say: `في أي قارة تقع ${c.ar}؟`, parts: ['في أي قارة تقع', c.ar], prompt: h('p', {}, 'في أي قارة تقع ', h('b', {}, c.ar), '؟'),
      options: opts.map((k) => ({ correct: k === c.cont, el: h('b', { style: { color: '#1f2a44' } }, continents[k]), label: continents[k], bg: contColors[k] })) };
  },
  // اسم الدولة بالإنجليزية أو الصينية: نذكر الدولة بالعربية، والخيارات أسماء بتلك اللغة (مع زر استماع)
  names(c, n, force) {
    const useZh = force ? force === 'zh' : Math.random() < 0.5;
    const opts = shuffle([c, ...others(c, n - 1, (s) => (useZh ? s.zh !== c.zh : s.en !== c.en))]);
    const lang = useZh ? 'بالصينية' : 'بالإنجليزية';
    return { skill: 'names', explain: `${c.ar} ${lang}: ${useZh ? c.zh + ' (' + c.py + ')' : c.en}.`, say: `ما اسم ${c.ar} ${lang}؟`, parts: ['ما اسم', c.ar, lang + '؟'], prompt: h('div', {}, h('p', {}, 'ما اسم ', h('b', {}, c.ar), ' ' + lang + '؟'), h('small', { class: 'hint' }, 'اضغط 🔊 لتسمع كل خيار، ثم اختر')),
      options: opts.map((o) => ({ correct: o.id === c.id,
        label: useZh ? o.zh : o.en, say: [useZh ? o.zh : o.en, useZh ? LANG.zh : LANG.en],
        el: h('span', { class: 'qo-name', dir: 'ltr' }, useZh ? h('span', { class: 'zh-opt' }, h('b', {}, o.zh), h('small', {}, o.py)) : h('b', {}, o.en)) })) };
  },
  landmark(c, n) {
    // إن كان للمعلم صورة: الخيارات كلها صور، فيعرف الطفل المعلم بشكله لا باسمه
    const pic = hasPhoto(c.id) && states.filter((s) => s.id !== c.id && hasPhoto(s.id)).length >= n - 1;
    const opts = shuffle([c, ...(pic ? pick(states.filter((s) => s.id !== c.id && hasPhoto(s.id)), n - 1) : others(c, n - 1, (s) => s.landmark && s.landmark !== c.landmark))]);
    return { skill: 'landmark', explain: `من معالم ${c.ar}: ${c.landmark}.`, say: `أيّ هذه من أشهر معالم ${c.ar}؟`, parts: ['أيّ هذه من أشهر معالم', c.ar], prompt: h('p', {}, '⭐ أيّ هذه من أشهر معالم ', h('b', {}, c.ar), '؟'),
      flags: pic, options: opts.map((o) => ({ correct: o.id === c.id, el: pic ? h('img', { class: 'qo-photo', src: landmarkPhoto(o.id).url, alt: '' }) : h('span', { class: 'lm-opt' }, h('span', { 'aria-hidden': 'true' }, landmarkIcon(o.landmark)), h('b', {}, o.landmark)), label: o.landmark })) };
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
    return { skill: 'language', explain: `${lbl(right)} ${catQ} ${c.ar}.`, say: `أيّ هذه ${catQ} ${c.ar}؟`, prompt: h('p', {}, '🗣️ أيّ هذه ' + catQ + ' ', h('b', {}, c.ar), '؟'),
      options: opts.map((x) => ({ correct: x === right, el: h('b', {}, lbl(x)), label: lbl(x) })) };
  },
  neighbor(c, n) {
    const nb = c.borders.map((id) => byId[id]).filter((s) => s && s.kind === 'state');
    const right = nb[Math.floor(Math.random() * nb.length)];
    const wrong = others(c, n - 1, (s) => !c.borders.includes(s.id) && s.id !== right.id);
    const opts = shuffle([right, ...wrong]);
    return { skill: 'neighbor', explain: `${right.ar} جارة لـ${c.ar}.`, say: `أيّ هذه الدول جارة لـ${c.ar}؟`, prompt: h('p', {}, '🤝 أيّ هذه الدول جارة لـ', h('b', {}, c.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === right.id, el: flagOpt(o), label: o.ar })) };
  },
  // ---------- الاتجاه المعاكس (للتمرين الشامل فقط، حيث لا سياق يكشف الجواب) ----------
  flagWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => !look(c.id, s.id))]);
    return { skill: 'flag', explain: `هذا علم ${c.ar}.`, say: 'لأي دولة هذا العلم؟', parts: ['لأي دولة هذا العلم؟'], prompt: h('div', {}, h('img', { class: 'q-flag', src: flagUrl(c.f), alt: 'علم' }), h('p', {}, 'لأي دولة هذا العلم؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: h('b', {}, o.ar), label: o.ar })) };
  },
  capWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.capAr && capName(s) !== capName(c))]);
    return { skill: 'capital', explain: `${capName(c)} عاصمة ${c.ar}.`, say: `${capName(c)} عاصمة أي دولة؟`, parts: [capName(c), 'عاصمة أي دولة؟'], prompt: h('p', {}, '🏛️ ', h('b', {}, capName(c)), ' عاصمة أي دولة؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  landmarkWho(c, n) {
    const opts = shuffle([c, ...others(c, n - 1, (s) => s.landmark !== c.landmark)]);
    return { skill: 'landmark', explain: `${c.landmark} في ${c.ar}.`, say: `${c.landmark}: في أي دولة؟`, parts: [c.landmark, 'في أي دولة؟'], prompt: hasPhoto(c.id) ? h('div', {}, h('img', { class: 'q-photo', src: landmarkPhoto(c.id).url, alt: '' }), h('p', {}, h('b', {}, c.landmark), ': في أي دولة؟')) : h('p', {}, landmarkIcon(c.landmark) + ' ', h('b', {}, c.landmark), ': في أي دولة؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  natureWho(c, n) {
    const its = NAT.items.filter((it) => it.countries?.includes(c.id) && ['river', 'desert', 'range', 'lake'].includes(it.kind));
    const it = its[Math.floor(Math.random() * its.length)];
    const verb = { river: 'يجري', lake: 'تقع', desert: 'تمتد', range: 'تمتد' }[it.kind];
    const opts = shuffle([c, ...others(c, n - 1, (s) => !it.countries.includes(s.id))]);
    return { skill: 'nature', explain: `${it.ar} ${verb} في ${c.ar}.`, say: `في أي دولة من هذه ${verb} ${it.ar}؟`, prompt: h('p', {}, NAT.kinds[it.kind].icon + ' في أي دولة من هذه ' + verb + ' ', h('b', {}, it.ar), '؟'),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  },
  // سؤال المعلم بصورته (للختم الذهبي)
  landmarkPic(c, n) { return Q.landmarkWho(c, n); },
  // ---------- أسئلة المقارنة: تربط الدول بعضها ببعض بدل حفظ كل دولة وحدها ----------
  bigger(c, n, o) { return compareQ(c, o, 'area', 'أيهما أكبر مساحة؟', 'أكبر مساحة'); },
  morePop(c, n, o) { return compareQ(c, o, 'pop', 'أيهما أكثر سكاناً؟', 'أكثر سكاناً'); },
  north(c, n, o) {
    o = o || partner(c, (s) => s.cen && Math.abs(s.cen[1] - c.cen[1]) >= 70);
    const win = c.cen[1] < o.cen[1] ? c : o; const lose = win === c ? o : c;
    return { skill: 'compare', explain: `${win.ar} أبعد شمالاً من ${lose.ar}.`, say: 'أيهما أبعد شمالاً؟', prompt: h('p', {}, '🧭 أيهما أبعد شمالاً؟'), other: o,
      options: shuffle([c, o]).map((x) => ({ correct: x.id === win.id, el: flagOpt(x), label: x.ar })) };
  },
  map(c) {
    return { skill: 'map', type: 'map', explain: `هنا تقع ${c.ar}.`, say: `المس ${c.ar} على الخريطة`, parts: ['المس', c.ar, 'على الخريطة'], prompt: h('p', {}, '📍 المس ', h('b', {}, c.ar), ' على الخريطة') };
  },
};

// كل سؤال يحمل دولته (q.c) لتسجيل النتيجة لها حتى في الجلسات المختلطة
for (const k of Object.keys(Q)) { const f = Q[k]; Q[k] = (c, ...a) => { const q = f(c, ...a); return { ...q, c, kind: k, remake: () => (q.other ? Q[k](c, a[0], q.other) : Q[k](c, ...a)) }; }; }

// هل يكشف السؤالُ الإجابةَ أو لا يصلح لهذه الدولة؟
const nameIn = (c, t) => { const b = bare(c.ar); return b.length >= 3 && (t || '').includes(b.slice(0, Math.max(3, b.length - 1))); };
export function usable(kind, c) {
  switch (kind) {
    case 'capital': return !!c.capAr && c.capQ !== null && !nameIn(c, capName(c)) && !c.ar.includes(bare(capName(c)).split(' ')[0]);
    case 'landmark': case 'landmarkWho': return !!c.landmark && !nameIn(c, c.landmark);
    // دليلاً للختم الذهبي: المعلم ذو الصورة فقط (يُعرف بشكله)، والسؤال بالصورة لا يكشف الاسم
    case 'landmarkPic': return hasPhoto(c.id) && !nameIn(c, c.landmark);
    case 'capWho': return usable('capital', c);
    case 'continent': return !c.ar.includes(bare(continents[c.cont]));
    case 'natureWho': return !!NAT.countriesReviewed && NAT.items.some((it) => it.countries?.includes(c.id) && ['river', 'desert', 'range', 'lake'].includes(it.kind));
    case 'map': return !!(c.cen || c.bb);
    case 'bigger': return !!c.area;
    case 'morePop': return !!c.pop && c.id !== 'PSE';
    case 'north': return !!c.cen;
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
// requeue: ما أخطأ فيه الطفل يعود في آخر الجلسة للتعلّم، ولا يُحسب في النتيجة ولا في السجل
export function runQuiz({ title, country, questions, onDone, onDecide, onAbort, onClose, onAnswer, intro, level: lv, pid, record: rec = true, recordSrc = 'quiz', mapCountries, requeue = false }) {
  const level = lv || store.me?.level || 2;
  const box = h('div', { class: 'quiz', role: 'dialog', 'aria-label': title });
  let i = 0, score = 0, answered = 0, decided = false;
  const results = []; const retry = []; const main = questions.length;
  questions = [...questions];
  // في مسابقة الإخوة يُخاطَب اللاعب صاحب الدور بصيغته
  if (pid) setAddressee(store.profiles.find((x) => x.id === pid)?.gender || null);
  const m = modal(box, { cls: 'quiz-modal', onClose: () => { if (pid) setAddressee(undefined); if (!decided && answered > 0) onAbort?.(score, answered); onClose?.(); } });
  const head = () => h('div', { class: 'q-head' },
    h('b', {}, title),
    h('div', { class: 'q-dots', 'aria-hidden': 'true' }, questions.slice(0, main).map((_, k) => h('i', { class: k < i ? (results[k] ? 'done' : 'miss') : k === i ? 'now' : '' }))));

  function finish() {
    box.replaceChildren(head());
    onDone?.(score, results, box, m);
  }
  function next() {
    if (i >= questions.length) return finish();
    const q = questions[i];
    const fb = h('div', { class: 'feedback' });
    let locked = false;
    const isRetry = i >= main;
    const answer = (ok, el) => {
      if (locked) return; locked = true;
      const qc = q.c || country;
      if (!isRetry) {
        results[i] = ok; if (ok) score++; answered++;
        if (qc && rec) record(qc.id, q.skill, ok, { pid, src: recordSrc });
        onAnswer?.(q, ok);
        if (!ok && requeue && q.remake && retry.length < 3) retry.push(q);
        if (i + 1 >= main && !decided) {
          decided = true; onDecide?.(score, results, questions.slice(0, main));
          for (const r of retry) questions.push({ ...r.remake(), again: true });
        }
      }
      sfx(ok ? 'correct' : 'wrong');
      // عند الخطأ: جملة تشرح الصواب، مكتوبة ومسموعة
      if (ok) speak(praise(), LANG.ar); else speak(q.explain || 'ليست هذه', LANG.ar);
      el?.classList.add(ok ? 'right' : 'wrong');
      const nb = h('button', { class: 'btn', onclick: () => { i++; next(); } }, i + 1 >= questions.length ? 'النتيجة 🏁' : 'التالي ←');
      fb.replaceChildren(...(!ok && q.explain ? [h('p', { class: 'explain' }, '💡 ' + q.explain)] : []), nb); nb.focus();
    };
    const say = () => (q.sayFn ? q.sayFn() : speak(q.parts || q.say, LANG.ar));
    const again = h('button', { class: 'say-again', 'aria-label': 'أعد قراءة السؤال', onclick: say }, '🔊');
    const tag = q.again ? '🔁 لنعد إلى ما فاتك' : q.spec?.gold ? '🥇 سؤال للختم الذهبي' : q.spec?.review ? '🔔 مراجعة' : null;
    const qBox = h('div', { class: 'question', tabindex: '-1' }, tag ? h('span', { class: 'q-tag' }, tag) : null, again, q.prompt);
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
      const opts = h('div', { class: 'options' + (q.flags ? ' flag-opts' : '') + (q.options.length === 3 ? ' three' : '') });
      q.options.forEach((o, k) => {
        const b = h('button', { class: 'opt', 'aria-label': 'الخيار ' + (k + 1).toLocaleString('ar-EG') + (o.label && !q.flags ? ': ' + o.label : ''), style: o.bg ? { background: o.bg } : null, onclick: () => {
          if (locked) return;
          answer(o.correct, b);
          if (!o.correct) opts.querySelector('[data-c="1"]')?.classList.add('right');
        } }, o.el);
        if (o.correct) b.dataset.c = '1';
        // زر الاستماع منفصل عن زر الاختيار (لا زر داخل زر)
        // للصغار الذين لا يقرؤون بعد: زر استماع ظاهر بجانب كل خيار مكتوب
        const sayIt = o.say || (level === 1 && o.label && !q.flags ? [o.label, LANG.ar] : null);
        opts.append(sayIt ? h('div', { class: 'opt-wrap' }, b, h('button', { class: 'opt-say', 'aria-label': 'استمع إلى الخيار ' + (k + 1).toLocaleString('ar-EG'), onclick: () => speak(sayIt[0], sayIt[1]) }, '🔊')) : b);
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
      // خمسة فأكثر للمتوسط: من يخمّن كل شيء يبلغها باحتمال نحو ١٥٪ فقط
      const level = score <= 4 ? 1 : score <= 7 ? 2 : 3;
      const names = { 1: '🌱 مستكشف', 2: '🌿 رحّالة', 3: '🌳 قبطان' };
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
