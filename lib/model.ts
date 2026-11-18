// Genesis Scope's model (radar-2): one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and every
// other pre-token protocol the watchlist's own rule would keep: the early rows the radar exists to
// find, with no TVL floor of their own. A protocol is pre-token when its record carries no token
// (no market cap, no CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart
// and shown as the market's own values, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures. The base multiple is not a constant
// picked by hand: it is calibrated on the snapshot itself, from the protocols whose token already
// trades. For each category, take the median market-cap-to-TVL ratio of its live-token protocols,
// winsorized at 3x so one outlier cannot set the price, then shrink it toward the global median
// with 12 pseudo-observations, so a category with one thin comp cannot claim a wild multiple, and
// cap the result at 0.50x. A category with no live comps falls back to the global median.
//
//   multiple(cat) = clamp((n * median_cat + 12 * median_global) / (n + 12), 0.04, 0.50)
//   growth    = clamp(change_7d, -30, +30) per cent; growthMult = 1 + growth / 100 * 0.5
//   maturity  = 0.70 + 0.30 * (1 - exp(-age_days / 365))   (age unknown: 365 days)
//   breadth   = min(1.20, 1 + 0.05 * ln(chains))
//   implied   = max(1, round(tvl_usd * multiple(cat) * growthMult * maturity * breadth))
//
// No protocol name is ever special-cased: the same function scores every row, and the dashboard
// prints the calibration table so any reader can check the multiples against the snapshot. It also
// prints a sensitivity table: each constant varied alone, top-10 overlap and rank correlation
// against the published board.

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

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  shrink_k: number;
  winsor_cap: number;
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
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One row of the calibration table the dashboard prints. */
export interface CalibrationRow {
  category: string;
  comps: number;
  median_ratio: number;
  multiple: number;
  // The category's total TVL in the snapshot (live and pre-token alike): the detail view's share.
  total_tvl: number;
}

/** One row of the sensitivity table: one constant varied alone, the board re-scored. */
export interface SensitivityRow {
  variant: string;
  top10_kept: number;
  spearman: number;
}

/** The calibration: the global median ratio and one multiple per category. */
export interface Calibration {
  global_median: number;
  rows: CalibrationRow[];
  by_category: Record<string, number>;
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
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
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
  base_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
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
  global_median: number;
  sensitivity: SensitivityRow[];
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

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The calibration, computed from the snapshot's own live-token protocols: for every category with
 * at least one live comp, the median of its winsorized market-cap-to-TVL ratios, shrunk toward the
 * global median and capped. Categories without a comp use the global median, capped the same way.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const live = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
  const allRatios = live.map((p) => Math.min(p.mcap_usd! / p.tvl_usd, model.winsor_cap)).sort((a, b) => a - b);
  const global = medianOf(allRatios, 0.2);
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const cat = p.category ?? 'Other';
    const list = byCat.get(cat) ?? [];
    list.push(Math.min(p.mcap_usd! / p.tvl_usd, model.winsor_cap));
    byCat.set(cat, list);
  }
  const rows: CalibrationRow[] = [];
  const by_category: Record<string, number> = {};
  // Total TVL per category across the whole snapshot, for the detail view's share of its category.
  const totals = new Map<string, number>();
  for (const p of snapshot.protocols) {
    const cat = p.category ?? 'Other';
    totals.set(cat, (totals.get(cat) ?? 0) + p.tvl_usd);
  }
  for (const [cat, ratios] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    ratios.sort((a, b) => a - b);
    const med = medianOf(ratios, global);
    const mult = Math.min(
      model.multiple_cap,
      Math.max(model.multiple_floor, (ratios.length * med + model.shrink_k * global) / (ratios.length + model.shrink_k)),
    );
    rows.push({ category: cat, comps: ratios.length, median_ratio: round4(med), multiple: round4(mult), total_tvl: totals.get(cat) ?? 0 });
    by_category[cat] = mult;
  }
  return { global_median: round4(global), rows, by_category };
}

/** The base multiple for a protocol's category, from the calibration (global median when unlisted). */
export function baseMultiple(category: string | null, calibration: Calibration, model: ModelConstants = MODEL): number {
  const key = category ?? 'Other';
  const mult = calibration.by_category[key];
  if (mult !== undefined) return mult;
  return Math.min(model.multiple_cap, Math.max(model.multiple_floor, calibration.global_median));
}

/** The four multipliers and the implied value one protocol gets under `model` and `calibration`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calibration: Calibration,
  model: ModelConstants = MODEL,
): { implied: number; multiple: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const multiple = baseMultiple(protocol.category, calibration, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (1 - model.maturity_floor) * (1 - Math.exp(-Math.max(ageForModel, 0) / model.maturity_tau_days));
  const breadthMult = Math.min(model.breadth_cap, 1 + model.breadth_weight * Math.log(Math.max(1, protocol.chains.length)));
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult));
  return { implied, multiple, growthPct, growthMult, maturityMult, breadthMult, age };
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

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const calibration = calibrate(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names is ranked, whatever the rule below says.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other pre-token protocol the watchlist's rule would keep, at any TVL.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, calibration, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
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
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      // Full precision, not round4: the dashboard recomputes each row from this number, and
      // rounding it to 4 decimals broke the exact check on 167 of 198 rows (the page then
      // wrongly printed "differs from the board"). Display still rounds to 4 decimals.
      base_multiple: s.multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

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
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 60;
  if (age < 180) return 90;
  if (age < 365) return 60;
  return 30;
}

/** What one transaction costs on a chain: Ethereum is dear, rollups are cheap, Solana cheapest. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $8 to $20 of gas';
  if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'tron') return 'under $0.50 of gas';
  if (c === 'bitcoin' || c === 'bittensor') return 'about $2 to $5 of gas';
  return 'about $0.50 to $2 of gas';
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
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${Math.max(10, Math.round(capital / 5))} against the deposit on ${name}, then repay it the same week.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return `Swap $${Math.max(10, Math.round(capital / 5))} through ${name} on ${chain} so the wallet shows trading activity as well as liquidity.`;
  if (c.includes('bridge')) return `Bridge a second, smaller amount back through ${name} so the wallet shows two-way use.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Close the hedge on ${name} and open a fresh one half its size, so the wallet shows repeat use.`;
  if (c.includes('prediction')) return `Settle the first market position on ${name} and open a second one on a different market.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) return `Move $${Math.max(10, Math.round(capital / 5))} into a second ${name} vault on ${chain} to show more than one allocation.`;
  if (c.includes('governance')) return `Vote on a second ${name} proposal and leave a short comment in its forum.`;
  if (c.includes('rwa')) return `Mint $${Math.max(10, Math.round(capital / 5))} of a second yield asset on ${name} on ${chain} so the wallet holds more than one position.`;
  if (c.includes('staking') || c.includes('restak')) return `Delegate $${Math.max(10, Math.round(capital / 5))} to a second validator or operator through ${name} on ${chain}.`;
  if (c.includes('stable')) return `Convert $${Math.max(10, Math.round(capital / 5))} between the stable asset and its wrapped form through ${name} on ${chain}.`;
  if (c.includes('cedefi')) return `Move $${Math.max(10, Math.round(capital / 5))} into a second ${name} vault on ${chain} to show more than one allocation.`;
  if (c.includes('farm')) return `Harvest the farm rewards on ${name} and compound them back into the position.`;
  if (c.includes('anchor btc') || c.includes('decentralized btc')) return `Redeem $${Math.max(10, Math.round(capital / 5))} of the BTC-pegged asset through ${name} and mint it again, so the wallet shows two-way use.`;
  if (c.includes('insurance')) return `Buy $${Math.max(10, Math.round(capital / 5))} of cover for a second asset from ${name} on ${chain}.`;
  if (c.includes('payment')) return `Pay a second, smaller amount through ${name} on ${chain} so the wallet shows repeat use.`;
  if (c.includes('crypto card')) return `Load $${Math.max(10, Math.round(capital / 5))} onto the ${name} card and make one small purchase with it.`;
  return `Add $${Math.max(10, Math.round(capital / 5))} to the position on ${name} so the wallet shows repeat use, not a single deposit.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names. Gas is priced by the protocol's first chain; capital and hold come from its TVL and age.
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
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: gas,
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `about $${Math.max(10, Math.round(capital / 5))} of capital and ${gas}`,
      time: '10 minutes',
    },
    depthStep,
    {
      text: `Make one qualifying action each week on ${p.name}, such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.`,
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes; never pay a fee to claim and never follow a claim link from a chat or an ad.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
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

/** A board row's compact form for data.js, with the farm plan generated in the page. */
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
    base_multiple: row.model.base_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/**
 * Sensitivity: each constant varied alone, the board re-scored, top-10 overlap and rank
 * correlation against the published board. The constants are stated priors, not fitted values;
 * this table is the evidence for how much each one matters.
 */
export function sensitivityAnalysis(snapshot: Snapshot, published: BoardRow[]): SensitivityRow[] {
  const variants: Array<[string, ModelConstants]> = [
    ['No shrinkage (k = 0)', { ...MODEL, shrink_k: 0 }],
    ['Strong shrinkage (k = 25)', { ...MODEL, shrink_k: 25 }],
    ['Growth ignored (weight 0)', { ...MODEL, growth_weight: 0 }],
    ['Growth at full weight (1)', { ...MODEL, growth_weight: 1 }],
    ['Maturity floor 0.50', { ...MODEL, maturity_floor: 0.5 }],
    ['Maturity floor 0.90', { ...MODEL, maturity_floor: 0.9 }],
    ['Breadth ignored (weight 0)', { ...MODEL, breadth_weight: 0 }],
    ['Breadth doubled (0.10)', { ...MODEL, breadth_weight: 0.1 }],
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

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const calibration = calibrate(snapshot, model);
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
    global_median: calibration.global_median,
    sensitivity: sensitivityAnalysis(snapshot, board),
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
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
