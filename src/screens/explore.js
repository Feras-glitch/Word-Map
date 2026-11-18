import { h, toast, modal } from '../ui.js';
import { createMap, defaultFill, lighten, NAT } from '../map.js';
import { tri } from '../card.js';
import { speak, LANG } from '../speech.js';
import { contOrder, continents, contEmoji, contBox, contColors, search, flagUrl, byId } from '../data.js';
import { openCard } from '../card.js';
import { store } from '../store.js';
import { sfx } from '../sfx.js';

export function exploreScreen(root) {
  const me = store.me;
  // الدول المزارة بلون كامل، والباقي بلون أفتح قليلاً
  // خريطة التقدم: فاتح لما لم يُزَر، ملوّن بعد ختم الزيارة، ذهبي بعد الإتقان
  const fill = (c) => c.kind !== 'state' ? defaultFill(c) : me.gold?.[c.id] ? '#f2c230' : me.stamps[c.id] ? contColors[c.cont] : lighten(contColors[c.cont], 0.55);
  const m = createMap({
    compass: true,
    fill,
    onMiss: () => toast('🌊 هذا ماء: بحر أو محيط. المس اليابسة لتكتشف دولة'),
    onNature: (id) => openNature(id),
    onTap: (id, sub) => {
      openCard(id, { sub, onShowOnMap: show, onClose: () => m.setFill(fill) });

    },
  });
  const show = (id) => { m.zoomToCountry(id); m.flash(id, 'flash', 2400); };

  // ---------- الجغرافيا الطبيعية ----------
  const natBtn = h('button', { class: 'nat-toggle', 'aria-label': 'الطبيعة: الأنهار والجبال والبحار', onclick: () => setNat(!store.settings.nature, true) }, '⛰️');
  m.el.append(natBtn);
  function setNat(on, say) {
    store.setSetting('nature', on); m.setNature(on); natBtn.classList.toggle('on', on); sfx('tap');
    if (say) toast(on ? '⛰️ الطبيعة: المحيطات والبحار والأنهار والجبال والصحارى. المس اسماً لتعرف عنه' : 'أُخفيت طبقة الطبيعة');
  }
  const showNat = (id) => { m.zoomToNature(id); setTimeout(() => m.flashNature(id), 750); };
  function openNature(id) {
    const it = NAT.items.find((x) => x.id === id); if (!it) return;
    const K = NAT.kinds[it.kind];
    sfx('tap'); setTimeout(() => speak(it.ar, LANG.ar), 200);
    const md = modal(h('div', { class: 'nat-card' },
      h('div', { class: 'card-head' }, h('div', { class: 'big-emoji' }, K.icon), h('p', { class: 'kind' }, K.ar + ' · ' + K.en + ' · ' + K.zh)),
      tri({ ar: it.ar, en: it.en, zh: it.zh, py: it.py }, { big: true }),
      h('div', { class: 'sec fact' }, h('span', { class: 'st-label' }, '💡 هل تعلم؟'), h('p', {}, it.fact), h('button', { class: 'btn small soft', onclick: () => speak(it.fact, LANG.ar) }, '🔊 اسمع')),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn big', onclick: () => { md.close(); if (!store.settings.nature) setNat(true); setTimeout(() => showNat(id), 300); } }, '📍 أرني على الخريطة'))), { cls: 'card-modal' });
  }

  const results = h('div', { class: 'search-results' });
  const input = h('input', { class: 'input search', type: 'search', placeholder: '🔎 ابحث عن دولة أو عاصمة…', oninput: () => {
    results.innerHTML = '';
    const q = input.value.trim();
    if (q.length >= 2) for (const it of NAT.items.filter((x) => x.ar.includes(q) || x.en.toLowerCase().includes(q.toLowerCase())).slice(0, 4)) results.append(h('button', { class: 'res', onclick: () => {
      input.value = ''; results.innerHTML = ''; input.blur(); if (!store.settings.nature) setNat(true); showNat(it.id); setTimeout(() => m.el.isConnected && openNature(it.id), 900);
    } }, h('span', { class: 'res-ic' }, NAT.kinds[it.kind].icon), h('b', {}, it.ar), h('small', {}, it.en)));
    for (const c of search(input.value)) results.append(h('button', { class: 'res', onclick: () => {
      input.value = ''; results.innerHTML = ''; input.blur(); show(c.id); setTimeout(() => m.el.isConnected && openCard(c.id, { onShowOnMap: show, onClose: () => m.setFill(fill) }), 750);
    } }, h('img', { src: flagUrl(c.f), alt: '' }), h('b', {}, c.ar), h('small', {}, c.en)));
  } });

  const conts = h('div', { class: 'cont-bar' }, contOrder.map((k) => h('button', { class: 'cont-btn', style: { '--c': contColors[k] }, onclick: () => { sfx('tap'); m.zoomTo(contBox[k]); } }, contEmoji[k] + ' ' + continents[k])));

  root.append(h('div', { class: 'map-tools' }, input, results), m.el, conts);
  requestAnimationFrame(() => {
    const r = m.el.getBoundingClientRect();
    // على الهاتف العمودي نبدأ من منطقتنا (الوطن العربي وما حوله) بدل العالم الصغير
    if (r.height > r.width * 1.1) m.zoomTo([820, 150, 1420, 560], 0, 0); else m.refresh();
    if (store.settings.nature) setNat(true);
  });
  // فتح مباشر لدولة من شاشة أخرى
  let want = null; try { want = sessionStorage.getItem('openCountry'); sessionStorage.removeItem('openCountry'); } catch { /* */ }
  if (want && byId[want]) { setTimeout(() => { if (!m.el.isConnected) return; show(want); openCard(want, { onShowOnMap: show, onClose: () => m.setFill(fill) }); }, 300); }
}
