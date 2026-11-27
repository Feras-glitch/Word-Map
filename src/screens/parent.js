// لوحة الوالدين: تقدم كل طفل، تغيير المستوى، الحذف، النسخ الاحتياطي، الرقم السري
import { h, modal, toast } from '../ui.js';
import { store } from '../store.js';
import { states, byId, flagUrl, LEVELS, continents, contEmoji } from '../data.js';
import { skillSummary, weakest, dueReviews, SKILLS, today } from '../mastery.js';
import { saveFile, pickTextFile, copyText } from '../save.js';
import { autoBackup } from '../autobackup.js';
import { Capacitor } from '@capacitor/core';
import { parentLock, lockNow, editSecret } from '../lock.js';
import { SUBJECTS, subjectsFor, itemsOf, recsOf, coverageOf, scopesFor } from '../exams.js';
import { weakItems } from '../exams-core.js';
import { coverBar, familyGoalBar } from './exams.js';
import { knowledgeById, natureById } from '../exam-questions.js';
import { dinnerQuestions, weekSummary, practiceErrors, itemName } from '../parent-insights.js';
import { certStatus } from '../certs.js';
import { gp } from '../gender.js';
import { cnt } from '../arnum.js';

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
    if (hasProgress && (!lastB || Date.now() - lastB > 14 * DAY) && !(store.parent.autoBackup && Date.now() - store.parent.autoBackup.at < 14 * DAY)) root.append(h('div', { class: 'panel warn' },
      h('b', {}, '💾 ' + (lastB ? 'مرّ أكثر من أسبوعين على آخر نسخة احتياطية.' : 'لم تُحفظ نسخة احتياطية بعد.')),
      h('p', { class: 'hint' }, 'تقدم الأولاد محفوظ على هذا الجهاز وحده، ومسح بيانات التطبيق يمحوه. احفظ نسخة من القسم أدناه.')));
    // تنبيه دائم إن تغيّر الرقم السري عن طريق «نسيت الرقم»
    const pc = store.parent.pinChange;
    if (pc?.via === 'forgot' && !pc.seen) root.append(h('div', { class: 'panel warn' },
      h('b', {}, '⚠️ تغيّر الرقم السري عن طريق «نسيت الرقم؟» يوم ' + new Date(pc.at).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })),
      h('p', { class: 'hint' }, 'إن لم تكن أنت من غيّره، فقد يكون أحد الأولاد عرف جواب سؤال الاسترجاع. غيّر الرقم والسؤال من قسم «الرقم السري».'),
      h('button', { class: 'btn small soft', onclick: () => { store.setParent({ pinChange: { ...pc, seen: true } }); draw(); } }, 'أنا من غيّره')));
    if (!ps.length) root.append(h('p', { class: 'empty' }, 'لا يوجد مستكشفون بعد.'));
    if (ps.length) root.append(h('div', { class: 'panel' }, h('h3', {}, '📅 هذا الأسبوع'),
      h('ul', { class: 'week-sum' }, ps.map((p) => h('li', {}, h('b', {}, p.avatar + ' ' + p.name + ': '), weekSummary(p)))),
      familyGoalBar() || '',
      h('button', { class: 'btn', onclick: () => dinner() }, '🍽️ أسئلة العشاء')));
    for (const p of ps) root.append(childPanel(p));
    const devBtn = h('button', { class: 'btn soft', style: { display: 'none' }, onclick: () => go('studio?m=dev') }, '🛠️ استوديو المطور');
    let lp = null; const voiceH = h('h3', { onpointerdown: () => { lp = setTimeout(() => { devBtn.style.display = ''; toast('ظهر استوديو المطور'); }, 900); }, onpointerup: () => clearTimeout(lp), onpointerleave: () => clearTimeout(lp) }, '🎙️ الأصوات');
    root.append(h('div', { class: 'panel' }, voiceH,
      h('p', { class: 'hint' }, 'سجّلوا الأسماء والعبارات بأصواتكم بدل القراءة الآلية، واعتمدوا تسجيلات الأولاد.'),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => go('studio?m=family') }, '🎙️ استوديو الأهل'),
        devBtn)), backupPanel(), timePanel(), pinPanel());
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
      h('p', { class: 'hint' }, total ? `${gp(p, 'أجاب', 'أجابت')} عن ${cnt(total, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤالاً')} إجمالاً، ${gp(p, 'ونشط', 'ونشطت')} في ${cnt(active7, 'يوم واحد', 'يومين', 'أيام', 'يوماً')} من آخر سبعة أيام. آخر نشاط: ${lastDay === today() ? 'اليوم' : new Date(lastDay).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}.` : gp(p, 'لم يُجب', 'لم تُجب') + ' عن أسئلة بعد.'),
      Object.keys(sum).length ? [h('h4', {}, 'المهارات: الإجابة الأولى في الأسئلة (لا تُحسب الألعاب)'), h('p', { class: 'hint' }, 'الخط الرمادي حدّ التخمين: نسبة قريبة منه تعني أن الطفل يخمّن.'), h('div', { class: 'skill-bars' }, Object.entries(SKILLS).filter(([k]) => sum[k]).map(([k, t]) => {
        const x = sum[k]; const n = x.ok + x.bad; const pct = Math.round((x.ok / n) * 100);
        // أقل من ١٠ إجابات لا تكفي لنسبة ذات معنى. والخط الرمادي حدّ التخمين (خيار من ٣ أو ٤)، ولا تخمين في سؤال الخريطة
        if (n < 10) return h('div', { class: 'sb' }, h('span', {}, t), h('div', { class: 'bar' }), h('small', {}, `${cnt(n, 'إجابة واحدة', 'إجابتان', 'إجابات', 'إجابة')} فقط، قليلة`));
        return h('div', { class: 'sb' }, h('span', {}, t), h('div', { class: 'bar' }, h('i', { style: { width: pct + '%', background: pct >= 75 ? '#1a9b55' : pct >= 50 ? '#e0a800' : '#e5484d' } }), k === 'map' ? null : h('u', { class: 'chance' + (k === 'compare' ? ' half' : ''), title: 'حد التخمين' })), h('small', {}, `${ar(pct)}٪ من ${ar(n)}`));
      }))] : null,
      (() => { let n = 0; for (const m of Object.values(p.practice || {})) for (const x of Object.values(m)) n += x.ok + x.bad; return n ? h('p', { class: 'hint' }, `${gp(p, 'وأجاب', 'وأجابت')} في ألعاب التدريب عن ${cnt(n, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤالاً')} (تُعرض منفصلة لأنها تمرين، وقد يرى فيها التلميح أو يحاول مرتين).`) : null; })(),
      weak.length ? [h('h4', {}, gp(p, 'دول يخطئ', 'دول تخطئ') + ' فيها أكثر من غيرها (بنسبة الخطأ، محاولتان على الأقل)'), h('div', { class: 'neighbors' }, weak.map((id) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar)))] : null,
      (p.stories || []).length ? [h('h4', {}, gp(p, 'آخر ما اكتشفه', 'آخر ما اكتشفته') + ' في المهام'), h('ul', { class: 'stories' }, p.stories.slice(0, 6).map((st) => h('li', {}, h('span', {}, st.text + (st.detail ? ' — ' + st.detail : '')), h('small', {}, new Date(st.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })))))] : null,
      examReport(p),
      practiceErrors(p).length ? [h('h4', {}, gp(p, 'أخطاؤه', 'أخطاؤها') + ' في ألعاب التمرين'), h('div', { class: 'neighbors' }, practiceErrors(p).map((x) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[x.id].f), alt: '' }), x.text)))] : null,
      h('details', { class: 'child-set' }, h('summary', {}, '⚙️ إعدادات ' + p.name),
      h('h4', {}, 'صيغة المخاطبة'),
      h('div', { class: 'levels gender' }, [['m', '👦', 'ولد'], ['f', '👧', 'بنت']].map(([k, e, t]) => h('button', { class: 'lv-btn' + (p.gender === k ? ' on' : ''), onclick: () => { store.updateProfile(p.id, { gender: k }); draw(); } }, h('span', {}, e), h('b', {}, t)))),
      p.gender ? null : h('p', { class: 'hint' }, 'لم تُحدَّد بعد؛ يخاطَب الطفل بصيغة المذكر حتى تختاروا.'),
      h('h4', {}, 'أسئلة بالأسماء الصينية'),
      h('div', { class: 'levels gender' }, [[false, '🚫', 'لا'], [true, '🇨🇳', 'نعم']].map(([k, e, t]) => h('button', { class: 'lv-btn' + (!!p.zh === k ? ' on' : ''), onclick: () => { store.updateProfile(p.id, { zh: k }); draw(); } }, h('span', {}, e), h('b', {}, t)))),
      h('p', { class: 'hint' }, 'إن فعّلتموها ظهرت أسئلة «ما اسم الدولة بالصينية؟» في ' + gp(p, 'ألعابه', 'ألعابها') + '. وتبقى الأسماء الصينية في البطاقات للجميع.'),
      h('h4', {}, 'المستوى'),
      h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, L]) => h('button', { class: 'lv-btn' + (+k === p.level ? ' on' : ''), onclick: () => { store.updateProfile(p.id, { level: +k }); draw(); } },
        h('span', {}, L.emoji), h('b', {}, L.name), h('small', {}, L.ages)))),
      h('div', { class: 'row' }, h('button', { class: 'btn small danger', onclick: () => confirmDelete(p) }, '🗑️ حذف ' + p.name))));
  }
  // تقرير الاختبارات: تغطية كل مادة، وأضعف العناصر، والاختبارات الكبيرة، واختبار الأسبوع
  function examReport(p) {
    const subs = subjectsFor(p.level);
    const log = (p.examLog || []).filter((x) => x.kind === 'big').slice(0, 5);
    const as = p.assigned;
    return [h('h4', {}, '📝 الاختبارات'),
      h('div', { class: 'ex-rep' }, subs.map((k) => {
        const S = SUBJECTS[k]; const cv = coverageOf(p, k);
        const weak = weakItems(itemsOf(k, p.level), recsOf(p, k), 4);
        return h('div', { class: 'er' }, h('b', {}, S.icon + ' ' + S.title), coverBar(cv),
          h('small', {}, `متقَن ${ar(cv.mastered)} · يتعلّمه ${ar(cv.learning)} · لم يُختبر ${ar(cv.none)}`),
          weak.length ? h('small', { class: 'weak' }, 'أضعفها: ' + weak.map((id) => itemName(k, id)).join('، ')) : null);
      })),
      log.length ? h('ul', { class: 'stories' }, log.map((x) => h('li', {}, h('span', {}, `${x.pass ? '🎓' : '➖'} ${x.title}: ${ar(x.score)} من ${ar(x.total)}`), h('small', {}, new Date(x.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }))))) : null,
      as ? h('p', { class: 'hint' }, `🎯 اختبار الأسبوع: ${SUBJECTS[as.subj].title}${as.scopeTitle ? ' · ' + as.scopeTitle : ''} — ` + (as.done ? `أنجزه: ${ar(as.done.score)} من ${ar(as.done.total)}` : 'لم يُنجز بعد')) : null,
      h('button', { class: 'btn small soft', onclick: () => assign(p) }, '🎯 ' + (as && !as.done ? 'غيّر اختبار الأسبوع' : 'اختر اختبار الأسبوع'))];
  }
  function assign(p) {
    let subj = subjectsFor(p.level)[0]; const scs = scopesFor(p); let sc = scs.find((s) => s.key === 'all');
    const subBox = h('div', { class: 'row wrap' }); const scBox = h('div', { class: 'row wrap' });
    const redraw = () => {
      subBox.replaceChildren(...subjectsFor(p.level).map((k) => h('button', { class: 'chip' + (k === subj ? ' on' : ''), onclick: () => { subj = k; redraw(); } }, SUBJECTS[k].icon + ' ' + SUBJECTS[k].title)));
      scBox.replaceChildren(...(SUBJECTS[subj].country ? scs : [{ key: 'all', title: 'الكل' }]).map((s) => h('button', { class: 'chip' + (s.key === sc?.key ? ' on' : ''), onclick: () => { sc = s; redraw(); } }, s.title)));
    };
    redraw();
    const d = modal(h('div', { class: 'panel' }, h('h3', {}, '🎯 اختبار الأسبوع ل' + p.name), h('p', { class: 'hint' }, 'يظهر له في «اختباراتي» وفي الشاشة الرئيسية، وترى نتيجته هنا.'),
      h('h4', {}, 'المادة'), subBox, h('h4', {}, 'النطاق'), scBox,
      h('button', { class: 'btn big', onclick: () => { store.patchProfile(p.id, (x) => { x.assigned = { subj, scope: sc?.key || 'all', scopeTitle: sc?.title || '', at: today(), done: null }; }); d.close(); toast('أُرسل الاختبار'); draw(); } }, 'إرسال')));
  }
  function dinner() {
    const ps = store.profiles;
    modal(h('div', { class: 'panel' }, h('h3', {}, '🍽️ أسئلة العشاء'),
      h('p', { class: 'hint' }, 'ثلاثة أسئلة لكل طفل مما تعلّمه مؤخراً. اقرأها عليه، واضغط السؤال لترى الجواب.'),
      ...ps.map((p) => h('div', { class: 'dinner' }, h('h4', {}, p.avatar + ' ' + p.name),
        ...dinnerQuestions(p).map((q) => { const a = h('span', { class: 'ans' }, ' ← ' + q.a); a.hidden = true; return h('p', { class: 'dq', onclick: () => { a.hidden = !a.hidden; } }, '❓ ' + q.q, a); })))));
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
      Capacitor.isNativePlatform() ? h('p', { class: 'hint' }, '🤖 نسخة تلقائية كل أسبوع: ' + (store.parent.autoBackup ? 'آخرها ' + new Date(store.parent.autoBackup.at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) + ' في ' + store.parent.autoBackup.where + ' (world-explorer-backup.json).' : 'لم تُحفظ بعد.'), ' ', h('button', { class: 'btn small soft', onclick: async () => { const w = await autoBackup(true); toast(w ? 'حُفظت في ' + w : 'تعذّر الحفظ التلقائي؛ استعمل «حفظ ملف نسخة»'); draw(); } }, 'احفظ الآن')) : h('p', { class: 'hint' }, '💡 على ويندوز: احفظ ملف النسخة مرة في الأسبوع في مجلد المستندات أو على قرص خارجي.'),
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
      h('ul', { class: 'bk-sum' }, r.summary.map((x) => h('li', {}, `${x.avatar} ${x.name}: أختام الزيارة ${ar(x.stamps)}، والأختام الذهبية ${ar(x.gold)}`))),
      h('p', { class: 'hint' }, 'ستُستبدل كل الملفات الموجودة الآن. احفظ نسخة من بياناتك الحالية أولاً إن أردت الرجوع إليها.'),
      h('div', { class: 'row' }, h('button', { class: 'btn danger', onclick: () => { d.close(); const err = store.importData(text); toast(err || 'تمت الاستعادة ✓', 4000); if (!err) setTimeout(draw, 300); } }, 'نعم، استبدل'), h('button', { class: 'btn soft', onclick: () => d.close() }, 'إلغاء'))));
  }
  // وقت اللعب اليومي لكل طفل
  function timePanel() {
    const cur = +store.parent.dailyMinutes || 0;
    return h('div', { class: 'panel' }, h('h3', {}, '⏱️ وقت اللعب اليومي'),
      h('p', { class: 'hint' }, 'يأخذ كل طفل هذا الوقت كاملاً في يومه. حين ينتهي تظهر له رسالة لطيفة، وتستطيعون إضافة ربع ساعة له وحده بالرقم السري. وما دام الحد مفعّلاً فإنشاء مستكشف جديد، والانتقال إلى ملف أخ بعد انتهاء الوقت، يحتاجان الرقم السري.'),
      h('div', { class: 'row wrap' }, [0, 20, 30, 45, 60].map((m) => h('button', { class: 'btn small' + (m === cur ? '' : ' soft'), onclick: () => { store.setParent({ dailyMinutes: m }); draw(); } }, m ? m.toLocaleString('ar-EG') + ' دقيقة' : 'بلا حد'))),
      h('p', { class: 'hint' }, store.profiles.map((p) => `${p.avatar} ${p.name}: ${p.usage?.[today()] ? cnt(p.usage[today()], 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة') + ' اليوم' : gp(p, 'لم يلعب اليوم', 'لم تلعب اليوم')}`).join(' · ')));
  }
  function pinPanel() {
    return h('div', { class: 'panel' }, h('h3', {}, '🔑 الرقم السري'),
      h('p', { class: 'hint' }, 'القفل يمنع الأولاد من تغيير المستوى أو حذف الملفات، وليس حماية أمنية. لا يُحفظ الرقم داخل النسخة الاحتياطية، وتبقى اللوحة مفتوحة عشر دقائق ثم تُقفل.'),
      store.parent.pinChange ? h('p', { class: 'hint' }, 'آخر تغيير للرقم: ' + new Date(store.parent.pinChange.at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) + ({ forgot: ' (عن طريق «نسيت الرقم؟»)', set: '', change: '' }[store.parent.pinChange.via] || '')) : null,
      h('p', { class: 'hint' }, store.parent.recHash ? '🔑 سؤال الاسترجاع: ' + store.parent.recQ : '⚠️ لا يوجد سؤال استرجاع بعد. أضفه حتى تسترجع الرقم إن نسيته.'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn soft', onclick: () => { store.setParent({ pinHash: null }); lockNow(); parentLock(draw); } }, 'تغيير الرقم السري'),
        h('button', { class: 'btn soft', onclick: () => editSecret(draw) }, store.parent.recHash ? 'تغيير سؤال الاسترجاع' : 'إضافة سؤال الاسترجاع')));
  }
}
