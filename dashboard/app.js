(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', watchlist: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null,
    sandbox: { on: false, growth: DATA.model.growth_weight, floor: DATA.model.maturity_floor, breadth: DATA.model.breadth_weight },
    _firstLoad: true, _entering: false, _lastSlug: null };
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return String(Math.round(n * 10000) / 10000) + 'x'; }
  function fmtUsdFull(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtDate(iso) {
    var d = String(iso).split('-');
    return d.length === 3 ? d[2] + ' ' + MONTHS[parseInt(d[1], 10) - 1] + ' ' + d[0] : String(iso);
  }
  function logoSvg(size, inverted) {
    var ink = inverted ? '#f6f2e9' : '#1d1a16';
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M10 26 A16 16 0 0 1 26 10" fill="none" stroke="' + ink + '" stroke-width="1.25" opacity="0.4" stroke-linecap="butt"/><path d="M6 26 A20 20 0 0 1 26 6" fill="none" stroke="#c2401b" stroke-width="2.5" stroke-linecap="butt"/><line x1="3" y1="26" x2="29" y2="26" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="6" r="2.8" fill="#c2401b"/></svg>';
  }
  var LOGO = logoSvg(28, false);
  function monogramEl(row, large) {
    var initial = (row.name || '?').trim().charAt(0).toUpperCase();
    return el('span', { class: 'mono mono-' + catColor(row.category || 'Other') + (large ? ' lg' : ''), 'aria-hidden': 'true', text: initial });
  }
  function countUp() {
    if (REDUCED) return;
    var els = document.querySelectorAll('[data-count]');
    var start = null;
    function tick(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / 350);
      var e = 1 - Math.pow(1 - t, 3);
      els.forEach(function (node) {
        var target = parseFloat(node.getAttribute('data-count'));
        var v = target * e;
        node.textContent = node.getAttribute('data-count-format') === 'usd-b' ? '$' + v.toFixed(2) + 'B' : String(Math.round(v));
      });
      if (t < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }
  var _filterTimer = null;
  function scheduleFilter() {
    if (REDUCED) { render(); return; }
    if (_filterTimer) clearTimeout(_filterTimer);
    var keep = {};
    shownRows().forEach(function (r) { keep[r.slug] = true; });
    var trs = document.querySelectorAll('tbody tr[data-slug]');
    trs.forEach(function (tr) {
      var slug = tr.getAttribute('data-slug');
      if (!slug) return;
      if (!keep[slug]) tr.classList.add('leaving');
      else tr.classList.remove('leaving');
    });
    _filterTimer = setTimeout(function () { _filterTimer = null; state._entering = true; render(); }, 180);
  }

  function impliedOf(row, model, sb) {
    var m = model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var gw = sb && sb.on ? sb.growth : m.growth_weight;
    var growthMult = 1 + (growth / 100) * gw;
    var age = row.age_days === null || row.age_days === undefined ? m.unknown_age_days : row.age_days;
    var fl = sb && sb.on ? sb.floor : m.maturity_floor;
    var maturity = fl + (1 - fl) * (1 - Math.exp(-Math.max(age, 0) / m.maturity_tau_days));
    var bw = sb && sb.on ? sb.breadth : m.breadth_weight;
    var breadth = Math.min(m.breadth_cap, 1 + bw * Math.log(Math.max(1, (row.chains || []).length)));
    return Math.max(1, Math.round(row.tvl_usd * row.base_multiple * growthMult * maturity * breadth));
  }
  function multsOf(row, sb) {
    var m = DATA.model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var gw = sb && sb.on ? sb.growth : m.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? m.unknown_age_days : row.age_days;
    var fl = sb && sb.on ? sb.floor : m.maturity_floor;
    var bw = sb && sb.on ? sb.breadth : m.breadth_weight;
    return {
      growth: 1 + (growth / 100) * gw,
      maturity: fl + (1 - fl) * (1 - Math.exp(-Math.max(age, 0) / m.maturity_tau_days)),
      breadth: Math.min(m.breadth_cap, 1 + bw * Math.log(Math.max(1, (row.chains || []).length)))
    };
  }
  function driverOf(row, sb) {
    var mm = multsOf(row, sb);
    var cands = [['growth', mm.growth], ['maturity', mm.maturity], ['breadth', mm.breadth]];
    var best = cands[0];
    for (var i = 1; i < cands.length; i++) if (Math.abs(cands[i][1] - 1) > Math.abs(best[1] - 1)) best = cands[i];
    var pct = Math.round((best[1] - 1) * 1000) / 10;
    var pctText = (pct > 0 ? '+' : '') + (Number.isInteger(pct) ? String(pct) : pct.toFixed(1)) + '%';
    return { text: best[0] + ' ' + pctText, kind: best[0] };
  }

  function catColor(cat) {
    var s = cat || 'Other';
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return h % 6;
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 1e9) return 250;
    if (p.tvl_usd >= 1e8) return 150;
    if (p.tvl_usd >= 2.5e7) return 100;
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
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('liquidity manager') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis trading') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('risk') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of " + name + "'s yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('payment') >= 0) return 'Pay $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt.';
    if (c.indexOf('governance') >= 0) return "Deposit $" + capital + " into " + name + "'s governance vault on " + chain + ' and vote once.';
    if (c.indexOf('farm') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s farm on " + chain + ' and keep the position open.';
    if (c.indexOf('anchor btc') >= 0 || c.indexOf('decentralized btc') >= 0) return 'Mint $' + capital + ' of the BTC-pegged asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('cedefi') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c === 'chain') return 'Bridge $' + capital + ' of USDC to ' + chain + " and use it in " + name + "'s app.";
    return 'Put $' + capital + ' of USDC to work in ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    var small = Math.max(10, Math.round(capital / 5));
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow $' + small + ' against the deposit on ' + name + ', then repay it the same week.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('liquidity manager') >= 0) return 'Swap $' + small + ' through ' + name + ' on ' + chain + ' so the wallet shows trading activity as well as liquidity.';
    if (c.indexOf('bridge') >= 0) return 'Bridge a second, smaller amount back through ' + name + ' so the wallet shows two-way use.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis trading') >= 0) return 'Close the hedge on ' + name + ' and open a fresh one half its size, so the wallet shows repeat use.';
    if (c.indexOf('prediction') >= 0) return 'Settle the first market position on ' + name + ' and open a second one on a different market.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('risk') >= 0) return 'Move $' + small + ' into a second ' + name + ' vault on ' + chain + ' to show more than one allocation.';
    if (c.indexOf('governance') >= 0) return 'Vote on a second ' + name + ' proposal and leave a short comment in its forum.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + small + ' of a second yield asset on ' + name + ' on ' + chain + ' so the wallet holds more than one position.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Delegate $' + small + ' to a second validator or operator through ' + name + ' on ' + chain + '.';
    if (c.indexOf('stable') >= 0) return 'Convert $' + small + ' between the stable asset and its wrapped form through ' + name + ' on ' + chain + '.';
    if (c.indexOf('cedefi') >= 0) return 'Move $' + small + ' into a second ' + name + ' vault on ' + chain + ' to show more than one allocation.';
    if (c.indexOf('farm') >= 0) return 'Harvest the farm rewards on ' + name + ' and compound them back into the position.';
    if (c.indexOf('anchor btc') >= 0 || c.indexOf('decentralized btc') >= 0) return 'Redeem $' + small + ' of the BTC-pegged asset through ' + name + ' and mint it again, so the wallet shows two-way use.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + small + ' of cover for a second asset from ' + name + ' on ' + chain + '.';
    if (c.indexOf('payment') >= 0) return 'Pay a second, smaller amount through ' + name + ' on ' + chain + ' so the wallet shows repeat use.';
    if (c.indexOf('crypto card') >= 0) return 'Load $' + small + ' onto the ' + name + ' card and make one small purchase with it.';
    return 'Add $' + small + ' to the position on ' + name + ' so the wallet shows repeat use, not a single deposit.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = gasFor(chain);
    var secondChain = p.chains && p.chains.length > 1 ? p.chains[1] : null;
    var depth = secondChain !== null
      ? { text: 'Repeat the core position on ' + secondChain + ' as well, with about half the capital, so the activity spans two chains.', cost: 'about $' + Math.round(capital / 2) + ' of capital and ' + gas, time: '20 minutes to set up' }
      : { text: 'After two weeks, add $' + Math.max(10, Math.round(capital / 4)) + ' to the position on ' + p.name + ' so the wallet shows growing use, not a single deposit.', cost: 'about $' + Math.max(10, Math.round(capital / 4)) + ' of capital and ' + gas, time: '10 minutes' };
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: gas, time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and ' + gas, time: '15 minutes to set up' },
      { text: secondActionFor(p, capital, chain), cost: 'about $' + Math.max(10, Math.round(capital / 5)) + ' of capital and ' + gas, time: '10 minutes' },
      depth,
      { text: 'Make one qualifying action each week on ' + p.name + ', such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.', cost: gas + ' a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open " + p.name + "'s own points or rewards page and claim only from the link it publishes; never pay a fee to claim and never follow a claim link from a chat or an ad.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  var WATCHLIST = {};
  (DATA.watchlist || []).forEach(function (s) { WATCHLIST[s] = true; });

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('watchlist') === '1') state.watchlist = true;
    if (params.get('tab') === 'live') state.tab = 'live';
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchlist) params.set('watchlist', '1');
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function shownRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.watchlist && !WATCHLIST[r.slug]) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = impliedOf(a, DATA.model, state.sandbox); bv = impliedOf(b, DATA.model, state.sandbox); }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }


  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' },
        el('span', { class: 'logo', html: LOGO }),
        el('span', { class: 'brand-name', text: 'Prelude' }),
        el('span', { class: 'brand-tag', text: 'Pre-token protocols, ranked' })
      ),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + fmtDate(DATA.as_of) + ', from the DefiLlama protocol index — scored by the ' + DATA.model_version + ' model.' })
      )
    );
  }

  function lede() {
    var top = DATA.rows[0];
    return el('section', { class: 'lede' },
      el('h1', { text: 'The launches before the launch.' }),
      el('p', { class: 'dek', html: 'The watchlist names <b>' + DATA.watchlist_size + '</b> protocols to watch. The early radar adds <b>' + DATA.early_size + '</b> more pre-token protocols the watchlist’s own rule would keep, at any TVL — no wrapped, staked or bridged product, no versioned pool, no exchange product. Implied value is a model, not a promise — and not a prediction that a token will launch.' }),
      el('div', { class: 'facts' + (state._firstLoad ? ' stagger-in' : '') },
        el('div', { class: 'fact', style: '--i:0' }, el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size }), el('span', { text: 'Watchlist covered' })),
        el('div', { class: 'fact', style: '--i:1' }, el('b', { text: String(DATA.board_size), 'data-count': String(DATA.board_size), 'data-count-format': 'int' }), el('span', { text: 'Pre-token rows scored' })),
        el('div', { class: 'fact', style: '--i:2' }, el('b', { text: String(DATA.early_size), 'data-count': String(DATA.early_size), 'data-count-format': 'int' }), el('span', { text: 'Early rows found' })),
        el('div', { class: 'fact hot', style: '--i:3' }, el('b', { text: top ? fmtUsd(top.implied_value_usd) : 'n/a', 'data-count': top ? (top.implied_value_usd / 1e9).toFixed(2) : null, 'data-count-format': 'usd-b' }), el('span', { text: 'Top implied value' })),
        el('div', { class: 'fact', style: '--i:4' }, el('b', { text: String(DATA.live_size), 'data-count': String(DATA.live_size), 'data-count-format': 'int' }), el('span', { text: 'Live-token protocols set aside' }))
      )
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); scheduleFilter(); });
    var select = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    select.addEventListener('change', function () { state.category = select.value; writeHash(); scheduleFilter(); });
    var chainSel = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeHash(); scheduleFilter(); });
    var wl = el('label', { class: 'check' },
      el('input', { type: 'checkbox', checked: state.watchlist ? 'checked' : null, onchange: function (e) { state.watchlist = e.target.checked; writeHash(); scheduleFilter(); } }),
      'Watchlist only');
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeHash(); render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), select),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSel),
      wl,
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: state.tab === 'pre-token' ? shownRows().length + ' of ' + DATA.board_size + ' rows shown' : DATA.live.length + ' live-token protocols' })
    );
  }

  function moversStrip() {
    var top3 = DATA.rows.slice(0, 3);
    var withChange = DATA.rows.filter(function (r) { return r.change_7d !== null && r.change_7d !== undefined; });
    var chips = [el('span', { class: 'lab', text: 'Movers' })];
    top3.forEach(function (r, i) {
      chips.push(el('span', { class: 'mv' }, el('span', { class: 'dot' }), el('b', { text: '#' + (i + 1) + ' ' + r.name }), el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })));
    });
    if (withChange.length > 0) {
      var gainer = withChange.reduce(function (a, b) { return b.change_7d > a.change_7d ? b : a; }, withChange[0]);
      var loser = withChange.reduce(function (a, b) { return b.change_7d < a.change_7d ? b : a; }, withChange[0]);
      chips.push(el('span', { class: 'lab', text: '7d' }));
      chips.push(el('span', { class: 'mv' }, el('span', { class: 'dot' }), el('b', { text: gainer.name }), el('span', { class: 'num pos', text: fmtPct(gainer.change_7d) })));
      chips.push(el('span', { class: 'mv' }, el('span', { class: 'dot' }), el('b', { text: loser.name }), el('span', { class: 'num neg', text: fmtPct(loser.change_7d) })));
    }
    return el('div', { class: 'movers' }, chips);
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () {
        if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; }
        var panel = document.querySelector('.panel');
        if (!REDUCED && panel) {
          panel.classList.add('sorting');
          setTimeout(function () { render(); }, 150);
        } else render();
      } },
        label,
        state.sort === key ? el('span', { class: 'sort-arrow' + (state.dir > 0 ? ' asc' : ''), 'aria-hidden': 'true', text: '▾' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(shownRows());
    if (list.length === 0) {
      return el('div', { class: 'panel' + (state._firstLoad ? ' first-load' : '') }, el('div', { class: 'empty' + (state._entering ? ' enter' : ''), style: '--i:0' },
        el('span', { class: 'orn', html: logoSvg(36, false) }),
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchlist = false; writeHash(); render(); } })
      ));
    }
    var max = Math.max.apply(null, list.map(function (r) { return impliedOf(r, DATA.model, state.sandbox); })) || 1;
    var tbody = el('tbody');
    list.forEach(function (r, i) {
      var shown = impliedOf(r, DATA.model, state.sandbox);
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var drv = driverOf(r, state.sandbox);
      var cls = [];
      if (state._entering && i < 8) cls.push('enter');
      var trAttrs = {
        tabindex: '0',
        'data-slug': r.slug,
        onclick: function () { selectDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDetail(r.slug); } }
      };
      if (state._entering && i < 8) trAttrs.style = '--i:' + i;
      var tr = el('tr', trAttrs,
        el('td', { class: 'rank' + (r.rank <= 3 ? ' top3' : ''), text: String(r.rank) }),
        el('td', null, el('div', { class: 'rowid' }, monogramEl(r, false),
          el('div', { class: 'name' },
            el('div', { class: 'name-line' }, el('b', { text: r.name }), el('span', { class: 'rowarrow', 'aria-hidden': 'true', text: '→' })),
            el('span', { class: 'sub' }, el('span', { class: 'catdot cat-' + catColor(r.category || 'Other') }), (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') + (WATCHLIST[r.slug] ? ' · watchlist' : ' · early'))
          )
        )),
        el('td', { class: 'num', title: fmtUsdFull(r.tvl_usd), text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('span', { class: 'num', title: fmtUsdFull(shown), text: fmtUsd(shown) }),
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', r.rank <= 3 ? { class: 'top3', style: 'width:' + Math.max(3, Math.round((shown / max) * 100)) + '%' } : { style: 'width:' + Math.max(3, Math.round((shown / max) * 100)) + '%' })),
          el('span', { class: 'driver ' + drv.kind, text: drv.text })
        )),
        el('td', null, el('span', { class: 'status', text: state.sandbox.on ? 'sandbox' : 'no token' }))
      );
      if (cls.length) tr.className = cls.join(' ');
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' + (state._firstLoad ? ' first-load' : '') },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: state.sandbox.on ? 'Sandbox view: rows re-sorted by recomputed values; Rank is the published rank in board.json. board.json is unchanged.' : 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'rowid' }, monogramEl(r, false),
          el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub' }, el('span', { class: 'catdot cat-' + catColor(r.category || 'Other') }), (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain')))
        )),
        el('td', { class: 'num', title: fmtUsdFull(r.tvl_usd), text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', title: fmtUsdFull(r.mcap_usd), text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: r.mcap_tvl_ratio === null ? 'n/a' : fmtMult(r.mcap_tvl_ratio) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these are the largest live-token protocols. The full live set’s ratios — not just these 24 — are the calibration the pre-token multiples are built from. They are set aside from the pre-token ranking.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    var calib = (DATA.calibration || []).slice().sort(function (a, b) { return b.multiple - a.multiple; });
    var calibRows = calib.slice(0, 12).map(function (c) {
      return el('tr', null,
        el('td', { text: c.category }),
        el('td', { class: 'num', text: String(c.comps) }),
        el('td', { class: 'num', text: fmtMult(c.median_ratio) }),
        el('td', { class: 'num', text: fmtMult(c.multiple) })
      );
    });
    return el('section', { class: 'panel model', id: 'model' },
      el('h2', null, el('span', { class: 'orn', html: logoSvg(20, false) }), 'How implied value is computed'),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked. The base multiple is calibrated, not chosen: it is the category median market-cap-to-TVL ratio of the live-token protocols in this same snapshot, clamped at 3.0x, shrunk toward the global median with 12 pseudo-observations, and capped at 0.50x.' }),
      el('div', { class: 'formula' },
        el('b', { text: 'implied = round( tvl_usd × multiple(category) × growth × maturity × breadth )' }),
        el('div', { text: 'growth = 1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 × ' + m.growth_weight }),
        el('div', { text: 'maturity = ' + m.maturity_floor + ' + ' + (1 - m.maturity_floor).toFixed(2) + ' × (1 − e^(−age_days / ' + m.maturity_tau_days + '))' }),
        el('div', { text: 'breadth = min(' + m.breadth_cap + ', 1 + ' + m.breadth_weight + ' × ln(chains))' })
      ),
      el('h3', { text: 'Calibration: live-token comps in this snapshot' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'calib' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', class: 'num', text: 'Live comps' }), el('th', { scope: 'col', class: 'num', text: 'Median mcap / TVL' }), el('th', { scope: 'col', class: 'num', text: 'Multiple used' }))),
          el('tbody', null, calibRows)
        )
      ),
      el('p', { class: 'note', text: 'Showing the 12 highest multiples of ' + calib.length + ' calibrated categories. Global median market-cap-to-TVL: ' + fmtMult(DATA.global_median) + '. A category with no live comps uses the global median. Age is the time since the protocol was first listed, the best record of how long it has run with no token on record; an unlisted age uses ' + m.unknown_age_days + ' days.' }),
      el('h3', { text: 'Why these weights' }),
      el('p', { class: 'note', text: 'The growth clamp (±' + m.growth_cap + '%) covers the watchlist’s own seven-day range (' + fmtPct(DATA.watchlist_growth_min) + ' to ' + fmtPct(DATA.watchlist_growth_max) + '); the snapshot’s largest weekly move is ' + fmtPct(DATA.max_change_7d) + ', and a week like that is clamped, not believed. The ' + m.growth_weight + ' growth weight is a stated prior — one week of movement should not reprice a stock of TVL one-for-one — and the sandbox lets the reader set it to 0 or 1. The ' + m.maturity_floor + ' maturity floor says age can move value at most ' + Math.round((1 - m.maturity_floor) * 100) + '%; the ' + m.breadth_weight + ' breadth weight says each extra chain adds a little, with diminishing returns, capped at +' + Math.round((m.breadth_cap - 1) * 100) + '%. The ' + m.shrink_k + ' pseudo-observations keep a one-comp category from setting a wild multiple.' }),
      el('p', { class: 'note', text: (function () { var thin = (DATA.calibration || []).filter(function (c) { return c.comps === 1; }).length; return thin > 0 ? thin + ' of ' + calib.length + ' calibrated categories rest on a single live comp; the table shows the count for each, so the reader can weigh them.' : 'Every calibrated category rests on more than one live comp.'; })() }),
      el('h3', { text: 'How stable is the ranking?' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'calib' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'One weight changed' }), el('th', { scope: 'col', class: 'num', text: 'Top 10 kept' }), el('th', { scope: 'col', class: 'num', text: 'Rank correlation' }))),
          el('tbody', null, (DATA.sensitivity || []).map(function (s) {
            return el('tr', null,
              el('td', { text: s.variant }),
              el('td', { class: 'num', text: String(s.top10_kept) + ' / 10' }),
              el('td', { class: 'num', text: s.spearman.toFixed(3) })
            );
          }))
        )
      ),
      el('p', { class: 'note', text: (function () {
        var sens = DATA.sensitivity || [];
        if (sens.length === 0) return 'Sensitivity not computed.';
        var minTop = Math.min.apply(null, sens.map(function (s) { return s.top10_kept; }));
        var minSp = Math.min.apply(null, sens.map(function (s) { return s.spearman; }));
        return 'One weight changed at a time; the rest stay published. Every variant keeps at least ' + minTop + ' of the top 10 and a rank correlation of at least ' + minSp.toFixed(3) + ' — no single prior decides the board.';
      })() }),
      el('h3', { text: 'Limits, stated plainly' }),
      el('p', { class: 'note', html: 'This model scores <b>value if a token launched</b>; it does not estimate the probability a token launches, so it conflates the two — a protocol with a huge implied value may never launch. No backtest is possible from a single snapshot: there is no earlier board to check the ranking against. The constants above are stated priors, not fitted values; the sensitivity table shows how much each one matters.' })
    );
  }

  function sandboxPanel() {
    var sb = state.sandbox;
    function slider(id, label, min, max, step, value, fmt, oninput) {
      var out = el('b', { text: fmt(value) });
      var input = el('input', { type: 'range', id: id, min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
      input.addEventListener('input', function () { var v = parseFloat(input.value); out.textContent = fmt(v); oninput(v); });
      return el('div', { class: 'slider' }, el('label', { for: id }, el('span', { text: label }), out), input);
    }
    var panel = el('section', { class: 'panel sandbox' + (sb.on ? ' on' : '') },
      el('h2', { text: 'Model sandbox — change the weights, watch the board move' }),
      el('p', { class: 'sub', text: 'The same function scores every row; these sliders only change its three weights, live in this page. board.json keeps the published weights.' }),
      el('div', { class: 'sliders' },
        slider('sb-growth', 'Growth weight', 0, 1, 0.05, sb.growth, function (v) { return v.toFixed(2); }, function (v) { sb.growth = v; sb.on = true; render(); }),
        slider('sb-floor', 'Maturity floor', 0.5, 0.9, 0.05, sb.floor, function (v) { return v.toFixed(2); }, function (v) { sb.floor = v; sb.on = true; render(); }),
        slider('sb-breadth', 'Breadth weight', 0, 0.1, 0.01, sb.breadth, function (v) { return v.toFixed(2); }, function (v) { sb.breadth = v; sb.on = true; render(); })
      ),
      el('div', { class: 'sandbox-foot' },
        el('span', { class: 'note', text: sb.on ? 'Sandbox is ON: the board above is re-ranked with your weights. The published board uses growth ' + DATA.model.growth_weight + ', floor ' + DATA.model.maturity_floor + ', breadth ' + DATA.model.breadth_weight + '.' : 'Sandbox is off: the board above uses the published weights.' }),
        el('button', { class: 'button', type: 'button', text: 'Reset to published weights', onclick: function () { state.sandbox = { on: false, growth: DATA.model.growth_weight, floor: DATA.model.maturity_floor, breadth: DATA.model.breadth_weight }; render(); } })
      )
    );
    return panel;
  }

  function footer() {
    return el('footer', { class: 'foot' },
      el('div', { class: 'wordmark' }, el('span', { class: 'logo', html: logoSvg(32, true) }), el('span', { text: 'Prelude' })),
      el('p', null, el('b', { text: 'Read this honestly. ' }), '“No token on record” means the snapshot records no token for the protocol — never that it has none. A protocol on this board may still have a token its record does not carry. Implied value is this entry’s own claim from the snapshot’s figures; it is not a price, not a prediction that a token will launch, and not advice. Farming costs real money and time, and a launch may never come.'),
      el('div', { class: 'foot-links' },
        el('button', { type: 'button', text: 'Back to the board', onclick: function () { backToBoard(); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); } }),
        el('button', { type: 'button', text: 'Top implied value', onclick: function () { selectDetail(DATA.rows[0].slug); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); } }),
        el('button', { type: 'button', text: 'How the model works', onclick: function () {
          var go = function () { var m = document.getElementById('model'); if (m) m.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); };
          if (document.getElementById('model')) go(); else { backToBoard(); go(); }
        } })
      ),
      el('div', { class: 'foot-meta', text: 'Source: DefiLlama protocol index, snapshot ' + DATA.as_of + ' · Model ' + DATA.model_version + ' · ' + DATA.board_size + ' pre-token rows scored' })
    );
  }

  function morphRender() {
    if (!REDUCED && document.startViewTransition) document.startViewTransition(function () { render(); });
    else render();
  }
  function selectDetail(slug) {
    if (!DATA.rows.some(function (r) { return r.slug === slug; })) return;
    if (_filterTimer) { clearTimeout(_filterTimer); _filterTimer = null; }
    var tr = document.querySelector('tr[data-slug="' + slug + '"]');
    if (tr) {
      var nameEl = tr.querySelector('.name-line b');
      var valEl = tr.querySelector('.implied .num');
      if (nameEl) nameEl.style.viewTransitionName = 'prelude-name-' + slug;
      if (valEl) valEl.style.viewTransitionName = 'prelude-value-' + slug;
    }
    state._lastSlug = slug;
    state.selected = slug;
    writeHash();
    morphRender();
  }
  function backToBoard() {
    if (_filterTimer) { clearTimeout(_filterTimer); _filterTimer = null; }
    state.selected = null;
    writeHash();
    if (!REDUCED && document.startViewTransition) {
      document.startViewTransition(function () {
        render();
        var tr = state._lastSlug ? document.querySelector('tr[data-slug="' + state._lastSlug + '"]') : null;
        if (tr) {
          var nameEl = tr.querySelector('.name-line b');
          var valEl = tr.querySelector('.implied .num');
          if (nameEl) nameEl.style.viewTransitionName = 'prelude-name-' + state._lastSlug;
          if (valEl) valEl.style.viewTransitionName = 'prelude-value-' + state._lastSlug;
        }
      });
    } else render();
  }

  function detailPage(row) {
    var steps = farmSteps(row);
    var shown = impliedOf(row, DATA.model, state.sandbox);
    var mm = multsOf(row, state.sandbox);
    var comps = DATA.live.filter(function (l) { return l.category === row.category; }).slice(0, 4);
    var calib = (DATA.calibration || []).filter(function (c) { return c.category === (row.category || 'Other'); })[0];
    var share = calib && calib.total_tvl > 0 ? (row.tvl_usd / calib.total_tvl * 100).toFixed(1) + '% of ' + (row.category || 'Other') + ' TVL' : null;
    var why = 'TVL ' + fmtUsd(row.tvl_usd) + ' at a ' + fmtMult(row.base_multiple) + ' category multiple' +
      (calib ? ' from ' + calib.comps + ' live comp' + (calib.comps === 1 ? '' : 's') + ' in ' + (row.category || 'Other') : '') +
      ', seven-day growth ' + fmtPct(row.change_7d) + ', ' + fmtAge(row.age_days) + ' with no token on record, on ' + (row.chains || []).length + ' chain' + ((row.chains || []).length === 1 ? '' : 's') + '.';
    var drv = driverOf(row, state.sandbox);
    var page = el('div', { class: 'detail' },
      el('button', { class: 'back', type: 'button', text: '← Back to the board', onclick: backToBoard }),
      el('p', { class: 'kicker' }, el('span', { class: 'dot' }), 'Rank ' + row.rank + ' of ' + DATA.board_size + (WATCHLIST[row.slug] ? ' · watchlist' : ' · early find')),
      el('div', { class: 'cascade', style: '--i:0' },
        el('div', { class: 'detail-head' }, monogramEl(row, true), el('h1', { style: 'view-transition-name: prelude-name-' + row.slug, text: row.name })),
        el('p', { class: 'sub' }, el('span', { class: 'catdot cat-' + catColor(row.category || 'Other') }), (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain')),
        el('div', { class: 'detail-driver' }, el('span', { class: 'driver ' + drv.kind, text: drv.text }))
      ),
      el('div', { class: 'glance cascade', style: '--i:1' },
        el('div', null, el('b', { text: '$' + capitalFor(row) }), el('span', { text: 'Capital to farm' })),
        el('div', null, el('b', { text: gasFor(chainOf(row)).replace(' of gas', '') }), el('span', { text: 'Gas per action' })),
        el('div', null, el('b', { text: holdDaysFor(row.age_days) + ' days' }), el('span', { text: 'Hold at least' })),
        el('div', null, el('b', { text: String(steps.length) + ' steps' }), el('span', { text: 'Farm plan' }))
      ),
      el('section', { class: 'detail-section cascade', style: '--i:2' },
        el('h2', { text: 'Implied value' }),
        el('div', { class: 'equation' },
          el('div', { class: 'eq-cell' }, el('span', { text: 'TVL' }), el('b', { text: fmtUsd(row.tvl_usd) }), share ? el('span', { class: 'eq-sub', text: share }) : null),
          el('div', { class: 'eq-cell' }, el('span', { text: 'Category multiple' }), el('b', { text: fmtMult(row.base_multiple) })),
          el('div', { class: 'eq-cell' }, el('span', { text: 'Seven-day growth' }), el('b', { text: fmtPct(row.change_7d) + ' → ' + fmtMult(mm.growth) })),
          el('div', { class: 'eq-cell' }, el('span', { text: 'Age, no token' }), el('b', { text: fmtAge(row.age_days) + ' → ' + fmtMult(mm.maturity) })),
          el('div', { class: 'eq-cell' }, el('span', { text: 'Chains' }), el('b', { text: String((row.chains || []).length) + ' → ' + fmtMult(mm.breadth) }))
        ),
        el('div', { class: 'eq-total' }, el('span', { text: 'Implied value' }), el('b', { style: 'view-transition-name: prelude-value-' + row.slug, text: fmtUsdFull(shown) + '  (' + fmtUsd(shown) + ')' })),
        el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(impliedOf(row, DATA.model, { on: false })) + (impliedOf(row, DATA.model, { on: false }) === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' }),
        el('p', { class: 'why' }, el('b', { text: 'Why this rank: ' }), why)
      )
    );
    if (comps.length > 0) {
      page.appendChild(el('section', { class: 'detail-section cascade', style: '--i:3' },
        el('h2', { text: 'Live comps in ' + (row.category || 'Other') }),
        el('div', { class: 'comps' }, comps.map(function (l) {
          return el('div', null, el('span', { text: l.name }), el('b', { class: 'num', text: l.mcap_tvl_ratio === null ? 'n/a' : fmtMult(l.mcap_tvl_ratio) + ' mcap / TVL' }));
        }))
      ));
    }
    page.appendChild(el('section', { class: 'detail-section cascade', style: '--i:4' },
      el('h2', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s, i) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null,
          el('span', { class: 'step-num', text: String(i + 1) }),
          el('div', null, el('b', { text: action }), tail ? el('span', { class: 'meta', text: tail }) : null)
        );
      }))
    ));
    return page;
  }

  function boardView() {
    var view = el('div', null);
    view.appendChild(lede());
    view.appendChild(controls());
    if (state.tab === 'pre-token') view.appendChild(moversStrip());
    view.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') {
      view.appendChild(modelPanel());
      view.appendChild(sandboxPanel());
    }
    return view;
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(el('div', { class: 'doublerule', 'aria-hidden': 'true' }));
    if (state.selected) {
      var row = DATA.rows.filter(function (r) { return r.slug === state.selected; })[0];
      if (row) shell.appendChild(detailPage(row));
      else { state.selected = null; shell.appendChild(boardView()); }
    } else {
      shell.appendChild(boardView());
    }
    shell.appendChild(el('div', { class: 'doublerule', 'aria-hidden': 'true' }));
    shell.appendChild(footer());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (state._firstLoad) { countUp(); state._firstLoad = false; }
    state._entering = false;
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.selected) backToBoard();
  });
})();
