# Genesis Scope v4 — Research & Design Note (redesign)

Tanggal: 19 Nov 2026. Entry: token-radar-01 "Genesis Scope", repo `0xward/genesis-scope`.
Tugas: desain ulang dashboard dari nol (layout + palet + tipografi + hierarki), BUKAN poles v3.
Lokasi kerja: `~/workspace/makefun/redesign-variants/{aurora,midnight,duo}/` — repo TIDAK disentuh.

## 0. Keputusan arah (mengikat, dari user)

Palet v3 DIBUANG TOTAL (dinilai JELEK, AI SLOP; layout/UI/UX JELEK SANGAT). Arah baru dipilih
user dari 3 referensi yang ia kirim (`~/workspace/makefun/v4-design-refs/`):

- **ref-1-portfolio-dashboard.jpg** — dashboard portfolio gelap ungu.
- **ref-2-personal-dashboard.jpg** — dashboard personal gelap ungu.
- **ref-3-yieldnest-landing.jpg** — landing YieldNest gelap, garis gelombang pink/ungu.

Deliverable: **1 arah utama dari referensi ini + 2 varian turunan dari arah yang sama**
(bukan 3 arah tak berhubungan). Arah utama = **aurora** (paling setia pada referensi);
turunan = **midnight** (ungu lebih dalam) dan **duo** (ungu + biru sebagai aksen kedua).
Ketiganya disajikan sebagai PILIHAN — laporan ini tidak memilih satu pun.

## 1. Apa yang diambil dari tiap referensi — dan apa yang sengaja TIDAK diambil

### ref-1 (portfolio gelap ungu) — DIAMBIL
Sidebar navigasi kiri; angka hero besar + chart area gradient; strip 4 KPI card; tabel
Holdings berdampingan dengan donut Allocation; spacing lega; tipografi tegas; satu sistem
aksen ungu yang disiplin. Pemetaan ke data kita: sidebar = navigasi board (Overview,
Watchlist, Farm Plans, Methodology, Live comps); hero = top implied value + chart top-10;
KPI strip = total protokol (758), watchlist ter-cover (40/40), top implied ($42.0M),
farm plan (198); tabel = ranking protokol; donut = alokasi kategori.
TIDAK DIAMBIL: nama/logo/konten orang lain; Market Indices + sparkline (tidak ada data
pasar harian di snapshot); Performance bar chart + Sector Exposure (diganti donut +
movers, yang memang ada datanya); angka-angka portfolio orang lain.

### ref-2 (personal gelap ungu) — DIAMBIL
Kerapian grid dan konsistensi kartu: semua kartu satu radius, satu border, satu ritme
padding; hierarki judul yang sama di tiap kartu. TIDAK DIAMBIL: sapaan besar + jam,
weather, playlist, dock bawah — elemen tanpa fungsi di radar ini tidak ditempel.

### ref-3 (YieldNest) — DIAMBIL
Latar gelap dengan garis gelombang/kontur tipis pink-ungu yang mengalir (yang user
KHUSUS SUKA); hierarki judul besar; metrik sebagai angka hero. TIDAK DIAMBIL:
testimoni, CTA, konten landing; tidak ada elemen marketing di dashboard ini.
KOREKSI BIRU (user mengecek ulang gambar, mengikat): biru ADA di ref-3 — (1) judul hero
kata "DeFi Yields." berwarna BIRU terang; (2) garis gelombang bergradasi pink → ungu →
BIRU, ujung garis di pojok kanan atas dan kiri bawah memudar ke biru; (3) kartu metrik
"$1920.058" gradasi teal/biru; (4) kata "YIELDNEST" di "WHY CHOOSE" berwarna biru;
(5) tombol CTA "Connect Wallet" putih kebiruan. Maka sistem aksen = UNGU (utama) +
BIRU (kedua, kalem) — lihat §5.

## 2. Riset pendukung (dipelajari sebelum memilih warna; brief awal)

Riset ini dilakukan lewat browser.search + browser.open 19 Nov 2026, dari sistem desain
dashboard data kelas dunia yang nyata (bukan template). Prinsip yang dibawa masuk:
satu aksen + netral, warna = makna, bukan dekorasi.

- **kami design system** — kertas hangat #f5f4ed, ink-blue #1B365D sebagai SATU-SATUNYA
  warna kromatik (≤5% permukaan), serif bobot 500, tanpa abu-abu dingin.
- **Financial Times** — kertas pink #fff1e5, navy + claret, serif Financier, hairline
  rules, tanpa border/bayangan/gradient.
- **Bloomberg terminal** — hiper-padat, monospace, amber-on-black, grid 4 panel keras,
  hairline, radius nol, warna = state saja. (Terminal gelap itu sendiri pola field yang
  harus DIHINDARI peniruannya — midnight mengambil angka mono tapi BUKAN densitas dan
  BUKAN amber terminal.)
- **Tufte** — data-ink ratio: hapus tinta non-data dan chartjunk; lie factor.
- **Vercel / Linear** — minimalisme monokrom, warna = makna, pengekangan ekstrem.
- **Steep / ColorMind** — hitam tinta + putih kertas + abu kabut + aksen peach; warna
  sebagai informasi, bukan dekorasi.
- **media.io monochrome palettes** — Graphite Mist dan Data Dashboard (5 tingkat netral).
- **Amazon six-pager memo** — seksi bernomor, tabel bergaris, SATU aksen oranye tipis.
- **EONORYX** — identitas gelap, halaman baca ivory, garis copper/amber.
- **Mono-color editorial print** — satu/two-ink, plat dominan 70–85%, plat aksen 15–30%
  dengan satu pekerjaan spesifik.
- Catatan jujur: URL spesifik tiap sumber tidak tercatat di file ini — nama sistem dan
  prinsipnya di atas yang dipakai; tidak ada URL yang diklaim tanpa sumber.

## 3. Arah 1 — AURORA (utama, paling setia pada referensi)

**Alasan.** Ini ref-1/ref-2/ref-3 yang diterjemahkan paling langsung ke data radar:
sidebar + hero + KPI + tabel + donut, ungu violet terang sebagai identitas, gradient
area chart seperti ref-1, garis gelombang pink→ungu→biru seperti ref-3. Sans-forward,
radius 16px, spacing paling lega. Kalau user mau "yang seperti referensi", ini jawabannya.
**Token.** bg #0d0a1f · sidebar #0a0718 · kartu #17122e · hover #1e1839 · garis #2c2350 ·
tinta #f2eefc · sekunder #a79ec7 · tersier #8f86b3 · aksen ungu #a78bfa · ungu terang
#c4b5fd · ungu dalam #7c3aed · aksen kedua biru #60a5fa · hijau #34d399 · merah #fb7185.
**Tipografi.** System sans; h1 44px/700, angka hero 40px/700, angka tabel tabular-nums.
**Uji "jelas bukan dari cetakan yang sama".** Field = latar gelap generik + aksen jenuh +
chip warna-warni + kartu seragam. Aurora: sidebar navigasi nyata (bukan hiasan), hero
dengan chart top-10 berlabel jujur, donut alokasi + legenda teks, tanpa satu pun chip
warna-warni, tanpa dot kategori, satu aksen ungu + hijau/merah semantik. Juri yang
membuka dua dossier berdampingan melihat struktur yang dirancang (bukan template):
LULUS — dengan catatan jujur: aurora adalah yang paling dekat dengan bahasa visual
ref-1, jadi pembedanya ada di disiplin (bukan di keberanian). Itulah peran midnight/duo.

## 4. Arah 2 — MIDNIGHT (turunan: ungu lebih dalam, lebih ketat, angka mono)

**Alasan.** Varian untuk juri yang membaca aurora sebagai "terlalu ramah": latar lebih
gelap (#070510), ungu lebih dalam (#8b5cf6), radius 8px, spacing lebih ketat, dan SEMUA
angka dalam monospace (tabular, seperti instrumen) — terasa seperti alat ukur, bukan
seperti kartu marketing. Gelombang violet→biru saja, opacity lebih rendah, lebih kalem.
**Token.** bg #070510 · sidebar #050308 · kartu #100b22 · hover #16102e · garis #241b45 ·
tinta #ece7fa · sekunder #9d94bd · tersier #8a80ad · aksen ungu #8b5cf6 · ungu terang
#a78bfa (dipakai untuk teks-di-atas-ungu, lihat §7) · aksen kedua biru #3b82f6 (minimal:
hanya ujung gelombang) · hijau #34d399 · merah #fb7185.
**Tipografi.** Sans untuk teks; monospace (ui-monospace/SF Mono/Menlo/Consolas) untuk
SEMUA angka — KPI, hero, tabel, detail, donut. h1 40px, angka hero 36px.
**Uji "jelas bukan dari cetakan yang sama".** LULUS dengan tegas: tidak ada varian field
yang memakai angka mono + ungu dalam + radius 8px sekaligus; kesan pertamanya
instrumen presisi, bukan dashboard template. Risiko yang disadari: angka mono bisa
terasa "terminal" — penangkalnya: gelombang, sidebar, donut, dan hijau/merah semantik
tetap hidup, jadi ini bukan Bloomberg.

## 5. Arah 3 — DUO (turunan: ungu + BIRU sebagai aksen kedua, sentuhan serif)

**Alasan.** Varian yang memakai koreksi biru ref-3 secara penuh: biru bukan hanya di
ujung gelombang, tapi terlihat — kata aksen di hero ("launches"), nilai propensity
(P 82%), hint nav "Live comps", link/highlight sekunder, dan P di formula method.
Judul hero + angka hero memakai serif Georgia (display), sisanya sans — pasangan
tipografi yang sengaja berbeda dari dua varian lain. Radius 12px.
**Token.** bg #0e0a24 · sidebar #0b0719 · kartu #181230 · hover #201840 · garis #2e2456 ·
tinta #f0edfb · sekunder #aaa1ca · tersier #8f86b3 · aksen ungu #a78bfa · aksen kedua
biru #60a5fa (terlihat, kalem) · hijau #34d399 · merah #fb7185.
**Tipografi.** Serif Georgia untuk h1 + angka hero; sans untuk sisanya; tabular-nums
untuk angka tabel.
**Uji "jelas bukan dari cetakan yang sama".** LULUS: serif display + aksen ganda
ungu/biru yang disiplin adalah kombinasi yang tidak dipakai field (field memakai
sans + satu aksen jenuh + chip warna-warni). Biru di sini kalem dan punya pekerjaan
tetap (lihat §6), bukan warna ketiga yang dilempar acak.

## 6. Sistem warna semantik LENGKAP (mengikat, sama di ketiga varian)

Satu warna = satu makna, konsisten di seluruh board dan di semua permukaan (tabel, KPI
strip, detail view, chart). Kontras dihitung (WCAG), bukan ditebak — angka di bawah
adalah rasio terhadap latar kartu (#17122e aurora / #100b22 midnight / #181230 duo);
rasio terhadap latar halaman sedikit lebih tinggi. Semua teks body ≥4,5:1 (lihat §7).

| Warna | Hex | Makna | Dipakai pada |
|---|---|---|---|
| HIJAU | #34d399 | Positif / kuat | 7d naik; $/jam positif; implied value (kolom tabel, angka hero $42.0M, KPI $42.0M, total donut $923.0M, nilai di detail & skenario); bar positif (bar implied di tabel, dot chart top-10, label $42.0M); KPI favorables (40/40, 198); gain |
| MERAH (lembut) | #fb7185 | Lemah / negatif | 7d turun (140 dari 198 baris negatif — merah memang dominan di kolom ini, dan itu jujur); $/jam negatif (77 baris); R² 0,143 di method view (3 penanda `.weak`: R² di paragraf fit, "14%" penjelasan varians, R² di catatan chart) |
| UNGU | #a78bfa (aurora/duo) / #8b5cf6 (midnight) | Aksen utama / identitas | Judul, eyebrow, state aktif nav (bar kiri + latar), garis + fill chart, bandbar detail, segmen donut (tint), huruf avatar baris, logo |
| BIRU | #60a5fa (aurora/duo) / #3b82f6 (midnight) | Aksen kedua (kalem) | Kata aksen hero ("launches"), nilai propensity P (82% di hero + detail + formula method), hint nav Live comps (duo), link/highlight sekunder, ujung gradasi gelombang |
| NETRAL GELAP | bg + kartu + garis (lihat §3–5) | Dasar | Latar, permukaan kartu, hairline, teks sekunder/tersier |
| NETRAL (teks) | tinta/sekunder/tersier | Bukan gain, bukan lemah | TVL (besaran, bukan gain); biaya gas & deposit (biaya, bukan kerugian); nol / n/a; share % di legenda donut (komposisi, bukan gain); multiplier & tilt (faktor netral) |

Keputusan per elemen (didokumentasikan, bukan bebas):
- **Hijau di KPI strip:** 40/40 dan 198 hijau (kelengkapan yang menguntungkan), $42.0M
  hijau (nilai), 758 NETRAL (hitungan mentah, bukan gain).
- **TVL netral, implied hijau.** TVL adalah besaran; implied value adalah klaim nilai
  (gain yang dijanjikan model) — pemisahan ini yang membuat hijau tetap bermakna.
- **Biaya gas netral, bukan merah.** Gas adalah biaya yang diketahui, bukan sinyal lemah.
  Merah hanya untuk kinerja yang negatif/lemah.
- **Donut = pengecualian komposisi.** Segmen memakai tint ungu berdasarkan BESAR share
  (bukan tanda +/-); nilai di legenda hijau (itu implied value), share % netral (itu
  komposisi, bukan gain). Kalau semua share diwarnai hijau, hijau kehilangan makna.
- **Method view: merah HANYA untuk R².** Tabel validasi (error dex, within-2×) tetap
  netral — itu pengukuran, dan teksnya sudah jujur ("TVL alone explains only 14%").
  Mewarnai semua angka validasi merah akan membuat merah jadi wallpaper, bukan sinyal.
  Band 80% di detail juga netral (lebar band = ketidakpastian yang jujur, bukan kelemahan).
- **Nol / tidak ada data = netral** (n/a, 7d null pada 2 baris).

## 7. Sistem aksen ungu + biru + angka kontras (WCAG, dihitung)

Kontras teks (semua ≥4,5:1 untuk teks body; angka adalah rasio pada latar kartu):

| Elemen | Aurora | Midnight | Duo |
|---|---|---|---|
| Tinta pada kartu | 15,84:1 | 15,90:1 | 15,59:1 |
| Sekunder pada kartu | 7,19:1 | 6,77:1 | 7,41:1 |
| Tersier pada kartu | 5,36:1 | 5,28:1 | 5,33:1 |
| Ungu (aksen) pada kartu | 6,64:1 | 4,54:1 | 6,61:1 |
| Biru (aksen kedua) pada kartu | 7,11:1 | 5,22:1 | 7,07:1 |
| Hijau pada kartu | 9,40:1 | 9,99:1 | 9,35:1 |
| Merah lembut pada kartu | 6,71:1 | 7,14:1 | 6,68:1 |
| Teks tombol primary (#1e1033 di atas ungu) | 6,56:1 | 6,56:1* | 6,56:1 |

\* Midnight: aksen #8b5cf6 hanya 4,21:1 sebagai latar tombol dan 4,32:1 untuk huruf
avatar — keduanya di bawah 4,5 — sehingga midnight memakai ungu terang #a78bfa untuk
teks-di-atas-ungu (huruf avatar `.mono` dan latar tombol primary), yang memberi 6,72:1
dan 6,56:1. Perbaikan ini ditemukan dari hitungan, bukan dari tebakan.
Perbaikan kontras yang sama: warna tersier awal aurora #7d739e (4,14:1 di kartu) dan
midnight #6e658f (3,59:1) dinaikkan ke #8f86b3 / #8a80ad (≥5,28:1).
Batas jujur: segmen donut paling gelap #5b21b6 hanya 2,01:1 terhadap kartu — itu grafik
non-teks (bukan teks), dan tiap iris diidentifikasi oleh legenda teks (nama + % +
nilai), bukan oleh warna saja. Tint donut yang dipakai bersama: #c4b5fd, #a78bfa,
#8b5cf6, #7c3aed, #6d28d9, #5b21b6.

## 8. Latar gelombang SVG (ref-3, mengikat di ketiga varian)

- Satu sistem garis yang sama di seluruh halaman (board, detail, filtered) — bukan latar
  berbeda per view. Generator: `~/workspace/makefun/verify/wave_gen.py` (tulis tangan,
  efisien — path Q-segment dari sampel sinus, koordinat integer).
- Garis: tipis (1px), opacity rendah (0,06–0,14), di belakang konten (`position:fixed`,
  `z-index:0`, `pointer-events:none`), bergradasi horizontal pink → ungu → BIRU
  (satu `<linearGradient>` bersama; ujung garis memudar ke biru seperti ref-3).
  Garis mengelompok di dekat tepi atas (y 70–235) dan bawah (y 660–840) supaya area
  tengah — tempat tabel — tetap bersih; 1–2 busur konsentris di pojok kanan atas.
- Dampak byte: aurora 2.023 byte (9 path) · duo 1.807 byte (8 path) · midnight
  1.445 byte (6 path). Dampak keterbacaan: diuji lewat screenshot board — tidak ada
  angka yang jadi lebih susah dibaca; garis paling terlihat di area hero dan tepi, tidak
  pernah menumpuk teks tabel.
- Catatan: duo memakai gelombang yang sama dengan aurora (pink→ungu→biru); biru sebagai
  aksen kedua yang "terlihat" di duo datang dari elemen UI (§5), bukan dari gelombang
  yang berbeda.

## 9. Alur pembaca + hasil uji (dipakai sungguhan, bukan dilihat saja)

Alur yang dirancang: mendarat → paham ranking dalam hitungan detik (hero $42.0M +
chart top-10 + KPI) → masuk detail satu protokol (klik baris) → lihat farm plan
(8 langkah + skenario + break-even) → tahu langkah berikutnya (nav Farm Plans /
Methodology). Setiap langkah punya tempat yang jelas: hero → KPI → kontrol → tabel +
rail → detail di atas tabel → footer.
Uji alur (Playwright, `~/workspace/makefun/verify/flow-test.py`, 15 langkah per varian):
**15/15 LULUS di ketiga varian, 0 console error.** Yang diuji: cari "veda" → 1 baris;
filter kategori Dexs → 21 baris; sort 7d → urutan berubah (Bittensor dTAO →
Manifest Trade); klik baris → detail #1 Polymarket International; Close → detail
hilang; nav Watchlist → 40 baris + state aktif; nav Farm Plans → terurut $/jam
(diverifikasi: baris pertama Polymarket International $213,51/jam = maksimum data);
nav Methodology → panel method + 3 penanda R² lemah; nav Live comps → 24 baris;
nav Overview → kembali ke board; checkbox Watchlist-only → 40 baris; empty state
("zzzznope") → tombol Clear filters → board kembali 50 baris.
Titik membingungkan yang ditemukan saat uji: (1) `.main` awal meluap 32px di viewport
1440 (max-width 1240 + margin sidebar 232) sehingga kolom $/hr terpotong — DIPERBAIKI
(max-width calc(100vw − 232px), padding 32px, rail 272px, bar 100px); (2) catatan
snapshot di sidebar menampilkan URL + timestamp DefiLlama yang membungkus berantakan —
DIPERBAIKI (sidebar hanya tanggal; sumber lengkap tetap di footer).
Screenshot yang dibaca sendiri: board 1440×1100 + detail 1440×900 + filtered
1440×1100 per varian (9 file di `shots/` tiap varian + versi kuantisasi 256-warna).
Dibaca: aurora board (2×, sebelum/sesudah perbaikan), aurora detail, aurora filtered,
midnight board, midnight detail, duo board, duo detail. Semuanya lulus baca visual:
tidak ada angka tertutup gelombang, tidak ada kolom terpotong, tidak ada elemen
tempelan. Donut menampilkan alokasi SELURUH board meski tabel terfilter — itu
disengaja (labelnya "share of total implied value") dan dicatat di sini.

## 10. Dampak byte per varian (batas juri: sumber dashboard ≤65.536 byte)

Dasar v4 lama: 54.479 byte (app.js 43.338 + app.css 10.688 + index.html 453).
Baru (app.js bersama 49.626 byte — naik karena sidebar, hero chart, donut, rail,
detail full-width; app.css + gelombang + index):

| Varian | app.js | app.css | index.html (termasuk gelombang) | Total | Sisa |
|---|---|---|---|---|---|
| aurora | 49.626 | 11.699 | 2.422 | **63.747** | 1.789 |
| midnight | 49.626 | 12.036 | 1.844 | **63.506** | 2.030 |
| duo | 49.626 | 11.807 | 2.206 | **63.639** | 1.897 |

Semua di bawah batas. Bila satu varian dipilih dan perlu tambahan, ruang yang tersisa
~1,8–2,0 KB — potong di CSS/dekorasi, BUKAN di method/ranking logic.
Catatan: app.js yang sama dipakai ketiga varian (semua warna di CSS; JS hanya membawa
kelas semantik pos/neg/weak/prop). data.js TIDAK termasuk hitungan sumber dashboard.

## 11. Yang sengaja TIDAK dilakukan

- Tidak menjiplak nama/logo/konten ref-1/2/3; tidak menempel elemen tanpa fungsi
  (weather, playlist, jam, dock, testimoni, CTA).
- Tidak ada chip warna-warni per kategori; dot kategori 6 hue DIHAPUS (kategori hanya
  teks di sub-baris tiap row); tidak ada strip warna dekoratif; tidak ada gradient latar.
- Tidak ada tombol pajangan: semua nav, sort, filter, search, dan detail benar-benar
  jalan (diuji §9). Tidak ada filter yang tidak mengubah apa-apa.
- Tidak ada angka yang dikarang: hero, KPI, donut, chart, dan detail semuanya dari
  data.js (total implied donut $923,0M = jumlah 198 baris; diverifikasi dari data).
- Tidak menyentuh repo (dashboard/, README, DESIGN.md, lib/, main.ts, vendor/,
  screenshots/), tidak commit/push/submit, tidak menyentuh pin/delegasi/kredensial.
- Tidak memilih satu varian untuk user — ketiganya adalah PILIHAN.
- Tidak mengklaim juara, win rate, atau skor di atas r3 (scorer tersegel; kalibrasi
  lokal tidak mungkin — tidak ada judge/anchors di kit, Docker container tidak bisa
  start di VM ini).

## 12. Batas jujur & catatan akhir

- "Clearly not from the same mold" adalah penilaian manusia dari screenshot berdampingan,
  bukan metrik — ditulis per arah di §3–5 apa adanya, termasuk catatan bahwa aurora
  adalah yang paling dekat dengan referensi.
- Donut "Other" = 51% dari total implied value — itu realitas data (banyak kategori
  kecil), bukan pilihan desain; top-5 + Other adalah penyajian yang jujur.
- 140 dari 198 baris ber-7d negatif dan 77 ber-$/jam negatif — merah memang sering
  muncul; itu kejujuran data, bukan alarm palsu.
- Perbandingan premium: ketiga varian disandingkan dengan ref-1/2/3 saat membaca
  screenshot ("apakah ini terasa sekelas?") — aurora lolos setelah perbaikan overflow;
  midnight lolos sebagai instrumen; duo lolos sebagai display serif + biru. Tidak ada
  varian yang diserahkan dalam keadaan "biasa".
