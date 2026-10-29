# Prompt Koreksi Antigravity — Audit UI CSL-LINK Live (29 Oktober 2026)

Tempel prompt ini ke Antigravity beserta lampiran `design-csl-link.md` (dokumen induk desain CSL-LINK — semua token warna, pola halaman, dan aturan bahasa di sana WAJIB dipatuhi).

---

Kamu memperbaiki aplikasi CSL-LINK yang sudah live di https://csl.gesit.co.id berdasarkan hasil audit UI menyeluruh tanggal 29 Oktober 2026 (diperiksa sebagai Admin). Perbaiki SEMUA temuan di bawah ini. Ini perbaikan tampilan dan konsistensi — **jangan mengubah struktur data, rute, atau logika bisnis di luar yang diminta**. Jangan mengarang angka, tanggal, atau status baru; kalau sebuah angka terlihat janggal, samakan cara menghitungnya dari sumber data yang sama, bukan mengganti nilainya dengan tebakan.

## A. Progress dan status harus konsisten (prioritas tertinggi)

1. Di daftar Request / Ticketing, SEMUA baris menampilkan progress 0% — termasuk baris berstatus Completed — padahal modal detail permintaan yang sama (contoh: REQ-202610-2516) menampilkan "Progress: 15%". Samakan sumbernya: progress di daftar dan di detail harus selalu sama untuk permintaan yang sama. Permintaan berstatus Selesai/Completed = 100%.
2. Di Offshore, beberapa tanggal perpanjangan yang sudah lewat tetap berstatus "Aktif Sehat". Status harus TURUNAN dari tanggal: lewat tanggal tanpa perpanjangan = Lewat / Segera Jatuh Tempo sesuai aturan jarak hari di dokumen desain.
3. Di RUPS-AR, kolom TAHAPAN menampilkan "1. Drafting Risalah" pada baris yang STATUS-nya sudah Completed. Tahapan dan status tidak boleh bertentangan: tampilkan tahapan aktual baris itu.
4. Di RUPS-AR, sel LEGALITAS/AKTA masih memuat teks placeholder mentah "Akta No..... tgl...." (dan satu baris "non-active"). Placeholder TIDAK boleh tampil sebagai isi. Sel kosong tampilkan sebagai "—" dengan keadaan kosong baku; isi placeholder hanya boleh muncul di dalam formulir edit, bukan di tabel.

## B. Bahasa Indonesia penuh (aturan §13 dokumen desain)

Bahasa default sistem adalah Bahasa Indonesia, tetapi sebagian besar UI masih Inggris atau campuran. Ubah SEMUA label berikut dan yang sejenisnya ke Bahasa Indonesia baku:

1. **Budget & Expenses** (halaman paling parah): label KPI "Total Requests / Pending Approval / Approved / Disbursed / Currency Exposure", placeholder pencarian "Search all data: ...", pill filter (All, Company, Individual, Pending, Approved, Paid / Disbursed, Rejected), subjudul tabel "Manage operational costs, ...", dan nama kolom (Expense / Date, Payee Type, Paid To, Project / Description, Currency & Amount, Prepared By, Action) — semua jadi Bahasa Indonesia. Penomoran halaman "Previous page / Next page" juga.
2. **AD-MGT**: seluruh header tabel masih Inggris (COMPANY NAME, AGENDA, STATUS, START DATE, COMPLETE DATE, NOTES) dan pill status huruf kecil (completed / in progress / not started). Samakan dengan halaman lain: header Bahasa Indonesia, status Title Case Bahasa Indonesia.
3. **Request / Ticketing**: status di tabel masih Inggris (Submitted, Processing, Completed, On Track, Due Soon, Overdue, Completed Late) — tampilkan padanan Indonesianya (Diajukan, Diproses, Selesai, Sesuai Jadwal, Mendekati Tenggat, Lewat Tenggat, Selesai Terlambat). Label hibrida "Belum di-assign" → "Belum Ditugaskan"; "PIC Legal Assigned" → "PIC Legal".
4. **Phone Directory**: pencarian "Search contacts...", filter All/Lawyers/Vendors/Government/Others, dan footer "SHOWING 1–9 OF 10 CONTACTS" → Bahasa Indonesia; pill kategori (Lawyer, Government, Vendor, Other) juga.
5. **Umum**: breadcrumb jangan di-title-case paksa ("Csl Requests", "Routine Rups", "Routine Lkpm") — pakai nama menu aslinya. Judul halaman Credentials Vault samakan dengan label sidebar-nya ("Credentials Vault", bukan "Credential Vault"). Kategori vault jangan ganda bahasa untuk kategori yang sama ("Government" vs "Pemerintahan" — pilih satu: Bahasa Indonesia). Label "Upload List Permintaan(Opsional)" → beri spasi dan Bahasa Indonesia baku. Kelompok grup di LKPM ("Mining Holding", "Business Company") dan nama kewajiban Inggris di TBK ("Monthly Report of Securities Holder Registration") tampilkan nama Indonesianya bila ada padanannya di data; bila nama resmi memang Inggris, biarkan — jangan diterjemahkan paksa.

## C. Angka harus konsisten antarhalaman

Satu besaran = satu angka di semua tempat, dihitung dari sumber data yang sama:

1. Jumlah entitas: Companies & Entities menampilkan **82**, Tracking LKPM **81**, tombol "Sinkronkan Group Email (79)" dan "Sinkronkan LKPM (81)", Dashboard "81 perusahaan". Telusuri penyebab selisihnya (kemungkinan: entitas nonaktif / tanpa grup / ganda) dan tampilkan angka yang sama di semua tempat; bila memang ada perbedaan definisi, beri label yang menjelaskan (mis. "82 entitas terdaftar, 81 aktif terlapor").
2. Filter grup di Companies & Entities rusak: "Holding (82)" dan semua grup lain (0). Filter harus mengelompokkan sesuai grup asli tiap entitas.
3. KPI Phone Directory: 3 + 3 + 2 = 8, total kontak 10 — kategori "Lainnya" tidak punya kartu. Jumlah semua kartu
...[truncated 4853 chars]