# EDGE — Trading Journal

A dark-theme trading journal for funded futures accounts. Multi-account ready, built around NQ/ICT-style trading (session, model/setup tags, R-multiples), with plan-adherence tracking and a weekly review workflow.

Live structure: **Dashboard · Accounts · Journal · Review** (fully built), plus **Playbook / Breakdown / Certificates / Expenses** stubbed in as placeholders for a future session, and **Import / Backup** for CSV import + JSON backup/restore.

## How it works

- **No backend.** All data (accounts, trades, reviews) is stored in the browser's `localStorage`, scoped to whichever device/browser you're using.
- **Chart.js is vendored locally** (`chart.umd.min.js`) — no external CDN dependency, so it works offline and won't break if a CDN goes down.
- On first load it seeds ~16 sample trades on a demo account so the dashboard isn't empty. Go to **Import / Backup → Clear all data** whenever you're ready to start logging real trades, or just delete the demo account from **Accounts** and add your own.

## Deploying to GitHub Pages

```bash
# from this folder
git init
git add .
git commit -m "Initial commit — EDGE trading journal"
git branch -M main
git remote add origin https://github.com/CoreyH2005/edge.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from branch → main / (root)**.
It'll be live at `https://coreyh2005.github.io/edge/` within a minute or two.

## Important: localStorage is per-browser

Because there's no backend, your data only lives in the browser you logged trades in — it won't sync between your phone and laptop, and clearing browser data wipes it. **Export a backup regularly** from Import / Backup → Export full backup (.json). Keep that file somewhere safe (or worth committing to a private repo) so you can restore if needed.

## Data model

- **Account**: name, prop firm, status (active/passed/failed), starting balance, profit target, max drawdown, daily loss limit.
- **Trade**: account, date, symbol, direction, session (Asia/London/NY AM/NY PM), model/setup tag, contracts, net P&L, R multiple, holding time, rule-followed flag, mistake tags, notes, optional chart screenshot.
- **Review**: week start date, what worked, what to cut, focus for next week — auto-computed stats (trades/net P&L/win rate/best day) pulled from that week's logged trades.

## Edge Score

A composite 0–100 score across six axes (win %, profit factor, avg win/loss ratio, recovery factor, consistency, drawdown-adjusted). It's a reasonable heuristic, not gospel — the weighting is even across all six axes right now. Worth revisiting once you've got a real sample size logged, since some of these (like "consistency," measured via coefficient of variation on trade P&L) are more meaningful with more data.

## CSV import

Import / Backup → Import CSV. It auto-detects likely column matches (date, symbol, direction, P&L) but always shows a mapping table so you confirm before importing — broker/prop-firm export formats vary too much to guess blind.

## What's stubbed for next session

Playbook, Breakdown, Certificates, and Expenses are placeholder pages with a description of what they'll do. Flag which one you want built next.
