/* ============================================
   EDGE — Trading Journal
   App logic. All data in localStorage.
   ============================================ */

const ICONS = {
  view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>',
  editLarge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
};

const STORAGE_KEYS = {
  accounts: 'edge_accounts_v1',
  trades: 'edge_trades_v1',
  reviews: 'edge_reviews_v1',
  seeded: 'edge_seeded_v1',
  playbook: 'edge_playbook_v1',
  certificates: 'edge_certificates_v1',
  expenses: 'edge_expenses_v1',
  payouts: 'edge_payouts_v1',
  consistencyMigrated: 'edge_consistency_migrated_v1',
  manualFinance: 'edge_manual_finance_v1',
  daily: 'edge_daily_v1'
};

let state = {
  accounts: [],
  trades: [],
  reviews: [],
  playbook: { rules: '', setups: [] },
  certificates: [],
  expenses: [],
  payouts: [],
  manualFinance: { payoutTotal: null, expenseTotal: null },
  currentAccountId: 'all',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  reviewWeekStart: startOfWeek(new Date()),
  editingTradeId: null,
  editingAccountId: null,
  editingSetupId: null,
  pendingScreenshots: [],
  currentDetailImages: [],
  selectedMistakeTags: [],
  ruleFollowed: true,
  tradeOutcome: 'win',
  outcomeManuallySet: false,
  csvRows: null,
  csvHeaders: null,
  pendingAnalysis: null,
  dailyEntries: [],
  dailyDate: null,
  dailyDiscipline: null,
  dailyRating: null,
  dailyTags: [],
  dailyChecks: [],
  dayViewMode: 'day',
  dailyRange: 'thisMonth',
  openDays: [],
  dayCalMonth: new Date().getMonth(),
  dayCalYear: new Date().getFullYear(),
  dailyState: { sleep: null, energy: null, focus: null, stress: null },
  dashRange: 'all',
  dashDateFrom: null,
  dashDateTo: null
};

let charts = {};

/* ---------------- Utilities ---------------- */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function fmtMoney(n, opts = {}) {
  const sign = n < 0 ? '-' : (opts.forceSign ? '+' : '');
  const abs = Math.abs(n);
  return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMoneyShort(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateShort(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function isoOf(d) { return new Date(d).toISOString().slice(0, 10); }

/* ---------------- Persistence ---------------- */
function loadState() {
  try {
    state.accounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts)) || [];
    state.trades = JSON.parse(localStorage.getItem(STORAGE_KEYS.trades)) || [];
    state.reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.reviews)) || [];
    state.playbook = JSON.parse(localStorage.getItem(STORAGE_KEYS.playbook)) || { rules: '', setups: [] };
    state.certificates = JSON.parse(localStorage.getItem(STORAGE_KEYS.certificates)) || [];
    state.expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses)) || [];
    state.payouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.payouts)) || [];
    state.manualFinance = JSON.parse(localStorage.getItem(STORAGE_KEYS.manualFinance)) || { payoutTotal: null, expenseTotal: null };
    state.dailyEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.daily)) || [];
  } catch (e) {
    state.accounts = []; state.trades = []; state.reviews = [];
    state.playbook = { rules: '', setups: [] }; state.certificates = []; state.expenses = []; state.payouts = [];
  }
  if (!localStorage.getItem(STORAGE_KEYS.seeded) && state.accounts.length === 0) {
    seedDemoData();
    localStorage.setItem(STORAGE_KEYS.seeded, '1');
  }
  if (!localStorage.getItem(STORAGE_KEYS.playbook)) {
    seedPlaybook();
  }
  if (state.accounts.length && !state.accounts.some(a => a.isLeader)) {
    const guess = state.accounts.find(a => /\(leader\)/i.test(a.name));
    if (guess) { guess.isLeader = true; saveAccounts(); }
  }
  if (!localStorage.getItem(STORAGE_KEYS.consistencyMigrated)) {
    let changed = false;
    state.accounts.forEach(a => {
      if (a.consistencyPct === 20) { a.consistencyPct = 50; changed = true; }
    });
    if (changed) saveAccounts();
    localStorage.setItem(STORAGE_KEYS.consistencyMigrated, '1');
  }
}
function saveAccounts() { localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts)); }
function saveTrades() {
  try {
    localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(state.trades));
    return true;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''))) {
      alert('Storage is full — this browser caps saved data at about 5MB, and chart screenshots use most of it.\n\nUse the "Clean up storage" button on the Accounts page to remove duplicated screenshots from copied trades, then try again. Your leader trades and their screenshots are kept.');
    } else {
      alert('Could not save: ' + (err && err.message ? err.message : err));
    }
    return false;
  }
}
function saveReviews() { localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(state.reviews)); }
function savePlaybook() { localStorage.setItem(STORAGE_KEYS.playbook, JSON.stringify(state.playbook)); }
function saveCertificates() { localStorage.setItem(STORAGE_KEYS.certificates, JSON.stringify(state.certificates)); }
function saveExpenses() { localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses)); }
function savePayouts() { localStorage.setItem(STORAGE_KEYS.payouts, JSON.stringify(state.payouts)); }
function saveManualFinance() { localStorage.setItem(STORAGE_KEYS.manualFinance, JSON.stringify(state.manualFinance)); }
function saveDaily() { localStorage.setItem(STORAGE_KEYS.daily, JSON.stringify(state.dailyEntries)); }

function seedPlaybook() {
  state.playbook = {
    rules: 'No trades outside Asia or NY AM unless an A+ NY PM setup prints.\nMax 2 losses per session, then done — no revenge sizing.\nEvery entry needs a clean liquidity sweep before the iFVG/FVG forms.\nNo moving stops out. Ever.\nJournal every trade the same day it happens, win or lose.',
    setups: [
      { id: uid(), name: 'NY AM iFVG continuation', session: 'NY AM', model: 'iFVG', entry: 'Liquidity sweep of a prior session high/low, displacement back through creating an iFVG, entry on the retrace into the iFVG with clean 5m structure supporting continuation.', invalid: 'Price closes back through the iFVG on the 5m before entry, or the sweep was into a level with no real liquidity behind it.' },
      { id: uid(), name: 'Asia range sweep reversal', session: 'ASIA', model: 'Liquidity Sweep', entry: 'Asia session sweeps the prior day range high/low, rejects with a clear 1m/5m shift in structure, enter on retrace into the FVG left by the reversal leg.', invalid: 'No real displacement after the sweep — price just chops at the level instead of shifting structure.' }
    ]
  };
  savePlaybook();
}

function seedDemoData() {
  const acc1 = { id: uid(), name: 'Topstep 150K #1', firm: 'Topstep', status: 'active', startingBalance: 150000, target: 9000, maxDrawdown: 4500, dailyLimit: 3000 };
  state.accounts = [acc1];
  const models = ['iFVG', 'FVG', 'Order Block', 'Liquidity Sweep'];
  const sessions = ['ASIA', 'NY AM', 'NY AM', 'NY PM'];
  const notes = [
    'Clean liquidity sweep of the Asia low into an iFVG on the 1m. Took the reaction back through, respected the 5m structure.',
    'Chased the move without waiting for confirmation — entry was early relative to the model. Small loss, correctly sized.',
    'Textbook NY AM continuation after the sweep of the London low. Held for two expansion legs.',
    'Moved my stop out on the second attempt instead of accepting the loss and resetting. Cost more than it should have.',
    'FVG respected on the retrace, took partials into the first draw on liquidity, ran the rest into the daily high.'
  ];
  let day = addDays(new Date(), -24);
  let bal = 0;
  for (let i = 0; i < 16; i++) {
    day = addDays(day, Math.random() > 0.4 ? 1 : 2);
    if (day > new Date()) break;
    const win = Math.random() > 0.42;
    const pnl = win ? Math.round((300 + Math.random() * 900)) : -Math.round((150 + Math.random() * 550));
    state.trades.push({
      id: uid(),
      accountId: acc1.id,
      date: isoOf(day),
      symbol: 'NQ',
      direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
      session: sessions[Math.floor(Math.random() * sessions.length)],
      model: models[Math.floor(Math.random() * models.length)],
      contracts: Math.random() > 0.5 ? 2 : 1,
      pnl: pnl,
      rMultiple: (pnl / 200).toFixed(1),
      holdMinutes: Math.round(5 + Math.random() * 40),
      ruleFollowed: Math.random() > 0.2,
      mistakeTags: win ? [] : (Math.random() > 0.5 ? ['Early entry'] : []),
      note: notes[Math.floor(Math.random() * notes.length)],
      screenshot: null
    });
  }
  saveAccounts(); saveTrades();
}

/* ---------------- Derived data helpers ---------------- */
function getTrades(accountId = state.currentAccountId) {
  const list = accountId === 'all' ? state.trades.slice() : state.trades.filter(t => t.accountId === accountId);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
// Trades for analytics views (dashboard, calendar, breakdown). When the account
// switcher is on "All accounts" we show the LEADER's trades only — the other accounts
// are mirrored copies, so summing them would multiply P&L and trade count by 5.
// Picking a specific account in the switcher still scopes to that account.
function getScopedTrades() {
  if (state.currentAccountId === 'all') return getLeaderTrades();
  return getTrades(state.currentAccountId);
}

// Applies the dashboard's date-range selector to a trade list.
function applyDashRange(trades) {
  const today = todayISO();
  let from = null, to = null;
  switch (state.dashRange) {
    case 'today': from = today; to = today; break;
    case '7d': from = isoOf(addDays(new Date(), -6)); to = today; break;
    case '30d': from = isoOf(addDays(new Date(), -29)); to = today; break;
    case 'thisWeek': from = isoOf(startOfWeek(new Date())); to = isoOf(addDays(startOfWeek(new Date()), 6)); break;
    case 'thisMonth': from = today.slice(0, 7) + '-01'; to = today; break;
    case 'custom': from = state.dashDateFrom || null; to = state.dashDateTo || null; break;
    default: return trades; // 'all'
  }
  return trades.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
}

function dashRangeLabel() {
  switch (state.dashRange) {
    case 'today': return 'today';
    case '7d': return 'last 7 days';
    case '30d': return 'last 30 days';
    case 'thisWeek': return 'this week';
    case 'thisMonth': return 'this month';
    case 'custom':
      if (state.dashDateFrom || state.dashDateTo) {
        return `${state.dashDateFrom ? fmtDateShort(state.dashDateFrom) : 'start'} – ${state.dashDateTo ? fmtDateShort(state.dashDateTo) : 'now'}`;
      }
      return 'custom range';
    default: return 'all time';
  }
}

function getAccount(id) { return state.accounts.find(a => a.id === id); }

// Returns only the leader account's trades (i.e. the trades YOU actually took, not the
// mirrored copies on the other accounts). Falls back to all trades if no leader is set.
function getLeaderTrades() {
  const leader = state.accounts.find(a => a.isLeader);
  if (!leader) return state.trades.slice().sort((a, b) => a.date.localeCompare(b.date));
  return state.trades.filter(t => t.accountId === leader.id).sort((a, b) => a.date.localeCompare(b.date));
}

function getOutcome(t) {
  if (t.outcome === 'win' || t.outcome === 'loss' || t.outcome === 'be') return t.outcome;
  return t.pnl > 0 ? 'win' : (t.pnl < 0 ? 'loss' : 'be');
}

function computeStats(trades) {
  const total = trades.length;
  const wins = trades.filter(t => getOutcome(t) === 'win');
  const losses = trades.filter(t => getOutcome(t) === 'loss');
  const bes = trades.filter(t => getOutcome(t) === 'be');
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const decisiveCount = wins.length + losses.length;
  const winRate = decisiveCount ? (wins.length / decisiveCount) * 100 : 0;
  const profitFactor = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0);
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const avgHold = total ? trades.reduce((s, t) => s + (t.holdMinutes || 0), 0) / total : 0;
  const ruleFollowedCount = trades.filter(t => t.ruleFollowed).length;
  const adherence = total ? (ruleFollowedCount / total) * 100 : 0;
  const totalR = trades.reduce((s, t) => s + (parseFloat(t.rMultiple) || 0), 0);
  return { total, wins: wins.length, losses: losses.length, bes: bes.length, netPnl, grossWin, grossLoss, winRate, profitFactor, avgWin, avgLoss, avgHold, adherence, totalR };
}

function computeEquitySeries(trades, startingBalance) {
  let bal = startingBalance;
  const series = [{ date: null, balance: bal }];
  trades.forEach(t => { bal += t.pnl; series.push({ date: t.date, balance: bal }); });
  return series;
}

function computeDrawdownSeries(equitySeries) {
  let peak = equitySeries[0].balance;
  return equitySeries.map(pt => {
    peak = Math.max(peak, pt.balance);
    return { date: pt.date, drawdown: pt.balance - peak };
  });
}

function computeEdgeScore(trades, stats, drawdownSeries, startingBalance) {
  if (!trades.length) return { score: 0, axes: [0, 0, 0, 0, 0, 0] };
  const winRateScore = Math.min(100, stats.winRate * 1.4);
  const pfScore = Math.min(100, (stats.profitFactor / 3) * 100);
  const avgRatio = stats.avgLoss ? stats.avgWin / stats.avgLoss : (stats.avgWin > 0 ? 3 : 0);
  const ratioScore = Math.min(100, (avgRatio / 2.5) * 100);
  const maxDD = Math.min(...drawdownSeries.map(d => d.drawdown), 0);
  const recoveryFactor = maxDD < 0 ? stats.netPnl / Math.abs(maxDD) : (stats.netPnl > 0 ? 5 : 0);
  const recoveryScore = Math.min(100, Math.max(0, (recoveryFactor / 4) * 100));
  const ddPct = startingBalance ? Math.abs(maxDD) / startingBalance * 100 : 0;
  const ddScore = Math.max(0, 100 - ddPct * 10);
  // consistency: inverse of coefficient of variation of trade pnl
  const mean = stats.netPnl / trades.length;
  const variance = trades.reduce((s, t) => s + Math.pow(t.pnl - mean, 2), 0) / trades.length;
  const stdev = Math.sqrt(variance);
  const cv = mean !== 0 ? Math.abs(stdev / mean) : 2;
  const consistencyScore = Math.max(0, Math.min(100, 100 - cv * 20));

  const axes = [winRateScore, pfScore, ratioScore, recoveryScore, consistencyScore, ddScore];
  const score = axes.reduce((s, v) => s + v, 0) / axes.length;
  return { score, axes };
}

/* ---------------- Navigation ---------------- */
function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item[data-page]').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + item.dataset.page).classList.add('active');
      if (item.dataset.page === 'accounts') renderAccountsPage();
      if (item.dataset.page === 'journal') renderJournal();
      if (item.dataset.page === 'review') renderReview();
      if (item.dataset.page === 'playbook') renderPlaybook();
      if (item.dataset.page === 'breakdown') renderBreakdown();
      if (item.dataset.page === 'daily') renderDaily();
      if (item.dataset.page === 'certificates') renderCertificates();
      if (item.dataset.page === 'expenses') renderExpenses();
    });
  });
}

function initMobileDrawer() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  const btn = document.getElementById('mobileMenuBtn');
  const open = () => { sidebar.classList.add('open'); scrim.classList.add('open'); };
  const close = () => { sidebar.classList.remove('open'); scrim.classList.remove('open'); };
  btn.addEventListener('click', open);
  scrim.addEventListener('click', close);
  document.querySelectorAll('.nav-item[data-page]').forEach(item => item.addEventListener('click', close));
}

function renderAccountSwitcher() {
  const sel = document.getElementById('accountSwitcher');
  sel.innerHTML = '<option value="all">All accounts</option>' +
    state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  sel.value = state.currentAccountId;
  sel.onchange = () => { state.currentAccountId = sel.value; renderDashboard(); };
}

function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- Dashboard rendering ---------------- */
function renderCrossAccountToday() {
  const container = document.getElementById('crossAccountCard');
  if (state.currentAccountId !== 'all' || state.accounts.length < 2) {
    container.classList.add('hidden');
    return;
  }
  const today = todayISO();
  const todayTrades = state.trades.filter(t => t.date === today);
  if (!todayTrades.length) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');

  const byAccount = state.accounts.map(a => {
    const trades = todayTrades.filter(t => t.accountId === a.id);
    return { account: a, trades, pnl: trades.reduce((s, t) => s + t.pnl, 0) };
  });
  const combinedPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);

  const groups = {};
  todayTrades.forEach(t => {
    const key = `${t.symbol}|${t.direction}|${t.session}|${t.setupId || t.model}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  const correlated = Object.values(groups).filter(g => g.length > 1);
  const maxSpread = correlated.length ? Math.max(...correlated.map(g => g.length)) : 0;

  container.innerHTML = `
    <div class="card-title">Today across accounts</div>
    <div class="card-sub">Combined exposure across ${state.accounts.length} accounts — a repeated trade hits harder than it looks on one</div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-size:12.5px; color:var(--text-muted);">Combined P&amp;L today</span>
      <span style="font-family:var(--font-mono); font-weight:700; font-size:17px;" class="${combinedPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(combinedPnl, { forceSign: true })}</span>
    </div>
    <table class="mini-table">
      <thead><tr><th>Account</th><th>Trades</th><th>Net P&amp;L</th></tr></thead>
      <tbody>${byAccount.map(b => `
        <tr>
          <td>${escapeHtml(b.account.name)}</td>
          <td style="font-family:var(--font-mono); color:var(--text-muted); font-size:11.5px;">${b.trades.length}</td>
          <td class="${b.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${b.trades.length ? fmtMoney(b.pnl, { forceSign: true }) : '—'}</td>
        </tr>`).join('')}</tbody>
    </table>
    ${correlated.length ? `<div style="margin-top:12px; padding:10px 12px; background:var(--gold-soft); border:1px solid rgba(232,184,75,0.3); border-radius:var(--radius-sm); font-size:12px; color:var(--gold);">
      ${ICONS.warning} ${correlated.length} trade${correlated.length > 1 ? 's' : ''} today matched across multiple accounts (same symbol, direction, session, setup) — the worst of those hit ${maxSpread} account${maxSpread > 1 ? 's' : ''} at once. One bad read is really a ${maxSpread}x hit, not 1x.
    </div>` : ''}
  `;
}

function renderDashboard() {
  const trades = applyDashRange(getScopedTrades());
  const account = state.currentAccountId === 'all' ? null : getAccount(state.currentAccountId);
  // Trades are leader-scoped when "All accounts" is selected, so the balance baseline
  // must be the leader's starting balance too — not the sum of all accounts.
  const leaderAcct = state.accounts.find(a => a.isLeader);
  const startingBalance = account
    ? account.startingBalance
    : (leaderAcct ? leaderAcct.startingBalance : state.accounts.reduce((s, a) => s + a.startingBalance, 0));
  const stats = computeStats(trades);

  document.getElementById('welcomeTitle').textContent = 'Welcome, Corey';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('welcomeMeta').textContent = `${today} — ${trades.length} trades · ${dashRangeLabel()}${account ? ' · ' + account.name : (leaderAcct ? ' · ' + leaderAcct.name + ' (leader)' : '')}`;

  renderDailyLimitAlert(trades, account || leaderAcct);
  renderCrossAccountToday();
  renderStatGrid(stats);
  renderBalanceChart(trades, startingBalance, account);
  const equitySeries = computeEquitySeries(trades, startingBalance);
  const drawdownSeries = computeDrawdownSeries(equitySeries);
  renderEdgeScore(trades, stats, drawdownSeries, startingBalance);
  renderStreak(trades, stats);
  renderDailyPnlChart(trades);
  renderDrawdownChart(drawdownSeries);
  renderCalendar();
  renderRecentTrades(trades);
}

function renderStatGrid(stats) {
  const cards = [
    { label: 'Net P&L', value: fmtMoney(stats.netPnl, { forceSign: true }), cls: stats.netPnl >= 0 ? 'positive' : 'negative' },
    { label: 'Net R', value: (stats.totalR >= 0 ? '+' : '') + stats.totalR.toFixed(1) + 'R', cls: stats.totalR >= 0 ? 'positive' : 'negative', sub: 'Sum of R on trades with R logged' },
    { label: 'Win %', value: stats.winRate.toFixed(1) + '%', cls: stats.winRate >= 50 ? 'positive' : 'negative', sub: `W/L only${stats.bes ? ' · ' + stats.bes + ' BE excluded' : ''}` },
    { label: 'Profit factor', value: stats.profitFactor.toFixed(2), cls: stats.profitFactor >= 1.5 ? 'positive' : (stats.profitFactor < 1 ? 'negative' : '') },
    { label: 'Avg win / loss', value: stats.avgLoss ? (stats.avgWin / stats.avgLoss).toFixed(2) : '—', cls: '' },
    { label: 'Avg holding trade', value: stats.avgHold ? Math.round(stats.avgHold) + ' min' : '—', cls: '' }
  ];
  document.getElementById('statGrid').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.cls}">${c.value}</div>
      ${c.sub ? `<div class="stat-delta">${c.sub}</div>` : ''}
    </div>`).join('');
}

function renderDailyLimitAlert(trades, account) {
  const el = document.getElementById('dailyLimitAlert');
  if (!account || !account.dailyLimit) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const today = todayISO();
  const todayPnl = trades.filter(t => t.date === today).reduce((s, t) => s + t.pnl, 0);
  if (todayPnl >= 0) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const used = Math.abs(todayPnl);
  const pct = Math.min(100, (used / account.dailyLimit) * 100);
  const danger = pct >= 70;
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="card" style="border-color:${danger ? 'var(--red)' : 'var(--border)'}; margin-bottom:16px; padding:14px 18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-size:13px; font-weight:600; color:${danger ? 'var(--red)' : 'var(--text-primary)'};">
          ${danger ? ICONS.warning + ' ' : ''}Daily loss limit — ${account.name}
        </div>
        <div style="font-family:var(--font-mono); font-size:13px;">${fmtMoney(used)} / ${fmtMoney(account.dailyLimit)}</div>
      </div>
      <div class="progress-track"><div class="progress-fill drawdown" style="width:${pct}%"></div></div>
    </div>`;
}

function renderStreak(trades, stats) {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].ruleFollowed) streak++; else break;
  }
  document.getElementById('streakRow').innerHTML = `
    <div class="streak-item">
      <div class="streak-icon">${ICONS.flag}</div>
      <div><div class="streak-num">${streak}</div><div class="streak-label">trade streak, plan followed</div></div>
    </div>
    <div class="streak-item">
      <div class="streak-icon">%</div>
      <div><div class="streak-num">${stats.adherence.toFixed(0)}%</div><div class="streak-label">plan adherence overall</div></div>
    </div>
    <div class="streak-item">
      <div class="streak-icon">#</div>
      <div><div class="streak-num">${stats.total}</div><div class="streak-label">total trades logged</div></div>
    </div>`;
}

function renderEdgeScore(trades, stats, drawdownSeries, startingBalance) {
  const { score, axes } = computeEdgeScore(trades, stats, drawdownSeries, startingBalance);
  document.getElementById('edgeScoreValue').textContent = trades.length ? score.toFixed(1) : '—';
  document.getElementById('edgeGaugeMarker').style.left = Math.max(0, Math.min(100, score)) + '%';

  const ctx = document.getElementById('edgeRadarChart');
  if (charts.edgeRadar) charts.edgeRadar.destroy();
  charts.edgeRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Win %', 'Profit factor', 'Win/loss', 'Recovery', 'Consistency', 'Drawdown'],
      datasets: [{
        data: axes,
        backgroundColor: 'rgba(62,207,142,0.15)',
        borderColor: '#3ecf8e',
        borderWidth: 1.5,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, padding: 6 }
        }
      }
    }
  });
}

function renderBalanceChart(trades, startingBalance, account) {
  const leaderName = (state.accounts.find(a => a.isLeader) || {}).name;
  document.getElementById('balanceCardSub').textContent = account
    ? `${account.name} · starting ${fmtMoneyShort(startingBalance)}`
    : `${leaderName ? leaderName + ' (leader)' : 'All accounts'} · starting ${fmtMoneyShort(startingBalance)}`;
  const series = computeEquitySeries(trades, startingBalance);
  const labels = series.map((s, i) => i === 0 ? 'Start' : fmtDateShort(s.date));
  const data = series.map(s => s.balance);

  const ctx = document.getElementById('balanceChart');
  if (charts.balance) charts.balance.destroy();
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(62,207,142,0.28)');
  gradient.addColorStop(1, 'rgba(62,207,142,0.0)');

  charts.balance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#3ecf8e', backgroundColor: gradient, borderWidth: 2, fill: true, pointRadius: 0, tension: 0.25 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
      scales: {
        x: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, maxTicksLimit: 6 }, grid: { display: false } },
        y: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => fmtMoneyShort(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderDailyPnlChart(trades) {
  const byDay = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const days = Object.keys(byDay).sort().slice(-14);
  const data = days.map(d => byDay[d]);
  const colors = data.map(v => v >= 0 ? '#3ecf8e' : '#ff5c5c');

  const ctx = document.getElementById('dailyPnlChart');
  if (charts.dailyPnl) charts.dailyPnl.destroy();
  charts.dailyPnl = new Chart(ctx, {
    type: 'bar',
    data: { labels: days.map(fmtDateShort), datasets: [{ data, backgroundColor: colors, borderRadius: 3, barPercentage: 0.6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
      scales: {
        x: { display: false },
        y: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => fmtMoneyShort(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderDrawdownChart(drawdownSeries) {
  const labels = drawdownSeries.map((s, i) => i === 0 ? 'Start' : fmtDateShort(s.date));
  const data = drawdownSeries.map(s => s.drawdown);

  const ctx = document.getElementById('drawdownChart');
  if (charts.drawdown) charts.drawdown.destroy();
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, 'rgba(255,92,92,0.0)');
  gradient.addColorStop(1, 'rgba(255,92,92,0.3)');

  charts.drawdown = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#ff5c5c', backgroundColor: gradient, borderWidth: 1.5, fill: true, pointRadius: 0, tension: 0.2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
      scales: {
        x: { display: false },
        y: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => fmtMoneyShort(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderRecentTrades(trades) {
  const recent = trades.slice(-6).reverse();
  const body = document.getElementById('recentTradesBody');
  if (!recent.length) { body.innerHTML = `<tr><td colspan="3" style="color:var(--text-muted); text-align:center; padding:20px;">No trades yet</td></tr>`; return; }
  body.innerHTML = recent.map(t => `
    <tr>
      <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${fmtDateShort(t.date)}</td>
      <td><span class="symbol-chip">${escapeHtml(t.symbol)}</span></td>
      <td class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(t.pnl, { forceSign: true })}</td>
    </tr>`).join('');
}

/* ---------------- Calendar ---------------- */
function renderCalendar() {
  const trades = getScopedTrades();
  const byDay = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });

  const y = state.calendarYear, m = state.calendarMonth;
  const monthLabel = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonthLabel').textContent = monthLabel;
  document.getElementById('calendarMonthLabelTop').textContent = monthLabel;

  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = todayISO();

  const dowRow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="calendar-dow">${d}</div>`).join('');
  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += `<div class="calendar-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const pnl = byDay[dateStr];
    let cls = 'calendar-day';
    if (dateStr === todayStr) cls += ' today';
    if (pnl !== undefined) cls += pnl >= 0 ? ' pos has-trades' : ' neg has-trades';
    cells += `<div class="${cls}">
      <div class="calendar-day-num">${d}</div>
      ${pnl !== undefined ? `<div class="calendar-day-pnl">${fmtMoneyShort(pnl)}</div>` : ''}
    </div>`;
  }
  document.getElementById('calendarGrid').innerHTML = dowRow + cells;

  // Weekly totals
  const weeks = [];
  let cur = 1 - startOffset;
  while (cur <= daysInMonth) {
    let sum = 0, has = false;
    for (let i = 0; i < 7; i++) {
      const dnum = cur + i;
      if (dnum >= 1 && dnum <= daysInMonth) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dnum).padStart(2, '0')}`;
        if (byDay[dateStr] !== undefined) { sum += byDay[dateStr]; has = true; }
      }
    }
    if (has || (cur >= 1 && cur <= daysInMonth)) weeks.push({ label: `Wk ${weeks.length + 1}`, sum, has });
    cur += 7;
  }
  document.getElementById('weeklyTotals').innerHTML = weeks.map(w => `
    <div class="weekly-total-row">
      <span class="weekly-total-label">${w.label}</span>
      <span class="weekly-total-value" style="color:${!w.has ? 'var(--text-muted)' : (w.sum >= 0 ? 'var(--green)' : 'var(--red)')}">${w.has ? fmtMoney(w.sum, { forceSign: true }) : '—'}</span>
    </div>`).join('');
}

document.getElementById('calPrevBtn').addEventListener('click', () => {
  state.calendarMonth--; if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
  renderCalendar();
});
document.getElementById('calNextBtn').addEventListener('click', () => {
  state.calendarMonth++; if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
  renderCalendar();
});

/* ---------------- Accounts page ---------------- */
function renderAccountsPage() {
  const grid = document.getElementById('accountsGrid');
  if (!state.accounts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="empty-state-title">No accounts yet</div><div class="empty-state-sub">Add your first funded or evaluation account to start tracking.</div></div>`;
    return;
  }
  grid.innerHTML = state.accounts.map(a => {
    const trades = state.trades.filter(t => t.accountId === a.id);
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const balance = a.startingBalance + netPnl;
    const targetPct = a.target ? Math.min(100, Math.max(0, (netPnl / a.target) * 100)) : 0;

    // Static drawdown: a fixed floor at (startingBalance - maxDrawdown) that never moves.
    // "Buffer" = how far the current balance sits above that floor. If balance falls to the
    // floor, the account is blown. maxDrawdown is the total DD size (e.g. 1000 on a 25K).
    const floor = a.startingBalance - a.maxDrawdown;
    const buffer = balance - floor;              // dollars of room left before blowing
    const ddUsed = a.maxDrawdown - buffer;       // how much of the DD allowance is eaten
    const ddUsedClamped = Math.max(0, ddUsed);   // don't show negative when in profit
    const ddPct = a.maxDrawdown ? Math.min(100, Math.max(0, (ddUsedClamped / a.maxDrawdown) * 100)) : 0;
    const bufferLow = buffer <= a.maxDrawdown * 0.25; // warn when down to last 25% of room

    const byDay = {};
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
    const dayValues = Object.values(byDay);
    const bestDay = dayValues.length ? Math.max(...dayValues) : 0;
    const consistencyPct = netPnl > 0 && bestDay > 0 ? (bestDay / netPnl) * 100 : 0;
    const consistencyThreshold = a.consistencyPct != null ? a.consistencyPct : 50;
    const consistencyOver = netPnl > 0 && consistencyPct > consistencyThreshold;

    return `
    <div class="account-card">
      <div class="account-card-top">
        <div>
          <div class="account-name">${escapeHtml(a.name)}${a.isLeader ? ' <span class="leader-badge">LEADER</span>' : ''}</div>
          <div class="account-firm">${escapeHtml(a.firm || '')}</div>
        </div>
        <div class="account-status ${a.status}">${a.status}</div>
      </div>
      <div class="account-balance" style="color:${netPnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(balance)}</div>
      ${a.target ? `<div class="progress-row">
        <div class="progress-label"><span>Profit target</span><span>${fmtMoney(netPnl)} / ${fmtMoney(a.target)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,targetPct)}%"></div></div>
      </div>` : ''}
      ${a.maxDrawdown ? `<div class="progress-row">
        <div class="progress-label"><span>Drawdown buffer${bufferLow ? ' ⚠' : ''}</span><span style="color:${bufferLow ? 'var(--red)' : 'var(--text-muted)'}">${fmtMoney(Math.max(0, buffer))} left · floor ${fmtMoney(floor)}</span></div>
        <div class="progress-track"><div class="progress-fill ${bufferLow ? 'drawdown' : ''}" style="width:${ddPct}%"></div></div>
      </div>` : ''}
      ${netPnl > 0 ? `<div class="progress-row">
        <div class="progress-label"><span>Consistency (best day)${consistencyOver ? ' ⚠' : ''}</span><span style="color:${consistencyOver ? 'var(--red)' : 'var(--text-muted)'}">${consistencyPct.toFixed(0)}% / ${consistencyThreshold}%</span></div>
        <div class="progress-track"><div class="progress-fill ${consistencyOver ? 'drawdown' : ''}" style="width:${Math.min(100, consistencyPct)}%"></div></div>
      </div>` : ''}
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-sm btn-ghost" onclick="editAccount('${a.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${a.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function editAccount(id) {
  const a = getAccount(id);
  state.editingAccountId = id;
  document.getElementById('accountModalTitle').textContent = 'Edit account';
  document.getElementById('accountId').value = a.id;
  document.getElementById('accountName').value = a.name;
  document.getElementById('accountFirm').value = a.firm || '';
  document.getElementById('accountStatus').value = a.status;
  document.getElementById('accountStarting').value = a.startingBalance;
  document.getElementById('accountTarget').value = a.target || '';
  document.getElementById('accountMaxDD').value = a.maxDrawdown || '';
  document.getElementById('accountDailyLimit').value = a.dailyLimit || '';
  document.getElementById('accountConsistencyPct').value = a.consistencyPct != null ? a.consistencyPct : 50;
  document.getElementById('accountLeaderToggle').classList.toggle('on', !!a.isLeader);
  openModal('accountModalOverlay');
}
function deleteAccount(id) {
  if (!confirm('Delete this account? Trades logged under it will remain but become unassigned.')) return;
  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccounts();
  renderAccountSwitcher(); renderAccountsPage(); renderDashboard(); populatePayoutAccountSelect();
}

document.getElementById('addAccountBtn').addEventListener('click', () => {
  state.editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Add account';
  document.getElementById('accountForm').reset();
  document.getElementById('accountFirm').value = 'Topstep';
  document.getElementById('accountStarting').value = 150000;
  document.getElementById('accountLeaderToggle').classList.remove('on');
  openModal('accountModalOverlay');
});

/* Backfill: copy any leader trades that aren't yet mirrored to every other account.
   Handles trades logged before an account became leader, and accounts added after
   a leader trade was logged (batch missing some accounts). */
function syncLeaderTrades() {
  const leader = state.accounts.find(a => a.isLeader);
  if (!leader) { alert('No leader account is set. Edit an account and toggle it as the leader first.'); return; }
  const others = state.accounts.filter(a => a.id !== leader.id);
  if (!others.length) { alert('You only have one account — nothing to copy to.'); return; }

  // Every trade that lives on the leader account is a candidate to mirror.
  const leaderTrades = state.trades.filter(t => t.accountId === leader.id);
  let created = 0;
  let corrected = 0;

  // Fields a copy should always inherit from its leader (everything except its own
  // identity/account and its stripped screenshots).
  const SYNC_FIELDS = ['symbol', 'direction', 'session', 'model', 'setupName', 'date',
    'entryTime', 'contracts', 'pnl', 'outcome', 'rMultiple', 'holdMinutes', 'timeframe',
    'premiumDiscount', 'ruleFollowed', 'mistakeTags', 'note'];

  leaderTrades.forEach(lt => {
    // Ensure this leader trade has a batchId so its copies can be grouped.
    if (!lt.batchId) lt.batchId = uid();
    // Which accounts already have a copy in this batch?
    const existingCopies = state.trades.filter(t => t.batchId === lt.batchId && t.id !== lt.id);
    const covered = new Set(existingCopies.map(t => t.accountId));

    // Correct any existing copy whose fields have drifted from the leader (e.g. P&L
    // sign flipped because the leader was edited after copying).
    existingCopies.forEach(copy => {
      let changed = false;
      SYNC_FIELDS.forEach(f => {
        if (JSON.stringify(copy[f]) !== JSON.stringify(lt[f])) { copy[f] = lt[f]; changed = true; }
      });
      if (changed) corrected++;
    });

    others.forEach(a => {
      if (covered.has(a.id)) return; // already mirrored to this account
      const copy = JSON.parse(JSON.stringify(lt));
      copy.id = uid();
      copy.accountId = a.id;
      copy.copiedFromLeader = true;
      copy.batchId = lt.batchId;
      copy.screenshots = [];   // screenshots live only on the leader trade; don't duplicate the image data
      copy.screenshot = null;
      state.trades.push(copy);
      created++;
    });
  });

  saveTrades();
  renderAccountsPage(); renderDashboard(); renderJournal();
  if (created === 0 && corrected === 0) {
    showToast('Already in sync — everything matches');
  } else {
    const parts = [];
    if (created > 0) parts.push(`created ${created} copy${created > 1 ? '...ies' : ''}`.replace('copy...ies', 'copies'));
    if (corrected > 0) parts.push(`corrected ${corrected} mismatched`);
    showToast('Synced — ' + parts.join(', '));
  }
}
document.getElementById('syncLeaderBtn').addEventListener('click', () => {
  const leader = state.accounts.find(a => a.isLeader);
  if (!leader) { alert('No leader account is set. Edit an account and toggle it as the leader first.'); return; }
  const others = state.accounts.filter(a => a.id !== leader.id).length;
  if (confirm(`Sync every trade from "${leader.name}" across to your other ${others} account${others > 1 ? 's' : ''}?\n\nThis fills in any missing copies and corrects copies whose details (e.g. P&L) have drifted from the leader. It won't create duplicates.`)) {
    syncLeaderTrades();
  }
});

document.getElementById('accountLeaderToggle').addEventListener('click', function () {
  this.classList.toggle('on');
});

/* One-time cleanup: strip screenshots from copied (mirror) trades. The original
   screenshot stays on the leader trade; copies only need the P&L data. This
   reclaims the localStorage space that duplicated base64 images were eating. */
document.getElementById('cleanupStorageBtn').addEventListener('click', () => {
  const before = (localStorage.getItem(STORAGE_KEYS.trades) || '').length;
  let cleaned = 0;
  state.trades.forEach(t => {
    if (t.copiedFromLeader && ((t.screenshots && t.screenshots.length) || t.screenshot)) {
      t.screenshots = [];
      t.screenshot = null;
      cleaned++;
    }
  });
  if (cleaned === 0) {
    showToast('Nothing to clean — no duplicated screenshots found');
    return;
  }
  // saveTrades is now wrapped; it returns true on success.
  const ok = saveTrades();
  if (ok) {
    const after = (JSON.stringify(state.trades)).length;
    const freedKb = Math.max(0, Math.round((before - after) / 1024));
    renderAccountsPage(); renderDashboard(); renderJournal();
    showToast(`Cleaned ${cleaned} copied trade${cleaned > 1 ? 's' : ''} — freed ~${freedKb} KB`);
  }
});

document.getElementById('accountForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    name: document.getElementById('accountName').value.trim(),
    firm: document.getElementById('accountFirm').value.trim(),
    status: document.getElementById('accountStatus').value,
    startingBalance: parseFloat(document.getElementById('accountStarting').value) || 0,
    target: parseFloat(document.getElementById('accountTarget').value) || 0,
    maxDrawdown: parseFloat(document.getElementById('accountMaxDD').value) || 0,
    dailyLimit: parseFloat(document.getElementById('accountDailyLimit').value) || 0,
    consistencyPct: parseFloat(document.getElementById('accountConsistencyPct').value) || 50,
    isLeader: document.getElementById('accountLeaderToggle').classList.contains('on')
  };
  if (data.isLeader) {
    state.accounts.forEach(a => { a.isLeader = false; });
  }
  if (state.editingAccountId) {
    const acc = getAccount(state.editingAccountId);
    Object.assign(acc, data);
  } else {
    data.id = uid();
    state.accounts.push(data);
  }
  saveAccounts();
  closeModal('accountModalOverlay');
  renderAccountSwitcher(); renderAccountsPage(); renderDashboard(); populatePayoutAccountSelect();
});

/* ---------------- Journal page ---------------- */
function renderJournal() {
  const outcomeF = document.getElementById('filterOutcome').value;
  const sessionF = document.getElementById('filterSession').value;
  const modelF = document.getElementById('filterModel').value;
  const searchF = document.getElementById('filterSearch').value.toLowerCase();
  const rangeF = document.getElementById('filterDateRange').value;
  const groupOn = document.getElementById('groupCopiesToggle').classList.contains('on');

  let trades = getTrades().slice().reverse();
  if (outcomeF === 'win') trades = trades.filter(t => getOutcome(t) === 'win');
  if (outcomeF === 'loss') trades = trades.filter(t => getOutcome(t) === 'loss');
  if (outcomeF === 'be') trades = trades.filter(t => getOutcome(t) === 'be');
  if (sessionF) trades = trades.filter(t => t.session === sessionF);
  if (modelF) trades = trades.filter(t => t.model === modelF);
  if (searchF) trades = trades.filter(t => (t.note || '').toLowerCase().includes(searchF));

  const today = todayISO();
  let dateFrom = null, dateTo = null;
  if (rangeF === 'today') { dateFrom = today; dateTo = today; }
  else if (rangeF === '7d') { dateFrom = isoOf(addDays(new Date(), -6)); dateTo = today; }
  else if (rangeF === '30d') { dateFrom = isoOf(addDays(new Date(), -29)); dateTo = today; }
  else if (rangeF === 'thisMonth') { dateFrom = today.slice(0, 7) + '-01'; dateTo = today; }
  else if (rangeF === 'custom') {
    dateFrom = document.getElementById('filterDateFrom').value || null;
    dateTo = document.getElementById('filterDateTo').value || null;
  }
  if (dateFrom) trades = trades.filter(t => t.date >= dateFrom);
  if (dateTo) trades = trades.filter(t => t.date <= dateTo);

  const list = document.getElementById('journalList');
  if (!trades.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div><div class="empty-state-title">No trades match</div><div class="empty-state-sub">Log a trade or adjust your filters.</div></div>`;
    return;
  }

  if (!groupOn) {
    list.innerHTML = trades.map(t => tradeCardHtml(t)).join('');
    return;
  }

  // Build groups keyed by batchId; trades without a batchId are their own solo group.
  const groups = [];
  const seenBatch = {};
  trades.forEach(t => {
    if (t.batchId) {
      if (seenBatch[t.batchId]) { seenBatch[t.batchId].members.push(t); return; }
      const g = { key: t.batchId, date: t.date, members: [t] };
      seenBatch[t.batchId] = g;
      groups.push(g);
    } else {
      groups.push({ key: t.id, date: t.date, members: [t] });
    }
  });

  list.innerHTML = groups.map(g => {
    if (g.members.length === 1) return tradeCardHtml(g.members[0]);
    const leader = g.members.find(m => !m.copiedFromLeader) || g.members[0];
    const combinedPnl = g.members.reduce((s, m) => s + m.pnl, 0);
    const outcomeCls = getOutcome(leader);
    const groupId = 'grp_' + g.key;
    return `
    <div class="trade-entry ${outcomeCls}">
      <div class="trade-entry-pnl-col">
        <div class="trade-entry-pnl ${combinedPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(combinedPnl, { forceSign: true })}</div>
        <div class="outcome-pill ${outcomeCls}">${outcomeCls === 'be' ? 'BE' : outcomeCls}</div>
        <div class="trade-entry-date">${fmtDateShort(leader.date)}${leader.entryTime ? ' · ' + leader.entryTime : ''}</div>
        <div class="trade-entry-date" style="color:var(--gold);">${g.members.length} accounts</div>
      </div>
      <div>
        <div class="trade-entry-badges">
          <span class="badge">${escapeHtml(leader.symbol)}</span>
          <span class="badge ${leader.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${leader.direction}</span>
          <span class="badge badge-session">${escapeHtml(leader.session)}</span>
          <span class="badge badge-model">${escapeHtml(leader.setupName || leader.model)}</span>
          ${leader.timeframe ? `<span class="badge badge-tf">${escapeHtml(leader.timeframe)}</span>` : ''}
          ${leader.premiumDiscount ? `<span class="badge badge-pd badge-pd-${leader.premiumDiscount.toLowerCase()}">${escapeHtml(leader.premiumDiscount)}</span>` : ''}
          ${!leader.ruleFollowed ? `<span class="badge badge-rule-broken">Rule broken</span>` : ''}
        </div>
        <div class="trade-entry-note">${escapeHtml(leader.note || 'No notes added.')}</div>
        <div style="margin-top:8px;">
          <span class="view-chart-link" onclick="document.getElementById('${groupId}').classList.toggle('hidden')">Show per-account breakdown ↓</span>
        </div>
        <div id="${groupId}" class="hidden" style="margin-top:10px; border-top:1px solid var(--border-soft); padding-top:10px;">
          ${g.members.map(m => {
            const acc = getAccount(m.accountId);
            return `<div style="display:flex; justify-content:space-between; padding:5px 0; font-size:12px;">
              <span style="color:var(--text-secondary);">${acc ? escapeHtml(acc.name) : 'Unknown account'}${!m.copiedFromLeader ? ' <span style=\"color:var(--gold);\">(leader)</span>' : ''}</span>
              <span class="${m.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}" style="font-family:var(--font-mono);">${fmtMoney(m.pnl, { forceSign: true })}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="trade-entry-actions">
        <button class="icon-btn" onclick="viewTradeDetail('${leader.id}')" title="View">${ICONS.view}</button>
        <button class="icon-btn" onclick="editTrade('${leader.id}')" title="Edit">${ICONS.edit}</button>
        <button class="icon-btn" onclick="deleteTradeGroup('${g.key}')" title="Delete all in group">${ICONS.trash}</button>
      </div>
    </div>`;
  }).join('');
}

function tradeCardHtml(t) {
  const outcomeCls = getOutcome(t);
  return `
    <div class="trade-entry ${outcomeCls}">
      <div class="trade-entry-pnl-col">
        <div class="trade-entry-pnl ${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(t.pnl, { forceSign: true })}</div>
        <div class="outcome-pill ${outcomeCls}">${outcomeCls === 'be' ? 'BE' : outcomeCls}</div>
        <div class="trade-entry-date">${fmtDateShort(t.date)}${t.entryTime ? ' · ' + t.entryTime : ''}</div>
        ${t.rMultiple ? `<div class="trade-entry-date">${t.rMultiple}R</div>` : ''}
      </div>
      <div>
        <div class="trade-entry-badges">
          <span class="badge">${escapeHtml(t.symbol)}</span>
          <span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span>
          <span class="badge badge-session">${escapeHtml(t.session)}</span>
          <span class="badge badge-model">${escapeHtml(t.setupName || t.model)}</span>
          ${t.timeframe ? `<span class="badge badge-tf">${escapeHtml(t.timeframe)}</span>` : ''}
          ${t.premiumDiscount ? `<span class="badge badge-pd badge-pd-${t.premiumDiscount.toLowerCase()}">${escapeHtml(t.premiumDiscount)}</span>` : ''}
          ${!t.ruleFollowed ? `<span class="badge badge-rule-broken">Rule broken</span>` : ''}
          ${t.copiedFromLeader ? `<span class="badge badge-tf" title="Auto-copied from leader account">Copied</span>` : ''}
          ${(t.mistakeTags || []).map(m => `<span class="badge badge-rule-broken">${escapeHtml(m)}</span>`).join('')}
        </div>
        <div class="trade-entry-note">${escapeHtml(t.note || 'No notes added.')}</div>
        ${(t.screenshots && t.screenshots.length) ? `<div style="margin-top:8px;"><span class="view-chart-link" onclick="viewTradeDetail('${t.id}')">View ${t.screenshots.length > 1 ? t.screenshots.length + ' charts' : 'chart'} →</span></div>` : ''}
      </div>
      <div class="trade-entry-actions">
        <button class="icon-btn" onclick="viewTradeDetail('${t.id}')" title="View">${ICONS.view}</button>
        <button class="icon-btn" onclick="editTrade('${t.id}')" title="Edit">${ICONS.edit}</button>
        <button class="icon-btn" onclick="deleteTrade('${t.id}')" title="Delete">${ICONS.trash}</button>
      </div>
    </div>`;
}

function deleteTradeGroup(batchId) {
  const members = state.trades.filter(t => t.batchId === batchId);
  if (!confirm(`Delete this trade across all ${members.length} accounts?`)) return;
  state.trades = state.trades.filter(t => t.batchId !== batchId);
  saveTrades();
  renderJournal(); renderDashboard();
}

document.getElementById('groupCopiesToggle').addEventListener('click', function () {
  this.classList.toggle('on');
  renderJournal();
});

['filterOutcome', 'filterSession', 'filterModel', 'filterSearch', 'filterDateFrom', 'filterDateTo'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderJournal);
});
document.getElementById('filterDateRange').addEventListener('change', function () {
  const isCustom = this.value === 'custom';
  document.getElementById('filterDateFrom').classList.toggle('hidden', !isCustom);
  document.getElementById('filterDateTo').classList.toggle('hidden', !isCustom);
  document.getElementById('filterDateToSep').classList.toggle('hidden', !isCustom);
  renderJournal();
});

function viewTradeDetail(id) {
  const t = state.trades.find(x => x.id === id);
  if (!t) return;
  state.editingTradeId = id;
  const acc = getAccount(t.accountId);
  const images = (t.screenshots && t.screenshots.length) ? t.screenshots : (t.screenshot ? [t.screenshot] : []);
  state.currentDetailImages = images;
  document.getElementById('detailModalBody').innerHTML = `
    ${images.length ? `<div class="detail-gallery">${images.map((src, i) => `<img src="${src}" onclick="openLightboxFrom(state.currentDetailImages, ${i})">`).join('')}</div>` : ''}
    <div class="detail-grid">
      <div class="detail-stat"><div class="detail-stat-label">Net P&L</div><div class="detail-stat-value" style="color:${t.pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(t.pnl, { forceSign: true })}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Outcome</div><div class="detail-stat-value"><span class="outcome-pill ${getOutcome(t)}">${getOutcome(t) === 'be' ? 'BE' : getOutcome(t)}</span></div></div>
      <div class="detail-stat"><div class="detail-stat-label">R Multiple</div><div class="detail-stat-value">${t.rMultiple || '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Hold time</div><div class="detail-stat-value">${t.holdMinutes ? t.holdMinutes + ' min' : '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Entered at</div><div class="detail-stat-value" style="font-size:14px;">${t.entryTime || '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Account</div><div class="detail-stat-value" style="font-size:12px;">${acc ? escapeHtml(acc.name) : '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Session</div><div class="detail-stat-value" style="font-size:12px;">${escapeHtml(t.session)}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Model</div><div class="detail-stat-value" style="font-size:12px;">${escapeHtml(t.model)}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Timeframe</div><div class="detail-stat-value" style="font-size:12px;">${t.timeframe ? escapeHtml(t.timeframe) : '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Premium / discount</div><div class="detail-stat-value" style="font-size:12px;">${t.premiumDiscount ? escapeHtml(t.premiumDiscount) : '—'}</div></div>
    </div>
    <div class="detail-notes-section">
      <div class="detail-notes-label">Notes / reasoning</div>
      <div class="detail-notes-body">${t.note ? escapeHtml(t.note) : '<span style="color:var(--text-muted);">No notes added.</span>'}</div>
    </div>
  `;
  document.getElementById('detailDeleteBtn').onclick = () => { deleteTrade(id); closeModal('detailModalOverlay'); };
  document.getElementById('detailEditBtn').onclick = () => { closeModal('detailModalOverlay'); editTrade(id); };
  openModal('detailModalOverlay');
}

function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  state.trades = state.trades.filter(t => t.id !== id);
  saveTrades();
  renderJournal(); renderDashboard();
}

/* ---------------- Trade form (log / edit) ---------------- */
function populateAccountSelect() {
  const sel = document.getElementById('tradeAccount');
  sel.innerHTML = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  if (state.currentAccountId !== 'all') sel.value = state.currentAccountId;
}

function populateSetupSelect() {
  const sel = document.getElementById('tradeModel');
  const generic = ['iFVG', 'FVG', 'Order Block', 'Liquidity Sweep', 'Other'];
  let html = '';
  if (state.playbook.setups.length) {
    html += `<optgroup label="Your setups">` + state.playbook.setups.map(s => `<option value="setup:${s.id}">${escapeHtml(s.name)}</option>`).join('') + `</optgroup>`;
  }
  html += `<optgroup label="Generic tag">` + generic.map(g => `<option value="tag:${g}">${escapeHtml(g)}</option>`).join('') + `</optgroup>`;
  sel.innerHTML = html;
}

document.getElementById('tradeModel').addEventListener('change', function () {
  if (this.value.startsWith('setup:')) {
    const s = state.playbook.setups.find(x => x.id === this.value.slice(6));
    if (s) document.getElementById('tradeSession').value = s.session;
  }
});

function renderThumbGrid() {
  const grid = document.getElementById('tradeThumbGrid');
  grid.innerHTML = state.pendingScreenshots.map((src, i) => `
    <div class="thumb-item" onclick="openLightboxFrom(state.pendingScreenshots, ${i})">
      <img src="${src}">
      <div class="thumb-remove" onclick="event.stopPropagation(); removePendingScreenshot(${i})">✕</div>
    </div>`).join('');
  document.getElementById('tradeFileDropText').textContent = state.pendingScreenshots.length
    ? `${state.pendingScreenshots.length} screenshot${state.pendingScreenshots.length > 1 ? 's' : ''} attached — click to add more`
    : 'Click to upload chart screenshots';
}
function removePendingScreenshot(i) {
  state.pendingScreenshots.splice(i, 1);
  renderThumbGrid();
}

let lightboxSource = [];
function openLightboxFrom(source, i) {
  lightboxSource = source;
  document.getElementById('lightboxImg').src = source[parseInt(i, 10)];
  document.getElementById('lightboxOverlay').classList.add('open');
}
document.getElementById('lightboxOverlay').addEventListener('click', () => {
  document.getElementById('lightboxOverlay').classList.remove('open');
});

function openLogTradeModal() {
  if (!state.accounts.length) { alert('Add an account first — go to Accounts and create one.'); return; }
  state.editingTradeId = null;
  state.pendingScreenshots = [];
  state.selectedMistakeTags = [];
  state.ruleFollowed = true;
  state.outcomeManuallySet = false;
  setOutcome('win');
  document.getElementById('tradeModalTitle').textContent = 'Log trade';
  document.getElementById('tradeForm').reset();
  populateAccountSelect();
  populateSetupSelect();
  document.getElementById('tradeDate').value = todayISO();
  document.getElementById('tradeTime').value = new Date().toTimeString().slice(0, 5);
  document.getElementById('tradeSymbol').value = 'NQ';
  document.getElementById('tradeContracts').value = 1;
  document.getElementById('ruleToggle').classList.add('on');
  document.querySelectorAll('#mistakeChips .chip').forEach(c => c.classList.remove('selected'));
  renderThumbGrid();
  openModal('tradeModalOverlay');
}

function editTrade(id) {
  const t = state.trades.find(x => x.id === id);
  if (!t) return;
  state.editingTradeId = id;
  state.pendingScreenshots = (t.screenshots && t.screenshots.length) ? t.screenshots.slice() : (t.screenshot ? [t.screenshot] : []);
  state.selectedMistakeTags = (t.mistakeTags || []).slice();
  state.ruleFollowed = t.ruleFollowed;
  state.outcomeManuallySet = true;
  setOutcome(getOutcome(t));

  document.getElementById('tradeModalTitle').textContent = 'Edit trade';
  populateAccountSelect();
  document.getElementById('tradeAccount').value = t.accountId;
  document.getElementById('tradeSymbol').value = t.symbol;
  document.getElementById('tradeDate').value = t.date;
  document.getElementById('tradeTime').value = t.entryTime || '';
  document.getElementById('tradeDirection').value = t.direction;
  document.getElementById('tradeSession').value = t.session;
  populateSetupSelect();
  document.getElementById('tradeModel').value = t.setupId ? `setup:${t.setupId}` : `tag:${t.model}`;
  document.getElementById('tradeContracts').value = t.contracts;
  document.getElementById('tradePnl').value = t.pnl;
  document.getElementById('tradeR').value = t.rMultiple || '';
  document.getElementById('tradeHold').value = t.holdMinutes || '';
  document.getElementById('tradeTimeframe').value = t.timeframe || '';
  document.getElementById('tradePremiumDiscount').value = t.premiumDiscount || '';
  document.getElementById('tradeNote').value = t.note || '';
  document.getElementById('ruleToggle').classList.toggle('on', t.ruleFollowed);
  document.querySelectorAll('#mistakeChips .chip').forEach(c => c.classList.toggle('selected', state.selectedMistakeTags.includes(c.dataset.tag)));
  renderThumbGrid();
  openModal('tradeModalOverlay');
}

document.getElementById('logTradeBtn').addEventListener('click', openLogTradeModal);
document.getElementById('dashLogTradeBtn').addEventListener('click', openLogTradeModal);

/* Dashboard time-period selector */
document.getElementById('dashRange').addEventListener('change', function () {
  state.dashRange = this.value;
  const isCustom = this.value === 'custom';
  document.getElementById('dashDateFrom').classList.toggle('hidden', !isCustom);
  document.getElementById('dashDateTo').classList.toggle('hidden', !isCustom);
  renderDashboard();
});
document.getElementById('dashDateFrom').addEventListener('change', function () {
  state.dashDateFrom = this.value || null;
  renderDashboard();
});
document.getElementById('dashDateTo').addEventListener('change', function () {
  state.dashDateTo = this.value || null;
  renderDashboard();
});
document.getElementById('journalLogTradeBtn').addEventListener('click', openLogTradeModal);

document.getElementById('ruleToggle').addEventListener('click', function () {
  this.classList.toggle('on');
  state.ruleFollowed = this.classList.contains('on');
});

document.querySelectorAll('#mistakeChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('selected');
    const tag = chip.dataset.tag;
    if (chip.classList.contains('selected')) state.selectedMistakeTags.push(tag);
    else state.selectedMistakeTags = state.selectedMistakeTags.filter(t => t !== tag);
  });
});

function setOutcome(outcome) {
  state.tradeOutcome = outcome;
  document.querySelectorAll('#outcomeChips .outcome-chip').forEach(c => c.classList.toggle('selected', c.dataset.outcome === outcome));
}
document.querySelectorAll('#outcomeChips .outcome-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    state.outcomeManuallySet = true;
    setOutcome(chip.dataset.outcome);
  });
});
document.getElementById('tradePnl').addEventListener('input', function () {
  if (state.outcomeManuallySet) return;
  const v = parseFloat(this.value);
  if (isNaN(v)) return;
  setOutcome(v > 0 ? 'win' : (v < 0 ? 'loss' : 'be'));
});

document.getElementById('tradeFileDrop').addEventListener('click', () => document.getElementById('tradeScreenshot').click());
document.getElementById('tradeScreenshot').addEventListener('change', e => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  let remaining = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      state.pendingScreenshots.push(ev.target.result);
      remaining--;
      if (remaining === 0) renderThumbGrid();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

document.getElementById('tradeForm').addEventListener('submit', e => {
  e.preventDefault();
  const modelVal = document.getElementById('tradeModel').value;
  let setupId = null, setupName = null, modelTag;
  if (modelVal.startsWith('setup:')) {
    setupId = modelVal.slice(6);
    const s = state.playbook.setups.find(x => x.id === setupId);
    modelTag = s ? s.model : 'Other';
    setupName = s ? s.name : null;
  } else {
    modelTag = modelVal.slice(4) || 'Other';
  }
  const data = {
    accountId: document.getElementById('tradeAccount').value,
    symbol: document.getElementById('tradeSymbol').value.trim().toUpperCase() || 'NQ',
    date: document.getElementById('tradeDate').value,
    entryTime: document.getElementById('tradeTime').value,
    direction: document.getElementById('tradeDirection').value,
    session: document.getElementById('tradeSession').value,
    model: modelTag,
    setupId: setupId,
    setupName: setupName,
    contracts: parseFloat(document.getElementById('tradeContracts').value) || 0,
    pnl: parseFloat(document.getElementById('tradePnl').value) || 0,
    outcome: state.tradeOutcome,
    rMultiple: document.getElementById('tradeR').value ? parseFloat(document.getElementById('tradeR').value) : null,
    holdMinutes: document.getElementById('tradeHold').value ? parseFloat(document.getElementById('tradeHold').value) : null,
    timeframe: document.getElementById('tradeTimeframe').value.trim(),
    premiumDiscount: document.getElementById('tradePremiumDiscount').value,
    ruleFollowed: state.ruleFollowed,
    mistakeTags: state.selectedMistakeTags.slice(),
    note: document.getElementById('tradeNote').value.trim(),
    screenshots: state.pendingScreenshots.slice(),
    screenshot: state.pendingScreenshots[0] || null
  };
  let copiedCount = 0;
  if (state.editingTradeId) {
    const t = state.trades.find(x => x.id === state.editingTradeId);
    const wasLeaderOfBatch = t.batchId && !t.copiedFromLeader;
    Object.assign(t, data);
    // If this is the leader trade of a copied batch, push the same edits to every
    // mirror so their P&L / details can't drift out of sync with the leader.
    if (wasLeaderOfBatch) {
      state.trades.forEach(copy => {
        if (copy.id === t.id) return;
        if (copy.batchId !== t.batchId) return;
        const keepAccount = copy.accountId; // copies stay on their own account
        Object.assign(copy, data);
        copy.accountId = keepAccount;
        copy.copiedFromLeader = true;
        copy.batchId = t.batchId;
        copy.screenshots = [];   // copies never carry image data
        copy.screenshot = null;
      });
    }
  } else {
    data.id = uid();
    const sourceAccount = getAccount(data.accountId);
    const willCopy = sourceAccount && sourceAccount.isLeader && state.accounts.length > 1;
    if (willCopy) data.batchId = uid();
    state.trades.push(data);

    if (willCopy) {
      state.accounts.forEach(a => {
        if (a.id === data.accountId) return;
        const copy = JSON.parse(JSON.stringify(data));
        copy.id = uid();
        copy.accountId = a.id;
        copy.copiedFromLeader = true;
        copy.screenshots = [];   // screenshots live only on the leader trade; don't duplicate the image data
        copy.screenshot = null;
        state.trades.push(copy);
        copiedCount++;
      });
    }
  }
  saveTrades();
  closeModal('tradeModalOverlay');
  renderDashboard(); renderJournal();
  showToast(copiedCount ? `Trade saved and copied to ${copiedCount} other account${copiedCount > 1 ? 's' : ''}` : 'Trade saved');
});


/* ---------------- Playbook page ---------------- */
function renderPlaybook() {
  document.getElementById('playbookRules').value = state.playbook.rules || '';
  const list = document.getElementById('setupsList');
  if (!state.playbook.setups.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="empty-state-title">No setups documented yet</div><div class="empty-state-sub">Add your A+ models so every trade can be graded against them.</div></div>`;
    return;
  }
  list.innerHTML = state.playbook.setups.map(s => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <div class="card-title" style="margin-bottom:6px;">${escapeHtml(s.name)}</div>
          <div class="trade-entry-badges" style="margin-bottom:0;">
            <span class="badge badge-session">${escapeHtml(s.session)}</span>
            <span class="badge badge-model">${escapeHtml(s.model)}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="icon-btn" onclick="editSetup('${s.id}')" title="Edit">${ICONS.edit}</button>
          <button class="icon-btn" onclick="deleteSetup('${s.id}')" title="Delete">${ICONS.trash}</button>
        </div>
      </div>
      <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:8px;"><b style="color:var(--text-primary);">Entry:</b> ${escapeHtml(s.entry || '—')}</div>
      <div style="font-size:12.5px; color:var(--text-secondary);"><b style="color:var(--red);">Invalidation:</b> ${escapeHtml(s.invalid || '—')}</div>
    </div>`).join('');
}

document.getElementById('savePlaybookRulesBtn').addEventListener('click', () => {
  state.playbook.rules = document.getElementById('playbookRules').value;
  savePlaybook();
  showToast('Trading plan saved');
});

document.getElementById('addSetupBtn').addEventListener('click', () => {
  state.editingSetupId = null;
  document.getElementById('setupModalTitle').textContent = 'Add setup';
  document.getElementById('setupForm').reset();
  openModal('setupModalOverlay');
});

function editSetup(id) {
  const s = state.playbook.setups.find(x => x.id === id);
  if (!s) return;
  state.editingSetupId = id;
  document.getElementById('setupModalTitle').textContent = 'Edit setup';
  document.getElementById('setupName').value = s.name;
  document.getElementById('setupSession').value = s.session;
  document.getElementById('setupModel').value = s.model;
  document.getElementById('setupEntry').value = s.entry || '';
  document.getElementById('setupInvalid').value = s.invalid || '';
  openModal('setupModalOverlay');
}
function deleteSetup(id) {
  if (!confirm('Delete this setup?')) return;
  state.playbook.setups = state.playbook.setups.filter(s => s.id !== id);
  savePlaybook();
  renderPlaybook();
}

document.getElementById('setupForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    name: document.getElementById('setupName').value.trim(),
    session: document.getElementById('setupSession').value,
    model: document.getElementById('setupModel').value,
    entry: document.getElementById('setupEntry').value.trim(),
    invalid: document.getElementById('setupInvalid').value.trim()
  };
  if (state.editingSetupId) {
    Object.assign(state.playbook.setups.find(s => s.id === state.editingSetupId), data);
  } else {
    data.id = uid();
    state.playbook.setups.push(data);
  }
  savePlaybook();
  closeModal('setupModalOverlay');
  renderPlaybook();
  showToast('Setup saved');
});

/* ---------------- Breakdown page ---------------- */
function renderBreakdown() {
  const trades = getScopedTrades();
  document.getElementById('breakdownEmpty').classList.toggle('hidden', trades.length >= 3);
  document.getElementById('breakdownContent').classList.toggle('hidden', trades.length < 3);
  if (trades.length < 3) return;

  const groupBy = keyFn => {
    const groups = {};
    trades.forEach(t => {
      const k = keyFn(t);
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    });
    return groups;
  };
  const rowsFor = groups => Object.entries(groups).map(([key, list]) => {
    const s = computeStats(list);
    const expectancy = s.total ? s.netPnl / s.total : 0;
    return { key, ...s, expectancy };
  }).sort((a, b) => b.netPnl - a.netPnl);

  const renderTable = (elId, rows, keyLabel) => {
    document.getElementById(elId).innerHTML = `
      <thead><tr><th>${keyLabel}</th><th>Trades</th><th>Win%</th><th>Net P&amp;L</th><th>Expectancy</th></tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td>${escapeHtml(r.key)}</td>
          <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${r.total}</td>
          <td style="font-family:var(--font-mono); font-size:11.5px;">${r.winRate.toFixed(0)}%</td>
          <td class="${r.netPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(r.netPnl, { forceSign: true })}</td>
          <td class="${r.expectancy >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(r.expectancy, { forceSign: true })}</td>
        </tr>`).join('')}</tbody>`;
  };

  renderTable('breakdownSessionTable', rowsFor(groupBy(t => t.session)), 'Session');
  renderTable('breakdownModelTable', rowsFor(groupBy(t => t.model)), 'Model');

  const withSetup = trades.filter(t => t.setupName);
  const setupRow = document.getElementById('breakdownSetupRow');
  if (withSetup.length) {
    setupRow.style.display = '';
    const setupGroups = {};
    withSetup.forEach(t => { if (!setupGroups[t.setupName]) setupGroups[t.setupName] = []; setupGroups[t.setupName].push(t); });
    renderTable('breakdownSetupTable', rowsFor(setupGroups), 'Setup');
  } else {
    setupRow.style.display = 'none';
  }

  const withTf = trades.filter(t => t.timeframe);
  const withPd = trades.filter(t => t.premiumDiscount);
  const tfPdRow = document.getElementById('breakdownTfPdRow');
  if (withTf.length || withPd.length) {
    tfPdRow.style.display = '';
    if (withTf.length) {
      const tfGroups = {};
      withTf.forEach(t => { if (!tfGroups[t.timeframe]) tfGroups[t.timeframe] = []; tfGroups[t.timeframe].push(t); });
      renderTable('breakdownTfTable', rowsFor(tfGroups), 'Timeframe');
    } else {
      document.getElementById('breakdownTfTable').innerHTML = `<tbody><tr><td style="color:var(--text-muted); padding:16px 8px;">No timeframe data logged yet</td></tr></tbody>`;
    }
    if (withPd.length) {
      const pdGroups = {};
      withPd.forEach(t => { if (!pdGroups[t.premiumDiscount]) pdGroups[t.premiumDiscount] = []; pdGroups[t.premiumDiscount].push(t); });
      renderTable('breakdownPdTable', rowsFor(pdGroups), 'Zone');
    } else {
      document.getElementById('breakdownPdTable').innerHTML = `<tbody><tr><td style="color:var(--text-muted); padding:16px 8px;">No premium/discount data logged yet</td></tr></tbody>`;
    }
  } else {
    tfPdRow.style.display = 'none';
  }

  const ruleGroups = groupBy(t => t.ruleFollowed ? 'Rule followed' : 'Rule broken');
  renderTable('breakdownRuleTable', rowsFor(ruleGroups), 'Discipline');

  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowGroups = groupBy(t => dowNames[new Date(t.date + 'T00:00:00').getDay()]);
  const dowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowData = dowOrder.map(d => dowGroups[d] ? dowGroups[d].reduce((s, t) => s + t.pnl, 0) : 0);
  const ctx = document.getElementById('breakdownDowChart');
  if (charts.breakdownDow) charts.breakdownDow.destroy();
  charts.breakdownDow = new Chart(ctx, {
    type: 'bar',
    data: { labels: dowOrder, datasets: [{ data: dowData, backgroundColor: dowData.map(v => v >= 0 ? '#3ecf8e' : '#ff5c5c'), borderRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
      scales: {
        x: { ticks: { color: '#9aa1a9', font: { size: 10.5, family: 'Inter' } }, grid: { display: false } },
        y: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => fmtMoneyShort(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  const sorted = trades.slice().sort((a, b) => a.pnl - b.pnl);
  const worst = sorted[0], best = sorted[sorted.length - 1];
  document.getElementById('bdBestTrade').textContent = best ? fmtMoney(best.pnl, { forceSign: true }) + ' · ' + fmtDateShort(best.date) : '—';
  document.getElementById('bdWorstTrade').textContent = worst ? fmtMoney(worst.pnl, { forceSign: true }) + ' · ' + fmtDateShort(worst.date) : '—';

  const mistakeCounts = {};
  trades.forEach(t => (t.mistakeTags || []).forEach(m => mistakeCounts[m] = (mistakeCounts[m] || 0) + 1));
  const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('bdTopMistake').textContent = topMistake ? `${topMistake[0]} (${topMistake[1]}×)` : 'None logged';

  const withR = trades.filter(t => t.rMultiple != null && !isNaN(t.rMultiple));
  const rRow = document.getElementById('breakdownRRow');
  if (withR.length >= 3) {
    rRow.style.display = '';
    const buckets = [
      { label: '< -2R', test: r => r < -2 },
      { label: '-2 to -1R', test: r => r >= -2 && r < -1 },
      { label: '-1 to 0R', test: r => r >= -1 && r < 0 },
      { label: '0 to 1R', test: r => r >= 0 && r < 1 },
      { label: '1 to 2R', test: r => r >= 1 && r < 2 },
      { label: '2 to 3R', test: r => r >= 2 && r < 3 },
      { label: '3R+', test: r => r >= 3 }
    ];
    const counts = buckets.map(b => withR.filter(t => b.test(t.rMultiple)).length);
    const ctxR = document.getElementById('breakdownRChart');
    if (charts.rDist) charts.rDist.destroy();
    charts.rDist = new Chart(ctxR, {
      type: 'bar',
      data: {
        labels: buckets.map(b => b.label),
        datasets: [{ data: counts, backgroundColor: buckets.map(b => b.label.includes('-') ? '#ff5c5c' : (b.label === '0 to 1R' ? '#5c636b' : '#3ecf8e')), borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + ' trade' + (c.raw !== 1 ? 's' : '') } } },
        scales: {
          x: { ticks: { color: '#9aa1a9', font: { size: 10.5, family: 'Inter' } }, grid: { display: false } },
          y: { ticks: { color: '#5c636b', font: { size: 9, family: 'IBM Plex Mono' }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  } else {
    rRow.style.display = 'none';
  }
}

/* ---------------- Certificates page ---------------- */
function renderCertificates() {
  const grid = document.getElementById('certificatesGrid');
  if (!state.certificates.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="empty-state-title">No documents yet</div><div class="empty-state-sub">Upload XFA certificates, payout confirmations, or account docs.</div></div>`;
    return;
  }
  grid.innerHTML = state.certificates.slice().reverse().map(c => `
    <div class="account-card">
      ${c.isImage ? `<img src="${c.fileData}" style="width:100%; border-radius:8px; margin-bottom:10px; border:1px solid var(--border);">` : `<div style="height:100px; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; background:var(--bg-elevated-2); border-radius:8px; color:var(--text-muted);"><span style="width:32px; height:32px; display:block;">${ICONS.file}</span></div>`}
      <div class="account-name" style="font-size:13px;">${escapeHtml(c.name)}</div>
      <div class="account-firm">${fmtDateShort(c.date)}</div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <a href="${c.fileData}" download="${escapeHtml(c.name)}" class="btn btn-sm btn-ghost">Download</a>
        <button class="btn btn-sm btn-danger" onclick="deleteCertificate('${c.id}')">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('certFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.certificates.push({ id: uid(), name: file.name, date: todayISO(), fileData: ev.target.result, isImage: file.type.startsWith('image/') });
    saveCertificates();
    renderCertificates();
    showToast('Document uploaded');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

function deleteCertificate(id) {
  if (!confirm('Delete this document?')) return;
  state.certificates = state.certificates.filter(c => c.id !== id);
  saveCertificates();
  renderCertificates();
}

/* ---------------- Expenses page ---------------- */
function renderExpenses() {
  const itemizedExpTotal = state.expenses.reduce((s, e) => s + e.amount, 0);
  const itemizedPayoutTotal = state.payouts.reduce((s, p) => s + p.amount, 0);

  const payoutInput = document.getElementById('manualPayoutTotal');
  const expenseInput = document.getElementById('manualExpenseTotal');
  if (document.activeElement !== payoutInput) {
    payoutInput.value = state.manualFinance.payoutTotal != null ? state.manualFinance.payoutTotal : '';
  }
  if (document.activeElement !== expenseInput) {
    expenseInput.value = state.manualFinance.expenseTotal != null ? state.manualFinance.expenseTotal : '';
  }

  document.getElementById('payoutItemizedRef').textContent = `Itemized log total: ${fmtMoney(itemizedPayoutTotal)}`;
  document.getElementById('expenseItemizedRef').textContent = `Itemized log total: ${fmtMoney(itemizedExpTotal)}`;

  const payoutVal = state.manualFinance.payoutTotal != null ? state.manualFinance.payoutTotal : 0;
  const expenseVal = state.manualFinance.expenseTotal != null ? state.manualFinance.expenseTotal : 0;
  const netVal = payoutVal - expenseVal;
  const netEl = document.getElementById('netTakeHome');
  netEl.textContent = fmtMoney(netVal, { forceSign: true });
  netEl.className = 'stat-value ' + (netVal >= 0 ? 'positive' : 'negative');

  const expBody = document.getElementById('expensesTableBody');
  const expSorted = state.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!expSorted.length) { expBody.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted); text-align:center; padding:20px;">No expenses logged</td></tr>`; }
  else {
    expBody.innerHTML = expSorted.map(e => `
      <tr>
        <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${fmtDateShort(e.date)}</td>
        <td><span class="badge">${escapeHtml(e.category)}</span></td>
        <td style="font-size:12.5px; color:var(--text-secondary);">${escapeHtml(e.note || '—')}</td>
        <td class="pnl-neg">${fmtMoney(e.amount)}</td>
        <td><button class="icon-btn" onclick="deleteExpense('${e.id}')" title="Delete">${ICONS.trash}</button></td>
      </tr>`).join('');
  }

  const payoutBody = document.getElementById('payoutsTableBody');
  const paySorted = state.payouts.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!paySorted.length) { payoutBody.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted); text-align:center; padding:20px;">No payouts logged</td></tr>`; }
  else {
    payoutBody.innerHTML = paySorted.map(p => {
      const acc = getAccount(p.accountId);
      return `<tr>
        <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${fmtDateShort(p.date)}</td>
        <td style="font-size:12.5px;">${acc ? escapeHtml(acc.name) : '—'}</td>
        <td style="font-size:12.5px; color:var(--text-secondary);">${escapeHtml(p.note || '—')}</td>
        <td class="pnl-pos">${fmtMoney(p.amount)}</td>
        <td><button class="icon-btn" onclick="deletePayout('${p.id}')" title="Delete">${ICONS.trash}</button></td>
      </tr>`;
    }).join('');
  }
}

document.getElementById('manualPayoutTotal').addEventListener('input', function () {
  state.manualFinance.payoutTotal = this.value === '' ? null : parseFloat(this.value);
  saveManualFinance();
  const netVal = (state.manualFinance.payoutTotal || 0) - (state.manualFinance.expenseTotal || 0);
  const netEl = document.getElementById('netTakeHome');
  netEl.textContent = fmtMoney(netVal, { forceSign: true });
  netEl.className = 'stat-value ' + (netVal >= 0 ? 'positive' : 'negative');
});
document.getElementById('manualExpenseTotal').addEventListener('input', function () {
  state.manualFinance.expenseTotal = this.value === '' ? null : parseFloat(this.value);
  saveManualFinance();
  const netVal = (state.manualFinance.payoutTotal || 0) - (state.manualFinance.expenseTotal || 0);
  const netEl = document.getElementById('netTakeHome');
  netEl.textContent = fmtMoney(netVal, { forceSign: true });
  netEl.className = 'stat-value ' + (netVal >= 0 ? 'positive' : 'negative');
});

document.getElementById('addExpenseBtn').addEventListener('click', () => {
  document.getElementById('expenseForm').reset();
  document.getElementById('expenseDate').value = todayISO();
  openModal('expenseModalOverlay');
});

document.getElementById('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  state.expenses.push({
    id: uid(),
    date: document.getElementById('expenseDate').value,
    category: document.getElementById('expenseCategory').value,
    amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
    note: document.getElementById('expenseNote').value.trim()
  });
  saveExpenses();
  closeModal('expenseModalOverlay');
  renderExpenses();
  showToast('Expense added');
});

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses();
}

function populatePayoutAccountSelect() {
  const sel = document.getElementById('payoutAccount');
  sel.innerHTML = '<option value="">— unassigned —</option>' + state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
}

document.getElementById('addPayoutBtn').addEventListener('click', () => {
  document.getElementById('payoutForm').reset();
  document.getElementById('payoutDate').value = todayISO();
  populatePayoutAccountSelect();
  openModal('payoutModalOverlay');
});

document.getElementById('payoutForm').addEventListener('submit', e => {
  e.preventDefault();
  state.payouts.push({
    id: uid(),
    date: document.getElementById('payoutDate').value,
    accountId: document.getElementById('payoutAccount').value || null,
    amount: parseFloat(document.getElementById('payoutAmount').value) || 0,
    note: document.getElementById('payoutNote').value.trim()
  });
  savePayouts();
  closeModal('payoutModalOverlay');
  renderExpenses();
  showToast('Payout added');
});

function deletePayout(id) {
  if (!confirm('Delete this payout?')) return;
  state.payouts = state.payouts.filter(p => p.id !== id);
  savePayouts();
  renderExpenses();
}

/* ---------------- Review page ---------------- */
function renderReview() {
  const start = state.reviewWeekStart;
  const end = addDays(start, 6);
  document.getElementById('reviewWeekLabel').textContent = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const startStr = isoOf(start), endStr = isoOf(end);
  const weekTrades = getLeaderTrades().filter(t => t.date >= startStr && t.date <= endStr);
  const stats = computeStats(weekTrades);
  const byDay = {};
  weekTrades.forEach(t => byDay[t.date] = (byDay[t.date] || 0) + t.pnl);
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('reviewSummary').innerHTML = `
    <div class="stat-card"><div class="stat-label">Trades</div><div class="stat-value">${stats.total}</div></div>
    <div class="stat-card"><div class="stat-label">Net P&L</div><div class="stat-value ${stats.netPnl >= 0 ? 'positive' : 'negative'}">${fmtMoney(stats.netPnl, { forceSign: true })}</div></div>
    <div class="stat-card"><div class="stat-label">Net R</div><div class="stat-value ${stats.totalR >= 0 ? 'positive' : 'negative'}">${(stats.totalR >= 0 ? '+' : '') + stats.totalR.toFixed(1)}R</div></div>
    <div class="stat-card"><div class="stat-label">Win rate</div><div class="stat-value">${stats.winRate.toFixed(0)}%</div></div>
    <div class="stat-card"><div class="stat-label">Best day</div><div class="stat-value" style="font-size:16px;">${bestDay ? fmtDateShort(bestDay[0]) + ' · ' + fmtMoney(bestDay[1], { forceSign: true }) : '—'}</div></div>
  `;

  const key = startStr;
  const existing = state.reviews.find(r => r.weekStart === key);
  document.getElementById('reviewWorked').value = existing ? existing.worked : '';
  document.getElementById('reviewCut').value = existing ? existing.cut : '';
  document.getElementById('reviewFocus').value = existing ? existing.focus : '';

  // Reset the auto-analysis panel whenever the week changes so stale results don't linger.
  const analysisArea = document.getElementById('analysisArea');
  if (analysisArea) {
    analysisArea.innerHTML = `<div class="empty-state" style="padding:30px;"><div class="empty-state-sub">Click "Analyse this week" to have Claude break down this week's leader trades — what the winners shared, what the losers shared, and where the R actually went.</div></div>`;
  }

  renderPastReviews();
}

function renderPastReviews() {
  const sorted = state.reviews.slice().sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const list = document.getElementById('pastReviewsList');
  if (!sorted.length) { list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.editLarge}</div><div class="empty-state-title">No reviews yet</div><div class="empty-state-sub">Save your first weekly review above.</div></div>`; return; }
  list.innerHTML = sorted.map(r => {
    const start = new Date(r.weekStart + 'T00:00:00');
    const end = addDays(start, 6);
    // Recompute stats live from the leader account's trades for this week, so reviews
    // saved under the old all-accounts logic self-correct instead of showing stale numbers.
    const wkStart = r.weekStart, wkEnd = isoOf(end);
    const wkTrades = getLeaderTrades().filter(t => t.date >= wkStart && t.date <= wkEnd);
    const s = computeStats(wkTrades);
    const statsLine = wkTrades.length
      ? fmtMoney(s.netPnl, { forceSign: true }) + ' · ' + (s.totalR >= 0 ? '+' : '') + s.totalR.toFixed(1) + 'R · ' + s.winRate.toFixed(0) + '% WR · ' + s.total + ' trades'
      : '';
    return `
    <div class="past-review-card">
      <div class="past-review-header">
        <div class="past-review-week">${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
        <div class="past-review-stats">${statsLine}</div>
      </div>
      <div class="past-review-body">
        <div>
          <div class="past-review-col-label">Your review</div>
          ${r.worked ? `<div class="past-review-block"><div class="past-review-block-label">What worked</div><div class="past-review-block-text">${escapeHtml(r.worked)}</div></div>` : ''}
          ${r.cut ? `<div class="past-review-block"><div class="past-review-block-label">What to cut</div><div class="past-review-block-text">${escapeHtml(r.cut)}</div></div>` : ''}
          ${r.focus ? `<div class="past-review-block"><div class="past-review-block-label">Focus next week</div><div class="past-review-block-text">${escapeHtml(r.focus)}</div></div>` : ''}
          ${(!r.worked && !r.cut && !r.focus) ? `<div class="past-review-block-text" style="color:var(--text-muted);">No written review for this week.</div>` : ''}
        </div>
        <div>
          <div class="past-review-col-label">Auto-analysis</div>
          ${r.analysisHtml
            ? `<div class="past-review-analysis">${r.analysisHtml}</div>`
            : `<div class="past-review-block-text" style="color:var(--text-muted);">No analysis saved for this week. Open the week above, run "Analyse this week", then click "Save to review".</div>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('reviewPrevWeekBtn').addEventListener('click', () => { state.reviewWeekStart = addDays(state.reviewWeekStart, -7); renderReview(); });
document.getElementById('reviewNextWeekBtn').addEventListener('click', () => { state.reviewWeekStart = addDays(state.reviewWeekStart, 7); renderReview(); });

document.getElementById('saveReviewBtn').addEventListener('click', () => {
  const startStr = isoOf(state.reviewWeekStart);
  const endStr = isoOf(addDays(state.reviewWeekStart, 6));
  const weekTrades = getLeaderTrades().filter(t => t.date >= startStr && t.date <= endStr);
  const stats = computeStats(weekTrades);
  const existing = state.reviews.find(r => r.weekStart === startStr);
  const data = {
    weekStart: startStr,
    worked: document.getElementById('reviewWorked').value.trim(),
    cut: document.getElementById('reviewCut').value.trim(),
    focus: document.getElementById('reviewFocus').value.trim(),
    netPnl: stats.netPnl, winRate: stats.winRate, trades: stats.total, totalR: stats.totalR
  };
  if (existing) Object.assign(existing, data);
  else { data.id = uid(); state.reviews.push(data); }
  saveReviews();
  renderPastReviews();
  showToast('Review saved');
});

/* ============================================
   AUTO-ANALYSIS (Review page) — rule-based, no API key needed.
   Compares winners vs losers across every logged dimension and reports
   real computed numbers rather than an interpretation.
   ============================================ */

function statsFor(trades) {
  const wins = trades.filter(t => getOutcome(t) === 'win').length;
  const losses = trades.filter(t => getOutcome(t) === 'loss').length;
  const decisive = wins + losses;
  return {
    n: trades.length,
    pnl: trades.reduce((s, t) => s + t.pnl, 0),
    r: trades.reduce((s, t) => s + (parseFloat(t.rMultiple) || 0), 0),
    wr: decisive ? (wins / decisive) * 100 : 0,
    wins, losses
  };
}

// Group trades by a field and return sorted rows with stats.
function groupBy(trades, keyFn, label) {
  const map = {};
  trades.forEach(t => {
    const k = keyFn(t);
    if (k === null || k === undefined || k === '') return;
    (map[k] = map[k] || []).push(t);
  });
  const rows = Object.entries(map).map(([k, list]) => Object.assign({ key: k, label }, statsFor(list)));
  return rows.sort((a, b) => a.r - b.r); // worst first
}

// Bucket entry times into session-ish windows.
function timeBucket(t) {
  if (!t.entryTime) return null;
  const h = parseInt(String(t.entryTime).split(':')[0], 10);
  if (isNaN(h)) return null;
  if (h < 9) return 'Before 09:00';
  if (h < 10) return '09:00–09:59';
  if (h < 11) return '10:00–10:59';
  if (h < 12) return '11:00–11:59';
  return '12:00 or later';
}

function fmtR(r) { return (r >= 0 ? '+' : '') + r.toFixed(1) + 'R'; }

// Build a comparison of a dimension between winners and losers.
function compareDimension(winners, losers, keyFn) {
  const wMap = {}, lMap = {};
  winners.forEach(t => { const k = keyFn(t); if (k) wMap[k] = (wMap[k] || 0) + 1; });
  losers.forEach(t => { const k = keyFn(t); if (k) lMap[k] = (lMap[k] || 0) + 1; });
  const keys = [...new Set([...Object.keys(wMap), ...Object.keys(lMap)])];
  return keys.map(k => ({ key: k, w: wMap[k] || 0, l: lMap[k] || 0 }));
}

// Pick out the dominant trait of a set (a value that covers >=60% of them).
function dominantTrait(trades, keyFn, minShare = 0.6) {
  const counts = {};
  let withValue = 0;
  trades.forEach(t => { const k = keyFn(t); if (k) { counts[k] = (counts[k] || 0) + 1; withValue++; } });
  if (!withValue) return null;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const share = top[1] / withValue;
  return share >= minShare ? { value: top[0], count: top[1], of: withValue, share } : null;
}

function runWeeklyAnalysis() {
  const area = document.getElementById('analysisArea');
  const startStr = isoOf(state.reviewWeekStart);
  const endStr = isoOf(addDays(state.reviewWeekStart, 6));
  const trades = getLeaderTrades().filter(t => t.date >= startStr && t.date <= endStr);

  if (!trades.length) {
    area.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="empty-state-sub">No trades logged on your leader account for this week — nothing to analyse.</div></div>';
    return;
  }

  const winners = trades.filter(t => getOutcome(t) === 'win');
  const losers = trades.filter(t => getOutcome(t) === 'loss');
  const all = statsFor(trades);

  const DIMS = [
    { name: 'Session', fn: t => t.session || null },
    { name: 'Setup', fn: t => t.setupName || t.model || null },
    { name: 'Entry time', fn: timeBucket },
    { name: 'Direction', fn: t => t.direction || null },
    { name: 'Premium/Discount', fn: t => t.premiumDiscount || null },
    { name: 'Timeframe', fn: t => t.timeframe || null }
  ];

  // --- Traits shared by winners / losers ---
  const winTraits = [], loseTraits = [];
  DIMS.forEach(d => {
    const w = dominantTrait(winners, d.fn);
    if (w) winTraits.push(`${d.name}: <b>${escapeHtml(w.value)}</b> in ${w.count}/${w.of} winners`);
    const l = dominantTrait(losers, d.fn);
    if (l) loseTraits.push(`${d.name}: <b>${escapeHtml(l.value)}</b> in ${l.count}/${l.of} losers`);
  });

  // Rule adherence split
  const followed = trades.filter(t => t.ruleFollowed !== false);
  const broken = trades.filter(t => t.ruleFollowed === false);
  const fS = statsFor(followed), bS = statsFor(broken);
  if (broken.length) {
    loseTraits.push(`Rule-broken trades: <b>${broken.length}</b> this week, ${fmtR(bS.r)} vs ${fmtR(fS.r)} on rule-followed`);
  }

  // Mistake tags concentrated in losers
  const tagCounts = {};
  losers.forEach(t => (t.mistakeTags || []).forEach(m => tagCounts[m] = (tagCounts[m] || 0) + 1));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  topTags.forEach(([tag, n]) => loseTraits.push(`Tagged <b>${escapeHtml(tag)}</b> on ${n} losing trade${n > 1 ? 's' : ''}`));

  // Avg size / hold comparison
  const avg = (list, f) => { const v = list.map(f).filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const wSize = avg(winners, t => parseFloat(t.contracts)), lSize = avg(losers, t => parseFloat(t.contracts));
  if (wSize != null && lSize != null && Math.abs(wSize - lSize) >= 0.5) {
    const bigger = lSize > wSize ? 'losers' : 'winners';
    loseTraits.push(`Average size is larger on <b>${bigger}</b> (${lSize.toFixed(1)} vs ${wSize.toFixed(1)} contracts)`);
  }
  const wHold = avg(winners, t => parseFloat(t.holdMinutes)), lHold = avg(losers, t => parseFloat(t.holdMinutes));
  if (wHold != null && lHold != null && Math.abs(wHold - lHold) >= 3) {
    winTraits.push(`Winners held <b>${wHold.toFixed(0)} min</b> on average vs ${lHold.toFixed(0)} min on losers`);
  }

  // --- Where the R went ---
  const sorted = trades.slice().sort((a, b) => (parseFloat(a.rMultiple) || 0) - (parseFloat(b.rMultiple) || 0));
  const worst = sorted[0], best = sorted[sorted.length - 1];
  const lossR = Math.abs(losers.reduce((s, t) => s + (parseFloat(t.rMultiple) || 0), 0));
  const worstR = Math.abs(parseFloat(worst && worst.rMultiple) || 0);
  const concentration = lossR > 0 ? (worstR / lossR) * 100 : 0;
  let whereR = `Net ${fmtR(all.r)} across ${all.n} trades. `;
  if (worst && best) {
    whereR += `Best ${fmtR(parseFloat(best.rMultiple) || 0)}, worst ${fmtR(parseFloat(worst.rMultiple) || 0)}. `;
  }
  if (losers.length > 1) {
    whereR += concentration >= 50
      ? `Your single worst trade is ${concentration.toFixed(0)}% of all R lost — this week was one bad trade, not a broken process.`
      : `Losses are spread across ${losers.length} trades rather than one blow-up — this looks like a process leak, not a one-off.`;
  }

  // --- Worst / best groups ---
  const sessionRows = groupBy(trades, t => t.session, 'Session');
  const setupRows = groupBy(trades, t => t.setupName || t.model, 'Setup');
  const timeRows = groupBy(trades, timeBucket, 'Entry time');

  // --- Biggest leak (pick the worst-R group with >=2 trades) ---
  const candidates = [...sessionRows, ...setupRows, ...timeRows].filter(r => r.n >= 2 && r.r < 0);
  candidates.sort((a, b) => a.r - b.r);
  const leak = candidates[0];
  let leakText;
  if (leak) {
    leakText = `${leak.label} "${leak.key}" — ${leak.n} trades, ${fmtR(leak.r)}, ${leak.wr.toFixed(0)}% win rate. That's your worst cluster this week.`;
  } else if (broken.length && bS.r < 0) {
    leakText = `Rule-broken trades cost you ${fmtR(bS.r)} across ${broken.length} trades.`;
  } else {
    leakText = all.r >= 0 ? 'No clear losing cluster this week.' : 'No single cluster stands out — losses are spread thin.';
  }

  // --- Focus suggestions, derived from the data ---
  const focus = [];
  if (leak) focus.push(`Cut or rework ${leak.label.toLowerCase()} "${leak.key}" until it proves itself on paper.`);
  const bestGroup = [...sessionRows, ...setupRows].filter(r => r.n >= 2 && r.r > 0).sort((a, b) => b.r - a.r)[0];
  if (bestGroup) focus.push(`Lean into ${bestGroup.label.toLowerCase()} "${bestGroup.key}" (${bestGroup.n} trades, ${fmtR(bestGroup.r)}).`);
  if (broken.length) focus.push(`${broken.length} rule-break${broken.length > 1 ? 's' : ''} this week — target zero.`);
  if (topTags.length) focus.push(`Your most common leak tag was "${topTags[0][0]}" — build a pre-entry check for it.`);
  if (!focus.length) focus.push('Nothing glaring in the data — keep sample building.');

  const tableRows = rows => rows.length ? `<table class="mini-table" style="margin-top:6px;">
      <thead><tr><th>${escapeHtml(rows[0].label)}</th><th>N</th><th>R</th><th>WR</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td style="font-size:12px;">${escapeHtml(r.key)}</td>
        <td style="font-size:12px;">${r.n}</td>
        <td class="${r.r >= 0 ? 'pnl-pos' : 'pnl-neg'}" style="font-size:12px;">${fmtR(r.r)}</td>
        <td style="font-size:12px;">${r.wr.toFixed(0)}%</td>
      </tr>`).join('')}</tbody></table>` : '';

  const li = arr => arr.length ? `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p style="color:var(--text-muted);">Not enough data on the fields you logged.</p>';

  const headline = all.r >= 0
    ? `Net ${fmtR(all.r)} (${fmtMoney(all.pnl, { forceSign: true })}) across ${all.n} trades at ${all.wr.toFixed(0)}% win rate.`
    : `Down ${fmtR(all.r)} (${fmtMoney(all.pnl, { forceSign: true })}) across ${all.n} trades at ${all.wr.toFixed(0)}% win rate.`;

  const caveat = all.n < 20
    ? `Only ${all.n} trade${all.n > 1 ? 's' : ''} this week — treat these as tendencies to watch, not proven edges. Patterns need 30+ trades before they mean much.`
    : `${all.n} trades is a workable sample, but still one week — check whether these patterns repeat.`;

  const analysisHtml = `
    <div class="analysis-block"><p style="font-size:14px; color:var(--text-primary); font-weight:600;">${headline}</p></div>
    <div class="analysis-block"><h4>✓ Winners had in common (${winners.length})</h4>${li(winTraits)}</div>
    <div class="analysis-block"><h4>✗ Losers had in common (${losers.length})</h4>${li(loseTraits)}</div>
    <div class="analysis-block"><h4>Where the R went</h4><p>${whereR}</p></div>
    <div class="analysis-block"><h4>Biggest leak</h4><p style="color:var(--red);">${escapeHtml(leakText)}</p></div>
    <div class="analysis-block"><h4>By session</h4>${tableRows(sessionRows)}</div>
    <div class="analysis-block"><h4>By setup</h4>${tableRows(setupRows)}</div>
    ${timeRows.length ? `<div class="analysis-block"><h4>By entry time</h4>${tableRows(timeRows)}</div>` : ''}
    ${broken.length ? `<div class="analysis-block"><h4>Discipline</h4><p>Rule-followed: ${fS.n} trades, ${fmtR(fS.r)}, ${fS.wr.toFixed(0)}% WR<br>Rule-broken: ${bS.n} trades, ${fmtR(bS.r)}, ${bS.wr.toFixed(0)}% WR</p></div>` : ''}
    <div class="analysis-block"><h4>Focus next week</h4>${li(focus)}</div>
    <div class="analysis-block"><p style="font-size:11.5px; color:var(--text-muted); font-style:italic;">${escapeHtml(caveat)}</p></div>
  `;

  // Hold it so it can be attached to this week's saved review.
  state.pendingAnalysis = { weekStart: startStr, html: analysisHtml, savedAt: new Date().toISOString() };

  area.innerHTML = analysisHtml + `
    <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-soft);">
      <button class="btn btn-sm btn-primary" id="saveAnalysisBtn">💾 Save to review</button>
      <span style="font-size:11.5px; color:var(--text-muted); margin-left:8px;">Pins this analysis to the week so it shows in Past reviews</span>
    </div>`;

  document.getElementById('saveAnalysisBtn').addEventListener('click', saveAnalysisToReview);
}

// Attach the current analysis to this week's review record (creating it if needed).
function saveAnalysisToReview() {
  if (!state.pendingAnalysis) { showToast('Run the analysis first'); return; }
  const startStr = state.pendingAnalysis.weekStart;
  let review = state.reviews.find(r => r.weekStart === startStr);
  if (!review) {
    review = {
      id: uid(), weekStart: startStr,
      worked: document.getElementById('reviewWorked').value.trim(),
      cut: document.getElementById('reviewCut').value.trim(),
      focus: document.getElementById('reviewFocus').value.trim()
    };
    state.reviews.push(review);
  }
  review.analysisHtml = state.pendingAnalysis.html;
  review.analysisSavedAt = state.pendingAnalysis.savedAt;
  saveReviews();
  renderPastReviews();
  showToast('Analysis saved to this week\'s review');
}

document.getElementById('runAnalysisBtn').addEventListener('click', runWeeklyAnalysis);

/* ============================================
   DAILY JOURNAL — Day View feed
   A scrollable feed of day cards (expand for stats + chart), a month
   calendar for navigation, and a full reflection note per day.
   ============================================ */

const DAILY_TAGS = ['No setup', 'Patient', 'Disciplined', 'A+ setup', 'FOMO', 'Overtraded', 'Revenge', 'Tired', 'Distracted', 'Rushed', 'Hesitated', 'Moved stop'];

const PROCESS_CHECKS = [
  { id: 'plan', text: 'Wrote a pre-market plan before the session' },
  { id: 'levels', text: 'Marked key levels / HTF context beforehand' },
  { id: 'session', text: 'Only traded inside my planned session window' },
  { id: 'criteria', text: 'Every entry met my A+ criteria' },
  { id: 'size', text: 'Sized correctly on every trade' },
  { id: 'stop', text: 'Never moved a stop against me' },
  { id: 'limit', text: 'Respected my daily loss limit / trade cap' },
  { id: 'nochase', text: 'Did not chase or revenge trade' },
  { id: 'journal', text: 'Journalled the day properly' }
];

const STATE_SCALES = [
  { key: 'sleep', el: 'dailySleepChips', labels: ['Awful', 'Poor', 'OK', 'Good', 'Great'] },
  { key: 'energy', el: 'dailyEnergyChips', labels: ['Drained', 'Low', 'OK', 'Good', 'High'] },
  { key: 'focus', el: 'dailyFocusChips', labels: ['Scattered', 'Poor', 'OK', 'Sharp', 'Locked in'] },
  { key: 'stress', el: 'dailyStressChips', labels: ['Calm', 'Mild', 'Medium', 'High', 'Severe'] }
];

function getDailyEntry(date) { return state.dailyEntries.find(d => d.date === date); }

/* ---------- habit stats ---------- */
function renderDailyHabitStats() {
  const entries = state.dailyEntries;
  const dates = new Set(entries.map(e => e.date));
  let streak = 0, cursor = new Date();
  if (!dates.has(isoOf(cursor))) cursor = addDays(cursor, -1);
  while (dates.has(isoOf(cursor))) { streak++; cursor = addDays(cursor, -1); }

  const last30 = entries.filter(e => e.date >= isoOf(addDays(new Date(), -29)));
  const rated = last30.filter(e => e.rating);
  const avgRating = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : null;
  const scored = last30.filter(e => e.checks && e.checks.length);
  const avgProcess = scored.length ? scored.reduce((s, e) => s + (e.checks.length / PROCESS_CHECKS.length) * 100, 0) / scored.length : null;
  const followed = last30.filter(e => e.discipline === 'yes' || e.discipline === 'mostly').length;
  const withDisc = last30.filter(e => e.discipline && e.discipline !== 'na').length;
  const discPct = withDisc ? (followed / withDisc) * 100 : null;

  document.getElementById('dailyHabitStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Journaling streak</div><div class="stat-value ${streak > 0 ? 'positive' : ''}">${streak} day${streak === 1 ? '' : 's'}</div></div>
    <div class="stat-card"><div class="stat-label">Avg process (30d)</div><div class="stat-value ${avgProcess == null ? '' : (avgProcess >= 80 ? 'positive' : (avgProcess >= 50 ? '' : 'negative'))}">${avgProcess == null ? '—' : avgProcess.toFixed(0) + '%'}</div></div>
    <div class="stat-card"><div class="stat-label">Avg rating (30d)</div><div class="stat-value">${avgRating == null ? '—' : avgRating.toFixed(1) + '/5'}</div></div>
    <div class="stat-card"><div class="stat-label">Plan followed (30d)</div><div class="stat-value ${discPct == null ? '' : (discPct >= 70 ? 'positive' : 'negative')}">${discPct == null ? '—' : discPct.toFixed(0) + '%'}</div></div>
  `;
}

/* ---------- the day feed ---------- */
function dailyRangeBounds() {
  const today = todayISO();
  switch (state.dailyRange) {
    case '30d': return { from: isoOf(addDays(new Date(), -29)), to: today };
    case '90d': return { from: isoOf(addDays(new Date(), -89)), to: today };
    case 'all': return { from: null, to: null };
    default: return { from: today.slice(0, 7) + '-01', to: today };
  }
}

function renderDayFeed() {
  const feed = document.getElementById('dayFeed');
  const { from, to } = dailyRangeBounds();
  const trades = getLeaderTrades();

  // Every date that has a trade or a journal note within range.
  const dateSet = new Set();
  trades.forEach(t => dateSet.add(t.date));
  state.dailyEntries.forEach(e => dateSet.add(e.date));
  let dates = [...dateSet].filter(d => (!from || d >= from) && (!to || d <= to));

  if (state.dayViewMode === 'week') return renderWeekFeed(dates, trades);

  dates.sort((a, b) => b.localeCompare(a));
  if (!dates.length) {
    feed.innerHTML = `<div class="empty-state"><div class="empty-state-title">Nothing in this range</div><div class="empty-state-sub">Log a trade or write a daily note to see it here.</div></div>`;
    return;
  }

  feed.innerHTML = dates.map(date => {
    const dayTrades = trades.filter(t => t.date === date);
    const s = computeStats(dayTrades);
    const entry = getDailyEntry(date);
    const cls = !dayTrades.length ? 'flat' : (s.netPnl > 0 ? 'win' : (s.netPnl < 0 ? 'loss' : 'flat'));
    const d = new Date(date + 'T00:00:00');
    const open = state.openDays.includes(date);
    return `
    <div class="day-card ${cls} ${open ? 'open' : ''}" id="daycard_${date}">
      <div class="day-card-head" onclick="toggleDayCard('${date}')">
        <span class="day-chev">▶</span>
        <span class="day-date">${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span class="day-pnl ${dayTrades.length ? (s.netPnl >= 0 ? 'pnl-pos' : 'pnl-neg') : ''}" style="${dayTrades.length ? '' : 'color:var(--text-muted);'}">
          ${dayTrades.length ? 'Net P&L ' + fmtMoney(s.netPnl, { forceSign: true }) : 'No trades'}
        </span>
        <span class="day-head-spacer"></span>
        <span class="day-head-actions" onclick="event.stopPropagation();">
          ${entry ? '<span class="day-note-dot" title="Note saved"></span>' : ''}
          <button class="btn btn-sm btn-ghost" onclick="openDailyNote('${date}')">${entry ? 'View note' : '+ Add note'}</button>
        </span>
      </div>
      <div class="day-card-body" style="${open ? '' : 'display:none;'}">
        ${dayTrades.length ? `
        <div class="day-body-grid">
          <div class="chart-box" style="height:170px;"><canvas id="daychart_${date}"></canvas></div>
          <div class="day-stat-grid">
            <div><div class="day-stat-label">Total trades</div><div class="day-stat-value">${s.total}</div></div>
            <div><div class="day-stat-label">Net R</div><div class="day-stat-value ${s.totalR >= 0 ? 'pnl-pos' : 'pnl-neg'}">${(s.totalR >= 0 ? '+' : '') + s.totalR.toFixed(1)}R</div></div>
            <div><div class="day-stat-label">Winners / losers</div><div class="day-stat-value">${s.wins} / ${s.losses}</div></div>
            <div><div class="day-stat-label">Win rate</div><div class="day-stat-value">${s.winRate.toFixed(0)}%</div></div>
            <div><div class="day-stat-label">Profit factor</div><div class="day-stat-value">${isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '—'}</div></div>
            <div><div class="day-stat-label">Contracts</div><div class="day-stat-value">${dayTrades.reduce((a, t) => a + (parseFloat(t.contracts) || 0), 0)}</div></div>
            <div><div class="day-stat-label">Rule-broken</div><div class="day-stat-value ${dayTrades.filter(t => t.ruleFollowed === false).length ? 'pnl-neg' : ''}">${dayTrades.filter(t => t.ruleFollowed === false).length}</div></div>
            <div><div class="day-stat-label">Avg hold</div><div class="day-stat-value">${s.avgHold ? Math.round(s.avgHold) + ' min' : '—'}</div></div>
          </div>
        </div>
        <div style="margin-top:14px;">
          ${dayTrades.sort((a, b) => (a.entryTime || '').localeCompare(b.entryTime || '')).map(t => {
            const oc = getOutcome(t);
            return `<div class="daily-trade-row">
              <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                <span class="outcome-pill ${oc}">${oc === 'be' ? 'BE' : oc}</span>
                <span style="color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.entryTime ? escapeHtml(t.entryTime) + ' · ' : ''}${escapeHtml(t.symbol)} ${escapeHtml(t.direction)} · ${escapeHtml(t.setupName || t.model || '—')}</span>
                ${t.ruleFollowed === false ? '<span class="badge badge-rule-broken">Rule broken</span>' : ''}
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                ${t.rMultiple != null && t.rMultiple !== '' ? `<span style="color:var(--text-muted); font-family:var(--font-mono); font-size:11.5px;">${parseFloat(t.rMultiple) >= 0 ? '+' : ''}${parseFloat(t.rMultiple)}R</span>` : ''}
                <span class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}" style="font-family:var(--font-mono);">${fmtMoney(t.pnl, { forceSign: true })}</span>
                <button class="icon-btn" onclick="viewTradeDetail('${t.id}')" title="View">${ICONS.view}</button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<div class="day-empty">No trades this day — staying flat is still a decision worth journaling.</div>`}
        ${entry ? renderNotePreview(entry) : ''}
      </div>
    </div>`;
  }).join('');

  // draw charts for any open day
  dates.forEach(date => { if (state.openDays.includes(date)) drawDayChart(date); });
}

function renderWeekFeed(dates, trades) {
  const feed = document.getElementById('dayFeed');
  const weeks = {};
  dates.forEach(d => {
    const ws = isoOf(startOfWeek(new Date(d + 'T00:00:00')));
    (weeks[ws] = weeks[ws] || []).push(d);
  });
  const keys = Object.keys(weeks).sort((a, b) => b.localeCompare(a));
  if (!keys.length) {
    feed.innerHTML = `<div class="empty-state"><div class="empty-state-title">Nothing in this range</div></div>`;
    return;
  }
  feed.innerHTML = keys.map(ws => {
    const wStart = new Date(ws + 'T00:00:00'), wEnd = addDays(wStart, 6);
    const wTrades = trades.filter(t => t.date >= ws && t.date <= isoOf(wEnd));
    const s = computeStats(wTrades);
    const notes = state.dailyEntries.filter(e => e.date >= ws && e.date <= isoOf(wEnd)).length;
    const cls = !wTrades.length ? 'flat' : (s.netPnl > 0 ? 'win' : (s.netPnl < 0 ? 'loss' : 'flat'));
    return `
    <div class="day-card ${cls}">
      <div class="day-card-head" style="cursor:default;">
        <span class="day-date">${wStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${wEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span class="day-pnl ${wTrades.length ? (s.netPnl >= 0 ? 'pnl-pos' : 'pnl-neg') : ''}" style="${wTrades.length ? '' : 'color:var(--text-muted);'}">${wTrades.length ? 'Net P&L ' + fmtMoney(s.netPnl, { forceSign: true }) : 'No trades'}</span>
        <span class="day-head-spacer"></span>
        <span style="font-size:11.5px; color:var(--text-muted); font-family:var(--font-mono);">${notes} note${notes === 1 ? '' : 's'}</span>
      </div>
      <div class="day-card-body">
        <div class="day-stat-grid" style="padding-top:14px; grid-template-columns:repeat(4,1fr);">
          <div><div class="day-stat-label">Trades</div><div class="day-stat-value">${s.total}</div></div>
          <div><div class="day-stat-label">Net R</div><div class="day-stat-value ${s.totalR >= 0 ? 'pnl-pos' : 'pnl-neg'}">${(s.totalR >= 0 ? '+' : '') + s.totalR.toFixed(1)}R</div></div>
          <div><div class="day-stat-label">Win rate</div><div class="day-stat-value">${s.winRate.toFixed(0)}%</div></div>
          <div><div class="day-stat-label">Days traded</div><div class="day-stat-value">${new Set(wTrades.map(t => t.date)).size}</div></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderNotePreview(e) {
  const bits = [];
  if (e.lesson) bits.push(`<div class="past-daily-block"><div class="past-daily-block-label">Lesson</div><div class="past-daily-block-text" style="color:var(--gold);">${escapeHtml(e.lesson)}</div></div>`);
  if (e.improve) bits.push(`<div class="past-daily-block"><div class="past-daily-block-label">To improve</div><div class="past-daily-block-text">${escapeHtml(e.improve)}</div></div>`);
  const meta = [];
  if (e.checks && e.checks.length) meta.push(`${Math.round((e.checks.length / PROCESS_CHECKS.length) * 100)}% process`);
  if (e.rating) meta.push(`${e.rating}/5`);
  if (e.discipline) meta.push({ yes: 'Plan followed', mostly: 'Mostly followed', no: 'Plan broken', na: 'No trades' }[e.discipline]);
  if (!bits.length && !meta.length) return '';
  return `<div class="day-note-preview">
    ${meta.length ? `<div class="trade-entry-badges" style="margin-bottom:8px;">${meta.map(m => `<span class="badge badge-session">${escapeHtml(m)}</span>`).join('')}${(e.tags || []).map(t => `<span class="badge badge-tf">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${bits.join('')}
  </div>`;
}

function toggleDayCard(date) {
  if (state.openDays.includes(date)) state.openDays = state.openDays.filter(d => d !== date);
  else state.openDays.push(date);
  renderDayFeed();
}

function drawDayChart(date) {
  const ctx = document.getElementById('daychart_' + date);
  if (!ctx) return;
  const dayTrades = getLeaderTrades().filter(t => t.date === date)
    .sort((a, b) => (a.entryTime || '').localeCompare(b.entryTime || ''));
  let cum = 0;
  const pts = [{ x: 'Start', y: 0 }];
  dayTrades.forEach((t, i) => { cum += t.pnl; pts.push({ x: t.entryTime || ('T' + (i + 1)), y: cum }); });
  if (charts['day_' + date]) charts['day_' + date].destroy();
  const up = cum >= 0;
  charts['day_' + date] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: pts.map(p => p.x),
      datasets: [{
        data: pts.map(p => p.y),
        borderColor: up ? '#3ecf8e' : '#ff5c5c',
        backgroundColor: up ? 'rgba(62,207,142,0.12)' : 'rgba(255,92,92,0.12)',
        fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y, { forceSign: true }) } } },
      scales: {
        x: { ticks: { color: '#5c636b', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#5c636b', font: { size: 9 }, callback: v => fmtMoneyShort(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

/* ---------- calendar ---------- */
function renderDayCalendar() {
  const y = state.dayCalYear, m = state.dayCalMonth;
  document.getElementById('dayCalLabel').textContent = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const trades = getLeaderTrades();
  const byDay = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const noteDays = new Set(state.dailyEntries.map(e => e.date));

  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = todayISO();
  let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="calendar-dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += `<div class="calendar-day empty"></div>`;
  for (let dd = 1; dd <= days; dd++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const pnl = byDay[ds];
    let cls = 'calendar-day clickable';
    if (ds === today) cls += ' today';
    if (pnl != null) cls += pnl >= 0 ? ' pos has-trades' : ' neg has-trades';
    if (noteDays.has(ds)) cls += ' has-note';
    html += `<div class="${cls}" onclick="jumpToDay('${ds}')">
      <div class="calendar-day-num">${dd}</div>
      ${pnl != null ? `<div class="calendar-day-pnl">${fmtMoneyShort(pnl)}</div>` : ''}
    </div>`;
  }
  document.getElementById('dayCalGrid').innerHTML = html;
}

function jumpToDay(date) {
  const hasSomething = getLeaderTrades().some(t => t.date === date) || getDailyEntry(date);
  if (!hasSomething) { openDailyNote(date); return; }
  if (!state.openDays.includes(date)) state.openDays.push(date);
  renderDayFeed();
  const el = document.getElementById('daycard_' + date);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  else openDailyNote(date);
}

/* ---------- note modal ---------- */
function renderDailyTagChips() {
  document.getElementById('dailyTagChips').innerHTML = DAILY_TAGS.map(t =>
    `<div class="chip ${state.dailyTags.includes(t) ? 'selected' : ''}" onclick="toggleDailyTag('${t}')">${t}</div>`).join('');
}
function toggleDailyTag(tag) {
  state.dailyTags = state.dailyTags.includes(tag) ? state.dailyTags.filter(t => t !== tag) : state.dailyTags.concat(tag);
  renderDailyTagChips();
}
function renderStateChips() {
  STATE_SCALES.forEach(s => {
    document.getElementById(s.el).innerHTML = s.labels.map((lab, i) =>
      `<div class="chip ${state.dailyState[s.key] === (i + 1) ? 'selected' : ''}" onclick="setDailyState('${s.key}', ${i + 1})" title="${lab}">${i + 1}</div>`
    ).join('') + `<span style="font-size:11px; color:var(--text-muted); margin-left:6px; align-self:center;">${state.dailyState[s.key] ? s.labels[state.dailyState[s.key] - 1] : ''}</span>`;
  });
}
function setDailyState(key, val) { state.dailyState[key] = state.dailyState[key] === val ? null : val; renderStateChips(); }
function renderChecklist() {
  document.getElementById('dailyChecklist').innerHTML = PROCESS_CHECKS.map(c => `
    <label class="check-row ${state.dailyChecks.includes(c.id) ? 'checked' : ''}">
      <input type="checkbox" ${state.dailyChecks.includes(c.id) ? 'checked' : ''} onchange="toggleCheck('${c.id}')">
      <span>${c.text}</span></label>`).join('');
  updateProcessScore();
}
function toggleCheck(id) {
  state.dailyChecks = state.dailyChecks.includes(id) ? state.dailyChecks.filter(x => x !== id) : state.dailyChecks.concat(id);
  renderChecklist();
}
function updateProcessScore() {
  const n = state.dailyChecks.length, total = PROCESS_CHECKS.length, pct = Math.round((n / total) * 100);
  const colour = pct >= 80 ? 'var(--green)' : (pct >= 50 ? 'var(--gold)' : 'var(--red)');
  document.getElementById('dailyProcessScore').innerHTML =
    `<span style="color:var(--text-muted);">Process score</span><span class="process-score-value" style="color:${colour};">${n}/${total} · ${pct}%</span>`;
}
function setDailyDiscipline(val) {
  state.dailyDiscipline = val;
  document.querySelectorAll('#dailyDisciplineChips .chip').forEach(c => c.classList.toggle('selected', c.dataset.discipline === val));
}
function setDailyRating(val) {
  state.dailyRating = val;
  document.querySelectorAll('#dailyRatingChips .chip').forEach(c => c.classList.toggle('selected', c.dataset.rating === String(val)));
}
function renderCarryover(date) {
  const el = document.getElementById('dailyCarryover');
  const prior = state.dailyEntries.filter(e => e.date < date && e.plan).sort((a, b) => b.date.localeCompare(a.date))[0];
  el.innerHTML = prior ? `<div class="carryover-card">
    <div class="carryover-label">Your plan from ${fmtDate(prior.date)} — did you follow it?</div>
    <div class="carryover-text">${escapeHtml(prior.plan)}</div></div>` : '';
}

function openDailyNote(date) {
  state.dailyDate = date;
  const e = getDailyEntry(date);
  const d = new Date(date + 'T00:00:00');
  document.getElementById('dailyNoteTitle').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayTrades = getLeaderTrades().filter(t => t.date === date);
  const s = computeStats(dayTrades);
  document.getElementById('dailyNoteSub').textContent = dayTrades.length
    ? `${dayTrades.length} trade${dayTrades.length > 1 ? 's' : ''} · ${fmtMoney(s.netPnl, { forceSign: true })} · ${(s.totalR >= 0 ? '+' : '') + s.totalR.toFixed(1)}R`
    : 'No trades this day';

  const val = (id, v) => document.getElementById(id).value = v || '';
  val('dailyBias', e && e.bias); val('dailySessionFocus', e && e.sessionFocus);
  val('dailyLevels', e && e.levels); val('dailyCriteria', e && e.criteria);
  val('dailyMarket', e && e.market); val('dailyGood', e && e.good);
  val('dailyImprove', e && e.improve); val('dailyLesson', e && e.lesson);
  val('dailyPlan', e && e.plan); val('dailyMindset', e && e.mindset);
  state.dailyTags = e && e.tags ? e.tags.slice() : [];
  state.dailyChecks = e && e.checks ? e.checks.slice() : [];
  state.dailyState = e && e.stateScores ? Object.assign({}, e.stateScores) : { sleep: null, energy: null, focus: null, stress: null };
  setDailyDiscipline(e ? (e.discipline || null) : null);
  setDailyRating(e ? (e.rating || null) : null);
  renderDailyTagChips(); renderChecklist(); renderStateChips(); renderCarryover(date);
  document.getElementById('deleteDailyBtn').style.display = e ? '' : 'none';
  openModal('dailyNoteOverlay');
}

document.getElementById('copyPrevPlanBtn').addEventListener('click', () => {
  const prior = state.dailyEntries.filter(e => e.date < state.dailyDate && e.plan).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prior) { showToast('No previous plan found'); return; }
  const box = document.getElementById('dailyCriteria');
  box.value = box.value ? box.value + '\n' + prior.plan : prior.plan;
  showToast('Pulled in plan from ' + fmtDateShort(prior.date));
});

document.getElementById('saveDailyBtn').addEventListener('click', () => {
  const date = state.dailyDate;
  const g = id => document.getElementById(id).value.trim();
  const data = {
    date, bias: g('dailyBias'), sessionFocus: g('dailySessionFocus'),
    levels: g('dailyLevels'), criteria: g('dailyCriteria'), market: g('dailyMarket'),
    good: g('dailyGood'), improve: g('dailyImprove'), lesson: g('dailyLesson'),
    plan: g('dailyPlan'), mindset: g('dailyMindset'),
    discipline: state.dailyDiscipline, rating: state.dailyRating,
    tags: state.dailyTags.slice(), checks: state.dailyChecks.slice(),
    stateScores: Object.assign({}, state.dailyState)
  };
  const hasContent = Object.entries(data).some(([k, v]) => k !== 'date' && (
    (typeof v === 'string' && v) || (Array.isArray(v) && v.length) || (typeof v === 'number') ||
    (v && typeof v === 'object' && Object.values(v).some(x => x))));
  if (!hasContent) { showToast('Nothing to save yet'); return; }
  const existing = getDailyEntry(date);
  if (existing) Object.assign(existing, data);
  else { data.id = uid(); state.dailyEntries.push(data); }
  saveDaily();
  closeModal('dailyNoteOverlay');
  renderDaily();
  showToast('Daily note saved');
});

document.getElementById('deleteDailyBtn').addEventListener('click', () => {
  if (!confirm('Delete the note for ' + fmtDate(state.dailyDate) + '?')) return;
  state.dailyEntries = state.dailyEntries.filter(e => e.date !== state.dailyDate);
  saveDaily();
  closeModal('dailyNoteOverlay');
  renderDaily();
  showToast('Note deleted');
});

/* ---------- events ---------- */
document.querySelectorAll('.seg-btn[data-dayview]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.seg-btn[data-dayview]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  state.dayViewMode = b.dataset.dayview;
  renderDayFeed();
}));
document.getElementById('dailyRangeSelect').addEventListener('change', function () {
  state.dailyRange = this.value; renderDayFeed();
});
document.getElementById('dayCalPrev').addEventListener('click', () => {
  state.dayCalMonth--; if (state.dayCalMonth < 0) { state.dayCalMonth = 11; state.dayCalYear--; }
  renderDayCalendar();
});
document.getElementById('dayCalNext').addEventListener('click', () => {
  state.dayCalMonth++; if (state.dayCalMonth > 11) { state.dayCalMonth = 0; state.dayCalYear++; }
  renderDayCalendar();
});

function renderDaily() {
  renderDailyHabitStats();
  renderDayFeed();
  renderDayCalendar();
}


/* ---------------- Modal helpers ---------------- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
});

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------------- Import / Export ---------------- */
document.getElementById('exportJsonBtn').addEventListener('click', exportBackup);
document.getElementById('exportQuickBtn').addEventListener('click', exportBackup);
function exportBackup() {
  const data = {
    accounts: state.accounts, trades: state.trades, reviews: state.reviews,
    playbook: state.playbook, certificates: state.certificates,
    expenses: state.expenses, payouts: state.payouts, manualFinance: state.manualFinance,
    dailyEntries: state.dailyEntries,
    exportedAt: new Date().toISOString()
  };
  downloadFile('edge-backup-' + todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
}

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const headers = ['date', 'accountName', 'symbol', 'direction', 'session', 'model', 'contracts', 'pnl', 'rMultiple', 'holdMinutes', 'ruleFollowed', 'mistakeTags', 'note'];
  const rows = state.trades.map(t => {
    const acc = getAccount(t.accountId);
    return [t.date, acc ? acc.name : '', t.symbol, t.direction, t.session, t.model, t.contracts, t.pnl, t.rMultiple || '', t.holdMinutes || '', t.ruleFollowed, (t.mistakeTags || []).join(';'), (t.note || '').replace(/[\r\n]+/g, ' ').replace(/"/g, "'")]
      .map(v => `"${v}"`).join(',');
  });
  downloadFile('edge-trades-' + todayISO() + '.csv', headers.join(',') + '\n' + rows.join('\n'), 'text/csv');
});

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('restoreFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm('This will replace all current data with the backup. Continue?')) return;
      state.accounts = data.accounts || [];
      state.trades = data.trades || [];
      state.reviews = data.reviews || [];
      state.playbook = data.playbook || { rules: '', setups: [] };
      state.certificates = data.certificates || [];
      state.expenses = data.expenses || [];
      state.payouts = data.payouts || [];
      state.manualFinance = data.manualFinance || { payoutTotal: null, expenseTotal: null };
      state.dailyEntries = data.dailyEntries || [];
      saveAccounts(); saveTrades(); saveReviews(); savePlaybook(); saveCertificates(); saveExpenses(); savePayouts(); saveManualFinance(); saveDaily();
      renderAccountSwitcher(); renderAll();
      showToast('Backup restored');
    } catch (err) { alert('Could not read that file — is it a valid EDGE backup JSON?'); }
  };
  reader.readAsText(file);
});

document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('This deletes every account, trade, review, playbook entry, certificate, expense, and payout permanently. Continue?')) return;
  state.accounts = []; state.trades = []; state.reviews = [];
  state.playbook = { rules: '', setups: [] }; state.certificates = [];
  state.expenses = []; state.payouts = []; state.manualFinance = { payoutTotal: null, expenseTotal: null }; state.dailyEntries = [];
  saveAccounts(); saveTrades(); saveReviews(); savePlaybook(); saveCertificates(); saveExpenses(); savePayouts(); saveManualFinance(); saveDaily();
  renderAccountSwitcher(); renderAll();
  showToast('All data cleared');
});

/* ---- CSV import with column mapping ---- */
document.getElementById('csvFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return;
    const parseLine = line => {
      const out = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    state.csvHeaders = parseLine(lines[0]);
    state.csvRows = lines.slice(1).map(parseLine);
    renderCsvMapping();
  };
  reader.readAsText(file);
});

function renderCsvMapping() {
  const fields = [
    { key: 'date', label: 'Date' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'direction', label: 'Direction (Long/Short)' },
    { key: 'pnl', label: 'Net P&L' },
    { key: 'contracts', label: 'Contracts (optional)' },
    { key: 'note', label: 'Notes (optional)' }
  ];
  const options = ['— skip —', ...state.csvHeaders];
  const guess = key => {
    const idx = state.csvHeaders.findIndex(h => h.toLowerCase().includes(key));
    return idx >= 0 ? idx + 1 : 0;
  };
  const guesses = { date: guess('date'), symbol: guess('symbol') || guess('instrument'), direction: guess('side') || guess('direction'), pnl: guess('pnl') || guess('profit') || guess('net'), contracts: guess('qty') || guess('contract') || guess('size'), note: guess('note') || guess('comment') };

  document.getElementById('csvMappingArea').innerHTML = `
    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${state.csvRows.length} rows found. Map your columns:</div>
    <table class="mapping-table">
      ${fields.map(f => `
        <tr>
          <td>${f.label}</td>
          <td><select id="map_${f.key}">
            ${options.map((o, i) => `<option value="${i - 1}" ${guesses[f.key] === i ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
          </select></td>
        </tr>`).join('')}
    </table>
    <div class="form-field" style="margin-top:10px;">
      <label>Import into account</label>
      <select id="csvTargetAccount">${state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}</select>
    </div>
    <button class="btn btn-primary" style="margin-top:12px;" id="confirmCsvImportBtn">Import ${state.csvRows.length} trades</button>
  `;
  document.getElementById('confirmCsvImportBtn').addEventListener('click', doCsvImport);
}

function doCsvImport() {
  if (!state.accounts.length) { alert('Add an account first.'); return; }
  const map = key => parseInt(document.getElementById('map_' + key).value, 10);
  const idx = { date: map('date'), symbol: map('symbol'), direction: map('direction'), pnl: map('pnl'), contracts: map('contracts'), note: map('note') };
  const accountId = document.getElementById('csvTargetAccount').value;
  let imported = 0;
  state.csvRows.forEach(row => {
    if (idx.date < 0 || idx.pnl < 0) return;
    const rawDate = row[idx.date];
    const pnl = parseFloat((row[idx.pnl] || '0').replace(/[$,]/g, ''));
    if (!rawDate || isNaN(pnl)) return;
    let dateStr = rawDate;
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) dateStr = parsed.toISOString().slice(0, 10);
    state.trades.push({
      id: uid(), accountId,
      date: dateStr,
      symbol: idx.symbol >= 0 ? (row[idx.symbol] || 'NQ').toUpperCase() : 'NQ',
      direction: idx.direction >= 0 ? (row[idx.direction] || '').toUpperCase().includes('S') ? 'SHORT' : 'LONG' : 'LONG',
      session: 'NY AM', model: 'Other',
      contracts: idx.contracts >= 0 ? parseFloat(row[idx.contracts]) || 1 : 1,
      pnl, rMultiple: null, holdMinutes: null,
      ruleFollowed: true, mistakeTags: [],
      note: idx.note >= 0 ? row[idx.note] : '',
      screenshot: null
    });
    imported++;
  });
  saveTrades();
  document.getElementById('csvMappingArea').innerHTML = `<div style="color:var(--green); font-size:13px;">Imported ${imported} trades.</div>`;
  renderAll();
  showToast(`Imported ${imported} trades`);
}

/* ---------------- Init ---------------- */
function renderAll() {
  renderDashboard();
  renderAccountsPage();
  renderJournal();
  renderReview();
  renderPlaybook();
  renderBreakdown();
  renderCertificates();
  renderExpenses();
  renderDaily();
  populatePayoutAccountSelect();
}

loadState();
initNav();
initMobileDrawer();
renderAccountSwitcher();
renderAll();
