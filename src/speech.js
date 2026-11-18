// النطق: على أندرويد نستخدم محرك الجهاز عبر إضافة Capacitor، وفي المتصفح وويندوز نستخدم Web Speech.
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { store } from './store.js';
import { toast } from './ui.js';
import { playRecorded, stopClip } from './voice.js';
import TASHKEEL from '../content/tashkeel.json';
import TEXTS from '../content/tashkeel-text.json';

// قاموس التشكيل: نعطي القارئ الآلي الأسماء العربية مشكولة حتى ينطقها صحيحة (مثل «عُمان» لا «عَمّان»)
// لا يُستعمل القاموس قبل أن يراجعه مراجع مستقل
const LEX = TASHKEEL.review === 'pending' ? [] : Object.entries(TASHKEEL.words || {}).sort((a, b) => b[0].length - a[0].length);
// النصوص الكاملة المشكولة (المعالم والمعلومات) تُعطى للقارئ الآلي كما هي إن طابقت
const FULL = TEXTS.review === 'pending' ? {} : (TEXTS.texts || {});
export function withTashkeel(text) {
  if (FULL[text]) return FULL[text];
  let t = text;
  for (const [plain, v] of Object.entries(FULL)) if (plain.length > 12 && t.includes(plain)) t = t.split(plain).join(v);
  for (const [plain, voc] of LEX) if (t.includes(plain)) t = t.replace(new RegExp('(^|[^\\u0621-\\u064A])' + plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^\\u0621-\\u064A])', 'g'), '$1' + voc);
  return t;
}

const native = Capacitor.isNativePlatform();
let voices = [];
function loadVoices() { try { voices = window.speechSynthesis?.getVoices() || []; } catch { voices = []; } }
if (!native && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function findVoice(lang) {
  if (!voices.length) loadVoices();
  const l = lang.toLowerCase();
  const base = l.split('-')[0];
  const cands = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === l)
    .concat(voices.filter((v) => v.lang.toLowerCase().startsWith(base)));
  // تفضيل الأصوات الطبيعية إن وُجدت
  return cands.find((v) => /natural|neural|online/i.test(v.name)) || cands[0] || null;
}

const warned = new Set();
// fallbackAr: نطق تقريبي بالحروف العربية يُقرأ بالصوت العربي إن لم يوجد صوت للغة
// text: نص، أو قائمة أجزاء تُشغَّل تسجيلاتها متتابعة (مثل ['ما عاصمة', 'مصر'])
let seq = 0;
export async function speak(text, lang = 'ar-SA', fallbackAr = null) {
  if (!text || (Array.isArray(text) && !text.length)) return;
  const my = ++seq;
  const parts = Array.isArray(text) ? text : [text];
  text = parts.join(' ');
  stopNow();
  // ١) التسجيلات: الأجزاء كلها، أو الجملة كاملة
  if (await playRecorded(parts, lang)) return;
  if (parts.length > 1 && await playRecorded([text], lang)) return;
  if (my !== seq) return; // طلب أحدث بدأ أثناء البحث
  // ٢) القراءة الآلية، مع التشكيل للعربية
  if (lang.startsWith('ar')) text = withTashkeel(text);
  const rate = store.settings.rate || 0.9;
  if (native) {
    try {
      if (fallbackAr) {
        const { supported } = await TextToSpeech.isLanguageSupported({ lang }).catch(() => ({ supported: true }));
        if (!supported) { toast('🔈 نطق تقريبي: لا يوجد صوت لهذه اللغة على الجهاز'); return speak(fallbackAr, 'ar-SA'); }
      }
      await TextToSpeech.stop();
      await TextToSpeech.speak({ text, lang, rate, pitch: 1.05, volume: 1, category: 'playback' });
    } catch {
      if (fallbackAr) { toast('🔈 نطق تقريبي: لا يوجد صوت لهذه اللغة على الجهاز'); return speak(fallbackAr, 'ar-SA'); }
      if (!warned.has(lang)) { warned.add(lang); toast('لا يوجد صوت لهذه اللغة على الجهاز. يمكن تثبيته من إعدادات "تحويل النص إلى كلام".'); }
    }
    return;
  }
  if (!('speechSynthesis' in window)) { toast('هذا المتصفح لا يدعم النطق'); return; }
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = rate; u.pitch = 1.05;
  const v = findVoice(lang);
  if (!v && fallbackAr && voices.length) { toast('🔈 نطق تقريبي: لا يوجد صوت لهذه اللغة على الجهاز'); return speak(fallbackAr, 'ar-SA'); }
  if (v) u.voice = v;
  else if (voices.length && !warned.has(lang)) { warned.add(lang); toast('قد لا يتوفر صوت لهذه اللغة على هذا الجهاز'); }
  s.speak(u);
}

function stopNow() {
  stopClip();
  if (native) TextToSpeech.stop().catch(() => {});
  else try { window.speechSynthesis?.cancel(); } catch { /* */ }
}
export function stopSpeech() {
  seq++; stopClip();
  if (native) TextToSpeech.stop().catch(() => {});
  else window.speechSynthesis?.cancel();
}

export const LANG = { ar: 'ar-SA', en: 'en-US', zh: 'zh-CN' };
