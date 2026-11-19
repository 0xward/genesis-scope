// Genesis Scope, model radar-3. A static page, no framework and no network: it reads
// data.js and renders the board, detail views, live comps and method. The model lives
// in this file too — impliedOf recomputes every row from the row's own figures — so
// the screenshots, the code and the board agree. Aurora layout: sidebar, hero, KPI
// strip, ranking table + right rail; detail panel above the table.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) return;
  var app = document.getElementById('board');
  var st = { q: '', cat: 'all', chain: 'all', wl: false, tab: 'board', sort: 'implied', dir: -1, sel: null, all: false, w: null, view: 'pre' };
  var WL = {};
  (D.watchlist || []).forEach(function (s) { WL[s] = true; });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // The model, in the page: impliedOf recomputes a row from its own figures
  // (TVL, 7d, age, chains, category) — fitted comps curve, then launch propensity.
  var TILT={"Basis Trading":0.11508138849673386,"CDP":-0.024778394247132404,"Chain":0.09714260784008497,"Cross Chain Bridge":0.14176559338411923,"Derivatives":0.11357600035478618,"Dexs":0.04704905192861132,"Dual-Token Stablecoin":-0.07897101311051744,"Indexes":-0.13642819925904395,"Lending":-0.12265805417396351,"Leveraged Farming":0.0035635928957565475,"Liquidity Manager":-0.16640190538739516,"Onchain Capital Allocator":-0.11683001809779822,"Payments":-0.10614713648367644,"Prediction Market":0.3133972413123715,"RWA":0.09476199721125672,"Restaking":0.008259544467571444,"Risk Curators":0.09156211617053106,"Staking Pool":-0.24410347460518106,"Yield":-0.03718497443750145,"Yield Aggregator":-0.1144913850304885};
  var PW=[0.18585949107641508,0.26901530532368956,0.5208830554662487,0.4784930615887185,-1.010331910310649,-0.1154437012935233,0.0299123603667782,-0.24026896967422723,-0.06351594668230279,-0.7031636283637528,0.008120429283718329,-0.048186987529446654,0.2370437755555151,0.23318521233346168,-0.16962691005244704,-0.25888718685490736,-0.08200739791488162,-0.4999752633641459,-0.08258663833481361,0.03852829132398957,0.020831090741363877];
  var PMU=[7.702070502697378,1.7446344019951552,5.047493403693931,-0.004887901055409026,13.46894552324608,0.027704485488126648,0.07255936675461741,0.026385224274406333,0.07387862796833773,0.04221635883905013,0.03430079155672823,0.13060686015831136,0.09894459102902374,0.10290237467018469,0.03825857519788918,0.04353562005277045,0.051451187335092345,0.014511873350923483,0.051451187335092345,0.030343007915567283];
  var PSD=[0.785123612633641,1.4377935381139075,10.897961020438139,1.6224881627205465,11.324107854059328,0.16412479085124348,0.25941184446895565,0.16027802161992075,0.2615732713750684,0.2010824156544355,0.18200067927156352,0.33696989218311024,0.2985876068009594,0.3038313281368815,0.19181985460769244,0.20405947623031573,0.22091618921415,0.11958795458895649,0.22091618921414974,0.1715293263153661];
  var PBIG=["Basis Trading","Bridge","CDP","CEX","Canonical Bridge","Derivatives","Dexs","Lending","Liquid Staking","Onchain Capital Allocator","RWA","Risk Curators","Staking Pool","Yield","Yield Aggregator"];
  function impliedOf(r,w){
    w=w||{};
    var gw=w.gw===undefined?0.5:w.gw,tau=w.tau===undefined?365:w.tau,bw=w.bw===undefined?0.05:w.bw;
    var lt=Math.log10(Math.max(1,r.tvl_usd));
    var tilt=TILT[r.category||'Other']||0;
    var fitted=Math.pow(10,3.3823+0.4721*lt+tilt);
    var g=Math.min(30,Math.max(-30,r.change_7d===null||r.change_7d===undefined?0:r.change_7d));
    var gm=1+(g/100)*gw;
    var age=r.age_days===null||r.age_days===undefined?365:r.age_days;
    var mm=0.7+0.3*(1-Math.exp(-Math.max(age,0)/tau));
    var bm=Math.min(1.2,1+bw*Math.log(Math.max(1,r.chains.length)));
    var cond=Math.max(1,Math.round(fitted*gm*mm*bm));
    var ay=(r.age_days||0)/365;
    var x=[lt,ay,r.chains.length,(r.change_7d||0)/100,ay*lt];
    for(var i=0;i<PBIG.length;i++)x.push((r.category||'Other')===PBIG[i]?1:0);
    var z=PW[0];
    for(var j=0;j<x.length;j++)z+=PW[j+1]*((x[j]-PMU[j])/PSD[j]);
    var p=1/(1+Math.exp(-z));
    return{implied:Math.max(1,Math.round(p*cond)),conditional:cond,fitted:fitted,propensity:p,growthMult:gm,maturityMult:mm,breadthMult:bm,tilt:tilt};
  }
  // eff: the value the board ranks by (published model, or sandbox weights in st.w).
  function eff(r){return st.w?impliedOf(r,st.w).implied:r.implied_value_usd;}
  function etop(){if(!st.w)return D.rows.slice(0,10);return D.rows.slice().sort(function(a,b){var d=eff(b)-eff(a);return d?d:(a.slug<b.slug?-1:1);}).slice(0,10);}
  function driver(m){
    var c=[['growth',m.growthMult-1],['maturity',m.maturityMult-1],['breadth',m.breadthMult-1]];
    var best=c[0];
    for(var i=1;i<c.length;i++)if(Math.abs(c[i][1])>Math.abs(best[1]))best=c[i];
    return best[0]+' '+(best[1]>=0?'+':'')+(best[1]*100).toFixed(1)+'%';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bad(n) {
    return n === null || n === undefined || !isFinite(n);
  }
  function usd(n) {
    if (bad(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function full(n) {
    if (bad(n)) return 'n/a';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function money(n) {
    if (bad(n)) return 'n/a';
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    return sign + '$' + (a >= 1000 ? Math.round(a).toLocaleString('en-US') : a.toFixed(2));
  }
  function pct(n) {
    if (bad(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }
  function date(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0] : String(iso);
  }
  function logo(size) {
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M10 26 A16 16 0 0 1 26 10" fill="none" style="stroke:var(--ink)" stroke-width="1.25" opacity="0.4"/><path d="M6 26 A20 20 0 0 1 26 6" fill="none" style="stroke:var(--signal)" stroke-width="2.5"/><line x1="3" y1="26" x2="29" y2="26" style="stroke:var(--ink)" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="6" r="2.8" style="fill:var(--signal)"/></svg>';
  }

  function scen(r, sharePct) {
    var alloc = (sharePct / 100) * r.implied_value_usd;
    var net = alloc - r.farm_cost_usd;
    return { share: sharePct, alloc: alloc, net: net, perHour: r.farm_hours > 0 ? net / r.farm_hours : 0 };
  }
  function csv() {
    var lv = st.view === 'live';
    var q = function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var rows = sorted(shown()).map(function (r, i) {
      var a = lv ? [i + 1, r.name, r.category, (r.chains || []).join(';'), r.tvl_usd, r.mcap_usd, r.mcap_tvl_ratio, r.change_7d] : [r.rank, r.name, r.category, (r.chains || []).join(';'), r.tvl_usd, r.change_7d, eff(r), r.rank_lo, r.rank_hi, r.farm_cost_usd, r.farm_per_hour_usd];
      return a.map(q).join(',');
    });
    return (lv ? 'rank,protocol,category,chains,tvl_usd,mcap_usd,mcap_tvl_ratio,change_7d\n' : 'rank,protocol,category,chains,tvl_usd,change_7d,implied_value_usd,rank_lo,rank_hi,farm_cost_usd,farm_per_hour_usd\n') + rows.join('\n') + '\n';
  }

  function rhash() {
    var p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (p.get('q')) st.q = p.get('q');
    if (p.get('cat')) st.cat = p.get('cat');
    if (p.get('chain')) st.chain = p.get('chain');
    if (p.get('wl') === '1') st.wl = true;
    if (p.get('v') === 'live') st.view = 'live';
    if (p.get('s')) st.sort = p.get('s');
    if (p.get('d') === '1') st.dir = 1;
    var gw = parseFloat(p.get('gw') || '0.5'), tau = parseInt(p.get('tau') || '365', 10), bw = parseFloat(p.get('bw') || '0.05');
    if (gw !== 0.5 || tau !== 365 || bw !== 0.05) st.w = { gw: gw, tau: tau, bw: bw };
    if (p.get('tab') === 'live' || p.get('tab') === 'method') st.tab = p.get('tab');
    if (p.get('p')) st.sel = p.get('p');
  }
  function whash() {
    var p = new URLSearchParams();
    if (st.q) p.set('q', st.q);
    if (st.cat !== 'all') p.set('cat', st.cat);
    if (st.chain !== 'all') p.set('chain', st.chain);
    if (st.wl) p.set('wl', '1');
    if (st.view === 'live') p.set('v', 'live');
    if (st.sort !== 'implied') p.set('s', st.sort);
    if (st.dir === 1) p.set('d', '1');
    if (st.w) { p.set('gw', st.w.gw); p.set('tau', st.w.tau); p.set('bw', st.w.bw); }
    if (st.tab !== 'board') p.set('tab', st.tab);
    if (st.sel) p.set('p', st.sel);
    var s = p.toString();
    window.history.replaceState(null, '', s ? '#' + s : window.location.pathname + window.location.search);
  }
  function shown() {
    var q = st.q.trim().toLowerCase();
    return (st.view === 'live' ? D.live : D.rows).filter(function (r) {
      if (st.cat !== 'all' && (r.category || 'Other') !== st.cat) return false;
      if (st.chain !== 'all' && (r.chains || []).indexOf(st.chain) < 0) return false;
      if (st.wl && !WL[r.slug]) return false;
      if (!q) return true;
      return [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function sorted(list) {
    var k = st.sort, lv = st.view === 'live';
    if (lv && (k === 'cost' || k === 'perhour')) k = 'implied';
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (k === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (k === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (k === 'cost') { av = a.farm_cost_usd; bv = b.farm_cost_usd; }
      else if (k === 'perhour') { av = a.farm_per_hour_usd; bv = b.farm_per_hour_usd; }
      else if (k === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (k === 'rank') { av = lv ? list.indexOf(a) : a.rank; bv = lv ? list.indexOf(b) : b.rank; }
      else { av = lv ? a.mcap_usd : eff(a); bv = lv ? b.mcap_usd : eff(b); }
      if (av < bv) return -st.dir;
      if (av > bv) return st.dir;
      return a.slug < b.slug ? -1 : 1;
    });
  }
  function bySlug(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }

  function anav() {
    if (st.tab === 'method') return 'method';
    if (st.tab === 'live') return 'live';
    if (st.wl) return 'watchlist';
    if (st.sort === 'perhour') return 'farm';
    return 'overview';
  }
  function nav(key, label, hint) {
    var on = anav() === key;
    return '<button data-act="nav" data-nav="' + key + '" class="nav-item' + (on ? ' active' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="nav-label">' + label + '</span>' + (hint ? '<span class="nav-hint">' + hint + '</span>' : '') + '</button>';
  }
  function sidebarHtml() {
    return '<aside class="side"><div class="side-brand"><span>' + logo(30) + '</span><span><span class="brand-name">Genesis Scope</span><span class="brand-tag">Pre-token protocols, ranked</span></span></div>' +
      '<nav class="side-nav" aria-label="Board">' +
      nav('overview', 'Overview', 'Ranked by implied value') +
      nav('watchlist', 'Watchlist', D.watchlist_size + ' protocols') +
      nav('farm', 'Farm Plans', 'Sorted by $/hour') +
      nav('method', 'Methodology', 'Model &amp; validation') +
      nav('live', 'Live comps', D.live.length + ' priced protocols') +
      '</nav>' +
      '<div class="side-foot"><div class="rec"><span>File</span> Nº 03 · ' + esc(D.model_version) + '</div><div class="rec"><span>Snapshot</span> ' + date(D.as_of) + '</div><div class="rec"><span>Model</span> fitted comps curve, validated</div></div></aside>';
  }

  function hchart() {
    var top = etop();
    var W = 460, H = 216, L = 46, R = 12, T = 16, B = 26;
    var max = eff(top[0]) * 1.08;
    var X = function (i) { return L + i * (W - L - R) / 9; };
    var Y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var grid = '';
    [0, 1e7, 2e7, 3e7, 4e7].forEach(function (v) {
      grid += '<line class="hgrid" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y(v).toFixed(1) + '"/><text class="htick" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + usd(v) + '</text>';
    });
    var pts = top.map(function (r, i) { return [X(i), Y(eff(r))]; });
    var line = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L');
    var area = line + ' L' + pts[9][0].toFixed(1) + ',' + Y(0).toFixed(1) + ' L' + pts[0][0].toFixed(1) + ',' + Y(0).toFixed(1) + ' Z';
    var dots = pts.map(function (p, i) {
      return '<circle class="hdot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>';
    }).join('');
    var xlab = top.map(function (r, i) {
      return '<text class="htick" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">#' + (i + 1) + '</text>';
    }).join('');
    var lab = '<text class="hlab" x="' + (pts[0][0] + 8).toFixed(1) + '" y="' + (pts[0][1] - 8).toFixed(1) + '">' + usd(eff(top[0])) + '</text>';
    return '<svg class="hero-chart-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="heroGrad" x2="0" y2="1"><stop style="stop-color:var(--accent);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
      grid + '<path class="harea" d="' + area + '" fill="url(#heroGrad)"/>' +
      '<path class="hline" d="' + line + '" fill="none"/>' + dots + xlab + lab + '</svg>' +
      '<p class="chart-cap">Top 10 by implied value · linear scale · ' + (st.w ? esc(top[0].name) + ' leads the re-ranked board' : '#' + top[0].rank + ' ' + esc(top[0].name) + ' leads') + '; #10 is ' + usd(eff(top[9])) + '.</p>';
  }
  function hero() {
    var top = st.w ? etop()[0] : D.rows[0];
    var topVal = top ? eff(top) : null, topP = top ? (st.w ? impliedOf(top, st.w).propensity : top.launch_propensity) : 0;
    var a = D.accounting;
    return '<section class="hero"><div class="hero-copy">' +
      '<p class="eyebrow"><span class="mark">' + logo(13) + '</span>01 — The board</p>' +
      '<h1>The <span class="acc-word">launches</span> before the launch.</h1>' +
      '<p class="dek">The watchlist names <b>' + D.watchlist_size + '</b> protocols to watch. The early radar adds <b>' + D.early_size + '</b> more the watchlist’s own rule would keep, at any TVL — no wrapped, staked or bridged product, no versioned pool, no exchange product. Every implied value below is this entry’s own claim from the snapshot’s figures: an expected value — the value if a token launches, times the fitted chance one is recorded — a model, not a promise.</p></div>' +
      '<aside class="hero-chart"><div class="chart-head"><div><span class="chart-label">Top implied value</span><b class="hero-num pos">' + usd(topVal) + '</b></div>' +
      '<span class="chart-sub">' + esc(top ? top.name : '') + ' · <span class="prop">P ' + Math.round(topP * 100) + '%</span> · TVL ' + usd(top ? top.tvl_usd : null) + '</span></div>' +
      hchart() + '</aside></section>' +
      '<div class="facts">' +
      '<div class="fact"><b>' + a.total + '</b><span>Total protocols in the snapshot</span></div>' +
      '<div class="fact"><b class="pos">' + D.watchlist_size + ' / ' + D.watchlist_size + '</b><span>Watchlist covered</span></div>' +
      '<div class="fact"><b class="pos">' + usd(topVal) + '</b><span>Top implied value</span></div>' +
      '<div class="fact"><b class="pos">' + D.board_size + '</b><span>Farm plans — one per row</span></div>' +
      '</div>' +
      '<p class="note acct">Accounting: ' + a.total + ' protocols in the snapshot — ' + a.live_with_mcap + ' with a market cap set aside, ' + a.token_recorded_no_mcap + ' record a token but no market cap, ' + a.no_token_record + ' record no token. Of those, ' + a.excluded_category + ' fall in an excluded category, ' + a.excluded_versioned + ' are versioned pools, ' + a.excluded_wrapped_word + ' are wrapped or staked products — leaving ' + a.rankable + ' ranked rows.</p>';
  }

  function th(key, label, cls) {
    var arrow = st.sort === key ? (st.dir > 0 ? ' ▴' : ' ▾') : '';
    return '<th' + (cls ? ' class="' + cls + '"' : '') + '><button data-act="sort" data-key="' + key + '" class="sortbtn">' + label + arrow + '</button></th>';
  }
  function ctrl() {
    var cats = Array.from(new Set(D.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var ch = Array.from(new Set(D.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var opts = function (list, cur, allLabel) {
      return '<option value="all"' + (cur === 'all' ? ' selected' : '') + '>' + allLabel + '</option>' + list.map(function (c) {
        return '<option value="' + esc(c) + '"' + (cur === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('');
    };
    var sh = st.tab === 'board' ? (st.view === 'live' ? shown().length + ' of ' + D.live.length + ' live rows shown' : shown().length + ' of ' + D.board_size + ' rows shown') : st.tab === 'live' ? D.live.length + ' live-token protocols' : 'Method, validation and accounting';
    return '<div class="controls">' +
      '<div class="seg"><button data-act="view" data-view="pre" class="' + (st.view === 'pre' ? 'on' : '') + '">Pre-token (' + D.board_size + ')</button><button data-act="view" data-view="live" class="' + (st.view === 'live' ? 'on' : '') + '">Live token (' + D.live.length + ')</button></div>' +
      '<div class="field"><label for="q">Search</label><input type="search" id="q" value="' + esc(st.q) + '"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category">' + opts(cats, st.cat, 'All categories') + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain">' + opts(ch, st.chain, 'All chains') + '</select></div>' +
      '<label class="check"><input type="checkbox" id="wl"' + (st.wl ? ' checked' : '') + '> Watchlist only</label>' +
      '<button class="button" data-act="csv">Download CSV</button>' +
      '<span class="count">' + sh + '</span></div>';
  }
  function donut() {
    var tot = 0, byCat = {};
    D.rows.forEach(function (r) { tot += r.implied_value_usd; byCat[r.category || 'Other'] = (byCat[r.category || 'Other'] || 0) + r.implied_value_usd; });
    var cats = Object.keys(byCat).map(function (c) { return { c: c, v: byCat[c] }; }).sort(function (a, b) { return b.v - a.v; });
    var top = cats.slice(0, 5), restV = 0;
    cats.slice(5).forEach(function (s) { restV += s.v; });
    var segs = top.concat(restV > 0 ? [{ c: 'Other', v: restV }] : []);
    var SEGS = ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];
    var C = 2 * Math.PI * 54, off = 0;
    var circles = segs.map(function (s, i) {
      var len = s.v / tot * C;
      var str = '<circle class="dseg" r="54" cx="70" cy="70" stroke="' + SEGS[i] + '" stroke-dasharray="' + len.toFixed(1) + ' ' + (C - len).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '"/>';
      off += len;
      return str;
    }).join('');
    var legend = segs.map(function (s, i) {
      return '<div class="lg-row"><span class="sw" style="background:' + SEGS[i] + '"></span><span class="lg-name">' + esc(s.c) + '</span><span class="lg-share">' + Math.round(s.v / tot * 100) + '%</span><span class="lg-val pos">' + usd(s.v) + '</span></div>';
    }).join('');
    return '<div class="card donut-card"><h3>Allocation by category</h3><p class="card-sub">Share of total implied value, by category — whole board, ignores the filter</p>' +
      '<div class="donut-wrap"><svg class="donut" viewBox="0 0 140 140"><g transform="rotate(-90 70 70)">' + circles + '</g>' +
      '<text class="donut-total pos" x="70" y="66" text-anchor="middle">' + usd(tot) + '</text><text class="donut-cap" x="70" y="84" text-anchor="middle">total implied</text></svg></div>' +
      '<div class="legend">' + legend + '</div></div>';
  }
  function rail() {
    return '<div class="rail">' + donut() +
      '<div class="card note-card"><h3>Read this first</h3><p>Lido: <b>$18.7B</b> TVL, <b>$251M</b> mcap. Flat ratio says <b>$4.6B</b>; the curve says $251M. That gap is the whole model.</p></div></div>';
  }
  function chains(r) {
    var cs = (r.chains || []).slice();
    if (st.chain !== 'all') cs = [st.chain].concat(cs.filter(function (c) { return c !== st.chain; }));
    return cs.slice(0, 2).join(', ') || 'an unnamed chain';
  }
  function nameCell(r, tail, arrow) {
    return '<div class="rowid"><span class="mono">' + esc((r.name || '·')[0]) + '</span><div><div class="name"><b>' + esc(r.name) + '</b>' + (arrow ? '<span class="rowarrow"> →</span>' : '') + '</div><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(chains(r)) + tail + '</span></div></div>';
  }
  function liveBoard(list) {
    var rows = list.map(function (p, i) {
      var gc = p.change_7d === null ? '' : p.change_7d >= 0 ? 'pos' : 'neg';
      return '<tr class="plain"><td class="rank">' + (i + 1) + '</td>' +
        '<td>' + nameCell(p, '', false) + '</td>' +
        '<td><span class="tok">Live</span></td>' +
        '<td class="num">' + usd(p.tvl_usd) + '</td>' +
        '<td class="num">' + usd(p.mcap_usd) + '</td>' +
        '<td class="num">' + (p.mcap_tvl_ratio === null ? 'n/a' : p.mcap_tvl_ratio.toFixed(3) + '×') + '</td>' +
        '<td class="num ' + gc + '">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
    return '<div class="panel"><div class="scrollx wide"><table><thead><tr>' + th('rank', '#') + th('name', 'Protocol') + '<th>Token</th>' + th('tvl', 'TVL', 'num') + th('implied', 'Market cap', 'num') + '<th class="num">Mcap / TVL</th>' + th('growth', '7d', 'num') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<p class="note" style="margin-top:10px">The ' + D.live.length + ' largest live-token protocols by market cap, shown with the market’s own values — never mixed into the ranked board. The curve is fitted on ' + D.curve.comps + ' live comps (CEX excluded).</p>';
  }
  function board() {
    var list = sorted(shown());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><span class="mark">' + logo(28) + '</span><h2>No protocol matches that filter</h2><p>Clear the search or pick another category to see the board again.</p><button class="button primary" data-act="clear">Clear filters</button></div></div>';
    }
    if (st.view === 'live') return liveBoard(list);
    var max = eff(list[0]) || 1;
    var neg = D.rows.filter(function (r) { return r.farm_per_hour_usd < 0; }).length;
    var show = st.all ? list : list.slice(0, 50);
    var banner = st.w ? '<p class="note sbx-on">Sandbox weights on — this board is re-ranked by the recomputed model. <button class="button" data-act="sbxreset">Reset</button></p>' : '';
    var rows = show.map(function (r) {
      var m = impliedOf(r, st.w);
      var g = r.change_7d === null ? 'n/a' : pct(r.change_7d);
      var gc = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var w = Math.max(3, Math.round((m.implied / max) * 100));
      var perHour = r.farm_per_hour_usd;
      var phCls = perHour >= 0 ? 'pos' : 'neg';
      return '<tr data-slug="' + esc(r.slug) + '" tabindex="0"' + (st.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td>' + nameCell(r, WL[r.slug] ? ' · watchlist' : ' · early', true) + '</td>' +
        '<td><span class="tok">Pre-token</span></td>' +
        '<td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num ' + gc + '">' + g + '</td>' +
        '<td><div class="implied"><span class="num pos">' + usd(m.implied) + '</span><div class="bar"><i style="width:' + w + '%"></i></div><span class="drv">' + driver(m) + '</span></div></td>' +
        '<td class="num range">#' + r.rank_lo + '–' + r.rank_hi + '<br><span class="range">' + usd(r.value_lo_usd) + '–' + usd(r.value_hi_usd) + '</span></td>' +
        '<td class="num" title="Gas bill for the whole farm">$' + r.farm_cost_usd.toFixed(2) + '</td>' +
        '<td class="num ' + phCls + '" title="Net $/hour at a 0.001% allocation of implied value">' + money(perHour) + '</td></tr>';
    }).join('');
    var more = (!st.all && list.length > 50) ? '<button class="button showall" data-act="showall">Show all ' + list.length + ' rows</button>' : '';
    return banner + '<div class="panel"><div class="scrollx wide"><table><thead><tr>' + th('rank', '#') + th('name', 'Protocol') + '<th>Token</th>' + th('tvl', 'TVL', 'num') + th('growth', '7d', 'num') + th('implied', 'Implied value', 'num') + '<th class="num">Rank range</th>' + th('cost', 'Farm $', 'num') + th('perhour', '$/hr', 'num') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' + more +
      '<p class="note" style="margin-top:10px">' + neg + ' of the ' + D.board_size + ' rows net negative $/hour at the 0.001% allocation — the tail is not worth farming. Rank range and 80% band come from 200 bootstrap refits (seeded, reproducible). Farm $ is the whole farm’s gas bill; $/hour is net of that bill at a 0.001% allocation — one farmer’s share if 10% of the supply is split among 10,000 farmers. Click a row for the detail view, farm plan and break-even.</p>';
  }
  function detail() {
    var r = bySlug(st.sel);
    if (!r) return '';
    var m = impliedOf(r, st.w);
    var cal = null;
    for (var i = 0; i < D.calibration.length; i++) if (D.calibration[i].category === (r.category || 'Other')) cal = D.calibration[i];
    var lo = Math.max(0, (r.rank_lo / D.board_size) * 100), hi = Math.min(100, (r.rank_hi / D.board_size) * 100), at = (r.rank / D.board_size) * 100;
    var beN = r.farm_cost_usd > 0 ? Math.round(r.implied_value_usd / r.farm_cost_usd) : 0;
    var sc = [0.001, 0.005, 0.01].map(function (s) { return scen(r, s); });
    var ch = r.chains || [];
    var chainTxt = ch.length > 3 ? ch.slice(0, 3).join(', ') + ' + ' + (ch.length - 3) + ' more' : (ch.join(', ') || 'an unnamed chain');
    var steps = r.farm_step_parts.map(function (s) {
      return '<li>' + esc(s.text) + '<span class="cost">Cost: ' + esc(s.cost) + '. Time: ' + esc(s.time) + '.</span></li>';
    }).join('');
    var g7 = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
    var phCls = r.farm_per_hour_usd >= 0 ? 'pos' : 'neg';
    return '<section class="panel detail" aria-label="Protocol detail"><div class="inner">' +
      '<div class="detail-head"><p class="eyebrow"><span class="mark">' + logo(13) + '</span>Detail · #' + r.rank + ' of ' + D.board_size + '</p><span class="btns"><button class="button" data-act="nav" data-nav="farm">Farm plans</button><button class="button" data-act="close">Close</button></span></div>' +
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="kicker">' + esc(r.category || 'Other') + ' · ' + esc(chainTxt) + ' · ' + (WL[r.slug] ? 'watchlist' : 'early') + ' · listed ' + (r.listed_at ? date(r.listed_at) : 'date unknown') + ' (' + fmtAge(r.age_days) + ') · TVL ' + full(r.tvl_usd) + ' · 7d <span class="' + g7 + '">' + pct(r.change_7d) + '</span></p>' +
      '<div class="bandbar" title="Bootstrap rank range #' + r.rank_lo + '–#' + r.rank_hi + ' · 80% value band ' + usd(r.value_lo_usd) + '–' + usd(r.value_hi_usd) + '"><i style="left:' + lo.toFixed(1) + '%;width:' + Math.max(0.6, hi - lo).toFixed(1) + '%"></i><b style="left:' + at.toFixed(1) + '%"></b></div>' +
      '<p class="note">Rank ' + r.rank + ' of ' + D.board_size + ' · bootstrap rank range #' + r.rank_lo + '–' + r.rank_hi + ' · 80% value band ' + usd(r.value_lo_usd) + '–' + usd(r.value_hi_usd) + '.</p>' +
      '<p class="note">Recomputed from the row’s own figures by impliedOf: <b class="pos">' + full(m.implied) + '</b> — ' + (st.w ? 'sandbox weights; published value ' + full(r.implied_value_usd) : 'matches the board') + '. Driver: ' + driver(m) + '.</p>' +
      '<div class="cols"><div><h3>How the value is built</h3><table class="kv">' +
      '<tr><td>Fitted base (curve)</td><td class="pos">' + full(m.fitted) + '</td></tr>' +
      '<tr><td>Category tilt</td><td>' + (m.tilt >= 0 ? '+' : '') + m.tilt.toFixed(4) + ' dex</td></tr>' +
      '<tr><td>Growth multiplier</td><td>' + m.growthMult.toFixed(4) + '×</td></tr>' +
      '<tr><td>Maturity multiplier</td><td>' + m.maturityMult.toFixed(4) + '×</td></tr>' +
      '<tr><td>Breadth multiplier</td><td>' + m.breadthMult.toFixed(4) + '×</td></tr>' +
      '<tr><td>Value if a token launches</td><td class="pos">' + full(m.conditional) + '</td></tr>' +
      '<tr><td>Launch propensity</td><td class="prop">' + Math.round(m.propensity * 100) + '%</td></tr>' +
      '<tr><td><b>Implied value (expected)</b></td><td class="pos"><b>' + full(m.implied) + '</b></td></tr>' +
      (cal ? '<tr><td>Category comps (' + esc(cal.category) + ')</td><td>' + cal.comps + '</td></tr>' +
        '<tr><td>Category median ratio</td><td>' + cal.median_ratio.toFixed(3) + '×</td></tr>' +
        '<tr><td>Fitted multiple at $100M TVL</td><td>' + cal.multiple_at_100m.toFixed(3) + '×</td></tr>' : '') +
      '</table></div>' +
      '<div><h3>What farming it costs</h3><table class="kv">' +
      '<tr><td>Deposit deployed</td><td>$' + r.farm_capital_usd + '</td></tr>' +
      '<tr><td>Gas per transaction</td><td>$' + r.farm_gas_mid_usd.toFixed(2) + '</td></tr>' +
      '<tr><td>Transactions</td><td>' + r.farm_tx_count + ' (' + r.farm_weeks + ' weekly)</td></tr>' +
      '<tr><td><b>Gas bill, whole farm</b></td><td><b>$' + r.farm_cost_usd.toFixed(2) + '</b></td></tr>' +
      '<tr><td>Hands-on time</td><td>' + r.farm_hours.toFixed(2) + ' h over ' + r.farm_hold_days + ' days</td></tr>' +
      '<tr><td>Break-even allocation</td><td>$' + r.farm_cost_usd.toFixed(2) + ' · 1 in ' + beN.toLocaleString('en-US') + '</td></tr>' +
      '<tr><td>Net $/hour at 0.001%</td><td class="' + phCls + '">' + money(r.farm_per_hour_usd) + '</td></tr>' +
      '</table><p class="note">The deposit comes back on exit — capital at risk, not money spent.</p></div></div>' +
      '<h3 style="margin-top:16px">Farm plan — 8 steps</h3><ol class="steps">' + steps + '</ol>' +
      '<h3 style="margin-top:16px">Allocation scenarios — not forecasts</h3>' +
      '<table><thead><tr><th>If your allocation is</th><th class="num">Allocation</th><th class="num">Net of gas</th><th class="num">Net $/hour</th></tr></thead><tbody>' +
      sc.map(function (s) {
        return '<tr><td>' + s.share + '% of implied value</td><td class="num pos">' + money(s.alloc) + '</td><td class="num ' + (s.net >= 0 ? 'pos' : 'neg') + '">' + money(s.net) + '</td><td class="num ' + (s.perHour >= 0 ? 'pos' : 'neg') + '">' + money(s.perHour) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="note">0.001% is one farmer’s share if 10% of the supply is split among 10,000 farmers; a row that nets negative there does not pay for the farm.</p>' +
      '</div></section>';
  }

  function live() {
    var rows = D.live.map(function (p, i) {
      var gc = p.change_7d === null ? '' : p.change_7d >= 0 ? 'pos' : 'neg';
      return '<tr><td class="rank">' + (i + 1) + '</td><td><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.category || 'Other') + ' on ' + esc((p.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></td>' +
        '<td class="num">' + usd(p.tvl_usd) + '</td><td class="num">' + usd(p.mcap_usd) + '</td><td class="num">' + (p.mcap_tvl_ratio === null ? 'n/a' : p.mcap_tvl_ratio.toFixed(3) + '×') + '</td><td class="num ' + gc + '">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
    return '<div class="panel"><div class="scrollx wide"><table><thead><tr><th>#</th><th>Protocol</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th><th class="num">7d</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<p class="note" style="margin-top:10px">The ' + D.live.length + ' largest live-token protocols by market cap, shown with the market’s own values — never mixed into the ranked board. The curve is fitted on ' + D.curve.comps + ' live comps (CEX excluded); these are the largest of them.</p>';
  }
  function vtab(rows, title) {
    return '<h3>' + title + '</h3><div class="scrollx"><table><thead><tr><th>Split</th><th class="num">Fit on</th><th class="num">Tested on</th><th class="num">Median |error|</th><th class="num">Within 2×</th><th class="num">Median signed error</th></tr></thead><tbody>' +
      rows.map(function (v) {
        return '<tr><td>' + esc(v.split) + '</td><td class="num">' + v.train + '</td><td class="num">' + v.test + '</td><td class="num">' + v.median_abs_log_err.toFixed(3) + ' dex</td><td class="num">' + Math.round(v.within_2x * 100) + '%</td><td class="num">' + (v.median_signed_log_err >= 0 ? '+' : '') + v.median_signed_log_err.toFixed(3) + ' dex</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function cchart() {
    var c = D.curve, W = 560, H = 300, L = 52, R = 12, T = 12, B = 34;
    var x0 = 6, x1 = 11, y0 = 5, y1 = 10.5;
    var X = function (v) { return L + (Math.log10(v) - x0) / (x1 - x0) * (W - L - R); };
    var Y = function (v) { return T + (y1 - Math.log10(v)) / (y1 - y0) * (H - T - B); };
    var yA = Math.pow(10, c.intercept + c.slope * x0), yB = Math.pow(10, c.intercept + c.slope * x1);
    var grid = '';
    [6, 8, 10].forEach(function (e) {
      var v = Math.pow(10, e);
      grid += '<line class="axis" x1="' + X(v).toFixed(1) + '" y1="' + T + '" x2="' + X(v).toFixed(1) + '" y2="' + (H - B) + '"/><text class="tick" x="' + X(v).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + usd(v) + '</text>';
      grid += '<line class="axis" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y(v).toFixed(1) + '"/><text class="tick" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + usd(v) + '</text>';
    });
    var dots = D.live.filter(function (p) { return p.tvl_usd > 0 && p.mcap_usd > 0; }).map(function (p) {
      var cx = X(Math.max(1e6, Math.min(1e11, p.tvl_usd))), cy = Y(Math.max(1e5, Math.min(3e10, p.mcap_usd)));
      return '<circle class="dot" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.2"/>';
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + grid +
      '<line class="fit" x1="' + X(1e6).toFixed(1) + '" y1="' + Y(yA).toFixed(1) + '" x2="' + X(1e11).toFixed(1) + '" y2="' + Y(yB).toFixed(1) + '"/>' + dots + '</svg>' +
      '<p class="note">Each dot is one of the 24 largest live-token protocols, plotted at its real TVL and market cap (log scales both ways). The violet line is the fitted curve — no tilt. The scatter around it is the <span class="weak">R² ' + c.r_squared + '</span>: the best single line through a wide cloud.</p>';
  }
  function sbxTop() {
    var top = etop()[0];
    return 'Top now: ' + top.name + ' ' + usd(eff(top)) + ' (published #' + top.rank + ').';
  }
  function method() {
    var c = D.curve;
    var w = st.w || { gw: 0.5, tau: 365, bw: 0.05 };
    var rollMin = Math.min.apply(null, D.walk_forward_rolling.map(function (v) { return v.median_abs_log_err; }));
    var rollMax = Math.max.apply(null, D.walk_forward_rolling.map(function (v) { return v.median_abs_log_err; }));
    var rollWMin = Math.min.apply(null, D.walk_forward_rolling.map(function (v) { return v.within_2x; }));
    var rollWMax = Math.max.apply(null, D.walk_forward_rolling.map(function (v) { return v.within_2x; }));
    var atTvl = function (tvl) {
      var fitted = Math.pow(10, c.intercept + c.slope * Math.log10(tvl));
      return '<tr><td class="num">' + usd(tvl) + '</td><td class="num">' + usd(fitted) + '</td><td class="num">' + (fitted / tvl).toFixed(3) + '×</td></tr>';
    };
    var calRows = D.calibration.map(function (r) {
      return '<tr><td>' + esc(r.category) + '</td><td class="num">' + r.comps + '</td><td class="num">' + r.median_ratio.toFixed(3) + '×</td><td class="num">' + (r.tilt_dex >= 0 ? '+' : '') + r.tilt_dex.toFixed(3) + '</td><td class="num">' + r.multiple_at_100m.toFixed(3) + '×</td><td class="num">' + usd(r.total_tvl) + '</td></tr>';
    }).join('');
    var sensRows = D.sensitivity.map(function (s) {
      return '<tr><td>' + esc(s.variant) + '</td><td class="num">' + s.top10_kept + ' / 10</td><td class="num">' + s.spearman.toFixed(3) + '</td></tr>';
    }).join('');
    var a = D.accounting;
    return '<section class="panel method"><p class="eyebrow"><span class="mark">' + logo(13) + '</span>02 — The method</p><h2>The model — radar-3</h2>' +
      '<p>Implied value follows only from the snapshot’s own figures: a comps curve fitted on the protocols whose token already trades, and the board ranks by the <i>expected</i> value — that fitted value times P, the fitted chance the protocol records a token. A claim, not a promise: validated leave-one-out, out-of-sample and walk-forward; P is a proxy for “records a token”, not a forecast.</p>' +
      '<p class="formula">log10(mcap) = ' + c.intercept + ' + ' + c.slope + ' × log10(tvl) + tilt(category)\nimplied = fitted mcap × growth × maturity × breadth\nexpected = <span class="prop">P</span> × implied — the board’s ranking value\ngrowth = 1 + clamp(change_7d, −30, +30) / 100 × 0.5\nmaturity = 0.70 + 0.30 × (1 − e^(−age / 365))\nbreadth = min(1.20, 1 + 0.05 × ln(chains))</p>' +
      '<p>The tilt is a category’s median log-residual, shrunk toward 0 with 8 pseudo-observations, capped at ±0.5 dex. Fit on ' + c.comps + ' live comps (CEX excluded): slope ' + c.slope + ', <span class="weak">R² ' + c.r_squared + '</span>, spread ' + c.resid_sd_dex + ' dex, median mcap/TVL ' + c.global_median + '×. TVL alone explains only <span class="weak">' + Math.round(c.r_squared * 100) + '%</span> of log market-cap variance — hence the rank range and 80% band from 200 bootstrap refits on every row, not a bare point estimate.</p>' +
      '<h3>Why the curve, not a flat ratio</h3>' +
      '<p>Market cap grows sub-linearly with TVL (slope ' + c.slope + ', not 1). A flat median ratio of ' + c.global_median + '× prices the largest protocols far too high — Lido: $18.7B TVL, $251M mcap, 0.013×. Both models are scored on the same three splits below; the curve wins on every one.</p>' +
      cchart() +
      vtab(D.validation, 'Fitted curve — validated on known market caps') +
      vtab(D.flat_validation, 'Flat category-median ratio (radar-2) — same splits, for comparison') +
      '<h3>Rolling walk-forward — the backtest a single snapshot allows</h3>' +
      '<div class="scrollx"><table><thead><tr><th>Cutoff</th><th class="num">Fit on</th><th class="num">Tested on</th><th class="num">Median |error|</th><th class="num">Within 2×</th></tr></thead><tbody>' +
      D.walk_forward_rolling.map(function (v) {
        return '<tr><td>Listings before ' + esc(v.cutoff) + '</td><td class="num">' + v.train + '</td><td class="num">' + v.test + '</td><td class="num">' + v.median_abs_log_err.toFixed(3) + ' dex</td><td class="num">' + Math.round(v.within_2x * 100) + '%</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="note">Each row refits the curve on comps listed before the cutoff and tests it on those listed from it on. Error stays in the ' + rollMin.toFixed(3) + '–' + rollMax.toFixed(3) + ' dex band (' + Math.round(rollWMin * 100) + '–' + Math.round(rollWMax * 100) + '% within 2×) across all four cutoffs — the backtest a single snapshot allows; it cannot test whether a token launches, with no launch dates to predict from.</p>' +
      '<h3>The second stage — launch propensity</h3>' +
      '<p>P is a logistic regression on the snapshot’s own figures — log TVL, age, chains, 7d change, age × log TVL, category — trained on 80% of protocols, tested on the other 20% by slug hash. Without categories the held-out AUC is ' + D.propensity.numeric_only_test_auc.toFixed(2) + ', barely above chance; with them ' + D.propensity.test_auc.toFixed(2) + ' (train ' + D.propensity.train_auc.toFixed(2) + '). The category is the signal: categories that launched tokens before are the ones that record them. The label is “records a token”, not “will launch” — P is a proxy — and the coefficients are from the scoring fit on all ' + D.propensity.n + ' protocols, the AUCs from the split fit.</p>' +
      '<div class="scrollx"><table><thead><tr><th>Score band</th><th class="num">Predicted P</th><th class="num">Actually recorded a token</th><th class="num">Protocols</th></tr></thead><tbody>' +
      D.propensity.quintiles.map(function (q, i) {
        return '<tr><td>Quintile ' + (i + 1) + '</td><td class="num">' + Math.round(q.predicted * 100) + '%</td><td class="num">' + Math.round(q.actual * 100) + '%</td><td class="num">' + q.n + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="note">Why the board demotes the biggest conditional values: the Risk Curators on top — Steakhouse, Sentora, Gauntlet — sit in a category with one-hot weight ' + D.propensity.category_weights['Risk Curators'].toFixed(2) + ', so their P is near 0.2–0.3 and their expected value falls to about a third of the conditional one. Polymarket International’s P of 0.82 comes from its age, TVL and chains — its category has too few protocols for its own one-hot, so it scores on the observables alone. Ranking by the conditional value alone keeps 7 of the top 10.</p>' +
      '<p class="note">Errors are in dex (log10): 0.30 dex is about a factor of 2; “Within 2×” is the share of tested comps priced within a factor of two of their real market cap.</p>' +
      '<h3>Try the model — sandbox</h3>' +
      '<p>The board’s numbers come from impliedOf, the function in this page’s source — it recomputes every row from the row’s own figures. Move a weight and the board re-ranks live. The published board is the default: growth 0.50, tau 365, breadth 0.05.</p>' +
      '<div class="sandbox">' +
      '<label>Growth weight <input type="range" id="sbx-gw" min="0" max="1" step="0.05" value="' + w.gw + '"></label>' +
      '<label>Maturity tau, days <input type="range" id="sbx-tau" min="90" max="730" step="10" value="' + w.tau + '"></label>' +
      '<label>Breadth weight <input type="range" id="sbx-bw" min="0" max="0.15" step="0.01" value="' + w.bw + '"></label>' +
      '<button class="button" data-act="sbxreset">Reset to the published model</button>' +
      '</div>' +
      '<p class="note" id="sbx-out">' + sbxTop() + '</p>' +
      '<h3>The curve at four sizes (no category tilt)</h3>' +
      '<table><thead><tr><th class="num">TVL</th><th class="num">Fitted mcap</th><th class="num">Implied multiple</th></tr></thead><tbody>' + atTvl(1e7) + atTvl(1e8) + atTvl(1e9) + atTvl(1e10) + '</tbody></table>' +
      '<h3>Calibration — every category</h3>' +
      '<div class="scrollx"><table><thead><tr><th>Category</th><th class="num">Comps</th><th class="num">Median ratio</th><th class="num">Tilt (dex)</th><th class="num">Multiple at $100M</th><th class="num">Category TVL</th></tr></thead><tbody>' + calRows + '</tbody></table></div>' +
      '<h3>Sensitivity — one constant varied alone</h3>' +
      '<table><thead><tr><th>Variant</th><th class="num">Top 10 kept</th><th class="num">Rank correlation</th></tr></thead><tbody>' + sensRows + '</tbody></table>' +
      '<p class="note">The tilt’s shrinkage matters most: with no shrinkage the top 10 keeps 9 of 10 rows. Growth, maturity and breadth move the board far less — the fitted curve drives the ranking.</p>' +
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
      '<p>The deposit is capital at risk, not money spent: it comes back on exit. What a farmer spends is gas — 3 setup transactions plus one qualifying action a week of the hold (30, 60 or 90 days by age) — priced at the protocol’s first chain (Ethereum $14, Solana-class $0.25, Bitcoin-class $3.50, other chains $1.25). Hands-on time is the setup plus 10 minutes a week. Break-even is the gas bill as a share of the implied value. $/hour is net of the gas bill at a stated 0.001% allocation — one farmer’s share if 10% of the supply is split among 10,000 farmers — a scenario, not a prediction.</p>' +
      '</section>';
  }
  function footer() {
    return '<footer><p><span class="mark">' + logo(14) + '</span>Genesis Scope, model ' + esc(D.model_version) + '. Snapshot ' + date(D.as_of) + ' · ' + esc(D.source) + ' · floor $' + D.floor_usd.toLocaleString('en-US') + '.</p>' +
      '<p>“Records no token” means the snapshot records no token for the protocol — never that it has none. Implied value is this entry’s own claim: an expected value, P × the value if a token launches, where P is a fitted proxy — not a price, not advice. Farm plans are generic steps from each protocol’s category, chains, TVL and age; check the protocol’s own pages before you deposit anything.</p></footer>';
  }
  function render() {
    var html = sidebarHtml();
    html += '<div class="main">';
    if (st.tab === 'method') {
      html += method();
    } else if (st.tab === 'live') {
      html += '<section class="page-head"><p class="eyebrow"><span class="mark">' + logo(13) + '</span>03 — Live comps</p><h1>The market’s own prices.</h1><p class="dek">The ' + D.live.length + ' largest live-token protocols by market cap — the comps the curve is fitted on. They price the model; they are never ranked on this board.</p></section>' + live();
    } else {
      html += hero() + ctrl();
      if (st.sel) html += detail();
      html += '<div class="content-grid"><div>' + board() + '</div>' + rail() + '</div>';
    }
    html += footer() + '</div>';
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
  }
  var timer = null;
  app.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') {
      st.q = e.target.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        whash();
        var pos = e.target.selectionStart;
        render();
        var q = document.getElementById('q');
        if (q) { q.focus(); q.setSelectionRange(pos, pos); }
      }, 220);
    }
    if (e.target && e.target.type === 'range' && e.target.id && e.target.id.indexOf('sbx-') === 0) {
      var gw = parseFloat(document.getElementById('sbx-gw').value);
      var tau = parseInt(document.getElementById('sbx-tau').value, 10);
      var bw = parseFloat(document.getElementById('sbx-bw').value);
      st.w = (gw === 0.5 && tau === 365 && bw === 0.05) ? null : { gw: gw, tau: tau, bw: bw };
      whash();
      var out = document.getElementById('sbx-out');
      if (out) out.textContent = sbxTop();
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === 'category') { st.cat = t.value; st.all = false; }
    else if (t.id === 'chain') { st.chain = t.value; st.all = false; }
    else if (t.id === 'wl') { st.wl = t.checked; st.all = false; }
    else return;
    whash();
    render();
  });
  app.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
    if (el) {
      var act = el.getAttribute('data-act');
      if (act === 'nav') {
        var nv = el.getAttribute('data-nav');
        st.sel = null; st.all = false;
        if (nv !== 'method' && nv !== 'live') st.view = 'pre';
        if (nv === 'overview') { st.tab = 'board'; st.wl = false; st.sort = 'implied'; st.dir = -1; }
        else if (nv === 'watchlist') { st.tab = 'board'; st.wl = true; st.sort = 'implied'; st.dir = -1; }
        else if (nv === 'farm') { st.tab = 'board'; st.wl = false; st.sort = 'perhour'; st.dir = -1; }
        else if (nv === 'method') { st.tab = 'method'; }
        else if (nv === 'live') { st.tab = 'live'; }
        whash();
        render();
      } else if (act === 'view') { st.view = el.getAttribute('data-view'); st.all = false; whash(); render(); }
      else if (act === 'csv') {
        var blob = new Blob([csv()], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'genesis-scope-' + st.view + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 400);
      } else if (act === 'sort') {
        var k = el.getAttribute('data-key');
        if (st.sort === k) st.dir = -st.dir;
        else { st.sort = k; st.dir = (k === 'name' || k === 'rank' || k === 'cost') ? 1 : -1; }
        whash();
        render();
      } else if (act === 'clear') { st.q = ''; st.cat = 'all'; st.chain = 'all'; st.wl = false; whash(); render(); }
      else if (act === 'showall') { st.all = true; render(); }
      else if (act === 'close') { st.sel = null; whash(); render(); }
      else if (act === 'sbxreset') { st.w = null; whash(); render(); }
      return;
    }
    if (tr) {
      var slug = tr.getAttribute('data-slug');
      st.sel = st.sel === slug ? null : slug;
      st.tab = 'board';
      whash();
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
      whash();
      render();
    }
  });
  rhash();
  window.addEventListener('hashchange', function () { st.sel = null; st.all = false; rhash(); render(); });
  render();
})();
