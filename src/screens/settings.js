import { h } from '../ui.js';
import { store } from '../store.js';
import { LEVELS } from '../data.js';
import { speak } from '../speech.js';

export function settingsScreen(root, { go }) {
  const me = store.me;
  const s = store.settings;
  const sound = h('input', { type: 'checkbox', checked: s.sound !== false, onchange: (e) => store.setSetting('sound', e.target.checked) });
  const rate = h('input', { type: 'range', min: 0.6, max: 1.2, step: 0.1, value: s.rate || 0.9, onchange: (e) => { store.setSetting('rate', +e.target.value); speak('هذه سرعة الكلام', 'ar-SA'); } });
  root.append(
    h('div', { class: 'panel' },
      h('h3', {}, me.avatar + ' ' + me.name),
      h('p', {}, 'المستوى: ' + LEVELS[me.level].emoji + ' ' + LEVELS[me.level].name),
      h('div', { class: 'row' }, h('button', { class: 'btn soft', onclick: () => go('profiles') }, '👥 تبديل المستكشف'),
        h('button', { class: 'btn', onclick: () => go('parent') }, '🔒 لوحة الوالدين'))),

    h('div', { class: 'panel' },
      h('label', { class: 'switch' }, sound, ' المؤثرات الصوتية'),
      h('label', {}, '🗣️ سرعة النطق'), rate,
      h('button', { class: 'btn soft small', onclick: () => { speak('مرحباً', 'ar-SA'); setTimeout(() => speak('Hello', 'en-US'), 1200); setTimeout(() => speak('你好', 'zh-CN'), 2400); } }, '🔊 جرّب الأصوات الثلاثة'),
      h('p', { class: 'hint' }, 'إن لم تسمع الصوت الصيني أو العربي: ثبّت حزمة الصوت من إعدادات الجهاز ← اللغة ← تحويل النص إلى كلام.')),
    h('p', { class: 'hint center' }, 'مستكشف العالم · يعمل بلا إنترنت · الإصدار ١٫٤'),
    h('p', { class: 'hint center', dir: 'ltr' }, 'Data: mledoze/countries (ODbL) · Map: Natural Earth · Flags: flag-icons (MIT) · Font: Cairo (OFL)'),
  );
}
