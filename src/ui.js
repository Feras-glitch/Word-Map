// أدوات واجهة صغيرة
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}

export function toast(msg, ms = 2600) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}

export function modal(content, { onClose, cls = '' } = {}) {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal ' + cls });
  const close = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 250); onClose?.(); };
  box.append(h('button', { class: 'modal-x', 'aria-label': 'إغلاق', onclick: close }, '✕'), content);
  back.append(box);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  requestAnimationFrame(() => back.classList.add('show'));
  return { close, box };
}

export function confetti(n = 60) {
  const colors = ['#ffcf56', '#f6a15b', '#8fd17a', '#f58f8f', '#c49bf0', '#5fd0c9', '#2b7fd4'];
  const wrap = h('div', { class: 'confetti' });
  for (let i = 0; i < n; i++) {
    wrap.append(h('i', { style: {
      left: Math.random() * 100 + '%', background: colors[i % colors.length],
      animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.6 + Math.random() * 1.4 + 's',
      transform: `rotate(${Math.random() * 360}deg)`,
    } }));
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 3500);
}

// البومة المرشدة (رسم أصلي)
export function owlSVG(size = 90, mood = 'happy') {
  const eye = mood === 'wink'
    ? '<path d="M58 52 q8 -6 16 0" stroke="#2d1b0e" stroke-width="4" fill="none" stroke-linecap="round"/>'
    : '<circle cx="66" cy="52" r="7" fill="#2d1b0e"/><circle cx="68" cy="49" r="2.5" fill="#fff"/>';
  return `<svg class="owl" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".12"/>
    <path d="M22 30 L34 44 L30 22 Z M98 30 L86 44 L90 22 Z" fill="#8a5a33"/>
    <ellipse cx="60" cy="68" rx="40" ry="44" fill="#a86e3f"/>
    <ellipse cx="60" cy="80" rx="26" ry="28" fill="#f2d7a7"/>
    <path d="M44 74 q4 4 8 0 M56 80 q4 4 8 0 M68 74 q4 4 8 0 M50 90 q4 4 8 0 M62 90 q4 4 8 0" stroke="#c99a64" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="52" r="17" fill="#fff"/><circle cx="78" cy="52" r="17" fill="#fff"/>
    <circle cx="42" cy="52" r="7" fill="#2d1b0e"/><circle cx="44" cy="49" r="2.5" fill="#fff"/>
    <g transform="translate(12 0)">${eye}</g>
    <path d="M54 62 L60 72 L66 62 Z" fill="#ff9f1c"/>
    <path d="M20 70 q-8 18 6 30 q4 -16 4 -26 Z M100 70 q8 18 -6 30 q-4 -16 -4 -26 Z" fill="#8a5a33"/>
    <path d="M48 110 l-4 6 M54 110 v7 M66 110 v7 M72 110 l4 6" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 26 q32 -22 64 0 q-10 -4 -32 -4 q-22 0 -32 4Z" fill="#2b7fd4"/>
    <circle cx="60" cy="14" r="5" fill="#ffcf56"/>
  </svg>`;
}

export function owl(text, { size = 80, mood } = {}) {
  return h('div', { class: 'owl-row' },
    h('div', { class: 'owl-wrap', html: owlSVG(size, mood) }),
    h('div', { class: 'bubble' }, text));
}

export function stars(n, max = 3) {
  return h('span', { class: 'stars' }, Array.from({ length: max }, (_, i) => (i < n ? '⭐' : '☆')).join(''));
}
