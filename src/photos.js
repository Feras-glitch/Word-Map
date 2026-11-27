// الصور: حرة الرخصة من ويكيميديا كومنز (scripts/fetch-landmarks.mjs و scripts/fetch-photos.mjs).
// لا تُعرض إلا الصور التي رُوجعت بالنظر (review: ok)، ومع كل صورة اسم صاحبها ورخصتها.
import META from '../content/landmark-photos.json';
import META2 from '../content/second-photos.json';
import META3 from '../content/animal-photos.json';
import LIST2 from '../content/second-photos-list.json';
import LIST3 from '../content/continent-animals-list.json';
const files = import.meta.glob('./landmark-img/*.jpg', { eager: true, query: '?url', import: 'default' });
const files2 = import.meta.glob('./second-img/*.jpg', { eager: true, query: '?url', import: 'default' });
const files3 = import.meta.glob('./animal-img/*.jpg', { eager: true, query: '?url', import: 'default' });

export function landmarkPhoto(id) {
  const m = META[id]; const url = files[`./landmark-img/${id}.jpg`];
  return m && url && m.review === 'ok' ? { url, ...m } : null;
}
export const hasPhoto = (id) => !!landmarkPhoto(id);

// الصورة الثانية للدولة: حيوان أو طعام أو نبات تشتهر به
export const KIND = { animal: { icon: '🐾', label: 'من حيواناتها المشهورة' }, food: { icon: '🍲', label: 'من أطعمتها المشهورة' }, plant: { icon: '🌿', label: 'تشتهر بـ' } };
export function secondPhoto(id) {
  const m = META2[id]; const it = LIST2[id]; const url = files2[`./second-img/${id}.jpg`];
  return m && it && url && m.review === 'ok' ? { url, ...m, ...it } : null;
}
export const hasSecond = (id) => !!secondPhoto(id);

// حيوانات القارات
export function continentAnimals(cont) {
  return Object.entries(LIST3).filter(([, it]) => it.cont === cont).map(([key, it]) => {
    const m = META3[key]; const url = files3[`./animal-img/${key}.jpg`];
    return m && url && m.review === 'ok' ? { key, url, ...m, ...it } : null;
  }).filter(Boolean);
}
export const allAnimals = () => Object.keys(LIST3).map((k) => continentAnimals(LIST3[k].cont).find((a) => a.key === k)).filter(Boolean);

export const photoCredits = () => [
  ...Object.keys(META).map((id) => { const p = landmarkPhoto(id); return p && { id, ...p }; }),
  ...Object.keys(META2).map((id) => { const p = secondPhoto(id); return p && { id, ...p, what: p.ar }; }),
  ...allAnimals().map((a) => ({ id: a.key, ...a, what: a.ar })),
].filter(Boolean);
