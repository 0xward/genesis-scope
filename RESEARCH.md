# RESEARCH.md — Genesis Scope, putaran TOP 1

Riset untuk entry make.fun token-radar-01. Ditulis seperti engineer senior:
setiap klaim punya sumber yang bisa dilacak (file kit + baris, URL, atau
output perintah). Bila bukti tidak ada, tertulis **tidak terbukti** — bukan
karangan. Bahasa: Indonesia; istilah teknis dan kutipan tetap Inggris.

Status riset: 19 Nov 2026, ~11:10 WIB. Build yang dirujuk: repo
`~/workspace/makefun/genesis-scope`, commit `a4bc8cd` (radar-3, two-stage),
dossier diukur dari build segar `/tmp/r-out` (main.ts dijalankan 19 Nov).

---

## 1. Yang dikatakan kit — dibaca penuh

Sumber: `~/workspace/makefun/token-radar-01-kit/RULES.txt` dan
`competition.yaml` (keduanya dibaca penuh; `competition.yaml` memuat RULES
yang sama di field `rules`, plus header komentar berisi angka kalibrasi).

### 1.1 Lima kriteria juri, berurutan — dan aturannya

Kutipan verbatim dari RULES.txt, bagian "The judge" (juga di
`competition.yaml`, field `rules`):

1. Working radar: board menutup semua watchlist, meranking pre-token dengan
   implied value yang dinyatakan, screenshot dan code sepakat; "a screen with
   no data or code behind it counts for nothing". Watchlist adalah floor,
   bukan ceiling.
2. Value model: implied value mengikuti angka snapshot sendiri (TVL,
   pertumbuhan 7 hari, lama berjalan tanpa token), bukan hardcoded list nama;
   board memisahkan protokol yang tokennya sudah diperdagangkan dari yang
   belum.
3. Farm plans: langkah konkret dengan biaya dan waktu, bukan slogan.
4. Dashboard sebagai halaman: sortable dan filterable, terbaca sekilas,
   detail view per protokol.
5. Looks made: palet yang dipilih, spacing konsisten, type yang terbaca,
   bukan framework yang ditempel mentah.

Aturan keputusan: "Go through the criteria in order, find the first one
where they differ, and let that decide unless a later one differs by much
more." Margin 1 (by a hair) sampai 5 (overwhelmingly better), tanpa seri.
Setiap game dimainkan dua kali (kedua urutan slot); tiap call memberi
pemenang 0.5 + margin/10 (0.6 di margin 1, 1.0 di margin 5).

**Implikasi yang bisa dilacak:** kriteria 1–3 adalah model + data; kriteria
4–5 adalah halaman. Animasi/motion TIDAK disebut di mana pun dalam prompt
juri. Satu-satunya penyebutan interaktivitas adalah "sortable and
filterable" (kriteria 4).

### 1.2 Apa yang sebenarnya dibaca juri — ini temuan terpenting ronde ini

RULES.txt, bagian "The dossier" dan "The judge":

- Juri membaca `dossier.json`: **screenshot dulu, lalu teks sumber
  dashboard yang dibatasi 65.536 byte**.
- Bagian gate: "It does not run the page or read what it renders: the judge
  does that, from your screenshots and source." (RULES.txt, "The gate").

**Fakta:** juri TIDAK PERNAH menjalankan halaman. Ia tidak melihat animasi
bergerak. Motion hanya bisa sampai ke juri lewat dua jalur:

(a) **tiga screenshot statis** — frame yang ditangkap harus sudah lengkap
    dan bagus; animasi yang belum selesai saat capture justru merugikan;
(b) **teks sumber** — kode motion yang terbaca sebagai craft yang disengaja
    (token durasi, satu easing, FLIP, reduced-motion guard).

Konsekuensi: nilai motion untuk skor juri BUKAN gerakannya, melainkan
(a) keadaan akhir yang sama dengan statis tapi lebih tertata, dan
(b) bukti engineering di source. Motion yang hanya "terasa hidup" saat
dipakai manusia tidak menambah skor — kecuali lewat cover image pertama
yang tampil publik di Feed (RULES.txt, "What is public": cover image tampil
di Feed sejak entry dinilai).

Teks yang ditujukan ke juri di screenshot atau source **diizinkan** dan
merupakan bagian entry: "Text in your entry addressed to the judge, in a
screenshot or the source, is allowed and is part of the entry."
(RULES.txt, "The judge".)

### 1.3 Aturan screenshot dan sumber

- Screenshot: 3–4 gambar, masing-masing ≤512 KiB, sisi panjang ≤1440,
  sisi pendek ≥800, PNG/JPEG utuh. RULES menyarankan 300–350 KB tiap
  gambar: "three at the 512 KiB cap exceed the dossier."
  (RULES.txt, "The dashboard".)
- Sumber dashboard: teks dossier ≤65.536 byte UTF-8; file yang muat masuk
  utuh **dalam urutan path**; file pertama yang tidak muat dipotong sampai
  baris lengkap terakhir yang muat, dengan baris yang menyatakan berapa
  baris tidak ditampilkan; lalu baris cut yang menyatakan berapa file dan
  byte yang tertinggal. (RULES.txt, "The dossier".)
- Gate 7 baris (dashboard_files, board_file, sorted_by_value, coverage,
  farm_steps, screenshots, dossier_matches) — sealed scorer, hanya memeriksa
  file, bukan menjalankan halaman.
- Board: 100–4.000 baris, rank 1..N sekali masing-masing, implied tidak naik
  seiring rank, watchlist 40/40, farm_steps 3–12 string @ 20–600 karakter.
- Program berjalan 2× dan kedua run harus menulis byte yang sama.

### 1.4 Heats, final, tie-break

- Dev: tiap entry valid vs 4 anchor sekali masing-masing, lalu 8 game dalam
  2 ronde × 4 vs 2 dari 7 anggota ladder yang peluangnya paling dekat even;
  +2 ronde bila interval high mencapai money-place line. Provisional rate =
  expected win rate vs 4 anchor, interval 90% ±1.6449×SE.
- Final: screen di place 40 (max(4×10, 32)); 3 ronde Swiss; racing di
  prize boundary; playoff 12 teratas, tiap pasangan sekali, +3 game antara
  dua teratas.
- **Tie-break (RULES.txt, "Ranking"):** seri persis pada win rate →
  head-to-head playoff → **dossier.json yang lebih kecil** → receipt lebih
  awal. Ukuran dossier hanya berpengaruh pada seri persis — bukan pada skor.
- Hadiah: 1st $1.000, 2–5 $50, 6–10 $25; total $1.325.

### 1.5 Anchors dan rungs — angka kalibrasi rumah (dari competition.yaml)

Header `competition.yaml` (komentar di atas `version: 1`) mencatat kalibrasi
13 Nov 2026: `grade-local --calibrate --rungs
competitions/token-radar-01/ladder/rungs --repeats 8 --seed
f618a295b041624317981ab289da302f8f6a5a3d8eb4a8598cdede5d971177c4`,
336 calls, 337 attempts, 1.652.380 µUSD, 164/168 game sepakat di kedua
urutan slot. Kekuatan fitted, terlemah dulu:

| anggota | strength | p vs tetangga bawah |
|---|---|---|
| 1-weak | 0.014 | — |
| 2-plain (starter, apa adanya) | 0.593 | 0.977 |
| 3-mid | 0.782 | 0.569 |
| 4-strong | 1.081 | 0.580 |
| r1 | 1.565 | 0.591 |
| r2 | 2.310 | 0.596 |
| r3 | 3.253 | 0.585 |

phi 0.100 (floor). Catatan penting: **2-plain adalah starter yang
diserahkan tanpa perubahan** — jadi starter yang polos saja mengalahkan
1-weak dengan p 0.977, dan selisih antar tetangga di atasnya kecil
(p ~0.57–0.60, hampir coin-flip). Untuk menang melawan r3, sebuah entry
harus berbeda JAUH dari r2, bukan sedikit lebih baik.

---

## 2. Kalibrasi — diburu sampai tuntas, dan vonisnya

### 2.1 Yang dicoba

| # | Jalur | Perintah / lokasi | Hasil |
|---|---|---|---|
| 1 | CLI help | `node cli/makefun.mjs grade-local --help` (kit, 19 Nov) | `--calibrate` dan `--ladder-heat` ADA. `--calibrate`: "Calibrates the judge's ladder, the fixed strengths a dev entry is rated against: the judge directory's anchors and each regular file of --rungs ... on a judge key of its own (makefun/&lt;slug&gt;/judge/local/&lt;attempt&gt;) from the judge broker as --judge's (masq's admin broker, or superbot-router's own key...)". `--ladder-heat`: memainkan artifact dalam provisional heats vs anchor + ladder, dengan kunci yang sama. |
| 2 | Cari judge/ ladder/ anchors rungs di disk | `find ~/workspace/makefun ~/.makefun ~/.superbot ~/.config/superbot <kit> -iname '*judge*' -o '*ladder*' -o '*anchor*' -o '*rung*'` | **Tidak ada.** Nol hasil. Kit hanya berisi RULES.txt, cli/, competition.yaml, harness/, input/, kit.json, starter/. |
| 3 | Jalankan calibrate | `grade-local --kit . --calibrate --save /tmp/calib-test --json` (19 Nov) | Gagal sebelum kunci apa pun: "makefun grade-local: --judge, --calibrate, --ladder-heat ... judge a judge competition's field or ladder: **give --kit its competition directory**". |
| 4 | Env vars judge gateway | cek keberadaan (nilai TIDAK dicetak) | MAKEFUN_LLM_GATEWAY, MAKEFUN_LLM_GATEWAY_URL, MAKEFUN_LLM_GATEWAY_ADMIN_KEY, MAKEFUN_SUPERBOT_ROUTER_URL, MAKEFUN_SUPERBOT_ROUTER_KEY — **kelimanya unset**. (MAKEFUN_API_KEY set — itu kunci akun, bukan kunci judge.) |
| 5 | Docker | dicatat di `~/workspace/tools/dev-env.sh`-adjacent TOOLS.md: daemon hanya mode terbatas, container TIDAK BISA start (`runc create failed: setns: operation not permitted`) | **Tidak diverifikasi ulang di ronde ini** — dan untuk kalibrasi tidak relevan: `--calibrate`/`--ladder-heat` tidak memakai Docker (judge call ke broker), Docker hanya relevan untuk `grade-local --bot --driver docker`. |

### 2.2 Vonis

**Kalibrasi lokal TIDAK MUNGKIN.** Dua blocker independen, masing-masing
sudah cukup:

1. **Tidak ada judge directory lokal.** Help CLI sendiri: "A judge
   competition (program/v1 with a judge) publishes no scorer or judge in
   its kit, so the house grades it from its competition directory
   (competitions/&lt;slug&gt;)". Kit dev sengaja tidak mempublikasikan
   judge/anchors maupun ladder/rungs; keduanya hidup di server.
2. **Tidak ada kredensial judge broker.** Kunci judge harus dibuat oleh
   masq admin broker atau superbot-router; kelima env var unset.

Satu-satunya pengukuran kalibrasi yang nyata adalah **dev rating server
setelah submit** (yang butuh approval preview + kuota submit). Angka
"Prelude 88,7%" dari pemeriksaan sebelumnya **tidak tampil di output
`status` 19 Nov** (hanya "round 1 scored") — jadi angka itu tidak bisa
saya verifikasi ulang di ronde ini; perlakukan sebagai angka lama, bukan
pengukuran berjalan.

**Jangan klaim "di atas r3" tanpa angka server.** r3 = strength 3.253
(lihat §1.5); tidak ada jalur lokal untuk mengukurnya.

---

## 3. Leaderboard — pola pemenang (yang bisa diakses)

### 3.1 Yang dicoba

| Jalur | Hasil |
|---|---|
| Perintah leaderboard/feed di CLI | **Tidak ada.** Subcommand CLI: login, register, merge, wallet, init, bundle, grade-local, check, regrade, record, submit, status, claim, delegate, revoke, verify-result, verify-window, verify-instance, market, secrets, referrals, sponsor, fee, feedback, help, version. |
| Halaman kompetisi `https://make.fun/c/token-radar-01` (path dari RULES.txt: "/c/token-radar-01/kit") | `browser.open` 19 Nov: **HTTP 404**. Tidak diulang (aturan: jangan ulangi fetch gagal tanpa koreksi input; tidak ada URL alternatif yang terverifikasi — kit download `/c/token-radar-01/kit` adalah tarball, bukan halaman, dan mengunduh kit baru dilarang tugas ini). |
| `status` (akun) | Entry kita 01a1ef9a… "round 1 scored", tanpa rate di output. |
| **Side market** `market list` + `market show token-radar-01` | **Berhasil — satu-satunya tampilan field yang bisa diakses.** Lihat §3.2. |

### 3.2 Side market token-radar-01 (19 Nov ~11:09 WIB)

`market show token-radar-01`: 16 entrant terdaftar (+ "No entry wins" +
"An unlisted entrant"), volume total **0.30 USDC**. Harga YES:

- 13 entrant di **0.5¢** (lantai), volume 0.00.
- 3 entrant di **1.5¢**, masing-masing volume 0.10:
  - @nightshift-labs — "Launchscope — pre-token radar: the fitted model
    and its out-of-sample test on the board, traded tokens as anchors,
    costed farm timelines"
  - @brisk-kestrel-93 — "Undercurrent: walk-forward-tested value model,
    deposit-sized farm plans"
  - @nyx77 — "Launch Radar" (tanpa deskripsi)
- **@0xward TIDAK ada di daftar** — tidak ada outcome untuk entry kita
  per 19 Nov 11:09 WIB (pasar hanya mengikuti entrant yang terdaftar di
  sana; kenapa kita tidak terdaftar: **tidak terbukti**).

**Pola judul/deskripsi 16 entrant (fakta, bukan tafsir):**

- Nama generik mendominasi: "Launch Radar" ×5, "Token Radar" ×6,
  "Launch Ledger", "Launchscope", "Undercurrent", "Unminted",
  "Token Launch Radar".
- Klaim model yang berulang: comps-fitted / comps-calibrated, out-of-sample,
  backtested, walk-forward, bootstrap, farm plans netted/costed, 198 rows,
  40/40 watchlist, 758 protocols accounted for. Contoh verbatim:
  @tiar "research note, mechanism-aware farm plans, backtested
  comparables"; @sprydd "comps-calibrated radar, 192 pre-token protocols,
  40/40 watchlist"; @ronigrv "comps-fitted value tested out of sample,
  every farm plan netted to farm, thin or skip"; @defalt "comps-fitted
  value, OOS x2.01, 198 rows, farm economics"; @fikril07 "priced off the
  92 tokens that already trade, farm plans netted at the band's low end";
  @elmatano6243 "time-split size curve, farm verdicts netted to the
  dollar, bootstrap stability check"; @sudhan "fitted launch pricing, 66
  farm plans, a KPI strip and every one of 758 protocols accounted for";
  @calm-owl-82 "comps curve tested blind, costed farm plan for every
  pre-token protocol"; @steady-panda-17 "value model tested out of sample,
  bootstrap band on every estimate, farm plans netted to farm, thin or
  skip".
- **Tidak satu pun dari 16 judul/deskripsi yang menyebut two-stage,
  launch propensity, atau P(launch).** Itu pembeda model kita yang
  terverifikasi unik di field yang terlihat ini — sejauh judul pasar
  mencerminkan isi (judul pasar ditulis entrant sendiri; isi dossier mereka
  tidak bisa dibaca — dossier bersifat privat, RULES.txt "What is public").
- **Tidak satu pun yang menyebut animasi/motion/visual** — wajar: judul
  pasar bicara model; visual hanya terlihat lewat cover image.

**Batas jujur pasar ini:** volume total 0.30 USDC; selisih 0.5¢ vs 1.5¢
adalah tiga taruhan 0.10 USDC. **Ini bukan sinyal preferensi juri** dan
tidak boleh dibaca sebagai leaderboard. Yang bisa dibaca darinya hanyalah:
(a) narasi model field sudah konvergen (kurva comps + OOS + bootstrap +
farm plan berkos adalah table stakes, bukan pembeda), (b) two-stage adalah
satu-satunya klaim model yang tidak muncul di judul siapa pun.

### 3.3 Yang tidak terbukti soal leaderboard

- Peringkat resmi / unofficial top-50: **tidak terbukti** di ronde ini
  (halaman 404; tidak ada perintah CLI). Klaim lama "Prelude tidak masuk
  unofficial top 50 dari 17.497 entry" berasal dari pemeriksaan sebelumnya
  dan tidak diverifikasi ulang.
- Jumlah total entry saat ini: **tidak terbukti** (angka 17.497 dari
  pemeriksaan sebelumnya; pasar hanya menampilkan 16 entrant).

---

## 4. Pola desain — riset baru ronde ini + riset lama yang masih berlaku

Riset lama (jangan diulang — baca langsung):
- `~/workspace/research_notes/dashboard-redesign-research-20261118-1524/report.md`
  — palet, tipografi (system stack, tabular numerals), logo (3 konsep),
  layout (inverted pyramid, sticky header, density), nama.
- `~/workspace/research_notes/dashboard-feel-research-20261118-2240/report.md`
  — 7 mekanisme "kaku/AI slop", motion (durasi/easing, View Transitions,
  count-up, stagger, hover), dan rekomendasi P0–P2 untuk Prelude.
  Dua temuan lamanya yang paling relevan di sini:
  (1) kombinasi Prelude v2 (cream #F4F1EA + serif + terracotta) terdaftar
  sebagai AI tell #1 di catatan art-direction Awwwards 2026, TAPI dokumen
  yang sama berkata "These are defaults, not crimes" dan memberi
  counter-proof Divyum (palet hampir identik, Site-of-the-Day) — yang
  menang adalah satu motif yang dibawa ke semua state + motion yang
  dimiliki konsep + detail; (2) tabel 198 baris TIDAK PERNAH di-stagger
  per baris, TIDAK PERNAH count-up per baris.

Riset baru ronde ini (sumber dibuka/dibaca 19 Nov):

### 4.1 FLIP — animasi reorder yang benar

- Paul Lewis (Google), dipopulerkan lewat artikel "FLIP Your Animations";
  penjelasan terbaik: Josh W. Comeau,
  https://www.joshwcomeau.com/react/animating-the-unanimatable/ —
  First (ukur posisi awal), Last (terapkan layout akhir, ukur lagi),
  Invert (transform yang mengembalikan tampilan ke posisi awal),
  Play (animasikan transform ke nol). Hanya `transform`/`opacity` yang
  dianimasikan — layout change terjadi sekali, animasi murni compositor.
- Ringkasan 2026: https://www.aicssanimations.com/guides/web-animation-best-practices
  — "FLIP scales elements to fake size changes, which stretches text...
  Counter-scale children or crossfade content if the distortion shows."
  Dan: "View Transitions bring the same idea into the browser."
- **Untuk Genesis Scope:** FLIP adalah cara yang benar untuk sort/filter
  (baris meluncur ke posisi baru, 200–300ms, transform-only). Batas:
  hanya 50 baris yang terlihat yang di-FLIP; jangan FLIP 198 baris.

### 4.2 Count-up — final value di markup, frame pertama lengkap

- Art of Styleframe, "Animated Stats Cards",
  http://artofstyleframe.com/blog/animated-stats-cards-ui-dashboard/ —
  diuji di Chromium 145: 13 animasi, terakhir berakhir 850ms, tidak ada
  yang loop. Aturan konstruksi: "every final value already sits in the
  stylesheet and the markup. The keyframes only describe the journey, and
  they use `from` with no `to`, so the end state is whatever the element
  already is." Semua animasi di dalam
  `@media (prefers-reduced-motion: no-preference)` (opt-in), bukan
  animate-by-default + override. Dengan reduce: nol animasi berjalan,
  semua angka membaca nilai akhir dari frame pertama.
- Batas keras: "CSS count-up via `@property` is integers-only (no
  `12,480`, no `98.6`)" — KPI kita ("$42.0M", "R² 0.143", "40 / 40")
  bukan integer, jadi jalur CSS murni TIDAK BISA; butuh JS
  requestAnimationFrame (~30 baris) atau tanpa count-up.
- Konfirmasi pola yang sama: https://markodenic.tech/make-your-stats-count-up-with-zero-javascript/
  ("The real number stays in the HTML: accessible, indexable, and correct
  even if the animation never runs") dan
  https://www.romanchursin.dev/brand/finishing/count-up ("Screen readers
  get the final value straight away"; "Don't animate numbers people
  compare or act on, like prices in a form").
- **Untuk Genesis Scope:** count-up hanya untuk KPI strip, sekali saat
  load pertama, 300–400ms, easing long-tailed `cubic-bezier(.2,.7,.2,1)`.
  Tabel TIDAK PERNAH count-up (feel report §3.4: "A number that counts up
  on every filter change isn't telling you the data changed").

### 4.3 Keadaan dashboard saat ini (diverifikasi dari source, 19 Nov)

`dashboard/app.js` + `app.css` (grep langsung):

- Logo/motif ADA: `logo()` (app.js:56–57) — SVG arc + horizon line + dot
  vermilion ("first light"). Tapi **dipakai sekali** — hanya di header
  (app.js:212). Motif tidak dibawa ke section, detail, atau footer.
  Feel report P0-1 (motif ke semua state) **belum dikerjakan**.
- Masthead masih pola meta string "A · B · C" (app.js:213): "File Nº 03 ·
  radar-3 / Snapshot 14 Nov 2026, from the DefiLlama protocol index /
  Scored by the radar-3 model — a fitted comps curve, validated."
  Ini tell #5 Awwwards (feel report §0/P0-3). **Belum diperbaiki.**
- Motion yang ada: `@keyframes rise/detailin/grow` (app.css:50–52),
  `prefers-reduced-motion` guard (app.css:57).
  **Cacat terverifikasi:** `grow{from{width:0}}` menganimasikan `width` —
  properti layout. Sumber §4.1/feel report §3.2: animasikan hanya
  `transform`/`opacity`; bar harus pakai `scaleX`, bukan `width`.
- **Tidak ada** count-up, FLIP, View Transitions, atau
  requestAnimationFrame di app.js/app.css (grep: nol hasil).
- Guard reduced-motion memakai pola **override** (animasi default, lalu
  `animation:none` di bawah `reduce`) — Styleframe (§4.2) menyatakan pola
  ini terbalik; yang benar opt-in di dalam `no-preference`.
- `view-transition` tidak ditemukan di teks dossier (offset -1, lihat §6a).

---

## 5. Rekomendasi arah

### 5.1 Verdict arah: TETAP ledger — jangan ganti arah

Bukti:

- Pengguna menolak palet gelap 2× (feel report §5); arah ledger adalah
  identitas yang sudah ditetapkan, bukan placeholder.
- Counter-proof Divyum (feel report §0): palet yang sama mencapai
  Site-of-the-Day lewat satu motif + motion + detail — bukan lewat ganti
  palet. Dokumen Awwwards yang sama: "These are defaults, not crimes."
- Field sudah konvergen di model (§3.2); pembeda yang tersisa adalah
  two-stage (model) + identitas visual + kualitas screenshot.

**Yang diganti bukan arahnya, melainkan kelengkapannya:** motif yang
dibawa ke semua state, motion dengan satu sistem token, dan perbaikan
tell #5 di masthead. Tidak ada bukti riset yang mendukung repaint gelap
atau arah baru lainnya.

### 5.2 Lima perubahan animasi/CSS, diurutkan (dampak untuk juri dulu)

Ingat §1.2: juri tidak melihat gerakan — yang dinilai adalah screenshot
(statis) + source (craft yang terbaca). Urutan di bawah memakai ukuran itu.

1. **Sistem token motion di CSS** — satu set `--dur-*`/`--ease-*`,
   dipakai di semua tempat, tanpa durasi tersebar. Bukti: feel report
   P0-6 (§3.2: durasi/easing yang dipakai produk nyata). Alasan urutan
   #1: `app.css` adalah file PERTAMA yang dibaca juri dalam teks dossier
   (offset byte 120, lihat §6a) — sistem yang disengaja terlihat sebelum
   apa pun. Biaya: ~15 baris CSS (~0,5 KB).
2. **FLIP pada sort/filter** — baris yang terlihat meluncur ke posisi
   baru, transform-only, 200–300ms, ease-out; hanya 50 baris tampil.
   Bukti: §4.1 (Comeau, aicssanimations). Nilai juri: bukti engineering
   di source + keadaan akhir identik dengan statis. Biaya: ~40 baris JS
   (~1,5 KB). Risiko: FLIP pada 198 baris = jank; batasi ke baris tampil.
3. **Count-up KPI strip, sekali saat load** — JS requestAnimationFrame,
   300–400ms, easing `cubic-bezier(.2,.7,.2,1)`, nilai akhir sudah di
   markup, gate `no-preference`. Bukti: §4.2 (Styleframe; "CSS count-up
   via @property is integers-only" — jadi jalur JS wajib untuk "$42.0M" /
   "0.143"). Biaya: ~30 baris JS (~1,2 KB). Batas: HANYA strip KPI,
   tidak pernah tabel, tidak pernah saat filter/sort.
4. **Perbaiki bar + cascade detail** — (a) ganti animasi bar `width` →
   `scaleX` dari tepi kiri, sekali saat load (bukti: §4.3 cacat
   terverifikasi + feel report §3.4); (b) detail masuk berkascade
   hero → grid → farm plan, langkah 40–60ms, total ≤300ms (bukti: feel
   report §3.5). Biaya: ~10 baris CSS + ~5 baris JS.
5. **View Transitions board↔detail (morph)** — shared
   `view-transition-name` antara nama/nilai baris yang diklik dan hero
   detail, 240–400ms, fallback instant swap. Bukti: feel report §3.3.
   Peringkat TERAKHIR karena: (i) **belum teruji** di build statis ini
   (feel report §6, open question — hash routing + re-render 198 baris);
   (ii) juri tidak melihat gerakannya. Kerjakan hanya setelah 1–4
   selesai DAN setelah uji build-time lolos.

### 5.3 Tiga perubahan model/board

1. **Pertahankan two-stage — jangan regresi ke ranking kondisional.**
   Bukti: §3.2 — tidak satu pun dari 16 judul/deskripsi pasar yang
   menyebut two-stage/propensity; ini satu-satunya klaim model yang
   terverifikasi unik di field yang terlihat. (Validasi internal tetap:
   test AUC 0,713, numeric-only 0,568 — angka dari build lead, bukan
   dari riset ini.)
2. **Kecilkan dossier (tie-break).** Bukti: §6b — gambar base64 adalah
   81,2% dossier; RULES tie-break jatuh ke dossier lebih kecil pada seri
   persis. Uji JPEG vs PNG terkuantisasi untuk 3 screenshot —
   **belum diuji**, jadi jangan klaim JPEG lebih kecil sebelum ada angka.
   Catatan: ini hanya berpengaruh pada seri persis, bukan pada skor.
3. **Satu baris judge-facing di Method.** Bukti: RULES mengizinkan teks
   untuk juri (§1.2). Isi yang diusulkan — satu kalimat faktual: model
   two-stage + validasi (LOO/OOS/walk-forward) + apa yang TIDAK
   diklaim (P adalah proxy "records a token"). Risiko rendah; jangan
   lebih dari satu-dua kalimat, dan jangan memuji diri sendiri.

### 5.4 Yang TIDAK boleh dilakukan

- **Jangan stagger/count-up tabel 198 baris.** Bukti: feel report §3.5,
  §3.8; Styleframe (§4.2). Board dibaca berulang; animasi ulang adalah
  pajak.
- **Jangan tambah accent kedua, gradient, glassmorphism, WebGL/canvas
  hero.** Bukti: feel report §5 (Divyum hard laws).
- **Jangan ganti arah ke gelap.** Bukti: §5.1.
- **Jangan animasikan `width`/`height`/`top`/`left`.** Bukti: §4.1,
  §4.3 (cacat `grow` saat ini).
- **Jangan klaim kalibrasi "di atas r3".** Bukti: §2.2.
- **Jangan submit dengan angka kuota lama.** Bukti: §6c — kuota sekarang
  3 tersisa hari ini, 19 dari 20 hard limit, total tidak diberitahu.
- **Jangan lewati headroom 7.717 byte tanpa cek potongan.** Bukti: §6a.
- **Jangan pakai `@property` count-up untuk "$42.0M"/"0.143".**
  Bukti: §4.2 (integers-only).

---

## 6. Dossier, kuota, starter (dari skill makefun-bounty-mastery + judge-dossier-craft)

### 6a. Tata letak byte dossier — dibaca dari `vendor/makefun-board.ts`

`buildDossier(dir, {text_max_bytes: 65536})` (vendor/makefun-board.ts,
fungsi `buildDossier`, dibaca penuh 19 Nov):

- **Urutan:** `dashboardFiles()` mengembalikan semua file dashboard
  **diurutkan menurut path (code-unit)**; teks dibuka blok
  `## Dashboard` (jumlah file, total byte, tiap path + ukuran), lalu
  `## Source` dengan tiap file teks dalam urutan path, masing-masing
  `### <path>`, ukuran + jumlah baris, lalu isi dalam fenced block.
  File non-teks (.png dsb.) hanya disebut namanya di blok Dashboard.
- **Aturan potong:** file yang muat masuk utuh dalam urutan path; file
  pertama yang tidak muat dipotong sampai baris lengkap terakhir yang
  muat ("its head, up to its last complete line that fits"), dengan baris
  "[N of this file's M lines not shown.]", lalu baris cut
  "[Cut at 65536 bytes: N files and B bytes left out.]".
- **Urutan path aktual:** `app.css` < `app.js` < `index.html`.

**Diukur dari build segar `/tmp/r-out` (main.ts, 19 Nov; dossier disk
318.015 byte):**

| item | byte |
|---|---|
| Total sumber dashboard (index.html 453 + app.css 9.230 + app.js 47.872) | **57.555** |
| Teks dossier | **57.819** (headroom vs 65.536: **7.717**) |
| Section `app.css` | offset teks 120 |
| Section `app.js` | offset teks 9.398 |
| Section `index.html` | offset teks 57.088 |
| `prefers-reduced-motion` | offset 3.855 |
| `function sortedRows` (logika ranking) | offset 21.953 |
| `log10(mcap)` (formula) | offset 44.561 |
| `expected = P` | offset 44.697 |
| `The second stage` (propensity) | offset 47.320 |
| `view-transition` | **tidak ditemukan (-1)** |

**Implikasi untuk putaran animasi (bukti di atas):**

- Headroom hanya **7.717 byte** sebelum potongan apa pun. Lima perubahan
  §5.2 bersama-sama (~4,7 KB) masih muat — tapi tidak ada ruang untuk
  tambahan besar lain tanpa cek ulang.
- Bila source melewati cap, yang terpotong DULUAN adalah **ujung akhir
  app.js** — baris-baris terakhir file itu (aturan potong: file pertama
  yang tidak muat utuh dipotong dari ekornya). Hitung kasar dari angka
  terukur: ruang untuk section app.js ≈ 65.536 − ~9.480 (head + app.css)
  − ~55 (cut line) ≈ 55.950 byte teks, alias ~55.900 byte isi app.js.
  Formula (isi app.js ~35.100) dan propensity (~37.880) selamat sampai
  pertumbuhan ~18.000 byte; yang terancam duluan bila pertumbuhan besar
  adalah ekor asli app.js — render/init, lalu ekor Method
  (sensitivity/accounting/farm-economics, teks ~50k–57k).
- **Aturan praktis:** letakkan kode animasi BARU di AWAL app.js (atau di
  app.css, yang dibaca pertama) — jangan append di akhir app.js, karena
  ekor itulah yang terpotong pertama. `index.html` (453 byte, shell) baru
  hilang bila potongan sudah memakan seluruh app.js — nilainya rendah.

### 6b. Ukuran dossier & tie-break

Komposisi dossier 318.015 byte (build `/tmp/r-out`, 19 Nov):

| komponen | byte | share |
|---|---|---|
| 3 screenshot, base64 (raw 193.727: 74.212 + 61.084 + 58.431) | 258.308 | 81,2% |
| Teks sumber dashboard | 57.819 | 18,2% |
| Overhead JSON (schema, sha256, nama) | ~1.888 | 0,6% |

**Tidak masuk dossier:** `board.json` (425.425 byte) dan `data.js`
(132.374 byte) — keduanya ditulis ke `/output` tapi bukan bagian
dossier. (Catatan: build lama `/tmp/v-out` 04:04 menunjukkan dossier
339.711 byte karena masih memakai screenshot lama kreatif
73.574/64.749/71.678; build segar dengan screenshot baru = 318.015.)

**Ada lemak yang bisa dipotong?**

- Gambar mendominasi (81,2%). Tiap screenshot sudah jauh di bawah saran
  RULES (300–350 KB) — 58–74 KB. Satu-satunya penghematan berarti adalah
  format: uji JPEG kualitas ~80 vs PNG terkuantisasi 256-warna.
  **Belum diuji** — gambar kita dominan warna datar (vektor), di mana PNG
  biasanya lebih kecil; jangan klaim JPEG lebih kecil sebelum ada angka.
- Teks (18,2%) sudah minimal: itu seluruh source dashboard. Memotongnya
  berarti memotong kode dashboard.
- **Konteks tie-break:** penghematan ~20 KB hanya berpengaruh bila win
  rate SERI PERSIS (RULES §1.4). Prioritasnya di bawah isi — jangan
  korbankan satu baris method demi 20 KB.

### 6c. Kuota — diverifikasi via CLI (read-only)

`node cli/makefun.mjs status --competition token-radar-01`, 19 Nov
~11:09 WIB:

| item | nilai |
|---|---|
| Entries made | 1 (kept: 1) |
| Left today | **3 of 3** (hari UTC berikutnya mulai 2026-11-20T00:00:00Z) |
| Left in all | **not told** (server tidak memberitahu) |
| Left under the hard limit | **19 of 20** |
| Can submit now | yes |
| Catatan server | "Some entries are left for this account (account reputation), though how many is not told. The limit is not fixed for good..." |

**Klaim lama SUPERSEDED:** "1 terpakai, 5/hari tersisa, 9 total tersisa,
limit 19" — SALAH pada angka yang bisa dicek. Yang benar per CLI saat
ini: 3 tersisa hari ini (bukan 5), hard limit 20 dengan 19 tersisa
(bukan limit 19), total tersisa TIDAK diberitahu (bukan 9).

Catatan tambahan: CLI mencetak "this kit copy is level 20 and
https://make.fun is at level 23: a current kit reads, bundles or sends
what this copy cannot." Kit lokal tertinggal 3 level. Mengunduh kit baru
dilarang oleh tugas ronde ini — catat sebagai item terbuka untuk lead
(cek apakah level 23 mengubah perintah yang dipakai di sini).

### 6d. Starter — apakah pernah dijalankan tanpa perubahan di ronde v1?

**Jawaban: tidak terbukti untuk "dijalankan"; tidak untuk "diserahkan".**

Bukti:

- Git history repo: 4 commit, root `6c7fc62acc619b7538e07e43834192bab5671756`
  (18 Nov 23:55 WIB, "Genesis Scope (radar-2) — pre-token protocols
  ranked by implied value"). Commit pertama SUDAH berisi model radar-2
  (lib/model.ts 706 baris), dashboard custom, DESIGN.md, README.md.
- Perbandingan ukuran vs kit starter
  (`~/workspace/makefun/token-radar-01-kit/starter/`):
  lib/model.ts repo 66.262 byte vs starter 19.519; dashboard/app.js repo
  47.872 vs starter 21.088; dashboard/app.css 9.230 vs 8.007.
- `main.ts` adalah pengecualian: diff vs starter hanya komentar header,
  prefix log "token radar"→"genesis scope", dan penangkapan
  `const dash =`. Entrypoint pada dasarnya starter dengan edit kosmetik.
- Pencarian "starter" di README.md/DESIGN.md repo dan catatan riset
  tidak menemukan jejak starter pernah dijalankan atau diserahkan polos.

Jadi: tidak ada commit, file, atau catatan yang menunjukkan starter
pernah diserahkan tanpa perubahan — dan tidak ada bukti ia pernah
dijalankan polos di ronde v1. Bila lead butuh jawaban "pernah dijalankan",
jawabannya **tidak terbukti**, bukan "tidak".

---

## Sumber

Kit (dibaca penuh 19 Nov):
- `~/workspace/makefun/token-radar-01-kit/RULES.txt`
- `~/workspace/makefun/token-radar-01-kit/competition.yaml`
- `~/workspace/makefun/genesis-scope/vendor/makefun-board.ts`
  (fungsi `buildDossier`, `dashboardFiles`, `fileHead`)

CLI (dijalankan 19 Nov, output dicatat):
- `node cli/makefun.mjs grade-local --help`
- `node cli/makefun.mjs grade-local --kit . --calibrate --save /tmp/calib-test --json`
- `node cli/makefun.mjs status` dan `status --competition token-radar-01`
- `node cli/makefun.mjs market list` dan `market show token-radar-01`

Web (dibaca 19 Nov):
- https://www.joshwcomeau.com/react/animating-the-unanimatable/ (FLIP)
- https://www.aicssanimations.com/guides/web-animation-best-practices (FLIP, transform-only)
- http://artofstyleframe.com/blog/animated-stats-cards-ui-dashboard/ (count-up, first-frame-complete)
- https://markodenic.tech/make-your-stats-count-up-with-zero-javascript/ (@property)
- https://www.romanchursin.dev/brand/finishing/count-up (count-up, a11y)
- https://make.fun/c/token-radar-01 — fetch teks 19 Nov: HTTP 404

Riset lama (dibaca 19 Nov, tidak diulang):
- `~/workspace/research_notes/dashboard-redesign-research-20261118-1524/report.md`
- `~/workspace/research_notes/dashboard-feel-research-20261118-2240/report.md`

Repo/build (diukur 19 Nov):
- `~/workspace/makefun/genesis-scope/` (commit `a4bc8cd`; `git log`, `git show 6c7fc62 --stat`, `diff` vs starter)
- Build segar `/tmp/r-out` (main.ts 19 Nov) — dossier 318.015 byte, teks 57.819 byte
- Grep dashboard: `logo()` app.js:56–57, masthead app.js:212–213, keyframes app.css:50–52, guard app.css:57
