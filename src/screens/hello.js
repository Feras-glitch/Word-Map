import { h, owl } from '../ui.js';
import { states, greetings, flagUrl, byId, contOrder, contEmoji, continents } from '../data.js';
import { store } from '../store.js';
import { speak } from '../speech.js';
import { sfx } from '../sfx.js';
import { openCard } from '../card.js';
import { cnt } from '../arnum.js';

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
  const me = store.me;
  const card = (k) => {
    const g = greetings[k]; if (!g) return null;
    const cs = groups[k];
    return h('div', { class: 'hello-card', 'data-q': (LANG_AR[k] || '') + ' ' + cs.map((c) => c.ar).join(' ') + ' ' + g.t, onclick: () => { sfx('tap'); speak(g.t, g.lang); } },
      h('div', { class: 'hg' }, h('b', { dir: 'auto' }, g.t), h('span', { class: 'say' }, '🔊')),
      g.t !== g.ar ? h('small', { class: 'tr' }, 'تُنطق: ' + g.ar) : null,
      h('div', { class: 'hl' }, 'اللغة ' + (LANG_AR[k] || k)),
      h('div', { class: 'hflags' }, cs.slice(0, 8).map((c) => h('img', { src: flagUrl(c.f), alt: c.ar, title: c.ar, onclick: (e) => { e.stopPropagation(); openCard(c.id); } })),
        cs.length > 8 ? h('span', {}, '+' + (cs.length - 8).toLocaleString('ar-EG')) : null));
  };
  // تحيات الدول التي زارها الطفل أولاً، ثم الباقي حسب القارة (كل لغة في القارة التي فيها أكثر دولها)
  const keys = Object.keys(groups).filter((k) => greetings[k]);
  const visited = keys.filter((k) => groups[k].some((c) => me?.stamps?.[c.id])).sort((a, b) => groups[b].length - groups[a].length);
  const contOf = (k) => { const n = {}; for (const c of groups[k]) n[c.cont] = (n[c.cont] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; };
  const box = h('div', {});
  const section = (title, ks, open) => (ks.length ? h('details', { class: 'hello-sec', open: open || null }, h('summary', {}, h('b', {}, title), h('small', {}, cnt(ks.length, 'تحية واحدة', 'تحيتان', 'تحيات', 'تحية'))), h('div', { class: 'hello-grid' }, ks.map(card))) : null);
  const search = h('input', { class: 'input', type: 'search', placeholder: '🔎 ابحث عن لغة أو دولة…', oninput: () => {
    const q = search.value.trim();
    box.querySelectorAll('.hello-card').forEach((el) => { el.style.display = !q || el.dataset.q.includes(q) ? '' : 'none'; });
    if (q) box.querySelectorAll('details').forEach((d) => { d.open = true; });
  } });
  box.append(...[section('⭐ من الدول التي زرتها', visited, true),
    ...contOrder.map((cont, i) => section(contEmoji[cont] + ' ' + continents[cont], keys.filter((k) => !visited.includes(k) && contOf(k) === cont).sort((a, b) => groups[b].length - groups[a].length), !visited.length && i === 0))].filter(Boolean));
  root.append(owl('في كل بلد يقول الناس "مرحباً" بطريقة مختلفة. المس البطاقة لتسمعها!'), search, box);
  void byId;
}
