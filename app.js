/* ============================================
   EDGE — Trading Journal
   App logic. All data in localStorage.
   ============================================ */

const STORAGE_KEYS = {
  accounts: 'edge_accounts_v1',
  trades: 'edge_trades_v1',
  reviews: 'edge_reviews_v1',
  seeded: 'edge_seeded_v1'
};

let state = {
  accounts: [],
  trades: [],
  reviews: [],
  currentAccountId: 'all',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  reviewWeekStart: startOfWeek(new Date()),
  editingTradeId: null,
  editingAccountId: null,
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
  } catch (e) {
    state.accounts = []; state.trades = []; state.reviews = [];
  }
  if (!localStorage.getItem(STORAGE_KEYS.seeded) && state.accounts.length === 0) {
    seedDemoData();
    localStorage.setItem(STORAGE_KEYS.seeded, '1');
  }
}
function saveAccounts() { localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts)); }
function saveTrades() { localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(state.trades)); }
function saveReviews() { localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(state.reviews)); }

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
    });
  });
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
function renderDashboard() {
  const trades = getTrades();
  const account = state.currentAccountId === 'all' ? null : getAccount(state.currentAccountId);
  const startingBalance = account ? account.startingBalance : state.accounts.reduce((s, a) => s + a.startingBalance, 0);
  const stats = computeStats(trades);

  document.getElementById('welcomeTitle').textContent = 'Welcome, Corey';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('welcomeMeta').textContent = `${today} — ${trades.length} trades on record${account ? ' · ' + account.name : ''}`;

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

function renderStreak(trades, stats) {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].ruleFollowed) streak++; else break;
  }
  document.getElementById('streakRow').innerHTML = `
    <div class="streak-item">
      <div class="streak-icon">⚑</div>
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
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">◈</div><div class="empty-state-title">No accounts yet</div><div class="empty-state-sub">Add your first funded or evaluation account to start tracking.</div></div>`;
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
        <div class="progress-label"><span>Profit target</span><span>${fmtMoneyShort(netPnl)} / ${fmtMoneyShort(a.target)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,targetPct)}%"></div></div>
      </div>` : ''}
      ${a.maxDrawdown ? `<div class="progress-row">
        <div class="progress-label"><span>Drawdown used</span><span>${fmtMoneyShort(maxDD)} / ${fmtMoneyShort(a.maxDrawdown)}</span></div>
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
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">☰</div><div class="empty-state-title">No trades match</div><div class="empty-state-sub">Log a trade or adjust your filters.</div></div>`;
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
          <span class="badge badge-model">${escapeHtml(t.model)}</span>
          ${!t.ruleFollowed ? `<span class="badge badge-rule-broken">Rule broken</span>` : ''}
          ${(t.mistakeTags || []).map(m => `<span class="badge badge-rule-broken">${escapeHtml(m)}</span>`).join('')}
        </div>
        <div class="trade-entry-note">${escapeHtml(t.note || 'No notes added.')}</div>
        ${t.screenshot ? `<div style="margin-top:8px;"><span class="view-chart-link" onclick="viewTradeDetail('${t.id}')">View chart →</span></div>` : ''}
      </div>
      <div class="trade-entry-actions">
        <button class="icon-btn" onclick="viewTradeDetail('${t.id}')" title="View">⤢</button>
        <button class="icon-btn" onclick="editTrade('${t.id}')" title="Edit">✎</button>
        <button class="icon-btn" onclick="deleteTrade('${t.id}')" title="Delete">🗑</button>
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

function openLogTradeModal() {
  if (!state.accounts.length) { alert('Add an account first — go to Accounts and create one.'); return; }
  state.editingTradeId = null;
  state.pendingScreenshot = null;
  state.selectedMistakeTags = [];
  state.ruleFollowed = true;
  document.getElementById('tradeModalTitle').textContent = 'Log trade';
  document.getElementById('tradeForm').reset();
  populateAccountSelect();
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
  document.getElementById('tradeModel').value = t.model;
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
  const data = {
    accountId: document.getElementById('tradeAccount').value,
    symbol: document.getElementById('tradeSymbol').value.trim().toUpperCase() || 'NQ',
    date: document.getElementById('tradeDate').value,
    direction: document.getElementById('tradeDirection').value,
    session: document.getElementById('tradeSession').value,
    model: document.getElementById('tradeModel').value,
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
  if (!sorted.length) { list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✎</div><div class="empty-state-title">No reviews yet</div><div class="empty-state-sub">Save your first weekly review above.</div></div>`; return; }
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
}

loadState();
initNav();
renderAccountSwitcher();
renderAll();
