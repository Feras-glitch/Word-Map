// أدلة «ابحث عن بلدي»: كل دليل جملة يسمعها الطفل، واختبار يحدد هل تنطبق على أي دولة.
// كل الأدلة مأخوذة من بيانات راجعها مراجع مستقل (القارة، الساحل، الأنهار والجبال، الجيران، العاصمة، المعالم).
import { states, byId, continents } from './data.js';
import { NAT } from './map.js';

const CASPIAN = ['AZE', 'KAZ', 'TKM'];
const bare = (t) => (t || '').replace(/\s*\(.*\)\s*/, '').replace(/^ال/, '').trim();
const LETTERS = { ا: 'الألف', ب: 'الباء', ت: 'التاء', ث: 'الثاء', ج: 'الجيم', ح: 'الحاء', خ: 'الخاء', د: 'الدال', ذ: 'الذال', ر: 'الراء', ز: 'الزاي', س: 'السين', ش: 'الشين', ص: 'الصاد', ض: 'الضاد', ط: 'الطاء', ظ: 'الظاء', ع: 'العين', غ: 'الغين', ف: 'الفاء', ق: 'القاف', ك: 'الكاف', ل: 'اللام', م: 'الميم', ن: 'النون', ه: 'الهاء', و: 'الواو', ي: 'الياء' };
const first = (t) => { const ch = bare(t)[0] || ''; return 'أإآ'.includes(ch) ? 'ا' : ch; };
const natOk = () => NAT.countriesReviewed;
const NAT_PRI = { river: 0, desert: 1, range: 2, lake: 3, peak: 4 };
const natText = (it) => ({ river: `يجري ${it.ar} في أرضي`, lake: `تطل أرضي على ${it.ar}`, desert: `في أرضي جزء من ${it.ar}`, range: `في أرضي جزء من ${it.ar}`, peak: `في أرضي ${it.ar}` })[it.kind];

// كل الأدلة الممكنة لدولة
export function cluesFor(c) {
  const out = [];
  out.push({ kind: 'cont', icon: '🌍', text: `أنا في قارة ${continents[c.cont]}`, test: (x) => x.cont === c.cont || x.cont2 === c.cont });
  if (!CASPIAN.includes(c.id)) {
    out.push(c.landlocked
      ? { kind: 'coast', icon: '🏔️', text: 'ليس لأرضي ساحل على أي بحر', test: (x) => x.landlocked && !CASPIAN.includes(x.id) }
      : { kind: 'coast', icon: '🏖️', text: 'لأرضي ساحل على البحر', test: (x) => !x.landlocked });
  }
  if (natOk()) {
    const its = NAT.items.filter((it) => it.countries?.includes(c.id) && NAT_PRI[it.kind] != null).sort((a, b) => NAT_PRI[a.kind] - NAT_PRI[b.kind]);
    for (const it of its.slice(0, 3)) out.push({ kind: 'nature', nat: it.id, icon: NAT.kinds[it.kind].icon, text: natText(it), test: (x) => it.countries.includes(x.id) });
  }
  for (const nid of c.borders.filter((b) => byId[b]?.kind === 'state').slice(0, 3)) {
    const n = byId[nid];
    out.push({ kind: 'neighbor', nb: nid, icon: '🤝', text: `من جيراني ${n.ar}`, test: (x) => x.borders.includes(nid) });
  }
  const L = first(c.capAr);
  if (LETTERS[L] && c.capQ !== null) out.push({ kind: 'capital', icon: '🏛️', text: `اسم عاصمتي يبدأ بحرف ${LETTERS[L]} (${L})`, test: (x) => first(x.capAr) === L });
  if (c.landmark) out.push({ kind: 'landmark', icon: '⭐', text: `من معالمي المشهورة: ${c.landmark}`, test: (x) => x.id === c.id });
  return out;
}

// سلسلة أدلة متدرجة من العام إلى الخاص: قارة، ساحل، طبيعة، جار، عاصمة، معلم
export function clueChain(c, level = 2) {
  const all = cluesFor(c);
  const pickOne = (k) => all.find((x) => x.kind === k);
  const chain = [pickOne('cont'), pickOne('coast'), pickOne('nature'), pickOne('neighbor'), level > 1 ? pickOne('capital') : null, pickOne('landmark')].filter(Boolean);
  // نحذف دليلاً لا يضيّق البحث (لا يغيّر عدد الدول المرشحة)
  const outC = []; let cand = states;
  for (const cl of chain) { const next = cand.filter(cl.test); if (next.length < cand.length || cl.kind === 'landmark') { outC.push(cl); cand = next; } }
  return outC;
}

export const candidates = (clues) => states.filter((x) => clues.every((cl) => cl.test(x)));
