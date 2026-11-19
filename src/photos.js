// صور المعالم: صور حرة الرخصة من ويكيميديا كومنز (انظر scripts/fetch-landmarks.mjs).
// لا تُعرض إلا الصور التي رُوجعت بالنظر (review: ok)، ومع كل صورة اسم صاحبها ورخصتها.
import META from '../content/landmark-photos.json';
const files = import.meta.glob('./landmark-img/*.jpg', { eager: true, query: '?url', import: 'default' });

export function landmarkPhoto(id) {
  const m = META[id]; const url = files[`./landmark-img/${id}.jpg`];
  return m && url && m.review === 'ok' ? { url, ...m } : null;
}
export const hasPhoto = (id) => !!landmarkPhoto(id);
export const photoCredits = () => Object.keys(META).map((id) => { const p = landmarkPhoto(id); return p && { id, ...p }; }).filter(Boolean);
