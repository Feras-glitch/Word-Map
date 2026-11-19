// (منطق خالص بلا اعتماد على المتصفح، ليُختبر آلياً)
// الرحلات: مسار مرتب من القريب إلى البعيد. البداية من فلسطين وجيرانها، ثم الوطن العربي، ثم قارة قارة.

const ARAB = [
  { id: 'pal', icon: '🕌', title: 'فلسطين وجيرانها', sub: 'من القدس نبدأ', ids: ['PSE', 'JOR', 'SYR', 'LBN', 'EGY'] },
  { id: 'arabia', icon: '🐪', title: 'الجزيرة العربية والعراق', sub: 'من الحجاز إلى دجلة والفرات', ids: ['SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'BHR', 'KWT', 'IRQ'] },
  { id: 'arab-africa', icon: '🌴', title: 'العرب في أفريقيا', sub: 'من النيل إلى المحيط الأطلسي', ids: ['SDN', 'LBY', 'TUN', 'DZA', 'MAR', 'MRT', 'SOM', 'DJI', 'COM'] },
];
const taken = new Set(ARAB.flatMap((j) => j.ids));

// رحلات القارات: ما بقي من دول كل قارة، المشهورة أولاً ثم الأكبر. المستويان الأول والثاني يريان دول مستواهما فقط
export function buildJourneys({ states, byId, continents, contEmoji, contOrder, pool }, level = 3) {
  const P = new Set(pool(level).map((c) => c.id));
  const cont = contOrder.map((k) => ({
    id: 'cont-' + k, icon: contEmoji[k], title: 'قارة ' + continents[k], sub: '', cont: k,
    ids: states.filter((c) => c.cont === k && !taken.has(c.id) && (level >= 3 || P.has(c.id)))
      .sort((a, b) => (b.famous ? 1 : 0) - (a.famous ? 1 : 0) || b.area - a.area).map((c) => c.id),
  })).filter((j) => j.ids.length);
  return [...ARAB.map((j) => ({ ...j, ids: j.ids.filter((id) => byId[id]) })), ...cont];
}
export function stateOf(list, p) {
  list = list.map((j) => {
    const done = j.ids.filter((id) => p.stamps?.[id]).length;
    return { ...j, done, total: j.ids.length, complete: done === j.ids.length, next: j.ids.find((id) => !p.stamps?.[id]) || null };
  });
  return { list, current: list.find((j) => !j.complete) || null };
}
