// وقت اللعب اليومي: يحدده الأب من لوحة الوالدين. يُعدّ وقت كل طفل بالدقائق والتطبيق ظاهر،
// وحين ينتهي تظهر رسالة لطيفة من البومة. الوقت الإضافي بالرقم السري فقط.
import { h, owlSVG } from './ui.js';
import { store } from './store.js';
import { today } from './mastery.js';
import { parentLock } from './lock.js';

const FREE = ['parent', 'profiles', 'about', 'options'];
const route = () => location.hash.slice(1).split('?')[0] || 'home';
export const usedToday = (p = store.me) => p?.usage?.[today()] || 0;
export const limitFor = () => +store.parent.dailyMinutes || 0;
const extraToday = () => (store.parent.extra?.day === today() ? store.parent.extra.min : 0);
export const minutesLeft = () => { const L = limitFor(); return L ? L + extraToday() - usedToday() : Infinity; };

let overlay = null;
function check() {
  if (!store.me || FREE.includes(route()) || minutesLeft() > 0) { overlay?.remove(); overlay = null; return; }
  if (overlay) return;
  overlay = h('div', { class: 'time-up', role: 'dialog' },
    h('div', { class: 'owl-wrap', html: owlSVG(120, 'wink') }),
    h('h2', {}, `انتهى وقت الاستكشاف اليوم يا ${store.me.name} 🌙`),
    h('p', {}, 'أحسنت اليوم! العالم ينتظرك غداً.'),
    h('button', { class: 'btn big soft', onclick: () => { location.hash = '#profiles'; } }, '👥 تبديل المستكشف'),
    h('button', { class: 'btn small soft', onclick: () => parentLock(() => { store.setParent({ extra: { day: today(), min: extraToday() + 15 } }); check(); }) }, '🔒 للوالدين: ربع ساعة إضافية'));
  document.body.append(overlay);
}
export function startTimeLimit() {
  // دقيقة لكل دقيقة يكون فيها التطبيق ظاهراً وطفل مختار
  setInterval(() => {
    if (document.visibilityState === 'visible' && store.me && !FREE.includes(route())) store.patch((p) => { (p.usage ||= {})[today()] = (p.usage[today()] || 0) + 1; });
    check();
  }, 60e3);
  window.addEventListener('hashchange', check);
  check();
}
