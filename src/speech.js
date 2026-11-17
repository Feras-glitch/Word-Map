// النطق: على أندرويد نستخدم محرك الجهاز عبر إضافة Capacitor، وفي المتصفح وويندوز نستخدم Web Speech.
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { store } from './store.js';
import { toast } from './ui.js';

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
export async function speak(text, lang = 'ar-SA', fallbackAr = null) {
  if (!text) return;
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

export function stopSpeech() {
  if (native) TextToSpeech.stop().catch(() => {});
  else window.speechSynthesis?.cancel();
}

export const LANG = { ar: 'ar-SA', en: 'en-US', zh: 'zh-CN' };
