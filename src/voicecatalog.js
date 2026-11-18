// فهرس ما ينطقه التطبيق: منه تُبنى قوائم الاستوديوهات. المفتاح = اللغة + النص (انظر voice.js).
import { states, continents3, languages } from './data.js';
import { NAT } from './map.js';
import { keyOf, langOf } from './voice.js';
import TASHKEEL from '../content/tashkeel.json';
import TEXTS from '../content/tashkeel-text.json';

// عبارات ثابتة تُركَّب منها الأسئلة والتشجيع
export const PHRASES = [
  'أحسنت!', 'رائع!', 'صحيح!', 'ليست هذه', 'أيّ هذه الأعلام علم', 'ما عاصمة', 'في أي قارة تقع', 'أيّ هذه من أشهر معالم', 'لأي دولة هذا العلم؟',
  'عاصمة أي دولة؟', 'في أي دولة؟', 'المس', 'على الخريطة', 'ما اسم', 'بالإنجليزية؟', 'بالصينية؟', 'قارة', 'عاصمة', 'هي', 'نظام الحكم في',
  'من معالم', 'الشهيرة', 'هل تعلم؟', 'أهلاً بك في مستكشف العالم', 'هيا نستكشف العالم', 'مبارك! نلت ختماً ذهبياً جديداً', 'أحسنتم جميعاً',
];
const LANGS = { ar: 'ar-SA', en: 'en-US', zh: 'zh-CN' };
// النص المشكول لمن يسجّل: الأسماء من قاموس الكلمات، والعبارات والمعلومات الطويلة من قاموس النصوص
const voc = (t) => (TASHKEEL.words || {})[t] || (TEXTS.review === 'pending' ? '' : (TEXTS.texts || {})[t]) || '';
const item = (group, text, lang, extra = {}) => text ? { group, text, lang, key: keyOf(text, lang), voc: langOf(lang) === 'ar' ? voc(text) : '', ...extra } : null;

export const GROUPS = {
  phrases: '💬 عبارات الأسئلة والتشجيع', names: '🏳️ أسماء الدول', capitals: '🏛️ العواصم', greetings: '👋 التحيات', continents: '🌍 القارات',
  landmarks: '⭐ المعالم', facts: '💡 هل تعلم؟', nature: '⛰️ الأنهار والجبال',
};
// childOnly: ما يناسب الطفل تسجيله (قصير: الأسماء والعواصم بالعربية والتشجيع والتحيات)
export function catalog({ child = false } = {}) {
  const out = [];
  const tri = (group, o, sub, langs = ['ar', 'en', 'zh']) => { for (const l of langs) out.push(item(group, o?.[l], LANGS[l], { sub })); };
  for (const p of PHRASES) out.push(item('phrases', p, LANGS.ar));
  if (!child) for (const k of Object.keys(continents3)) tri('continents', continents3[k], '');
  for (const c of states) tri('names', { ar: c.ar, en: c.en, zh: c.zh }, c.ar, child ? ['ar'] : ['ar', 'en', 'zh']);
  for (const c of states) if (c.cap3) tri('capitals', c.cap3, c.ar, child ? ['ar'] : ['ar', 'en', 'zh']);
  const seen = new Set();
  for (const [code, L] of Object.entries(languages)) {
    const g = L.greet; if (!g?.t || seen.has(g.tts + g.t)) continue; seen.add(g.tts + g.t);
    out.push(item('greetings', g.t, g.tts || code, { sub: L.ar, hint: g.tr, meaning: g.meaning }));
  }
  if (!child) {
    for (const c of states) if (c.lm3) tri('landmarks', c.lm3, c.ar);
    for (const c of states) if (c.fact) out.push(item('facts', c.fact, LANGS.ar, { sub: c.ar }));
    for (const it of NAT.items) { tri('nature', it, ''); out.push(item('nature', it.fact, LANGS.ar, { sub: it.ar })); }
  }
  const uniq = new Map();
  for (const x of out.filter(Boolean)) if (!uniq.has(x.key)) uniq.set(x.key, x);
  return [...uniq.values()];
}
