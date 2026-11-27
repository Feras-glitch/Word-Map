// أحجية الخريطة: يسحب الطفل شكل كل دولة إلى مكانها على خريطة صامتة
import { h, owl, confetti } from '../ui.js';
import { map as M, byId, states, contColors, shuffle } from '../data.js';
import { createMap, lighten } from '../map.js';
import { store } from '../store.js';
import { journeyState } from '../journeys.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';
import { cnt } from '../arnum.js';

const NS = 'http://www.w3.org/2000/svg';
const ar = (n) => Number(n).toLocaleString('ar-EG');

// قطع الأحجية: دول الرحلة الحالية (أو التي قبلها)، ثم جيرانها حتى يكتمل العدد
function pieces(p) {
  const n = p.level === 1 ? 5 : p.level === 2 ? 7 : 9;
  const js = journeyState(p);
  const j = js.current || js.list[js.list.length - 1];
  let ids = j.ids.filter((id) => byId[id]?.bb && (byId[id].bb[2] - byId[id].bb[0]) > 6);
  if (ids.length > n) ids = shuffle(ids).slice(0, n);
  for (const id of [...ids]) for (const b of byId[id].borders) if (ids.length < n && byId[b]?.kind === 'state' && !ids.includes(b) && (byId[b].bb[2] - byId[b].bb[0]) > 6) ids.push(b);
  return { ids, title: j.title };
}

export function puzzleScreen(root) {
  const me = store.me;
  const { ids, title } = pieces(me);
  const set = new Set(ids); const done = new Set();
  let tries = 0;
  const m = createMap({ labels: false, fill: (c) => (set.has(c.id) ? '#ffffff' : lighten(contColors[c.cont] || '#ccc', 0.55)) });
  m.el.classList.add('puzzle-map');
  const tray = h('div', { class: 'puzzle-tray' });
  const info = h('div', { class: 'story-panel' }, h('p', {}, `🧩 اسحب كل دولة إلى مكانها الأبيض على الخريطة (${title}).`));
  root.append(m.el, info, tray);
  // صندوق يحيط بالقطع كلها
  const bb = ids.map((id) => byId[id].bb);
  const box = [Math.min(...bb.map((b) => b[0])), Math.min(...bb.map((b) => b[1])), Math.max(...bb.map((b) => b[2])), Math.max(...bb.map((b) => b[3]))];
  const pad = Math.max(box[2] - box[0], box[3] - box[1]) * 0.15;
  requestAnimationFrame(() => m.zoomTo([box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad], 0, 0));
  speak('اسحب كل دولة إلى مكانها على الخريطة', LANG.ar);

  for (const id of shuffle(ids)) tray.append(piece(id));

  function piece(id) {
    const c = byId[id];
    const [x0, y0, x1, y1] = c.bb;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${x0 - 1} ${y0 - 1} ${x1 - x0 + 2} ${y1 - y0 + 2}`);
    for (const sh of M.shapes) if (sh.id === id) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', sh.d); p.setAttribute('fill', contColors[c.cont]); p.setAttribute('stroke', '#1f2a44'); p.setAttribute('stroke-width', Math.max(x1 - x0, y1 - y0) / 60); svg.append(p); }
    const el = h('div', { class: 'pz-piece', 'data-id': id }, svg, h('b', {}, c.ar));
    el.addEventListener('pointerdown', (e) => drag(e, el, id));
    return el;
  }

  function drag(e, el, id) {
    e.preventDefault();
    const ghost = el.cloneNode(true); ghost.classList.add('ghost'); document.body.append(ghost);
    const move = (ev) => { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; };
    move(e); el.classList.add('lifted');
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      ghost.remove(); el.classList.remove('lifted');
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-id]');
      if (!m.el.contains(document.elementFromPoint(ev.clientX, ev.clientY))) return;
      tries++;
      const ok = under?.dataset.id === id || m.near(id, ev, 30);
      if (ok) {
        done.add(id); el.remove(); m.mark(id, 'right'); sfx('correct'); speak(byId[id].ar, LANG.ar);
        if (done.size === ids.length) finish();
      } else {
        sfx('wrong'); el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500);
        if (under?.dataset.id && byId[under.dataset.id]) { m.flash(under.dataset.id, 'wrong', 800); speak('هذه ' + byId[under.dataset.id].ar + '. جرّب مكاناً آخر', LANG.ar); }
      }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  function finish() {
    confetti(); sfx('win');
    const extra = tries - ids.length;
    speak('أحسنت! أكملت الأحجية', LANG.ar);
    tray.replaceChildren(h('div', { class: 'panel center' }, h('h3', {}, '🧩 أكملت الأحجية!'),
      h('p', {}, extra ? `وضعت ${cnt(ids.length, 'دولة واحدة', 'دولتين', 'دول', 'دولة')}، واحتجت إلى ${cnt(extra, 'محاولة إضافية واحدة', 'محاولتين إضافيتين', 'محاولات إضافية', 'محاولة إضافية')}.` : 'وضعت كل الدول من أول مرة! 🌟'),
      h('button', { class: 'btn big', onclick: () => { root.innerHTML = ''; puzzleScreen(root); } }, '🔁 أحجية جديدة')));
    const s = extra <= 0 ? 3 : extra <= 3 ? 2 : 1;
    store.patch((p) => { p.stars ||= {}; p.stars.puzzle = Math.max(p.stars.puzzle || 0, s); });
  }
}
