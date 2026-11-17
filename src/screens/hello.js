import { h, owl } from '../ui.js';
import { states, greetings, flagUrl, byId } from '../data.js';
import { speak } from '../speech.js';
import { sfx } from '../sfx.js';
import { openCard } from '../card.js';

const LANG_AR = {
  ara: 'العربية', eng: 'الإنجليزية', fra: 'الفرنسية', spa: 'الإسبانية', por: 'البرتغالية', deu: 'الألمانية', ita: 'الإيطالية',
  nld: 'الهولندية', rus: 'الروسية', zho: 'الصينية', jpn: 'اليابانية', kor: 'الكورية', tur: 'التركية', fas: 'الفارسية', prs: 'الدارية',
  pus: 'البشتو', urd: 'الأردية', hin: 'الهندية', ben: 'البنغالية', ind: 'الإندونيسية', msa: 'الملايوية', swa: 'السواحيلية',
  amh: 'الأمهرية', som: 'الصومالية', hau: 'الهوسا', ell: 'اليونانية', swe: 'السويدية', nor: 'النرويجية', nob: 'النرويجية', nno: 'النرويجية',
  dan: 'الدنماركية', fin: 'الفنلندية', isl: 'الآيسلندية', pol: 'البولندية', ces: 'التشيكية', slk: 'السلوفاكية', hun: 'المجرية',
  ron: 'الرومانية', bul: 'البلغارية', srp: 'الصربية', hrv: 'الكرواتية', bos: 'البوسنية', slv: 'السلوفينية', ukr: 'الأوكرانية',
  bel: 'البيلاروسية', kat: 'الجورجية', hye: 'الأرمنية', aze: 'الأذربيجانية', kaz: 'الكازاخية', uzb: 'الأوزبكية', kir: 'القيرغيزية',
  tgk: 'الطاجيكية', tuk: 'التركمانية', mon: 'المنغولية', tha: 'التايلاندية', vie: 'الفيتنامية', khm: 'الخميرية', lao: 'اللاوية',
  mya: 'البورمية', nep: 'النيبالية', sin: 'السنهالية', tam: 'التاميلية', fil: 'الفلبينية', heb: 'العبرية', kin: 'الكينيارواندية',
  run: 'الكيروندية', mlg: 'الملغاشية', afr: 'الأفريكانية', zul: 'الزولو', sqi: 'الألبانية', mkd: 'المقدونية', lit: 'الليتوانية',
  lav: 'اللاتفية', est: 'الإستونية', gle: 'الأيرلندية', mlt: 'المالطية', ltz: 'اللوكسمبورغية', cat: 'الكتالونية', div: 'الديفهي',
  tir: 'التغرينية', dzo: 'الدزونغخا', smo: 'الساموية', ton: 'التونغية', fij: 'الفيجية', mri: 'الماورية', sna: 'الشونا',
  nya: 'التشيتشيوا', sot: 'السوتو', tsn: 'التسوانا', ssw: 'السواتية', wol: 'الولوفية', tet: 'التيتوم', grn: 'الغوارانية',
  que: 'الكيتشوا', hat: 'الكريولية الهايتية',
};

export function helloScreen(root) {
  const groups = {};
  for (const c of states) (groups[c.greet] ||= []).push(c);
  const order = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  root.append(owl('في كل بلد يقول الناس "مرحباً" بطريقة مختلفة. المس البطاقة لتسمعها!'));
  const grid = h('div', { class: 'hello-grid' });
  for (const k of order) {
    const g = greetings[k]; if (!g) continue;
    const cs = groups[k];
    grid.append(h('div', { class: 'hello-card', onclick: () => { sfx('tap'); speak(g.t, g.lang); } },
      h('div', { class: 'hg' }, h('b', { dir: 'auto' }, g.t), h('span', { class: 'say' }, '🔊')),
      g.t !== g.ar ? h('small', { class: 'tr' }, 'تُنطق: ' + g.ar) : null,
      h('div', { class: 'hl' }, 'اللغة ' + (LANG_AR[k] || k)),
      h('div', { class: 'hflags' }, cs.slice(0, 8).map((c) => h('img', { src: flagUrl(c.f), alt: c.ar, title: c.ar, onclick: (e) => { e.stopPropagation(); openCard(c.id); } })),
        cs.length > 8 ? h('span', {}, '+' + (cs.length - 8).toLocaleString('ar-EG')) : null)));
  }
  root.append(grid);
  void byId;
}
