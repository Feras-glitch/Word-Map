import { h, confetti } from '../ui.js';
import { createMap, arcPath, svgEl } from '../map.js';
import { pool, byId, flagUrl } from '../data.js';
import { store } from '../store.js';
import { journeyState } from '../journeys.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';
import { openCard } from '../card.js';

const today = () => new Date().toLocaleDateString('en-CA');
function hash(s) { let x = 2166136261; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }

export function dailyScreen(root) {
  const me = store.me;
  const owner = me.id;
  // تُلغى الرحلة إن خرج الطفل من الشاشة أو بُدّل الملف، فلا يُحفظ شيء لغير صاحبها
  const alive = () => root.isConnected && store.me?.id === owner;
  const d = today();
  // رحلة اليوم تتبع الرحلة الحالية: دولة لم تُزر بعد منها، وإلا فمن دول المستوى
  const cur = journeyState(me).current;
  const fromJourney = cur ? cur.ids.filter((id) => !me.stamps[id] && byId[id].cen).map((id) => byId[id]) : [];
  const P = fromJourney.length > 1 ? fromJourney : pool(me.level).filter((c) => c.cen);
  // دولة اليوم ثابتة لكل طفل في اليوم نفسه، ولا تكون دولة الأمس
  const avoid = me.daily.last === d ? me.daily.prevId : me.daily.lastId;
  let target = P[hash(d + me.id) % P.length];
  if (target.id === avoid) target = P[(hash(d + me.id) + 1) % P.length];
  let from = byId[avoid] || byId.EGY;
  if (from.id === target.id) from = byId.SAU;

  const m = createMap({ labels: false, onTap: (id) => id !== 'ATA' && openCard(id) });
  const plane = svgEl('text', { class: 'plane', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
  plane.textContent = '✈️';
  const trail = svgEl('path', { d: arcPath(from.cen, target.cen, 0.3), class: 'trail' });
  m.overlay.append(trail, plane);
  const panel = h('div', { class: 'story-panel' });
  root.append(m.el, panel);

  const streakFor = () => {
    const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
    if (me.daily.last === d) return me.daily.streak || 1;
    return me.daily.last === y ? (me.daily.streak || 0) + 1 : 1;
  };

  panel.append(h('p', {}, '🛫 من ', h('b', {}, from.ar), ' إلى دولة مفاجأة… هل أنت مستعد؟'),
    h('button', { class: 'btn big', onclick: fly }, '✈️ أقلِع!'));
  requestAnimationFrame(() => m.zoomTo([Math.min(from.cen[0], target.cen[0]), Math.min(from.cen[1], target.cen[1]), Math.max(from.cen[0], target.cen[0]), Math.max(from.cen[1], target.cen[1])], 0, 0.4)
    .then(() => { placePlane(0); }));

  function placePlane(p, ang = 0) {
    const L = trail.getTotalLength(); const q = trail.getPointAtLength(L * p); const k = m.kPx();
    plane.setAttribute('x', q.x); plane.setAttribute('y', q.y); plane.setAttribute('font-size', 28 * k);
    plane.setAttribute('transform', `rotate(${ang} ${q.x} ${q.y})`);
  }
  function fly() {
    sfx('whoosh'); panel.replaceChildren(h('p', {}, '✈️ نطير الآن…'));
    trail.classList.add('on');
    const L = trail.getTotalLength(); const t0 = performance.now();
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2600;
    const step = (t) => {
      if (!alive()) return;
      const p = dur ? Math.min(1, Math.max(0, (t - t0) / dur)) : 1; const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const a = trail.getPointAtLength(L * e), b = trail.getPointAtLength(Math.min(L, L * e + 1));
      // الرمز ✈️ يتجه أصلاً إلى الأعلى واليمين (٤٥°)
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 45;
      placePlane(e, ang);
      if (p < 1) requestAnimationFrame(step); else land();
    };
    requestAnimationFrame(step);
  }
  function land() {
    if (!alive()) return;
    const streak = streakFor();
    store.patchProfile(owner, (p) => { p.daily = { last: d, lastId: target.id, prevId: p.daily?.last === d ? p.daily.prevId : p.daily?.lastId, streak }; });
    plane.style.display = 'none'; // الطائرة هبطت: لا تغطي الدولة
    m.zoomToCountry(target.id, 900); m.flash(target.id, 'flash', 3000);
    confetti(40); sfx('win');
    speak('هبطنا في ' + target.ar + '!', LANG.ar);
    panel.replaceChildren(
      h('div', { class: 'sp-head' }, h('img', { class: 'sp-flag', src: flagUrl(target.f), alt: '' }), h('b', {}, 'هبطنا في ' + target.ar + '!'), h('span', { class: 'sp-n' }, '🔥 ' + streak.toLocaleString('ar-EG') + ' يوم')),
      h('p', {}, streak > 1 ? `رائع! هذه رحلتك رقم ${streak.toLocaleString('ar-EG')} على التوالي. عُد غداً لرحلة جديدة.` : 'عُد غداً لرحلة جديدة، واجمع سلسلة رحلات متتالية!'),
      h('button', { class: 'btn big', onclick: () => openCard(target.id) }, '📖 افتح بطاقة ' + target.ar));
  }
}
