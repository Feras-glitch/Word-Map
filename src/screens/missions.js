// مهام المستكشف: ألغاز تُحلّ بالخريطة نفسها، لا بحفظ البطاقة
// ١) ابحث عن بلدي: أدلة متدرجة  ٢) رحلة قطرة في النيل  ٣) كن دليل أخيك
import { h, owl, toast, confetti, modal } from '../ui.js';
import { createMap, lighten, project, projection, svgEl, NAT } from '../map.js';
import { states, byId, pool, flagUrl, contColors, contBox, continents, shuffle, search } from '../data.js';
import { store } from '../store.js';
import { landmarkPhoto } from '../photos.js';
import { fem, toFem3 } from '../gender.js';
import { speak, LANG } from '../speech.js';
import { sfx } from '../sfx.js';
import { gC, cnt } from '../arnum.js';
import { clueChain, cluesFor, candidates } from '../clues.js';
import { tri, openCard } from '../card.js';

const ar = (n) => Number(n).toLocaleString('ar-EG');
const today = () => new Date().toLocaleDateString('en-CA');
const W = ['', 'دليل واحد', 'دليلين', '٣ أدلة', '٤ أدلة', '٥ أدلة', '٦ أدلة'];
const cluesWord = (n) => W[n] || cnt(n, 'دليل واحد', 'دليلين', 'أدلة', 'دليلاً');
const andList = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join('، ') + ' و' + a[a.length - 1]);
const dualWord = (n) => cnt(n, 'دولة واحدة', 'دولتين', 'دول', 'دولة');

// قصة قصيرة تُحفظ في جواز الطفل ولوحة الوالدين
function addStory(pid, story) {
  store.patchProfile(pid, (p) => { if (p.gender === 'f' && story.detail) story = { ...story, detail: toFem3(story.detail) }; (p.stories ||= []).unshift({ ...story, date: today() }); p.stories = p.stories.slice(0, 60); });
}

// لغز معلّق من «كن دليل أخيك»
let pendingPuzzle = null;

export function missionsScreen(root, { go }) {
  const M = (k, e, t, s, c) => h('button', { class: 'tile mission', style: { '--c': c }, onclick: () => { sfx('tap'); go(k); } }, h('span', { class: 'te' }, e), h('b', {}, t), h('small', {}, s));
  root.append(owl('اختر مهمة. ستحلّها بالنظر إلى الخريطة والاستماع إلى الأدلة.'),
    h('div', { class: 'tiles' },
      M('find', '🔎', 'ابحث عن بلدي', 'أدلة تأتي واحداً بعد الآخر', '#2b7fd4'),
      M('nile', '💧', 'رحلة قطرة في النيل', 'من أسوان حتى البحر', '#1d6fbf'),
      M('guide', '🧭', 'كن دليل إخوتك', 'اصنع لغزاً لإخوتك', '#7b5cd6'),
      M('route', '🚗', 'ارسم طريقي', 'سافر برّاً من دولة إلى أخرى', '#c2410c'),
      M('layer', '⛰️', 'أين النهر والجبل؟', 'توقّع، ثم اكشف الطبقة', '#8b5a2b')));
}

// ---------- ابحث عن بلدي ----------
export function findScreen(root, { go }) {
  const me = store.me; const owner = me.id; const level = me.level;
  const puzzle = pendingPuzzle; pendingPuzzle = null;
  const target = puzzle ? byId[puzzle.id] : shuffle(pool(level).filter((c) => c.cen && cluesFor(c).length >= 3))[0];
  const chain = puzzle ? puzzle.clues : clueChain(target, level);
  let shown = 1, taps = 0, helped = false, done = false;
  const alive = () => root.isConnected && store.me?.id === owner;

  const m = createMap({ labels: false, compass: true, fill: (x) => (x.kind === 'state' ? lighten(contColors[x.cont] || '#ccc', 0.25) : '#e6e6e6'),
    onTap: (id) => tap(id), onMiss: () => toast('🌊 هذا ماء. المس اليابسة') });
  const list = h('ol', { class: 'clue-list' });
  const msg = h('p', { class: 'clue-msg' });
  const btnNext = h('button', { class: 'btn', onclick: () => reveal() }, '➕ الدليل التالي');
  const btnGive = h('button', { class: 'btn soft small', onclick: () => giveUp() }, 'اكشف الإجابة');
  const panel = h('div', { class: 'story-panel clue-panel' },
    puzzle ? h('p', { class: 'hint' }, `🧩 لغز من ${puzzle.from}`) : null,
    list, msg, h('div', { class: 'row wrap' }, btnNext, btnGive));
  root.append(m.el, panel);

  function drawClues() {
    list.replaceChildren(...chain.slice(0, shown).map((cl) => h('li', {}, h('span', { class: 'ci' }, cl.icon), cl.text,
      h('button', { class: 'say', 'aria-label': 'استمع', onclick: () => speak(cl.text, LANG.ar) }, '🔊'),
      cl.nat ? h('button', { class: 'btn small soft', onclick: () => { helped = true; m.setNature(true); m.zoomToNature(cl.nat); setTimeout(() => m.flashNature(cl.nat), 750); } }, 'أرني') : null,
      // دليل المعلم: صورته إن وُجدت
      cl.kind === 'landmark' && landmarkPhoto(target.id) ? h('img', { class: 'clue-photo', src: landmarkPhoto(target.id).url, alt: '' }) : null)));
    btnNext.style.display = shown < chain.length ? '' : 'none';
    btnGive.style.display = shown >= chain.length ? '' : 'none';
  }
  function reveal() {
    if (shown >= chain.length) return;
    shown++; drawClues(); msg.textContent = fem('');
    speak(chain[shown - 1].text, LANG.ar);
  }
  function tap(id) {
    if (done || !alive()) return;
    const c = byId[id]; if (!c || c.kind !== 'state') { toast('هذه ليست دولة مستقلة. جرّب مكاناً آخر'); return; }
    taps++;
    if (id === target.id) return win();
    m.flash(id, 'flash', 1200); sfx('wrong');
    const seen = chain.slice(0, shown);
    const broken = seen.find((cl) => !cl.test(c));
    let t;
    if (!broken) t = `${c.ar}: اختيارك يطابق ${shown === 1 ? 'الدليل' : 'الأدلة'} حتى الآن! ${shown < chain.length ? 'اسمع الدليل التالي لنضيّق البحث.' : gC(c, 'لكنها ليست الدولة المقصودة. جرّب دولة قريبة منها.', 'لكنه ليس الدولة المقصودة. جرّب دولة قريبة منه.')}`;
    else t = `${gC(c, 'هذه', 'هذا')} ${c.ar}. لا ينطبق ${gC(c, 'عليها', 'عليه')}: «${broken.text}».`;
    msg.textContent = fem(t); speak(t, LANG.ar);
  }
  function win() {
    done = true;
    m.mark(target.id, 'right'); m.zoomToCountry(target.id, 800);
    confetti(40); sfx('win');
    const n = shown;
    const t = `أحسنت! وجدت ${target.ar} من ${cluesWord(n)}${taps === 1 ? ' ومن أول محاولة' : ''}!`;
    speak(t, LANG.ar);
    store.patchProfile(owner, (p) => { (p.found ||= {})[target.id] = { clues: n, taps, helped, date: today(), puzzle: puzzle?.from || null }; });
    addStory(owner, { id: target.id, kind: 'find', text: `وجدتُ ${target.ar} من ${cluesWord(n)}`, detail: `${helped ? 'استعمل زر «أرني»' : 'وحده دون مساعدة'}، و${taps === 1 ? 'من أول لمسة' : 'بعد ' + cnt(taps, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة')}${puzzle ? '، في لغز من ' + puzzle.from : ''}` });
    panel.replaceChildren(h('div', { class: 'sp-head' }, h('img', { class: 'sp-flag', src: flagUrl(target.f), alt: '' }), h('b', {}, t)),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => openCard(target.id) }, '📖 بطاقة ' + target.ar),
        h('button', { class: 'btn soft', onclick: () => { root.innerHTML = ''; findScreen(root, { go }); } }, '🔁 لغز جديد')));
  }
  function giveUp() {
    done = true; helped = true;
    m.mark(target.id, 'right'); m.zoomToCountry(target.id, 800);
    const t = `${gC(target, 'كانت', 'كان')} ${target.ar}. انظر أين ${gC(target, 'تقع', 'يقع')}، ثم جرّب لغزاً جديداً.`;
    speak(t, LANG.ar);
    addStory(owner, { id: target.id, kind: 'find-miss', text: `بحثتُ عن ${target.ar} وتعلمتُ موقع${gC(target, 'ها', 'ه')}`, detail: 'كُشفت الإجابة بعد كل الأدلة' });
    panel.replaceChildren(h('p', {}, t), h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => openCard(target.id) }, '📖 بطاقة ' + target.ar),
      h('button', { class: 'btn soft', onclick: () => { root.innerHTML = ''; findScreen(root, { go }); } }, '🔁 لغز جديد')));
  }
  drawClues();
  requestAnimationFrame(() => {
    m.world(0);
    setTimeout(() => { if (!alive()) return; speak((puzzle ? `لغز من ${puzzle.from}. ` : 'ابحث عن بلدي. ') + chain[0].text, LANG.ar); }, 300);
    // للصغار: نقرّب الخريطة إلى القارة بعد الدليل الأول
    if (chain[0].kind === 'cont') setTimeout(() => alive() && m.zoomTo(contBox[target.cont], 900), 2200);
  });
}

// ---------- كن دليل أخيك ----------
export function guideScreen(root, { go }) {
  const me = store.me;
  let target = null; let chosen = [];
  const draw = () => {
    root.innerHTML = '';
    if (!target) {
      const results = h('div', { class: 'search-results' });
      const input = h('input', { class: 'input search', type: 'search', placeholder: '🔎 اختر دولة سرّاً…', oninput: () => {
        results.innerHTML = '';
        for (const c of search(input.value).filter((x) => x.kind === 'state')) results.append(h('button', { class: 'res', onclick: () => { target = c; chosen = []; draw(); } }, h('img', { src: flagUrl(c.f), alt: '' }), h('b', {}, c.ar)));
      } });
      root.append(owl(`يا ${me.name}، اختر دولة سرّاً دون أن يرى إخوتك، ثم اختر لها أدلة. وسيبحث عنها أحد إخوتك على الخريطة.`),
        h('div', { class: 'map-tools' }, input, results),
        h('p', { class: 'hint' }, 'أو اختر واحدة من هذه:'),
        h('div', { class: 'neighbors' }, shuffle(pool(me.level)).slice(0, 8).map((c) => h('button', { class: 'chip', onclick: () => { target = c; chosen = []; draw(); } }, h('img', { src: flagUrl(c.f), alt: '' }), c.ar))));
      return;
    }
    const all = cluesFor(target);
    const cand = candidates(chosen);
    const status = !chosen.length ? 'اختر الدليل الأول. ابدأ بدليل عام، ثم الأدق.'
      : cand.length === 1 ? '✅ ممتاز! أدلتك تكفي لتحديد دولة واحدة فقط.'
        : `أدلتك تناسب ${dualWord(cand.length)} الآن. أضف دليلاً ليصير اللغز أدق.`;
    root.append(h('div', { class: 'panel' },
      h('div', { class: 'sp-head' }, h('img', { class: 'sp-flag', src: flagUrl(target.f), alt: '' }), h('b', {}, 'دولتك السرية: ' + target.ar),
        h('button', { class: 'btn small soft', onclick: () => { target = null; draw(); } }, 'تغيير')),
      h('h4', {}, 'أدلتك بالترتيب:'),
      chosen.length ? h('ol', { class: 'clue-list' }, chosen.map((cl, k) => h('li', {}, h('span', { class: 'ci' }, cl.icon), cl.text,
        h('button', { class: 'btn small soft', onclick: () => { chosen.splice(k, 1); draw(); } }, '✕')))) : null,
      h('p', { class: 'clue-msg' }, status),
      h('h4', {}, 'اختر دليلاً:'),
      h('div', { class: 'clue-cards' }, all.filter((cl) => !chosen.includes(cl)).map((cl) => h('button', { class: 'clue-card', onclick: () => { chosen.push(cl); sfx('tap'); speak(cl.text, LANG.ar); draw(); } },
        h('span', { class: 'ci' }, cl.icon), h('span', {}, cl.text)))),
      h('button', { class: 'btn big', disabled: chosen.length < 2 || null, onclick: () => {
        pendingPuzzle = { id: target.id, clues: chosen.slice(), from: me.avatar + ' ' + me.name };
        addStory(me.id, { id: target.id, kind: 'guide', text: `صنعتُ لغزاً عن ${target.ar} من ${cluesWord(chosen.length)}`, detail: cand.length === 1 ? 'أدلته تحدد دولة واحدة' : `أدلته تناسب ${dualWord(cand.length)}` });
        const d = modal(h('div', { class: 'panel center' }, h('div', { class: 'big-emoji' }, '🤫'), h('h3', {}, 'سلّم الجهاز لمن سيبحث'),
          h('p', {}, 'من سيحل اللغز؟'),
          h('div', { class: 'neighbors' }, store.profiles.filter((p) => p.id !== me.id).map((p) => h('button', { class: 'chip', onclick: () => { store.switchTo(p.id); d.close(); setTimeout(() => go('find'), 260); } }, p.avatar + ' ' + p.name))),
          h('button', { class: 'btn soft', onclick: () => { d.close(); setTimeout(() => go('find'), 260); } }, 'يحلّه شخص آخر على هذا الملف')));
      } }, chosen.length < 2 ? 'اختر دليلين على الأقل' : '🎁 جاهز! سلّم اللغز')));
  };
  draw();
}

// ---------- رحلة قطرة في النيل ----------
const STATIONS = [
  { id: 'aswan', ar: 'أسوان', at: [32.90, 24.09], small: true, say: 'وصلنا إلى أسوان. هنا السد العالي، وخلفه بحيرة ناصر.' },
  { id: 'luxor', ar: 'الأقصر', at: [32.64, 25.70], say: 'مررنا بالأقصر، مدينة المعابد القديمة.' },
  { id: 'cairo', ar: 'القاهرة', at: [31.24, 30.04], small: true, say: 'وصلنا إلى القاهرة، عاصمة مصر.' },
  { id: 'fork', ar: 'رأس الدلتا', at: [31.13, 30.19], say: 'هنا عند القناطر الخيرية ينقسم النيل إلى فرعين: فرع رشيد وفرع دمياط. اختر أحدهما.' },
  { id: 'mouth', ar: 'المصب', branch: true, small: true },
];
const MOUTHS = [{ id: 'rosetta', ar: 'رشيد', at: [30.36, 31.46] }, { id: 'damietta', ar: 'دمياط', at: [31.84, 31.52] }];

export function nileScreen(root) {
  const me = store.me; const owner = me.id; const level = me.level;
  const alive = () => root.isConnected && store.me?.id === owner;
  let lastAt = null, lastNext = null;
  const m = createMap({ labels: level === 1, compass: true, onView: () => { if (lastAt) placeDrop(lastAt); if (lastNext !== undefined) drawMarks(lastNext); } });
  const panel = h('div', { class: 'story-panel' });
  root.append(m.el, panel);
  const route = level === 1 ? STATIONS.filter((s) => s.small) : STATIONS;
  let step = -1; let predicted = null;
  const drop = svgEl('text', { class: 'drop', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }); drop.textContent = '💧';
  const marks = svgEl('g', {});
  m.overlay.append(marks, drop);
  const P = (at) => project(at[1], at[0]);
  const placeDrop = (at) => { lastAt = at; const [x, y] = P(at); const k = m.kPx(); drop.setAttribute('x', x); drop.setAttribute('y', y - 8 * k); drop.setAttribute('font-size', 26 * k); };
  const say = (t) => { speak(t, LANG.ar); };

  function drawMarks(next) {
    lastNext = next;
    marks.replaceChildren();
    const k = m.kPx();
    const targets = next?.branch ? MOUTHS : next ? [next] : [];
    for (const s of targets) {
      const [x, y] = P(s.at);
      const c = svgEl('circle', { cx: x, cy: y, r: 13 * k, class: 'station', 'data-tap': s.id });
      c.addEventListener('maptap', () => arrive(s));
      marks.append(c);
      const t = svgEl('text', { x, y: y - 18 * k, class: 'station-l', 'font-size': 13 * k, 'text-anchor': 'middle' }); t.textContent = level === 3 && !s.branch && next?.id !== 'aswan' ? '؟' : s.ar;
      marks.append(t);
    }
  }
  function next() {
    step++;
    const s = route[step];
    drawMarks(s);
    if (s.branch) { panel.replaceChildren(h('p', {}, '💧 اختر فرعاً: رشيد أو دمياط، والمسه لنكمل إلى البحر.')); say('اختر فرعاً من فرعي النيل، والمسه لنكمل إلى البحر.'); return; }
    panel.replaceChildren(h('p', {}, '💧 المس الدائرة المضيئة على مجرى النهر لننتقل إلى ' + (level === 3 ? 'المحطة التالية.' : s.ar + '.')));
  }
  function arrive(s) {
    if (!alive()) return;
    const cur = route[step]; if (!cur) return;
    if (!(cur.branch ? MOUTHS.includes(s) : s === cur)) return;
    drawMarks(null); sfx('tap'); placeDrop(s.at); m.zoomTo(boxAround(s.at, 9), 700);
    if (cur.branch) return atSea(s);
    const card = [h('p', {}, '💧 ' + s.say),
      h('p', { class: 'sentence' }, '✍️ قل جملة: «' + (s.id === 'aswan' ? 'بدأتُ رحلتي من أسوان' : 'مررتُ ب' + s.ar) + '».')];
    if (s.id === 'cairo') { const c = byId.EGY; card.push(h('p', { class: 'hint' }, 'اسم القاهرة بلغات أخرى:'), tri({ ar: c.cap3.ar, en: c.cap3.en, zh: c.cap3.zh, py: c.cap3.py })); }
    say(s.say);
    panel.replaceChildren(...card, h('button', { class: 'btn big', onclick: () => (s.id === 'luxor' && level >= 2 ? direction() : next()) }, 'تابع ←'));
  }
  // سؤال الاتجاه بسهم الشمال (للمتوسط والكبير)
  function direction() {
    const q = 'انظر إلى سهم الشمال على الخريطة. في أي اتجاه يجري النيل من أسوان إلى القاهرة؟';
    say(q);
    const opts = [['الشمال', true], ['الجنوب', false], ['الشرق', false], ['الغرب', false]];
    panel.replaceChildren(h('p', {}, '🧭 ' + q), h('div', { class: 'options' }, opts.map(([t, ok]) => h('button', { class: 'opt', onclick: (e) => {
      e.currentTarget.classList.add(ok ? 'right' : 'wrong'); sfx(ok ? 'correct' : 'wrong');
      const ex = ok ? 'صحيح! النيل يجري من الجنوب إلى الشمال.' : 'انظر إلى السهم: القاهرة شمال أسوان، فالنيل يجري نحو الشمال.';
      say(ex); panel.append(h('p', {}, ex), h('button', { class: 'btn', onclick: next }, 'تابع ←'));
    } }, t))));
  }
  function atSea(mouth) {
    const sea = NAT.items.find((x) => x.id === 'med');
    m.zoomTo(boxAround([31.1, 31.6], 14), 800);
    const q = 'وصلنا إلى المصب! ما اسم البحر الذي وصلنا إليه؟';
    say(q);
    const wrong = level === 1 ? ['البحر الأحمر'] : ['البحر الأحمر', 'الخليج العربي', 'بحر العرب'];
    const opts = shuffle([[sea.ar, true], ...wrong.map((w) => [w, false])]);
    panel.replaceChildren(h('p', {}, `💧 خرجنا من فرع ${mouth.ar}. ${q}`),
      h('div', { class: 'options' }, opts.map(([t, ok]) => h('div', { class: 'opt-wrap' }, h('button', { class: 'opt', onclick: (e) => {
        if (panel.dataset.done) return; panel.dataset.done = 1;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong'); sfx(ok ? 'win' : 'wrong');
        finish(ok, mouth);
      } }, t), h('button', { class: 'opt-say', 'aria-label': 'استمع', onclick: () => say(t) }, '🔊')))));
  }
  function finish(ok, mouth) {
    if (ok) confetti(40);
    const sea = 'البحر الأبيض المتوسط';
    const t = ok ? `أحسنت! وصلت القطرة إلى ${sea}.` : `وصلت القطرة إلى ${sea}، فهو البحر الذي يصب فيه النيل.`;
    say(t);
    addStory(owner, { id: 'EGY', kind: 'nile', text: `تتبّعتُ النيل من أسوان حتى ${sea}`, detail: `خرج من فرع ${mouth.ar}، و${ok ? 'عرف اسم البحر' : 'لم يعرف اسم البحر بعد'}${predicted == null ? '' : predicted ? '، وتوقّع المصب صحيحاً قبل الرحلة' : '، ولم يصب في توقّع المصب قبل الرحلة'}` });
    const parts = [h('p', {}, '🌊 ' + t)];
    if (level === 3) {
      parts.push(h('p', {}, '🤔 سؤال للتفكير: هل تجري كل الأنهار نحو الشمال؟'),
        h('div', { class: 'row' }, ...[['نعم', false], ['لا', true]].map(([tx, good]) => h('button', { class: 'btn soft', onclick: () => {
          const ex = 'لا. الماء يجري من الأرض العالية إلى الأرض المنخفضة حتى يصل إلى البحر. النيل يجري نحو الشمال، لكن الأمازون يجري نحو الشرق، والمسيسيبي نحو الجنوب.';
          say((good ? 'صحيح! ' : '') + ex); parts.at(-1).after(h('p', {}, (good ? '✅ ' : '') + ex));
        } }, tx))));
    }
    parts.push(h('button', { class: 'btn big', onclick: () => openCard('EGY') }, '📖 بطاقة مصر'));
    panel.replaceChildren(...parts);
  }
  const boxAround = ([lon, lat], r) => { const [x, y] = P([lon, lat]); return [x - r, y - r, x + r, y + r]; };

  // البداية
  requestAnimationFrame(() => {
    m.setNature(true);
    m.zoomTo(boxAround([31.5, 27.5], 40), 0);
    placeDrop(STATIONS[0].at);
    const intro = 'أنا قطرة ماء في نهر النيل داخل مصر، عند أسوان. أريد أن أصل إلى البحر. هل ترافقني؟';
    setTimeout(() => alive() && say(intro), 300);
    if (level === 3) {
      panel.replaceChildren(h('p', {}, '💧 ' + intro), h('p', {}, '🔮 قبل أن نبدأ: المس على الخريطة المكان الذي تتوقع أن يصب فيه النيل.'));
      m.svg.addEventListener('pointerup', function guess(e) {
        if (predicted != null || step >= 0) return;
        const r = m.svg.getBoundingClientRect(); const k = m.kPx(); const vb = m.vb;
        const ox = (r.width * k - vb.w) / 2, oy = (r.height * k - vb.h) / 2;
        const x = vb.x - ox + (e.clientX - r.left) * k, y = vb.y - oy + (e.clientY - r.top) * k;
        const [lon, lat] = projection.invert([x, y]) || [0, 0];
        predicted = lat > 31.0 && lon > 28.5 && lon < 34.5;
        const t = predicted ? 'توقّع جيد! لنتحقق معاً.' : 'سنرى في نهاية الرحلة إن كان توقّعك صحيحاً.';
        say(t); panel.replaceChildren(h('p', {}, '🔮 ' + t), h('button', { class: 'btn big', onclick: next }, 'لننطلق! 💧'));
        m.svg.removeEventListener('pointerup', guess);
      });
    } else {
      panel.replaceChildren(h('p', {}, '💧 ' + intro), h('button', { class: 'btn big', onclick: next }, 'نعم، لننطلق! 💧'));
    }
  });
}


// ---------- ارسم طريقي: طريق بري بين دولتين ----------
// حدود لها حالة خاصة قد تبدو غريبة للطفل: نشرحها حين يعبرها
const SPECIAL = {
  'POL|RUS': 'هنا عبرتَ إلى كالينينغراد: قطعة من روسيا منفصلة عن باقي أرضها، تقع بين بولندا وليتوانيا على بحر البلطيق.',
  'LTU|RUS': 'هنا عبرتَ إلى كالينينغراد: قطعة من روسيا منفصلة عن باقي أرضها، تقع بين بولندا وليتوانيا على بحر البلطيق.',
  'AZE|TUR': 'الحدود بين أذربيجان وتركيا قصيرة جداً، وهي في نخجوان: جزء من أذربيجان منفصل عن باقي أرضها.',
  'ESP|MAR': 'الحدود البرية بين إسبانيا والمغرب في مدينتي سبتة ومليلية على ساحل المغرب، وهما مدينتان مغربيتان تحتلهما إسبانيا.',
  'GBR|IRL': 'جزيرة أيرلندا فيها دولتان: أيرلندا، وأيرلندا الشمالية التابعة لبريطانيا. والحدود البرية بينهما على هذه الجزيرة.',
  'DOM|HTI': 'هايتي والدومينيكان تتقاسمان جزيرة واحدة اسمها هيسبانيولا.',
  'IDN|TLS': 'تيمور الشرقية وإندونيسيا تتقاسمان جزيرة تيمور.',
  'IDN|MYS': 'إندونيسيا وماليزيا تتقاسمان جزيرة بورنيو الكبيرة، ومعهما بروناي.',
  'BRN|MYS': 'بروناي دولة صغيرة على جزيرة بورنيو، تحيط بها ماليزيا.',
  'IDN|PNG': 'إندونيسيا وبابوا غينيا الجديدة تتقاسمان جزيرة غينيا الجديدة.',
  'ITA|SMR': 'سان مارينو دولة صغيرة جداً تحيط بها إيطاليا من كل الجهات.',
  'ITA|VAT': 'الفاتيكان أصغر دولة في العالم، وتقع داخل مدينة روما.',
  'LSO|ZAF': 'ليسوتو تحيط بها جنوب أفريقيا من كل الجهات.',
  'ARE|OMN': 'لعُمان جزء منفصل اسمه مسندم، تحيط به الإمارات، يطل على مضيق هرمز.',
};
const special = (a, b) => SPECIAL[[a, b].sort().join('|')];
// يقبل أي طريق تشترك فيه كل دولتين متتاليتين في حدود برية
function bfs(a, b) {
  const prev = { [a]: null }; const q = [a];
  while (q.length) { const x = q.shift(); if (x === b) break; for (const n of byId[x].borders) if (byId[n]?.kind === 'state' && !(n in prev)) { prev[n] = x; q.push(n); } }
  if (!(b in prev)) return null;
  const path = []; for (let x = b; x; x = prev[x]) path.unshift(x); return path;
}
export function routeScreen(root, { go }) {
  const me = store.me; const owner = me.id; const level = me.level;
  const alive = () => root.isConnected && store.me?.id === owner;
  // الصغير: دولتان مشهورتان متجاورتان أو بينهما دولة واحدة
  const [minL, maxL] = level === 1 ? [2, 3] : level === 2 ? [3, 4] : [4, 6];
  const P = pool(level).filter((c) => c.borders.length);
  let from, to, best;
  for (let t = 0; t < 600; t++) {
    from = P[Math.floor(Math.random() * P.length)]; to = P[Math.floor(Math.random() * P.length)];
    if (from === to) continue; best = bfs(from.id, to.id);
    if (best && best.length >= minL && best.length <= maxL) break; best = null;
  }
  const path = [from.id]; let done = false, wrongs = 0; const notes = [];
  const m = createMap({ labels: level <= 2, compass: true, fill: (x) => (x.kind === 'state' ? lighten(contColors[x.cont] || '#ccc', 0.35) : '#e6e6e6'),
    onTap: (id) => tap(id), onMiss: () => toast('🌊 هذا ماء. السيارة لا تسير في البحر!') });
  const lines = svgEl('g', {}); m.overlay.append(lines);
  const msg = h('p', { class: 'clue-msg' });
  const steps = h('div', { class: 'route-steps' });
  const panel = h('div', { class: 'story-panel clue-panel' },
    h('p', {}, '🚗 سافر برّاً من ', h('b', {}, from.ar), ' إلى ', h('b', {}, to.ar), '. المس الدول التي ستمر بها واحدة بعد الأخرى. لا يمكن عبور البحر!'),
    steps, msg, h('div', { class: 'row wrap' }, h('button', { class: 'btn small soft', onclick: () => undo() }, '↩️ تراجع'), h('button', { class: 'btn small soft', onclick: () => hint() }, '💡 تلميح')));
  root.append(m.el, panel);
  const drawPath = () => {
    m.clearMarks('right'); m.clearMarks('goal');
    for (const id of path) m.mark(id, 'right');
    m.mark(to.id, 'goal');
    lines.replaceChildren(...path.slice(1).map((id, k) => svgEl('line', { x1: byId[path[k]].cen[0], y1: byId[path[k]].cen[1], x2: byId[id].cen[0], y2: byId[id].cen[1], class: 'route-line' })));
    steps.replaceChildren(...path.map((id, k) => h('span', { class: 'chip' }, h('img', { src: flagUrl(byId[id].f), alt: '' }), byId[id].ar, k < path.length - 1 ? ' ←' : '')));
  };
  function tap(id) {
    if (done || !alive()) return;
    const c = byId[id]; if (!c || c.kind !== 'state') return;
    const last = byId[path[path.length - 1]];
    if (path.includes(id)) { msg.textContent = fem(`مررتَ ب${c.ar} من قبل.`); return; }
    if (!last.borders.includes(id)) {
      wrongs++; sfx('wrong'); m.flash(id, 'flash', 900);
      const t = !c.landlocked && !last.landlocked && c.cont === last.cont ? `${c.ar} ${gC(c, 'قريبة', 'قريب')}، لكن لا حدود برية ${gC(c, 'بينها', 'بينه')} وبين ${last.ar}. ربما يفصل بينهما بحر.` : `لا ${gC(c, 'تشترك', 'يشترك')} ${c.ar} مع ${last.ar} في حدود برية. اختر جارة لـ${last.ar}.`;
      msg.textContent = fem(t); speak(t, LANG.ar); return;
    }
    path.push(id); sfx('tap'); drawPath();
    const note = special(last.id, id);
    if (note) { notes.push(note); msg.replaceChildren(h('span', { class: 'special-note' }, '💡 ' + note)); speak(c.ar + '. ' + note, LANG.ar); }
    else { msg.textContent = fem(''); speak(c.ar, LANG.ar); }
    if (id === to.id) win();
  }
  function undo() { if (path.length > 1 && !done) { path.pop(); drawPath(); } }
  function hint() {
    const last = path[path.length - 1]; const rest = bfs(last, to.id);
    if (rest && rest[1]) { m.flash(rest[1], 'flash', 2000); const t = `جرّب ${byId[rest[1]].ar}.`; msg.textContent = fem(t); speak(t, LANG.ar); wrongs++; }
  }
  function win() {
    done = true; confetti(40); sfx('win');
    const n = path.length - 2;
    const t = `وصلت إلى ${to.ar}! ${n === 0 ? 'لم تمرّ بأي دولة أخرى' : 'مررتَ ب' + ( n === 1 ? 'دولة واحدة' : n === 2 ? 'دولتين' : ar(n) + ' دول')} في الطريق.${path.length > best.length ? ` وأقصر طريق يمر ب${best.length - 2 === 1 ? 'دولة واحدة' : best.length - 2 === 2 ? 'دولتين' : ar(best.length - 2) + ' دول'}: ${best.slice(1, -1).map((x) => byId[x].ar).join('، ')}.` : ' وهذا أقصر طريق!'}`;
    speak(t, LANG.ar);
    addStory(owner, { id: to.id, kind: 'route', path: path.slice(), notes: notes.slice(), text: `سافرتُ برّاً من ${from.ar} إلى ${to.ar}`, detail: `${path.length > 2 ? 'مرّ ب' + andList(path.slice(1, -1).map((x) => byId[x].ar)) : 'لم يمرّ بدول أخرى'}${wrongs ? '، واحتاج إلى ' + cnt(wrongs, 'تصحيح أو تلميح واحد', 'تصحيحين أو تلميحين', 'تصحيحات أو تلميحات', 'تصحيحاً أو تلميحاً') : '، دون أخطاء'}` });
    panel.replaceChildren(h('p', {}, '🏁 ' + t), ...notes.map((n) => h('p', { class: 'special-note' }, '💡 ' + n)), h('button', { class: 'btn', onclick: () => { root.innerHTML = ''; routeScreen(root, { go }); } }, '🔁 طريق جديد'));
  }
  drawPath();
  requestAnimationFrame(() => {
    // نقرّب على مراكز دول الطريق (لا على مربع روسيا الذي يغطي نصف العالم)
    const xs = best.map((id) => byId[id].cen[0]), ys = best.map((id) => byId[id].cen[1]);
    m.zoomTo([Math.min(...xs) - 25, Math.min(...ys) - 25, Math.max(...xs) + 25, Math.max(...ys) + 25], 0, 0.3);
    setTimeout(() => alive() && speak(`سافر برّاً من ${from.ar} إلى ${to.ar}`, LANG.ar), 300);
  });
}

// ---------- أين النهر والجبل؟ توقّع ثم اكشف الطبقة ----------
export function layerScreen(root, { go }) {
  const me = store.me; const owner = me.id; const level = me.level;
  const alive = () => root.isConnected && store.me?.id === owner;
  const kinds = level === 1 ? ['river', 'desert', 'range'] : ['river', 'desert', 'range', 'lake', 'peak'];
  // الصغير: معالم مشهورة قريبة من عالمه فقط
  const EASY = ['nile', 'amazon', 'euphrates', 'tigris', 'jordan', 'himalaya', 'alps', 'atlas', 'sahara', 'rubalkhali'];
  const items = NAT.items.filter((it) => kinds.includes(it.kind) && it.countries?.length && (level > 1 || EASY.includes(it.id)));
  const it = items[Math.floor(Math.random() * items.length)];
  const K = NAT.kinds[it.kind];
  let done = false, tries = 0;
  const m = createMap({ labels: level <= 2, compass: true, onTap: (id) => tap(id), onMiss: () => tap(null) });
  const msg = h('p', { class: 'clue-msg' });
  const panel = h('div', { class: 'story-panel clue-panel' },
    h('p', {}, `${K.icon} في أي دولة نجد `, h('b', {}, it.ar), '؟ المس الدولة على الخريطة، ثم نكشف طبقة الطبيعة لنتحقق.'),
    msg, h('button', { class: 'btn small soft', onclick: () => reveal(false) }, '👀 اكشف الطبقة الآن'));
  root.append(m.el, panel);
  function tap(id) {
    if (done || !alive()) return;
    tries++;
    const c = id && byId[id];
    if (c && it.countries.includes(id)) return reveal(true, c);
    const t = c ? `ليس في ${c.ar}. ${tries >= 2 ? 'تلميح: ابحث في قارة ' + continents[byId[it.countries[0]].cont] + '.' : 'حاول مرة أخرى.'}` : 'هذا ماء. المس دولة.';
    sfx('wrong'); msg.textContent = fem(t); speak(t, LANG.ar);
  }
  function reveal(ok, c) {
    if (done) return; done = true;
    m.setNature(true); m.zoomToNature(it.id); setTimeout(() => m.flashNature(it.id), 800);
    for (const id of it.countries) m.mark(id, 'right');
    if (ok) { confetti(30); sfx('win'); }
    const names = it.countries.map((x) => byId[x]?.ar).filter(Boolean);
    const t = (ok ? `أحسنت! ${it.ar} في ${c.ar}. ` : '') + `${it.ar} ${{ river: 'يمر ب', lake: 'تطل عليها: ', peak: 'في: ' }[it.kind] || 'يمتد في: '}${andList(names)}.`;
    speak(t, LANG.ar);
    addStory(owner, { id: ok ? c.id : it.countries[0], kind: 'layer', nat: it.id, text: ok ? `توقّعتُ مكان ${it.ar} وأصبت` : `كشفتُ طبقة الطبيعة وتعلمتُ مكان ${it.ar}`, detail: ok ? `أصاب ${tries === 1 ? 'من أول محاولة' : 'بعد ' + ar(tries) + ' محاولات'}` : 'كشف الطبقة قبل أن يصيب' });
    panel.replaceChildren(h('p', {}, (ok ? '✅ ' : '👀 ') + t), h('p', { class: 'hint' }, '💡 ' + it.fact),
      h('button', { class: 'btn', onclick: () => { root.innerHTML = ''; layerScreen(root, { go }); } }, '🔁 معلم آخر'));
  }
  requestAnimationFrame(() => {
    if (level === 1) m.zoomTo(contBox[byId[it.countries[0]].cont], 0); else m.world(0);
    setTimeout(() => alive() && speak(`في أي دولة نجد ${it.ar}؟`, LANG.ar), 300);
  });
}

// ---------- الخريطة الصغيرة لقصة في الجواز ----------
export function openStoryMap(st) {
  const box = h('div', { class: 'story-map' });
  const md = modal(h('div', {}, h('h3', {}, st.text), st.detail ? h('p', { class: 'hint' }, st.detail) : null, ...(st.notes || []).map((n) => h('p', { class: 'special-note' }, '💡 ' + n)), box), { cls: 'card-modal' });
  const m = createMap({ labels: true, compass: true });
  box.append(m.el);
  requestAnimationFrame(() => {
    if (st.kind === 'nile') { m.setNature(true); m.zoomToNature('nile'); m.mark('EGY', 'right'); return; }
    if (st.nat) { m.setNature(true); m.zoomToNature(st.nat); setTimeout(() => m.flashNature(st.nat), 800); return; }
    if (st.path) {
      const g = svgEl('g', {}); m.overlay.append(g);
      st.path.forEach((id, k) => { m.mark(id, 'right'); if (k) g.append(svgEl('line', { x1: byId[st.path[k - 1]].cen[0], y1: byId[st.path[k - 1]].cen[1], x2: byId[id].cen[0], y2: byId[id].cen[1], class: 'route-line' })); });
      const xs = st.path.map((id) => byId[id].cen[0]), ys = st.path.map((id) => byId[id].cen[1]);
      m.zoomTo([Math.min(...xs) - 25, Math.min(...ys) - 25, Math.max(...xs) + 25, Math.max(...ys) + 25], 0, 0.3); return;
    }
    if (byId[st.id]) { m.mark(st.id, 'right'); m.zoomToCountry(st.id, 0); }
  });
  return md;
}
