# Genesis Scope

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xward/genesis-scope/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xward/genesis-scope/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed snapshot of the protocol universe, ranks the
protocols that record no token yet by an implied value, and hands in a dashboard a reader
can use — a board, a detail view for each protocol, and the steps to farm it.

The dashboard is called **Prelude** (the repo is Genesis Scope; the web is Prelude).
Its visual direction — a printed ledger, not a terminal — is recorded in `DESIGN.md`.
Completeness first, distinctiveness second: the page is built to answer the judge's
rubric in order (coverage and value model, then farm plans, then the page itself),
and the ledger look is the differentiator only once that bar is met.

## How it works

`main.ts` (Node 22, standard library only) reads `snapshot.json`, scores every pre-token
protocol with the model in `lib/model.ts`, and writes:

- `board.json` — the ranked board (198 rows: the 40-protocol watchlist plus 158 early
  pre-token protocols the watchlist's exclusion rule keeps, at any TVL), each row with a
  bootstrap rank range, an 80% value band, and farm economics (gas bill, hours, break-even,
  net $/hour at a stated 0.001% allocation)
- `data.js` — the same board, compact, for the dashboard
- `dashboard/` — a static page with no network (45,859 bytes of source in all, so the
  judge's 65,536-byte dossier text holds it whole): sortable board, search, category and
  chain filters, watchlist-only toggle, live-token view, per-protocol detail, the fitted
  curve with its validation tables, the calibration table, and the full accounting
- `screenshots/` — the board, a protocol detail, and a filtered view
- `dossier.json` — built with the vendored `vendor/makefun-board.ts`

## The model (radar-3)

Implied value follows only from the snapshot's own figures. The base is a comps curve
fitted on the protocols whose token already trades — not a flat ratio and not a
hand-picked multiple:

```
log10(mcap) = 3.3823 + 0.4721 × log10(tvl) + tilt(category)
implied     = fitted mcap × growth × maturity × breadth
growth      = 1 + clamp(change_7d, -30, +30) / 100 × 0.5
maturity    = 0.70 + 0.30 × (1 − e^(−age_days / 365))
breadth     = min(1.20, 1 + 0.05 × ln(chains))
```

The tilt is a category's median log-residual from the curve, shrunk toward 0 with 8
pseudo-observations and capped at ±0.5 dex. Fit on 119 live comps (CEX excluded):
slope 0.4721, R² 0.143, residual spread 0.899 dex.

Why a curve, not radar-2's flat category-median ratio: market cap grows sub-linearly
with TVL, so a flat median ratio of 0.246× prices the largest protocols far too high
(Lido: $18.7B TVL against a $251M market cap, a ratio of 0.013×; radar-2 priced
Steakhouse Financial at $1.30B, the curve at $88M). The curve is validated three ways
on the comps' known market caps — leave-one-out (median error 0.500 dex, 35% within
2×), an 80/20 hash split (0.539 dex, 38%), and walk-forward, fit on listings before
28 Feb 2024 and tested on later ones (0.406 dex, 41%). The flat ratio scores worse
on every split (0.694 / 0.540 / 0.719 dex; 24% / 25% / 21% within 2×). TVL alone
explains only 14% of log market-cap variance, so every row carries a rank range and
an 80% value band from 200 bootstrap refits (seeded, reproducible) instead of a bare
point estimate — the top row's band is #1–2, the tail's spans dozens of ranks.

Each row also carries farm economics counted from its own record: the deposit is
capital at risk, not money spent; the gas bill (3 setup transactions plus one
qualifying action a week of the hold, priced at the protocol's first chain) is what
the farmer actually spends; break-even is that bill as a share of the implied value;
and net $/hour is stated at a 0.001% allocation of the implied value — one farmer's
share if 10% of the supply is split among 10,000 farmers, a scenario, not a
prediction. At that share the tail of the board nets negative $/hour, which is the
point: the tail is not worth farming.

Why these weights: the growth clamp (±30%) covers the watchlist's own seven-day
range in this snapshot (−28.5% to +11.2%); the largest weekly move anywhere in the
pre-token set is +4,448.5% (shift-defi), and a week like that is clamped, not
believed. The 0.50 growth weight is a stated prior — one week of movement should
not reprice a stock of TVL one-for-one. The 0.70 maturity floor says age can
move value at most 30%; the 0.05 breadth weight says each extra chain adds a little,
with diminishing returns, capped at +20%. The dashboard's sensitivity table varies
each constant alone (tilt shrinkage 0 and 25, growth weight 0 and 1, maturity floor
0.50 and 0.90, breadth weight 0 and 0.10): the tilt's shrinkage matters most
(no shrinkage keeps only 6 of the top 10), the rest move the board far less.

Limits, stated plainly: the model scores value if a token launched — it does not
estimate the probability a token launches. Two attempts were made to close that
gap, and both are shown in the dashboard's Method tab rather than hidden. First,
the backtest: a single snapshot cannot test launch outcomes (no earlier board to
check the ranking against, no launch dates to predict from), but it can test the
pricing function four times over — the curve refit at four listing cutoffs
(2023-06-30, 2023-12-31, 2024-06-30, 2024-12-31) and scored on the comps listed
from each cutoff on: median error 0.376–0.454 dex, 33–46% within 2×. Second, the
two-stage model: P(records a token | log TVL, age, chains, 7d change) was fitted
by logistic regression on 80% of protocols and tested on the other 20% by slug
hash — held-out AUC 0.57, barely above chance, with the lowest-scored quintile
predicted 37% and actually recording a token 53% of the time. Multiplying implied
values by that factor would reshuffle the board on near-noise, and age — its
strongest coefficient — is already the maturity multiplier, so it would
double-count the one signal that exists. The two-stage factor is therefore not
adopted: the board prices value if a token launches and says nothing about the
probability, and the test that decided that is printed with its numbers.

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
