// Genesis Scope's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// radar-2 priced a protocol as TVL x a flat category median ratio. That overstates the
// largest protocols by an order of magnitude: among the live-token comps, market cap
// grows sub-linearly with TVL (log-log slope 0.47), and the biggest comps (Lido $18.7B
// TVL / $251M mcap, ratio 0.013) sit far below the 0.246 median ratio. radar-3 fits the
// comps curve instead and proves it on the comps whose market caps are known:
//
//   log10(mcap) = a + b * log10(tvl) + tilt(category)     (OLS on 119 live comps, CEX out)
//   implied     = fitted mcap x growth x maturity x breadth   (value IF a token launches)
//   expected    = P(launch) x implied                          (the board's ranking value)
//
// The tilt is a category's median log-residual, shrunk toward 0 with 8 pseudo-observations
// and capped at +/-0.5 dex, so a thin category cannot set a wild price. The curve is
// validated three ways on the known market caps (leave-one-out, an 80/20 hash split, and
// a walk-forward fit on older listings tested on newer ones), and every row carries a
// rank range and an 80% value band from 200 bootstrap refits of the curve. The bands are
// wide on purpose: TVL explains only ~14% of log market-cap variance, so a point estimate
// without a band would be a pretence of precision. No protocol name is ever special-cased.
//
// Two limits the model was built to close: (1) the backtest — a single snapshot cannot
// test launch outcomes, but it can test the pricing function at four listing cutoffs
// (rolling walk-forward, in the dashboard's Method tab), and (2) the two-stage model —
// the board now ranks by EXPECTED value: P(records a token | log TVL, age, chains, 7d
// change, age x log TVL, category) x the conditional value if a token launches. The
// propensity is a logistic regression on the snapshot's own figures: without categories
// it barely separates (held-out AUC 0.57), with category one-hots it does (held-out AUC
// 0.71, monotone calibration), so the category is the signal and the board carries it.
// Every row shows its P, its conditional value and its expected value, and the Method
// tab prints the test that decided the adoption — the numeric-only contrast included,
// so the reader can see the category is doing the work, not the intercept.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling)
// and every other pre-token protocol the watchlist's own rule would keep. A protocol is
// pre-token when its record carries no token (no market cap, no CoinGecko id, no symbol);
// the snapshot's live-token protocols are kept apart and shown as the market's own
// values, never mixed into the ranked board.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  shrink_k: number; // radar-2 legacy: kept so the sensitivity table stays comparable, unused by radar-3
  winsor_cap: number; // median ratios are winsorized at this cap (display only in radar-3)
  multiple_floor: number;
  multiple_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_tau_days: number;
  breadth_weight: number;
  breadth_cap: number;
  unknown_age_days: number;
  tilt_shrink_k: number; // pseudo-observations shrinking a category's tilt toward 0
  tilt_cap_dex: number; // a category tilt moves value by at most this many dex
  bootstrap_refits: number;
  bootstrap_seed: number;
  oos_train_frac: number; // hash-split share used to fit the out-of-sample curve
  two_stage: boolean; // rank by expected value (P x conditional) rather than conditional alone
  propensity_lambda: number; // L2 strength of the logistic propensity fit
  propensity_iters: number; // gradient-descent iterations of the propensity fit
  propensity_lr: number; // gradient-descent step size of the propensity fit (0.5: stable at 600 iters)
  propensity_min_category: number; // a category needs this many protocols to get its own one-hot
}

export const MODEL: ModelConstants = {
  shrink_k: 12,
  winsor_cap: 3,
  multiple_floor: 0.04,
  multiple_cap: 0.5,
  growth_weight: 0.5,
  growth_floor: -30,
  growth_cap: 30,
  maturity_floor: 0.7,
  maturity_tau_days: 365,
  breadth_weight: 0.05,
  breadth_cap: 1.2,
  unknown_age_days: 365,
  tilt_shrink_k: 8,
  tilt_cap_dex: 0.5,
  bootstrap_refits: 200,
  bootstrap_seed: 20261114,
  oos_train_frac: 0.8,
  two_stage: true,
  propensity_lambda: 1,
  propensity_iters: 600,
  propensity_lr: 0.5,
  propensity_min_category: 10,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One row of the calibration table the dashboard prints. */
export interface CalibrationRow {
  category: string;
  comps: number;
  median_ratio: number; // median winsorized mcap/TVL of the category's live comps
  tilt_dex: number; // the category's shrunk median log-residual from the fitted curve
  multiple_at_100m: number; // fitted mcap/TVL at $100M TVL, so the curve reads as a multiple
  total_tvl: number;
}

/** The fitted comps curve and its calibration table. */
export interface Calibration {
  comps: number;
  intercept: number; // a in log10(mcap) = a + b * log10(tvl) + tilt
  slope: number; // b: 0.47 here, i.e. market cap grows sub-linearly with TVL
  r_squared: number;
  resid_sd_dex: number;
  global_median: number; // median winsorized mcap/TVL across all live comps
  rows: CalibrationRow[];
  tilt_by_category: Record<string, number>;
}

/** One validation split: the curve tested on market caps it did not fit. */
export interface ValidationRow {
  split: string;
  train: number;
  test: number;
  median_abs_log_err: number; // dex; 0.30 dex is about a 2x error
  within_2x: number; // share of test comps predicted within a factor of 2
  median_signed_log_err: number; // dex; + means the curve over-predicts
}

/** One rolling walk-forward cutoff: the backtest a single snapshot allows. */
export interface RollingRow {
  cutoff: string; // fit on listings before this date, test on listings from it on
  train: number;
  test: number;
  median_abs_log_err: number;
  within_2x: number;
}

/** The launch-propensity model: P(records a token | observables), fitted and adopted.
 *  The coefficients and category weights are from the scoring fit on all rows; the AUCs
 *  and quintiles are from the same specification fit on 80% of rows and scored on the
 *  other 20% by slug hash, so the test numbers are honest. numeric_only_test_auc is the
 *  same test with the category one-hots removed: the contrast that shows the category
 *  is the signal. P is a proxy for launch propensity, stated as one: the label is
 *  "records a token", not "will launch", and the Method tab says so. */
export interface Propensity {
  n: number; // protocols scored (all with a TVL)
  has_token: number; // of them, how many record a token
  numeric_only_test_auc: number; // held-out AUC without categories: 0.57, barely above chance
  train_auc: number; // held-in AUC (optimistic: the fit saw these rows)
  test_auc: number; // held-out AUC: 0.50 is chance, 1.00 is perfect separation
  quintiles: Array<{ predicted: number; actual: number; n: number }>; // test rows, five bands by score
  coefficients: { intercept: number; log_tvl: number; age_years: number; chains: number; change_7d: number; age_x_log_tvl: number };
  big_categories: string[]; // categories with >= propensity_min_category protocols
  category_weights: Record<string, number>; // one-hot weights from the scoring fit
}

/** The fitted propensity model, as used to score every board row. */
export interface PropensityFit {
  big_categories: string[];
  weights: number[]; // [intercept, log_tvl, age_years, chains, change_7d, age_x_log_tvl, ...category weights]
  mu: number[]; // standardisation means, per feature column
  sd: number[]; // standardisation spreads, per feature column
}

/** One row of the sensitivity table: one constant varied alone, the board re-scored. */
export interface SensitivityRow {
  variant: string;
  top10_kept: number;
  spearman: number;
}

/** The farm economics of one row: what farming it costs, in dollars and hours. */
export interface FarmEcon {
  capital_usd: number; // deposit deployed (returned on exit; it is at risk, not spent)
  hold_days: number; // how long the position must be held (by protocol age: 90/60/30 days)
  weeks: number; // qualifying-action weeks in the hold (ceil(hold_days / 7))
  gas_mid_usd: number; // one transaction's gas at the protocol's first chain, midpoint
  tx_count: number; // setup transactions plus one qualifying action a week of the hold
  gas_total_usd: number; // the farm's whole gas bill: the only money actually spent
  hours: number; // whole farm's hands-on time, in hours
  breakeven_usd: number; // allocation a farmer must receive to cover the gas bill
  breakeven_pct_implied: number; // that allocation as a share of the implied value, in per cent
  per_hour_at_001pct: number; // net $/hour at a 0.001% allocation of implied value (see farmEconomicsForValue)
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  rank_lo: number; // 5th percentile rank over 200 bootstrap refits
  rank_hi: number; // 95th percentile rank over 200 bootstrap refits
  value_lo_usd: number; // 10th percentile implied value over 200 bootstrap refits
  value_hi_usd: number; // 90th percentile implied value over 200 bootstrap refits
  farm_cost_usd: number; // whole farm's gas bill (see FarmEcon)
  farm_hours: number;
  farm_breakeven_pct: number; // gas bill as a share of implied value, in per cent
  farm_per_hour_usd: number; // net $/hour at a 0.001% allocation of implied value
  farm_capital_usd: number; // deposit deployed (see FarmEcon)
  farm_hold_days: number; // hold length in days (see FarmEcon)
  farm_weeks: number; // qualifying-action weeks in the hold (see FarmEcon)
  farm_tx_count: number; // transactions over the whole farm (see FarmEcon)
  farm_gas_mid_usd: number; // gas per transaction, midpoint (see FarmEcon)
  model: {
    fitted_base_usd: number; // the curve's fitted market cap before growth/maturity/breadth
    tilt_dex: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
    conditional_value_usd: number; // value IF a token launches: fitted x growth x maturity x breadth
    launch_propensity: number; // P(records a token | observables), 0..1
  };
  farm_steps: string[];
  farm_step_parts: FarmStep[]; // the same steps, structured (text/cost/time) for the page to render
}

/** The dashboard's compact view of one row, carrying the model's farm plan with it. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  rank_lo: number;
  rank_hi: number;
  value_lo_usd: number;
  value_hi_usd: number;
  farm_cost_usd: number;
  farm_hours: number;
  farm_breakeven_pct: number;
  farm_per_hour_usd: number;
  farm_capital_usd: number;
  farm_hold_days: number;
  farm_weeks: number;
  farm_tx_count: number;
  farm_gas_mid_usd: number;
  farm_steps: string[];
  farm_step_parts: FarmStep[];
  fitted_base_usd: number;
  tilt_dex: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  conditional_value_usd: number;
  launch_propensity: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl_ratio: number | null;
}

/** The snapshot's accounting, every protocol placed in exactly one bucket. */
export interface Accounting {
  total: number;
  live_with_mcap: number;
  token_recorded_no_mcap: number;
  no_token_record: number;
  excluded_category: number;
  excluded_category_breakdown: Array<{ category: string; count: number }>;
  excluded_versioned: number;
  excluded_wrapped_word: number;
  excluded_exchange_prefix: number;
  rankable: number;
  watchlist: number;
  early: number;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  watchlist: string[];
  board_size: number;
  early_size: number;
  live_size: number;
  watchlist_growth_min: number | null;
  watchlist_growth_max: number | null;
  max_change_7d: number | null;
  calibration: CalibrationRow[];
  curve: { comps: number; intercept: number; slope: number; r_squared: number; resid_sd_dex: number; global_median: number };
  validation: ValidationRow[];
  flat_validation: ValidationRow[]; // radar-2's flat category-median ratio, scored on the same splits
  walk_forward_rolling: RollingRow[]; // the backtest: the curve refit at four listing cutoffs
  propensity: Propensity; // the two-stage model: P(launch | observables), fitted, tested, adopted
  sensitivity: SensitivityRow[];
  accounting: Accounting;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const LOG2 = Math.log10(2);

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted array, or `fallback` when it is empty. */
function medianOf(sorted: number[], fallback: number): number {
  if (sorted.length === 0) return fallback;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round3 = (n: number): number => Math.round(n * 1e3) / 1e3;

/** A quantile of a sorted array by nearest rank (deterministic, no interpolation). */
function quantileOf(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx]!;
}

/** FNV-1a hash of a string, as a fraction in [0, 1): the deterministic out-of-sample split. */
function hashFrac(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

/** A seeded PRNG (mulberry32): the bootstrap refits are byte-for-byte reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The live-token comps the curve is fitted on: a market cap, a TVL, and no CEX. */
export function liveComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
}

/** Ordinary least squares on log10(TVL) -> log10(mcap). */
function ols(comps: SnapshotProtocol[]): { intercept: number; slope: number } {
  const n = comps.length;
  let mx = 0;
  let my = 0;
  for (const p of comps) {
    mx += Math.log10(p.tvl_usd);
    my += Math.log10(p.mcap_usd!);
  }
  mx /= n;
  my /= n;
  let num = 0;
  let den = 0;
  for (const p of comps) {
    const dx = Math.log10(p.tvl_usd) - mx;
    num += dx * (Math.log10(p.mcap_usd!) - my);
    den += dx * dx;
  }
  const slope = den > 0 ? num / den : 0;
  return { intercept: my - slope * mx, slope };
}

/** A category's shrunk median log-residual from the curve, capped at +/- tilt_cap_dex. */
function tiltFor(category: string | null, comps: SnapshotProtocol[], fit: { intercept: number; slope: number }, model: ModelConstants): number {
  const key = category ?? 'Other';
  const residuals: number[] = [];
  for (const p of comps) {
    if ((p.category ?? 'Other') !== key) continue;
    residuals.push(Math.log10(p.mcap_usd!) - (fit.intercept + fit.slope * Math.log10(p.tvl_usd)));
  }
  if (residuals.length === 0) return 0;
  residuals.sort((a, b) => a - b);
  const med = medianOf(residuals, 0);
  const shrunk = (residuals.length * med) / (residuals.length + model.tilt_shrink_k);
  return Math.max(-model.tilt_cap_dex, Math.min(model.tilt_cap_dex, shrunk));
}

/**
 * The calibration, computed from the snapshot's own live-token protocols: the log-log
 * comps curve, its R-squared and residual spread, and one shrunk tilt per category.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const comps = liveComps(snapshot);
  const fit = ols(comps);
  const allRatios = comps.map((p) => Math.min(p.mcap_usd! / p.tvl_usd, model.winsor_cap)).sort((a, b) => a - b);
  const global = medianOf(allRatios, 0.2);
  // R-squared and residual spread of the curve (tilt excluded: it is a category correction).
  let ssRes = 0;
  let ssTot = 0;
  let meanY = 0;
  for (const p of comps) meanY += Math.log10(p.mcap_usd!);
  meanY /= Math.max(1, comps.length);
  for (const p of comps) {
    const r = Math.log10(p.mcap_usd!) - (fit.intercept + fit.slope * Math.log10(p.tvl_usd));
    ssRes += r * r;
    ssTot += (Math.log10(p.mcap_usd!) - meanY) ** 2;
  }
  const totals = new Map<string, number>();
  for (const p of snapshot.protocols) {
    const cat = p.category ?? 'Other';
    totals.set(cat, (totals.get(cat) ?? 0) + p.tvl_usd);
  }
  const byCat = new Map<string, SnapshotProtocol[]>();
  for (const p of comps) {
    const cat = p.category ?? 'Other';
    const list = byCat.get(cat) ?? [];
    list.push(p);
    byCat.set(cat, list);
  }
  const rows: CalibrationRow[] = [];
  const tilt_by_category: Record<string, number> = {};
  for (const [cat, list] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const ratios = list.map((p) => Math.min(p.mcap_usd! / p.tvl_usd, model.winsor_cap)).sort((a, b) => a - b);
    const tilt = tiltFor(cat, comps, fit, model);
    tilt_by_category[cat] = tilt;
    rows.push({
      category: cat,
      comps: list.length,
      median_ratio: round4(medianOf(ratios, global)),
      tilt_dex: round4(tilt),
      multiple_at_100m: round4(Math.pow(10, fit.intercept + fit.slope * 8 + tilt) / 1e8),
      total_tvl: totals.get(cat) ?? 0,
    });
  }
  return {
    comps: comps.length,
    intercept: round4(fit.intercept),
    slope: round4(fit.slope),
    r_squared: round3(ssTot > 0 ? 1 - ssRes / ssTot : 0),
    resid_sd_dex: round3(Math.sqrt(ssRes / Math.max(1, comps.length - 2))),
    global_median: round4(global),
    rows,
    tilt_by_category,
  };
}

/** The curve's fitted market cap for a protocol, before growth/maturity/breadth. */
export function fittedBase(protocol: SnapshotProtocol, calibration: Calibration): { fitted: number; tilt: number } {
  const tilt = calibration.tilt_by_category[protocol.category ?? 'Other'] ?? 0;
  const fitted = Math.pow(10, calibration.intercept + calibration.slope * Math.log10(Math.max(1, protocol.tvl_usd)) + tilt);
  return { fitted, tilt };
}

/** The multipliers and the CONDITIONAL implied value one protocol gets under `model` and
 *  `calibration`: the value if a token launches. The board's ranking value is the expected
 *  value, P x conditional — see scoreAll. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calibration: Calibration,
  model: ModelConstants = MODEL,
): { implied: number; fitted: number; tilt: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { fitted, tilt } = fittedBase(protocol, calibration);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (1 - model.maturity_floor) * (1 - Math.exp(-Math.max(ageForModel, 0) / model.maturity_tau_days));
  const breadthMult = Math.min(model.breadth_cap, 1 + model.breadth_weight * Math.log(Math.max(1, protocol.chains.length)));
  const implied = Math.max(1, Math.round(fitted * growthMult * maturityMult * breadthMult));
  return { implied, fitted, tilt, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** The watchlist's own exclusion list, applied to the early radar too: no wrapped, staked or
 *  bridged product of a token that already trades, and no exchange product. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or bridged
 * product of a token that already trades, not a versioned pool, not an exchange product. This is
 * the watchlist's rule with the TVL floor removed, so the early radar is judged by the same bar.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((e) => p.name.startsWith(e))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The propensity model's features, in the order the fit's weights expect them: the four
 *  observables, their interaction, then one one-hot per big category. */
function propensityFeatures(p: SnapshotProtocol, asOf: string, bigCategories: string[]): number[] {
  const lt = Math.log10(Math.max(1, p.tvl_usd));
  const age = (ageDays(asOf, p.listed_at) ?? 0) / 365;
  const cat = p.category ?? 'Other';
  const feats = [lt, age, p.chains.length, finite(p.change_7d, 0) / 100, age * lt];
  for (const bc of bigCategories) feats.push(cat === bc ? 1 : 0);
  return feats;
}

/** Score every chosen protocol under one calibration, strongest first. The ranking value
 *  is the EXPECTED value: the conditional value if a token launches, times the protocol's
 *  launch propensity (1 when the model runs without the second stage). A propensity near
 *  zero still leaves a $1 floor, so the gate's "implied value must be a positive whole
 *  dollar" holds and the row ranks last instead of vanishing. */
function scoreAll(
  chosen: SnapshotProtocol[],
  asOf: string,
  calibration: Calibration,
  model: ModelConstants,
  propensity: PropensityFit | null,
): Array<{ p: SnapshotProtocol; implied: number; conditional: number; propensity: number }> {
  const scored = chosen.map((p) => {
    const v = impliedValue(p, asOf, calibration, model);
    const pr = model.two_stage && propensity !== null ? propensityScore(p, asOf, propensity) : 1;
    return { p, implied: Math.max(1, Math.round(v.implied * pr)), conditional: v.implied, propensity: pr };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored;
}

/** The protocols the board ranks: the watchlist first, then every other rankable pre-token one. */
export function chosenProtocols(snapshot: Snapshot): SnapshotProtocol[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  return [...chosen.values()];
}

/** The protocols the board ranks, strongest first, with ranks 1..n (no bootstrap bands yet). */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const calibration = calibrate(snapshot, model);
  const prop = model.two_stage ? fitPropensity(snapshot, model).scoring : null;
  return buildBoardWithCalibration(snapshot, calibration, model, null, prop);
}

/** Build the board under a given calibration; `bands` adds the bootstrap rank/value ranges. */
export function buildBoardWithCalibration(
  snapshot: Snapshot,
  calibration: Calibration,
  model: ModelConstants = MODEL,
  bands: Map<string, { rank_lo: number; rank_hi: number; value_lo: number; value_hi: number }> | null = null,
  propensity: PropensityFit | null = null,
): BoardRow[] {
  const chosen = chosenProtocols(snapshot);
  const scored = scoreAll(chosen, snapshot.as_of, calibration, model, propensity);
  return scored.map((s, i) => {
    const v = impliedValue(s.p, snapshot.as_of, calibration, model);
    const econ = farmEconomicsForValue(farmEconomics(s.p, v.age), s.implied);
    const steps = farmSteps(s.p, v.age);
    const band = bands?.get(s.p.slug);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: v.age,
      implied_value_usd: s.implied,
      rank_lo: band?.rank_lo ?? i + 1,
      rank_hi: band?.rank_hi ?? i + 1,
      value_lo_usd: band?.value_lo ?? s.implied,
      value_hi_usd: band?.value_hi ?? s.implied,
      farm_cost_usd: econ.gas_total_usd,
      farm_hours: econ.hours,
      farm_breakeven_pct: econ.breakeven_pct_implied,
      farm_per_hour_usd: econ.per_hour_at_001pct,
      farm_capital_usd: econ.capital_usd,
      farm_hold_days: econ.hold_days,
      farm_weeks: econ.weeks,
      farm_tx_count: econ.tx_count,
      farm_gas_mid_usd: econ.gas_mid_usd,
      model: {
        fitted_base_usd: Math.round(v.fitted),
        tilt_dex: round4(v.tilt),
        growth_pct: v.growthPct,
        growth_multiplier: round4(v.growthMult),
        maturity_multiplier: round4(v.maturityMult),
        breadth_multiplier: round4(v.breadthMult),
        age_days: v.age,
        conditional_value_usd: s.conditional,
        launch_propensity: round4(s.propensity),
      },
      farm_steps: steps.map(stepText),
      farm_step_parts: steps,
    };
  });
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
export function holdDaysFor(age: number | null): number {
  if (age === null) return 60;
  if (age < 180) return 90;
  if (age < 365) return 60;
  return 30;
}

/** One transaction's gas, midpoint of the range the farm steps quote, in dollars. */
export function gasMidFor(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 14;
  if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'tron') return 0.25;
  if (c === 'bitcoin' || c === 'bittensor') return 3.5;
  return 1.25;
}

/** What one transaction costs on a chain: Ethereum is dear, rollups are cheap, Solana cheapest. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $8 to $20 of gas';
  if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'tron') return 'under $0.50 of gas';
  if (c === 'bitcoin' || c === 'bittensor') return 'about $2 to $5 of gas';
  return 'about $0.50 to $2 of gas';
}

/**
 * The farm's economics, from the protocol's own record alone. The deposit is capital at
 * risk, not money spent: it comes back on exit. What the farmer actually spends is gas
 * (3 setup transactions plus one qualifying action a week of the hold), and what they
 * spend in time is the setup plus 10 minutes a week plus the claim check and the log.
 * Break-even is the gas bill as a share of the implied value; $/hour is net of the gas
 * bill at a stated 0.001% allocation of the implied value — a scenario, not a prediction.
 * 0.001% is the anchor the dashboard states: one farmer's share if 10% of the supply is
 * split among 10,000 farmers. At that share the tail of the board nets negative $/hour,
 * which is the point: the tail is not worth farming.
 */
export function farmEconomics(p: SnapshotProtocol, age: number | null): FarmEcon {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gasMid = gasMidFor(chainOf(p));
  const weeks = Math.ceil(hold / 7);
  const txCount = 3 + weeks;
  const gasTotal = Math.round(txCount * gasMid * 100) / 100;
  const minutes = 50 + weeks * 10 + 10 + 5;
  const hours = Math.round((minutes / 60) * 100) / 100;
  return {
    capital_usd: capital,
    hold_days: hold,
    weeks,
    gas_mid_usd: gasMid,
    tx_count: txCount,
    gas_total_usd: gasTotal,
    hours,
    breakeven_usd: gasTotal,
    breakeven_pct_implied: 0, // filled by farmEconomicsForValue once the implied value is known
    per_hour_at_001pct: 0,
  };
}

/** Fill the value-dependent half of the farm economics once the implied value is known. */
export function farmEconomicsForValue(econ: FarmEcon, impliedValueUsd: number): FarmEcon {
  const alloc = 0.00001 * impliedValueUsd; // 0.001% of implied value: the stated scenario share
  const net = alloc - econ.gas_total_usd;
  return {
    ...econ,
    breakeven_pct_implied: impliedValueUsd > 0 ? Math.round((econ.gas_total_usd / impliedValueUsd) * 100 * 1e8) / 1e8 : 0,
    per_hour_at_001pct: econ.hours > 0 ? Math.round((net / econ.hours) * 100) / 100 : 0,
  };
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('payment')) return `Pay $${capital} through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('governance')) return `Deposit $${capital} into ${name}'s governance vault on ${chain} and vote once.`;
  if (c.includes('farm')) return `Deposit $${capital} of USDC into ${name}'s farm on ${chain} and keep the position open.`;
  if (c.includes('anchor btc') || c.includes('decentralized btc')) return `Mint $${capital} of the BTC-pegged asset through ${name} on ${chain} and hold it.`;
  if (c.includes('cedefi')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c === 'chain') return `Bridge $${capital} of USDC to ${chain} and use it in ${name}'s app.`;
  return `Put $${capital} of USDC to work in ${name} on ${chain} and keep the position open.`;
}

/** The category's second qualifying action: a different feature of the same protocol. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const small = Math.max(10, Math.round(capital / 5));
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${small} against the deposit on ${name}, then repay it the same week.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return `Swap $${small} through ${name} on ${chain} so the wallet shows trading activity as well as liquidity.`;
  if (c.includes('bridge')) return `Bridge a second, smaller amount back through ${name} so the wallet shows two-way use.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Close the hedge on ${name} and open a fresh one half its size, so the wallet shows repeat use.`;
  if (c.includes('prediction')) return `Settle the first market position on ${name} and open a second one on a different market.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) return `Move $${small} into a second ${name} vault on ${chain} to show more than one allocation.`;
  if (c.includes('governance')) return `Vote on a second ${name} proposal and leave a short comment in its forum.`;
  if (c.includes('rwa')) return `Mint $${small} of a second yield asset on ${name} on ${chain} so the wallet holds more than one position.`;
  if (c.includes('staking') || c.includes('restak')) return `Delegate $${small} to a second validator or operator through ${name} on ${chain}.`;
  if (c.includes('stable')) return `Convert $${small} between the stable asset and its wrapped form through ${name} on ${chain}.`;
  if (c.includes('cedefi')) return `Move $${small} into a second ${name} vault on ${chain} to show more than one allocation.`;
  if (c.includes('farm')) return `Harvest the farm rewards on ${name} and compound them back into the position.`;
  if (c.includes('anchor btc') || c.includes('decentralized btc')) return `Redeem $${small} of the BTC-pegged asset through ${name} and mint it again, so the wallet shows two-way use.`;
  if (c.includes('insurance')) return `Buy $${small} of cover for a second asset from ${name} on ${chain}.`;
  if (c.includes('payment')) return `Pay a second, smaller amount through ${name} on ${chain} so the wallet shows repeat use.`;
  if (c.includes('crypto card')) return `Load $${small} onto the ${name} card and make one small purchase with it.`;
  return `Add $${small} to the position on ${name} so the wallet shows repeat use, not a single deposit.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names. Gas is priced by the protocol's first chain; capital and hold come from its TVL and age.
 * The economics in the dashboard (gas bill, hours, break-even, $/hour) count the same steps.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  const secondChain = p.chains.length > 1 ? p.chains[1]! : null;
  const depthStep: FarmStep =
    secondChain !== null
      ? {
          text: `Repeat the core position on ${secondChain} as well, with about half the capital, so the activity spans two chains.`,
          cost: `about $${Math.round(capital / 2)} of capital and ${gas}`,
          time: '20 minutes to set up',
        }
      : {
          text: `After two weeks, add $${Math.max(10, Math.round(capital / 4))} to the position on ${p.name} so the wallet shows growing use, not a single deposit.`,
          cost: `about $${Math.max(10, Math.round(capital / 4))} of capital and ${gas}`,
          time: '10 minutes',
        };
  return [
    { text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`, cost: gas, time: '5 minutes' },
    { text: actionFor(p, capital, chain), cost: `$${capital} of capital and ${gas}`, time: '15 minutes to set up' },
    { text: secondActionFor(p, capital, chain), cost: `about $${Math.max(10, Math.round(capital / 5))} of capital and ${gas}`, time: '10 minutes' },
    depthStep,
    { text: `Make one qualifying action each week on ${p.name}, such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.`, cost: `${gas} a week`, time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes; never pay a fee to claim and never follow a claim link from a chat or an ad.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view and calibration. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl_ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's compact form for data.js, carrying the model's farm plan with it. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    rank_lo: row.rank_lo,
    rank_hi: row.rank_hi,
    value_lo_usd: row.value_lo_usd,
    value_hi_usd: row.value_hi_usd,
    farm_cost_usd: row.farm_cost_usd,
    farm_hours: row.farm_hours,
    farm_breakeven_pct: row.farm_breakeven_pct,
    farm_per_hour_usd: row.farm_per_hour_usd,
    farm_capital_usd: row.farm_capital_usd,
    farm_hold_days: row.farm_hold_days,
    farm_weeks: row.farm_weeks,
    farm_tx_count: row.farm_tx_count,
    farm_gas_mid_usd: row.farm_gas_mid_usd,
    farm_steps: row.farm_steps,
    farm_step_parts: row.farm_step_parts,
    fitted_base_usd: row.model.fitted_base_usd,
    tilt_dex: row.model.tilt_dex,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    conditional_value_usd: row.model.conditional_value_usd,
    launch_propensity: row.model.launch_propensity,
  };
}

/** Fit a curve on `train` comps and score its log errors on `test` comps. */
function curveErrors(train: SnapshotProtocol[], test: SnapshotProtocol[], model: ModelConstants): number[] {
  const fit = ols(train);
  return test.map((p) => {
    const tilt = tiltFor(p.category, train, fit, model);
    return Math.log10(p.mcap_usd!) - (fit.intercept + fit.slope * Math.log10(p.tvl_usd) + tilt);
  });
}

/** Summarise log errors as one validation row. */
function summarise(split: string, train: number, test: number, errs: number[]): ValidationRow {
  const abs = errs.map((e) => Math.abs(e)).sort((a, b) => a - b);
  const signed = [...errs].sort((a, b) => a - b);
  return {
    split,
    train,
    test,
    median_abs_log_err: round3(medianOf(abs, 0)),
    within_2x: errs.length > 0 ? round3(errs.filter((e) => Math.abs(e) <= LOG2).length / errs.length) : 0,
    median_signed_log_err: round3(medianOf(signed, 0)),
  };
}

/**
 * The curve, validated on market caps it did not fit. Leave-one-out refits the curve 119
 * times; the hash split fits on 80% (by slug hash, so the split is fixed) and tests on the
 * other 20%; walk-forward fits on the older half of the dated comps and tests on the newer
 * half, so it is the closest thing to a backtest a single snapshot allows. For comparison
 * the same table's method, run on radar-2's flat category-median ratio, gives LOO 0.694 dex
 * / 24% within 2x, OOS 0.540 / 25%, walk-forward 0.719 / 21% — worse on every split.
 */
export function validateCurve(snapshot: Snapshot, model: ModelConstants = MODEL): ValidationRow[] {
  const comps = liveComps(snapshot);
  const rows: ValidationRow[] = [];
  // Leave-one-out.
  const looErrs: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const train = comps.slice(0, i).concat(comps.slice(i + 1));
    looErrs.push(...curveErrors(train, [comps[i]!], model));
  }
  rows.push(summarise('Leave-one-out', comps.length - 1, comps.length, looErrs));
  // 80/20 hash split.
  const train = comps.filter((p) => hashFrac(p.slug) < model.oos_train_frac);
  const test = comps.filter((p) => hashFrac(p.slug) >= model.oos_train_frac);
  rows.push(summarise('Out-of-sample (80/20 hash split)', train.length, test.length, curveErrors(train, test, model)));
  // Walk-forward by listing date.
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const cut = dated[Math.floor(dated.length / 2)]!.listed_at!;
  const older = dated.filter((p) => p.listed_at! < cut);
  const newer = dated.filter((p) => p.listed_at! >= cut);
  rows.push(summarise(`Walk-forward (fit < ${cut}, test >= ${cut})`, older.length, newer.length, curveErrors(older, newer, model)));
  return rows;
}

/**
 * radar-2's flat category-median ratio, scored on the same three splits, so the dashboard's
 * "why the curve" comparison is computed, not asserted: median ratio per category, shrunk
 * toward the global median with 12 pseudo-observations, capped at 0.50x.
 */
export function validateFlat(snapshot: Snapshot, model: ModelConstants = MODEL): ValidationRow[] {
  const comps = liveComps(snapshot);
  const predict = (train: SnapshotProtocol[], p: SnapshotProtocol): number => {
    const ratios = train.map((q) => Math.min(q.mcap_usd! / q.tvl_usd, model.winsor_cap)).sort((a, b) => a - b);
    const global = medianOf(ratios, 0.2);
    const cat = train.filter((q) => (q.category ?? 'Other') === (p.category ?? 'Other'));
    const catRatios = cat.map((q) => Math.min(q.mcap_usd! / q.tvl_usd, model.winsor_cap)).sort((a, b) => a - b);
    const mult = cat.length > 0
      ? Math.min(model.multiple_cap, Math.max(model.multiple_floor, (cat.length * medianOf(catRatios, global) + model.shrink_k * global) / (cat.length + model.shrink_k)))
      : Math.min(model.multiple_cap, Math.max(model.multiple_floor, global));
    return p.tvl_usd * mult;
  };
  const errs = (train: SnapshotProtocol[], test: SnapshotProtocol[]): number[] =>
    test.map((p) => Math.log10(p.mcap_usd!) - Math.log10(predict(train, p)));
  const rows: ValidationRow[] = [];
  const loo: number[] = [];
  for (let i = 0; i < comps.length; i++) loo.push(...errs(comps.slice(0, i).concat(comps.slice(i + 1)), [comps[i]!]));
  rows.push(summarise('Leave-one-out', comps.length - 1, comps.length, loo));
  const train = comps.filter((p) => hashFrac(p.slug) < model.oos_train_frac);
  const test = comps.filter((p) => hashFrac(p.slug) >= model.oos_train_frac);
  rows.push(summarise('Out-of-sample (80/20 hash split)', train.length, test.length, errs(train, test)));
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const cut = dated[Math.floor(dated.length / 2)]!.listed_at!;
  rows.push(summarise(`Walk-forward (fit < ${cut}, test >= ${cut})`, dated.filter((p) => p.listed_at! < cut).length, dated.filter((p) => p.listed_at! >= cut).length, errs(dated.filter((p) => p.listed_at! < cut), dated.filter((p) => p.listed_at! >= cut))));
  return rows;
}

/**
 * Rolling walk-forward: the curve refit at four listing cutoffs and tested on the comps
 * listed from each cutoff on. A single snapshot cannot test whether a token launches, but
 * this is the backtest it does allow — the pricing function, refit on the past, scored on
 * the future — and it is stable across all four cutoffs, which is the point of the table.
 */
export function validateRolling(snapshot: Snapshot, model: ModelConstants = MODEL): RollingRow[] {
  const comps = liveComps(snapshot).filter((p) => p.listed_at !== null);
  const out: RollingRow[] = [];
  for (const cut of ['2023-06-30', '2023-12-31', '2024-06-30', '2024-12-31']) {
    const train = comps.filter((p) => p.listed_at! < cut);
    const test = comps.filter((p) => p.listed_at! >= cut);
    if (train.length < 15 || test.length < 5) continue;
    const errs = curveErrors(train, test, model);
    const abs = errs.map((e) => Math.abs(e)).sort((a, b) => a - b);
    out.push({
      cutoff: cut,
      train: train.length,
      test: test.length,
      median_abs_log_err: round3(medianOf(abs, 0)),
      within_2x: errs.length > 0 ? round3(errs.filter((e) => Math.abs(e) <= LOG2).length / errs.length) : 0,
    });
  }
  return out;
}

/** The logistic sigmoid, clamped so the fit never overflows: beyond |z| = 30 the
 *  sigmoid is 0 or 1 to double precision, so the clamp changes nothing it returns. */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
}

/** The area under the ROC curve: 0.50 is chance, 1.00 is perfect separation. */
function auc(scores: number[], labels: number[]): number {
  const pos = scores.filter((_, i) => labels[i] === 1);
  const neg = scores.filter((_, i) => labels[i] === 0);
  if (pos.length === 0 || neg.length === 0) return 0.5;
  let wins = 0;
  for (const s of pos) {
    for (const t of neg) wins += s > t ? 1 : s === t ? 0.5 : 0;
  }
  return Math.round((wins / (pos.length * neg.length)) * 1000) / 1000;
}

/** L2-regularised logistic regression by gradient descent, standardised on the fit rows. */
function fitLogistic(X: number[][], y: number[], idx: number[], lam: number, iters: number, lr: number): { weights: number[]; mu: number[]; sd: number[] } {
  const d = X[0]!.length;
  const mu = new Array(d).fill(0) as number[];
  const sd = new Array(d).fill(1) as number[];
  for (let j = 0; j < d; j++) {
    mu[j] = idx.reduce((s, i) => s + X[i]![j]!, 0) / idx.length;
    sd[j] = Math.sqrt(idx.reduce((s, i) => s + (X[i]![j]! - mu[j]!) ** 2, 0) / idx.length) || 1;
  }
  const w = new Array(d + 1).fill(0) as number[];
  for (let iter = 0; iter < iters; iter++) {
    const g = new Array(d + 1).fill(0) as number[];
    for (const i of idx) {
      let z = w[0]!;
      for (let j = 0; j < d; j++) z += w[j + 1]! * ((X[i]![j]! - mu[j]!) / sd[j]!);
      const err = sigmoid(z) - y[i]!;
      g[0] += err;
      for (let j = 0; j < d; j++) g[j + 1] += err * ((X[i]![j]! - mu[j]!) / sd[j]!);
    }
    for (let j = 0; j <= d; j++) {
      const reg = j > 0 ? (lam * w[j]!) / idx.length : 0;
      w[j] -= lr * (g[j]! / idx.length + reg);
    }
  }
  return { weights: w, mu, sd };
}

/** One logistic score from a fit. */
function logisticScore(fit: { weights: number[]; mu: number[]; sd: number[] }, x: number[]): number {
  let z = fit.weights[0]!;
  for (let j = 0; j < x.length; j++) z += fit.weights[j + 1]! * ((x[j]! - fit.mu[j]!) / fit.sd[j]!);
  return sigmoid(z);
}

/** A protocol's launch propensity from the fitted two-stage model. */
export function propensityScore(p: SnapshotProtocol, asOf: string, fit: PropensityFit): number {
  return logisticScore(fit, propensityFeatures(p, asOf, fit.big_categories));
}

/**
 * The two-stage model, fitted and adopted in the open. The label is "records a token"
 * (gecko_id or symbol present) among protocols with a TVL — a proxy for launch propensity,
 * stated as one. The specification is log TVL, age, chains, 7d change, age x log TVL,
 * plus one one-hot per category with >= propensity_min_category protocols. Without the
 * categories the held-out AUC is 0.57 (the v1 finding: the observables alone barely
 * separate); with them it is 0.71 with a monotone calibration, so the category is the
 * signal and the board ranks by expected value. Two fits are run: one on 80% of rows
 * (by slug hash) for the honest test numbers, and one on all rows for scoring — the
 * coefficients and category weights printed are the scoring fit's, the AUCs and quintiles
 * the split fit's, and the Method tab says which is which.
 */
export function fitPropensity(snapshot: Snapshot, model: ModelConstants = MODEL): { metrics: Propensity; scoring: PropensityFit } {
  const rows = snapshot.protocols.filter((p) => p.tvl_usd > 0);
  const labels = rows.map((p) => (p.gecko_id !== null || p.symbol !== null ? 1 : 0));
  const counts = new Map<string, number>();
  for (const p of rows) {
    const cat = p.category ?? 'Other';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const bigCats = [...counts.entries()]
    .filter(([, n]) => n >= model.propensity_min_category)
    .map(([c]) => c)
    .sort();
  const X = rows.map((p) => propensityFeatures(p, snapshot.as_of, bigCats));
  const trainIdx = rows.map((_, i) => i).filter((i) => hashFrac(rows[i]!.slug) < 0.8);
  const testIdx = rows.map((_, i) => i).filter((i) => hashFrac(rows[i]!.slug) >= 0.8);
  const allIdx = rows.map((_, i) => i);
  // The contrast: the same test without the category one-hots (first four features only).
  const Xn = X.map((x) => x.slice(0, 4));
  const fitN = fitLogistic(Xn, labels, trainIdx, model.propensity_lambda, model.propensity_iters, model.propensity_lr);
  const numericOnly = auc(
    testIdx.map((i) => logisticScore(fitN, Xn[i]!)),
    testIdx.map((i) => labels[i]!),
  );
  const fit = fitLogistic(X, labels, trainIdx, model.propensity_lambda, model.propensity_iters, model.propensity_lr);
  const trainScores = trainIdx.map((i) => logisticScore(fit, X[i]!));
  const testScores = testIdx.map((i) => logisticScore(fit, X[i]!));
  const order = testIdx.map((_, k) => k).sort((a, b) => testScores[a]! - testScores[b]!);
  const quintiles: Array<{ predicted: number; actual: number; n: number }> = [];
  for (let q = 0; q < 5; q++) {
    const chunk = order.slice(Math.floor((q * order.length) / 5), Math.floor(((q + 1) * order.length) / 5));
    quintiles.push({
      predicted: Math.round((chunk.reduce((s, k) => s + testScores[k]!, 0) / Math.max(1, chunk.length)) * 100) / 100,
      actual: Math.round((chunk.reduce((s, k) => s + labels[testIdx[k]!]!, 0) / Math.max(1, chunk.length)) * 100) / 100,
      n: chunk.length,
    });
  }
  const scoring = fitLogistic(X, labels, allIdx, model.propensity_lambda, model.propensity_iters, model.propensity_lr);
  const catWeights: Record<string, number> = {};
  bigCats.forEach((c, k) => {
    catWeights[c] = round3(scoring.weights[6 + k]!);
  });
  return {
    metrics: {
      n: rows.length,
      has_token: labels.reduce((s, v) => s + v, 0),
      numeric_only_test_auc: numericOnly,
      train_auc: auc(trainScores, trainIdx.map((i) => labels[i]!)),
      test_auc: auc(testScores, testIdx.map((i) => labels[i]!)),
      quintiles,
      coefficients: {
        intercept: round3(scoring.weights[0]!),
        log_tvl: round3(scoring.weights[1]!),
        age_years: round3(scoring.weights[2]!),
        chains: round3(scoring.weights[3]!),
        change_7d: round3(scoring.weights[4]!),
        age_x_log_tvl: round3(scoring.weights[5]!),
      },
      big_categories: bigCats,
      category_weights: catWeights,
    },
    scoring: { big_categories: bigCats, weights: scoring.weights, mu: scoring.mu, sd: scoring.sd },
  };
}

/**
 * Bootstrap bands: refit the curve 200 times on resampled comps (seeded, so the run is
 * reproducible), re-score the whole board each time, and take each row's 5th/95th rank and
 * 10th/90th implied value. A row whose band is wide is a row the data cannot pin down.
 */
export function bootstrapBands(snapshot: Snapshot, model: ModelConstants = MODEL, propensity: PropensityFit | null = null): Map<string, { rank_lo: number; rank_hi: number; value_lo: number; value_hi: number }> {
  const comps = liveComps(snapshot);
  const chosen = chosenProtocols(snapshot);
  const rng = mulberry32(model.bootstrap_seed);
  const ranks = new Map<string, number[]>();
  const values = new Map<string, number[]>();
  for (let r = 0; r < model.bootstrap_refits; r++) {
    const resampled: SnapshotProtocol[] = [];
    for (let i = 0; i < comps.length; i++) resampled.push(comps[Math.floor(rng() * comps.length)]!);
    const fit = ols(resampled);
    const tiltByCat = new Map<string, number>();
    const cats = new Set(resampled.map((p) => p.category ?? 'Other'));
    for (const cat of cats) tiltByCat.set(cat, tiltFor(cat, resampled, fit, model));
    const cal: Calibration = {
      comps: resampled.length,
      intercept: fit.intercept,
      slope: fit.slope,
      r_squared: 0,
      resid_sd_dex: 0,
      global_median: 0,
      rows: [],
      tilt_by_category: Object.fromEntries(tiltByCat),
    };
    const scored = scoreAll(chosen, snapshot.as_of, cal, model, propensity);
    scored.forEach((s, i) => {
      const rl = ranks.get(s.p.slug) ?? [];
      rl.push(i + 1);
      ranks.set(s.p.slug, rl);
      const vl = values.get(s.p.slug) ?? [];
      vl.push(s.implied);
      values.set(s.p.slug, vl);
    });
  }
  const bands = new Map<string, { rank_lo: number; rank_hi: number; value_lo: number; value_hi: number }>();
  for (const slug of ranks.keys()) {
    const r = ranks.get(slug)!.sort((a, b) => a - b);
    const v = values.get(slug)!.sort((a, b) => a - b);
    bands.set(slug, {
      rank_lo: quantileOf(r, 0.05),
      rank_hi: quantileOf(r, 0.95),
      value_lo: quantileOf(v, 0.1),
      value_hi: quantileOf(v, 0.9),
    });
  }
  return bands;
}

/**
 * Sensitivity: each constant varied alone, the board re-scored, top-10 overlap and rank
 * correlation against the published board. The constants are stated priors, not fitted values;
 * this table is the evidence for how much each one matters.
 */
export function sensitivityAnalysis(snapshot: Snapshot, published: BoardRow[]): SensitivityRow[] {
  const variants: Array<[string, ModelConstants]> = [
    ['No tilt shrinkage (k = 0)', { ...MODEL, tilt_shrink_k: 0 }],
    ['Strong tilt shrinkage (k = 25)', { ...MODEL, tilt_shrink_k: 25 }],
    ['Growth ignored (weight 0)', { ...MODEL, growth_weight: 0 }],
    ['Growth at full weight (1)', { ...MODEL, growth_weight: 1 }],
    ['Maturity floor 0.50', { ...MODEL, maturity_floor: 0.5 }],
    ['Maturity floor 0.90', { ...MODEL, maturity_floor: 0.9 }],
    ['Breadth ignored (weight 0)', { ...MODEL, breadth_weight: 0 }],
    ['Breadth doubled (0.10)', { ...MODEL, breadth_weight: 0.1 }],
    ['No two-stage (rank by value if a token launches)', { ...MODEL, two_stage: false }],
  ];
  const pubTop10 = new Set(published.slice(0, 10).map((r) => r.slug));
  const n = published.length;
  const mean = (n + 1) / 2;
  return variants.map(([label, model]) => {
    const board = buildBoard(snapshot, model);
    const varRank = new Map(board.map((r) => [r.slug, r.rank]));
    const top10Kept = board.slice(0, 10).filter((r) => pubTop10.has(r.slug)).length;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (const r of published) {
      const a = r.rank - mean;
      const b = (varRank.get(r.slug) ?? n) - mean;
      num += a * b;
      denA += a * a;
      denB += b * b;
    }
    const spearman = denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 1;
    return { variant: label, top10_kept: top10Kept, spearman: Math.round(spearman * 1000) / 1000 };
  });
}

/** The snapshot's accounting: every protocol in exactly one bucket, in exclusion order. */
export function accounting(snapshot: Snapshot): Accounting {
  const live = snapshot.protocols.filter((p) => p.mcap_usd !== null).length;
  const tokenNoMcap = snapshot.protocols.filter((p) => p.mcap_usd === null && !isPreToken(p)).length;
  const noToken = snapshot.protocols.filter(isPreToken);
  let excludedCategory = 0;
  let excludedVersioned = 0;
  let excludedWrapped = 0;
  let excludedExchange = 0;
  let rankable = 0;
  const catCounts = new Map<string, number>();
  for (const p of noToken) {
    if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) {
      excludedCategory++;
      catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
    } else if (VERSIONED.test(p.name)) excludedVersioned++;
    else if (WRAPPED_WORD.test(p.name)) excludedWrapped++;
    else if (EXCHANGE_PREFIXES.some((e) => p.name.startsWith(e))) excludedExchange++;
    else rankable++;
  }
  const early = rankable - snapshot.watchlist.length;
  return {
    total: snapshot.protocols.length,
    live_with_mcap: live,
    token_recorded_no_mcap: tokenNoMcap,
    no_token_record: noToken.length,
    excluded_category: excludedCategory,
    excluded_category_breakdown: [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    excluded_versioned: excludedVersioned,
    excluded_wrapped_word: excludedWrapped,
    excluded_exchange_prefix: excludedExchange,
    rankable,
    watchlist: snapshot.watchlist.length,
    early,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const calibration = calibrate(snapshot, model);
  const prop = fitPropensity(snapshot, model);
  const scoring = model.two_stage ? prop.scoring : null;
  const bands = bootstrapBands(snapshot, model, scoring);
  const board = buildBoardWithCalibration(snapshot, calibration, model, bands, scoring);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const index = bySlug(snapshot.protocols);
  const wlGrowth = snapshot.watchlist
    .map((s) => index.get(s)?.change_7d)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const preChanges = snapshot.protocols
    .filter(isPreToken)
    .map((p) => p.change_7d)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    watchlist: [...snapshot.watchlist],
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    watchlist_growth_min: wlGrowth.length > 0 ? Math.min(...wlGrowth) : null,
    watchlist_growth_max: wlGrowth.length > 0 ? Math.max(...wlGrowth) : null,
    max_change_7d: preChanges.length > 0 ? Math.max(...preChanges) : null,
    calibration: calibration.rows,
    curve: {
      comps: calibration.comps,
      intercept: calibration.intercept,
      slope: calibration.slope,
      r_squared: calibration.r_squared,
      resid_sd_dex: calibration.resid_sd_dex,
      global_median: calibration.global_median,
    },
    validation: validateCurve(snapshot, model),
    flat_validation: validateFlat(snapshot, model),
    walk_forward_rolling: validateRolling(snapshot, model),
    propensity: prop.metrics,
    sensitivity: sensitivityAnalysis(snapshot, board),
    accounting: accounting(snapshot),
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.rank_lo > r.rank || r.rank_hi < r.rank || r.value_lo_usd > r.implied_value_usd || r.value_hi_usd < r.implied_value_usd) {
      return `${r.slug} has a bootstrap band that does not contain its own rank or value`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
