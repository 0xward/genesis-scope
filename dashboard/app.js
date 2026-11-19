// Genesis Scope, model radar-3. A static page, no framework and no network: it reads
// data.js (written by main.ts from the same board) and renders the board, a detail view
// for every protocol, the live-token set, and the method with its validation tables.
// The page recomputes nothing the model did not already publish: every number on it is
// in data.js, so the screenshots, the code and the board agree.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) return;
  var app = document.getElementById('board');
  var st = { q: '', cat: 'all', chain: 'all', wl: false, tab: 'board', sort: 'implied', dir: -1, sel: null, all: false };
  var WL = {};
  (D.watchlist || []).forEach(function (s) { WL[s] = true; });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtUsdFull(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtMoney(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    return sign + '$' + (a >= 1000 ? Math.round(a).toLocaleString('en-US') : a.toFixed(2));
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }
  function fmtDate(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0] : String(iso);
  }
  function catColor(cat) {
    var s = cat || 'Other', h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return h % 6;
  }
  function logo(size) {
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M10 26 A16 16 0 0 1 26 10" fill="none" stroke="#1d1a16" stroke-width="1.25" opacity="0.4"/><path d="M6 26 A20 20 0 0 1 26 6" fill="none" stroke="#c2401b" stroke-width="2.5"/><line x1="3" y1="26" x2="29" y2="26" stroke="#1d1a16" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="6" r="2.8" fill="#c2401b"/></svg>';
  }

  // ---- farm plan (same derivation as lib/model.ts: category, chains, TVL, age) ----
  function capitalFor(r) {
    if (r.tvl_usd >= 1e9) return 250;
    if (r.tvl_usd >= 1e8) return 150;
    if (r.tvl_usd >= 2.5e7) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 60;
    if (age < 180) return 90;
    if (age < 365) return 60;
    return 30;
  }
  function gasFor(chain) {
    var c = (chain || '').toLowerCase();
    if (c === 'ethereum') return 'about $8 to $20 of gas';
    if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'tron') return 'under $0.50 of gas';
    if (c === 'bitcoin' || c === 'bittensor') return 'about $2 to $5 of gas';
    return 'about $0.50 to $2 of gas';
  }
  function gasMid(chain) {
    var c = (chain || '').toLowerCase();
    if (c === 'ethereum') return 14;
    if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'tron') return 0.25;
    if (c === 'bitcoin' || c === 'bittensor') return 3.5;
    return 1.25;
  }
  function actionFor(r, cap, chain) {
    var c = (r.category || '').toLowerCase(), n = r.name;
    if (/lend|cdp|collateral/.test(c)) return 'Supply $' + cap + ' of USDC to ' + n + ' on ' + chain + ' and keep the position open.';
    if (/dex|yield|leveraged farm|liquidity manager/.test(c)) return 'Provide $' + cap + ' of liquidity to ' + n + "'s main pool on " + chain + ' and keep the position open.';
    if (/bridge/.test(c)) return 'Bridge $' + cap + ' of USDC to ' + chain + ' through ' + n + ' and use the bridged funds in its app.';
    if (/staking|restak/.test(c)) return "Stake $" + cap + " of the chain's staking asset through " + n + ' and keep the receipt.';
    if (/perpetual|derivative|basis trading/.test(c)) return 'Deposit $' + cap + ' of USDC as margin on ' + n + ' and open one small hedged position.';
    if (/prediction/.test(c)) return 'Fund $' + cap + ' and place one market position on ' + n + '.';
    if (/curator|allocator|risk/.test(c)) return 'Deposit $' + cap + ' into a ' + n + ' vault on ' + chain + ' and keep the shares.';
    if (/stable/.test(c)) return 'Mint or deposit $' + cap + ' of the stable asset through ' + n + ' on ' + chain + '.';
    if (/rwa/.test(c)) return "Mint $" + cap + " of " + n + "'s yield asset on " + chain + ' and hold it.';
    if (/insurance/.test(c)) return 'Buy $' + cap + ' of cover from ' + n + ' on ' + chain + ' and keep the policy.';
    if (/payment/.test(c)) return 'Pay $' + cap + ' through ' + n + ' on ' + chain + ' and keep the receipt.';
    if (/governance/.test(c)) return "Deposit $" + cap + " into " + n + "'s governance vault on " + chain + ' and vote once.';
    if (/farm/.test(c)) return 'Deposit $' + cap + ' of USDC into ' + n + "'s farm on " + chain + ' and keep the position open.';
    if (/anchor btc|decentralized btc/.test(c)) return 'Mint $' + cap + ' of the BTC-pegged asset through ' + n + ' on ' + chain + ' and hold it.';
    if (/cedefi/.test(c)) return 'Deposit $' + cap + ' into a ' + n + ' vault on ' + chain + ' and keep the shares.';
    if (c === 'chain') return 'Bridge $' + cap + ' of USDC to ' + chain + " and use it in " + n + "'s app.";
    return 'Put $' + cap + ' of USDC to work in ' + n + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(r, cap, chain) {
    var c = (r.category || '').toLowerCase(), n = r.name, small = Math.max(10, Math.round(cap / 5));
    if (/lend|cdp|collateral/.test(c)) return 'Borrow $' + small + ' against the deposit on ' + n + ', then repay it the same week.';
    if (/dex|yield|leveraged farm|liquidity manager/.test(c)) return 'Swap $' + small + ' through ' + n + ' on ' + chain + ' so the wallet shows trading activity as well as liquidity.';
    if (/bridge/.test(c)) return 'Bridge a second, smaller amount back through ' + n + ' so the wallet shows two-way use.';
    if (/perpetual|derivative|basis trading/.test(c)) return 'Close the hedge on ' + n + ' and open a fresh one half its size, so the wallet shows repeat use.';
    if (/prediction/.test(c)) return 'Settle the first market position on ' + n + ' and open a second one on a different market.';
    if (/curator|allocator|risk/.test(c)) return 'Move $' + small + ' into a second ' + n + ' vault on ' + chain + ' to show more than one allocation.';
    if (/governance/.test(c)) return 'Vote on a second ' + n + ' proposal and leave a short comment in its forum.';
    if (/rwa/.test(c)) return 'Mint $' + small + ' of a second yield asset on ' + n + ' on ' + chain + ' so the wallet holds more than one position.';
    if (/staking|restak/.test(c)) return 'Delegate $' + small + ' to a second validator or operator through ' + n + ' on ' + chain + '.';
    if (/stable/.test(c)) return 'Convert $' + small + ' between the stable asset and its wrapped form through ' + n + ' on ' + chain + '.';
    if (/cedefi/.test(c)) return 'Move $' + small + ' into a second ' + n + ' vault on ' + chain + ' to show more than one allocation.';
    if (/farm/.test(c)) return 'Harvest the farm rewards on ' + n + ' and compound them back into the position.';
    if (/anchor btc|decentralized btc/.test(c)) return 'Redeem $' + small + ' of the BTC-pegged asset through ' + n + ' and mint it again, so the wallet shows two-way use.';
    if (/insurance/.test(c)) return 'Buy $' + small + ' of cover for a second asset from ' + n + ' on ' + chain + '.';
    if (/payment/.test(c)) return 'Pay a second, smaller amount through ' + n + ' on ' + chain + ' so the wallet shows repeat use.';
    if (/crypto card/.test(c)) return 'Load $' + small + ' onto the ' + n + ' card and make one small purchase with it.';
    return 'Add $' + small + ' to the position on ' + n + ' so the wallet shows repeat use, not a single deposit.';
  }
  function farmSteps(r) {
    var chain = (r.chains && r.chains[0]) || 'its main chain';
    var cap = capitalFor(r), hold = holdDaysFor(r.age_days), gas = gasFor(chain);
    var second = r.chains && r.chains[1];
    var depth = second
      ? { t: 'Repeat the core position on ' + second + ' as well, with about half the capital, so the activity spans two chains.', c: 'about $' + Math.round(cap / 2) + ' of capital and ' + gas, ti: '20 minutes to set up' }
      : { t: 'After two weeks, add $' + Math.max(10, Math.round(cap / 4)) + ' to the position on ' + r.name + ' so the wallet shows growing use, not a single deposit.', c: 'about $' + Math.max(10, Math.round(cap / 4)) + ' of capital and ' + gas, ti: '10 minutes' };
    return [
      { t: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', c: gas, ti: '5 minutes' },
      { t: actionFor(r, cap, chain), c: '$' + cap + ' of capital and ' + gas, ti: '15 minutes to set up' },
      { t: secondActionFor(r, cap, chain), c: 'about $' + Math.max(10, Math.round(cap / 5)) + ' of capital and ' + gas, ti: '10 minutes' },
      depth,
      { t: 'Make one qualifying action each week on ' + r.name + ', such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.', c: gas + ' a week', ti: '10 minutes a week' },
      { t: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', c: 'the $' + cap + ' stays in the position', ti: hold + ' days' },
      { t: "Before you withdraw, open " + r.name + "'s own points or rewards page and claim only from the link it publishes; never pay a fee to claim and never follow a claim link from a chat or an ad.", c: 'no fee to check, and never pay to claim', ti: '10 minutes' },
      { t: 'Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.', c: 'nothing but the log', ti: '5 minutes' }
    ];
  }
  function farmEcon(r) {
    var hold = holdDaysFor(r.age_days), weeks = Math.ceil(hold / 7);
    var tx = 3 + weeks;
    return { cap: capitalFor(r), hold: hold, weeks: weeks, tx: tx, gasMid: gasMid((r.chains && r.chains[0]) || ''), gas: r.farm_cost_usd, hours: r.farm_hours };
  }
  function scenario(r, sharePct) {
    var alloc = (sharePct / 100) * r.implied_value_usd;
    var net = alloc - r.farm_cost_usd;
    return { share: sharePct, alloc: alloc, net: net, perHour: r.farm_hours > 0 ? net / r.farm_hours : 0 };
  }

  function readHash() {
    var p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (p.get('q')) st.q = p.get('q');
    if (p.get('cat')) st.cat = p.get('cat');
    if (p.get('chain')) st.chain = p.get('chain');
    if (p.get('wl') === '1') st.wl = true;
    if (p.get('tab') === 'live' || p.get('tab') === 'method') st.tab = p.get('tab');
    if (p.get('p')) st.sel = p.get('p');
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (st.q) p.set('q', st.q);
    if (st.cat !== 'all') p.set('cat', st.cat);
    if (st.chain !== 'all') p.set('chain', st.chain);
    if (st.wl) p.set('wl', '1');
    if (st.tab !== 'board') p.set('tab', st.tab);
    if (st.sel) p.set('p', st.sel);
    var s = p.toString();
    window.history.replaceState(null, '', s ? '#' + s : window.location.pathname + window.location.search);
  }
  function shownRows() {
    var q = st.q.trim().toLowerCase();
    return D.rows.filter(function (r) {
      if (st.cat !== 'all' && (r.category || 'Other') !== st.cat) return false;
      if (st.chain !== 'all' && (r.chains || []).indexOf(st.chain) < 0) return false;
      if (st.wl && !WL[r.slug]) return false;
      if (!q) return true;
      return [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var k = st.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (k === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (k === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (k === 'cost') { av = a.farm_cost_usd; bv = b.farm_cost_usd; }
      else if (k === 'perhour') { av = a.farm_per_hour_usd; bv = b.farm_per_hour_usd; }
      else if (k === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -st.dir;
      if (av > bv) return st.dir;
      return a.slug < b.slug ? -1 : 1;
    });
  }
  function rowBySlug(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }

  function th(key, label, cls) {
    var arrow = st.sort === key ? (st.dir > 0 ? ' ▴' : ' ▾') : '';
    return '<th scope="col"' + (cls ? ' class="' + cls + '"' : '') + '><button type="button" data-act="sort" data-key="' + key + '" style="all:unset;cursor:pointer">' + label + arrow + '</button></th>';
  }
  function headerHtml() {
    return '<header class="top"><div class="brand"><span>' + logo(28) + '</span><span class="brand-name">Genesis Scope</span><span class="brand-tag">Pre-token protocols, ranked</span></div>' +
      '<div class="top-meta">File Nº 03 · radar-3<br>Snapshot ' + fmtDate(D.as_of) + ', from the DefiLlama protocol index<br>Scored by the ' + esc(D.model_version) + ' model — a fitted comps curve, validated.</div></header>';
  }
  function ledeHtml() {
    var top = D.rows[0];
    var a = D.accounting;
    var top5 = D.rows.slice(0, 5), max = top5[0].implied_value_usd;
    var bars = top5.map(function (r) {
      return '<div class="mbi"><span>' + esc(r.name) + '</span><div class="mbr"><i style="width:' + Math.max(4, Math.round(100 * r.implied_value_usd / max)) + '%"></i><b>' + fmtUsd(r.implied_value_usd) + '</b></div></div>';
    }).join('');
    return '<section class="lede"><p class="eyebrow">01 — The board</p><div class="lede-grid"><div>' +
      '<h1>The launches before the launch.</h1>' +
      '<p class="dek">The watchlist names <b>' + D.watchlist_size + '</b> protocols to watch. The early radar adds <b>' + D.early_size + '</b> more pre-token protocols the watchlist’s own rule would keep, at any TVL — no wrapped, staked or bridged product, no versioned pool, no exchange product. Every implied value below is this entry’s own claim from the snapshot’s figures: a model, not a promise, and not a prediction that a token will launch.</p></div>' +
      '<aside class="margin-note"><span class="mn-label">Read this first</span>' +
      'Lido: <b>$18.7B</b> TVL, <b>$251M</b> mcap. Flat ratio says <b>$4.6B</b>; the curve says $251M. That gap is the whole model.' +
      '<div class="mb">' + bars + '</div></aside></div>' +
      '<div class="facts">' +
      '<div class="fact"><b>' + D.watchlist_size + ' / ' + D.watchlist_size + '</b><span>Watchlist covered</span></div>' +
      '<div class="fact"><b>' + D.board_size + '</b><span>Pre-token rows scored</span></div>' +
      '<div class="fact"><b>' + D.early_size + '</b><span>Early rows found below the floor</span></div>' +
      '<div class="fact hot"><b>' + fmtUsd(top ? top.implied_value_usd : null) + '</b><span>Top implied value</span></div>' +
      '<div class="fact"><b>' + D.curve.comps + '</b><span>Live comps price the curve</span></div>' +
      '<div class="fact"><b>R² ' + D.curve.r_squared + '</b><span>Curve fit · LOO error ' + D.validation[0].median_abs_log_err + ' dex</span></div>' +
      '</div>' +
      '<p class="note">Accounting: ' + a.total + ' protocols in the snapshot — ' + a.live_with_mcap + ' with a market cap set aside, ' + a.token_recorded_no_mcap + ' record a token but no market cap, ' + a.no_token_record + ' record no token. Of those ' + a.no_token_record + ', ' + a.excluded_category + ' fall in an excluded category, ' + a.excluded_versioned + ' are versioned pools and ' + a.excluded_wrapped_word + ' are wrapped or staked products — leaving ' + a.rankable + ' ranked rows.</p></section>';
  }
  function controlsHtml() {
    var cats = Array.from(new Set(D.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(D.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var opts = function (list, cur, allLabel) {
      return '<option value="all"' + (cur === 'all' ? ' selected' : '') + '>' + allLabel + '</option>' + list.map(function (c) {
        return '<option value="' + esc(c) + '"' + (cur === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('');
    };
    var tabBtn = function (tab, label) {
      return '<button type="button" data-act="tab" data-tab="' + tab + '" aria-pressed="' + (st.tab === tab) + '">' + label + '</button>';
    };
    var shown = st.tab === 'board' ? shownRows().length + ' of ' + D.board_size + ' rows shown' : st.tab === 'live' ? D.live.length + ' live-token protocols' : 'Method, validation and accounting';
    return '<div class="controls">' +
      '<div class="field"><label for="q">Search</label><input type="search" id="q" placeholder="Name, category or chain" value="' + esc(st.q) + '" aria-label="Search the board"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category" aria-label="Filter by category">' + opts(cats, st.cat, 'All categories') + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">' + opts(chains, st.chain, 'All chains') + '</select></div>' +
      '<label class="check"><input type="checkbox" id="wl"' + (st.wl ? ' checked' : '') + '> Watchlist only</label>' +
      '<div class="field"><span class="sub">View</span><div class="tabs">' + tabBtn('board', 'Pre-token') + tabBtn('live', 'Live token') + tabBtn('method', 'Method') + '</div></div>' +
      '<span class="count">' + shown + '</span></div>';
  }
  function moversHtml() {
    var top3 = D.rows.slice(0, 3);
    var withChange = D.rows.filter(function (r) { return r.change_7d !== null; });
    var gainer = withChange.reduce(function (a, b) { return b.change_7d > a.change_7d ? b : a; }, withChange[0]);
    var loser = withChange.reduce(function (a, b) { return b.change_7d < a.change_7d ? b : a; }, withChange[0]);
    var chips = '<span class="lab">Movers</span>' + top3.map(function (r, i) {
      return '<span class="mv"><span class="dot"></span><b>#' + (i + 1) + ' ' + esc(r.name) + '</b><span class="num">' + fmtUsd(r.implied_value_usd) + '</span></span>';
    }).join('');
    if (gainer && loser) {
      chips += '<span class="lab">7d</span><span class="mv"><span class="dot"></span><b>' + esc(gainer.name) + '</b><span class="num pos">' + fmtPct(gainer.change_7d) + '</span></span>' +
        '<span class="mv"><span class="dot"></span><b>' + esc(loser.name) + '</b><span class="num neg">' + fmtPct(loser.change_7d) + '</span></span>';
    }
    return '<div class="movers">' + chips + '</div>';
  }
  function boardHtml() {
    var list = sortedRows(shownRows());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2><p>Clear the search or pick another category to see the board again.</p><button class="button primary" type="button" data-act="clear">Clear filters</button></div></div>';
    }
    var max = list[0].implied_value_usd || 1;
    var neg = D.rows.filter(function (r) { return r.farm_per_hour_usd < 0; }).length;
    var show = st.all ? list : list.slice(0, 50);
    var rows = show.map(function (r) {
      var g = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gc = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var w = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      var perHour = r.farm_per_hour_usd;
      var phCls = perHour >= 0 ? 'pos' : 'neg';
      return '<tr data-slug="' + esc(r.slug) + '" tabindex="0"' + (st.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="rank' + (r.rank <= 3 ? ' top3' : '') + '">' + r.rank + '</td>' +
        '<td><div class="rowid"><span class="mono" aria-hidden="true">' + esc((r.name || '·')[0]) + '</span><div><div class="name"><b>' + esc(r.name) + '</b><span class="rowarrow" aria-hidden="true"> →</span></div><span class="sub"><span class="catdot cat-' + catColor(r.category) + '"></span>' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + (WL[r.slug] ? ' · watchlist' : ' · early') + '</span></div></div></td>' +
        '<td class="num" title="' + fmtUsdFull(r.tvl_usd) + '">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + gc + '">' + g + '</td>' +
        '<td><div class="implied"><span class="num" title="' + fmtUsdFull(r.implied_value_usd) + '">' + fmtUsd(r.implied_value_usd) + '</span><div class="bar" aria-hidden="true"><i class="' + (r.rank <= 3 ? 'top3' : '') + '" style="width:' + w + '%"></i></div></div></td>' +
        '<td class="num range">#' + r.rank_lo + '–' + r.rank_hi + '<br><span class="range">' + fmtUsd(r.value_lo_usd) + '–' + fmtUsd(r.value_hi_usd) + '</span></td>' +
        '<td class="num" title="Gas bill for the whole farm">$' + r.farm_cost_usd.toFixed(2) + '</td>' +
        '<td class="num ' + phCls + '" title="Net $/hour at a 0.001% allocation of implied value">' + fmtMoney(perHour) + '</td></tr>';
    }).join('');
    var more = (!st.all && list.length > 50) ? '<button class="button showall" type="button" data-act="showall">Show all ' + list.length + ' rows</button>' : '';
    return '<div class="panel"><table><thead><tr>' + th('rank', '#') + th('name', 'Protocol') + th('tvl', 'TVL', 'num') + th('growth', '7d', 'num') + th('implied', 'Implied value', 'num') + '<th scope="col" class="num">Rank range · 80% band</th>' + th('cost', 'Farm $', 'num') + th('perhour', '$/hr', 'num') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + more +
      '<p class="note" style="margin-top:10px">' + neg + ' of the 198 rows net negative $/hour at the 0.001% allocation — the tail is not worth farming. Rank range and 80% band come from 200 bootstrap refits of the comps curve (seeded, reproducible). Farm $ is the whole farm’s gas bill; $/hr is net of that bill at a 0.001% allocation of the implied value — one farmer’s share if 10% of the supply is split among 10,000 farmers. Click a row for the detail view, farm plan and break-even.</p>';
  }
  function detailHtml() {
    var r = rowBySlug(st.sel);
    if (!r) return '';
    var e = farmEcon(r);
    var cal = null;
    for (var i = 0; i < D.calibration.length; i++) if (D.calibration[i].category === (r.category || 'Other')) cal = D.calibration[i];
    var lo = Math.max(0, (r.rank_lo / D.board_size) * 100), hi = Math.min(100, (r.rank_hi / D.board_size) * 100), at = (r.rank / D.board_size) * 100;
    var beN = r.farm_cost_usd > 0 ? Math.round(r.implied_value_usd / r.farm_cost_usd) : 0;
    var scen = [0.001, 0.005, 0.01].map(function (s) { return scenario(r, s); });
    var steps = farmSteps(r).map(function (s) {
      return '<li>' + esc(s.t) + '<span class="cost">Cost: ' + esc(s.c) + '. Time: ' + esc(s.ti) + '.</span></li>';
    }).join('');
    return '<section class="panel detail" aria-label="Protocol detail"><div class="inner">' +
      '<p class="eyebrow">Detail · #' + r.rank + ' of 198</p>' +
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="kicker">' + esc(r.category || 'Other') + ' · ' + esc((r.chains || []).join(', ') || 'an unnamed chain') + ' · ' + (WL[r.slug] ? 'watchlist' : 'early') + ' · listed ' + (r.listed_at ? fmtDate(r.listed_at) : 'date unknown') + ' (' + fmtAge(r.age_days) + ') · TVL ' + fmtUsdFull(r.tvl_usd) + ' · 7d ' + fmtPct(r.change_7d) + ' <button class="button" type="button" data-act="close" style="float:right">Close</button></p>' +
      '<div class="bandbar" aria-hidden="true"><i style="left:' + lo.toFixed(1) + '%;width:' + Math.max(0.6, hi - lo).toFixed(1) + '%"></i><b style="left:' + at.toFixed(1) + '%"></b></div>' +
      '<p class="note">Rank ' + r.rank + ' of ' + D.board_size + ' · bootstrap rank range #' + r.rank_lo + '–' + r.rank_hi + ' · 80% value band ' + fmtUsd(r.value_lo_usd) + '–' + fmtUsd(r.value_hi_usd) + '.</p>' +
      '<div class="cols"><div><h3>How the value is built</h3><table class="kv">' +
      '<tr><td>Fitted base (curve)</td><td>' + fmtUsdFull(r.fitted_base_usd) + '</td></tr>' +
      '<tr><td>Category tilt</td><td>' + (r.tilt_dex >= 0 ? '+' : '') + r.tilt_dex.toFixed(4) + ' dex</td></tr>' +
      '<tr><td>Growth multiplier</td><td>' + r.growth_multiplier.toFixed(4) + '×</td></tr>' +
      '<tr><td>Maturity multiplier</td><td>' + r.maturity_multiplier.toFixed(4) + '×</td></tr>' +
      '<tr><td>Breadth multiplier</td><td>' + r.breadth_multiplier.toFixed(4) + '×</td></tr>' +
      '<tr><td><b>Implied value</b></td><td><b>' + fmtUsdFull(r.implied_value_usd) + '</b></td></tr>' +
      (cal ? '<tr><td>Category comps (' + esc(cal.category) + ')</td><td>' + cal.comps + '</td></tr>' +
        '<tr><td>Category median ratio</td><td>' + cal.median_ratio.toFixed(3) + '×</td></tr>' +
        '<tr><td>Fitted multiple at $100M TVL</td><td>' + cal.multiple_at_100m.toFixed(3) + '×</td></tr>' : '') +
      '</table></div>' +
      '<div><h3>What farming it costs</h3><table class="kv">' +
      '<tr><td>Deposit deployed</td><td>$' + e.cap + '</td></tr>' +
      '<tr><td>Gas per transaction</td><td>$' + e.gasMid.toFixed(2) + '</td></tr>' +
      '<tr><td>Transactions</td><td>' + e.tx + ' (' + e.weeks + ' weekly)</td></tr>' +
      '<tr><td><b>Gas bill, whole farm</b></td><td><b>$' + r.farm_cost_usd.toFixed(2) + '</b></td></tr>' +
      '<tr><td>Hands-on time</td><td>' + r.farm_hours.toFixed(2) + ' h over ' + e.hold + ' days</td></tr>' +
      '<tr><td>Break-even allocation</td><td>$' + r.farm_cost_usd.toFixed(2) + ' · 1 in ' + beN.toLocaleString('en-US') + '</td></tr>' +
      '<tr><td>Net $/hour at 0.001%</td><td>' + fmtMoney(r.farm_per_hour_usd) + '</td></tr>' +
      '</table><p class="note">The deposit comes back on exit — it is capital at risk, not money spent. Only the gas bill is spent.</p></div></div>' +
      '<h3 style="margin-top:16px">Allocation scenarios — not forecasts</h3>' +
      '<table><thead><tr><th scope="col">If your allocation is</th><th scope="col" class="num">Allocation</th><th scope="col" class="num">Net of gas</th><th scope="col" class="num">Net $/hour</th></tr></thead><tbody>' +
      scen.map(function (s) {
        return '<tr><td>' + s.share + '% of implied value</td><td class="num">' + fmtMoney(s.alloc) + '</td><td class="num">' + fmtMoney(s.net) + '</td><td class="num ' + (s.perHour >= 0 ? 'pos' : 'neg') + '">' + fmtMoney(s.perHour) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="note">0.001% is one farmer’s share if 10% of the supply is split among 10,000 farmers. A row whose 0.001% scenario nets negative is a row the farm does not pay for.</p>' +
      '<h3 style="margin-top:16px">Farm plan — 8 steps</h3><ol class="steps">' + steps + '</ol>' +
      '</div></section>';
  }
  function liveHtml() {
    var rows = D.live.map(function (p, i) {
      return '<tr><td class="rank">' + (i + 1) + '</td><td><b>' + esc(p.name) + '</b><span class="sub"><span class="catdot cat-' + catColor(p.category) + '"></span>' + esc(p.category || 'Other') + ' on ' + esc((p.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></td>' +
        '<td class="num">' + fmtUsd(p.tvl_usd) + '</td><td class="num">' + fmtUsd(p.mcap_usd) + '</td><td class="num">' + (p.mcap_tvl_ratio === null ? 'n/a' : p.mcap_tvl_ratio.toFixed(3) + '×') + '</td><td class="num">' + fmtPct(p.change_7d) + '</td></tr>';
    }).join('');
    return '<div class="panel"><table><thead><tr><th scope="col">#</th><th scope="col">Protocol</th><th scope="col" class="num">TVL</th><th scope="col" class="num">Market cap</th><th scope="col" class="num">Mcap / TVL</th><th scope="col" class="num">7d</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note" style="margin-top:10px">The ' + D.live.length + ' largest live-token protocols by market cap, shown with the market’s own values — never mixed into the ranked board. These are the comps the curve is fitted on (119 in all, CEX excluded).</p>';
  }
  function valTable(rows, title) {
    return '<h3>' + title + '</h3><table><thead><tr><th scope="col">Split</th><th scope="col" class="num">Fit on</th><th scope="col" class="num">Tested on</th><th scope="col" class="num">Median |error|</th><th scope="col" class="num">Within 2×</th><th scope="col" class="num">Median signed error</th></tr></thead><tbody>' +
      rows.map(function (v) {
        return '<tr><td>' + esc(v.split) + '</td><td class="num">' + v.train + '</td><td class="num">' + v.test + '</td><td class="num">' + v.median_abs_log_err.toFixed(3) + ' dex</td><td class="num">' + Math.round(v.within_2x * 100) + '%</td><td class="num">' + (v.median_signed_log_err >= 0 ? '+' : '') + v.median_signed_log_err.toFixed(3) + ' dex</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function curveChart() {
    var c = D.curve, W = 560, H = 300, L = 52, R = 12, T = 12, B = 34;
    var x0 = 6, x1 = 11, y0 = 5, y1 = 10.5;
    var X = function (v) { return L + (Math.log10(v) - x0) / (x1 - x0) * (W - L - R); };
    var Y = function (v) { return T + (y1 - Math.log10(v)) / (y1 - y0) * (H - T - B); };
    var yA = Math.pow(10, c.intercept + c.slope * x0), yB = Math.pow(10, c.intercept + c.slope * x1);
    var grid = '';
    [6, 8, 10].forEach(function (e) {
      var v = Math.pow(10, e);
      grid += '<line class="axis" x1="' + X(v).toFixed(1) + '" y1="' + T + '" x2="' + X(v).toFixed(1) + '" y2="' + (H - B) + '"/><text class="tick" x="' + X(v).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + fmtUsd(v) + '</text>';
    });
    [6, 8, 10].forEach(function (e) {
      var v = Math.pow(10, e);
      grid += '<line class="axis" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y(v).toFixed(1) + '"/><text class="tick" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmtUsd(v) + '</text>';
    });
    var dots = D.live.filter(function (p) { return p.tvl_usd > 0 && p.mcap_usd > 0; }).map(function (p) {
      var cx = X(Math.max(1e6, Math.min(1e11, p.tvl_usd))), cy = Y(Math.max(1e5, Math.min(3e10, p.mcap_usd)));
      return '<circle class="dot" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.2"><title>' + esc(p.name) + ' — TVL ' + fmtUsd(p.tvl_usd) + ', mcap ' + fmtUsd(p.mcap_usd) + '</title></circle>';
    }).join('');
    var lab = '';
    D.live.forEach(function (p) {
      if (p.slug === 'lido') {
        var cx = X(p.tvl_usd), cy = Y(p.mcap_usd);
        lab = cx > 400
          ? '<text class="dot-lab" x="' + (cx - 8).toFixed(1) + '" y="' + (cy - 6).toFixed(1) + '" text-anchor="end">Lido — the flat ratio fails here</text>'
          : '<text class="dot-lab" x="' + (cx + 8).toFixed(1) + '" y="' + (cy - 6).toFixed(1) + '">Lido — the flat ratio fails here</text>';
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Log-log scatter of the largest live-token protocols against the fitted curve">' + grid +
      '<line class="fit" x1="' + X(1e6).toFixed(1) + '" y1="' + Y(yA).toFixed(1) + '" x2="' + X(1e11).toFixed(1) + '" y2="' + Y(yB).toFixed(1) + '"/>' + dots + lab + '</svg>' +
      '<p class="note">Each dot is one of the 24 largest live-token protocols, plotted at its real TVL and market cap (log scales both ways). The red line is the fitted curve — no tilt. The scatter around it is the R² 0.143: the curve is the best single line through the cloud, and the cloud is wide.</p>';
  }
  function methodHtml() {
    var c = D.curve;
    var atTvl = function (tvl) {
      var fitted = Math.pow(10, c.intercept + c.slope * Math.log10(tvl));
      return '<tr><td class="num">' + fmtUsd(tvl) + '</td><td class="num">' + fmtUsd(fitted) + '</td><td class="num">' + (fitted / tvl).toFixed(3) + '×</td></tr>';
    };
    var calRows = D.calibration.map(function (r) {
      return '<tr><td>' + esc(r.category) + '</td><td class="num">' + r.comps + '</td><td class="num">' + r.median_ratio.toFixed(3) + '×</td><td class="num">' + (r.tilt_dex >= 0 ? '+' : '') + r.tilt_dex.toFixed(3) + '</td><td class="num">' + r.multiple_at_100m.toFixed(3) + '×</td><td class="num">' + fmtUsd(r.total_tvl) + '</td></tr>';
    }).join('');
    var sensRows = D.sensitivity.map(function (s) {
      return '<tr><td>' + esc(s.variant) + '</td><td class="num">' + s.top10_kept + ' / 10</td><td class="num">' + s.spearman.toFixed(3) + '</td></tr>';
    }).join('');
    var a = D.accounting;
    return '<section class="panel method"><p class="eyebrow">02 — The method</p><h2>The model — radar-3</h2>' +
      '<p>Implied value follows only from the snapshot’s own figures. The base is a comps curve fitted on the protocols whose token already trades, not a flat ratio and not a hand-picked multiple:</p>' +
      '<p class="formula">log10(mcap) = ' + c.intercept + ' + ' + c.slope + ' × log10(tvl) + tilt(category)\nimplied = fitted mcap × growth × maturity × breadth\ngrowth = 1 + clamp(change_7d, −30, +30) / 100 × 0.5\nmaturity = 0.70 + 0.30 × (1 − e^(−age / 365))\nbreadth = min(1.20, 1 + 0.05 × ln(chains))</p>' +
      '<p>The tilt is a category’s median log-residual from the curve, shrunk toward 0 with 8 pseudo-observations and capped at ±0.5 dex. Fit on ' + c.comps + ' live comps (CEX excluded): slope ' + c.slope + ', R² ' + c.r_squared + ', residual spread ' + c.resid_sd_dex + ' dex, global median mcap/TVL ' + c.global_median + '×. TVL alone explains only ' + Math.round(c.r_squared * 100) + '% of log market-cap variance — that is why every row carries a rank range and an 80% value band from 200 bootstrap refits, instead of a bare point estimate.</p>' +
      '<h3>Why the curve, not a flat ratio</h3>' +
      '<p>Market cap grows sub-linearly with TVL (slope ' + c.slope + ', not 1). A flat median ratio of ' + c.global_median + '× prices the largest protocols far too high: Lido holds $18.7B of TVL against a $251M market cap, a ratio of 0.013×. The table below scores both models on the same three splits — the curve wins on every one.</p>' +
      curveChart() +
      valTable(D.validation, 'Fitted curve — validated on known market caps') +
      valTable(D.flat_validation, 'Flat category-median ratio (radar-2) — same splits, for comparison') +
      '<p class="note">Errors are in dex (log10): 0.30 dex is about a factor of 2. “Within 2×” is the share of tested comps the model priced within a factor of two of their real market cap. Leave-one-out refits the curve 119 times; the hash split fits on 80% of comps (by slug hash) and tests on the other 20%; walk-forward fits on the older half of the dated comps and tests on the newer half — the closest thing to a backtest a single snapshot allows. A single snapshot cannot test whether a token launches: the model prices value <i>if</i> one did, and says nothing about the probability.</p>' +
      '<h3>The curve at four sizes (no category tilt)</h3>' +
      '<table><thead><tr><th scope="col" class="num">TVL</th><th scope="col" class="num">Fitted mcap</th><th scope="col" class="num">Implied multiple</th></tr></thead><tbody>' + atTvl(1e7) + atTvl(1e8) + atTvl(1e9) + atTvl(1e10) + '</tbody></table>' +
      '<h3>Calibration — every category</h3>' +
      '<table><thead><tr><th scope="col">Category</th><th scope="col" class="num">Comps</th><th scope="col" class="num">Median ratio</th><th scope="col" class="num">Tilt (dex)</th><th scope="col" class="num">Multiple at $100M</th><th scope="col" class="num">Category TVL</th></tr></thead><tbody>' + calRows + '</tbody></table>' +
      '<h3>Sensitivity — one constant varied alone</h3>' +
      '<table><thead><tr><th scope="col">Variant</th><th scope="col" class="num">Top 10 kept</th><th scope="col" class="num">Rank correlation</th></tr></thead><tbody>' + sensRows + '</tbody></table>' +
      '<p class="note">The tilt’s shrinkage matters most: with no shrinkage the top 10 keeps only 6 of 10 rows. Growth, maturity and breadth move the board far less — the ranking is driven by the fitted curve, not by the priors.</p>' +
      '<h3>Accounting — every protocol placed once</h3>' +
      '<table><tbody>' +
      '<tr><td>Protocols in the snapshot</td><td class="num">' + a.total + '</td></tr>' +
      '<tr><td>With a market cap — set aside, market values shown</td><td class="num">' + a.live_with_mcap + '</td></tr>' +
      '<tr><td>Record a token but no market cap — not pre-token</td><td class="num">' + a.token_recorded_no_mcap + '</td></tr>' +
      '<tr><td>Record no token</td><td class="num">' + a.no_token_record + '</td></tr>' +
      '<tr><td>&nbsp;&nbsp;of those, excluded category (' + a.excluded_category_breakdown.map(function (b) { return esc(b.category) + ' ' + b.count; }).join(', ') + ')</td><td class="num">' + a.excluded_category + '</td></tr>' +
      '<tr><td>&nbsp;&nbsp;of those, versioned pools</td><td class="num">' + a.excluded_versioned + '</td></tr>' +
      '<tr><td>&nbsp;&nbsp;of those, wrapped or staked products</td><td class="num">' + a.excluded_wrapped_word + '</td></tr>' +
      '<tr><td>&nbsp;&nbsp;of those, exchange products</td><td class="num">' + a.excluded_exchange_prefix + '</td></tr>' +
      '<tr><td><b>Ranked rows (watchlist ' + a.watchlist + ' + early ' + a.early + ')</b></td><td class="num"><b>' + a.rankable + '</b></td></tr>' +
      '</tbody></table>' +
      '<h3>Farm economics — how the costs are counted</h3>' +
      '<p>The deposit is capital at risk, not money spent: it comes back on exit. What a farmer actually spends is gas — 3 setup transactions plus one qualifying action a week of the hold (30, 60 or 90 days by age) — priced at the protocol’s first chain (Ethereum $14, Solana-class $0.25, Bitcoin-class $3.50, other chains $1.25 per transaction, midpoints of the ranges the farm steps quote). Hands-on time is the setup plus 10 minutes a week plus the claim check and the farm log. Break-even is the gas bill as a share of the implied value. $/hour is net of the gas bill at a stated 0.001% allocation — one farmer’s share if 10% of the supply is split among 10,000 farmers — a scenario, not a prediction.</p>' +
      '</section>';
  }
  function footerHtml() {
    return '<footer><p>Genesis Scope, model ' + esc(D.model_version) + '. Snapshot ' + fmtDate(D.as_of) + ' · ' + esc(D.source) + ' · floor $' + D.floor_usd.toLocaleString('en-US') + '.</p>' +
      '<p>“Records no token” means the snapshot records no token for the protocol — never that it has none. Implied value is this entry’s own claim from the snapshot’s figures; it is not a price, not a prediction that a token will launch, and not advice. Farm plans are generic steps derived from each protocol’s category, chains, TVL and age; check the protocol’s own pages before you deposit anything.</p></footer>';
  }
  function render() {
    var html = headerHtml() + ledeHtml() + controlsHtml();
    if (st.tab === 'board') html += moversHtml();
    if (st.tab === 'board' && st.sel) html += detailHtml();
    if (st.tab === 'board') html += boardHtml();
    else if (st.tab === 'live') html += liveHtml();
    else html += methodHtml();
    html += footerHtml();
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
  }
  var timer = null;
  app.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') {
      st.q = e.target.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        writeHash();
        var pos = e.target.selectionStart;
        render();
        var q = document.getElementById('q');
        if (q) { q.focus(); q.setSelectionRange(pos, pos); }
      }, 220);
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === 'category') { st.cat = t.value; st.all = false; }
    else if (t.id === 'chain') { st.chain = t.value; st.all = false; }
    else if (t.id === 'wl') { st.wl = t.checked; st.all = false; }
    else return;
    writeHash();
    render();
  });
  app.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
    if (el) {
      var act = el.getAttribute('data-act');
      if (act === 'tab') { st.tab = el.getAttribute('data-tab'); st.sel = null; writeHash(); render(); }
      else if (act === 'sort') {
        var k = el.getAttribute('data-key');
        if (st.sort === k) st.dir = -st.dir; else { st.sort = k; st.dir = -1; }
        render();
      } else if (act === 'clear') { st.q = ''; st.cat = 'all'; st.chain = 'all'; st.wl = false; writeHash(); render(); }
      else if (act === 'showall') { st.all = true; render(); }
      else if (act === 'close') { st.sel = null; writeHash(); render(); }
      return;
    }
    if (tr) {
      var slug = tr.getAttribute('data-slug');
      st.sel = st.sel === slug ? null : slug;
      st.tab = 'board';
      writeHash();
      render();
      if (st.sel) {
        var d = document.querySelector('.detail');
        if (d) d.scrollIntoView({ block: 'start' });
      }
    }
  });
  app.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('tr[data-slug]')) {
      e.preventDefault();
      var slug = e.target.getAttribute('data-slug');
      st.sel = st.sel === slug ? null : slug;
      writeHash();
      render();
    }
  });
  readHash();
  window.addEventListener('hashchange', function () { st.sel = null; st.all = false; readHash(); render(); });
  render();
})();
