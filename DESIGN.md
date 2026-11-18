# Prelude — visual direction v2

The dashboard was rebuilt from scratch after the v1 verdict: 2/10. The user saw the
screenshots and named the defects; this file records the direction chosen to fix
them and the reasons, so the choices are deliberate, not taste.

## Why v1 failed (agreed, not defended)

1. The detail dialog overlapped the board and clipped the text behind it
   ("Watchlist o…", "mod…" cut off). A detail view must never cover and cut
   other content.
2. Dark navy + amber + a dense small table is the generic AI-dashboard template.
   No visual identity — that is what "slop" means here.
3. The farm plan read as long paragraphs in a cramped panel — not scannable.
4. The board read as a raw spreadsheet: rank and signal strength were not felt
   at a glance, only a small bar inside a cell.

## Direction: a printed ledger, not a terminal

A light editorial theme. Reasons:

- **Differentiation.** Nearly every crypto dashboard is dark navy + gold. A light
  paper page is instantly recognizable in a field of ~17,000 entries and in the
  judge's screenshot grid.
- **Authority.** A ranking that reads like a printed financial table signals
  "audited numbers", which is exactly what a model-based radar must signal. A
  dark terminal signals live trading; this entry is a dated snapshot with a
  stated model — paper fits the truth.
- **Legibility in screenshots.** Dark ink on warm paper at 16px with generous
  leading reads better in a screenshot than small light text on dark navy. The
  judge reads screenshots, so screenshot legibility is the product.

## Palette (light, one signal colour)

- Paper `#f6f2e9` — warm, not pure white: avoids glare, feels printed.
- Surface `#fffdf7` — panels and cards.
- Ink `#1d1a16` — near-black, warm.
- Muted `#6f6a5e` — secondary text.
- Hairline `#ddd5c3` — rules and borders.
- Signal vermilion `#c2401b` — the ONE accent: brand mark, active states, the
  top-3 rank numerals, key numbers. Vermilion is a print colour (red ink on a
  ledger), not crypto gold. Red ink is the editor's mark: it draws the eye to
  rank and value only, nowhere else.
- Positive `#1f7a4d`, negative `#9e2b25` — muted, darker and cooler than the
  vermilion accent so the three reds never confuse each other; each appears
  only in its own column.
- Implied-value bars are ink, not accent: a bar is data, not decoration.

## Type (system stacks only — no webfonts are allowed)

- **Display** (headlines, brand, rank numerals):
  `Iowan Old Style, Palatino, 'Palatino Linotype', Georgia, serif` — a serif
  display is the single biggest differentiator from sans-everything dashboards.
  Georgia is on virtually every machine; Palatino/Iowan on Apple.
- **Body and labels:** `system-ui, -apple-system, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, sans-serif`.
- **Figures** (every number in the table): `ui-monospace, 'SF Mono',
  'Cascadia Mono', Consolas, 'Roboto Mono', monospace` with tabular numerals —
  a ledger's figures are fixed-width, so columns align.
- **Scale:** base 16px/1.6; headline 34px serif; table 15px with 18–20px row
  padding. v1 was 14px type on 12px padding — that is what made it feel
  cramped.

## Logo: first light (inline SVG)

A horizon line with a rising dot on an arc — the moment before the launch.
Pre-token means before the main event, and the mark is that moment: three
strokes, one colour plus ink, legible at 16px. Drawn as inline SVG in the
header (no image file, no network).

## Layout

- **Header:** logo + "Prelude" in serif + the line "Pre-token protocols,
  ranked" + snapshot meta on the right.
- **Lede:** one serif headline, one short paragraph, four facts in a row
  (not a side rail).
- **Controls:** search and filters in one clean row; Pre-token / Live token
  as plain text tabs.
- **Board:** rank as a large serif numeral (28px) in its own column; protocol
  name 16px semibold with a sub-line; TVL, 7d and age in mono; implied value
  as a big mono number with a full-width ink bar and a driver chip under it
  ("breadth +12%" — computed in the page from the row's own multipliers, the
  largest deviation from neutral). Row padding 18–20px, sticky header,
  hairline separators only.
- **Detail: its own page, not a dialog.** Selecting a row replaces the board
  with the detail view: a back link, the protocol title in serif, the
  meta line, the implied-value equation as a five-cell breakdown, the "Why
  this rank" sentence, live comps, and the farm plan. Nothing overlaps
  anything, nothing is clipped.
- **Farm plan, scannable:** each step is a numbered row — bold action on one
  line, then a compact meta line "Cost: … · Time: …" in small mono. A
  plan-at-a-glance strip on top (capital, gas per action, hold, steps),
  computed from the row itself. The plan text is unchanged from board.json;
  only its presentation changes.
- **Model panel and sandbox:** same content, restyled to the ledger language;
  the formula in mono on a paper-dark card; the calibration table with
  hairlines.

## Name

The web is **Prelude**. The repo stays `genesis-scope`. Prelude is what comes
before the main event — exactly a pre-token radar. Short, elegant, not a
crypto cliché, and clearly different from the repo name.

## Constraints kept

No external URLs, no webfonts, no network. Dashboard source stays under the
64KB cap (v3: 65,198 bytes, 338 bytes of headroom — comments were stripped
from the dashboard source to fit; the full rationale lives in this file and
in README.md, not in code comments). The board, the model and the data are
unchanged — this rebuild is presentation only. The driver chip is computed in
the page from the row's own multipliers; it adds no new data.

## Warna (revisi 18 Nov 2026 malam — atas masukan user: "jelas kurang warna")

V1 ledger hanya punya satu aksen (vermilion) + hijau/merah untuk naik/turun — di screenshot terbaca datar, hampir monokrom. Revisi ini menambah warna, tapi setiap warna punya **arti**, bukan dekorasi:

- **Strip vermilion 4px** di tepi atas halaman + angka "Top implied value" vermilion — sinyal merek langsung terlihat saat halaman dibuka.
- **Chip driver berwarna per jenis**: growth = teal (#0f766e), maturity = ochre (#b45309), breadth = violet (#6d28d9). Chipnya pill dengan tint latar — warnanya memberitahu faktor mana yang menggerakkan peringkat baris itu, jadi pembaca belajar membaca board dari warna.
- **Dot kategori**: tiap kategori dapat satu dari 6 hue (vermilion, teal, ochre, violet, hijau, biru) dari hash nama kategorinya — tidak ada kategori yang dispesialkan. Dot muncul di baris board, tabel live, dan halaman detail.
- **Bar top-3 vermilion**, sisanya tinta — hierarki peringkat terlihat dari warna bar, bukan cuma panjangnya.
- Yang tidak berubah: kertas hangat, tinta, serif display, angka mono. Warna ditambah di atas identitas ledger, bukan menggantinya jadi dashboard gelap.

## v3 — feel (rebuild 18 Nov 2026 malam, dari riset dashboard nyata)

Riset (report di `~/workspace/research_notes/dashboard-feel-research-20261118-2240/`) menemukan kombinasi persis v2 — kertas hangat + serif kontras tinggi + aksen terracotta — tercatat sebagai AI tell #1 di catatan art-direction Awwwards 2026, bersama broadsheet (hairline di mana-mana, radius nol) dan template chrome (meta string "A · B · C", mono untuk semua label kecil). Dokumen yang sama bilang "defaults, not crimes" — dan ada bukti lawan hidup (Divyum, palet hampir identik, standar SOTD). Bedanya bukan palet, melainkan satu motif yang dibawa ke semua state, motion yang memang milik konsep, dan ratusan detail kecil yang diputuskan. Jadi arah ledger tetap — yang ditambah lapisan craft-nya.

- **Motif "first light" di semua state.** Logo bukan lagi busur fajar v2, melainkan sapuan radar: horizon tinta + busur sapuan vermilion yang naik dari horizon + blip di ujung busur + cincin scope samar. Motif yang sama muncul sebagai ornamen panel model, ornamen empty state, dot di akhir bar implied value, dot di kicker detail, dot di chip movers, dan terbalik (kertas + vermilion) di footer tinta. Tidak ada motif kedua.
- **Logo digambar lewat kode SVG** (svg-creator loop: tulis → render → lihat → perbaiki). Teruji kecil (16px, cincin dalam menghilang dengan anggun) dan besar. Tanpa xmlns inline (gate melarang http:// di nilai atribut) dan tanpa favicon — favicon butuh xmlns dengan URL http://, yang akan menggagalkan gate; sengaja dilepas dan dicatat di sini.
- **Monogram per baris.** Tiap protokol punya tile inisial (huruf pertama nama) di atas tint warna kategorinya (6 hue yang sama dengan dot kategori). Self-contained — snapshot tidak menyediakan URL logo, dan hotlink rapuh saat offline. Tile 36px di board, 48px di detail.
- **Template chrome dipecah.** Meta header "A · B · C" ditulis ulang jadi kalimat ("Snapshot 14 Nov 2026, from the DefiLlama protocol index — scored by the radar-2 model."). Mono hanya untuk angka; label, eyebrow, dan meta pakai sans. Satu eyebrow per halaman (kicker detail).
- **Densitas dipilih sadar.** Baris board 12px padding vertikal; dengan monogram 36px + nama dua baris, tinggi baris ~60px — lebih lega dari standar nyaman 44px, dan itu keputusan sadar: baris membawa identitas (monogram + dua baris nama), jadi 44px tidak mungkin tanpa membuang sub-line. Dicatat di sini, bukan kebetulan.
- **Angka yang membuktikan diri.** Board singkat ($1.30B); detail penuh ($1,296,381,217) + singkat di sampingnya; hover (title) memberi nilai penuh untuk setiap angka singkat. Persen selalu bertanda, 2 desimal; tabular-nums di semua permukaan angka.
- **Movers strip** di atas board: top-3 implied value + gainer/loser 7d terbesar — pandangan 5 detik, satu baris chip, tidak bersaing dengan board.
- **Motion: satu set token** (`--dur-micro 150ms`, `--dur-ui 220ms`, `--dur-panel 320ms`, `--dur-page 400ms`, `--ease-out cubic-bezier(.16,1,.3,1)`, `--ease-count cubic-bezier(.2,.7,.2,1)`, `--stagger 50ms`). Arketipe Corporate/Premium (bukan Playful): tanpa bounce/spring di tool finansial. Setiap keyframe hanya menjelaskan perjalanan (from, tanpa to) — keadaan akhir sudah ada di markup; semua motion di dalam `prefers-reduced-motion: no-preference`; di bawah reduce, navigasi jadi swap instan dan angka tampil final.
- **Board ↔ detail: morph View Transitions.** Nama + nilai baris yang diklik morph jadi hero detail (240–400ms); sisanya cross-fade 300ms. Detail lalu berkaskade (hero → glance → persamaan → comps → farm plan, 40ms/langkah, total ≤300ms). Tanpa overlay — transisi itu sendiri kontinuitasnya. Fallback: swap instan.
- **Filter dua fase.** Baris yang tidak cocok fade + naik 8px (180ms), lalu survivor masuk ulang dengan stagger 30ms (maks 8 baris). Board 198 baris tidak pernah di-stagger. Sort: panah berputar 150ms, baris cross-fade 200ms, tanpa stagger.
- **Hover yang bekerja.** Baris: wash kertas + rank jadi vermilion + panah "→" di nama bergeser 3px (teks di dalam yang bergerak, bukan kotak). Tanpa lift/shadow/scale di baris tabel.
- **Bar draw-in sekali.** `scaleX` dari kiri, 500ms, hanya saat load pertama; setelah itu snap. Bar berakhir di dot motif.
- **Count-up hero sekali.** Hanya strip 5 fakta, load pertama, 350ms; tabel tidak pernah count-up. Sandbox mengurut ulang instan tanpa flash — flash 200ms pada baris yang pindah rank dipotong saat build untuk muat di cap dossier 64KB.
- **States.** Empty state (dengan motif + tombol clear), focus ring 2px vermilion offset 4px, `::selection` tint vermilion, footer sebagai komposisi akhir (latar tinta, wordmark besar, motif terbalik, tautan internal, meta snapshot).
- **Double rule** (2px + 1px, gap 3px) di bawah masthead dan di atas footer — tanda tangan tabel finansial cetak; tabel sendiri tetap hairline tunggal.
- **Yang tidak dilakukan:** tetap terang (bukan dark); tanpa slide-over/overlay; tanpa aksen kedua, gradien, glassmorphism, WebGL; tanpa animasi pada tabel; tanpa favicon (alasan di atas).
