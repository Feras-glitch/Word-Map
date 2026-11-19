// بطاقة الدولة: أربعة أقسام (الأسماء، العاصمة والمعالم، اللغات، أرقام)، وثلاثة مبسطة للمستوى الصغير
import { h, modal, confetti, toast } from './ui.js';
import { byId, flagUrl, continents, continents3, greetings, languages, num, contEmoji, states } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { store } from './store.js';
import { fem } from './gender.js';
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
// التمييز العددي: مرتين، ٣–١٠ مرات، ١١ فأكثر مرة
const times = (n) => (n === 2 ? 'مرتين' : n.toLocaleString('ar-EG') + (n >= 3 && n <= 10 ? ' مرات' : ' مرة'));

function popText(c) {
  if (!c.pop) return null;
  const p = c.pop;
  const n = p >= 1e9 ? (Math.round(p / 1e8) / 10).toLocaleString('ar-EG') + ' مليار'
    : p >= 1e6 ? (p >= 1e7 ? Math.round(p / 1e6) : Math.round(p / 1e5) / 10).toLocaleString('ar-EG') + ' مليون'
    : Math.round(p / 1e3).toLocaleString('ar-EG') + ' ألف';
  let cmp = '';
  const eg = byId.EGY?.pop;
  if (eg && c.id !== 'EGY') {
    const r = p / eg;
    if (r >= 1.5) cmp = `أي أكثر من سكان مصر بنحو ${times(Math.round(r))}`;
    else if (r >= 0.67) cmp = 'قريب من عدد سكان مصر';
    else cmp = `وسكان مصر أكثر منها بنحو ${times(Math.round(1 / r))}`;
  }
  return { n: `نحو ${n} نسمة`, cmp };
}

// أجزاء تُشغَّل تسجيلاتها متتابعة إن وُجدت، وإلا تُقرأ آلياً جملةً واحدة
function storySpeech(c) {
  const parts = [];
  if (c.landmark) parts.push('من معالم', c.ar, 'الشهيرة', c.landmark);
  if (c.fact || c.note) parts.push('هل تعلم؟', c.fact || c.note);
  return parts;
}

function namesTab(c) {
  const cont = continents3[c.cont];
  return h('div', {},
    tri({ ar: c.ar, en: c.en, zh: c.zh, py: c.py }, { big: true }),
    c.occNote ? h('div', { class: 'sec occ-note' }, h('span', { class: 'st-label' }, '🕊️ أرض محتلة'), h('p', {}, c.occNote + '.'), say(c.occNote, LANG.ar)) : null,
    cont && c.cont !== 'antarctica' ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, (contEmoji[c.cont] || '🌍') + ' تقع في قارة'), tri(cont, { prefix: 'قارة ' }), c.sub ? h('small', { class: 'muted' }, c.sub) : null, c.contNote ? h('p', { class: 'note' }, '🌐 ' + c.contNote + '.') : null) : null,
  );
}

function capitalTab(c) {
  const cap = c.cap3 || (c.capAr ? { ar: c.capAr, en: c.capEn } : null);
  return h('div', {},
    cap ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🏛️ العاصمة'), tri(cap, { prefix: ['عاصمة', c.ar, 'هي'] }), c.capNote ? h('p', { class: 'note' }, c.capNote) : null) : null,
    c.landmark || c.fact || c.note ? h('div', { class: 'story' },
      c.landmark ? h('div', { class: 'landmark' }, h('span', { class: 'st-label' }, '⭐ من معالمها الشهيرة:'), c.lm3 ? tri(c.lm3) : h('b', {}, c.landmark)) : null,
      c.fact || c.note ? h('div', { class: 'didyou' }, h('span', { class: 'st-label' }, '💡 هل تعلم؟'), h('p', {}, c.fact || c.note)) : null,
      h('button', { class: 'btn small soft', onclick: () => speak(storySpeech(c), LANG.ar) }, '🔊 اسمع المعلومة'),
    ) : null,
  );
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
    others > 0 ? h('p', { class: 'note' }, 'ويتحدث الناس فيها أيضاً ' + (others === 1 ? 'لغة محلية أخرى.' : others === 2 ? 'لغتين محليتين أخريين.' : others <= 10 ? `نحو ${others.toLocaleString('ar-EG')} لغات محلية أخرى.` : `نحو ${others.toLocaleString('ar-EG')} لغة محلية أخرى.`) + (L.langNote ? ' ' + L.langNote + '.' : '')) : L.langNote ? h('p', { class: 'note' }, L.langNote + '.') : null,
  );
}

// بطاقة المستوى الصغير: لغة البلد وتحيته فقط، بلا تصنيفات
function helloTab(c, openNeighbor) {
  const L = c.langs || {}; const ov = L.greetOverride || {};
  const ks = (L.official?.length ? L.official : L.defacto?.length ? L.defacto : L.working || []).filter((k) => languages[k] && !languages[k].sign).slice(0, 2);
  const neighbors = c.borders.map((b) => byId[b]).filter((n) => n && n.kind === 'state');
  return h('div', {},
    ks.length ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '🗣️ يتكلم أهلها'), ks.map((k) => h('div', { class: 'lang-item' }, langName(languages[k]), greetBox(ov[k] || languages[k].greet)))) : null,
    neighbors.length ? h('div', { class: 'neighbors' }, h('span', {}, '🤝 الجيران:'),
      neighbors.map((n) => h('button', { class: 'chip', onclick: () => openNeighbor(n.id) }, h('img', { src: flagUrl(n.f), alt: '' }), n.ar))) : null);
}

function numbersTab(c, openNeighbor) {
  const neighbors = c.borders.map((b) => byId[b]).filter(Boolean);
  const pop = popText(c);
  return h('div', {},
    c.gov?.special ? h('div', { class: 'sec gov occupied' }, h('span', { class: 'st-label' }, '🕊️ الحكم'),
      tri({ ar: c.gov.ar, en: c.gov.en, zh: c.gov.zh, py: c.gov.py }),
      h('p', { class: 'note strong' }, c.gov.note + '.')) :
    c.gov ? h('div', { class: 'sec gov' }, h('span', { class: 'st-label' }, (c.gov.icon || '🏛️') + ' نظام الحكم'),
      tri({ ar: c.gov.ar, en: c.gov.en, zh: c.gov.zh, py: c.gov.py }, { prefix: ['نظام الحكم في', c.ar] }),
      h('p', { class: 'note' }, c.gov.kid),
      c.gov.note ? h('p', { class: 'note strong' }, c.gov.note + '.') : null,
      c.gov.federal ? h('p', { class: 'note' }, '🧩 دولة اتحادية: تتكون من ولايات أو أقاليم، لكل منها حكومة خاصة بها.') : null) : null,
    h('div', { class: 'facts-grid' },
      c.area ? h('div', { class: 'fact' }, h('span', {}, '📏 المساحة'), h('b', {}, num(c.area) + ' كم²')) : null,
      pop ? h('div', { class: 'fact' }, h('span', {}, '👨‍👩‍👧 السكان'), h('b', {}, pop.n), c.popInfo ? h('small', {}, c.popInfo.scope + '، ' + c.popInfo.year) : null, !c.popInfo && c.popYear ? h('small', {}, 'تقدير سنة ' + String(c.popYear).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])) : null, pop.cmp ? h('small', {}, pop.cmp) : null) : null,
      c.kind !== 'state' && c.parent ? h('div', { class: 'fact' }, h('span', {}, '🔗 تتبع'), h('b', {}, c.parent)) : null,
    ),
    c.id === 'PSE' && c.area ? h('p', { class: 'note' }, '📏 المساحة لفلسطين التاريخية كلها، والسكان المذكورون أعلاه للضفة الغربية وقطاع غزة فقط.') : null,
    c.popInfo?.world ? h('div', { class: 'sec pop-world' }, h('span', { class: 'st-label' }, '🌍 ' + c.popInfo.world.title),
      h('ul', {}, c.popInfo.world.lines.map((l) => (Array.isArray(l) ? h('li', {}, h('b', {}, l[0]), h('ul', {}, l[1].map((x) => h('li', {}, x + '.')))) : h('li', {}, l + '.')))),
      c.popInfo.world.note ? h('p', { class: 'note' }, c.popInfo.world.note) : null,
      h('small', { class: 'muted' }, c.popInfo.world.source || '')) : null,
    c.popInfo?.gaza ? h('div', { class: 'sec occ-note' }, h('span', { class: 'st-label' }, '🕊️ ' + c.popInfo.gaza.title), h('p', {}, c.popInfo.gaza.text), say(c.popInfo.gaza.text, LANG.ar)) : null,
    c.cur ? h('div', { class: 'sec' }, h('span', { class: 'st-label' }, '💰 العملة'), tri(c.cur),
      c.curNote ? h('p', { class: 'note' }, c.curNote) : null,
      c.curStory ? h('button', { class: 'btn small soft', onclick: () => openStory(c.curStory) }, '📜 ' + c.curStory.title) : null) : null,
    neighbors.length ? h('div', { class: 'neighbors' }, h('span', {}, '🤝 الجيران:'),
      neighbors.map((n) => h('button', { class: 'chip', onclick: () => openNeighbor(n.id) }, h('img', { src: flagUrl(n.f), alt: '' }), n.ar))) : null,
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
    if (first && i === 1) { redraw?.(); if (simple) setTimeout(() => speak(storySpeech(c), LANG.ar), 400); }
  };
  tabs.forEach(([e, t], i) => bar.append(h('button', { onclick: () => show(i) }, h('span', {}, e), h('small', {}, t))));

  const body = h('div', { class: 'card' },
    h('div', { class: 'card-flag' + (isState ? '' : ' terr') }, h('img', { src: flagUrl(c.f), alt: 'علم ' + c.ar })),
    sub ? h('div', { class: 'sub-note' }, '📌 ' + sub) : null,
    bar, pane,
    h('div', { class: 'card-actions' },
      onShowOnMap && c.bb ? h('button', { class: 'btn', onclick: () => { m.close(); onShowOnMap(c.id); } }, '📍 أرني على الخريطة') : null),
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
            onClose: () => { drawStamp(); if (won) { showStamp(false); checkContinentBadge(c.cont); } } }); } }, '🛂 احصل على ختم الزيارة (سؤال واحد)')) : null,
      // الختم الذهبي لا يُمتحن هنا (البطاقة تكشف الجواب)، بل تُجمع أدلته في التمرين الشامل
      visit && !gold ? goldBox() : null,
      gold && due ? h('button', { class: 'btn big', onclick: () => { m.close(); setTimeout(() => (location.hash = '#world'), 250); } }, '🔔 حان وقت المراجعة: في التمرين الشامل') : null,
    ].filter(Boolean));
  };
  function goldBox() {
    const p = store.me;
    const req = requiredFor(c);
    const g = goldProgress(p, c.id, req);
    const L = { flag: '🚩 العلم', map: '📍 الموقع', capital: '🏛️ العاصمة' };
    const open = goldEligible(p, c.id);
    return h('div', { class: 'gold-progress' },
      h('p', { class: 'note strong' }, '🥇 أدلة الختم الذهبي:'),
      h('div', { class: 'stamp-status' }, ...g.req.map(([k, v, n, need]) => h('span', { class: 'chip-st' + (v ? ' on' : '') }, (v ? '✅ ' : '◻️ ') + L[k] + (need > 1 ? ` ${n.toLocaleString('ar-EG')}/${need.toLocaleString('ar-EG')}` : ''))),
        h('span', { class: 'chip-st' + (g.others >= OTHER_NEEDED ? ' on' : '') }, `➕ أخرى ${Math.min(g.others, OTHER_NEEDED).toLocaleString('ar-EG')}/${OTHER_NEEDED.toLocaleString('ar-EG')}`)),
      h('p', { class: 'note' }, open ? 'تُجمع هذه الأدلة في «التمرين الشامل»، حين تجيب صحيحاً من أول محاولة. العلم والعاصمة يلزمهما جوابان في يومين مختلفين.'
        : 'تبدأ أدلة الختم الذهبي من الغد في «التمرين الشامل». راجع البطاقة اليوم.'),
      open ? h('button', { class: 'btn big gold-btn', onclick: () => { m.close(); setTimeout(() => (location.hash = '#world'), 250); } }, '🧠 إلى التمرين الشامل') : null);
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
