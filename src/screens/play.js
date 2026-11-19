// «العب»: باب واحد لكل نشاطات الأسئلة، بثلاثة أزرار واضحة
import { h, owl } from '../ui.js';
import { store } from '../store.js';
import { dueReviews, goldEligible } from '../mastery.js';
import { sfx } from '../sfx.js';

export function playScreen(root, { go }) {
  const me = store.me;
  const due = dueReviews(me).length;
  const ready = Object.keys(me.stamps || {}).filter((id) => goldEligible(me, id)).length;
  const card = (k, e, t, s, c, badge) => h('button', { class: 'play-card', style: { '--c': c }, onclick: () => { sfx('tap'); go(k); } },
    badge ? h('span', { class: 'badge-dot' }, badge) : null, h('span', { class: 'pe' }, e), h('span', { class: 'tt' }, h('b', {}, t), h('small', {}, s)));
  root.append(owl('ماذا نلعب اليوم؟'),
    card('world', '🥇', 'اجمع الأختام الذهبية', due ? `حان وقت مراجعة ${due.toLocaleString('ar-EG')} من الدول` : ready ? `${ready.toLocaleString('ar-EG')} من الدول التي زرتها تنتظر ختمها الذهبي` : 'عشرة أسئلة من الدول التي زرتها ومن العالم', '#e5484d', due ? due.toLocaleString('ar-EG') : null),
    card('games', '🎯', 'تمرّن وحدك', 'أعلام، عواصم، خريطة، ذاكرة', '#8e44ad'),
    card('family', '👨‍👩‍👧‍👦', 'العبوا معاً', 'مسابقة بالدور مع الإخوة والأهل', '#7b5cd6'));
}
