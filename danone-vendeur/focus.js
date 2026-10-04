'use strict';

/* ============================================================
   وضع "خطوة بخطوة" — مبني على مبادئ Atomic Habits:
   1. اجعلها واضحة   → شاشة صباحية + مهمة واحدة فقط على الشاشة + "بعدها مباشرة…"
   2. اجعلها جذابة   → هوية البائع المحترف + سلسلة الأيام 🔥 + المستوى
   3. اجعلها سهلة    → قاعدة الدقيقتين: كل مهمة صغيرة ومدتها ظاهرة، زر واحد "تم"
   4. اجعلها مُرضية  → احتفال فوري + نقاط + "لا تفوّت مرتين"
   يعتمد على المتغيرات والدوال المعرّفة في app.js.
   ============================================================ */

// id → [أيقونة, لماذا هذه المهمة مهمة, المدة بالدقائق]
const HABIT = {
  truck_walk: ['🚚', 'عطل بسيط تكتشفه الآن يوفّر عليك يوماً ضائعاً في الطريق.', 3],
  oil: ['🛢️', 'نقص الزيت = عطل محرك مكلف وتوقف الجولة.', 1],
  water: ['💧', 'ارتفاع حرارة المحرك يوقفك في منتصف الجولة.', 1],
  cold: ['❄️', 'منتج دافئ = منتج تالف وزبون يفقد الثقة.', 1],
  phone: ['📱', 'بدون هاتف لا بيع ولا فواتير.', 1],
  printer: ['🖨️', 'فاتورة مطبوعة = تحصيل أسرع وثقة الزبون.', 1],
  paper: ['🧾', 'نفاد الورق عند الزبون يعني بيعاً بلا فاتورة.', 1],
  app_open: ['🔐', 'الدخول المبكر يكشف مشاكل الحساب قبل الزبون الأول.', 1],
  app_session: ['🔄', 'مزامنة الأسعار والعروض = لا أخطاء في الفوترة.', 2],
  clients: ['🗺️', 'من يعرف جولته يبيع أكثر ويضيّع وقتاً أقل.', 3],
  steps: ['🎯', 'المحترف يكرر نفس الخطوات في كل زيارة — هذا سرّ النتائج.', 2],
  stock_start: ['📦', 'ما تحمله في الشاحنة هو ما ستُحاسَب عليه مساءً.', 3],
  dashboard: ['📊', 'من يقيس تقدمه أثناء اليوم يصحّح قبل فوات الأوان.', 2],
  market: ['📣', 'معلومة من الميدان اليوم = قرار أفضل للفريق غداً.', 3],
  target: ['🏆', 'الهدف المحقق يُبنى زيارة بعد زيارة.', 1],
  returns: ['↩️', 'رجوع مطابق = لا عجز ولا شك.', 3],
  cash: ['💰', 'صندوق مطابق = راحة بال ومصداقية.', 5],
  report: ['📨', 'إغلاق اليوم بتقرير واضح يبني ثقة المشرف.', 1],
};

// هوية البائع لكل مرحلة (Identity-based habits)
const IDENTITY = {
  p1: 'أنا بائع لا ينطلق بشاحنة لم يفحصها.',
  p2: 'أدواتي جاهزة دائماً — لا وقت ضائع عند الزبون.',
  p3: 'نظامي مفتوح قبل أول زيارة.',
  p4: 'أعرف أين سأذهب، ولماذا، وكيف سأبيع.',
  p5: 'ما أحمله هو ما أحاسَب عليه — وأرقامي نظيفة.',
  p6: 'أقيس تقدمي أثناء اليوم، لا في نهايته.',
  p7: 'أُغلق يومي بأرقام مطابقة وضمير مرتاح.',
};

const CHEERS = ['ممتاز! 💪', 'هكذا يعمل المحترفون ✨', 'العادة تُبنى الآن 🧱', '1% أفضل من أمس 📈', 'الزخم معك 🚀', 'أحسنت! 👏', 'خطوة صغيرة، نتيجة كبيرة 🎯'];

const LEVELS = [
  [0, 'مبتدئ', '🌱'], [500, 'منضبط', '⚙️'], [1500, 'محترف', '🥉'],
  [4000, 'خبير الجولة', '🥈'], [8000, 'قائد الميدان', '🥇'], [15000, 'أسطورة', '👑'],
];

/* ---------- Habit stats ---------- */
function habitStats() {
  const h = load(KEY_HIST, {});
  const today = todayKey();
  const full = (k) => h[k] && h[k].done === h[k].total;
  const dates = Object.keys(h).sort();
  const oldest = dates[0];

  // Streak = consecutive fully-completed workdays (off day skipped). Today counts once complete.
  let streak = full(today) ? 1 : 0;
  let missedLast = false;
  const x = new Date();
  for (let i = 1; i < 400; i++) {
    x.setDate(x.getDate() - 1);
    if (x.getDay() === Number(settings.offDay)) continue;
    const k = ymd(x);
    if (!oldest || k < oldest) break; // before the app was first used
    if (full(k)) { streak++; continue; }
    missedLast = streak === (full(today) ? 1 : 0); // the very last workday was missed
    break;
  }

  const total = Object.values(h).reduce((a, d) => a + (d.score || 0), 0);
  let level = LEVELS[0], nextLevel = null;
  LEVELS.forEach((l, i) => { if (total >= l[0]) { level = l; nextLevel = LEVELS[i + 1] || null; } });

  const prevKey = dates.filter((k) => k < today).pop();
  const yesterday = prevKey ? h[prevKey] : null;
  const todayScore = h[today]?.score || 0;
  return { streak, missedLast, total, level, nextLevel, yesterday, todayScore };
}

let lastCardId = null;
const nextTask = () => ALL_TASKS.find((t) => !isDone(t));
const phaseOf = (t) => PHASES.find((p) => p.id === t.phase);

function greeting() {
  const hr = new Date().getHours();
  const n = settings.name ? '، ' + esc(settings.name) : '';
  if (hr < 12) return `صباح الخير${n} ☀️`;
  if (hr < 18) return `مساء الخير${n} 🌤️`;
  return `مساء الخير${n} 🌙`;
}

/* ---------- Screens ---------- */
// «أريد أن أصبح…» — هوية البائع لكل مرحلة
const BECOME = {
  p1: 'بائعاً لا ينطلق إلا بشاحنة سليمة',
  p2: 'بائعاً أدواته جاهزة دائماً',
  p3: 'بائعاً نظامه جاهز قبل أول زبون',
  p4: 'بائعاً يعرف جولته قبل أن يبدأها',
  p5: 'بائعاً أرقامه نظيفة من الصباح',
  p6: 'بائعاً يقيس تقدمه أثناء الجولة',
  p7: 'بائعاً يُغلق يومه بلا فوارق',
};

const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4 14h6.5L9.5 22 20 9.5h-6.6z"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke-width="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke-width="2"/></svg>';

function renderFocus() {
  if (!day.introSeen) return renderIntro();
  const t = nextTask();
  return t ? renderFocusTask(t) : renderFinale();
}

// Streak badge in the card corner; turns from gold to flame after a week.
function badge(st) {
  return `<div class="badge ${st.streak >= 7 ? 'hot' : ''}" title="أيام متتالية">${BOLT}<b>${st.streak}</b></div>`;
}

function statLine(st) {
  return `<div class="statline">
    <span><b>${fmt(st.total)}</b> نقطة</span><i></i>
    <span>${st.level[2]} ${esc(st.level[1])}</span><i></i>
    <span><b>${st.todayScore}</b> اليوم</span>
  </div>`;
}

function renderIntro() {
  const st = habitStats();
  const first = nextTask() || ALL_TASKS[0];
  const [icon, , mins] = HABIT[first.id];
  const y = st.yesterday;
  let streakMsg;
  if (st.missedLast) streakMsg = '<b>قاعدة اليوم: لا تفوّت مرتين.</b> يوم واحد لا يكسرك، ونعود اليوم.';
  else if (st.streak > 0) streakMsg = `<b>${st.streak} ${st.streak === 1 ? 'يوم' : 'أيام'}</b> متتالية. لا تكسر السلسلة اليوم.`;
  else streakMsg = 'اليوم أول يوم في سلسلتك.';

  return `<section class="stack">
    <article class="blob intro enter">
      ${badge(st)}
      <img class="intro-logo" src="fennec-logo.png" alt="Fennec" width="96" height="96">
      <div class="eyebrow" dir="ltr">${new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'} · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h2 class="display">${greeting()}</h2>
      <div class="become">
        <div class="become-k">أريد أن أصبح</div>
        <div class="become-v">بائعاً محترفاً يصنع الفرق في كل زيارة</div>
      </div>
      <p class="intro-msg">${streakMsg}${y ? ` تحدّي اليوم: تجاوز <b>${fmt(y.score || 0)}</b> نقطة.` : ''}</p>
      <div class="first-step">
        <div class="fs-k">الخطوة الأولى · ${mins} ${mins > 2 ? 'دقائق' : 'دقيقة'}</div>
        <div class="fs-v">${esc(first.title)} ${icon}</div>
      </div>
      <button class="cta" data-act="focus-start">ابدأ يومي</button>
    </article>
    ${statLine(st)}
  </section>`;
}

function renderPhaseTrack(current) {
  return `<div class="ptrack" aria-hidden="true">${PHASES.map((p) => {
    const d = p.tasks.filter(isDone).length;
    const cls = d === p.tasks.length ? 'full' : p.id === current.phase ? 'now' : '';
    return `<span class="${cls}" style="--f:${d / p.tasks.length}"></span>`;
  }).join('')}</div>`;
}

function renderFocusTask(t) {
  const st = habitStats();
  const p = phaseOf(t);
  const pIdx = PHASES.indexOf(p);
  const idx = ALL_TASKS.indexOf(t);
  const [icon, why, mins] = HABIT[t.id];
  const ready = readiness(t);
  const upcoming = ALL_TASKS.slice(idx + 1).filter((x) => !isDone(x)).slice(0, 2);
  const hm = new Date().toTimeString().slice(0, 5);
  const enter = lastCardId !== t.id; // animate only when a new task arrives
  lastCardId = t.id;
  const onRoad = t.phase === 'p6' && day.dashLog.length === 0 && settings.reminders.p6 && hm < settings.reminders.p6;

  return `<section class="stack">
    ${renderPhaseTrack(t)}
    ${onRoad ? `<div class="road">أنت الآن في الجولة 🚚 سأذكّرك الساعة <b>${esc(settings.reminders.p6)}</b> لمتابعة لوحة التحكم.</div>` : ''}
    <article class="blob task ${enter ? 'enter' : ''}" id="task-${t.id}">
      ${badge(st)}
      <button class="pill-btn" data-act="go-list" aria-label="كل المهام">•••</button>
      <div class="phase-chip">المرحلة ${pIdx + 1} · ${esc(p.title)} <span dir="ltr">${esc(p.fr)}</span></div>
      <h2 class="display task-title">${esc(t.title)} <span class="t-icon">${icon}</span></h2>
      <div class="fr" dir="ltr">${esc(t.fr)}</div>
      <div class="become">
        <div class="become-k">أريد أن أصبح</div>
        <div class="become-v">${esc(BECOME[p.id])}</div>
      </div>
      <p class="hint">${esc(t.hint)}</p>
      <p class="why">${esc(why)}</p>
      <div class="f-body">${renderTaskBody(t)}</div>
      <div class="ready-msg">${ready === true ? '' : `<div class="alert warn">${esc(ready)}</div>`}</div>
      <button class="cta done-btn" id="chk-${t.id}" data-act="focus-done" data-id="${t.id}" ${ready === true ? '' : 'disabled'}>
        <span class="tick">✓</span> تم
      </button>
      <div class="meta">الخطوة ${idx + 1} من ${ALL_TASKS.length} · ${mins} د</div>
    </article>
    ${upcoming.map((u, k) => `
      <article class="blob locked l${k + 1}" aria-label="مهمة قادمة">
        <span class="pill-btn lock">${LOCK}</span>
        <h3 class="display">${esc(u.title)} <span class="t-icon">${HABIT[u.id][0]}</span></h3>
        <div class="fr" dir="ltr">${esc(u.fr)}</div>
      </article>`).join('')}
    ${statLine(st)}
  </section>`;
}

function renderFinale() {
  const st = habitStats();
  const y = st.yesterday;
  const delta = y ? st.todayScore - (y.score || 0) : null;
  const toNext = st.nextLevel ? st.nextLevel[0] - st.total : 0;
  const firstRem = settings.reminders.p1;
  return `<section class="stack">
    <article class="blob intro finale enter">
      ${badge(st)}
      <div class="trophy">🏆</div>
      <div class="eyebrow" dir="ltr">Journée clôturée</div>
      <h2 class="display">يوم مكتمل</h2>
      <div class="kpis">
        <div class="kpi"><div class="l">نقاط اليوم</div><div class="v ok">${fmt(st.todayScore)}</div></div>
        <div class="kpi"><div class="l">مقارنة بآخر يوم</div><div class="v ${delta === null ? '' : delta >= 0 ? 'ok' : 'bad'}">${delta === null ? '—' : signed(delta)}</div></div>
      </div>
      ${st.nextLevel ? `<p class="intro-msg">باقي <b>${fmt(toNext)}</b> نقطة للوصول إلى ${st.nextLevel[2]} <b>${esc(st.nextLevel[1])}</b>.</p>` : ''}
      <div class="become">
        <div class="become-k">اليوم صوّتَّ لصالح</div>
        <div class="become-v">البائع الذي تريد أن تكونه</div>
      </div>
      <p class="intro-msg muted">نلتقي غداً${firstRem ? ' على الساعة ' + esc(firstRem) : ''}.</p>
      <button class="pill-link" data-act="go-list">مراجعة اليوم</button>
    </article>
    ${statLine(st)}
  </section>`;
}

/* ---------- Reward ---------- */
let celebrating = null;

function celebrate(t, phaseFinished) {
  const p = phaseOf(t);
  const pts = 10 + (phaseFinished ? 20 : 0);
  const el = $('#celebrate');
  const colors = ['#0047BA', '#E4002B', '#FFFFFF', '#F2B33D', '#6FA8FF'];
  const n = phaseFinished ? 40 : 18;
  let confetti = '';
  for (let i = 0; i < n; i++) {
    confetti += `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.3}s;animation-duration:${0.9 + Math.random() * 0.8}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
  }
  el.innerHTML = `<div class="confetti">${confetti}</div>
    <div class="cel-box ${phaseFinished ? 'big' : ''}">
      <div class="cel-icon">${phaseFinished ? '🏅' : '✅'}</div>
      <div class="cel-pts">+${pts}</div>
      <div class="cel-msg">${phaseFinished ? `مرحلة «${esc(p.title)}» مكتملة!` : CHEERS[Math.floor(Math.random() * CHEERS.length)]}</div>
      ${phaseFinished ? `<div class="cel-id">${esc(IDENTITY[p.id])}</div>` : ''}
    </div>`;
  el.classList.remove('hidden');
  try { navigator.vibrate?.(phaseFinished ? [40, 60, 40, 60, 120] : 40); } catch (_) { /* no vibration */ }
  clearTimeout(celebrating);
  celebrating = setTimeout(endCelebration, phaseFinished ? 2400 : 1100);
}

function endCelebration() {
  clearTimeout(celebrating);
  celebrating = null;
  $('#celebrate').classList.add('hidden');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('#celebrate')) { endCelebration(); return; }
  const go = e.target.closest('[data-go]');
  if (go) { switchView(go.dataset.go); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'focus-start':
      day.introSeen = true;
      persist();
      render();
      break;
    case 'focus-done': {
      const t = ALL_TASKS.find((x) => x.id === btn.dataset.id);
      if (!t || readiness(t) !== true) return;
      const p = phaseOf(t);
      day.checks[t.id] = true;
      persist();
      celebrate(t, phaseDone(p));
      break;
    }
    case 'go-list':
      switchView('day');
      break;
  }
});

function switchView(v) {
  currentView = v;
  window.scrollTo({ top: 0 });
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
  render();
  checkReminders();
}

/* ---------- Boot ---------- */
function boot() {
  try {
    ensureToday();
    render();
    checkReminders();
  } catch (err) {
    // Never leave a blank screen: offer to restart the day (settings and history are kept).
    $('#view').innerHTML = `<section class="stack"><article class="blob intro">
      <h2 class="display">تعذّر فتح بيانات اليوم</h2>
      <p class="intro-msg">اضغط الزر لإعادة فتح اليوم. إعداداتك وسجلّك محفوظان.</p>
      <button class="cta" id="recover">إعادة فتح اليوم</button>
      <p class="muted" dir="ltr">${esc(err && err.message)}</p>
    </article></section>`;
    $('#recover').onclick = () => { try { localStorage.removeItem(KEY_DAY); } catch (_) { /* ignore */ } location.reload(); };
  }
}
boot();
