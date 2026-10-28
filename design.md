# DESIGN.md — Sistem Desain CSL-LINK

Aturan desain untuk **CSL-LINK (Corporate Secretary & Legal)** — sistem mandiri,
BUKAN bagian dari cangkang GESIT PORTAL (`design.md` di folder ini berlaku untuk
GESIT PORTAL saja; jangan dicampur).

Dikunci bersama Ketua pada 27 Oktober 2026. File acuan implementasi:
`LKPM-CSLLink-v5.html` (cangkang + modul Tracking LKPM). Semua halaman CSL-LINK —
Dashboard, Request/Ticketing, Task Management, Tracking LKPM, Budget & Expenses,
Phone Directory, Reports — WAJIB mengikuti aturan ini supaya tampil serasi.

---

## 1. Prinsip penyajian data (paling penting)

Urutan berpikir setiap halaman, dari atas ke bawah:

1. **Ringkasan dulu, tabel kemudian.** Setiap modul dibuka tampilan **Analisis**
   (KPI + progress + temuan), bukan tabel mentah. Pengguna harus paham keadaan
   dalam 10 detik pertama.
2. **Masalah diangkat ke atas.** Temuan yang butuh tindakan tampil sebagai kartu
   **Perlu Perhatian** dan daftar **Tindak Lanjut** — jangan dikubur di dalam tabel.
3. **Status selalu berupa chip berwarna + ikon**, tidak pernah teks polos.
   Kosakata status per modul didefinisikan sekali (lihat §8 untuk LKPM) dan
   dipakai konsisten di semua tempat.
4. **Detail dibuka lewat panel geser** dari kanan (bukan halaman baru, bukan modal)
   supaya konteks daftar tidak hilang.
5. **Satu baris = satu entitas.** Tidak ada baris judul/header yang ikut terhitung
   sebagai data.
6. **Tidak ada data karangan.** Angka, nama, tanggal, dan nomor dokumen hanya dari
   sumber data resmi modul itu. Kalau data belum ada, tampilkan keadaan kosong
   yang jujur — jangan dipoles.

## 2. Warna (design token)

```css
:root{
  --title:#0a2540;   /* navy — judul halaman, tombol primer, toggle aktif */
  --ink:#16233a;     /* teks utama */
  --muted:#758196;   /* teks sekunder — teks TIDAK BOLEH lebih terang dari ini */
  --faint:#98a2b5;   /* hanya untuk ikon dekoratif & placeholder */
  --line:#e6e9f0;    /* garis hairline semua kartu & tabel */
  --bg:#f6f7f9;      /* latar halaman */
  --card:#ffffff;
  --gold:#c9a227;    /* aksen merek — subjudul, logo */
  --blue:#2f6bff;    /* info / jadwal / penekanan sekunder */
  --blue-bg:#e8effe;
  --green:#12995c;   --green-bg:#e4f6ec;  --green-bd:#bfe8d2;  /* sukses / terlapor */
  --red:#cf3527;     --red-bg:#fdecea;    --red-bd:#f6cfc9;    /* masalah / sanksi */
  --amber:#a86e12;   --amber-bg:#fdf2dc;  --amber-bd:#f0dcab;  /* bukti kurang / perhatian */
  --amber-ic:#d99a26;
  --grey-bg:#eef0f4; --grey-tx:#667085;   /* netral / tidak wajib / non-jadwal */
}
```

Aturan warna:
- Navy (`--title`) hanya untuk: judul halaman, tombol primer, toggle aktif,
  teks nama entitas. Bukan untuk latar blok besar.
- Gold hanya aksen tipis: subjudul kapital, logo, garis aksen. Tidak pernah
  jadi warna tombol atau latar kartu.
- **Tidak ada gradien warna pada elemen UI.** Latar selalu rata (`--bg` /
  `--card`). Satu-satunya pengecualian: panel merek di halaman login.
- Status TIDAK PERNAH diberi warna di luar peta §8.

## 3. Tipografi

- Keluarga huruf: **IBM Plex Sans** (400/500/600/700). Nomor dokumen
  (NKU, SNK, nomor tiket) memakai **IBM Plex Mono** (500/600).
- **Bobot maksimum 700.** Dilarang ExtraBold 800 — itulah yang membuat tampilan
  terasa "template AI generik".
- Skala: judul halaman 29px/700 `--title`, letter-spacing −0.4px · subjudul
  11px/700 gold, kapital, letter-spacing 1.8px · teks isi 14px/400–500 ·
  label kecil 11px/700 `--muted` kapital letter-spacing 0.6–0.7px ·
  angka KPI 30px/700.
- Teks isi tidak pernah memakai opacity < 1 dan tidak lebih terang dari `--muted`.

## 4. Radius, bayangan, jarak

```css
--r-lg:16px;  /* kartu */
--r-md:12px;  /* sel panel, kotak ikon */
--shadow:0 1px 2px rgba(16,35,64,.05), 0 8px 24px rgba(16,35,64,.05);
```

- Kartu radius 16px, border 1px `--line`, bayangan di atas. Tidak ada kartu
  di dalam kartu bertumpuk lebih dari satu tingkat.
- Tombol radius 10px; chip & tombol Detail berbentuk pill (99px);
  kotak status triwulan 26×26px radius 8px; kotak ikon KPI 38px radius 11px.
- Jarak antar-kartu 13px; padding konten 28px 34px; lebar konten maks 1460px.

## 5. Cangkang (shell) — sama di semua halaman

- **Sidebar** 252px, putih, fixed, border kanan `--line`:
  brand (logo swoosh gold-navy + "CSL-LINK" 16.5px/700 + "Corporate Secretary
  & Legal" 11px `--muted`) → grup menu "Main Menu" → grup "Settings" →
  kartu pengguna menempel di bawah (avatar lingkaran inisial + nama + email).
  Item aktif: latar `#edf0f5`, teks `--title` 700. Urutan menu tidak diubah
  tanpa persetujuan.
- **Topbar** sticky, putih 92% + blur 8px, border bawah `--line`:
  breadcrumb (Home › Modul) kiri; kanan: kotak perintah
  "Search command or menus... ⌘K" (latar `--grey-bg`, lebar ±290px), ikon globe,
  lonceng, mode gelap, avatar pengguna.
- **Baris judul**: judul + subjudul gold di kiri; aksi di kanan —
  segmen toggle konteks (mis. tahun), Ekspor, Impor, tombol primer navy
  "+ Tambah Data", tombol muat-ulang ikon-saja.

## 6. Komponen

- **Toggle tampilan**: wadah `#e9ecf1` radius 11px; tombol aktif navy, teks
  putih. Tab ringkasan bernama **"Analisis"** — kata "Dashboard" hanya untuk
  menu utama di sidebar.
- **Segmen toggle** (tahun/kategori): wadah sama; aktif = putih + bayangan
  halus + teks hijau (`--green`) 600.
- **Kartu KPI**: ikon soft sesuai peran (biru info, hijau sukses, merah
  masalah, emas arsip) + angka 30px + label 600 + sub `--muted`;
  chip persen di kanan atas (hijau di `--green-bg`; merah bila indikator buruk).
- **Progress per grup**: label 600 + angka "x dari y" `--muted` kanan;
  bar 9px pill di rel `--grey-bg`; isi biru, hijau = tuntas, kuning
  (`--amber-ic`) = sebagian di luar jadwal, merah = sangat tertinggal.
- **Kartu Perlu Perhatian**: daftar item ikon-kotak 34px (merah/kuning/biru/
  hijau sesuai jenis temuan) + judul 600 + penjelasan 12.5px `--muted`.
- **Tabel**: header 11px kapital `--muted` 700, padding sel 12px 14px,
  baris bisa diklik (hover `#fafbfc`), nama entitas `--title` 600 + sub-info
  11.5px `--muted` di bawahnya, aksi "Detail ›" pill ber-border di kanan.
- **Filter**: chip pill ber-border; aktif = navy. Pencarian pill di kanan.
- **Panel detail**: geser dari kanan, lebar 430px, di atas scrim
  `rgba(10,25,47,.34)`; berisi judul, grid fakta 2 kolom (sel latar `#fbfbfc`
  radius 12px), daftar rincian per periode, dan kotak catatan berwarna
  mengikuti jenis status. Tutup dengan tombol ×, klik scrim, atau Esc.
- **Modal** hanya untuk form input (Tambah/Edit Data) — tidak untuk detail.
- **Toast**: navy, pill radius 12px, muncul dari bawah, hilang ±3,4 detik.
- **Impor/Ekspor Excel** selalu tersedia di modul berbasis tabel.

## 7. Ikon

- Ikon = **SVG garis gaya Lucide** (stroke 2, ujung membulat), ukuran 15–19px.
- **DILARANG memakai emoji sebagai ikon** — membuat tampilan terlihat
  hasil generate AI.
- Pengecualian glyph teks yang memang bagian dari UI sistem operasi,
  misalnya "⌘K" pada kotak perintah.

## 8. Aturan data & status — modul Tracking LKPM

Berlaku sebagai contoh pola untuk modul lain: setiap modul mendefinisikan
kosakata statusnya sendiri mengikuti pola ini.

**Definisi hitung (jangan diubah tanpa konfirmasi Ketua):**
- Satu unit kegiatan = satu baris KBLI/NKU. Baris judul perusahaan BUKAN unit.
- Penyebut persentase mengecualikan unit **Tidak Wajib** dan **Handover**;
  unit **Per-Semester** hanya dihitung pada TW II & TW IV.
- Status turunan: **Bukti Kurang** = sudah Lapor tetapi nomor SNK kosong.
- Sumber data resmi: `lkpm_data.json` (ekstrak terverifikasi dari tracker
  Excel CSL). Dilarang membaca ulang Excel mentah untuk angka tampilan.

**Peta status → chip & sel triwulan:**

| Status | Chip | Sel TW | Arti |
|---|---|---|---|
| Terlapor | hijau | centang hijau | Lapor + nomor SNK tercatat |
| Bukti Kurang | kuning | centang hijau | Lapor, SNK belum dicatat |
| Belum Lapor | merah | silang merah | Wajib lapor, belum ada laporan |
| Sanksi | merah | sesuai keadaan | Perusahaan menerima sanksi |
| Per-Semester | biru | strip di TW non-jadwal | Lapor 2× setahun |
| Tidak Wajib | abu | strip abu | Mikro / dikecualikan |
| Handover | abu | strip abu | Sudah diserahkan ke PM |
| Perlu Cek | kuning | sesuai keadaan | Data bertentangan, perlu verifikasi |

**Angka acuan penerimaan (hasil render harus sama persis):**
- 2026: 81 perusahaan · 70 unit · grup 13 / 25 / 32 · TW 23 / 33 / 33 / 0 ·
  26 perusahaan mikro tidak wajib · sanksi: Bersinar Abadi Energi &
  Terang Abadi Energi · 28 baris TW III lapor tanpa SNK.
- 2025: 52 unit · TW 16 / 41 / 40 / 52 (tuntas).

## 9. Bahasa & penamaan

- Seluruh UI **Bahasa Indonesia**; istilah sistem yang sudah baku (Dashboard
  di sidebar, nama modul) dipertahankan.
- Nama orang, perusahaan, dan dokumen ditulis persis seperti sumbernya —
  termasuk awalan nol pada KBLI (mis. 07293, 08105).
- Kalimat UI pendek dan faktual. Dilarang kalimat panjang bergaya narasi.

## 10. Anti-pola (penyebab tampilan terasa "generic AI")

1. Font template generik dengan bobot 800 di mana-mana.
2. Gradien warna pada tombol/kartu/latar.
3. Emoji sebagai ikon.
4. Tabel padat ditampilkan sebelum ringkasan.
5. Data karangan: angka, nama, status, atau aktivitas yang tidak ada di sumber.
6. Warna status di luar peta §2/§8, atau satu status tampil dengan dua warna.
7. Teks isi lebih terang dari `--muted` atau memakai opacity.
8. Detail dibuka sebagai halaman baru/modal (harus panel geser).
9. Mencampur token GESIT PORTAL (Liquid Glass, token `design.md`) ke CSL-LINK.

## 11. Checklist penerimaan halaman baru

- [ ] Cangkang sama persis: sidebar, topbar, baris judul, urutan aksi.
- [ ] Token warna/radius/bayangan hanya dari §2 & §4 — tidak ada nilai baru.
- [ ] Tipografi Plex Sans/Plex Mono, bobot maks 700 (§3).
- [ ] Ada tampilan Analisis sebelum tabel; ada kartu Perlu Perhatian bila
      modulnya punya temuan (§1, §6).
- [ ] Semua status memakai chip + ikon sesuai peta modul (§6, §8).
- [ ] Detail memakai panel geser; modal hanya untuk form (§6).
- [ ] Tidak ada emoji ikon, tidak ada gradien elemen (§7, §10).
- [ ] Semua angka cocok dengan sumber data resmi modul (§1.6, §8).
- [ ] UI Bahasa Indonesia, kalimat pendek faktual (§9).

---

*Riwayat: v1 dikunci 27 Okt 2026 dari mockup Tracking LKPM
`LKPM-CSLLink-v5.html` (cangkang CSL-LINK + penyajian data summary-first +
tipografi IBM Plex). Perubahan aturan hanya lewat Ketua.*

## 12. Modul Routine Activity

Routine Activity terdiri dari lima modul tracking khusus — **RUPS-AR, LKPM,
TBK, Offshore, AD-MGT** — masing-masing mengikuti pola §1/§6 dokumen ini
(Analisis + Register + panel geser) dengan kosakata statusnya sendiri.
Definisi lengkap per modul, sumber data, dan tahapan pengerjaannya ada di
`Blueprint-5-Modul-Routine-Activity.md`. Kategori Task Management lainnya
(PERMIT, ASET, AGREEMENT, LIKUIDASI, CASES, PROJECT, Others, LDD) tidak
dipakai.

## 13. Pola halaman universal (seluruh sistem)

Setiap halaman data di CSL-LINK — tanpa kecuali modul — mengikuti kerangka
yang sama. Perbedaan antarhalaman hanya pada datanya, bukan strukturnya.

1. **Baris judul**: judul 29px/700 `--title` + subjudul gold kapital
   (satu frasa pendek Bahasa Indonesia) + deretan aksi baku di kanan:
   segmen konteks (periode/tahun) → Ekspor → tombol primer navy
   "+ Tambah …" → tombol muat-ulang ikon-saja. Urutan tidak berubah.
2. **Toggle tampilan** bila halaman punya dua cara melihat data:
   tab pertama selalu **Analisis**, tab kedua daftarnya (**Perusahaan** /
   **Transaksi** / **Register**, sesuai modul). Satu halaman = satu
   dataset; dilarang memecah satu dataset ke dua halaman/rute.
3. **Tab Analisis** selalu berisi, berurutan: kartu KPI (maks 4) →
   Progress/ringkasan per kelompok → **Perlu Perhatian** → **Tindak
   Lanjut** (bila modulnya punya antrean kerja).
4. **Tab daftar** selalu berisi: filter chip (dengan hitungan) →
   pencarian pill di kanan → tabel (nama entitas `--title` 600 + sub-info
   `--muted`, chip status, aksi "Detail ›").
5. **Detail selalu panel geser** 430px dari kanan (§6). Modal hanya form.
6. **Halaman formulir panjang** (Settings, form input besar) memakai pola
   kartu seksi berurutan + tombol simpan navy di bawah, label mengikuti
   §3 (11px kapital `--muted`).
7. **Halaman direktori/katalog** (Phone Directory) mengikuti pola tab
   daftar penuh: KPI kecil → chip kategori → pencarian → tabel/kartu.
8. Tidak ada halaman yang boleh menciptakan pola barunya sendiri. Bila
   kebutuhan baru muncul, pola ditambahkan ke dokumen ini lebih dulu.

## 14. Keseragaman lintas sistem

Aturan ini menutup sumber ketidakseragaman yang ditemukan pada audit
27 Okt 2026 (Laporan-Analisa-CSL-LINK-2026-10-27.md):

1. **Bahasa**: seluruh UI Bahasa Indonesia — judul, subjudul, header
   tabel, tombol, placeholder, keadaan kosong. Yang dipertahankan dalam
   bahasa asal hanya: nama modul/sistem (CSL-LINK, Budget & Expenses),
   istilah hukum baku (RUPS, LKPM, Tbk), dan nama dokumen. Tidak ada
   lagi subjudul Inggris seperti "Overview of…" / "Unified management…".
2. **Format tanggal** satu pola di semua halaman dan ekspor:
   `5 Okt 2026` (hari tanpa nol di depan, bulan singkatan Indonesia).
   Rentang ditulis `1–10 dari 69 entri`.
3. **Format angka & uang**: pemisah ribuan titik (`145.350.710`),
   desimal koma (`3,5%`). Uang selalu diawali `Rp ` untuk IDR; valuta
   asing ditulis nominal + kode (`HKD 1.460`) dan padanan IDR-nya
   diawali `≈`. Angka subtotal WAJIB berlabel "Subtotal" — tidak boleh
   tampil seolah total (lihat design-budget.md §4).
4. **Kapitalisasi**: nama kategori, status, dan label memakai Title
   Case (Notaris, Terlapor, Disetujui). Kapital semua hanya untuk label
   kecil §3 dan subjudul gold. Header tabel tidak kapital semua kecuali
   gaya 11px §6.
5. **Tombol**: tepat SATU tombol primer navy per halaman ("+ Tambah …"
   atau aksi utama modul). Warna lain (ungu, hitam, biru terang) untuk
   aksi utama dilarang. Aksi sekunder selalu tombol putih ber-border.
6. **Rute**: satu modul = satu rute. Dilarang halaman kembar seperti
   `/budget` vs `/budget-expense`. Rute lama dialihkan, bukan dibiarkan.
7. **Keadaan kosong**: tabel tanpa hasil menampilkan kalimat faktual
   ("Tidak ada baris yang cocok dengan filter.") di dalam kartu tabel —
   bukan halaman kosong, bukan ilustrasi besar.
8. **Memuat data**: angka 0 sesaat saat memuat diganti kerangka
   (skeleton) abu `--grey-bg` seukuran kartu — angka 0 palsu tidak boleh
   tampil sebagai data.
9. **Nama & ejaan data** mengikuti sumbernya persis (nama perusahaan,
   singkatan grup, awalan nol KBLI). Perbedaan ejaan antarhalaman untuk
   entitas yang sama dianggap cacat.

## 15. Peta warna status lintas modul

Makna warna bersifat global; label boleh khas modul, warnanya tidak.

| Warna | Makna global | Contoh label per modul |
|---|---|---|
| Hijau | Tuntas / disetujui / aktif sehat | Terlapor (LKPM) · Selesai (RUPS) · Disetujui (Budget) · Completed (Task, Ticketing) · Aktif (Offshore) · Efektif (AD-MGT) |
| Biru | Terjadwal / sedang berjalan / informatif | Terjadwal (RUPS) · Proses Kemenkumham (AD-MGT) · Paid/Dibayar (Budget) · Processing (Ticketing) · Per-Semester (LKPM) |
| Kuning | Perlu dilengkapi / mendekati tenggat | Bukti Kurang (LKPM, RUPS) · Pending (Budget) · Segera Jatuh Tempo (Offshore) · Proses Notaris (AD-MGT) · Perlu Cek (LKPM 2025) |
| Merah | Bermasalah: lewat batas, terhambat, ditolak, sanksi | Lewat Batas & Terhambat (RUPS) · Sanksi (LKPM) · Rejected (Budget, Ticketing) · Blocked (Task) · Overdue (Ticketing) |
| Abu | Belum mulai / tidak wajib / nonaktif / draft | Belum Terjadwal (RUPS) · Tidak Wajib & Handover (LKPM) · Not started (Task) · Nonaktif (Offshore) · Draft (AD-MGT, Ticketing) |

Aturan pakai:
- Status yang sama di modul berbeda WAJIB satu warna (Completed tidak
  boleh hijau di satu halaman dan abu di halaman lain).
- Chip selalu ber-dot warna + teks 600; tidak ada status berupa teks
  polos atau hanya ikon.
- Kosakata status tiap modul dirinci di dokumen modulnya (LKPM di §8,
  RUPS-AR/TBK/Offshore/AD-MGT di blueprint, Budget di design-budget.md).

## 16. Registri halaman & pola wajibnya

Setiap halaman yang ada (atau akan ada) terdaftar di sini beserta pola
yang wajib dipakainya. Halaman yang tidak terdaftar tidak boleh dibangun
sebelum didaftarkan.

| Halaman | Pola wajib | Dokumen rincian |
|---|---|---|
| Dashboard | Hero sambutan + KPI lintas modul + ringkasan modul (budget, pipeline, tugas) — semua angka menaut ke modul asalnya, tidak menghitung sendiri | §13, laporan analisa §2.1 |
| Request / Ticketing | Pola daftar §13.4 + KPI antrean (On Track, Due Soon, Overdue, Total) + chip status §15 | §13–§15 |
| Task Management | Pola daftar §13.4; dalam masa transisi menuju 5 modul Tracking — tab kategori di luar 5 modul §12 tidak ditambah | §12, blueprint |
| Tracking RUPS-AR | Analisis + Perusahaan; status §15 | Blueprint §3.2 |
| Tracking LKPM | Analisis + Perusahaan; status & hitung §8 | §8 dokumen ini |
| Tracking TBK | Analisis + Register kewajiban | Blueprint §3.3 |
| Tracking Offshore | Analisis + Register entitas | Blueprint §3.4 |
| Tracking AD-MGT | Analisis + Register perubahan AD | Blueprint §3.5 |
| Budget & Expenses | Analisis + Transaksi (gabungan /budget + /reports-budget) | design-budget.md |
| Phone Directory | Pola direktori §13.7 + toggle Grid/List | §13–§15 |
| Reports — Request | Pola Analisis §13.3 murni (tanpa tab daftar terpisah; tabel ringkas di bawah KPI) | §13 |
| Reports — Task | Pola Analisis §13.3 + panel kategori | §13 |
| Reports — Budget | **Dihapus** — isinya tab Analisis Budget & Expenses | design-budget.md |
| Settings (Users, Companies, Departments, System) | Pola formulir §13.6; tabel master sederhana + panel/modal form | §13 |
| Login | Kartu dua panel (merek + form) — satu-satunya tempat gradien panel merek diizinkan (§2) | Mockup Login CSL |

## 17. Pengingat & notifikasi

1. Pengingat email per entitas diatur lewat dialog **Email & Reminder**
   pada baris datanya (pola Task Management saat ini): dua field baku —
   **Due Date (Reminder)** dan **Email Reminder** (banyak alamat dipisah
   koma). Aturan kirim baku sistem: **1 minggu sebelum due date**.
2. Modul tracking baru (§12) yang punya tenggat WAJIB menyediakan dialog
   yang sama persis — nama, field, dan aturan kirim tidak berubah —
   supaya pengguna tidak belajar ulang.
3. Keadaan terkonfigurasi harus terlihat: baris yang remindernya terisi
   menampilkan penanda (ikon lonceng kecil di kolom aksi); baris kosong
   tidak menampilkan apa-apa. Dilarang mengklaim reminder terkirim dari
   catatan manual — riwayat kirim, bila ada, tampil di panel detail.
4. Sakelar notifikasi global diatur di System Settings (email permintaan
   baru, penugasan, perubahan status, peringatan SLA H-1 hari kerja)
   dan berlaku untuk semua modul — modul tidak membuat sakelarnya sendiri.

## 18. Checklist keseragaman seluruh sistem

Selain checklist per halaman (§11), rilis apa pun lolos bila:

- [ ] Setiap halaman mengikuti pola §13 dan terdaftar di §16.
- [ ] Seluruh teks UI Bahasa Indonesia (§14.1); tanggal, angka, uang,
      kapitalisasi mengikuti §14.2–14.4.
- [ ] Satu tombol primer navy per halaman (§14.5); tidak ada rute
      kembar (§14.6).
- [ ] Semua status mengikuti peta warna §15 di semua modul.
- [ ] Satu dataset tidak dipecah ke dua halaman; total antarhalaman
      yang berbagi data selalu sama (§13.2, §14.3).
- [ ] Pengingat mengikuti §17 — dialog dan aturan kirim yang sama.
- [ ] Angka setiap halaman cocok dengan angka acuan di dokumen
      modulnya masing-masing.

---

*Riwayat: §13–§18 ditambahkan 27 Okt 2026 atas perintah Ketua agar aturan
mencakup KESELURUHAN sistem (bukan per modul), berdasarkan audit live
csl.gesit.co.id di hari yang sama. Dokumen modul (design-budget.md,
Blueprint-5-Modul-Routine-Activity.md) tetap berlaku sebagai rincian
di bawah dokumen induk ini.*
