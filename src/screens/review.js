import { h, owl } from '../ui.js';
import { byId, flagUrl } from '../data.js';
import { dueReviews, reviewResult, weakest } from '../mastery.js';
import { reviewQuiz, buildSet, runQuiz } from '../quiz.js';
import { store } from '../store.js';

export function reviewScreen(root, { go }) {
  const draw = () => {
    root.innerHTML = '';
    const due = dueReviews();
    const weak = weakest(8).filter((id) => !due.includes(id));
    root.append(owl(due.length ? `حان وقت مراجعة ${due.length.toLocaleString('ar-EG')} من الدول التي أتقنتها. هيا نتأكد أنك ما زلت تتذكرها!` : 'لا توجد مراجعات مستحقة اليوم. أحسنت! يمكنك تدريب نفسك على الدول التي تخطئ فيها.'));
    if (due.length) {
      root.append(h('h3', {}, '🔔 مراجعات اليوم'), h('div', { class: 'review-list' }, due.map((id) => {
        const c = byId[id];
        return h('button', { class: 'review-item', onclick: () => reviewQuiz(c, { onResult: (pass) => reviewResult(id, pass), onClose: draw }) }, h('img', { src: flagUrl(c.f), alt: '' }), c.ar, h('small', {}, 'ابدأ المراجعة ←'));
      })));
    }
    if (weak.length) {
      root.append(h('h3', {}, '🎯 تدرّب على ما تخطئ فيه'), h('div', { class: 'review-list' }, weak.map((id) => {
        const c = byId[id];
        const lvl = store.me?.level || 2; const n = lvl === 1 ? 3 : 4;
        return h('button', { class: 'review-item', onclick: () => runQuiz({ title: '🎯 تدريب: ' + c.ar, country: c, questions: buildSet(c, ['flag', 'capital', 'continent'], n), onClose: draw, onDone: (_s, _r, box, m) => box.append(h('div', { class: 'quiz-end' }, h('button', { class: 'btn big', onclick: () => m.close() }, 'متابعة'))) }) },
          h('img', { src: flagUrl(c.f), alt: '' }), c.ar, h('small', {}, 'تدريب ←'));
      })));
    }
    if (!due.length && !weak.length) root.append(h('p', { class: 'empty' }, 'اجمع أختاماً ذهبية، وسنذكّرك بمراجعتها بعد ٣ أيام ثم أسبوع ثم شهر.'), h('button', { class: 'btn big', onclick: () => go('explore') }, '🗺️ إلى الخريطة'));
  };
  draw();
}
