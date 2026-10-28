# Laporan Analisa CSL-LINK (csl.gesit.co.id)

**Tanggal analisa:** Selasa, 27 Oktober 2026, ±16:37–16:41 WIB
**Metode:** Penelusuran read-only lewat browser pada akun Rudi Si'arudin
(role ADMIN). Tidak ada data yang ditambah, diubah, atau dihapus selama analisa.
**Acuan desain:** `design-csl-link.md` (dikunci 27 Oktober 2026)
**Sistem:** CSL-LINK — CSL · Corporate Secretary Legal, © 2026 The Gesit
Companies, versi V 1.0.0-BETA, status ONLINE.

---

## 1. Ringkasan Eksekutif

1. **Halaman Tracking LKPM TIDAK ADA di sistem live.** Submenu Routine
   Activity hanya berisi "Task"; pencarian perintah (⌘K) untuk "LKPM" dan
   "Tracking" tidak memberi hasil; URL tebakan `/tracking-lkpm`, `/lkpm`,
   `/routine-lkpm` semuanya dialihkan ke Dashboard. Kesimpulan: halaman LKPM
   yang selama ini dibahas masih berupa build lokal Antigravity dan **belum
   ter-deploy** ke csl.gesit.co.id. Paket pembangunan sudah siap:
   `lkpm_data.json` + `Prompt-Koreksi-Antigravity-LKPM.md` (versi terbaru) +
   `design-csl-link.md` + mockup acuan `LKPM-CSLLink-v5.html`.
2. Sistem live berisi 6 menu utama dan 11 halaman yang seluruhnya berfungsi:
   Dashboard, Request/Ticketing, Task Management, Budget & Expenses,
   Phone Directory, 3 halaman Reports, 4 halaman Settings.
3. Secara visual sistem **sekeluarga** dengan aturan desain (kartu putih di
   latar abu terang, judul navy, chip status berwarna), tetapi ada
   **4 penyimpangan konsisten**: bahasa campuran Inggris–Indonesia, warna
   tombol primer tidak seragam, satu status tampil dengan dua warna berbeda,
   dan Task Management tanpa ringkasan analisis.
4. Data operasional masih kecil dan sehat: 4 tiket legal (1 overdue),
   70 task (46 selesai), 12 expense semuanya disetujui, pemakaian anggaran
   2026 baru 3,5% dari Rp4,1 miliar.
5. Master Companies di Settings baru berisi **12 entitas** — jauh dari
   81 perusahaan pada data LKPM. Bila modul LKPM jadi diintegrasikan,
   master ini perlu diselaraskan lebih dulu.

## 2. Peta Halaman & Isi

### 2.1 Dashboard — `/`
- Hero "Welcome back, Rudi!" + badge "CORPORATE SECRETARY & LEGAL PLATFORM".
- 4 kartu KPI: Permintaan Legal 1 aktif (4 total berkas) · Kepatuhan & RUPS 32
  pending · Persetujuan Biaya 0 menunggu · Ketepatan SLA 67% (2 dari 3 selesai).
- Seksi Anggaran & Pengeluaran Legal CSL 2026: total Rp4.100.000.000,
  terpakai Rp145.350.710 (3,5% — status "Aman"), sisa Rp3.954.649.290;
  realisasi per kategori: Other Rp123.671.880 (85,1%), Notaris Rp18.324.231
  (12,6%), Konsultan Rp3.354.599 (2,3%); 4 transaksi terakhir (semua Approved).
- Quick Access Modules (4 tombol), Pipeline Permintaan Legal (Draft 0,
  Submitted 0, Diproses 1, Review User 0, Selesai 3), Recent Legal Requests
  (4 baris), My Action Items (0 — "You're all caught up!"), Upcoming Tasks
  (semua "RUPS & AR", status "Belum", PIC "CSL Team", tanpa tanggal).

### 2.2 Request / Ticketing — `/csl-requests`
- KPI: On Track 0 · Due Soon 0 · Overdue 1 · Total Requests 4.
- Filter chip status: All, Submitted, Processing, Review User, Completed,
  Rejected + kotak pencarian.
- Tabel "Daftar Permintaan CSL": kolom REQUEST, REQUESTER, OWNER,
  STATUS & TIMELINE, ACTION. Isi: 3 Completed (2 di antaranya "Completed
  Late") dan 1 Processing yang Overdue; semua owner "Sylvia, Legal Officer";
  setiap baris punya progress bar 0%, tanggal jatuh tempo, dan menu aksi.

### 2.3 Task Management — `/routine-task`
- 12 tab kategori: RUPS-AR (aktif), OFFSHORE CO, AD - MGT, PERMIT, ASET,
  AGREEMENT, TBK, LIKUIDASI, CASES, PROJECT, Others, LDD.
- Dropdown Periode 2024–2028 (terpilih 2026), pencarian per kategori, Filter.
- Tabel gaya spreadsheet: kolom #, COMPANY, STATUS, OWNER, START DATE,
  COMPLETE DATE, NOTES, Aksi; "Menampilkan 1–10 dari 69 entri" (7 halaman).
  Status dan owner berupa dropdown yang bisa diedit langsung di baris;
  10 baris pertama RUPS-AR: 9 Completed, 1 Not started.

### 2.4 Tracking LKPM — TIDAK DITEMUKAN
- Tidak ada tautan di sidebar, Reports, maupun Settings; pencarian ⌘K kosong;
  tiga URL tebakan dialihkan ke Dashboard. Lihat Ringkasan Eksekutif #1.

### 2.5 Budget & Expenses — `/budget`
- KPI: Total Requests 12 — Rp145.350.710 · Pending Approval 0 — Rp0 ·
  Approved/Disbursed 12 — Rp145.350.710 · Currency Exposure HKD 1,460.00 /
  IDR Rp141.996.111.
- Filter chip: All, Company, Individual, Pending, Approved, Paid/Disbursed,
  Rejected + pencarian menyeluruh.
- Tabel "Expense Requests & Invoices": 12 records; halaman pertama 10 baris
  semuanya tipe Company, status "Approved ✓ Natalia", badge "Invoice
  Attached"; kategori halaman 1: Notaris 5, Other 3, Konsultan 2;
  2 expense HKD 730,00 ditampilkan dengan padanan IDR-nya.

### 2.6 Phone Directory — `/directory`
- KPI: Total Directory 10 · Lawyers & Notaries 3 · Govt Agencies 3 ·
  Legal Vendors 2.
- Chip filter: All, Lawyers, Vendors, Government, Others; toggle Grid/List.
- Tabel: Contact Details (avatar inisial, nama, organisasi), Category
  (pill Lawyer/Government/Vendor/Other), Phone, Email (dengan ikon salin),
  City, Actions. Halaman 1 menampilkan 9 dari 10 kontak.

### 2.7 Reports
- **Request Report** — `/reports-request`: KPI Total Requests 4, Completed 3
  (75%), Active/Processing 1, Top Requesting Dept "Human Resources &
  Logistic" (3). Tabel 4 baris; status COMPLETED tampil pill abu-biru,
  PROCESSING kuning.
- **Task Report** — `/reports-task`: KPI Total Tasks 70, Completed 46,
  In Progress 0, Blocked/Issues 1. Panel kategori: RUPS-AR 69, Tax 1.
  Status pada tabel tampil pill abu (PENDING, COMPLETED).
- **Budget Report** — `/reports-budget`: snapshot eksekutif (banner hijau)
  sisa anggaran Rp3.954.649.290 (96,5%); Total Budget Rp4.100.000.000;
  utilisasi 3,5%. Budget vs Actual per kategori: Notaris terpakai 4,1%
  (Rp18.324.231 / Rp450.000.000), Lawfirm 0,0% (Rp0 / **Rp3.200.000.000**),
  Konsultan 1,3% (Rp3.354.599 / Rp250.000.000), Other 61,8%
  (Rp123.671.880 / Rp200.000.000). Seksi "NEEDS ATTENTION": 2 transaksi
  mata uang asing (HKD, padanan ≈ Rp3.354.599). Tabel transaksi 12 baris,
  semua "APPROVED ✓ Natalia". Terakhir diperbarui 27 Okt 2026, 16.39 WIB.

### 2.8 Settings
- **User & Roles** — `/settings-users`: 9 akun. Role: ADMIN 3 (termasuk
  Rudi Si'arudin), STAFF 2, USER 2, SUPER ADMIN 1, REQUESTER 1.
  Tersedia tombol "Configure Permissions" per pengguna.
- **Companies** — `/settings-companies`: 12 entitas. Hanya Gesit Alumas
  (12 departemen, 4 karyawan) dan Gesit Perkasa (5 departemen, 4 karyawan)
  yang terisi; 10 lainnya 0 departemen / 0 karyawan.
- **Departments** — `/settings-departments`: 14 departemen; anggota terisi
  hanya CSL 3, Human Resources & Logistic 1, IT 4.
- **System Settings** — `/settings-system`: nama aplikasi "CSL-LINK",
  bahasa default Bahasa Indonesia (English tersedia). Notifikasi email
  (permintaan baru, penugasan, perubahan status, peringatan SLA H-1 hari
  kerja) AKTIF; notifikasi in-app tugas mendesak dan ringkasan mingguan
  NONAKTIF. Approver tunggal untuk Expense dan Offshore Invoice: **Natalia**
  (pilihan lain: Gesit Admin, Rudi Si'arudin, Yohan).

### 2.9 Lain-lain
- Kotak perintah (⌘K) juga memuat entri **"Credentials Vault"** yang bukan
  item sidebar (tidak dibuka dalam analisa ini).
- Footer: "© 2026 THE GESIT COMPANIES. CSL-SYSTEM™. ALL RIGHTS RESERVED."
  + indikator ONLINE + V 1.0.0-BETA.
- Beberapa halaman sempat menampilkan angka 0 / placeholder kerangka saat
  memuat sebelum data tampil — perilaku loading yang wajar.

## 3. Audit Keserasian terhadap design-csl-link.md

### Sesuai
- Cangkang: sidebar putih + topbar breadcrumb & kotak ⌘K + kartu pengguna
  di bawah — sama dengan §5.
- Kartu putih radius besar, border hairline, latar abu terang — §2 & §4.
- Status selalu pill berwarna; tidak ada teks status polos — §1.3.
- Dashboard bersifat summary-first (KPI + ringkasan sebelum daftar) — §1.1.
- Ikon garis, tidak ditemukan emoji sebagai ikon — §7.

### Menyimpang
| # | Penyimpangan | Acuan | Dampak |
|---|---|---|---|
| 1 | Subjudul halaman & header tabel mayoritas Bahasa Inggris ("Overview of all CSL requests...", "Unified management of..."), bercampur dengan yang sudah Bahasa Indonesia ("Kelola berbagai aktivitas...", "Menampilkan 1–10 dari 69 entri") | §9 — UI full Bahasa Indonesia | Kesan tidak seragam antarhalaman |
| 2 | Tombol primer beda warna per modul: biru (+ Create Request), ungu (+ Add Expense), hitam (+ Add Contact, tab RUPS-AR) | §2/§6 — primer = navy `--title` | Identitas visual tidak konsisten |
| 3 | Status COMPLETED hijau di Ticketing, tetapi abu/abu-biru di Request Report & Task Report | §10.6 — satu status satu warna | Membingungkan saat berpindah halaman |
| 4 | Task Management langsung tabel spreadsheet padat (69 entri, edit inline) tanpa ringkasan Analisis/KPI di atasnya | §1.1–1.2 — ringkasan dulu, masalah diangkat | Halaman terberat justru paling sulit dibaca sekilas |
| 5 | Judul & angka tampil sangat tebal (kesan ExtraBold) | §3 — bobot maksimum 700 | Nuansa "template generik" yang ingin dihindari |
| 6 | Detail tiket/baris lewat menu aksi tiga titik, bukan panel geser | §6 — detail = panel geser | Pola interaksi tidak seragam dengan modul baru (LKPM) |

Catatan: pengamatan font bersifat visual (nama font persis tidak terbaca
dari luar); bobot & keluarga huruf disimpulkan dari tampilannya.

## 4. Temuan di Luar Desain

1. **Master data belum selaras dengan kebutuhan LKPM.** Settings →
   Companies baru 12 entitas, sementara data LKPM mencakup 81 perusahaan.
   Bila Tracking LKPM dibangun sebagai modul di sistem ini, putuskan lebih
   dulu: master perusahaan LKPM berdiri sendiri dari `lkpm_data.json`,
   atau Companies diperluas jadi 81.
2. **Pagu Lawfirm Rp3,2 miliar belum tersentuh (0,0%)** sementara kategori
   Other sudah 61,8% dari pagunya (Rp123.671.880 / Rp200.000.000) dan
   menyerap 85,1% dari seluruh realisasi. Patut dicek apakah klasifikasi
   "Other" menampung pengeluaran yang seharusnya masuk kategori lain.
3. **1 tiket Processing sudah Overdue** (dari total 4 tiket) dan SLA
   dashboard 67% — dengan volume sekecil ini, satu tiket menentukan
   persentase; layak ditindaklanjuti owner-nya (Sylvia).
4. **Approver tunggal.** Persetujuan expense dan invoice offshore sama-sama
   bergantung pada satu orang (Natalia) — titik risiko operasional bila
   yang bersangkutan berhalangan; sistem mendukung banyak approver.
5. **Task terkonsentrasi di RUPS-AR** (69 dari 70 task di Task Report) —
   11 tab kategori lain praktis kosong; struktur kategorinya mungkin lebih
   ambisius dari kebutuhan nyata saat ini.
6. **Pengisian master masih awal.** 10 dari 12 perusahaan dan 11 dari 14
   departemen di Settings belum berisi anggota/departemen — sistem masih
   tahap pengisian awal (konsisten dengan label V 1.0.0-BETA).

## 5. Rekomendasi (berurutan prioritas)

1. **Deploy modul Tracking LKPM** memakai paket yang sudah siap:
   tempel `Prompt-Koreksi-Antigravity-LKPM.md` (versi 27 Okt) dengan tiga
   lampiran (`lkpm_data.json`, `design-csl-link.md`, `LKPM-CSLLink-v5.html`).
   Setelah ter-deploy, audit angkanya terhadap angka acuan di
   `design-csl-link.md` §8.
2. **Samakan bahasa UI ke Bahasa Indonesia** di semua subjudul & header
   tabel (penyimpangan #1) — perubahan teks saja, risiko rendah.
3. **Standarkan tombol primer ke navy** dan petakan ulang warna status
   agar satu status = satu warna di semua halaman (penyimpangan #2, #3).
4. **Tambahkan ringkasan Analisis di atas Task Management** (KPI per
   kategori + kartu Perlu Perhatian untuk task Blocked/Overdue)
   mengikuti pola Dashboard (penyimpangan #4).
5. **Putuskan strategi master Companies** (lihat Temuan #1) sebelum modul
   LKPM dihubungkan ke data perusahaan.
6. **Tinjau klasifikasi kategori "Other"** pada Budget dan siapkan
   approver cadangan untuk expense/offshore (Temuan #2, #4).

---

*Disusun oleh Dewi dari penelusuran read-only, 27 Oktober 2026.
Angka-angka adalah potret saat analisa dilakukan dan dapat berubah
mengikuti aktivitas sistem.*
