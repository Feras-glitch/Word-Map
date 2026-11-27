import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-900.css';
import '@fontsource/cairo/latin-700.css';
import './style.css';
import { h, consumeSkipPop, closeTopModal, clearModals, toast, setPageGuard, pageGuardMsg, confirmLeave } from './ui.js';
import { store } from './store.js';
import { setFemOff, setAddressee } from './gender.js';
import { startTimeLimit } from './timelimit.js';
import { stopSpeech } from './speech.js';
import { profilesScreen } from './screens/profiles.js';
import { homeScreen } from './screens/home.js';
import { exploreScreen } from './screens/explore.js';
import { passportScreen } from './screens/passport.js';
import { gamesScreen, flagGame, whereGame, capitalGame, memoryGame } from './screens/games.js';
import { battutaScreen } from './screens/battuta.js';
import { islamicScreen } from './screens/islamic.js';
import { helloScreen } from './screens/hello.js';
import { dailyScreen } from './screens/daily.js';
import { settingsScreen } from './screens/settings.js';
import { worldScreen } from './screens/world.js';
import { parentScreen } from './screens/parent.js';
import { familyScreen } from './screens/family.js';
import { aboutScreen } from './screens/about.js';
import { studioScreen } from './screens/studio.js';
import { journeysScreen } from './screens/journeys.js';
import { playScreen } from './screens/play.js';
import { conceptsScreen } from './concepts.js';
import { missionsScreen, findScreen, guideScreen, nileScreen, routeScreen, layerScreen } from './screens/missions.js';
import { examsScreen, albumScreen, bigExamScreen } from './screens/exams.js';

const screens = {
  profiles: { title: 'من يلعب؟', fn: profilesScreen, noBack: true },
  home: { title: '', fn: homeScreen, noBack: true },
  explore: { title: '🗺️ خريطة العالم', fn: exploreScreen, full: true },
  passport: { title: '🛂 جواز سفري', fn: passportScreen },
  games: { title: '🎯 تمرّن وحدك', fn: gamesScreen, back: 'play' },
  'g-flag': { title: '🚩 خمّن العلم', fn: flagGame, back: 'games' },
  'g-where': { title: '📍 أين هذه الدولة؟', fn: whereGame, back: 'games', full: true },
  'g-capital': { title: '🏛️ ما العاصمة؟', fn: capitalGame, back: 'games' },
  'g-memory': { title: '🧠 ذاكرة الأعلام', fn: memoryGame, back: 'games' },
  battuta: { title: '🐪 رحلة ابن بطوطة', fn: battutaScreen, full: true },
  islamic: { title: '🕋 العالم الإسلامي', fn: islamicScreen, full: true },
  hello: { title: '👋 قل مرحباً', fn: helloScreen },
  daily: { title: '✈️ رحلة اليوم', fn: dailyScreen, full: true },
  options: { title: '⚙️ الإعدادات', fn: settingsScreen },
  world: { title: '🥇 اجمع الأختام الذهبية', fn: worldScreen, back: 'play' },
  parent: { title: '🔒 لوحة الوالدين', fn: parentScreen },
  family: { title: '👨‍👩‍👧‍👦 العبوا معاً', fn: familyScreen, back: 'play' },
  about: { title: '🗺️ عن هذه الخريطة', fn: aboutScreen },
  studio: { title: '🎙️ الاستوديو الصوتي', fn: studioScreen },
  journeys: { title: '🧳 رحلاتي', fn: journeysScreen },
  play: { title: '🎮 العب', fn: playScreen },
  exams: { title: '📝 اختباراتي', fn: examsScreen, back: 'play' },
  exam: { title: '📚 الألبوم', fn: albumScreen, back: 'exams' },
  bigexam: { title: '🎓 الاختبار الكبير', fn: bigExamScreen, back: 'exams' },
  concepts: { title: '📘 مفاهيم المستكشف', fn: conceptsScreen },
  missions: { title: '🔎 مهام المستكشف', fn: missionsScreen },
  find: { title: '🔎 ابحث عن بلدي', fn: findScreen, full: true, back: 'missions' },
  guide: { title: '🧭 كن دليل إخوتك', fn: guideScreen, back: 'missions' },
  nile: { title: '💧 رحلة قطرة في النيل', fn: nileScreen, full: true, back: 'missions' },
  route: { title: '🚗 ارسم طريقي', fn: routeScreen, full: true, back: 'missions' },
  layer: { title: '⛰️ أين النهر والجبل؟', fn: layerScreen, full: true, back: 'missions' },
};

const app = document.getElementById('app');
let cleanup = null;

let curHash = location.hash;
export function go(name, { replace = false } = {}) {
  const g = pageGuardMsg();
  if (g) return confirmLeave(g, () => { setPageGuard(null); go(name, { replace }); });
  const hash = '#' + name;
  if (replace) history.replaceState(null, '', hash); else if (location.hash !== hash) history.pushState(null, '', hash);
  render();
}

function render() {
  setPageGuard(null); curHash = location.hash;
  let name = location.hash.slice(1).split('?')[0] || 'home';
  if (!screens[name]) name = 'home';
  if (!store.me && !['profiles', 'parent', 'about'].includes(name)) { history.replaceState(null, '', '#profiles'); name = 'profiles'; }
  const sc = screens[name];
  // شاشات الأهل والاستوديو تُعرض بصيغتها الأصلية
  setAddressee(undefined); setFemOff(['parent', 'about', 'studio'].includes(name));
  stopSpeech();
  clearModals();
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  app.innerHTML = '';
  const main = h('main', { class: 'screen ' + name + (sc.full ? ' full' : '') });
  if (sc.title) {
    app.append(h('header', { class: 'top' },
      sc.noBack ? h('span') : h('button', { class: 'back', 'aria-label': 'رجوع', onclick: () => (history.length > 1 ? history.back() : go(sc.back || 'home')) }, '→'),
      h('h1', {}, sc.title),
      store.me ? h('button', { class: 'home-btn', 'aria-label': 'الرئيسية', onclick: () => go('home') }, '🏠') : h('span')));
  }
  app.append(main);
  cleanup = sc.fn(main, { go }) || null;
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', () => {
  if (consumeSkipPop()) return;      // رجوع ناتج عن إغلاق نافذة بزر ✕
  if (closeTopModal()) return;       // زر الرجوع يغلق النافذة المفتوحة أولاً
  const g = pageGuardMsg();
  if (g) { history.pushState(null, '', curHash); return confirmLeave(g, () => { setPageGuard(null); history.back(); }); }
  render();
});
render();
startTimeLimit();

// تنبيه إن فشل الحفظ على الجهاز (مثلاً امتلاء الذاكرة)
window.addEventListener('store-save-failed', () => toast('⚠️ تعذّر حفظ التقدم على هذا الجهاز. احفظ نسخة احتياطية من لوحة الوالدين', 6000));
