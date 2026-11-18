// حفظ ملف (نسخة احتياطية أو شهادة) ومشاركته على كل المنصات
// أندرويد: نكتب الملف في ذاكرة التطبيق المؤقتة ثم نفتح نافذة المشاركة (Drive، واتساب، الملفات...)
// المتصفح وويندوز: تنزيل مباشر
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();

export async function saveFile(name, data, mime) {
  // data: نص أو Blob
  if (native) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    let opts;
    if (typeof data === 'string') opts = { path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 };
    else opts = { path: name, data: await blobToBase64(data), directory: Directory.Cache };
    const r = await Filesystem.writeFile(opts);
    await Share.share({ title: name, files: [r.uri] });
    return 'shared';
  }
  // داخل صفحة claude.ai: التنزيل عبر إذن المنصة
  if (window.claude?.use) {
    let dl = null; try { dl = await window.claude.use('downloads'); } catch { /* */ }
    if (dl) { await dl.save({ filename: name, data }); return 'saved'; }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: mime || 'application/json' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

function blobToBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
}

// فتح ملف من الجهاز وقراءته نصاً
export function pickTextFile(accept = '.json,application/json,text/plain') {
  return new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept; i.style.display = 'none';
    i.onchange = () => { const f = i.files?.[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(f); i.remove(); };
    document.body.append(i); i.click();
  });
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* */ }
  try { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}
