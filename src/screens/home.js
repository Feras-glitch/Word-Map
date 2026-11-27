import { h, owl, modal, owlSVG } from '../ui.js';
import { store } from '../store.js';
import { states, LEVELS } from '../data.js';
import { speak } from '../speech.js';
import { sfx } from '../sfx.js';
import { dueReviews, goldEligible } from '../mastery.js';
import { journeyState } from '../journeys.js';
import { byId } from '../data.js';
import { stampsWord } from '../arnum.js';
import { SUBJECTS } from '../exams.js';
import { familyGoalBar } from './exams.js';

// البلاطات في ثلاثة أقسام بدل قائمة واحدة
const SECTIONS = [
  ['🧭 استكشف', [
    { k: 'journeys', e: '🧳', t: 'رحلاتي', s: 'من فلسطين إلى العالم', c: '#1a9b55' },
    { k: 'explore', e: '🗺️', t: 'خريطة العالم', s: 'استكشف الدول وأعلامها', c: '#2b7fd4' },
    { k: 'concepts', e: '📘', t: 'مفاهيم المستكشف', s: 'ما القارة؟ ما العاصمة؟', c: '#0ea5e9' },
    { k: 'battuta', e: '🐪', t: 'رحلة ابن بطوطة', s: 'سافر مع الرحالة العظيم', c: '#a0522d' },
    { k: 'islamic', e: '🕋', t: 'العالم الإسلامي', s: 'الحرمان والأقصى وطرق الحج', c: '#1b8a5a' },
    { k: 'hello', e: '👋', t: 'قل مرحباً', s: 'التحية بلغات العالم', c: '#2a9d8f' },
    { k: 'animals', e: '🐾', t: 'حيوانات القارات', s: 'وبماذا تشتهر كل دولة', c: '#c2410c' },
    { k: 'compare', e: '⚖️', t: 'قارن بين دولتين', s: 'المساحة والسكان والموقع', c: '#64748b' },
  ]],
  ['🎮 العب وتمرّن', [
    { k: 'play', e: '🎮', t: 'العب', s: 'اختباراتي، والأختام الذهبية، والتمرين، واللعب مع العائلة', c: '#8e44ad', wide: true },
    { k: 'missions', e: '🔎', t: 'مهام المستكشف', s: 'ألغاز تحلّها بالخريطة', c: '#0f766e' },
    { k: 'daily', e: '✈️', t: 'رحلة اليوم', s: 'دولة جديدة كل يوم', c: '#e76f51' },
  ]],
  ['⭐ لي', [
    { k: 'passport', e: '🛂', t: 'جواز سفري', s: 'أختامي وشهاداتي', c: '#d4a017' },
    { k: 'studio', e: '🎙️', t: 'استوديو صوتي', s: 'سجّل الأسماء بصوتك', c: '#db2777' },
  ]],
];

// المستوى الأول: أربعة أبواب كبيرة، والباقي خلف «المزيد»
const SIMPLE = [
  { k: 'journeys', e: '🧳', t: 'رحلاتي', c: '#1a9b55' },
  { k: 'explore', e: '🗺️', t: 'الخريطة', c: '#2b7fd4' },
  { k: 'play', e: '🎮', t: 'العب', c: '#8e44ad' },
  { k: 'passport', e: '🛂', t: 'جوازي', c: '#d4a017' },
];


export function homeScreen(root, { go }) {
  const me = store.me;
  const got = Object.keys(me.stamps).length;
  const due = dueReviews().length;
  const greet = ['أهلاً', 'مرحباً', 'صباح الاستكشاف'][new Date().getHours() < 12 ? 2 : Math.floor(Math.random() * 2)];
  root.append(
    h('div', { class: 'home-top' },
      h('button', { class: 'me', onclick: () => go('profiles') }, h('span', { class: 'av' }, me.avatar), h('span', {}, h('b', {}, me.name), h('small', {}, LEVELS[me.level].emoji + ' ' + LEVELS[me.level].name))),
      h('div', { class: 'me-stats' }, h('span', {}, got ? '🛂 ' + got.toLocaleString('ar-EG') + ' من ' + states.length.toLocaleString('ar-EG') : '🛂 لا أختام بعد'),
        h('button', { class: 'icon-btn', 'aria-label': 'الإعدادات', onclick: () => go('options') }, '⚙️'))),
    h('h1', { class: 'brand' }, '🌍 مستكشف العالم'),
    owl(`${greet} يا ${me.name}! ${got ? 'في جوازك ' + stampsWord(got) + '.' : 'جوازك ينتظر أول ختم.'} إلى أين نسافر اليوم؟`, { size: 84 }),
    nextStep(me, due, got, go),
    familyGoalBar() || '',
    ...(me.level === 1 ? simpleHome(go, due) : sections(SECTIONS, go, due)),
  );
  root.querySelector('.owl-wrap').addEventListener('click', () => speak(root.querySelector('.bubble').textContent, 'ar-SA'));
  if (!me.toured) setTimeout(() => { if (root.isConnected && ['', '#home'].includes(location.hash.split('?')[0]) && !document.querySelector('.modal-back')) tour(me); }, 600);
}

// جولة التعريف: ثلاث خطوات في أول دخول لكل مستكشف
const TOUR = [
  ['🧳', 'رحلاتي', 'من هنا تبدأ رحلتك: دولة بعد دولة، من فلسطين وجيرانها إلى العالم كله.'],
  ['🛂', 'جواز السفر', 'كل دولة تزورها تضع ختمها في جوازك. اجمع الأختام!'],
  ['🎮', 'العب', 'وهنا الألعاب واختباراتي: أجب صحيحاً لتضيء الأعلام والخرائط وتجمع النجوم.'],
];
function tour(me) {
  let i = 0; let m;
  const box = h('div', { class: 'tour' });
  const draw = () => {
    const [e, t, s] = TOUR[i];
    box.replaceChildren(h('div', { class: 'owl-wrap', html: owlSVG(70) }), h('div', { class: 'tour-e' }, e), h('h3', {}, t), h('p', {}, s),
      h('div', { class: 'tour-dots' }, TOUR.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
      h('button', { class: 'btn big', onclick: () => { if (++i < TOUR.length) draw(); else m.close(); } }, i < TOUR.length - 1 ? 'التالي ←' : 'هيا نبدأ!'));
    speak(t + '. ' + s, 'ar-SA');
  };
  draw();
  m = modal(box, { cls: 'tour-modal', onClose: () => store.updateProfile(me.id, { toured: true }) });
}

// «ابدأ من هنا»: خطوة واحدة مقترحة. المراجعة المستحقة أولاً، ثم الدولة التالية في الرحلة الحالية
function nextStep(me, due, got, go) {
  const ready = Object.keys(me.stamps || {}).filter((id) => goldEligible(me, id)).length;
  const { current } = journeyState(me);
  const as = me.assigned && !me.assigned.done ? me.assigned : null;
  const [k, e, t, s] = as ? [`exam?s=${as.subj}&sc=${encodeURIComponent(as.scope || 'all')}&w=1`, '🎯', 'اختبار الأسبوع من الوالدين', SUBJECTS[as.subj]?.title + (as.scopeTitle ? ' · ' + as.scopeTitle : '')]
    : due ? ['world', '🔔', 'حان وقت المراجعة', 'أسئلة عن دول أتقنتها']
    : current ? ['journeys', current.icon, (got ? 'تابع رحلة: ' : 'ابدأ من هنا: ') + current.title, 'الدولة التالية: ' + byId[current.next].ar]
    : ready ? ['world', '🥇', 'اجمع أدلة الختم الذهبي', `${ready.toLocaleString('ar-EG')} من الدول التي زرتها تنتظر`]
    : ['missions', '🔎', 'مهمة اليوم', 'لغز تحلّه بالخريطة'];
  return h('button', { class: 'next-step', onclick: () => { sfx('tap'); go(k); } }, h('span', { class: 'ne' }, e), h('span', {}, h('b', {}, t), h('small', {}, s)), h('span', { class: 'na' }, '←'));
}

const tile = (t, go, due) => h('button', { class: 'tile' + (t.wide ? ' wide' : ''), style: { '--c': t.c }, onclick: () => { sfx('tap'); go(t.k); } },
  (t.k === 'play' || t.k === 'world') && due ? h('span', { class: 'badge-dot' }, due.toLocaleString('ar-EG')) : null,
  h('span', { class: 'te' }, t.e), h('span', { class: 'tt' }, h('b', {}, t.t), t.s ? h('small', {}, t.s) : null));
const sections = (secs, go, due) => secs.flatMap(([title, tiles]) => [h('h2', { class: 'sec-title' }, title), h('div', { class: 'tiles even' }, tiles.map((t) => tile(t, go, due)))]);
function simpleHome(go, due) {
  return [h('div', { class: 'tiles simple' }, SIMPLE.map((t) => tile(t, go, due))),
    h('details', { class: 'more-home' }, h('summary', {}, '➕ المزيد'), ...sections(SECTIONS, go, due))];
}
