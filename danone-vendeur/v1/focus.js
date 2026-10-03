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
    const k = x.toLocaleDateString('en-CA');
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
function renderFocus() {
  if (!day.introSeen) return renderIntro();
  const t = nextTask();
  return t ? renderFocusTask(t) : renderFinale();
}

function statChips(st) {
  return `<div class="chips">
    <span class="chip fire">🔥 ${st.streak} ${st.streak === 1 ? 'يوم' : 'أيام'}</span>
    <span class="chip">⭐ ${fmt(st.total)}</span>
    <span class="chip">${st.level[2]} ${esc(st.level[1])}</span>
  </div>`;
}

function renderIntro() {
  const st = habitStats();
  const first = nextTask() || ALL_TASKS[0];
  const [icon, , mins] = HABIT[first.id];
  const y = st.yesterday;
  let streakMsg;
  if (st.missedLast) streakMsg = '<b>قاعدة اليوم: لا تفوّت مرتين.</b> يوم واحد لا يكسرك — يومان يصنعان عادة جديدة. نعود اليوم.';
  else if (st.streak > 0) streakMsg = `سلسلتك <b>${st.streak} ${st.streak === 1 ? 'يوم' : 'أيام'}</b> متتالية. لا تكسرها اليوم.`;
  else streakMsg = 'اليوم أول يوم في سلسلتك. كل بطل بدأ بيوم واحد.';

  return `<section class="intro">
    <div class="intro-sun">${greeting()}</div>
    ${statChips(st)}
    <div class="identity">
      <div class="identity-k">من أنت اليوم؟</div>
      <div class="identity-v">«أنا بائع محترف: أفحص، أخطط، أبيع، وأُغلق يومي بأرقام نظيفة.»</div>
    </div>
    <p class="intro-msg">${streakMsg}</p>
    ${y ? `<div class="kpis">
        <div class="kpi"><div class="l">نقاط آخر يوم</div><div class="v">${fmt(y.score || 0)}</div></div>
        <div class="kpi"><div class="l">هدف آخر يوم</div><div class="v">${y.targetPct === null ? '—' : y.targetPct + '%'}</div></div>
      </div><p class="intro-msg muted">تحدّي اليوم: تجاوز <b>${fmt(y.score || 0)}</b> نقطة — 1% أفضل يكفي.</p>` : ''}
    <div class="first-step">
      <div class="fs-k">الخطوة الأولى — ${mins} ${mins > 2 ? 'دقائق' : 'دقيقة'} فقط</div>
      <div class="fs-v">${icon} ${esc(first.title)}</div>
    </div>
    <button class="big-btn" data-act="focus-start">ابدأ يومي ▶</button>
  </section>`;
}

function renderDots(current) {
  return `<div class="dots" aria-hidden="true">${PHASES.map((p) => `<div class="dot-group">${p.tasks.map((t) =>
    `<span class="dot ${isDone(t) ? 'on' : ''} ${t.id === current.id ? 'now' : ''}"></span>`).join('')}</div>`).join('')}</div>`;
}

function renderFocusTask(t) {
  const st = habitStats();
  const p = phaseOf(t);
  const pIdx = PHASES.indexOf(p);
  const idx = ALL_TASKS.indexOf(t);
  const [icon, why, mins] = HABIT[t.id];
  const ready = readiness(t);
  const after = ALL_TASKS.slice(idx + 1).find((x) => !isDone(x));
  const hm = new Date().toTimeString().slice(0, 5);
  const enter = lastCardId !== t.id; // animate only when a new task arrives, not on every re-render
  lastCardId = t.id;
  const onRoad = t.phase === 'p6' && day.dashLog.length === 0 && settings.reminders.p6 && hm < settings.reminders.p6;

  return `<section class="focus">
    ${statChips(st)}
    ${renderDots(t)}
    ${onRoad ? `<div class="road">🚚 أنت الآن في الجولة — بالتوفيق!<br>سأذكّرك الساعة <b>${esc(settings.reminders.p6)}</b> لمتابعة لوحة التحكم.</div>` : ''}
    <article class="f-card task ${enter ? 'enter' : ''}" id="task-${t.id}">
      <div class="f-phase">المرحلة ${pIdx + 1}/${PHASES.length} · ${esc(p.title)}</div>
      <div class="f-icon">${icon}</div>
      <div class="f-step">الخطوة ${idx + 1} من ${ALL_TASKS.length} · ⏱ ${mins} د</div>
      <h2 class="f-title">${esc(t.title)}</h2>
      <p class="f-hint">${esc(t.hint)}</p>
      <p class="f-why">💡 ${esc(why)}</p>
      <div class="f-body">${renderTaskBody(t)}</div>
      <div class="ready-msg">${ready === true ? '' : `<div class="alert warn">${esc(ready)}</div>`}</div>
      <button class="big-btn done-btn" id="chk-${t.id}" data-act="focus-done" data-id="${t.id}" ${ready === true ? '' : 'disabled'}>تم ✓</button>
    </article>
    ${after ? `<div class="after">بعدها مباشرة: ${HABIT[after.id][0]} ${esc(after.title)}</div>` : ''}
    <button class="link-btn" data-act="go-list">عرض كل المهام</button>
  </section>`;
}

function renderFinale() {
  const st = habitStats();
  const y = st.yesterday;
  const delta = y ? st.todayScore - (y.score || 0) : null;
  const toNext = st.nextLevel ? st.nextLevel[0] - st.total : 0;
  const firstRem = settings.reminders.p1;
  return `<section class="intro finale">
    <div class="trophy">🏆</div>
    <div class="intro-sun">يوم مكتمل!</div>
    ${statChips(st)}
    <div class="kpis">
      <div class="kpi"><div class="l">نقاط اليوم</div><div class="v ok">${fmt(st.todayScore)}</div></div>
      <div class="kpi"><div class="l">مقارنة بآخر يوم</div><div class="v ${delta === null ? '' : delta >= 0 ? 'ok' : 'bad'}">${delta === null ? '—' : signed(delta)}</div></div>
    </div>
    ${st.nextLevel ? `<p class="intro-msg">باقي <b>${fmt(toNext)}</b> نقطة للوصول إلى ${st.nextLevel[2]} <b>${esc(st.nextLevel[1])}</b>.</p>` : ''}
    <div class="identity"><div class="identity-v">«لم تُنجز مهاماً فقط — صوّتَّ اليوم لصالح البائع الذي تريد أن تكونه.»</div></div>
    <p class="intro-msg muted">نلتقي غداً${firstRem ? ' ⏰ ' + esc(firstRem) : ''}. ارتح جيداً.</p>
    <button class="link-btn" data-act="go-list">مراجعة اليوم</button>
  </section>`;
}

/* ---------- Reward ---------- */
let celebrating = null;

function celebrate(t, phaseFinished) {
  const p = phaseOf(t);
  const pts = 10 + (phaseFinished ? 20 : 0);
  const el = $('#celebrate');
  const colors = ['#0b4ea2', '#e30613', '#f5b301', '#1f9d55', '#3d82e0'];
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
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
  render();
  checkReminders();
}

/* ---------- Boot ---------- */
render();
checkReminders();
