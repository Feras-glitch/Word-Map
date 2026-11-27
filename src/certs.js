// شهادات القارات: شهادة المستكشف (أختام زيارة كل دول القارة) وشهادة الإتقان الذهبية (كل الأختام الذهبية)
import { h, modal, toast } from './ui.js';
import { states, continents, contColors, contEmoji, contOrder, flagUrl } from './data.js';
import { saveFile } from './save.js';
import { Capacitor } from '@capacitor/core';

const ar = (n) => Number(n).toLocaleString('ar-EG');

export function certStatus(p) {
  return contOrder.map((k) => {
    const list = states.filter((s) => s.cont === k);
    const visits = list.filter((s) => p.stamps?.[s.id]).length;
    const golds = list.filter((s) => p.gold?.[s.id]).length;
    return { k, total: list.length, visits, golds, visit: visits === list.length, gold: golds === list.length };
  });
}

const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export async function drawCert(p, k, gold) {
  const list = states.filter((s) => s.cont === k);
  return drawBase(p, { emoji: gold ? '🥇' : contEmoji[k], title: gold ? 'شهادة إتقان ذهبية' : 'شهادة مستكشف', sub: 'قارة ' + continents[k], col: contColors[k], accent: gold ? '#c99700' : '#2b7fd4',
    line: gold ? `أتقن جميع دول ${continents[k]} الـ${ar(list.length)}، ونال ختمها الذهبي` : `زار جميع دول ${continents[k]} الـ${ar(list.length)}، ونال ختم كل واحدة منها`, list });
}
// شهادة الاختبار الكبير
export async function drawExamCert(p, { title, list, score, total }) {
  return drawBase(p, { emoji: '📝', title: 'شهادة إتقان', sub: title, col: '#1a9b55', accent: '#1a9b55', list,
    line: `نجح في الاختبار الكبير بـ${ar(score)} إجابة صحيحة من ${ar(total)}` });
}
async function drawBase(p, { emoji, title, sub, line, list, col, accent }) {
  const W = 1600, H = 1130;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  try { await document.fonts.load('900 60px Cairo'); await document.fonts.load('700 40px Cairo'); } catch { /* */ }
  const ink = '#1f2a44';
  x.fillStyle = '#fffaf0'; x.fillRect(0, 0, W, H);
  x.lineWidth = 28; x.strokeStyle = accent; x.strokeRect(30, 30, W - 60, H - 60);
  x.lineWidth = 6; x.strokeStyle = col; x.strokeRect(70, 70, W - 140, H - 140);
  for (const [cx, cy] of [[90, 90], [W - 90, 90], [90, H - 90], [W - 90, H - 90]]) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, 34, 0, 7); x.fill(); }
  x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = ink;
  x.font = '120px sans-serif'; x.fillText(emoji, W / 2, 235);
  x.font = '900 76px Cairo'; x.fillStyle = accent; x.fillText(title, W / 2, 345);
  x.font = '700 46px Cairo'; x.fillStyle = ink; x.fillText(sub, W / 2, 420);
  x.font = '700 40px Cairo'; x.fillText('يشهد «مستكشف العالم» بأن المستكشف', W / 2, 510);
  x.font = '900 96px Cairo'; x.fillStyle = accent; x.fillText(p.avatar + ' ' + p.name, W / 2, 630);
  x.font = '700 40px Cairo'; x.fillStyle = ink;
  x.fillText(p.gender === 'f' ? line.replace(/^نجح/, 'نجحت').replace(/^أتقن/, 'أتقنت').replace(/^زار/, 'زارت').replace(/ونال /, 'ونالت ') : line, W / 2, 715);
  const sample = (list || []).slice().sort(() => Math.random() - 0.5).slice(0, 12);
  const fw = 84, fh = 60, gap = 16, total = sample.length * (fw + gap) - gap;
  let fx = (W - total) / 2;
  for (const s of sample) { const im = await loadImg(flagUrl(s.f)); if (im) { x.drawImage(im, fx, 770, fw, fh); x.strokeStyle = '#0003'; x.lineWidth = 2; x.strokeRect(fx, 770, fw, fh); } fx += fw + gap; }
  x.font = '700 34px Cairo'; x.fillStyle = '#5a6478';
  x.fillText(new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, 920);
  x.font = '700 30px Cairo'; x.fillText('🌍 مستكشف العالم', W / 2, 990);
  return cv;
}

export async function openCert(p, k, gold) { return showCanvas(await drawCert(p, k, gold), `certificate-${k}-${gold ? 'gold' : 'explorer'}.png`); }
export async function openExamCert(p, o) { return showCanvas(await drawExamCert(p, o), `certificate-${o.key || 'exam'}.png`.replace(/[^a-z0-9.-]/gi, '-')); }
function showCanvas(cv, name) {
  const url = cv.toDataURL('image/png');
  const native = Capacitor.isNativePlatform();
  modal(h('div', { class: 'cert-view' }, h('img', { class: 'cert-img', src: url, alt: 'شهادة' }),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => cv.toBlob(async (b) => { try { await saveFile(name, b, 'image/png'); } catch { toast('تعذّر حفظ الصورة'); } }) }, native ? '📤 حفظ أو مشاركة' : '💾 حفظ صورة'),
      native ? null : h('button', { class: 'btn soft', onclick: () => printImage(url) }, '🖨️ طباعة'))), { cls: 'cert-modal' });
}

function printImage(url) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0';
  document.body.append(f);
  const d = f.contentDocument;
  d.open(); d.write(`<html><head><style>@page{size:landscape;margin:0}html,body{margin:0;height:100%}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${url}"></body></html>`); d.close();
  const img = d.querySelector('img');
  const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { toast('الطباعة غير متاحة هنا؛ احفظ الصورة واطبعها'); } setTimeout(() => f.remove(), 2000); };
  if (img.complete) setTimeout(go, 100); else img.onload = go;
}

// قسم الشهادات في جواز السفر
export function certsSection(p) {
  return h('div', { class: 'certs' }, certStatus(p).map((c) => {
    const earned = c.gold || c.visit;
    return h('button', { class: 'cert-card' + (c.gold ? ' gold' : c.visit ? ' on' : ''), style: { '--c': contColors[c.k] }, onclick: () => earned ? openCert(p, c.k, c.gold) : toast(`اجمع أختام كل دول ${continents[c.k]} لتنال شهادتها: بقي ${ar(c.total - c.visits)}`) },
      h('span', { class: 'ce' }, earned ? (c.gold ? '🥇' : '🎓') : '🔒'), h('b', {}, continents[c.k]),
      h('small', {}, c.gold ? 'شهادة الإتقان الذهبية' : c.visit ? `شهادة المستكشف · ذهبي ${ar(c.golds)}/${ar(c.total)}` : `${ar(c.visits)} من ${ar(c.total)}`));
  }));
}
