'use strict';

/* ============================================================
   يوم البائع — قائمة المهام اليومية للبائع (تطبيق ويب يعمل دون إنترنت)
   البيانات محفوظة محلياً على الهاتف (localStorage).
   ============================================================ */

const KEY_SETTINGS = 'yb:settings';
const KEY_DAY = 'yb:day';
const KEY_HIST = 'yb:history';

const DEFAULT_SETTINGS = {
  name: '',
  code: '',
  route: '',
  currency: 'دج',
  supervisorPhone: '',
  strictOrder: true,
  offDay: 5, // 0=الأحد … 5=الجمعة، يوم الراحة لا يكسر السلسلة
  minDashboardChecks: 2,
  minPaperRolls: 3,
  maxColdTemp: 6,
  skus: ['ياغورت طبيعي', 'ياغورت بالفواكه', 'ياغورت للشرب', 'دانيت', 'أكتيفيا', 'جبن طري'],
  reminders: { p1: '06:30', p2: '06:45', p3: '06:55', p4: '07:00', p5: '07:10', p6: '12:30', p7: '16:30' },
};

const SALES_STEPS = [
  ['التحضير', 'راجع تاريخ الزبون: آخر طلبية، الديون، المنتجات المفقودة عنده.'],
  ['التحية وبناء العلاقة', 'تحية، سؤال عن النشاط، استماع لملاحظات الزبون.'],
  ['فحص نقطة البيع', 'الثلاجة، الرف، تواريخ الصلاحية، دوران المخزون (الأقدم أولاً FIFO)، سحب التالف.'],
  ['جرد مخزون الزبون', 'عدّ ما تبقى من كل منتج لتحديد الكمية المناسبة.'],
  ['اقتراح الطلبية', 'اقترح كمية مبنية على المبيعات + المنتجات الجديدة والعروض.'],
  ['معالجة الاعتراضات', 'السعر، المساحة، الدوران: أجب بالأرقام والفائدة للزبون.'],
  ['التنفيذ في المحل', 'ترتيب الرف والثلاجة، وضع مواد الترويج، واجهة المنتجات.'],
  ['الفاتورة والتحصيل', 'إصدار الفاتورة من التطبيق، طباعتها، التحصيل، تسجيل الدين إن وجد.'],
  ['الختام', 'تأكيد موعد الزيارة القادمة وتسجيل أي معلومة سوقية.'],
];

/* ---------- Phases & tasks (order = execution order) ---------- */
const PHASES = [
  {
    id: 'p1', title: 'فحص الشاحنة', tasks: [
      { id: 'truck_walk', kind: 'simple', title: 'جولة حول الشاحنة', hint: 'الإطارات، الأضواء، المرايا، الأبواب، نظافة الصندوق، الوثائق.' },
      { id: 'oil', kind: 'oknok', title: 'التحقق من مستوى زيت المحرك', hint: 'المستوى بين علامتي MIN و MAX على العصا.' },
      { id: 'water', kind: 'oknok', title: 'التحقق من مستوى ماء التبريد', hint: 'المحرك بارد — المستوى في الخزان الاحتياطي بين MIN و MAX.' },
      { id: 'cold', kind: 'cold', title: 'حرارة صندوق التبريد', hint: 'سلسلة التبريد: منتجات الألبان بين 0 و 6 درجات.' },
    ],
  },
  {
    id: 'p2', title: 'أدوات العمل', tasks: [
      { id: 'phone', kind: 'simple', title: 'الهاتف مشحون ومتصل بالإنترنت', hint: 'البطارية ممتلئة + الشاحن في الشاحنة + رصيد الإنترنت.' },
      { id: 'printer', kind: 'simple', title: 'الطابعة المحمولة مشحونة ومتصلة', hint: 'اقتران البلوتوث مع الهاتف + طباعة تجريبية.' },
      { id: 'paper', kind: 'paper', title: 'ورق الطباعة كافٍ', hint: 'عدّ لفات الورق المتوفرة.' },
    ],
  },
  {
    id: 'p3', title: 'تطبيق البيع', tasks: [
      { id: 'app_open', kind: 'simple', title: 'فتح تطبيق البيع وتسجيل الدخول', hint: 'تأكد من التاريخ والحساب الصحيح.' },
      { id: 'app_session', kind: 'simple', title: 'فتح يوم البيع ومزامنة البيانات', hint: 'تحميل الجولة، الأسعار، العروض، والمخزون المشحون.' },
    ],
  },
  {
    id: 'p4', title: 'تخطيط اليوم', tasks: [
      { id: 'clients', kind: 'clients', title: 'مراجعة زبائن اليوم الواجب زيارتهم', hint: 'الجولة في التطبيق: الترتيب، الزبائن ذوو الأولوية، الديون المستحقة.' },
      { id: 'steps', kind: 'steps', title: 'مراجعة خطوات البيع', hint: 'اقرأ الخطوات قبل أول زيارة.' },
    ],
  },
  {
    id: 'p5', title: 'مطابقة مخزون الانطلاق', tasks: [
      { id: 'stock_start', kind: 'stockStart', title: 'مخزون التطبيق = المخزون الفعلي في الشاحنة', hint: 'عُدّ كل منتج في الشاحنة وقارنه بمخزون التطبيق قبل الانطلاق.' },
    ],
  },
  {
    id: 'p6', title: 'أثناء الجولة', tasks: [
      { id: 'dashboard', kind: 'dashboard', title: 'متابعة لوحة التحكم في التطبيق', hint: 'سجّل نقطة متابعة منتصف اليوم وبعد الظهر: الزيارات، المبيعات، التقدم نحو الهدف.' },
      { id: 'market', kind: 'market', title: 'رفع المعلومات السوقية في قروب واتساب', hint: 'المنافسة، الأسعار، نفاد المخزون، العروض، ملاحظات الزبائن.' },
    ],
  },
  {
    id: 'p7', title: 'إغلاق اليوم', tasks: [
      { id: 'target', kind: 'target', title: 'التحقق من تحقيق الهدف اليومي', hint: 'قارن المحقق بالهدف من لوحة التحكم.' },
      { id: 'returns', kind: 'returns', title: 'حساب مخزون الرجوع', hint: 'الرجوع النظري = المشحون − المباع. عُدّ الرجوع الفعلي وقارن.' },
      { id: 'cash', kind: 'cash', title: 'حساب المداخيل والتحقق من رقم التطبيق', hint: 'عُدّ النقود والشيكات وقارنها بمبلغ التحصيل في التطبيق.' },
      { id: 'report', kind: 'report', title: 'إرسال التقرير اليومي للمشرف', hint: 'ملخص اليوم جاهز للإرسال عبر واتساب.' },
    ],
  },
];

const ALL_TASKS = PHASES.flatMap((p) => p.tasks.map((t) => ({ ...t, phase: p.id })));

/* ---------- Storage ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* storage full / blocked */ }
}

const todayKey = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)

let settings = { ...DEFAULT_SETTINGS, ...load(KEY_SETTINGS, {}) };
settings.reminders = { ...DEFAULT_SETTINGS.reminders, ...(settings.reminders || {}) };

function newDay() {
  return {
    date: todayKey(),
    checks: {},
    v: {},
    stock: settings.skus.map((name) => ({ name, app: '', phys: '', sold: '', ret: '' })),
    dashLog: [],
    notified: {},
    startedAt: null,
  };
}

let day = load(KEY_DAY, null);
if (!day || day.date !== todayKey()) {
  if (day) archive(day);
  day = newDay();
  save(KEY_DAY, day);
}

function persist() {
  save(KEY_DAY, day);
  archive(day);
}

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (x) => (x === '' || x === null || x === undefined || isNaN(Number(x)) ? null : Number(x));
const has = (x) => num(x) !== null;
const fmt = (n) => (n === null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
const money = (n) => (n === null ? '—' : `${fmt(n)} ${settings.currency}`);
const signed = (n) => (n === null ? '—' : (n > 0 ? '+' : '') + fmt(n));
const nowHM = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const note = (id) => (day.v[id + '_note'] || '').trim();

/* ---------- Calculations ---------- */
function stockStartCalc() {
  const rows = day.stock.filter((r) => r.name.trim());
  const filled = rows.length > 0 && rows.every((r) => has(r.app) && has(r.phys));
  let diffUnits = 0, appTotal = 0, physTotal = 0;
  rows.forEach((r) => {
    if (has(r.app) && has(r.phys)) {
      diffUnits += Math.abs(num(r.phys) - num(r.app));
      appTotal += num(r.app);
      physTotal += num(r.phys);
    }
  });
  return { rows, filled, diffUnits, appTotal, physTotal };
}

function returnsCalc() {
  const rows = day.stock.filter((r) => r.name.trim());
  const filled = rows.length > 0 && rows.every((r) => has(r.phys) && has(r.sold) && has(r.ret));
  let theo = 0, real = 0, diffUnits = 0, sold = 0;
  rows.forEach((r) => {
    if (has(r.phys) && has(r.sold) && has(r.ret)) {
      const t = num(r.phys) - num(r.sold);
      theo += t;
      real += num(r.ret);
      sold += num(r.sold);
      diffUnits += Math.abs(num(r.ret) - t);
    }
  });
  return { rows, filled, theo, real, sold, diffUnits };
}

function targetCalc() {
  const t = num(day.v.target_goal), a = num(day.v.target_done);
  const pct = t && a !== null ? Math.round((a / t) * 100) : null;
  return { t, a, pct };
}

function cashCalc() {
  const cash = num(day.v.cash_cash), chq = num(day.v.cash_chq) ?? 0, app = num(day.v.cash_app);
  const collected = cash === null ? null : cash + chq;
  const diff = collected !== null && app !== null ? Math.round((collected - app) * 100) / 100 : null;
  return { cash, chq, app, collected, diff };
}

/* ---------- Task readiness: the "done" checkbox unlocks only when the data is complete ---------- */
function readiness(t) {
  switch (t.kind) {
    case 'oknok': {
      const v = day.v[t.id];
      if (!v) return 'اختر الحالة أولاً.';
      if (v === 'nok' && !note(t.id)) return 'اكتب ما تم فعله (إضافة / إبلاغ الصيانة).';
      return true;
    }
    case 'cold': {
      const c = num(day.v.cold);
      if (c === null) return 'أدخل الحرارة.';
      if (c > settings.maxColdTemp && !note('cold')) return 'الحرارة مرتفعة: اكتب الإجراء المتخذ.';
      return true;
    }
    case 'paper': {
      const p = num(day.v.paper);
      if (p === null) return 'أدخل عدد اللفات.';
      if (p < settings.minPaperRolls && !note('paper')) return `أقل من ${settings.minPaperRolls} لفات: اطلب ورقاً واكتب ملاحظة.`;
      return true;
    }
    case 'clients':
      return has(day.v.clients_planned) && num(day.v.clients_planned) > 0 ? true : 'أدخل عدد زبائن اليوم.';
    case 'stockStart': {
      const c = stockStartCalc();
      if (!c.filled) return 'أدخل الكميتين لكل منتج.';
      if (c.diffUnits > 0 && !note('stock_start')) return 'يوجد فارق: اكتب السبب وأبلغ المسؤول قبل الانطلاق.';
      return true;
    }
    case 'dashboard':
      return day.dashLog.length >= settings.minDashboardChecks
        ? true : `سجّل ${settings.minDashboardChecks} نقاط متابعة على الأقل (${day.dashLog.length} حالياً).`;
    case 'market':
      return day.v.market_sent ? true : 'أرسل المعلومات عبر واتساب أولاً.';
    case 'target': {
      const c = targetCalc();
      if (c.pct === null) return 'أدخل الهدف والمحقق.';
      if (c.pct < 100 && !note('target')) return 'الهدف غير محقق: اكتب الأسباب.';
      return true;
    }
    case 'returns': {
      const c = returnsCalc();
      if (!c.filled) return 'أدخل المباع والرجوع الفعلي لكل منتج (المشحون من مرحلة الانطلاق).';
      if (c.diffUnits > 0 && !note('returns')) return 'يوجد فارق في الرجوع: اكتب السبب.';
      return true;
    }
    case 'cash': {
      const c = cashCalc();
      if (c.collected === null || c.app === null) return 'أدخل المبلغ النقدي ومبلغ التطبيق.';
      if (c.diff !== 0 && !note('cash')) return 'يوجد فارق في المداخيل: اكتب السبب.';
      return true;
    }
    case 'report':
      return day.v.report_sent ? true : 'أرسل التقرير أولاً.';
    default:
      return true;
  }
}

const isDone = (t) => !!day.checks[t.id] && readiness(t) === true;
const phaseDone = (p) => p.tasks.every(isDone);
function phaseLocked(idx) {
  if (!settings.strictOrder) return false;
  return PHASES.slice(0, idx).some((p) => !phaseDone(p));
}

/* ---------- Rendering ---------- */
let currentView = 'focus';

function render() {
  renderHeader();
  const v = $('#view');
  if (currentView === 'focus') v.innerHTML = renderFocus();
  else if (currentView === 'day') v.innerHTML = renderDay();
  else if (currentView === 'history') v.innerHTML = renderHistory();
  else v.innerHTML = renderSettings();
}

function renderHeader() {
  const done = ALL_TASKS.filter(isDone).length;
  const pct = Math.round((done / ALL_TASKS.length) * 100);
  $('#progressBar').style.width = pct + '%';
  $('#progressLabel').textContent = `${done} / ${ALL_TASKS.length} مهمة — \u2066${pct}%\u2069`;
  $('#who').textContent = [settings.name || 'البائع', settings.code, settings.route].filter(Boolean).join(' · ');
  $('#today').textContent = new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderDay() {
  const next = ALL_TASKS.find((t) => !isDone(t));
  let html = next
    ? `<div class="next"><div class="k">المهمة التالية</div><div class="t">${esc(next.title)}</div></div>`
    : `<div class="next done"><div class="k">اليوم مكتمل</div><div class="t">كل المهام منجزة ✔</div></div>`;

  const openPhase = next ? next.phase : null;
  PHASES.forEach((p, i) => {
    const locked = phaseLocked(i);
    const complete = phaseDone(p);
    const doneCount = p.tasks.filter(isDone).length;
    const rem = settings.reminders[p.id];
    const open = p.id === openPhase || openState[p.id];
    html += `<details class="phase ${complete ? 'complete' : ''} ${locked ? 'locked' : ''}" data-phase="${p.id}" ${open ? 'open' : ''}>
      <summary>
        <span class="num">${complete ? '✔' : i + 1}</span>
        <span class="ph-title">${esc(p.title)}</span>
        <span class="ph-meta">${rem ? '⏰ ' + rem + ' · ' : ''}${doneCount}/${p.tasks.length}</span>
      </summary>
      ${locked
        ? `<div class="locked-note">🔒 أكمل المراحل السابقة أولاً.</div>`
        : p.tasks.map(renderTask).join('')}
    </details>`;
  });

  html += `<div class="actions"><button class="btn danger sm" data-act="reset-day">إعادة تعيين اليوم</button></div>`;
  return html;
}

const openState = {};

function renderTask(t) {
  const ready = readiness(t);
  const done = isDone(t);
  return `<div class="task ${done ? 'done' : ''}" id="task-${t.id}">
    <div class="task-head">
      <input type="checkbox" id="chk-${t.id}" data-check="${t.id}" ${done ? 'checked' : ''} ${ready === true ? '' : 'disabled'}>
      <label for="chk-${t.id}">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-hint">${esc(t.hint)}</div>
      </label>
    </div>
    <div class="task-body">${renderTaskBody(t)}<div class="ready-msg">${ready === true ? '' : `<div class="alert warn">${esc(ready)}</div>`}</div></div>
  </div>`;
}

// Conditional blocks (warning + reason box) toggled in place, so typing never rebuilds the card.
const COND = {
  cold: () => has(day.v.cold) && num(day.v.cold) > settings.maxColdTemp,
  paper: () => has(day.v.paper) && num(day.v.paper) < settings.minPaperRolls,
};

const inputNum = (key, val, ph = '') =>
  `<input class="field" type="number" inputmode="decimal" data-v="${key}" value="${esc(val ?? '')}" placeholder="${esc(ph)}">`;
const noteBox = (id, ph) =>
  `<textarea class="field" data-v="${id}_note" placeholder="${esc(ph)}">${esc(day.v[id + '_note'] || '')}</textarea>`;

function renderTaskBody(t) {
  switch (t.kind) {
    case 'oknok': {
      const v = day.v[t.id];
      return `<div class="row"><div class="seg">
          <button data-set="${t.id}" data-val="ok" class="${v === 'ok' ? 'on-ok' : ''}">سليم</button>
          <button data-set="${t.id}" data-val="nok" class="${v === 'nok' ? 'on-bad' : ''}">ناقص / مشكل</button>
        </div></div>
        ${v === 'nok' ? `<div class="alert bad">لا تنطلق قبل المعالجة. أكمل المستوى أو أبلغ الصيانة.</div>${noteBox(t.id, 'الإجراء المتخذ…')}` : ''}`;
    }
    case 'cold':
      return `<div class="row"><label>الحرارة (°C)</label>${inputNum('cold', day.v.cold, '4')}</div>
        <div data-cond="cold" ${COND.cold() ? '' : 'hidden'}>
          <div class="alert bad">أعلى من ${settings.maxColdTemp}°C — خطر على المنتجات.</div>
          ${noteBox('cold', 'الإجراء: تشغيل التبريد، إبلاغ الصيانة…')}
        </div>`;
    case 'paper':
      return `<div class="row"><label>عدد اللفات</label>${inputNum('paper', day.v.paper, String(settings.minPaperRolls))}</div>
        <div data-cond="paper" ${COND.paper() ? '' : 'hidden'}>
          <div class="alert warn">مخزون الورق منخفض.</div>${noteBox('paper', 'ملاحظة…')}
        </div>`;
    case 'clients':
      return `<div class="row"><label>عدد الزبائن المخطط</label>${inputNum('clients_planned', day.v.clients_planned, '0')}</div>
        <div class="row"><label>أولويات اليوم</label></div>
        <textarea class="field" data-v="clients_notes" placeholder="زبائن جدد، ديون للتحصيل، طلبيات خاصة…">${esc(day.v.clients_notes || '')}</textarea>`;
    case 'steps':
      return `<ol class="steps">${SALES_STEPS.map(([a, b]) => `<li><b>${esc(a)}:</b> ${esc(b)}</li>`).join('')}</ol>`;
    case 'stockStart': return renderStockStart();
    case 'dashboard': return renderDashboard();
    case 'market': return renderMarket();
    case 'target': return renderTarget();
    case 'returns': return renderReturns();
    case 'cash': return renderCash();
    case 'report': return renderReport();
    default: return '';
  }
}

function renderStockStart() {
  const rows = day.stock.map((r, i) => {
    const d = has(r.app) && has(r.phys) ? num(r.phys) - num(r.app) : null;
    return `<tr>
      <td><input class="field" type="text" data-stock="${i}" data-f="name" value="${esc(r.name)}"></td>
      <td><input class="field" type="number" inputmode="numeric" data-stock="${i}" data-f="app" value="${esc(r.app)}"></td>
      <td><input class="field" type="number" inputmode="numeric" data-stock="${i}" data-f="phys" value="${esc(r.phys)}"></td>
      <td class="diff ${d === null ? '' : d === 0 ? 'ok' : 'bad'}" data-diff="s${i}">${signed(d)}</td>
      <td><button class="btn ghost sm" data-act="del-sku" data-i="${i}" aria-label="حذف">✕</button></td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table>
      <thead><tr><th>المنتج</th><th>التطبيق</th><th>الفعلي</th><th>الفارق</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <button class="btn ghost sm" data-act="add-sku">+ منتج</button>
    <div data-out="stock_start">${stockStartSummary()}</div>
    ${noteBox('stock_start', 'سبب الفارق / اسم المسؤول المُبلَّغ…')}`;
}
function stockStartSummary() {
  const c = stockStartCalc();
  if (!c.filled) return '';
  return `<div class="kpis">
      <div class="kpi"><div class="l">إجمالي التطبيق</div><div class="v">${fmt(c.appTotal)}</div></div>
      <div class="kpi"><div class="l">إجمالي الفعلي</div><div class="v">${fmt(c.physTotal)}</div></div>
      <div class="kpi"><div class="l">وحدات بفارق</div><div class="v ${c.diffUnits ? 'bad' : 'ok'}">${fmt(c.diffUnits)}</div></div>
    </div>${c.diffUnits ? '<div class="alert bad">المخزون غير مطابق — صحّح قبل الانطلاق.</div>' : '<div class="alert ok">المخزون مطابق ✔</div>'}`;
}

function renderDashboard() {
  const log = day.dashLog.map((e) =>
    `<li>${esc(e.time)} — زيارات: ${fmt(num(e.visits))}${has(day.v.clients_planned) ? '/' + fmt(num(day.v.clients_planned)) : ''} · مبيعات: ${money(num(e.sales))}</li>`).join('');
  return `<div class="row"><label>الزيارات المنجزة</label>${inputNum('dash_visits', day.v.dash_visits)}</div>
    <div class="row"><label>المبيعات حتى الآن</label>${inputNum('dash_sales', day.v.dash_sales)}</div>
    <button class="btn sm" data-act="dash-log">تسجيل نقطة متابعة (${nowHM()})</button>
    ${log ? `<ul class="log">${log}</ul>` : ''}`;
}

function marketText() {
  const f = (k) => (day.v[k] || '').trim() || '—';
  return [
    `📊 معلومات السوق — ${settings.name || 'البائع'}${settings.route ? ' — ' + settings.route : ''}`,
    `📅 ${todayKey()} ${nowHM()}`,
    `• المنافسة (منتجات/نشاط): ${f('m_comp')}`,
    `• الأسعار في السوق: ${f('m_price')}`,
    `• نفاد المخزون عند الزبائن: ${f('m_oos')}`,
    `• عروض وترويج المنافسين: ${f('m_promo')}`,
    `• ملاحظات وشكاوى الزبائن: ${f('m_client')}`,
  ].join('\n');
}
function renderMarket() {
  const fld = (k, l, ph) => `<div class="row"><label>${l}</label></div><textarea class="field" data-v="${k}" placeholder="${esc(ph)}">${esc(day.v[k] || '')}</textarea>`;
  return fld('m_comp', 'المنافسة', 'منتج جديد، تواجد، حصة الرف…')
    + fld('m_price', 'الأسعار', 'سعر البيع للمستهلك، تغييرات…')
    + fld('m_oos', 'نفاد المخزون', 'الزبائن والمنتجات المفقودة…')
    + fld('m_promo', 'العروض', 'عروض المنافسين، هدايا، تخفيضات…')
    + fld('m_client', 'الزبائن', 'شكاوى، طلبات، جودة…')
    + `<div class="actions"><button class="btn wa" data-act="market-send">إرسال إلى قروب واتساب</button></div>
       ${day.v.market_sent ? `<div class="alert ok">أُرسلت الساعة ${esc(day.v.market_sent)}</div>` : ''}`;
}

function renderTarget() {
  return `<div class="row"><label>الهدف اليومي (${esc(settings.currency)})</label>${inputNum('target_goal', day.v.target_goal)}</div>
    <div class="row"><label>المحقق (${esc(settings.currency)})</label>${inputNum('target_done', day.v.target_done)}</div>
    <div data-out="target">${targetSummary()}</div>
    ${noteBox('target', 'أسباب عدم التحقيق وخطة التدارك غداً…')}`;
}
function targetSummary() {
  const c = targetCalc();
  if (c.pct === null) return '';
  const cls = c.pct >= 100 ? 'ok' : c.pct >= 90 ? 'warn' : 'bad';
  return `<div class="kpis">
      <div class="kpi"><div class="l">نسبة التحقيق</div><div class="v ${cls}">${c.pct}%</div></div>
      <div class="kpi"><div class="l">الفارق</div><div class="v ${cls}">${money(c.a - c.t)}</div></div>
    </div>`;
}

function renderReturns() {
  const rows = day.stock.filter((r) => r.name.trim()).map((r) => {
    const i = day.stock.indexOf(r);
    const theo = has(r.phys) && has(r.sold) ? num(r.phys) - num(r.sold) : null;
    const d = theo !== null && has(r.ret) ? num(r.ret) - theo : null;
    return `<tr>
      <td>${esc(r.name)}</td>
      <td>${fmt(num(r.phys))}</td>
      <td><input class="field" type="number" inputmode="numeric" data-stock="${i}" data-f="sold" value="${esc(r.sold)}"></td>
      <td data-theo="${i}">${fmt(theo)}</td>
      <td><input class="field" type="number" inputmode="numeric" data-stock="${i}" data-f="ret" value="${esc(r.ret)}"></td>
      <td class="diff ${d === null ? '' : d === 0 ? 'ok' : 'bad'}" data-diff="r${i}">${signed(d)}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table>
      <thead><tr><th>المنتج</th><th>المشحون</th><th>المباع</th><th>الرجوع النظري</th><th>الرجوع الفعلي</th><th>الفارق</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div data-out="returns">${returnsSummary()}</div>
    ${noteBox('returns', 'سبب الفارق: تالف، خطأ فوترة، هدايا…')}`;
}
function returnsSummary() {
  const c = returnsCalc();
  if (!c.filled) return '';
  return `<div class="kpis">
      <div class="kpi"><div class="l">المباع</div><div class="v">${fmt(c.sold)}</div></div>
      <div class="kpi"><div class="l">الرجوع النظري</div><div class="v">${fmt(c.theo)}</div></div>
      <div class="kpi"><div class="l">الرجوع الفعلي</div><div class="v">${fmt(c.real)}</div></div>
      <div class="kpi"><div class="l">وحدات بفارق</div><div class="v ${c.diffUnits ? 'bad' : 'ok'}">${fmt(c.diffUnits)}</div></div>
    </div>`;
}

function renderCash() {
  return `<div class="row"><label>النقود المعدودة</label>${inputNum('cash_cash', day.v.cash_cash)}</div>
    <div class="row"><label>شيكات / تحويلات</label>${inputNum('cash_chq', day.v.cash_chq, '0')}</div>
    <div class="row"><label>مبلغ التحصيل في التطبيق</label>${inputNum('cash_app', day.v.cash_app)}</div>
    <div data-out="cash">${cashSummary()}</div>
    ${noteBox('cash', 'سبب الفارق: دين غير مسجل، خطأ إدخال…')}`;
}
function cashSummary() {
  const c = cashCalc();
  if (c.collected === null || c.app === null) return '';
  const cls = c.diff === 0 ? 'ok' : 'bad';
  return `<div class="kpis">
      <div class="kpi"><div class="l">المحصّل الفعلي</div><div class="v">${money(c.collected)}</div></div>
      <div class="kpi"><div class="l">رقم التطبيق</div><div class="v">${money(c.app)}</div></div>
      <div class="kpi"><div class="l">الفارق</div><div class="v ${cls}">${money(c.diff)}</div></div>
    </div>${c.diff === 0 ? '<div class="alert ok">المداخيل مطابقة ✔</div>' : `<div class="alert bad">${c.diff < 0 ? 'عجز' : 'فائض'} في الصندوق.</div>`}`;
}

function reportText() {
  const s = stockStartCalc(), r = returnsCalc(), t = targetCalc(), c = cashCalc();
  const done = ALL_TASKS.filter(isDone).length;
  const last = day.dashLog[day.dashLog.length - 1];
  const lines = [
    `📋 التقرير اليومي — ${settings.name || 'البائع'}${settings.code ? ' (' + settings.code + ')' : ''}`,
    `${settings.route ? 'الجولة: ' + settings.route + ' · ' : ''}${todayKey()}`,
    `✅ المهام: ${done}/${ALL_TASKS.length}`,
    `🚚 الشاحنة: زيت ${day.v.oil === 'ok' ? 'سليم' : day.v.oil === 'nok' ? 'مشكل' : '—'} · ماء ${day.v.water === 'ok' ? 'سليم' : day.v.water === 'nok' ? 'مشكل' : '—'} · تبريد ${has(day.v.cold) ? day.v.cold + '°C' : '—'}`,
    `👥 الزيارات: ${last ? fmt(num(last.visits)) : '—'} / ${fmt(num(day.v.clients_planned))}`,
    `🎯 الهدف: ${money(t.a)} / ${money(t.t)} (${t.pct === null ? '—' : t.pct + '%'})`,
    `📦 فارق مخزون الانطلاق: ${s.filled ? fmt(s.diffUnits) + ' وحدة' : '—'}`,
    `↩️ الرجوع: نظري ${r.filled ? fmt(r.theo) : '—'} / فعلي ${r.filled ? fmt(r.real) : '—'} · فارق ${r.filled ? fmt(r.diffUnits) : '—'}`,
    `💰 المداخيل: ${money(c.collected)} / التطبيق ${money(c.app)} · فارق ${money(c.diff)}`,
  ];
  ['stock_start', 'target', 'returns', 'cash'].forEach((k) => {
    if (note(k)) lines.push(`📝 ${k === 'stock_start' ? 'مخزون' : k === 'target' ? 'الهدف' : k === 'returns' ? 'الرجوع' : 'المداخيل'}: ${note(k)}`);
  });
  return lines.join('\n');
}
function renderReport() {
  return `<pre class="field report">${esc(reportText())}</pre>
    <div class="actions">
      <button class="btn wa" data-act="report-send">إرسال للمشرف عبر واتساب</button>
      <button class="btn ghost" data-act="report-copy">نسخ</button>
    </div>
    ${day.v.report_sent ? `<div class="alert ok">أُرسل الساعة ${esc(day.v.report_sent)}</div>` : ''}`;
}

/* ---------- History ---------- */
function summarize(d) {
  const done = ALL_TASKS.filter((t) => !!d.checks[t.id]).length;
  const prev = day; day = d; // reuse calculators on an archived day
  const s = stockStartCalc(), r = returnsCalc(), t = targetCalc(), c = cashCalc();
  day = prev;
  const phasesDone = PHASES.filter((p) => p.tasks.every((x) => !!d.checks[x.id])).length;
  // Points: 10/task, 20/phase, bonuses for clean numbers and target hit (max 460).
  const score = done * 10 + phasesDone * 20
    + (s.filled && s.diffUnits === 0 ? 30 : 0)
    + (r.filled && r.diffUnits === 0 ? 30 : 0)
    + (c.diff === 0 ? 30 : 0)
    + (t.pct !== null && t.pct >= 100 ? 50 : 0);
  return {
    date: d.date, done, total: ALL_TASKS.length, score,
    targetPct: t.pct, stockDiff: s.filled ? s.diffUnits : null,
    returnDiff: r.filled ? r.diffUnits : null, cashDiff: c.diff,
  };
}
function archive(d) {
  const h = load(KEY_HIST, {});
  h[d.date] = summarize(d);
  const keys = Object.keys(h).sort().reverse();
  keys.slice(60).forEach((k) => delete h[k]); // keep 60 days
  save(KEY_HIST, h);
}

function renderHistory() {
  const h = load(KEY_HIST, {});
  const rows = Object.values(h).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rows.length) return `<div class="card"><p class="muted">لا يوجد سجل بعد.</p></div>`;
  const cls = (v, good) => (v === null ? '' : good(v) ? 'ok' : 'bad');
  const last = rows.slice(0, 30);
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  const targetAvg = avg(last.map((x) => x.targetPct).filter((x) => x !== null));
  const compAvg = avg(last.map((x) => Math.round((x.done / x.total) * 100)));
  const cashIssues = last.filter((x) => x.cashDiff !== null && x.cashDiff !== 0).length;
  const stockIssues = last.filter((x) => (x.stockDiff || 0) > 0 || (x.returnDiff || 0) > 0).length;
  return `<div class="card"><h2>مؤشرات آخر ${last.length} يوم</h2>
      <div class="kpis">
        <div class="kpi"><div class="l">متوسط الانضباط</div><div class="v ${compAvg >= 90 ? 'ok' : 'warn'}">${compAvg ?? '—'}%</div></div>
        <div class="kpi"><div class="l">متوسط تحقيق الهدف</div><div class="v ${targetAvg >= 100 ? 'ok' : 'warn'}">${targetAvg ?? '—'}%</div></div>
        <div class="kpi"><div class="l">أيام بفارق مداخيل</div><div class="v ${cashIssues ? 'bad' : 'ok'}">${cashIssues}</div></div>
        <div class="kpi"><div class="l">أيام بفارق مخزون</div><div class="v ${stockIssues ? 'bad' : 'ok'}">${stockIssues}</div></div>
      </div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>التاريخ</th><th>المهام</th><th>الهدف</th><th>مخزون</th><th>رجوع</th><th>مداخيل</th></tr></thead>
      <tbody>${rows.map((x) => `<tr>
        <td>${esc(x.date)}</td>
        <td class="diff ${x.done === x.total ? 'ok' : 'bad'}">${x.done}/${x.total}</td>
        <td class="diff ${cls(x.targetPct, (v) => v >= 100)}">${x.targetPct === null ? '—' : x.targetPct + '%'}</td>
        <td class="diff ${cls(x.stockDiff, (v) => v === 0)}">${fmt(x.stockDiff)}</td>
        <td class="diff ${cls(x.returnDiff, (v) => v === 0)}">${fmt(x.returnDiff)}</td>
        <td class="diff ${cls(x.cashDiff, (v) => v === 0)}">${signed(x.cashDiff)}</td>
      </tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- Settings ---------- */
function renderSettings() {
  const txt = (k, l, type = 'text', ph = '') =>
    `<div class="row"><label>${l}</label><input class="field" type="${type}" data-s="${k}" value="${esc(settings[k])}" placeholder="${esc(ph)}"></div>`;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<div class="card"><h2>البائع</h2>
      ${txt('name', 'الاسم')}
      ${txt('code', 'رمز البائع')}
      ${txt('route', 'الجولة / القطاع')}
      ${txt('currency', 'العملة')}
      ${txt('supervisorPhone', 'واتساب المشرف', 'tel', '2135XXXXXXXX')}
      <p class="muted">رقم دولي بدون + أو 00. إذا تُرك فارغاً يفتح واتساب لاختيار المحادثة.</p>
    </div>
    <div class="card"><h2>القواعد</h2>
      <label class="switch"><input type="checkbox" data-s="strictOrder" ${settings.strictOrder ? 'checked' : ''}> فرض الترتيب (لا تفتح مرحلة قبل إكمال السابقة)</label>
      <div class="row"><label>أقصى حرارة للتبريد (°C)</label><input class="field" type="number" data-s="maxColdTemp" value="${settings.maxColdTemp}"></div>
      <div class="row"><label>أقل عدد لفات ورق</label><input class="field" type="number" data-s="minPaperRolls" value="${settings.minPaperRolls}"></div>
      <div class="row"><label>نقاط متابعة لوحة التحكم</label><input class="field" type="number" data-s="minDashboardChecks" value="${settings.minDashboardChecks}"></div>
    </div>
    <div class="card"><h2>قائمة المنتجات الافتراضية</h2>
      <p class="muted">منتج في كل سطر. تُطبق ابتداءً من اليوم التالي (أو بعد إعادة تعيين اليوم).</p>
      <textarea class="field" data-s="skus" rows="7">${esc(settings.skus.join('\n'))}</textarea>
    </div>
    <div class="card"><h2>التذكيرات</h2>
      ${PHASES.map((p) => `<div class="row"><label>${esc(p.title)}</label><input class="field" type="time" data-rem="${p.id}" value="${esc(settings.reminders[p.id] || '')}"></div>`).join('')}
      <p class="muted">حالة الإشعارات: <b>${{ granted: 'مفعّلة', denied: 'مرفوضة (فعّلها من إعدادات المتصفح)', default: 'غير مفعّلة', unsupported: 'غير مدعومة' }[perm]}</b></p>
      <div class="actions">
        <button class="btn" data-act="notif">تفعيل الإشعارات</button>
        <button class="btn ghost" data-act="ics">إضافة التذكيرات إلى تقويم الهاتف</button>
      </div>
      <p class="muted">إشعارات المتصفح تعمل والتطبيق مفتوح أو في الخلفية. للتذكير المضمون حتى والهاتف مقفل، أضف التذكيرات إلى التقويم (السبت → الخميس).</p>
    </div>`;
}

/* ---------- Reminders ---------- */
function checkReminders() {
  const now = new Date();
  const hm = now.toTimeString().slice(0, 5);
  let pending = null;
  PHASES.forEach((p, i) => {
    const t = settings.reminders[p.id];
    if (!t || hm < t || phaseDone(p)) return;
    if (!pending) pending = { p, i };
    if (!day.notified[p.id]) {
      day.notified[p.id] = hm;
      save(KEY_DAY, day);
      notify(`⏰ ${p.title}`, p.tasks.filter((x) => !isDone(x)).map((x) => '• ' + x.title).join('\n'));
    }
  });
  const b = $('#banner');
  if (pending && currentView === 'day') {
    b.textContent = `⏰ حان وقت: ${pending.p.title} — اضغط للانتقال`;
    b.dataset.phase = pending.p.id;
    b.classList.remove('hidden');
  } else {
    b.classList.add('hidden');
  }
}

async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icon.svg', tag: title, lang: 'ar', dir: 'rtl' });
    else new Notification(title, { body, icon: 'icon.svg' });
  } catch (_) { /* ignore */ }
}

function exportICS() {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const stamp = d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const events = PHASES.filter((p) => settings.reminders[p.id]).map((p) => {
    const [h, m] = settings.reminders[p.id].split(':');
    const desc = p.tasks.map((t) => '- ' + t.title).join('\\n');
    return [
      'BEGIN:VEVENT',
      `UID:yawm-bae-${p.id}@local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${ymd}T${h}${m}00`,
      'DURATION:PT15M',
      'RRULE:FREQ=WEEKLY;BYDAY=SA,SU,MO,TU,WE,TH',
      `SUMMARY:${p.title}`,
      `DESCRIPTION:${desc}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${p.title}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//yawm-bae//AR', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'tadhkirat-al-baee.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function openWhatsApp(text, phone = '') {
  const p = String(phone).replace(/\D/g, '');
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, '_blank');
}

/* ---------- Live refresh without losing input focus ---------- */
function refreshTaskState(t) {
  const el = $(`#task-${t.id}`);
  if (!el) return;
  const ready = readiness(t);
  const chk = $(`#chk-${t.id}`, el);
  chk.disabled = ready !== true;
  chk.checked = isDone(t);
  el.classList.toggle('done', isDone(t));
  $('.ready-msg', el).innerHTML = ready === true ? '' : `<div class="alert warn">${esc(ready)}</div>`;
  const cond = $(`[data-cond="${t.id}"]`, el);
  if (cond && COND[t.id]) cond.hidden = !COND[t.id]();
  const out = { stock_start: stockStartSummary, target: targetSummary, returns: returnsSummary, cash: cashSummary };
  if (out[t.id]) {
    const o = $(`[data-out="${t.id}"]`, el);
    if (o) o.innerHTML = out[t.id]();
  }
  renderHeader();
}

function refreshStockCells(i) {
  const r = day.stock[i];
  const setDiff = (sel, d) => {
    const c = $(sel);
    if (!c) return;
    c.textContent = signed(d);
    c.className = `diff ${d === null ? '' : d === 0 ? 'ok' : 'bad'}`;
  };
  setDiff(`[data-diff="s${i}"]`, has(r.app) && has(r.phys) ? num(r.phys) - num(r.app) : null);
  const theo = has(r.phys) && has(r.sold) ? num(r.phys) - num(r.sold) : null;
  const tc = $(`[data-theo="${i}"]`);
  if (tc) tc.textContent = fmt(theo);
  setDiff(`[data-diff="r${i}"]`, theo !== null && has(r.ret) ? num(r.ret) - theo : null);
}


/* ---------- Events ---------- */
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.v !== undefined) {
    day.v[el.dataset.v] = el.value;
    if (!day.startedAt) day.startedAt = new Date().toISOString();
    persist();
    const id = el.dataset.v.replace(/_note$/, '');
    const owner = ALL_TASKS.find((t) => t.id === id)
      || ALL_TASKS.find((t) => el.closest(`#task-${t.id}`));
    if (owner) refreshTaskState(owner);
  } else if (el.dataset.stock !== undefined) {
    const i = Number(el.dataset.stock);
    day.stock[i][el.dataset.f] = el.value;
    persist();
    refreshStockCells(i);
    refreshTaskState(ALL_TASKS.find((t) => t.id === 'stock_start'));
    if ($('#task-returns')) refreshTaskState(ALL_TASKS.find((t) => t.id === 'returns'));
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.check) {
    day.checks[el.dataset.check] = el.checked;
    persist();
    render();
  } else if (el.dataset.stock !== undefined && el.dataset.f === 'name') {
    render();
  } else if (el.dataset.s) {
    const k = el.dataset.s;
    if (el.type === 'checkbox') settings[k] = el.checked;
    else if (k === 'skus') settings.skus = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else if (el.type === 'number') settings[k] = Number(el.value) || 0;
    else settings[k] = el.value.trim();
    save(KEY_SETTINGS, settings);
    renderHeader();
  } else if (el.dataset.rem) {
    settings.reminders[el.dataset.rem] = el.value;
    save(KEY_SETTINGS, settings);
  }
});

document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches && d.matches('details.phase')) openState[d.dataset.phase] = d.open;
}, true);

document.addEventListener('click', async (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    currentView = tab.dataset.view;
    render();
    checkReminders();
    return;
  }
  if (e.target.closest('#banner')) {
    const id = $('#banner').dataset.phase;
    openState[id] = true;
    render();
    document.querySelector(`[data-phase="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const setBtn = e.target.closest('[data-set]');
  if (setBtn) {
    day.v[setBtn.dataset.set] = setBtn.dataset.val;
    persist();
    render();
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'add-sku':
      day.stock.push({ name: '', app: '', phys: '', sold: '', ret: '' });
      persist(); render(); break;
    case 'del-sku': {
      const i = Number(e.target.closest('[data-i]').dataset.i);
      if (confirm(`حذف "${day.stock[i].name || 'المنتج'}"؟`)) { day.stock.splice(i, 1); persist(); render(); }
      break;
    }
    case 'dash-log':
      day.dashLog.push({ time: nowHM(), visits: day.v.dash_visits || '', sales: day.v.dash_sales || '' });
      persist(); render(); break;
    case 'market-send':
      openWhatsApp(marketText());
      day.v.market_sent = nowHM();
      persist(); render(); break;
    case 'report-send':
      openWhatsApp(reportText(), settings.supervisorPhone);
      day.v.report_sent = nowHM();
      persist(); render(); break;
    case 'report-copy':
      try { await navigator.clipboard.writeText(reportText()); alert('تم النسخ'); } catch (_) { alert('تعذر النسخ'); }
      break;
    case 'reset-day':
      if (confirm('مسح كل بيانات اليوم والبدء من جديد؟')) { day = newDay(); persist(); render(); }
      break;
    case 'notif':
      if (!('Notification' in window)) { alert('المتصفح لا يدعم الإشعارات.'); break; }
      await Notification.requestPermission();
      render();
      if (Notification.permission === 'granted') notify('يوم البائع', 'الإشعارات مفعّلة ✔');
      break;
    case 'ics':
      exportICS(); break;
  }
});

/* ---------- Day rollover & boot ---------- */
setInterval(() => {
  if (day.date !== todayKey()) {
    archive(day);
    day = newDay();
    save(KEY_DAY, day);
    render();
  }
  checkReminders();
}, 30000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkReminders();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Boot happens in focus.js (loaded after this file).
