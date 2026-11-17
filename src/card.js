// بطاقة الدولة
import { h, modal, confetti, toast } from './ui.js';
import { byId, flagUrl, continents, greetings, num, contEmoji, states } from './data.js';
import { speak, LANG } from './speech.js';
import { sfx } from './sfx.js';
import { store } from './store.js';

// كل حرف صيني وفوقه نطقه (البينين) كما في كتب الأطفال
export function zhRuby(zh, py) {
  const chars = [...zh]; const sy = (py || '').split(' ');
  const r = h('b', { class: 'zh-ruby', lang: 'zh' });
  chars.forEach((ch, i) => r.append(h('ruby', {}, ch, h('rt', {}, sy.length === chars.length ? sy[i] : ''))));
  if (sy.length !== chars.length) r.append(h('small', { class: 'py-line' }, py));
  return r;
}

const say = (text, lang) => h('button', { class: 'say', 'aria-label': 'استمع', onclick: (e) => { e.stopPropagation(); speak(text, lang); } }, '🔊');

function storySpeech(c) {
  const parts = [];
  if (c.landmark) parts.push(`من معالم ${c.ar} الشهيرة: ${c.landmark}.`);
  if (c.fact || c.note) parts.push(`هل تعلم؟ ${c.fact || c.note}`);
  return parts.join(' ');
}

export function openCard(id, { sub, onShowOnMap, stamp = true, replace = false } = {}) {
  const c = byId[id];
  if (!c) return;
  sfx('tap');
  const isState = c.kind === 'state';
  const g = greetings[c.greet] || greetings.eng;
  const neighbors = c.borders.map((b) => byId[b]).filter(Boolean);

  const body = h('div', { class: 'card' },
    h('div', { class: 'card-flag' + (isState ? '' : ' terr') },
      h('img', { src: flagUrl(c.f), alt: 'علم ' + c.ar })),
    sub ? h('div', { class: 'sub-note' }, '📌 ' + sub) : null,
    h('div', { class: 'names' },
      h('div', { class: 'name-row ar' }, h('span', { class: 'lang-tag' }, 'عربي'), h('b', {}, c.ar), say(c.ar, LANG.ar)),
      h('div', { class: 'name-row en', dir: 'ltr' }, h('span', { class: 'lang-tag' }, 'EN'), h('b', {}, c.en), say(c.en, LANG.en)),
      c.zh ? h('div', { class: 'name-row zh', dir: 'ltr' }, h('span', { class: 'lang-tag' }, '中文'),
        zhRuby(c.zh, c.py), say(c.zh, LANG.zh)) : null,
    ),
    h('div', { class: 'facts-grid' },
      c.capAr ? h('div', { class: 'fact cap' }, h('span', {}, '🏛️ العاصمة'), h('b', {}, c.capAr), say('عاصمة ' + c.ar + ' هي ' + c.capAr, LANG.ar)) : null,
      c.cont && c.cont !== 'antarctica' && continents[c.cont] ? h('div', { class: 'fact' }, h('span', {}, (contEmoji[c.cont] || '🌍') + ' القارة'), h('b', {}, continents[c.cont]), c.sub ? h('small', {}, c.sub) : null) : null,
      c.area ? h('div', { class: 'fact' }, h('span', {}, '📏 المساحة'), h('b', {}, num(c.area) + ' كم²')) : null,
      !isState && c.parent ? h('div', { class: 'fact' }, h('span', {}, '🔗 تتبع'), h('b', {}, c.parent)) : null,
    ),
    c.landmark || c.fact || c.note ? h('div', { class: 'story' },
      c.landmark ? h('div', { class: 'landmark' }, h('span', { class: 'st-label' }, '🏛️ من معالمها الشهيرة:'), h('b', {}, c.landmark)) : null,
      c.fact || c.note ? h('div', { class: 'didyou' }, h('span', { class: 'st-label' }, '💡 هل تعلم؟'), h('p', {}, c.fact || c.note)) : null,
      h('button', { class: 'btn small soft', onclick: () => speak(storySpeech(c), LANG.ar) }, '🔊 اسمع المعلومة'),
    ) : null,
    isState && g ? h('div', { class: 'hello' },
      h('span', {}, '👋 قل مرحباً بلغتهم:'),
      h('b', { dir: 'auto' }, g.t), g.t !== g.ar ? h('small', {}, '(' + g.ar + ')') : null,
      say(g.t, g.lang)) : null,
    neighbors.length ? h('div', { class: 'neighbors' }, h('span', {}, '🤝 الجيران:'),
      neighbors.map((n) => h('button', { class: 'chip', onclick: () => openCard(n.id, { onShowOnMap, stamp, replace: true }) },
        h('img', { src: flagUrl(n.f), alt: '' }), n.ar))) : null,
    h('div', { class: 'card-actions' },
      onShowOnMap && c.bb ? h('button', { class: 'btn', onclick: () => { m.close(); onShowOnMap(c.id); } }, '📍 أرني على الخريطة') : null,
    ),
  );

  const m = modal(body, { cls: 'card-modal', replace });
  setTimeout(() => speak(c.ar, LANG.ar), 250);

  if (isState && stamp && store.me) {
    const isNew = store.stamp(c.id);
    if (isNew) {
      setTimeout(() => {
        const st = h('div', { class: 'stamp-anim' }, h('div', { class: 'stamp' }, h('img', { src: flagUrl(c.f), alt: '' }), h('span', {}, c.ar)), h('div', { class: 'stamp-txt' }, 'ختم جديد في جوازك!'));
        m.box.append(st);
        sfx('stamp');
        setTimeout(() => st.classList.add('done'), 1600);
        checkContinentBadge(c.cont);
      }, 900);
    }
  }
  return m;
}

function checkContinentBadge(cont) {
  const me = store.me; if (!me) return;
  const inCont = states.filter((s) => s.cont === cont);
  if (inCont.every((s) => me.stamps[s.id]) && store.badge('cont-' + cont)) {
    setTimeout(() => { confetti(); sfx('win'); toast(`🎉 أكملت قارة ${continents[cont]} كلها!`, 4000); speak(`مبارك! أكملت قارة ${continents[cont]} كلها`, LANG.ar); }, 2200);
  }
}
