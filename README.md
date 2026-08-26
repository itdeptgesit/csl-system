# CSL System — Corporate Secretary & Legal ERP

**CSL System** adalah platform manajemen terintegrasi untuk divisi **Corporate Secretary & Legal (CSL)** PT GESIT. Sistem ini dirancang untuk mendigitalisasi dan menyederhanakan proses hukum, kepatuhan perusahaan, dan manajemen dokumen legal secara terpusat.

---

## 📋 Fitur Utama

### 🎫 Ticketing / Request Management
Sistem manajemen permintaan layanan dari seluruh departemen kepada tim CSL.
- **Form Request Digital:** Pemohon dapat mengajukan permintaan layanan legal secara online dengan lampiran file.
- **Status Tracking Real-time:** Pemohon dapat memantau status permintaan mereka secara langsung.
- **Timeline & Riwayat:** Riwayat lengkap setiap perubahan status dan komunikasi antara tim CSL dan pemohon.
- **Upload Lampiran ke Google Drive:** File yang dilampirkan otomatis tersimpan terorganisir di Google Drive.
- **Notifikasi Email:** Pemohon mendapat notifikasi otomatis setiap ada perubahan status via email (Resend).
- **Feedback System:** Pemohon dapat memberikan rating dan ulasan setelah permintaan selesai.

### 📁 Documents Vault
Repositori dokumen legal perusahaan yang terstruktur dan mudah diakses.
- **Kategorisasi Dokumen:** Dokumen dikelompokkan berdasarkan jenis (Akta, Perjanjian, Izin, dll).
- **Integrasi Google Drive:** Dokumen tersimpan langsung di Google Drive dengan link akses yang mudah.
- **Filter & Pencarian:** Temukan dokumen dengan cepat berdasarkan nama, kategori, atau tanggal.

### 📅 Routine Activity Monitoring
Pemantauan kegiatan rutin dan kepatuhan yang harus dipenuhi secara berkala.
- Daftar kegiatan rutin (pajak bulanan, audit, perpanjangan izin, dll).
- Status penyelesaian dan pengingat batas waktu.

### 💰 Budget & Cost Management
Pengelolaan anggaran dan biaya operasional divisi CSL.

### 📞 Phone Directory
Direktori kontak internal perusahaan yang terintegrasi.

### 📊 Reports & SLA
Laporan kinerja dan tingkat pemenuhan SLA (Service Level Agreement) tim CSL.

---

## 🏗️ Arsitektur Teknis

### Frontend
- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

### Backend & Infrastruktur
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **File Storage:** [Google Drive API](https://developers.google.com/drive) via Supabase Edge Functions
- **Email:** [Resend](https://resend.com/)
- **Deployment:** [Vercel](https://vercel.com/)

---

## ⚙️ Instalasi & Setup

### Prasyarat
- Node.js v18 atau lebih baru
- npm v9 atau lebih baru
- Akun Supabase
- Google Cloud Service Account dengan akses ke Google Drive
- Akun Resend untuk pengiriman email

### Langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/itdeptgesit/csl-system.git
   cd csl-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   Buat file `.env` di root direktori:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Konfigurasi Supabase Secrets**
   Tambahkan secrets berikut di Supabase Dashboard → Edge Functions → Secrets:
   ```
   GDRIVE_SERVICE_ACCOUNT_JSON=<isi JSON service account Google>
   GDRIVE_FOLDER_ID=<ID folder Google Drive tujuan>
   RESEND_API_KEY=<API key Resend>
   ```

5. **Deploy Edge Functions**
   ```bash
   supabase functions deploy upload-to-gdrive
   supabase functions deploy send-email
   ```

6. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Akses aplikasi di `http://localhost:5173`

---

## 📂 Struktur Folder Penting

```
csl-system/
├── components/          # Komponen React utama
│   ├── CSLDashboard.tsx       # Halaman dashboard
│   ├── CSLRequestManager.tsx  # Manajemen tiket/request (tim CSL)
│   ├── CSLCreateRequest.tsx   # Form buat permintaan baru (user)
│   ├── CSLDocumentsManager.tsx# Manajemen dokumen legal
│   ├── CSLSettings.tsx        # Pengaturan sistem
│   └── ...
├── supabase/
│   └── functions/       # Supabase Edge Functions
│       ├── upload-to-gdrive/  # Upload file ke Google Drive
│       └── send-email/        # Kirim notifikasi email
├── lib/
│   └── supabaseClient.ts      # Konfigurasi Supabase client
└── types.ts             # TypeScript types & interfaces
```

---

## 🔐 Hak Akses (Role)

| Role | Akses |
|---|---|
| **Admin** | Semua fitur + Master data + User management |
| **CSL Team** | Kelola request, upload dokumen, update status |
| **Requester** | Buat request, pantau status, lihat dokumen yang dibagikan |

---

## 📄 Lisensi

Proprietary Software — Internal Use Only.  
Copyright © 2026 THE GESIT COMPANIES. All rights reserved.