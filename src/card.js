// بطاقة الدولة: أربعة أقسام (الأسماء، العاصمة والمعالم، اللغات، أرقام)، وثلاثة مبسطة للمستوى الصغير
import { h, modal, confetti, toast } from './ui.js';
import { byId, flagUrl, continents, continents3, greetings, languages, num, contEmoji, states } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { store } from './store.js';
import { fem } from './gender.js';
import { miniMap } from './minimap.js';
import { journeyState } from './journeys.js';
import { conceptBtn } from './concepts.js';
import { landmarkIcon } from './landmarks.js';
import { times, bigNum, cnt, gC } from './arnum.js';
import { landmarkPhoto, secondPhoto, KIND } from './photos.js';
import FLAGSYM from '../content/flag-symbols.json';
import { goldProgress, goldEligible, OTHER_NEEDED } from './mastery.js';
import { requiredFor } from './screens/world.js';
import { hasVisit, hasGold, giveVisit, visitWait, visitFailed, dueReviews } from './mastery.js';
import { visitQuestion } from './quiz.js';

const say = (text, lang, fb) => h('button', { class: 'say', 'aria-label': 'استمع', onclick: (e) => { e.stopPropagation(); speak(text, lang, fb); } }, '🔊');

// كل حرف صيني وفوقه نطقه (البينين) كما في كتب الأطفال
export function zhRuby(zh, py) {
  const chars = [...zh]; const sy = (py || '').split(' ');
  const r = h('b', { class: 'zh-ruby', lang: 'zh' });
  chars.forEach((ch, i) => r.append(h('ruby', {}, ch, h('rt', {}, sy.length === chars.length ? sy[i] : ''))));
  if (sy.length !== chars.length && py) r.append(h('small', { class: 'py-line' }, py));
  return r;
}

// اسم بثلاث لغات، كل سطر بزر نطق
// prefix: نص قبل الاسم، أو قائمة أجزاء (تُشغَّل تسجيلاتها متتابعة إن وُجدت)
export function tri(o, { big = false, prefix = '' } = {}) {
  const arParts = Array.isArray(prefix) ? [...prefix, o.ar] : prefix ? [prefix.trim(), o.ar] : [o.ar];
  return h('div', { class: 'tri' + (big ? ' big' : '') },
    h('div', { class: 'name-row ar' }, h('span', { class: 'lang-tag' }, 'عربي'), h('b', {}, o.ar), say(arParts, LANG.ar)),
    o.en ? h('div', { class: 'name-row en', dir: 'ltr' }, h('span', { class: 'lang-tag' }, 'EN'), h('b', {}, o.en), say(o.en, LANG.en)) : null,
    o.zh ? h('div', { class: 'name-row zh', dir: 'ltr' }, h('span', { class: 'lang-tag' }, '中文'), zhRuby(o.zh, o.py), say(o.zh, LANG.zh)) : null);
}
const langName = (l) => h('span', { class: 'lname' }, h('b', {}, l.ar), h('small', { dir: 'ltr' }, l.en, ' · ', h('span', { lang: 'zh' }, l.zh), l.py ? ` (${l.py})` : ''));

function popText(c) {
  if (!c.pop) return null;
  const p = c.pop;
  const n = p >= 1e9 ? bigNum(Math.round(p / 1e8) / 10, 'b')
    : p >= 1e6 ? bigNum(p >= 1e7 ? Math.round(p / 1e6) : Math.round(p / 1e5) / 10, 'm')
    : p >= 1500 ? bigNum(Math.round(p / 1e3), 'k') : roundNice(p).toLocaleString('ar-EG');
  let cmp = '';
  const eg = byId.EGY?.pop;
  if (eg && c.id !== 'EGY') {
    const r = p / eg;
    const k = roundNice(1 / r);
    cmp = r >= 1.5 ? `أي أكثر من سكان مصر بنحو ${times(Math.round(r))}`
      : r >= 1.15 ? 'أكثر من سكان مصر قليلاً'
      : r >= 0.87 ? 'قريب من عدد سكان مصر'
      : r >= 0.7 ? 'نحو ثلاثة أرباع سكان مصر'
      : r >= 0.55 ? 'نحو ثلثي سكان مصر'
      : r >= 0.42 ? 'نحو نصف سكان مصر'
      : r >= 0.3 ? 'نحو ثلث سكان مصر'
      : r >= 0.22 ? 'نحو ربع سكان مصر'
      : `وسكان مصر أكثر من${gC(c, 'ها', 'ه')} بنحو ${k >= 1e6 ? bigNum(Math.round(k / 1e5) / 10, 'm') + ' مرة' : times(k)}`;
  }
  return { n: `نحو ${n} نسمة`, cmp };
}

// أجزاء تُشغَّل تسجيلاتها متتابعة إن وُجدت، وإلا تُقرأ آلياً جملةً واحدة
const landmarkSpeech = (c) => (c.landmark ? ['من معالم', c.ar, 'الشهيرة', c.landmark] : []);
const factSpeech = (c) => (c.fact || c.note ? ['هل تعلم؟', c.fact || c.note] : []);

// المساحة مقارنةً بمصر، كما يُقارن عدد السكان
// المقارنة بمساحة مصر: كسور مألوفة للقريب منها، وعدد المرات للبعيد، وملاعب الكرة للدول الدقيقة جداً
const roundNice = (x) => { const p = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
function areaCmp(c) {
  const eg = byId.EGY?.area; if (!eg || !c.area || c.id === 'EGY') return '';
  const r = c.area / eg;
  if (r >= 1.5) return `أي أكبر من مصر بنحو ${times(Math.round(r))}`;
  if (r >= 1.15) return 'أكبر من مصر قليلاً';
  if (r >= 0.87) return 'قريبة من مساحة مصر';
  if (r >= 0.7) return 'نحو ثلاثة أرباع مساحة مصر';
  if (r >= 0.55) return 'نحو ثلثي مساحة مصر';
  if (r >= 0.42) return 'نحو نصف مساحة مصر';
  if (r >= 0.3) return 'نحو ثلث مساحة مصر';
  if (r >= 0.22) return 'نحو ربع مساحة مصر';
  const k = roundNice(1 / r);
  const big = k >= 1e6 ? bigNum(Math.round(k / 1e5) / 10, 'm') + ' مرة' : times(k);
  // ملعب كرة القدم نحو ١٠٥×٦٨ متراً = ٠٫٠٠٧١٤ كم²
  const pitches = c.area < 5 ? `، وتساوي مساحت${gC(c, 'ها', 'ه')} نحو ${cnt(roundNice(c.area / 0.00714), 'ملعب واحد', 'ملعبين', 'ملاعب', 'ملعباً')} لكرة القدم` : '';
  return `ومصر أكبر من${gC(c, 'ها', 'ه')} بنحو ${big}${pitches}`;
}
// اسم بالعربية بارزاً، وبقية اللغات مطوية خلف «بلغات أخرى» (تبقى ظاهرة للمستوى الصغير)
function triFold(o, opts = {}) {
  if (store.me?.level === 1 || (!o.en && !o.zh)) return tri(o, opts);
  const arParts = Array.isArray(opts.prefix) ? [...opts.prefix, o.ar] : opts.prefix ? [opts.prefix.trim(), o.ar] : [o.ar];
  return h('div', { class: 'tri-fold' },
    h('div', { class: 'name-row ar' }, h('span', { class: 'lang-tag' }, 'عربي'), h('b', {}, o.ar), say(arParts, LANG.ar)),
    h('details', { class: 'more-langs' }, h('summary', {}, '🌐 بلغات أخرى'),
      o.en ? h('div', { class: 'name-row en', dir: 'ltr' }, h('span', { class: 'lang-tag' }, 'EN'), h('b', {}, o.en), say(o.en, LANG.en)) : null,
      o.zh ? h('div', { class: 'name-row zh', dir: 'ltr' }, h('span', { class: 'lang-tag' }, '中文'), zhRuby(o.zh, o.py), say(o.zh, LANG.zh)) : null));
}

function namesTab(c) {
  const cont = continents3[c.cont];
  return h('div', {},
    tri({ ar: c.ar, en: c.en, zh: c.zh, py: c.py }, { big: true }),
    c.occNote ? h('div', { class: 'sec occ-note' }, h('span', { class: 'st-label' }, '🕊️ أرض محتلة'), h('p', {}, c.occNote + '.'), say(c.occNote, LANG.ar)) : null,
    // «هل تعلم؟» أمتع ما في البطاقة، فمكانها في أولها
    c.fact || c.note ? h('div', { class: 'didyou big' }, h('span', { class: 'st-label' }, '💡 هل تعلم؟'), h('p', {}, c.fact || c.note), say(factSpeech(c), LANG.ar)) : null,
    cont && c.cont !== 'antarctica' ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, (contEmoji[c.cont] || '🌍') + ' تقع في قارة ', conceptBtn('continent')), triFold(cont, { prefix: 'قارة ' }), c.sub && c.sub !== cont.ar ? h('small', { class: 'muted' }, c.sub) : null, c.contNote ? h('p', { class: 'note' }, '🌐 ' + c.contNote + '.') : null) : null,
  );
}

// صورة المعلم مع اسم صاحبها ورخصتها (شرط الرخص الحرة)
function photoFig(c) {
  const p = landmarkPhoto(c.id); if (!p) return null;
  return h('figure', { class: 'lm-photo' }, h('img', { src: p.url, alt: c.landmark, loading: 'lazy' }),
    h('figcaption', { dir: 'ltr' }, '📷 ', h('a', { href: p.page, target: '_blank', rel: 'noopener' }, p.artist), ' · ' + p.license));
}

function capitalTab(c) {
  const cap = c.cap3 || (c.capAr ? { ar: c.capAr, en: c.capEn } : null);
  return h('div', {},
    cap ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🏛️ العاصمة ', conceptBtn('capital')), tri(cap, { prefix: ['عاصمة', c.ar, 'هي'] }), c.capNote ? h('p', { class: 'note' }, c.capNote) : null) : null,
    c.landmark ? h('div', { class: 'story' },
      h('div', { class: 'landmark' }, h('span', { class: 'st-label' }, '⭐ من معالمها الشهيرة:'),
        photoFig(c),
        h('div', { class: 'lm-row' + (landmarkPhoto(c.id) ? ' has-photo' : '') }, h('span', { class: 'lm-icon', 'aria-hidden': 'true' }, landmarkIcon(c.landmark)), c.lm3 ? triFold(c.lm3) : h('b', {}, c.landmark))),
      h('button', { class: 'btn small soft', onclick: () => speak(landmarkSpeech(c), LANG.ar) }, '🔊 اسمع عن المعلم'),
    ) : null,
    secondFig(c),
  );
}

// الصورة الثانية: حيوان أو طعام أو نبات تشتهر به الدولة
function secondFig(c) {
  const p = secondPhoto(c.id); if (!p) return null;
  const k = KIND[p.kind] || KIND.animal;
  return h('div', { class: 'story second' }, h('span', { class: 'st-label' }, k.icon + ' ' + k.label + ':'),
    h('figure', { class: 'lm-photo' }, h('img', { src: p.url, alt: p.ar, loading: 'lazy' }), h('figcaption', { dir: 'ltr' }, '📷 ', h('a', { href: p.page, target: '_blank', rel: 'noopener' }, p.artist), ' · ' + p.license)),
    h('div', { class: 'lm-row has-photo' }, h('b', {}, p.ar), say(p.ar, LANG.ar)));
}

function greetBox(g) {
  if (!g) return null;
  return h('div', { class: 'greet' },
    h('div', { class: 'gt' }, h('span', {}, '👋'), h('b', { dir: 'auto' }, g.t), say(g.t, g.tts, g.tr)),
    g.t !== g.tr ? h('small', {}, 'تُنطق: ', h('b', {}, g.tr)) : null,
    g.meaning ? h('small', {}, 'معناها: ', g.meaning) : null);
}

function languagesTab(c) {
  if (!c.langs) {
    const g = greetings[c.greet] || greetings.eng;
    return h('div', {}, c.kind === 'state' ? h('div', { class: 'hello' },
      h('span', {}, '👋 قل مرحباً بلغتهم:'), h('b', { dir: 'auto' }, g.t), g.t !== g.ar ? h('small', {}, '(' + g.ar + ')') : null, say(g.t, g.lang, g.ar)) : null,
      h('p', { class: 'note' }, 'تفاصيل اللغات الرسمية لهذه الدولة قادمة في التحديث القادم.'));
  }
  const L = c.langs;
  const ov = L.greetOverride || {};
  const off = (L.official || []).map((k) => [k, languages[k]]).filter(([, l]) => l);
  const reg = (L.regional || []).map((k) => languages[k]).filter(Boolean);
  const wide = (L.widespread || []).map((k) => languages[k]).filter(Boolean);
  const work = (L.working || []).map((k) => languages[k]).filter(Boolean);
  const second = (L.second || []).map((k) => [k, languages[k]]).filter(([, l]) => l);
  const defacto = (L.defacto || []).map((k) => [k, languages[k]]).filter(([, l]) => l);
  const shown = off.filter(([, l]) => !l.sign).length + reg.length + wide.length + second.length + defacto.length + (off.length ? 0 : work.length);
  let others = (L.others || 0) - shown;
  if (others > 20) others = Math.round(others / 10) * 10;
  return h('div', {},
    !off.length && defacto.length ? (L.officialNote ? h('p', { class: 'note' }, L.officialNote) : null) : h('div', { class: 'sec' }, h('span', { class: 'st-label' }, off.length > 1 ? `🗣️ اللغات الرسمية (${off.length.toLocaleString('ar-EG')})` : off.length ? '🗣️ اللغة الرسمية' : '🗣️ اللغات'),
      off.map(([k, l]) => h('div', { class: 'lang-item' }, langName(l), l.sign ? h('small', { class: 'muted' }, '🤟 لغة يتكلمها الصمّ بحركات اليدين') : greetBox(ov[k] || l.greet))),
      L.officialNote ? h('p', { class: 'note' }, L.officialNote) : null),
    defacto.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🗣️ لغة الدولة (بلا نص قانوني)'), defacto.map(([k, l]) => h('div', { class: 'lang-item' }, langName(l), greetBox(ov[k] || l.greet)))) : null,
    second.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '📜 لغة ثانية بنص الدستور'), second.map(([k, l]) => h('div', { class: 'lang-item' }, langName(l), greetBox(ov[k] || l.greet)))) : null,
    work.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🏢 لغات العمل في الحكومة'), work.map((l) => h('div', { class: 'lang-item' }, langName(l), !off.length ? greetBox(l.greet) : null))) : null,
    reg.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '📍 لغات رسمية في بعض المناطق فقط'), h('div', { class: 'lang-chips' }, reg.map(langName)), L.regionalNote ? h('p', { class: 'note' }, L.regionalNote) : null) : null,
    wide.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '💬 لغات محلية متداولة واسعة الانتشار (ليست رسمية)'), h('div', { class: 'lang-chips' }, wide.map(langName)), L.widespreadNote ? h('p', { class: 'note' }, L.widespreadNote) : null) : null,
    others > 0 ? h('p', { class: 'note' }, 'ويتحدث الناس فيها أيضاً ' + (others === 1 ? 'لغة محلية أخرى.' : others === 2 ? 'لغتين محليتين أخريين.' : 'نحو ' + cnt(others, '', '', 'لغات محلية أخرى', 'لغة محلية أخرى', 'لغة محلية أخرى') + '.') + (L.langNote ? ' ' + L.langNote + '.' : '')) : L.langNote ? h('p', { class: 'note' }, L.langNote + '.') : null,
  );
}

// بطاقة المستوى الصغير: لغة البلد وتحيته فقط، بلا تصنيفات
function helloTab(c, openNeighbor) {
  const L = c.langs || {}; const ov = L.greetOverride || {};
  const ks = (L.official?.length ? L.official : L.defacto?.length ? L.defacto : L.working || []).filter((k) => languages[k] && !languages[k].sign).slice(0, 2);
  const neighbors = c.borders.map((b) => byId[b]).filter((n) => n && n.kind === 'state');
  return h('div', {},
    ks.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🗣️ يتكلم أهلها'), ks.map((k) => h('div', { class: 'lang-item' }, langName(languages[k]), greetBox(ov[k] || languages[k].greet)))) : null,
    neighbors.length ? h('div', { class: 'neighbors' }, h('span', {}, '🤝 الجيران: ', conceptBtn('border')),
      neighbors.map((n) => h('button', { class: 'chip', onclick: () => openNeighbor(n.id) }, h('img', { src: flagUrl(n.f), alt: '' }), n.ar))) : null,
    neighbors.length ? nbNote(c) : null);
}

// ملاحظات على الجيران تحتاج شرحاً للطفل
const NB_NOTE = {
  MAR: 'إسبانيا جارة للمغرب لأنها تحتل مدينتي سبتة ومليلية، وهما مدينتان مغربيتان على ساحل المغرب.',
  ESP: 'حدود إسبانيا البرية مع المغرب هي حول سبتة ومليلية، وهما مدينتان مغربيتان تحتلهما إسبانيا.',
};
const nbNote = (c) => (NB_NOTE[c.id] ? h('p', { class: 'note' }, '🕊️ ' + NB_NOTE[c.id]) : null);
function numbersTab(c, openNeighbor) {
  const neighbors = c.borders.map((b) => byId[b]).filter(Boolean);
  const pop = popText(c);
  return h('div', {},
    c.gov?.special ? h('div', { class: 'sec gov occupied' }, h('span', { class: 'st-label' }, '🕊️ الحكم'),
      tri({ ar: c.gov.ar, en: c.gov.en, zh: c.gov.zh, py: c.gov.py }),
      h('p', { class: 'note strong' }, c.gov.note + '.')) :
    c.gov ? h('div', { class: 'sec gov' }, h('span', { class: 'st-label' }, (c.gov.icon || '🏛️') + ' نظام الحكم'),
      triFold({ ar: c.gov.ar, en: c.gov.en, zh: c.gov.zh, py: c.gov.py }, { prefix: ['نظام الحكم في', c.ar] }),
      h('p', { class: 'note' }, c.gov.kid),
      c.gov.note ? h('p', { class: 'note strong' }, c.gov.note + '.') : null,
      c.gov.federal ? h('p', { class: 'note' }, '🧩 دولة اتحادية: تتكون من ولايات أو أقاليم، لكل منها حكومة خاصة بها.') : null) : null,
    h('div', { class: 'facts-grid' },
      c.area ? h('div', { class: 'fact' }, h('span', {}, '📏 المساحة'), h('b', {}, num(c.area) + ' كم²'), areaCmp(c) ? h('small', {}, areaCmp(c)) : null) : null,
      pop ? h('div', { class: 'fact' }, h('span', {}, '👨‍👩‍👧 السكان'), h('b', {}, pop.n), c.popInfo ? h('small', {}, c.popInfo.scope + '، ' + c.popInfo.year) : null, !c.popInfo && c.popYear ? h('small', {}, 'تقدير سنة ' + String(c.popYear).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])) : null, pop.cmp ? h('small', {}, pop.cmp) : null) : null,
      c.kind !== 'state' && c.parent ? h('div', { class: 'fact' }, h('span', {}, '🔗 تتبع'), h('b', {}, c.parent)) : null,
    ),
    c.id === 'PSE' && c.area ? h('p', { class: 'note' }, '📏 المساحة لفلسطين التاريخية كلها، والسكان المذكورون أعلاه للضفة الغربية وقطاع غزة فقط.') : null,
    c.popInfo?.world ? h('div', { class: 'sec pop-world' }, h('span', { class: 'st-label' }, '🌍 ' + c.popInfo.world.title),
      h('ul', {}, c.popInfo.world.lines.map((l) => (Array.isArray(l) ? h('li', {}, h('b', {}, l[0]), h('ul', {}, l[1].map((x) => h('li', {}, x + '.')))) : h('li', {}, l + '.')))),
      c.popInfo.world.note ? h('p', { class: 'note' }, c.popInfo.world.note) : null,
      h('small', { class: 'muted' }, c.popInfo.world.source || '')) : null,
    c.popInfo?.gaza ? h('div', { class: 'sec occ-note' }, h('span', { class: 'st-label' }, '🕊️ ' + c.popInfo.gaza.title), h('p', {}, c.popInfo.gaza.text), say(c.popInfo.gaza.text, LANG.ar)) : null,
    c.cur ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '💰 العملة'), triFold(c.cur),
      c.curNote ? h('p', { class: 'note' }, c.curNote) : null,
      c.curStory ? h('button', { class: 'btn small soft', onclick: () => openStory(c.curStory) }, '📜 ' + c.curStory.title) : null) : null,
    neighbors.length ? h('div', { class: 'neighbors' }, h('span', {}, '🤝 الجيران: ', conceptBtn('border')),
      neighbors.map((n) => h('button', { class: 'chip', onclick: () => openNeighbor(n.id) }, h('img', { src: flagUrl(n.f), alt: '' }), n.ar))) : null,
    neighbors.length ? nbNote(c) : null,
    c.sources?.length ? h('details', { class: 'sources' }, h('summary', {}, '📚 المصادر (للوالدين)'),
      h('ul', {}, c.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title))))) : null,
  );
}

function openStory(st) {
  const all = st.sections.map(([t, p]) => t + '. ' + p).join(' ');
  modal(h('div', { class: 'story-modal' },
    h('h2', {}, '📜 ' + st.title),
    h('button', { class: 'btn small', onclick: () => speak(st.title + '. ' + all, LANG.ar) }, '🔊 استمع إلى القصة'),
    st.sections.map(([t, p]) => h('div', { class: 'story-sec' }, h('h3', {}, t), h('p', {}, p), h('button', { class: 'say', 'aria-label': 'استمع', onclick: () => speak(t + '. ' + p, LANG.ar) }, '🔊')))));
}

export function openCard(id, { sub, onShowOnMap, stamp = true, replace = false, onClose } = {}) {
  const c = byId[id];
  if (!c) return;
  sfx('tap');
  const isState = c.kind === 'state';
  const openNeighbor = (nid) => openCard(nid, { onShowOnMap, stamp, replace: true, onClose });

  // المستوى الصغير: بطاقة مبسطة بلا نظام الحكم ولا الأرقام، وتُسمَع المعلومة تلقائياً
  const simple = isState && store.me?.level === 1;
  const tabs = simple ? [
    ['🌍', 'الأسماء', () => namesTab(c)],
    ['🏛️', 'العاصمة والمعالم', () => capitalTab(c)],
    ['👋', 'اللغة والجيران', () => helloTab(c, openNeighbor)],
  ] : [
    ['🌍', 'الأسماء', () => namesTab(c)],
    ['🏛️', isState ? 'العاصمة والمعالم' : 'معلومات', () => capitalTab(c)],
    ...(isState ? [['🗣️', 'اللغات', () => languagesTab(c)]] : []),
    ['📊', isState ? 'الحكم والأرقام' : 'أرقام', () => numbersTab(c, openNeighbor)],
  ];
  const pane = h('div', { class: 'tab-pane' });
  const bar = h('div', { class: 'tab-bar' });
  const seen = new Set(); let redraw = null;
  const show = (i, quiet) => {
    bar.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
    pane.replaceChildren(tabs[i][2]());
    if (!quiet) sfx('tap');
    const first = !seen.has(i); seen.add(i);
    if (first && i === 1) { redraw?.(); if (simple) setTimeout(() => speak(landmarkSpeech(c), LANG.ar), 400); }
  };
  tabs.forEach(([e, t], i) => bar.append(h('button', { onclick: () => show(i) }, h('span', {}, e), h('small', {}, t))));

  const body = h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('div', { class: 'card-flag' + (isState ? '' : ' terr') }, h('img', { src: flagUrl(c.f), alt: 'علم ' + c.ar, onclick: () => modal(h('div', { class: 'flag-zoom' }, h('img', { src: flagUrl(c.f), alt: 'علم ' + c.ar }), h('h3', {}, 'علم ' + c.ar), FLAGSYM[c.id] ? h('p', { class: 'flag-sym' }, FLAGSYM[c.id], ' ', say(FLAGSYM[c.id], LANG.ar)) : '')) }), FLAGSYM[c.id] ? h('small', { class: 'flag-hint' }, '👆 المس العلم لتعرف معناه') : null),
      c.cen || c.bb ? h('button', { class: 'card-map', 'aria-label': 'موقع ' + c.ar + ' على الخريطة', onclick: () => { if (onShowOnMap && c.bb) { m.close(); onShowOnMap(c.id); } } }, miniMap(c.id), h('small', {}, '📍 ' + (continents[c.cont] || ''))) : null),
    sub ? h('div', { class: 'sub-note' }, '📌 ' + sub) : null,
    bar, pane,
    h('div', { class: 'card-actions' },
      onShowOnMap && c.bb ? h('button', { class: 'btn small soft', onclick: () => { m.close(); onShowOnMap(c.id); } }, '📍 أرني على الخريطة') : null,
      isState && store.me ? h('button', { class: 'btn small soft', onclick: () => { m.close(); setTimeout(() => (location.hash = '#compare?a=' + c.id), 250); } }, '⚖️ قارنها بدولة أخرى') : null),
  );
  show(0, true);

  const stampBox = h('div', { class: 'stamp-box' });
  if (isState && store.me) body.insertBefore(stampBox, body.querySelector('.card-actions'));
  const m = modal(body, { cls: 'card-modal', replace, onClose });
  setTimeout(() => speak(c.ar, LANG.ar), 250);

  const showStamp = (gold) => {
    const st = h('div', { class: 'stamp-anim' }, h('div', { class: 'stamp' + (gold ? ' gold' : '') }, h('img', { src: flagUrl(c.f), alt: '' }), h('span', {}, c.ar)),
      h('div', { class: 'stamp-txt' }, gold ? 'ختم ذهبي في جوازك! 🥇' : 'ختم جديد في جوازك!'));
    m.box.append(st); sfx('stamp');
    setTimeout(() => st.classList.add('done'), 1800);
  };
  const drawStamp = () => {
    if (!isState || !store.me) return;
    const visit = hasVisit(c.id), gold = hasGold(c.id), due = dueReviews().includes(c.id);
    stampBox.replaceChildren(...[
      h('div', { class: 'stamp-status' },
        h('span', { class: 'chip-st' + (visit ? ' on' : '') }, visit ? '✅ ختم الزيارة' : '🔒 ختم الزيارة'),
        h('span', { class: 'chip-st gold' + (gold ? ' on' : '') }, gold ? '🥇 الختم الذهبي' : '🔒 الختم الذهبي')),
      // ختم الزيارة بعد زيارة فعلية: يُفتح تبويب العاصمة والمعالم أولاً
      !visit ? (visitWait(c.id) > 0 ? waitNote()
        : !seen.has(1) ? h('button', { class: 'btn big soft', onclick: () => { show(1); bar.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, '🏛️ اقرأ «العاصمة والمعالم» أولاً، ثم خذ الختم')
        : h('button', { class: 'btn big', onclick: () => { let won = false;
          visitQuestion(c, { onPass: () => { won = giveVisit(c.id); }, onFail: () => visitFailed(c.id),
            onClose: () => { drawStamp(); if (won) { showStamp(false); checkContinentBadge(c.cont); checkJourney(c.id); } } }); } }, '🛂 احصل على ختم الزيارة (سؤال واحد)')) : null,
      // الختم الذهبي لا يُمتحن هنا (البطاقة تكشف الجواب)، بل تُجمع أدلته في التمرين الشامل
      visit && !gold ? goldBox() : null,
      gold && due ? h('button', { class: 'btn big', onclick: () => { m.close(); setTimeout(() => (location.hash = '#world'), 250); } }, '🔔 حان وقت مراجعتها') : null,
    ].filter(Boolean));
  };
  // شريط من سطر واحد يتوسع عند اللمس، حتى لا يزاحم محتوى البطاقة
  function goldBox() {
    const p = store.me;
    const req = requiredFor(c);
    const g = goldProgress(p, c.id, req);
    const L = { flag: '🚩', map: '📍', capital: '🏛️' };
    const N = { flag: 'العلم', map: 'الموقع', capital: 'العاصمة' };
    const open = goldEligible(p, c.id);
    const A = (n) => n.toLocaleString('ar-EG');
    return h('details', { class: 'gold-strip' },
      h('summary', {}, h('b', {}, '🥇 أدلة الختم الذهبي'),
        ...g.req.map(([k, v, n, need]) => h('span', { class: 'gs' + (v ? ' on' : ''), title: N[k] }, L[k] + (v ? '✅' : need > 1 ? ` ${A(n)}/${A(need)}` : ' ◻️'))),
        h('span', { class: 'gs' + (g.others >= OTHER_NEEDED ? ' on' : '') }, '➕' + (g.others >= OTHER_NEEDED ? '✅' : ` ${A(Math.min(g.others, OTHER_NEEDED))}/${A(OTHER_NEEDED)}`))),
      h('p', { class: 'note' }, open ? 'أجب صحيحاً عن هذه الدولة في «العب ← اجمع الأختام الذهبية»، في أيام مختلفة، فتمتلئ هذه العلامات.'
        : 'يبدأ شريط الختم الذهبي من الغد. راجع البطاقة اليوم.'),
      open ? h('button', { class: 'btn gold-btn', onclick: () => { m.close(); setTimeout(() => (location.hash = '#world'), 250); } }, '🥇 اجمع الأختام الذهبية') : null);
  }
  // عدّ تنازلي بعد خطأ في سؤال الزيارة
  function waitNote() {
    const el = h('p', { class: 'note wait' });
    const tick = () => {
      if (!el.isConnected && el.dataset.started) return;
      el.dataset.started = 1;
      const ms = visitWait(c.id);
      if (ms <= 0) return drawStamp();
      const s = Math.ceil(ms / 1000);
      el.textContent = fem('📖 اقرأ البطاقة أولاً، ثم حاول بعد ') + `${Math.floor(s / 60).toLocaleString('ar-EG')}:${String(s % 60).padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])}`;
      setTimeout(tick, 1000);
    };
    tick();
    return el;
  }
  redraw = drawStamp;
  drawStamp();
  void stamp;
  return m;
}

function checkGoldCert(cont) {
  const me = store.me; if (!me) return;
  if (states.filter((s) => s.cont === cont).every((s) => me.gold?.[s.id]) && store.badge('gold-' + cont)) {
    setTimeout(() => { confetti(); sfx('win'); toast(`🥇 أتقنت قارة ${continents[cont]} كلها! شهادتك الذهبية في جواز السفر`, 4500); speak(`مبارك! نلت شهادة إتقان قارة ${continents[cont]}`, LANG.ar); }, 2200);
  }
}

function checkContinentBadge(cont) {
  const me = store.me; if (!me) return;
  const inCont = states.filter((s) => s.cont === cont);
  if (inCont.every((s) => me.stamps[s.id]) && store.badge('cont-' + cont)) {
    setTimeout(() => { confetti(); sfx('win'); toast(`🎓 أكملت قارة ${continents[cont]} كلها! شهادتك في جواز السفر`, 4500); speak(`مبارك! أكملت قارة ${continents[cont]} كلها، ونلت شهادتها`, LANG.ar); }, 2200);
  }
}

// عند إكمال رحلة: تهنئة، والرحلة التالية تنتظر
function checkJourney(id) {
  const me = store.me; if (!me) return;
  const j = journeyState(me).list.find((x) => x.ids.includes(id));
  if (j?.complete && store.badge('journey-' + j.id)) setTimeout(() => { confetti(); sfx('win'); toast(`🏅 أكملت رحلة «${j.title}»! الرحلة التالية تنتظرك في «رحلاتي»`, 5000); speak(`مبارك! أكملت رحلة ${j.title}`, LANG.ar); }, 2400);
}
