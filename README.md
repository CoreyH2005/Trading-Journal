# EDGE — Trading Journal

A dark-theme trading journal for funded futures accounts. Multi-account ready, built around NQ/ICT-style trading (session, model/setup tags, R-multiples), with plan-adherence tracking and a weekly review workflow.

Live structure — everything below is fully built: **Dashboard · Accounts · Journal · Review · Playbook · Breakdown · Certificates · Expenses · Import/Backup**. Responsive down to mobile with a proper collapsible sidebar drawer.

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

## Playbook

A trading plan (freeform rules text, save on demand) plus a list of documented setups — name, session, model tag, entry criteria, and invalidation. Seeded with a starting NY AM iFVG continuation and Asia sweep reversal setup based on how you actually trade; edit or replace freely. The idea is every trade in the Journal should trace back to one of these, not memory.

## Breakdown

Real analytics computed live from your Journal data (needs 3+ trades to populate):
- Win rate, net P&L, and expectancy per session and per model tag
- Net P&L by day of week
- Rule-followed vs rule-broken performance — does discipline actually pay for you
- Best/worst trade and your most-used mistake tag

## Certificates

Simple document storage — upload XFA certs, payout confirmations, account docs (images or PDFs) as base64 in localStorage. Download or delete per document.

## Expenses

Log evaluation fees, resets, platform/data costs. Shows total, this month, and trading net P&L minus expenses so you can see true take-home.

## Daily loss limit alert

If an account has a daily loss limit set (edit the account to add one) and you're down on the current day, a warning strip appears at the top of the Dashboard showing how much of that limit you've used — turns red past 70%. Only shows when a single account is selected, not "All accounts".

## Setups are wired into the trade log

The Log Trade form's Setup dropdown pulls live from your Playbook — pick a documented setup and the session field auto-fills to match. Trades linked to a setup show that setup's actual name in the Journal (not just a generic model tag), and Breakdown gets a "By setup" table so you can see which named setups actually make money, not just which model family. A "Generic tag" fallback stays available for trades that don't match a documented setup yet.

## Cross-account correlated risk

Since you're running the same trade across 5 accounts, a single bad read isn't a 1x loss — it's a 5x loss. The Dashboard (when "All accounts" is selected) shows a "Today across accounts" card: combined P&L for today, a per-account breakdown, and a warning when the same trade (same symbol, direction, session, setup) shows up across multiple accounts on the same day, with the real multiplied hit size called out explicitly.

## Mobile

Below 900px the sidebar becomes a slide-out drawer (hamburger button top-left) instead of squeezing the layout. All grids collapse to single-column.
