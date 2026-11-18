# Genesis Scope

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xward/genesis-scope/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xward/genesis-scope/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed snapshot of the protocol universe, ranks the
protocols that record no token yet by an implied value, and hands in a dashboard a reader
can use — a board, a detail view for each protocol, and the steps to farm it.

The dashboard is called **Prelude** (the repo is Genesis Scope; the web is Prelude).
Its visual direction — a printed ledger, not a terminal — is recorded in `DESIGN.md`.

## How it works

`main.ts` (Node 22, standard library only) reads `snapshot.json`, scores every pre-token
protocol with the model in `lib/model.ts`, and writes:

- `board.json` — the ranked board (198 rows: the 40-protocol watchlist plus 158 early
  pre-token protocols the watchlist's exclusion rule keeps, at any TVL)
- `data.js` — the same board, compact, for the dashboard
- `dashboard/` — a static page with no network: sortable board, search, category and
  chain filters, watchlist-only toggle, live-token view, per-protocol detail, the
  calibration table, and a model sandbox
- `screenshots/` — the board, a protocol detail, and a filtered view
- `dossier.json` — built with the vendored `vendor/makefun-board.ts`

## The model (radar-2)

Implied value follows only from the snapshot's own figures:

```
implied = round(tvl_usd × multiple(category) × growth × maturity × breadth)
growth   = 1 + clamp(change_7d, -30, +30) / 100 × 0.5
maturity = 0.70 + 0.30 × (1 − e^(−age_days / 365))
breadth  = min(1.20, 1 + 0.05 × ln(chains))
```

The base multiple is calibrated, not chosen: for each category, the median
market-cap-to-TVL ratio of that category's live-token protocols in the same snapshot,
clamped at 3.0x, shrunk toward the global median with 12 pseudo-observations, and
capped at 0.50x. A category with no live comps uses the global median. No protocol
name is special-cased; the dashboard prints the calibration table so any reader can
check the multiples against the snapshot.

Why these weights: the growth clamp (±30%) covers the watchlist's own seven-day
range in this snapshot (−28.5% to +11.2%); the largest weekly move anywhere in the
pre-token set is +4,448.5% (shift-defi), and a week like that is clamped, not
believed. The 0.50 growth weight is a stated prior — one week of movement should
not reprice a stock of TVL one-for-one — and the dashboard's sandbox lets the reader
set it to 0 or 1 and watch the board move. The 0.70 maturity floor says age can
move value at most 30%; the 0.05 breadth weight says each extra chain adds a little,
with diminishing returns, capped at +20%. The 12 pseudo-observations keep a
one-comp category from setting a wild multiple; the calibration table shows the comp
count for every category, so the reader can weigh the thin ones.

The dashboard also prints a sensitivity table: each constant varied alone
(shrinkage 0 and 25, growth weight 0 and 1, maturity floor 0.50 and 0.90,
breadth weight 0 and 0.10), the board re-scored, top-10 overlap and rank
correlation against the published board. Limits, stated plainly: the model
scores value if a token launched — it does not estimate the probability a
token launches, so it conflates the two. No backtest is possible from a single
snapshot: there is no earlier board to check the ranking against.

The board ranks all 40 watchlist slugs — the gate requires full coverage — plus
every other pre-token protocol that passes the watchlist's exclusion rule, at any
TVL. In this snapshot all 40 watchlist slugs pass the rule as well. A protocol is
ranked when it records no token (no market cap, no CoinGecko id, no symbol) and is
not a wrapped, staked or bridged product of a token that already trades, a versioned
pool, or an exchange product. Live-token protocols are set aside with their market
caps shown.

Each row carries an 8-step farm plan derived from the protocol's own record
(category, chains, TVL, age): the core action, a second qualifying action, a
multi-chain or depth step, a weekly cadence, a hold period, claim safety, and a farm
log — each step with its cost and time.

"No token on record" means the snapshot records no token for the protocol — never
that it has none. Implied value is this entry's own claim from the snapshot's
figures; it is not a price, not a prediction that a token will launch, and not
advice.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Then open `out/dashboard/index.html` in a browser (it reads `out/data.js` beside it).

---

<sub>Entered on [make.fun](https://make.fun/?ref=k0y543zp&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
