// قفل الوالدين: رقم سري من ٤ أرقام. يُفتح لمدة ١٠ دقائق.
import { h, modal, toast } from './ui.js';
import { store, pinHash } from './store.js';

let openUntil = 0;
let fails = 0, blockedUntil = 0;
const ar = (n) => n.toLocaleString('ar-EG');

export function parentLock(onOpen, onCancel) {
  let ok = false;
  if (Date.now() < openUntil) return onOpen();
  const setting = !store.parent.pinHash;
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
      store.setParent({ pinHash: pinHash(entry) });
      toast('حُفظ الرقم السري');
    } else if (Date.now() < blockedUntil) {
      entry = ''; draw(); sub.textContent = `محاولات كثيرة. انتظر ${ar(Math.ceil((blockedUntil - Date.now()) / 1000))} ثانية`;
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
  // سؤال حساب لا يحله الصغار بسهولة، يسمح بتعيين رقم جديد
  function forgot() {
    const a = 13 + Math.floor(Math.random() * 25), b = 12 + Math.floor(Math.random() * 18);
    const inp = h('input', { type: 'number', inputmode: 'numeric', class: 'pin-ans' });
    const box = h('div', { class: 'lock' }, h('h3', {}, 'سؤال للوالدين'), h('p', {}, `كم حاصل ضرب ${ar(a)} × ${ar(b)}؟`), inp,
      h('button', { class: 'btn big', onclick: () => {
        const v = +String(inp.value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        if (v === a * b) { store.setParent({ pinHash: null }); ok = true; f.close(); m.close(); setTimeout(() => parentLock(onOpen), 300); }
        else { inp.value = ''; toast('الإجابة غير صحيحة'); }
      } }, 'تأكيد'));
    const f = modal(box, { cls: 'lock-modal' });
  }
}
export const lockNow = () => { openUntil = 0; };
