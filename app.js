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
  expenses: 'edge_expenses_v1'
};

let state = {
  accounts: [],
  trades: [],
  reviews: [],
  playbook: { rules: '', setups: [] },
  certificates: [],
  expenses: [],
  currentAccountId: 'all',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  reviewWeekStart: startOfWeek(new Date()),
  editingTradeId: null,
  editingAccountId: null,
  editingSetupId: null,
  pendingScreenshot: null,
  selectedMistakeTags: [],
  ruleFollowed: true,
  csvRows: null,
  csvHeaders: null
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
  } catch (e) {
    state.accounts = []; state.trades = []; state.reviews = [];
    state.playbook = { rules: '', setups: [] }; state.certificates = []; state.expenses = [];
  }
  if (!localStorage.getItem(STORAGE_KEYS.seeded) && state.accounts.length === 0) {
    seedDemoData();
    localStorage.setItem(STORAGE_KEYS.seeded, '1');
  }
  if (!localStorage.getItem(STORAGE_KEYS.playbook)) {
    seedPlaybook();
  }
}
function saveAccounts() { localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts)); }
function saveTrades() { localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(state.trades)); }
function saveReviews() { localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(state.reviews)); }
function savePlaybook() { localStorage.setItem(STORAGE_KEYS.playbook, JSON.stringify(state.playbook)); }
function saveCertificates() { localStorage.setItem(STORAGE_KEYS.certificates, JSON.stringify(state.certificates)); }
function saveExpenses() { localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses)); }

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
function getAccount(id) { return state.accounts.find(a => a.id === id); }

function computeStats(trades) {
  const total = trades.length;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = total ? (wins.length / total) * 100 : 0;
  const profitFactor = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0);
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const avgHold = total ? trades.reduce((s, t) => s + (t.holdMinutes || 0), 0) / total : 0;
  const ruleFollowedCount = trades.filter(t => t.ruleFollowed).length;
  const adherence = total ? (ruleFollowedCount / total) * 100 : 0;
  return { total, wins: wins.length, losses: losses.length, netPnl, grossWin, grossLoss, winRate, profitFactor, avgWin, avgLoss, avgHold, adherence };
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
  const trades = getTrades();
  const account = state.currentAccountId === 'all' ? null : getAccount(state.currentAccountId);
  const startingBalance = account ? account.startingBalance : state.accounts.reduce((s, a) => s + a.startingBalance, 0);
  const stats = computeStats(trades);

  document.getElementById('welcomeTitle').textContent = 'Welcome, Corey';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('welcomeMeta').textContent = `${today} — ${trades.length} trades on record${account ? ' · ' + account.name : ''}`;

  renderDailyLimitAlert(trades, account);
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
    { label: 'Win %', value: stats.winRate.toFixed(1) + '%', cls: stats.winRate >= 50 ? 'positive' : 'negative' },
    { label: 'Profit factor', value: stats.profitFactor.toFixed(2), cls: stats.profitFactor >= 1.5 ? 'positive' : (stats.profitFactor < 1 ? 'negative' : '') },
    { label: 'Avg win / loss', value: stats.avgLoss ? (stats.avgWin / stats.avgLoss).toFixed(2) : '—', cls: '' },
    { label: 'Avg holding trade', value: stats.avgHold ? Math.round(stats.avgHold) + ' min' : '—', cls: '' }
  ];
  document.getElementById('statGrid').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.cls}">${c.value}</div>
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
  document.getElementById('balanceCardSub').textContent = account ? `${account.name} · starting ${fmtMoneyShort(startingBalance)}` : `All accounts · combined starting ${fmtMoneyShort(startingBalance)}`;
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
  const trades = getTrades();
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
    const equitySeries = computeEquitySeries(trades.sort((x, y) => x.date.localeCompare(y.date)), a.startingBalance);
    const dd = computeDrawdownSeries(equitySeries);
    const maxDD = Math.abs(Math.min(...dd.map(d => d.drawdown), 0));
    const targetPct = a.target ? Math.min(100, Math.max(0, (netPnl / a.target) * 100)) : 0;
    const ddPct = a.maxDrawdown ? Math.min(100, (maxDD / a.maxDrawdown) * 100) : 0;
    return `
    <div class="account-card">
      <div class="account-card-top">
        <div>
          <div class="account-name">${escapeHtml(a.name)}</div>
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
        <div class="progress-label"><span>Drawdown used</span><span>${fmtMoney(maxDD)} / ${fmtMoney(a.maxDrawdown)}</span></div>
        <div class="progress-track"><div class="progress-fill drawdown" style="width:${ddPct}%"></div></div>
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
  openModal('accountModalOverlay');
}
function deleteAccount(id) {
  if (!confirm('Delete this account? Trades logged under it will remain but become unassigned.')) return;
  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccounts();
  renderAccountSwitcher(); renderAccountsPage(); renderDashboard();
}

document.getElementById('addAccountBtn').addEventListener('click', () => {
  state.editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Add account';
  document.getElementById('accountForm').reset();
  document.getElementById('accountFirm').value = 'Topstep';
  document.getElementById('accountStarting').value = 150000;
  openModal('accountModalOverlay');
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
    dailyLimit: parseFloat(document.getElementById('accountDailyLimit').value) || 0
  };
  if (state.editingAccountId) {
    const acc = getAccount(state.editingAccountId);
    Object.assign(acc, data);
  } else {
    data.id = uid();
    state.accounts.push(data);
  }
  saveAccounts();
  closeModal('accountModalOverlay');
  renderAccountSwitcher(); renderAccountsPage(); renderDashboard();
});

/* ---------------- Journal page ---------------- */
function renderJournal() {
  const outcomeF = document.getElementById('filterOutcome').value;
  const sessionF = document.getElementById('filterSession').value;
  const modelF = document.getElementById('filterModel').value;
  const searchF = document.getElementById('filterSearch').value.toLowerCase();

  let trades = getTrades().slice().reverse();
  if (outcomeF === 'win') trades = trades.filter(t => t.pnl > 0);
  if (outcomeF === 'loss') trades = trades.filter(t => t.pnl < 0);
  if (outcomeF === 'be') trades = trades.filter(t => t.pnl === 0);
  if (sessionF) trades = trades.filter(t => t.session === sessionF);
  if (modelF) trades = trades.filter(t => t.model === modelF);
  if (searchF) trades = trades.filter(t => (t.note || '').toLowerCase().includes(searchF));

  const list = document.getElementById('journalList');
  if (!trades.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div><div class="empty-state-title">No trades match</div><div class="empty-state-sub">Log a trade or adjust your filters.</div></div>`;
    return;
  }

  list.innerHTML = trades.map(t => {
    const outcomeCls = t.pnl > 0 ? 'win' : (t.pnl < 0 ? 'loss' : 'be');
    return `
    <div class="trade-entry ${outcomeCls}">
      <div class="trade-entry-pnl-col">
        <div class="trade-entry-pnl ${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtMoney(t.pnl, { forceSign: true })}</div>
        <div class="trade-entry-date">${fmtDateShort(t.date)}</div>
        ${t.rMultiple ? `<div class="trade-entry-date">${t.rMultiple}R</div>` : ''}
      </div>
      <div>
        <div class="trade-entry-badges">
          <span class="badge">${escapeHtml(t.symbol)}</span>
          <span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span>
          <span class="badge badge-session">${escapeHtml(t.session)}</span>
          <span class="badge badge-model">${escapeHtml(t.setupName || t.model)}</span>
          ${!t.ruleFollowed ? `<span class="badge badge-rule-broken">Rule broken</span>` : ''}
          ${(t.mistakeTags || []).map(m => `<span class="badge badge-rule-broken">${escapeHtml(m)}</span>`).join('')}
        </div>
        <div class="trade-entry-note">${escapeHtml(t.note || 'No notes added.')}</div>
        ${t.screenshot ? `<div style="margin-top:8px;"><span class="view-chart-link" onclick="viewTradeDetail('${t.id}')">View chart →</span></div>` : ''}
      </div>
      <div class="trade-entry-actions">
        <button class="icon-btn" onclick="viewTradeDetail('${t.id}')" title="View">${ICONS.view}</button>
        <button class="icon-btn" onclick="editTrade('${t.id}')" title="Edit">${ICONS.edit}</button>
        <button class="icon-btn" onclick="deleteTrade('${t.id}')" title="Delete">${ICONS.trash}</button>
      </div>
    </div>`;
  }).join('');
}

['filterOutcome', 'filterSession', 'filterModel', 'filterSearch'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderJournal);
});

function viewTradeDetail(id) {
  const t = state.trades.find(x => x.id === id);
  if (!t) return;
  state.editingTradeId = id;
  const acc = getAccount(t.accountId);
  document.getElementById('detailModalBody').innerHTML = `
    ${t.screenshot ? `<img class="detail-img" src="${t.screenshot}">` : ''}
    <div class="detail-grid">
      <div class="detail-stat"><div class="detail-stat-label">Net P&L</div><div class="detail-stat-value" style="color:${t.pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(t.pnl, { forceSign: true })}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">R Multiple</div><div class="detail-stat-value">${t.rMultiple || '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Hold time</div><div class="detail-stat-value">${t.holdMinutes ? t.holdMinutes + ' min' : '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Account</div><div class="detail-stat-value" style="font-size:12px;">${acc ? escapeHtml(acc.name) : '—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Session</div><div class="detail-stat-value" style="font-size:12px;">${escapeHtml(t.session)}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Model</div><div class="detail-stat-value" style="font-size:12px;">${escapeHtml(t.model)}</div></div>
    </div>
    <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(t.note || 'No notes added.')}</div>
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

function openLogTradeModal() {
  if (!state.accounts.length) { alert('Add an account first — go to Accounts and create one.'); return; }
  state.editingTradeId = null;
  state.pendingScreenshot = null;
  state.selectedMistakeTags = [];
  state.ruleFollowed = true;
  document.getElementById('tradeModalTitle').textContent = 'Log trade';
  document.getElementById('tradeForm').reset();
  populateAccountSelect();
  populateSetupSelect();
  document.getElementById('tradeDate').value = todayISO();
  document.getElementById('tradeSymbol').value = 'NQ';
  document.getElementById('tradeContracts').value = 1;
  document.getElementById('ruleToggle').classList.add('on');
  document.querySelectorAll('#mistakeChips .chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('tradeFileDropText').textContent = 'Click to upload a chart screenshot';
  const existingImg = document.querySelector('#tradeFileDrop img');
  if (existingImg) existingImg.remove();
  openModal('tradeModalOverlay');
}

function editTrade(id) {
  const t = state.trades.find(x => x.id === id);
  if (!t) return;
  state.editingTradeId = id;
  state.pendingScreenshot = t.screenshot || null;
  state.selectedMistakeTags = (t.mistakeTags || []).slice();
  state.ruleFollowed = t.ruleFollowed;

  document.getElementById('tradeModalTitle').textContent = 'Edit trade';
  populateAccountSelect();
  document.getElementById('tradeAccount').value = t.accountId;
  document.getElementById('tradeSymbol').value = t.symbol;
  document.getElementById('tradeDate').value = t.date;
  document.getElementById('tradeDirection').value = t.direction;
  document.getElementById('tradeSession').value = t.session;
  populateSetupSelect();
  document.getElementById('tradeModel').value = t.setupId ? `setup:${t.setupId}` : `tag:${t.model}`;
  document.getElementById('tradeContracts').value = t.contracts;
  document.getElementById('tradePnl').value = t.pnl;
  document.getElementById('tradeR').value = t.rMultiple || '';
  document.getElementById('tradeHold').value = t.holdMinutes || '';
  document.getElementById('tradeNote').value = t.note || '';
  document.getElementById('ruleToggle').classList.toggle('on', t.ruleFollowed);
  document.querySelectorAll('#mistakeChips .chip').forEach(c => c.classList.toggle('selected', state.selectedMistakeTags.includes(c.dataset.tag)));

  const dropText = document.getElementById('tradeFileDropText');
  const existingImg = document.querySelector('#tradeFileDrop img');
  if (existingImg) existingImg.remove();
  if (t.screenshot) {
    dropText.textContent = 'Screenshot attached — click to replace';
    const img = document.createElement('img');
    img.src = t.screenshot;
    document.getElementById('tradeFileDrop').appendChild(img);
  } else {
    dropText.textContent = 'Click to upload a chart screenshot';
  }
  openModal('tradeModalOverlay');
}

document.getElementById('logTradeBtn').addEventListener('click', openLogTradeModal);
document.getElementById('dashLogTradeBtn').addEventListener('click', openLogTradeModal);
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

document.getElementById('tradeFileDrop').addEventListener('click', () => document.getElementById('tradeScreenshot').click());
document.getElementById('tradeScreenshot').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.pendingScreenshot = ev.target.result;
    document.getElementById('tradeFileDropText').textContent = 'Screenshot attached — click to replace';
    const existingImg = document.querySelector('#tradeFileDrop img');
    if (existingImg) existingImg.remove();
    const img = document.createElement('img');
    img.src = state.pendingScreenshot;
    document.getElementById('tradeFileDrop').appendChild(img);
  };
  reader.readAsDataURL(file);
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
    direction: document.getElementById('tradeDirection').value,
    session: document.getElementById('tradeSession').value,
    model: modelTag,
    setupId: setupId,
    setupName: setupName,
    contracts: parseFloat(document.getElementById('tradeContracts').value) || 0,
    pnl: parseFloat(document.getElementById('tradePnl').value) || 0,
    rMultiple: document.getElementById('tradeR').value ? parseFloat(document.getElementById('tradeR').value) : null,
    holdMinutes: document.getElementById('tradeHold').value ? parseFloat(document.getElementById('tradeHold').value) : null,
    ruleFollowed: state.ruleFollowed,
    mistakeTags: state.selectedMistakeTags.slice(),
    note: document.getElementById('tradeNote').value.trim(),
    screenshot: state.pendingScreenshot
  };
  if (state.editingTradeId) {
    const t = state.trades.find(x => x.id === state.editingTradeId);
    Object.assign(t, data);
  } else {
    data.id = uid();
    state.trades.push(data);
  }
  saveTrades();
  closeModal('tradeModalOverlay');
  renderDashboard(); renderJournal();
  showToast('Trade saved');
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
  const trades = getTrades();
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
  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  const monthStr = todayISO().slice(0, 7);
  const monthTotal = state.expenses.filter(e => e.date.startsWith(monthStr)).reduce((s, e) => s + e.amount, 0);
  const tradingNet = state.trades.reduce((s, t) => s + t.pnl, 0);
  const totalEl = document.getElementById('expTotalAll');
  totalEl.textContent = fmtMoney(total);
  totalEl.className = 'stat-value' + (total > 0 ? ' negative' : '');
  const monthEl = document.getElementById('expTotalMonth');
  monthEl.textContent = fmtMoney(monthTotal);
  monthEl.className = 'stat-value' + (monthTotal > 0 ? ' negative' : '');
  const netVal = tradingNet - total;
  const netEl = document.getElementById('expNetOfTrading');
  netEl.textContent = fmtMoney(netVal, { forceSign: true });
  netEl.className = 'stat-value ' + (netVal >= 0 ? 'positive' : 'negative');

  const body = document.getElementById('expensesTableBody');
  const sorted = state.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) { body.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted); text-align:center; padding:20px;">No expenses logged</td></tr>`; return; }
  body.innerHTML = sorted.map(e => `
    <tr>
      <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${fmtDateShort(e.date)}</td>
      <td><span class="badge">${escapeHtml(e.category)}</span></td>
      <td style="font-size:12.5px; color:var(--text-secondary);">${escapeHtml(e.note || '—')}</td>
      <td class="pnl-neg">${fmtMoney(e.amount)}</td>
      <td><button class="icon-btn" onclick="deleteExpense('${e.id}')" title="Delete">${ICONS.trash}</button></td>
    </tr>`).join('');
}

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

/* ---------------- Review page ---------------- */
function renderReview() {
  const start = state.reviewWeekStart;
  const end = addDays(start, 6);
  document.getElementById('reviewWeekLabel').textContent = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const startStr = isoOf(start), endStr = isoOf(end);
  const weekTrades = getTrades().filter(t => t.date >= startStr && t.date <= endStr);
  const stats = computeStats(weekTrades);
  const byDay = {};
  weekTrades.forEach(t => byDay[t.date] = (byDay[t.date] || 0) + t.pnl);
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('reviewSummary').innerHTML = `
    <div class="stat-card"><div class="stat-label">Trades</div><div class="stat-value">${stats.total}</div></div>
    <div class="stat-card"><div class="stat-label">Net P&L</div><div class="stat-value ${stats.netPnl >= 0 ? 'positive' : 'negative'}">${fmtMoney(stats.netPnl, { forceSign: true })}</div></div>
    <div class="stat-card"><div class="stat-label">Win rate</div><div class="stat-value">${stats.winRate.toFixed(0)}%</div></div>
    <div class="stat-card"><div class="stat-label">Best day</div><div class="stat-value" style="font-size:16px;">${bestDay ? fmtDateShort(bestDay[0]) + ' · ' + fmtMoney(bestDay[1], { forceSign: true }) : '—'}</div></div>
  `;

  const key = startStr;
  const existing = state.reviews.find(r => r.weekStart === key);
  document.getElementById('reviewWorked').value = existing ? existing.worked : '';
  document.getElementById('reviewCut').value = existing ? existing.cut : '';
  document.getElementById('reviewFocus').value = existing ? existing.focus : '';

  renderPastReviews();
}

function renderPastReviews() {
  const sorted = state.reviews.slice().sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const list = document.getElementById('pastReviewsList');
  if (!sorted.length) { list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.editLarge}</div><div class="empty-state-title">No reviews yet</div><div class="empty-state-sub">Save your first weekly review above.</div></div>`; return; }
  list.innerHTML = sorted.map(r => {
    const start = new Date(r.weekStart + 'T00:00:00');
    const end = addDays(start, 6);
    return `
    <div class="past-review-card">
      <div class="past-review-header">
        <div class="past-review-week">${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
        <div class="past-review-stats">${r.netPnl !== undefined ? fmtMoney(r.netPnl, { forceSign: true }) + ' · ' + r.winRate.toFixed(0) + '% WR · ' + r.trades + ' trades' : ''}</div>
      </div>
      ${r.worked ? `<div class="past-review-block"><div class="past-review-block-label">What worked</div><div class="past-review-block-text">${escapeHtml(r.worked)}</div></div>` : ''}
      ${r.cut ? `<div class="past-review-block"><div class="past-review-block-label">What to cut</div><div class="past-review-block-text">${escapeHtml(r.cut)}</div></div>` : ''}
      ${r.focus ? `<div class="past-review-block"><div class="past-review-block-label">Focus next week</div><div class="past-review-block-text">${escapeHtml(r.focus)}</div></div>` : ''}
    </div>`;
  }).join('');
}

document.getElementById('reviewPrevWeekBtn').addEventListener('click', () => { state.reviewWeekStart = addDays(state.reviewWeekStart, -7); renderReview(); });
document.getElementById('reviewNextWeekBtn').addEventListener('click', () => { state.reviewWeekStart = addDays(state.reviewWeekStart, 7); renderReview(); });

document.getElementById('saveReviewBtn').addEventListener('click', () => {
  const startStr = isoOf(state.reviewWeekStart);
  const endStr = isoOf(addDays(state.reviewWeekStart, 6));
  const weekTrades = getTrades().filter(t => t.date >= startStr && t.date <= endStr);
  const stats = computeStats(weekTrades);
  const existing = state.reviews.find(r => r.weekStart === startStr);
  const data = {
    weekStart: startStr,
    worked: document.getElementById('reviewWorked').value.trim(),
    cut: document.getElementById('reviewCut').value.trim(),
    focus: document.getElementById('reviewFocus').value.trim(),
    netPnl: stats.netPnl, winRate: stats.winRate, trades: stats.total
  };
  if (existing) Object.assign(existing, data);
  else { data.id = uid(); state.reviews.push(data); }
  saveReviews();
  renderPastReviews();
  showToast('Review saved');
});

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
  const data = { accounts: state.accounts, trades: state.trades, reviews: state.reviews, exportedAt: new Date().toISOString() };
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
      saveAccounts(); saveTrades(); saveReviews();
      renderAccountSwitcher(); renderAll();
      showToast('Backup restored');
    } catch (err) { alert('Could not read that file — is it a valid EDGE backup JSON?'); }
  };
  reader.readAsText(file);
});

document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('This deletes every account, trade and review permanently. Continue?')) return;
  state.accounts = []; state.trades = []; state.reviews = [];
  saveAccounts(); saveTrades(); saveReviews();
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
}

loadState();
initNav();
initMobileDrawer();
renderAccountSwitcher();
renderAll();
