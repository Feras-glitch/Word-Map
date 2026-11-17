import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-900.css';
import '@fontsource/cairo/latin-700.css';
import './style.css';
import { h } from './ui.js';
import { store } from './store.js';
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

const screens = {
  profiles: { title: 'من يلعب؟', fn: profilesScreen, noBack: true },
  home: { title: '', fn: homeScreen, noBack: true },
  explore: { title: '🗺️ خريطة العالم', fn: exploreScreen, full: true },
  passport: { title: '🛂 جواز سفري', fn: passportScreen },
  games: { title: '🎮 الألعاب', fn: gamesScreen },
  'g-flag': { title: '🚩 خمّن العلم', fn: flagGame, back: 'games' },
  'g-where': { title: '📍 أين هذه الدولة؟', fn: whereGame, back: 'games', full: true },
  'g-capital': { title: '🏛️ ما العاصمة؟', fn: capitalGame, back: 'games' },
  'g-memory': { title: '🧠 ذاكرة الأعلام', fn: memoryGame, back: 'games' },
  battuta: { title: '🐪 رحلة ابن بطوطة', fn: battutaScreen, full: true },
  islamic: { title: '🕋 العالم الإسلامي', fn: islamicScreen, full: true },
  hello: { title: '👋 قل مرحباً', fn: helloScreen },
  daily: { title: '✈️ رحلة اليوم', fn: dailyScreen, full: true },
  options: { title: '⚙️ الإعدادات', fn: settingsScreen },
};

const app = document.getElementById('app');
let cleanup = null;

export function go(name, { replace = false } = {}) {
  const hash = '#' + name;
  if (replace) history.replaceState(null, '', hash); else if (location.hash !== hash) history.pushState(null, '', hash);
  render();
}

function render() {
  let name = location.hash.slice(1) || 'home';
  if (!screens[name]) name = 'home';
  if (!store.me && name !== 'profiles') { history.replaceState(null, '', '#profiles'); name = 'profiles'; }
  const sc = screens[name];
  stopSpeech();
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  app.innerHTML = '';
  const main = h('main', { class: 'screen ' + name + (sc.full ? ' full' : '') });
  if (sc.title) {
    app.append(h('header', { class: 'top' },
      sc.noBack ? h('span') : h('button', { class: 'back', 'aria-label': 'رجوع', onclick: () => (history.length > 1 ? history.back() : go(sc.back || 'home')) }, '→'),
      h('h1', {}, sc.title),
      h('button', { class: 'home-btn', 'aria-label': 'الرئيسية', onclick: () => go('home') }, '🏠')));
  }
  app.append(main);
  cleanup = sc.fn(main, { go }) || null;
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', render);
render();
