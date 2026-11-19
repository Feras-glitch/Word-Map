// التمييز العددي وتذكير الدول: مكان واحد لقواعد العربية بدل تكرارها في كل شاشة
export const A = (n) => n.toLocaleString('ar-EG');

// cnt(5, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤالاً') → «٥ أسئلة»
// الواحد والاثنان بلا رقم، و٣–١٠ جمع، و١١–٩٩ مفرد منصوب، والمئات والآلاف المكتملة مفرد مجرور
export function cnt(n, one, two, few, many, sing) {
  const s = sing || one.split(' ')[0];
  if (!Number.isInteger(n)) return `${A(n)} ${s}`;
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  return `${A(n)} ${r >= 3 && r <= 10 ? few : r >= 11 ? many : s}`;
}

// بعد «نحو» ونحوها: «نحو ٣ ملايين»، «نحو مليونَي»، «نحو ألف»
export function bigNum(x, unit) {
  const U = { m: ['مليون', 'مليونَي', 'ملايين'], k: ['ألف', 'ألفَي', 'آلاف'], b: ['مليار', 'مليارَي', 'مليارات'] }[unit];
  if (!Number.isInteger(x)) return `${A(x)} ${U[0]}`;
  if (x === 1) return U[0];
  if (x === 2) return U[1];
  const r = x % 100;
  return `${A(x)} ${r >= 3 && r <= 10 ? U[2] : U[0]}`;
}

export const times = (n) => cnt(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة');
export const stampsWord = (n) => (n ? cnt(n, 'ختم واحد', 'ختمان', 'أختام', 'ختماً') : 'لا أختام بعد');

// الدول المذكّرة في الاستعمال العربي المشهور؛ وسائرها مؤنث
export const MASC = new Set(['JOR', 'IRQ', 'MAR', 'SDN', 'SSD', 'LBN', 'YEM', 'MNE']);
export const gC = (c, f, m) => (MASC.has(c?.id) ? m : f);
