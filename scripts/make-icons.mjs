// يولّد أيقونات التطبيق في assets/ من رسم البومة الأصلي
import fs from 'node:fs';
import sharp from 'sharp';

const owl = `
  <ellipse cx="60" cy="68" rx="40" ry="44" fill="#a86e3f"/>
  <path d="M22 30 L34 44 L30 22 Z M98 30 L86 44 L90 22 Z" fill="#8a5a33"/>
  <ellipse cx="60" cy="80" rx="26" ry="28" fill="#f2d7a7"/>
  <circle cx="42" cy="52" r="17" fill="#fff"/><circle cx="78" cy="52" r="17" fill="#fff"/>
  <circle cx="42" cy="52" r="7" fill="#2d1b0e"/><circle cx="44" cy="49" r="2.5" fill="#fff"/>
  <circle cx="78" cy="52" r="7" fill="#2d1b0e"/><circle cx="80" cy="49" r="2.5" fill="#fff"/>
  <path d="M54 62 L60 72 L66 62 Z" fill="#ff9f1c"/>
  <path d="M20 70 q-8 18 6 30 q4 -16 4 -26 Z M100 70 q8 18 -6 30 q-4 -16 -4 -26 Z" fill="#8a5a33"/>
  <path d="M28 26 q32 -22 64 0 q-10 -4 -32 -4 q-22 0 -32 4Z" fill="#2b7fd4"/><circle cx="60" cy="14" r="5" fill="#ffcf56"/>`;

const globe = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#5bb8f5"/>
  <path d="M${cx - r * 0.7} ${cy - r * 0.35} q${r * 0.3} -${r * 0.4} ${r * 0.6} -${r * 0.15} q${r * 0.2} ${r * 0.3} -${r * 0.05} ${r * 0.55} q-${r * 0.35} ${r * 0.1} -${r * 0.55} -${r * 0.4}Z" fill="#8fd17a"/>
  <path d="M${cx + r * 0.05} ${cy - r * 0.7} q${r * 0.5} -${r * 0.05} ${r * 0.65} ${r * 0.35} q-${r * 0.05} ${r * 0.45} -${r * 0.4} ${r * 0.55} q-${r * 0.15} ${r * 0.5} -${r * 0.35} ${r * 0.6} q-${r * 0.25} -${r * 0.35} -${r * 0.05} -${r * 0.75} q-${r * 0.2} -${r * 0.35} ${r * 0.15} -${r * 0.75}Z" fill="#f6a15b"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="${r * 0.04}"/>`;

const full = (size, bg = true) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  ${bg ? '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#47a3f3"/><stop offset="1" stop-color="#1d5fa3"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>' : ''}
  ${globe(512, 600, 330)}
  <g transform="translate(272 110) scale(4)">${owl}</g>
</svg>`;

const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(212 212) scale(0.586)">${globe(512, 600, 330)}<g transform="translate(272 110) scale(4)">${owl}</g></g></svg>`;
const bgOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#47a3f3"/><stop offset="1" stop-color="#1d5fa3"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/></svg>`;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#2b7fd4"/>
  <g transform="translate(966 966) scale(0.78)">${globe(512, 600, 330)}<g transform="translate(272 110) scale(4)">${owl}</g></g></svg>`;

fs.mkdirSync('assets', { recursive: true });
await sharp(Buffer.from(full(1024))).png().toFile('assets/icon.png');
await sharp(Buffer.from(full(1024))).png().toFile('assets/icon-only.png');
await sharp(Buffer.from(fg)).png().toFile('assets/icon-foreground.png');
await sharp(Buffer.from(bgOnly)).png().toFile('assets/icon-background.png');
await sharp(Buffer.from(splash)).png().toFile('assets/splash.png');
await sharp(Buffer.from(splash)).png().toFile('assets/splash-dark.png');
await sharp(Buffer.from(full(512))).png().toFile('public/icon-512.png');
console.log('icons done');
