import { h, owl } from '../ui.js';
import { store } from '../store.js';
import { LEVELS } from '../data.js';
import { speak } from '../speech.js';
import { sfx } from '../sfx.js';
import { placementTest } from '../quiz.js';
import { stampsWord } from '../arnum.js';
import { limitFor } from '../timelimit.js';
import { parentLock } from '../lock.js';

const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐧', '🦄', '🐢', '🐬', '🦉', '🐫', '🦋'];

export function profilesScreen(root, { go }) {
  const list = h('div', { class: 'profile-list' });
  const draw = () => {
    list.innerHTML = '';
    for (const p of store.profiles) {
      list.append(h('button', { class: 'profile-card', onclick: () => { sfx('tap'); store.switchTo(p.id); go('home', { replace: true }); } },
        h('span', { class: 'av' }, p.avatar), h('b', {}, p.name),
        h('small', {}, LEVELS[p.level].emoji + ' ' + LEVELS[p.level].name + ' · ' + stampsWord(Object.keys(p.stamps).length))));
    }
    list.append(h('button', { class: 'profile-card add', onclick: () => (limitFor() ? parentLock(() => newProfile(root, go)) : newProfile(root, go)) }, h('span', { class: 'av' }, '➕'), h('b', {}, 'مستكشف جديد')));
  };
  draw();
  root.append(
    owl(store.profiles.length ? 'أهلاً بك! من سيستكشف العالم اليوم؟' : 'مرحباً! أنا بومة المستكشفين. لنصنع جواز سفرك أولاً!', { size: 96 }),
    list,
    // للوالدين من الشاشة الأولى: الرقم السري، ووقت اللعب، واستعادة نسخة احتياطية على جهاز جديد
    h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } }, h('button', { class: 'btn small soft', onclick: () => go('parent') }, '🔒 للوالدين: الإعدادات والنسخة الاحتياطية')),
  );
  if (!store.profiles.length) newProfile(root, go);
}

function newProfile(root, go) {
  let avatar = AVATARS[0], level = 2, gender = null;
  const name = h('input', { class: 'input', placeholder: 'اكتب اسمك هنا', maxlength: 16 });
  const avs = h('div', { class: 'avatars' }, AVATARS.map((a) => h('button', { class: 'av-btn' + (a === avatar ? ' on' : ''), onclick: (e) => {
    avatar = a; avs.querySelectorAll('.av-btn').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); sfx('tap');
  } }, a)));
  // ولد أم بنت: لتخاطب البومة كل طفل بصيغته
  const gd = h('div', { class: 'levels gender' }, [['m', '👦', 'ولد'], ['f', '👧', 'بنت']].map(([k, e, t]) => h('button', { class: 'lv-btn', onclick: (ev) => {
    gender = k; gd.querySelectorAll('.lv-btn').forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); gd.classList.remove('shake'); sfx('tap');
  } }, h('span', {}, e), h('b', {}, t))));
  const lv = h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, L]) => h('button', { class: 'lv-btn' + (+k === level ? ' on' : ''), onclick: (e) => {
    level = +k; lv.querySelectorAll('.lv-btn').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); sfx('tap');
  } }, h('span', {}, L.emoji), h('b', {}, L.name), h('small', {}, L.ages))));
  const form = h('div', { class: 'panel new-profile' },
    h('h2', {}, '✨ مستكشف جديد'),
    h('label', {}, 'ما اسمك؟'), name,
    h('label', {}, 'ولد أم بنت؟'), gd,
    h('label', {}, 'اختر صورتك'), avs,
    h('label', {}, 'اختر مستواك'), lv,
    h('button', { class: 'btn big', onclick: () => create(false) }, 'هيا نبدأ! 🚀'),
    h('button', { class: 'btn big soft', onclick: () => create(true) }, '🧭 اختبر مستواي أولاً (١٠ أسئلة)'),
  );
  function create(test) {
    const n = name.value.trim();
    if (!n) { name.focus(); name.classList.add('shake'); setTimeout(() => name.classList.remove('shake'), 500); return; }
    if (!gender) { gd.classList.add('shake'); gd.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => gd.classList.remove('shake'), 500); return; }
    const p = store.addProfile({ name: n, avatar, level, gender });
    sfx('win');
    if (test) placementTest((lv) => { store.updateProfile(p.id, { level: lv, placement: lv }); go('home', { replace: true }); }, () => go('home', { replace: true }));
    else { speak(`أهلاً يا ${n}! هيا نستكشف العالم`, 'ar-SA'); go('home', { replace: true }); }
  }
  root.querySelector('.new-profile')?.remove();
  root.append(form);
  form.scrollIntoView({ behavior: 'smooth' });
}
