// أسئلة «اختباراتي» التي لا تولّدها مولّدات البطاقة: المفاهيم، وابن بطوطة، والعالم الإسلامي،
// والتحيات، والطبيعة، والعملة ونظام الحكم.
// الأسئلة المكتوبة مأخوذة من نصوص التطبيق نفسها (بطاقات المفاهيم، محطات ابن بطوطة، الأماكن المقدسة وطرق الحج)
import { h } from './ui.js';
import { states, byId, flagUrl, shuffle, pick, greetings, ibnBattuta, hajjRoutes, holyPlaces, continents } from './data.js';
import { NAT } from './map.js';
import { dotMap } from './concepts.js';
import { LANG, speak } from './speech.js';

const flagOpt = (s) => h('span', { class: 'qo-flag' }, h('img', { src: flagUrl(s.f), alt: '' }), h('b', {}, s.ar));
const txt = (t) => h('b', {}, t);
const ar = (n) => Number(n).toLocaleString('ar-EG');
const others = (c, n, ok) => {
  const same = states.filter((s) => s.id !== c.id && s.cont === c.cont && ok(s));
  return pick(same.length >= n ? same : states.filter((s) => s.id !== c.id && ok(s)), n);
};
// سؤال نصي عام: خيارات نصية، واحد صحيح
const textQ = (it, n) => {
  const opts = shuffle([it.a, ...shuffle(it.w).slice(0, Math.max(1, n - 1))]);
  return { skill: 'knowledge', explain: it.explain || it.a, say: it.q, prompt: h('p', {}, (it.icon ? it.icon + ' ' : '') + it.q),
    options: opts.map((o) => ({ correct: o === it.a, el: txt(o), label: o })) };
};

// ---------- المفاهيم والعالم الإسلامي وابن بطوطة: أسئلة مكتوبة ----------
// lv: أدنى مستوى يُسأل فيه
const WRITTEN = [
  // مفاهيم المستكشف
  { id: 'c-cont7', lv: 1, icon: '🌍', q: 'كم قارة في العالم؟', a: 'سبع قارات', w: ['خمس قارات', 'عشر قارات'], explain: 'في العالم سبع قارات: آسيا وأفريقيا وأوروبا وأمريكا الشمالية وأمريكا الجنوبية وأوقيانوسيا والقارة القطبية الجنوبية.' },
  { id: 'c-ice', lv: 1, icon: '🧊', q: 'أيّ قارة يغطيها الجليد؟', a: 'القارة القطبية الجنوبية', w: ['أفريقيا', 'أوروبا', 'آسيا'], explain: 'القارة القطبية الجنوبية يغطيها الجليد.' },
  { id: 'c-cap', lv: 1, icon: '🏛️', q: 'ما العاصمة؟', a: 'المدينة التي فيها حكومة الدولة', w: ['أكبر مدينة في الدولة دائماً', 'أقدم مدينة في الدولة', 'مدينة على البحر'], explain: 'العاصمة هي المدينة التي فيها حكومة الدولة.' },
  { id: 'c-capbig', lv: 2, icon: '🏛️', q: 'هل العاصمة دائماً أكبر مدينة في الدولة؟', a: 'لا، ليست دائماً', w: ['نعم، دائماً'], explain: 'العاصمة ليست دائماً أكبر مدينة في الدولة.' },
  { id: 'c-nb', lv: 1, icon: '🤝', q: 'الدول التي تشترك مع دولة في حدودها هي...', a: 'جيرانها', w: ['عواصمها', 'قاراتها'], explain: 'الدول التي تشترك مع دولة في حدودها هي جيرانها.' },
  { id: 'c-border', lv: 2, icon: '🤝', q: 'ما الحدود؟', a: 'خط يفصل أرض دولة عن أرض الدولة التي بجانبها', w: ['نهر في وسط الدولة', 'الطريق إلى العاصمة'], explain: 'الحدود خط يفصل أرض دولة عن أرض الدولة التي بجانبها.' },
  { id: 'c-north', lv: 1, icon: '🧭', q: 'في الخريطة، أين يكون الشمال؟', a: 'في الأعلى', w: ['في الأسفل', 'إلى اليمين', 'إلى اليسار'], explain: 'في الخريطة: الشمال في الأعلى، والجنوب في الأسفل.' },
  { id: 'c-east', lv: 2, icon: '🧭', q: 'في الخريطة، أين يكون الشرق؟', a: 'إلى اليمين', w: ['إلى اليسار', 'في الأعلى', 'في الأسفل'], explain: 'في الخريطة: الشرق إلى اليمين، والغرب إلى اليسار.' },
  { id: 'c-sun', lv: 1, icon: '☀️', q: 'من أين تشرق الشمس؟', a: 'من الشرق', w: ['من الغرب', 'من الشمال'], explain: 'تشرق الشمس من الشرق وتغرب في الغرب.' },
  { id: 'c-compass', lv: 1, icon: '🧭', q: 'على أيّ جهة تدلّنا البوصلة؟', a: 'على الشمال', w: ['على البحر', 'على العاصمة'], explain: 'البوصلة تدلّنا دائماً على الشمال.' },
  { id: 'c-eq', lv: 2, icon: '☀️', q: 'خط الاستواء يقسم الأرض إلى...', a: 'نصف شمالي ونصف جنوبي', w: ['نصف شرقي ونصف غربي', 'سبع قارات'], explain: 'خط الاستواء خط نتخيّله حول وسط الأرض، يقسمها نصفين: شمالياً وجنوبياً.' },
  { id: 'c-eqhot', lv: 2, icon: '☀️', q: 'كيف يكون الجو في البلاد القريبة من خط الاستواء؟', a: 'حارّاً طوال السنة', w: ['بارداً طوال السنة', 'مثلجاً في الصيف'], explain: 'البلاد القريبة من خط الاستواء حارّة طوال السنة.' },
  { id: 'c-eqcold', lv: 3, icon: '❄️', q: 'كلما ابتعدنا عن خط الاستواء نحو الشمال أو الجنوب صار الجو...', a: 'أبرد', w: ['أحرّ', 'كما هو'], explain: 'كلما ابتعدنا عن خط الاستواء صار الجو أبرد.' },
  { id: 'c-off', lv: 2, icon: '🗣️', q: 'ما اللغة الرسمية؟', a: 'اللغة التي تكتب بها الدولة قوانينها وتعلّم بها في مدارسها', w: ['اللغة التي يتكلمها السياح', 'أقدم لغة في العالم'], explain: 'اللغة الرسمية هي التي تكتب بها الدولة قوانينها وتعلّم بها في مدارسها.' },
  { id: 'c-langs', lv: 3, icon: '🗣️', q: 'كم لغة في العالم اليوم؟', a: 'آلاف اللغات', w: ['عشر لغات', 'مئة لغة'], explain: 'في العالم اليوم آلاف اللغات، وبعض الدول فيها لغات كثيرة.' },
  // العالم الإسلامي
  { id: 'i-kaaba', lv: 1, icon: '🕋', q: 'في أي مدينة الكعبة المشرفة؟', a: 'مكة المكرمة', w: ['المدينة المنورة', 'القدس'], explain: 'الكعبة المشرفة والمسجد الحرام في مكة المكرمة، قبلة المسلمين.' },
  { id: 'i-nabawi', lv: 1, icon: '🕌', q: 'في أي مدينة المسجد النبوي؟', a: 'المدينة المنورة', w: ['مكة المكرمة', 'القدس'], explain: 'المدينة المنورة مدينة رسول الله ﷺ، وفيها المسجد النبوي.' },
  { id: 'i-aqsa', lv: 1, icon: '🕌', q: 'في أي مدينة المسجد الأقصى؟', a: 'القدس', w: ['مكة المكرمة', 'المدينة المنورة'], explain: 'في القدس المسجد الأقصى، أولى القبلتين وثالث الحرمين.' },
  { id: 'i-qibla', lv: 2, icon: '🕌', q: 'المسجد الأقصى أولى القبلتين، و...', a: 'ثالث الحرمين', w: ['أكبر المساجد', 'أحدث المساجد'], explain: 'المسجد الأقصى أولى القبلتين وثالث الحرمين.' },
  { id: 'i-sham', lv: 2, icon: '🐫', q: 'من أي مدينة كان ينطلق طريق الحج الشامي؟', a: 'دمشق', w: ['القاهرة', 'الكوفة'], explain: hajjRoutes[1]?.note },
  { id: 'i-masri', lv: 2, icon: '🐫', q: 'في أي مدينة كان يجتمع حجاج مصر والمغرب والأندلس؟', a: 'القاهرة', w: ['دمشق', 'الكوفة'], explain: hajjRoutes[0]?.note },
  { id: 'i-zubayda', lv: 3, icon: '🐫', q: 'درب زبيدة طريق حجاج أي بلاد؟', a: 'العراق', w: ['مصر', 'الشام'], explain: hajjRoutes[2]?.note },
  { id: 'i-zubayda2', lv: 3, icon: '💧', q: 'من عمّرت درب زبيدة بالبرك والآبار لسقيا الحجاج؟', a: 'السيدة زبيدة زوجة هارون الرشيد', w: ['ملكة سبأ', 'السيدة خديجة رضي الله عنها'], explain: hajjRoutes[2]?.note },
  { id: 'i-oic', lv: 2, icon: '🟩', q: 'كم دولة في منظمة التعاون الإسلامي؟', a: ar(states.filter((s) => s.oic).length) + ' دولة', w: ['٢٢ دولة', '١٩٥ دولة'], explain: `في منظمة التعاون الإسلامي ${ar(states.filter((s) => s.oic).length)} دولة.` },
  // ابن بطوطة
  { id: 'b-start', lv: 2, icon: '🐪', q: 'من أي مدينة بدأ ابن بطوطة رحلته؟', a: 'طنجة', w: ['فاس', 'القاهرة', 'دمشق'], explain: ibnBattuta[0]?.story },
  { id: 'b-why', lv: 2, icon: '🐪', q: 'لماذا خرج ابن بطوطة من طنجة أول مرة؟', a: 'قاصداً الحج', w: ['للتجارة في الصين', 'ليصير قاضياً'], explain: ibnBattuta[0]?.story },
  { id: 'b-age', lv: 3, icon: '🐪', q: 'كم كان عمر ابن بطوطة حين خرج من طنجة؟', a: '٢١ سنة', w: ['١٠ سنوات', '٥٠ سنة'], explain: ibnBattuta[0]?.story },
  { id: 'b-rule', lv: 3, icon: '🐪', q: 'ما قاعدة ابن بطوطة في السفر؟', a: 'ألّا يسلك طريقاً مرتين ما استطاع', w: ['أن يسافر في الليل فقط', 'أن يبقى في كل مدينة سنة'], explain: ibnBattuta.find((s) => s.city === 'مكة المكرمة')?.story },
  { id: 'b-years', lv: 3, icon: '🐪', q: 'كم سنة تقريباً سافر ابن بطوطة قبل أن يرجع إلى المغرب؟', a: 'نحو ٢٤ سنة', w: ['نحو سنتين', 'نحو ١٠٠ سنة'], explain: ibnBattuta.find((s) => s.city === 'فاس')?.story },
];

// محطات ابن بطوطة: «في أي دولة تقع اليوم مدينة كذا؟» (المدن لا الدول والجزر)
const seen = new Set();
const STATIONS = ibnBattuta.filter((s) => byId[s.cc] && !['MDV', 'LKA'].includes(s.cc) && !seen.has(s.city) && seen.add(s.city));
const stationItems = STATIONS.map((s, k) => ({ id: 'bs-' + s.cc + '-' + s.year + '-' + k, lv: 2, gen: (n) => {
  const c = byId[s.cc]; const opts = shuffle([c, ...others(c, n - 1, (x) => !STATIONS.some((t) => t.cc === x.id && t.city === s.city))]);
  return { skill: 'knowledge', explain: `${s.city} في ${c.ar} اليوم. ${s.story}`, say: `زار ابن بطوطة ${s.city}. في أي دولة تقع اليوم؟`,
    prompt: h('p', {}, '🐪 زار ابن بطوطة ', h('b', {}, s.city), ' سنة ' + ar(s.year) + '. في أي دولة تقع اليوم؟'),
    options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
} }));

// منظمة التعاون الإسلامي: «أيّ هذه الدول عضو؟» (للمستوى الثالث، الدول المشهورة فقط حتى لا يطول الألبوم)
const oicItems = states.filter((s) => s.oic && s.famous).map((c) => ({ id: 'oic-' + c.id, lv: 3, gen: (n) => {
  const opts = shuffle([c, ...others(c, n - 1, (x) => !x.oic)]);
  return { skill: 'knowledge', explain: `${c.ar} عضو في منظمة التعاون الإسلامي.`, say: 'أيّ هذه الدول عضو في منظمة التعاون الإسلامي؟', prompt: h('p', {}, '🟩 أيّ هذه الدول عضو في منظمة التعاون الإسلامي؟'),
    options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
} }));

export const KNOWLEDGE = [...WRITTEN.map((it) => ({ ...it, gen: (n) => textQ(it, n) })), ...stationItems, ...oicItems];
export const knowledgeById = Object.fromEntries(KNOWLEDGE.map((k) => [k.id, k]));
export const KNOWLEDGE_GROUPS = { c: '📘 المفاهيم', i: '🕋 العالم الإسلامي', b: '🐪 ابن بطوطة', o: '🟩 منظمة التعاون الإسلامي' };
export const knowledgeGroup = (id) => (id.startsWith('oic') ? 'o' : id[0]);

// ---------- التحيات: «في أي دولة يقولون: Bonjour؟» ----------
export const greetOf = (c) => greetings[c.greet];
export function greetQ(c, n) {
  const g = greetOf(c);
  const opts = shuffle([c, ...others(c, n - 1, (s) => greetOf(s) && greetOf(s).t !== g.t)]);
  return { skill: 'language', explain: `في ${c.ar} يقولون للتحية: «${g.t}» (${g.ar}).`, say: 'في أي دولة يقولون هذه التحية؟', sayFn: () => speak(g.t, g.lang),
    prompt: h('div', {}, h('p', { class: 'greet-big', dir: 'auto' }, g.t), g.t !== g.ar ? h('small', { class: 'hint' }, 'تُنطق: ' + g.ar) : null, h('p', {}, '👋 في أي دولة يقولون هذه التحية؟')),
    options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
}

// ---------- الطبيعة: أين هذا النهر/البحر/المحيط؟ ----------
const NKIND = { ocean: 'المحيط', sea: 'البحر', river: 'النهر', lake: 'البحيرة', range: 'الجبال', peak: 'الجبل', desert: 'الصحراء' };
export const natureById = Object.fromEntries(NAT.items.map((it) => [it.id, it]));
export function natureItems(level) {
  const kinds = level === 1 ? ['ocean'] : level === 2 ? ['ocean', 'river', 'desert', 'range', 'lake'] : Object.keys(NKIND);
  return NAT.items.filter((it) => kinds.includes(it.kind) && it.xy);
}
export function natureQ(it, n, level) {
  const inCountry = it.countries?.length && level >= 2 && Math.random() < 0.5;
  if (inCountry) {
    const c = byId[it.countries.find((id) => byId[id]?.kind === 'state')];
    if (c) {
      const opts = shuffle([c, ...others(c, n - 1, (s) => !it.countries.includes(s.id))]);
      return { skill: 'nature', explain: `${it.ar} في ${it.countries.map((id) => byId[id]?.ar).filter(Boolean).slice(0, 4).join(' و')}. ${it.fact || ''}`, say: `في أي دولة من هذه ${it.ar}؟`,
        prompt: h('p', {}, NAT.kinds[it.kind].icon + ' في أي دولة من هذه ', h('b', {}, it.ar), '؟'),
        options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
    }
  }
  // اسم المعلم من موضعه على الخريطة؛ الخيارات من النوع نفسه
  const same = NAT.items.filter((x) => x.kind === it.kind && x.id !== it.id);
  const opts = shuffle([it, ...pick(same, n - 1)]);
  const word = NKIND[it.kind];
  return { skill: 'nature', explain: `${it.ar}. ${it.fact || ''}`, say: `ما اسم ${word} الذي عند النقطة الحمراء؟`,
    prompt: h('div', {}, h('div', { class: 'q-dotmap' }, dotMap(it.xy)), h('p', {}, NAT.kinds[it.kind].icon + ` ما اسم ${word} عند النقطة الحمراء؟`)),
    options: opts.map((o) => ({ correct: o.id === it.id, el: txt(o.ar), label: o.ar })) };
}

// ---------- العملة ونظام الحكم (مادة اختيارية للمستوى الثالث) ----------
const fam = (g) => (/عسكري/.test(g) ? 'mil' : /ملكية|سلطنة|إمارة|إمارات/.test(g) ? 'mon' : /جمهورية/.test(g) ? 'rep' : 'oth');
export const moneyOk = (c, kind) => (kind === 'cur' ? !!c.cur?.ar : c.id !== 'PSE' && !!c.gov?.ar && c.gov.type !== 'occupied');
export function currencyQ(c, n) {
  const mine = c.cur.ar;
  const pool = [...new Set(states.filter((s) => s.cur?.ar && s.cur.ar !== mine && s.cur.ar.split(' ')[0] !== mine.split(' ')[0]).map((s) => s.cur.ar))];
  const opts = shuffle([mine, ...pick(pool, n - 1)]);
  return { skill: 'money', explain: `عملة ${c.ar}: ${mine}.`, say: `ما عملة ${c.ar}؟`, prompt: h('p', {}, '💰 ما عملة ', h('b', {}, c.ar), '؟'),
    options: opts.map((o) => ({ correct: o === mine, el: txt(o), label: o })) };
}
export function govQ(c, n) {
  const mine = c.gov.ar; const f = fam(mine);
  const byFam = {};
  for (const s of states) if (s.gov?.ar && s.id !== 'PSE' && fam(s.gov.ar) !== f) (byFam[fam(s.gov.ar)] ||= new Set()).add(s.gov.ar);
  const wrong = shuffle(Object.values(byFam).map((set) => shuffle([...set])[0])).slice(0, n - 1);
  const opts = shuffle([mine, ...wrong]);
  return { skill: 'money', explain: `نظام الحكم في ${c.ar}: ${mine}. ${c.gov.kid || ''}`, say: `ما نظام الحكم في ${c.ar}؟`, prompt: h('p', {}, (c.gov.icon || '🏛️') + ' ما نظام الحكم في ', h('b', {}, c.ar), '؟'),
    options: opts.map((o) => ({ correct: o === mine, el: txt(o), label: o })) };
}
export { continents, LANG };

// ---------- «صور مشهورة»: حيوان أو طعام أو نبات تشتهر به دولة، وحيوانات القارات ----------
import { secondPhoto, KIND, allAnimals } from './photos.js';
import LIST2 from '../content/second-photos-list.json';
const CONT_ORDER = ['asia', 'africa', 'europe', 'namerica', 'samerica', 'oceania', 'antarctica'];
export function iconItems(lv) {
  const sec = states.filter((s) => secondPhoto(s.id) && (lv > 1 || secondPhoto(s.id).kind === 'animal')).map((s) => 's:' + s.id);
  return [...sec, ...allAnimals().map((a) => 'a:' + a.key)];
}
export function iconLabel(id) {
  if (id.startsWith('s:')) { const p = secondPhoto(id.slice(2)); return p ? p.ar + ' — ' + byId[id.slice(2)]?.ar : id; }
  return allAnimals().find((a) => 'a:' + a.key === id)?.ar || id;
}
export function iconQ(id, n) {
  if (id.startsWith('s:')) {
    const c = byId[id.slice(2)]; const p = secondPhoto(c.id); const k = KIND[p.kind] || KIND.animal;
    const opts = shuffle([c, ...others(c, n - 1, (s) => LIST2[s.id]?.ar !== p.ar)]);
    return { skill: 'icons', explain: `${p.ar}: ${k.label.replace(/:$/, '')} ${c.ar}.`, say: `${p.ar}. بأي دولة من هذه يشتهر؟`,
      prompt: h('div', {}, h('img', { class: 'q-photo', src: p.url, alt: '' }), h('p', {}, k.icon + ' ', h('b', {}, p.ar), ': بأي دولة من هذه يشتهر؟')),
      options: opts.map((o) => ({ correct: o.id === c.id, el: flagOpt(o), label: o.ar })) };
  }
  const a = allAnimals().find((x) => 'a:' + x.key === id);
  const wrong = shuffle(CONT_ORDER.filter((k) => k !== a.cont && (a.cont !== 'antarctica' || k !== 'oceania'))).slice(0, n - 1);
  const opts = shuffle([a.cont, ...wrong]);
  return { skill: 'icons', explain: `${a.ar} من حيوانات قارة ${continents[a.cont]}.`, say: `${a.ar}. من حيوانات أي قارة؟`,
    prompt: h('div', {}, h('img', { class: 'q-photo', src: a.url, alt: '' }), h('p', {}, '🐾 ', h('b', {}, a.ar), ': من حيوانات أي قارة؟')),
    options: opts.map((k) => ({ correct: k === a.cont, el: txt('قارة ' + continents[k]), label: continents[k] })) };
}
