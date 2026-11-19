// الاستوديوهات الصوتية الثلاثة:
//  - استوديو الأهل (من لوحة الوالدين): تسجيلات العائلة، واعتماد تسجيلات الأولاد، وتصدير الحزمة ونقلها بين أجهزة العائلة.
//  - استوديو الطفل: يسجّل الطفل الأسماء والتحيات بصوته، ويختار بصوت مَن يسمع التطبيق، ويتبادل ملفات الأصوات مع إخوته.
//  - استوديو المطور (برمز خاص): يسجّل الحزمة الرسمية ويصدّرها لترفع إلى GitHub فتُدمج في التطبيق.
// أصوات الأطفال والأهل لا تُرفع إلى المستودع العام أبداً.
import { h, modal, toast } from '../ui.js';
import { toFem } from '../gender.js';
import { store as _st } from '../store.js';
// الاستوديو يُعرض بنصوصه الأصلية؛ ما يخاطب الطفل فيه يؤنَّث صراحة
const gtx = (t) => (_st.me?.gender === 'f' ? toFem(t) : t);
import { store, pinHash } from '../store.js';
import { catalog, GROUPS } from '../voicecatalog.js';
import { putClip, delClip, listPack, listPacks, playClip, startRecording, analyze, exportPack, parsePack, importPack, conflictsOf, devIndex, getClip, keyOf } from '../voice.js';
import { saveFile, pickTextFile } from '../save.js';
import { speak } from '../speech.js';
import { parentLock } from '../lock.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const today = () => new Date().toLocaleDateString('en-CA');
const PAGE = 30;

export function studioScreen(root, { go, params }) {
  const mode = location.hash.split('?')[1]?.match(/m=(\w+)/)?.[1] || 'child';
  if (mode === 'family') return parentLock(() => run('family'), () => go('home', { replace: true }));
  if (mode === 'dev') return parentLock(() => devGate(), () => go('home', { replace: true }));
  run('child');

  function devGate() {
    const has = store.parent.devHash; let entered = false;
    const inp = h('input', { class: 'input', type: 'password', placeholder: has ? 'رمز المطور' : 'اختر رمزاً للمطور (٦ أحرف أو أكثر)', dir: 'ltr' });
    const d = modal(h('div', { class: 'panel' }, h('h3', {}, '🛠️ استوديو المطور'),
      h('p', { class: 'hint' }, has ? 'أدخل رمز المطور.' : 'هذا الرمز مختلف عن رقم الوالدين، ويحمي الحزمة الرسمية التي تُدمج في التطبيق.'), inp,
      h('button', { class: 'btn big', onclick: () => {
        const v = inp.value.trim();
        if (!has) { if (v.length < 6) return toast('الرمز قصير'); store.setParent({ devHash: pinHash('dev:' + v) }); entered = true; d.close(); return run('dev'); }
        if (pinHash('dev:' + v) !== has) { inp.value = ''; return toast('الرمز غير صحيح'); }
        entered = true; d.close(); run('dev');
      } }, 'دخول')), { onClose: () => { if (!entered) go('home', { replace: true }); } });
  }

  async function run(m) {
    const me = store.me;
    const pack = m === 'family' ? 'family' : m === 'dev' ? 'dev' : 'child:' + me.name;
    const items = catalog({ child: m === 'child' });
    let mine = new Map((await listPack(pack).catch(() => [])).map((c) => [c.key, c]));
    let group = m === 'child' ? 'names' : 'phrases', onlyMissing = false, q = '', shown = PAGE, recording = null;
    const head = h('div', { class: 'studio-head' });
    const list = h('div', { class: 'studio-list' });
    const extra = h('div', {});
    root.innerHTML = '';
    root.append(h('div', { class: 'studio' }, head, extra, list));

    const title = { family: '🎙️ استوديو الأهل', child: `🎙️ استوديو ${me.avatar} ${me.name}`, dev: '🛠️ استوديو المطور' }[m];
    const intro = {
      family: 'سجّلوا الأسماء والعبارات بأصواتكم، فيسمعها الأولاد بدل القراءة الآلية. تسجيلاتكم تبقى على هذا الجهاز، وتنقلونها إلى أجهزة العائلة بملف.',
      child: gtx('سجّل الأسماء بصوتك! كل اسم تسجّله تمرين على نطقه. يمكنك أن تسمع التطبيق بصوتك، أو بصوت إخوتك.'),
      dev: 'الحزمة الرسمية: تُصدَّر ملفاً، ثم تُرفع إلى مجلد content/audio-inbox في GitHub، فتُدمج في التطبيق عند البناء التالي.',
    }[m];

    function drawHead() {
      const visible = items.filter((x) => x.group === group);
      const done = visible.filter((x) => mine.has(x.key)).length;
      const total = items.filter((x) => mine.has(x.key)).length;
      head.replaceChildren(
        h('h2', {}, title), h('p', { class: 'hint' }, intro),
        h('div', { class: 'studio-progress' }, h('b', {}, `سُجّل ${ar(total)} من ${ar(items.length)}`), h('div', { class: 'bar' }, h('i', { style: { width: (total / items.length) * 100 + '%' } }))),
        h('div', { class: 'row wrap' },
          h('select', { class: 'input', onchange: (e) => { group = e.target.value; shown = PAGE; drawHead(); drawList(); } },
            Object.entries(GROUPS).filter(([k]) => items.some((x) => x.group === k)).map(([k, t]) => h('option', { value: k, selected: k === group || null }, t))),
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: onlyMissing || null, onchange: (e) => { onlyMissing = e.target.checked; shown = PAGE; drawList(); } }), ' الناقص فقط'),
          h('input', { class: 'input', type: 'search', placeholder: '🔎 بحث', value: q, oninput: (e) => { q = e.target.value.trim(); shown = PAGE; drawList(); } })),
        h('small', { class: 'hint' }, `في هذا القسم: ${ar(done)} من ${ar(visible.length)}`));
    }

    function drawList() {
      let xs = items.filter((x) => x.group === group);
      if (onlyMissing) xs = xs.filter((x) => !mine.has(x.key));
      if (q) xs = xs.filter((x) => x.text.includes(q) || (x.sub || '').includes(q));
      list.replaceChildren(...xs.slice(0, shown).map(row), xs.length > shown ? h('button', { class: 'btn soft', onclick: () => { shown += PAGE; drawList(); } }, `المزيد (${ar(xs.length - shown)})`) : null);
    }

    function row(x) {
      const c = mine.get(x.key);
      const dev = devIndex[x.key];
      const status = c ? (m === 'child' && !c.approved ? '🕓 بصوتك (لم يعتمده الأهل بعد)' : '✅ مسجّل') : dev && m !== 'dev' ? '🏷️ مسجّل من المطور' + (dev.by ? ': ' + dev.by : '') : '⬜ لم يُسجّل';
      const btnRec = h('button', { class: 'rec-btn', 'aria-label': 'تسجيل' }, '⏺');
      btnRec.onclick = async () => {
        if (recording && recording.key !== x.key) return toast('أنهِ التسجيل الحالي أولاً');
        if (!recording) {
          try { recording = { key: x.key, r: await startRecording() }; btnRec.textContent = '⏹'; btnRec.classList.add('on'); }
          catch { toast('لا يمكن استعمال الميكروفون هنا. اسمح للتطبيق باستعماله، أو استورد ملفاً صوتياً'); recording = null; }
          return;
        }
        const blob = await recording.r.stop(); recording = null; btnRec.textContent = '⏺'; btnRec.classList.remove('on');
        await saveBlob(x, blob);
      };
      return h('div', { class: 'srow' + (c ? ' done' : '') },
        h('div', { class: 'stext' },
          h('b', { dir: 'auto' }, x.voc || x.text),
          h('small', {}, [x.lang.split('-')[0].toUpperCase(), x.sub, x.hint ? 'تُنطق: ' + x.hint : '', x.meaning].filter(Boolean).join(' · ')),
          h('small', { class: 'st' }, status)),
        h('div', { class: 'sbtns' },
          h('button', { 'aria-label': 'استمع', onclick: () => (c ? playClip(c) : speak(x.text, x.lang)) }, '▶'),
          btnRec,
          m !== 'child' ? h('button', { 'aria-label': 'استيراد ملف', onclick: () => importAudio(x) }, '📂') : null,
          c ? h('button', { 'aria-label': 'حذف', onclick: async () => { await delClip(pack, x.key); mine.delete(x.key); drawHead(); drawList(); } }, '🗑') : null));
    }

    async function saveBlob(x, blob) {
      try {
        const a = await analyze(blob);
        if (a.silent) return toast('لم يُسمع صوت. اقترب من الميكروفون وحاول مرة أخرى');
        if (a.trim[1] - a.trim[0] > 40) return toast('التسجيل طويل جداً');
        const clip = { pack, key: x.key, text: x.text, lang: x.lang, mime: blob.type || 'audio/webm', blob, trim: a.trim, gain: a.gain, by: m === 'child' ? me.name : m === 'dev' ? 'المطور' : 'العائلة', date: new Date().toISOString(), approved: m !== 'child' };
        await putClip(clip);
        mine.set(x.key, { ...clip, id: pack + '|' + x.key });
        playClip(mine.get(x.key));
        if (m === 'child') store.patch((p) => { p.recorded = (p.recorded || 0) + 1; });
        drawHead(); drawList();
      } catch { toast('تعذّر حفظ التسجيل'); }
    }
    function importAudio(x) {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'audio/*';
      i.onchange = () => { const f = i.files?.[0]; if (f) saveBlob(x, f); };
      i.click();
    }

    // ---------- أدوات كل استوديو ----------
    async function drawExtra() {
      const parts = [];
      if (m === 'child') {
        // بصوت مَن أسمع التطبيق؟
        const packs = (await listPacks().catch(() => [])).filter((p) => p.startsWith('child:'));
        const cur = me.voice || 'family';
        const opt = (v, t) => h('button', { class: 'btn small' + (cur === v ? '' : ' soft'), onclick: () => { store.patch((p) => { p.voice = v; }); drawExtra(); speak('أهلاً بك في مستكشف العالم'); } }, t);
        parts.push(h('div', { class: 'panel' }, h('h4', {}, gtx('🔊 بصوت مَن تسمع التطبيق؟')),
          h('div', { class: 'row wrap' }, opt('family', 'صوت العائلة'), opt('child:' + me.name, 'صوتي أنا'),
            ...packs.filter((p) => p !== 'child:' + me.name).map((p) => opt(p, 'صوت ' + p.slice(6))), packs.length > 1 ? opt('kids', 'أصوات الإخوة معاً') : null),
          h('p', { class: 'hint' }, 'ما لم يُسجَّل بالصوت الذي تختاره يُقرأ بصوت العائلة، ثم المطور، ثم القراءة الآلية. وتسجيلات إخوتك لا تُسمع إلا بعد أن يعتمدها الأهل.')));
        parts.push(h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: async () => { await saveFile(`صوت-${me.name}-${today()}.json`, await exportPack(pack, { kind: 'child', by: me.name })); } }, '📤 صدّر ملف صوتي'),
          h('button', { class: 'btn soft', onclick: () => importFile('child') }, '📥 استورد ملف صوت إخوتي')));
        if ((me.recorded || 0) >= 20) parts.push(h('p', { class: 'badge-row' }, gtx('🎙️ شارة «صوت المستكشف»: سجّلتَ ') + ar(me.recorded) + ' مقطعاً!'));
      }
      if (m === 'family') {
        const pend = [];
        for (const p of (await listPacks().catch(() => [])).filter((x) => x.startsWith('child:'))) for (const c of await listPack(p)) if (!c.approved) pend.push(c);
        parts.push(h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: async () => { await saveFile(`أصوات-العائلة-${today()}.json`, await exportPack('family', { kind: 'family', by: 'العائلة' })); } }, '📤 صدّر حزمة العائلة'),
          h('button', { class: 'btn soft', onclick: () => importFile('family') }, '📥 استورد حزمة (عائلة أو طفل)')));
        if (pend.length) parts.push(h('div', { class: 'panel' }, h('h4', {}, `👂 تسجيلات الأولاد بانتظار الاعتماد (${ar(pend.length)})`),
          h('p', { class: 'hint' }, 'استمعوا، واعتمدوا ما كان نطقه صحيحاً، حتى يسمعه الإخوة. تسجيل الطفل يسمعه هو بصوته دون اعتماد.'),
          ...pend.slice(0, 40).map((c) => h('div', { class: 'srow' }, h('div', { class: 'stext' }, h('b', { dir: 'auto' }, c.text), h('small', {}, c.by)),
            h('div', { class: 'sbtns' }, h('button', { onclick: () => playClip(c) }, '▶'),
              h('button', { onclick: async () => { await putClip({ ...c, approved: true }); drawExtra(); } }, '✓'),
              h('button', { onclick: async () => { await delClip(c.pack, c.key); drawExtra(); } }, '✕'))))));
      }
      if (m === 'dev') {
        parts.push(h('div', { class: 'panel' },
          h('p', {}, `🏷️ في التطبيق الآن ${ar(Object.keys(devIndex).length)} مقطعاً من المطور.`),
          h('ol', { class: 'about-list' },
            h('li', {}, 'سجّل ما تريد هنا، ثم اضغط «صدّر حزمة المطور».'),
            h('li', {}, 'افتح مستودع Word-Map على GitHub ← مجلد content/audio-inbox ← Add file ← Upload files، وارفع الملف.'),
            h('li', {}, 'البناء التلقائي يفحص الحزمة ويدمجها في نسخ أندرويد وويندوز والويب.')),
          h('p', { class: 'hint' }, 'لا ترفع أبداً أصوات الأطفال: المستودع عام يراه الجميع.'),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn', onclick: async () => { await saveFile(`dev-voices-${today()}.json`, await exportPack('dev', { kind: 'dev', by: 'المطور' })); } }, '📤 صدّر حزمة المطور'),
            h('button', { class: 'btn soft', onclick: () => importFile('dev') }, '📥 استورد حزمة مطور'))));
      }
      extra.replaceChildren(...parts);
    }

    // ---------- الاستيراد مع حل التعارض ----------
    async function importFile(kind) {
      const t = await pickTextFile(); if (!t) return;
      const P = parsePack(t); if (P.error) return toast(P.error);
      let target = kind === 'dev' ? 'dev' : P.kind === 'child' ? 'child:' + (P.by || 'طفل') : 'family';
      if (kind === 'child' && P.kind !== 'child') return toast('هذا ليس ملف صوت طفل');
      if (kind === 'family' && P.kind === 'dev') return toast('حزمة المطور تُستورد من استوديو المطور');
      const conf = await conflictsOf(P, target);
      const finish = async (mode) => {
        const r = await importPack(P, target, mode, kind === 'child' ? {} : { approved: P.kind === 'family' || P.kind === 'dev' ? true : undefined });
        toast(`أُضيف ${ar(r.added)}، واستُبدل ${ar(r.replaced)}، وبقي ${ar(r.kept)} كما كان`);
        mine = new Map((await listPack(pack)).map((c) => [c.key, c])); drawHead(); drawList(); drawExtra();
      };
      if (!conf.length) return finish('useNew');
      // تعارض: نعرض التسجيلين ويختار الطفل أو الأهل
      const choice = new Map(conf.map((x) => [x.key, 'new']));
      const d = modal(h('div', { class: 'panel' }, h('h3', {}, `${ar(conf.length)} تسجيلاً موجوداً من قبل`),
        h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => { d.close(); finish('useNew'); } }, 'خذ الجديد كله'), h('button', { class: 'btn small soft', onclick: () => { d.close(); finish('keepOld'); } }, 'أبقِ القديم كله')),
        ...conf.slice(0, 50).map((x) => h('div', { class: 'srow' }, h('div', { class: 'stext' }, h('b', { dir: 'auto' }, x.text)),
          h('div', { class: 'sbtns' }, h('button', { onclick: () => playClip(x.old) }, '▶ القديم'), h('button', { onclick: () => playClip({ ...x.neu, id: 'tmp|' + x.key }) }, '▶ الجديد'),
            h('select', { onchange: (e) => choice.set(x.key, e.target.value) }, h('option', { value: 'new' }, 'الجديد'), h('option', { value: 'old' }, 'القديم'))))),
        h('button', { class: 'btn big', onclick: () => { d.close(); finish(choice); } }, 'دمج باختياراتي')));
    }

    drawHead(); drawList(); drawExtra();
  }
}
