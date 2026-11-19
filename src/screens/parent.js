// لوحة الوالدين: تقدم كل طفل، تغيير المستوى، الحذف، النسخ الاحتياطي، الرقم السري
import { h, modal, toast } from '../ui.js';
import { store } from '../store.js';
import { states, byId, flagUrl, LEVELS, continents, contEmoji } from '../data.js';
import { skillSummary, weakest, dueReviews, SKILLS, today } from '../mastery.js';
import { saveFile, pickTextFile, copyText } from '../save.js';
import { parentLock, lockNow } from '../lock.js';
import { certStatus } from '../certs.js';
import { gp } from '../gender.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const DAY = 864e5;

export function parentScreen(root, { go }) {
  // الشاشة نفسها محمية: إن وصلها الطفل بالرابط نطلب الرقم
  parentLock(draw, () => { if (location.hash.startsWith('#parent')) go('home', { replace: true }); });

  function draw() {
    root.innerHTML = '';
    const ps = store.profiles;
    root.append(h('div', { class: 'parent-top' },
      h('p', { class: 'hint' }, 'هنا ترى ما تعلمه كل طفل وأين يخطئ، وتحفظ نسخة احتياطية من تقدمهم.'),
      h('button', { class: 'btn small soft', onclick: () => { lockNow(); go('home'); } }, '🔒 قفل والخروج')));
    // تذكير شهري بالنسخة الاحتياطية: التقدم محفوظ على هذا الجهاز وحده
    const lastB = store.parent.lastBackup; const hasProgress = ps.some((p) => Object.keys(p.stamps || {}).length);
    if (hasProgress && (!lastB || Date.now() - lastB > 30 * DAY)) root.append(h('div', { class: 'panel warn' },
      h('b', {}, '💾 ' + (lastB ? 'مرّ أكثر من شهر على آخر نسخة احتياطية.' : 'لم تُحفظ نسخة احتياطية بعد.')),
      h('p', { class: 'hint' }, 'تقدم الأولاد محفوظ على هذا الجهاز وحده، ومسح بيانات التطبيق يمحوه. احفظ نسخة من القسم أدناه.')));
    if (!ps.length) root.append(h('p', { class: 'empty' }, 'لا يوجد مستكشفون بعد.'));
    for (const p of ps) root.append(childPanel(p));
    root.append(h('div', { class: 'panel' }, h('h3', {}, '🎙️ الأصوات'),
      h('p', { class: 'hint' }, 'سجّلوا الأسماء والعبارات بأصواتكم بدل القراءة الآلية، واعتمدوا تسجيلات الأولاد.'),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => go('studio?m=family') }, '🎙️ استوديو الأهل'),
        h('button', { class: 'btn soft', onclick: () => go('studio?m=dev') }, '🛠️ استوديو المطور'))), backupPanel(), pinPanel());
  }

  function childPanel(p) {
    const visits = Object.keys(p.stamps || {}).length, gold = Object.keys(p.gold || {}).length;
    const due = dueReviews(p).length;
    const sum = skillSummary(p);
    const weak = weakest(6, p);
    const certs = certStatus(p).filter((c) => c.visit || c.gold);
    // النشاط في آخر ١٤ يوماً
    const act = p.activity || {};
    const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * DAY).toLocaleDateString('en-CA'));
    const maxQ = Math.max(5, ...days.map((d) => act[d]?.q || 0));
    const active7 = days.slice(7).filter((d) => act[d]?.q).length;
    const total = Object.values(act).reduce((s, a) => s + a.q, 0);
    const lastDay = Object.keys(act).sort().pop();

    return h('div', { class: 'panel child' },
      h('div', { class: 'child-head' }, h('span', { class: 'big-av' }, p.avatar), h('div', {}, h('h3', {}, p.name),
        h('small', {}, LEVELS[p.level].emoji + ' المستوى: ' + LEVELS[p.level].name + (p.placement ? ' · حدّده اختبار المستوى' : '')))),
      h('div', { class: 'stat-row' },
        stat('🛂', ar(visits), 'ختم زيارة'), stat('🥇', ar(gold), 'ختم ذهبي'), stat('🔔', ar(due), 'مراجعة مستحقة'), stat('🎓', ar(certs.length), 'شهادة')),
      h('h4', {}, 'النشاط في آخر أسبوعين'),
      h('div', { class: 'act-bars' }, days.map((d) => {
        const a = act[d]; const q = a?.q || 0;
        return h('div', { class: 'ab', title: d }, h('i', { style: { height: (q / maxQ) * 100 + '%', opacity: q ? 1 : 0.15 } }), h('small', {}, new Date(d).toLocaleDateString('ar-EG', { weekday: 'narrow' })));
      })),
      h('p', { class: 'hint' }, total ? `${gp(p, 'أجاب', 'أجابت')} عن ${ar(total)} سؤالاً إجمالاً، ${gp(p, 'ونشط', 'ونشطت')} ${ar(active7)} من آخر ٧ أيام. آخر نشاط: ${lastDay === today() ? 'اليوم' : new Date(lastDay).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}.` : gp(p, 'لم يُجب', 'لم تُجب') + ' عن أسئلة بعد.'),
      Object.keys(sum).length ? [h('h4', {}, 'المهارات: الإجابة الأولى في الأسئلة (لا تُحسب الألعاب)'), h('p', { class: 'hint' }, 'الخط الرمادي حدّ التخمين: نسبة قريبة منه تعني أن الطفل يخمّن.'), h('div', { class: 'skill-bars' }, Object.entries(SKILLS).filter(([k]) => sum[k]).map(([k, t]) => {
        const x = sum[k]; const n = x.ok + x.bad; const pct = Math.round((x.ok / n) * 100);
        // أقل من ١٠ إجابات لا تكفي لنسبة ذات معنى. والخط الرمادي حدّ التخمين (خيار من ٣ أو ٤)، ولا تخمين في سؤال الخريطة
        if (n < 10) return h('div', { class: 'sb' }, h('span', {}, t), h('div', { class: 'bar' }), h('small', {}, `${ar(n)} فقط، قليلة`));
        return h('div', { class: 'sb' }, h('span', {}, t), h('div', { class: 'bar' }, h('i', { style: { width: pct + '%', background: pct >= 75 ? '#1a9b55' : pct >= 50 ? '#e0a800' : '#e5484d' } }), k === 'map' ? null : h('u', { class: 'chance', title: 'حد التخمين' })), h('small', {}, `${ar(pct)}٪ من ${ar(n)}`));
      }))] : null,
      (() => { let n = 0; for (const m of Object.values(p.practice || {})) for (const x of Object.values(m)) n += x.ok + x.bad; return n ? h('p', { class: 'hint' }, `${gp(p, 'وأجاب', 'وأجابت')} في ألعاب التدريب عن ${ar(n)} سؤالاً (تُعرض منفصلة لأنها تمرين، وقد يرى فيها التلميح أو يحاول مرتين).`) : null; })(),
      weak.length ? [h('h4', {}, gp(p, 'دول يخطئ', 'دول تخطئ') + ' فيها أكثر من غيرها (بنسبة الخطأ، محاولتان على الأقل)'), h('div', { class: 'neighbors' }, weak.map((id) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar)))] : null,
      (p.stories || []).length ? [h('h4', {}, gp(p, 'آخر ما اكتشفه', 'آخر ما اكتشفته') + ' في المهام'), h('ul', { class: 'stories' }, p.stories.slice(0, 6).map((st) => h('li', {}, h('span', {}, st.text + (st.detail ? ' — ' + st.detail : '')), h('small', {}, new Date(st.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })))))] : null,
      h('h4', {}, 'صيغة المخاطبة'),
      h('div', { class: 'levels gender' }, [['m', '👦', 'ولد'], ['f', '👧', 'بنت']].map(([k, e, t]) => h('button', { class: 'lv-btn' + (p.gender === k ? ' on' : ''), onclick: () => { store.updateProfile(p.id, { gender: k }); draw(); } }, h('span', {}, e), h('b', {}, t)))),
      p.gender ? null : h('p', { class: 'hint' }, 'لم تُحدَّد بعد؛ يخاطَب الطفل بصيغة المذكر حتى تختاروا.'),
      h('h4', {}, 'المستوى'),
      h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, L]) => h('button', { class: 'lv-btn' + (+k === p.level ? ' on' : ''), onclick: () => { store.updateProfile(p.id, { level: +k }); draw(); } },
        h('span', {}, L.emoji), h('b', {}, L.name), h('small', {}, L.ages)))),
      h('div', { class: 'row' }, h('button', { class: 'btn small danger', onclick: () => confirmDelete(p) }, '🗑️ حذف ' + p.name)));
  }
  const stat = (e, n, t) => h('div', { class: 'stat' }, h('span', {}, e), h('b', {}, n), h('small', {}, t));

  function confirmDelete(p) {
    const d = modal(h('div', { class: 'panel' }, h('h3', {}, `حذف ${p.name} وكل أختامه؟`), h('p', {}, 'لا يمكن التراجع عن هذا، إلا من نسخة احتياطية.'),
      h('div', { class: 'row' }, h('button', { class: 'btn danger', onclick: () => { d.close(); store.removeProfile(p.id); draw(); } }, 'نعم، احذف'), h('button', { class: 'btn soft', onclick: () => d.close() }, 'إلغاء'))));
  }

  function backupPanel() {
    const last = store.parent.lastBackup;
    return h('div', { class: 'panel' },
      h('h3', {}, '💾 النسخة الاحتياطية'),
      h('p', { class: 'hint' }, 'تحفظ كل الملفات والأختام والتقدم في ملف واحد. احفظها قبل تغيير الجهاز أو مسح بيانات التطبيق. ' + (last ? 'آخر نسخة: ' + new Date(last).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : 'لم تُحفظ نسخة بعد.')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: async () => {
          try { await saveFile(`world-explorer-backup-${today()}.json`, store.exportData()); store.setParent({ lastBackup: Date.now() }); toast('جاهزة. احفظ الملف في مكان آمن'); draw(); }
          catch { toast('تعذّر حفظ الملف؛ استخدم «نسخ رمز النسخة»'); }
        } }, '📤 حفظ ملف نسخة'),
        h('button', { class: 'btn soft', onclick: async () => { if (await copyText(store.exportData())) { store.setParent({ lastBackup: Date.now() }); toast('نُسخ الرمز. الصقه في رسالة لنفسك أو ملاحظة'); } else toast('تعذّر النسخ'); } }, '📋 نسخ رمز النسخة')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn soft', onclick: async () => { const t = await pickTextFile(); if (t) restore(t); } }, '📥 استعادة من ملف'),
        h('button', { class: 'btn soft', onclick: () => {
          const ta = h('textarea', { class: 'paste', placeholder: 'الصق رمز النسخة هنا', dir: 'ltr' });
          const d = modal(h('div', { class: 'panel' }, h('h3', {}, 'استعادة من رمز'), ta, h('button', { class: 'btn big', onclick: () => { d.close(); setTimeout(() => restore(ta.value), 260); } }, 'استعادة')));
        } }, '📝 استعادة من رمز')));
  }
  function restore(text) {
    const r = store.parseBackup(text);
    if (r.error) return toast(r.error, 4000);
    const when = r.at ? new Date(r.at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'تاريخ غير معروف';
    const d = modal(h('div', { class: 'panel' }, h('h3', {}, 'استبدال البيانات الحالية بهذه النسخة؟'),
      h('p', {}, 'تاريخ النسخة: ' + when),
      h('ul', { class: 'bk-sum' }, r.summary.map((x) => h('li', {}, `${x.avatar} ${x.name}: ${ar(x.stamps)} ختم زيارة، ${ar(x.gold)} ختم ذهبي`))),
      h('p', { class: 'hint' }, 'ستُستبدل كل الملفات الموجودة الآن. احفظ نسخة من بياناتك الحالية أولاً إن أردت الرجوع إليها.'),
      h('div', { class: 'row' }, h('button', { class: 'btn danger', onclick: () => { d.close(); const err = store.importData(text); toast(err || 'تمت الاستعادة ✓', 4000); if (!err) setTimeout(draw, 300); } }, 'نعم، استبدل'), h('button', { class: 'btn soft', onclick: () => d.close() }, 'إلغاء'))));
  }
  function pinPanel() {
    return h('div', { class: 'panel' }, h('h3', {}, '🔑 الرقم السري'),
      h('p', { class: 'hint' }, 'القفل يمنع الأولاد من تغيير المستوى أو حذف الملفات، وليس حماية أمنية. لا يُحفظ الرقم داخل النسخة الاحتياطية، وتبقى اللوحة مفتوحة عشر دقائق ثم تُقفل.'),
      h('button', { class: 'btn soft', onclick: () => { store.setParent({ pinHash: null }); lockNow(); parentLock(draw); } }, 'تغيير الرقم السري'));
  }
}
