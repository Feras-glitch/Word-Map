// قفل الوالدين: رقم سري من ٤ أرقام. يُفتح لمدة ١٠ دقائق.
import { h, modal, toast } from './ui.js';
import { store, pinHash } from './store.js';
import { cnt } from './arnum.js';

let openUntil = 0;
let fails = 0, blockedUntil = 0;
const ar = (n) => n.toLocaleString('ar-EG');

let resetVia = null;
export function parentLock(onOpen, onCancel, gated = false) {
  let ok = false;
  if (Date.now() < openUntil) return onOpen();
  const setting = !store.parent.pinHash;
  // أول مرة: سؤال حساب للكبار قبل اختيار الرقم، حتى لا يختاره أحد الأولاد
  if (setting && !gated) return mathGate('قبل اختيار الرقم السري', () => parentLock(onOpen, onCancel, true), onCancel);
  let first = null, entry = '';
  const title = h('h3', {}, setting ? '🔒 اختر رقماً سرياً للوالدين' : '🔒 لوحة الوالدين');
  const sub = h('p', { class: 'hint' }, setting ? 'أربعة أرقام لا يعرفها الأولاد. ستحتاجها لفتح هذه اللوحة.' : 'أدخل الرقم السري');
  const dots = h('div', { class: 'pin-dots' });
  const draw = () => dots.replaceChildren(...[0, 1, 2, 3].map((i) => h('i', { class: i < entry.length ? 'on' : '' })));
  draw();
  const m = modal(h('div', { class: 'lock' }, title, sub, dots,
    h('div', { class: 'keypad', dir: 'ltr' }, [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => h('button', { class: 'key', onclick: () => press(k) }, typeof k === 'number' ? ar(k) : k))),
    setting ? null : h('button', { class: 'btn small soft', onclick: () => forgot() }, 'نسيت الرقم؟')), { cls: 'lock-modal', onClose: () => { if (!ok) setTimeout(() => onCancel?.(), 0); } });

  function press(k) {
    if (k === '⌫') entry = entry.slice(0, -1);
    else if (k === '✓') return submit();
    else if (entry.length < 4) entry += k;
    draw();
    if (entry.length === 4) setTimeout(submit, 120);
  }
  function submit() {
    if (entry.length < 4) return;
    if (setting) {
      if (!first) { first = entry; entry = ''; sub.textContent = 'أعد إدخال الرقم للتأكيد'; return draw(); }
      if (first !== entry) { first = null; entry = ''; sub.textContent = 'الرقمان مختلفان. اختر رقماً من جديد'; return draw(); }
      const was = store.parent.pinChange?.via;
      store.setParent({ pinHash: pinHash(entry), pinChange: { at: new Date().toISOString(), via: resetVia || (was ? 'change' : 'set') } });
      toast('حُفظ الرقم السري');
      // سؤال سري يكتبه الوالد: هو طريق استرجاع الرقم، بدل سؤال الحساب الذي يحله طفل بالآلة الحاسبة
      if (!store.parent.recHash) { ok = true; m.close(); setTimeout(() => secretSetup(onOpen), 260); openUntil = Date.now() + 10 * 60e3; return; }
    } else if (Date.now() < blockedUntil) {
      entry = ''; draw(); sub.textContent = `محاولات كثيرة. انتظر ${cnt(Math.ceil((blockedUntil - Date.now()) / 1000), 'ثانية واحدة', 'ثانيتين', 'ثوانٍ', 'ثانية')}`;
      return;
    } else if (pinHash(entry) !== store.parent.pinHash) {
      entry = ''; draw(); dots.classList.add('shake'); setTimeout(() => dots.classList.remove('shake'), 500);
      // بعد خمس محاولات خاطئة: انتظار دقيقة، ويتضاعف مع تكرار التجريب
      if (++fails % 5 === 0) { blockedUntil = Date.now() + 60e3 * 2 ** (fails / 5 - 1); sub.textContent = 'محاولات كثيرة. انتظر قليلاً ثم حاول'; }
      return;
    }
    fails = 0;
    openUntil = Date.now() + 10 * 60e3;
    ok = true;
    m.close(); setTimeout(onOpen, 260);
  }
  // نسيان الرقم: سؤال الحساب نفسه، ثم يُختار رقم جديد
  // نسيان الرقم: السؤال السري الذي كتبه الوالد، ويبقى أثر التغيير ظاهراً في اللوحة
  function forgot() {
    ok = true; m.close();
    const reset = () => { store.setParent({ pinHash: null }); resetVia = 'forgot'; parentLock(() => { resetVia = null; onOpen(); }, onCancel, true); };
    setTimeout(() => (store.parent.recHash ? secretGate(reset, onCancel) : mathGate('لاختيار رقم سري جديد', reset, onCancel)), 260);
  }
}

// ضرب عدد من ثلاثة أرقام في عدد من رقمين: سهل على الكبار بالآلة الحاسبة، وثقيل على الأطفال.
// وبعد خطأين ينتظر السائل خمس دقائق.
let gateFails = 0, gateBlocked = 0;
function mathGate(why, onPass, onCancel) {
  let passed = false;
  const a = 123 + Math.floor(Math.random() * 860), b = 13 + Math.floor(Math.random() * 80);
  const inp = h('input', { type: 'number', inputmode: 'numeric', class: 'pin-ans' });
  const msg = h('p', { class: 'hint' }, 'للتأكد أنك أحد الوالدين ' + why + '. يمكنك استعمال الآلة الحاسبة.');
  const box = h('div', { class: 'lock' }, h('h3', {}, '🔒 سؤال للوالدين'), msg, h('p', {}, `كم حاصل ضرب ${ar(a)} × ${ar(b)}؟`), inp,
    h('button', { class: 'btn big', onclick: () => {
      if (Date.now() < gateBlocked) { toast('انتظر بضع دقائق ثم حاول'); return; }
      const v = +String(inp.value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      if (v === a * b) { gateFails = 0; passed = true; f.close(); setTimeout(onPass, 260); }
      else { inp.value = ''; toast('الإجابة غير صحيحة'); if (++gateFails >= 2) { gateFails = 0; gateBlocked = Date.now() + 5 * 60e3; } }
    } }, 'تأكيد'));
  const f = modal(box, { cls: 'lock-modal', onClose: () => { if (!passed) setTimeout(() => onCancel?.(), 0); } });
}
export const lockNow = () => { openUntil = 0; };

// السؤال السري: سؤال وجواب يكتبهما الوالد، والجواب يُحفظ مُجزّأً لا نصاً
const normAns = (t) => String(t || '').trim().toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ');
const SUGGEST = ['ما اسم مدرستك الابتدائية؟', 'ما اسم أول مدينة عشت فيها؟', 'ما الطعام الذي لا تحبه أبداً؟'];
function secretSetup(onDone) {
  let saved = false;
  const q = h('input', { class: 'pin-ans text', placeholder: 'اكتب سؤالاً لا يعرف الأولاد جوابه', value: SUGGEST[0] });
  const a = h('input', { class: 'pin-ans text', placeholder: 'الجواب' });
  const box = h('div', { class: 'lock' }, h('h3', {}, '🔑 سؤال الاسترجاع'),
    h('p', { class: 'hint' }, 'إن نسيت الرقم السري ستجيب عن هذا السؤال لتختار رقماً جديداً. اختر سؤالاً جوابه عندك وحدك.'),
    h('div', { class: 'chips-row' }, SUGGEST.map((t) => h('button', { class: 'chip', onclick: () => { q.value = t; } }, t))),
    q, a,
    h('button', { class: 'btn big', onclick: () => {
      if (q.value.trim().length < 4 || normAns(a.value).length < 2) { toast('اكتب السؤال والجواب'); return; }
      store.setParent({ recQ: q.value.trim(), recHash: pinHash('rec:' + normAns(a.value)) }); saved = true; toast('حُفظ سؤال الاسترجاع'); f.close();
    } }, 'حفظ'));
  const f = modal(box, { cls: 'lock-modal', onClose: () => { if (!saved) toast('يمكنك إضافة سؤال الاسترجاع لاحقاً من لوحة الوالدين'); setTimeout(onDone, 260); } });
}
export const editSecret = (onDone) => secretSetup(onDone || (() => {}));
let secFails = 0, secBlocked = 0;
function secretGate(onPass, onCancel) {
  let passed = false;
  const a = h('input', { class: 'pin-ans text', placeholder: 'الجواب' });
  const box = h('div', { class: 'lock' }, h('h3', {}, '🔑 سؤال الاسترجاع'), h('p', {}, store.parent.recQ || ''), a,
    h('button', { class: 'btn big', onclick: () => {
      if (Date.now() < secBlocked) { toast('محاولات كثيرة. انتظر بضع دقائق'); return; }
      if (pinHash('rec:' + normAns(a.value)) === store.parent.recHash) { secFails = 0; passed = true; f.close(); setTimeout(onPass, 260); }
      else { a.value = ''; toast('الجواب غير صحيح'); if (++secFails >= 3) { secFails = 0; secBlocked = Date.now() + 10 * 60e3; } }
    } }, 'تأكيد'));
  const f = modal(box, { cls: 'lock-modal', onClose: () => { if (!passed) setTimeout(() => onCancel?.(), 0); } });
}
