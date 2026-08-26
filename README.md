# SORGA DESA — Sistem Booking Lapangan Badminton & POS

Sistem Informasi & Manajemen Booking Lapangan Badminton serta Point of Sale (POS) Desa Belega berbasis React, Tailwind CSS, dan Supabase.

---

## 🌟 Fitur Utama
- **Multi-Role User Access & Authentication**:
  - **Super Admin**: Akses penuh seluruh sistem, manajemen staf (Admin & Kasir), pengaturan identitas sistem, konfigurasi rekening dinamis, pengaturan landing page & media sosial, manajemen galeri/testimoni, master data lapangan & tarif, serta audit laporan keuangan.
  - **Admin**: Manajemen pemesanan (*Booking*), kelola jadwal rutin member (*Recurring Generator* 7/30/90 hari), kelola ketersediaan & jadwal pemeliharaan lapangan, dan monitoring laporan okupansi.
  - **Kasir**: Operasional kasir Point of Sale (POS) penjualan perlengkapan/makanan/minuman, transaksi *walk-in customer*, dan pengecekan jadwal lapangan.
- **Landing Page Interaktif (Mobile-App Feel & SEO Ready)**:
  - **Kalender Jadwal Real-Time**: Grid visual ketersediaan lapangan per slot 30 menit dengan proteksi privasi pemesan melalui Database View (`public_jadwal_lapangan`).
  - **Pemesanan Instan (Guest-Friendly)**: Pemesanan langsung tanpa wajib registrasi akun melalui *Bottom Sheet Modal* yang responsif.
  - **Rekening Pembayaran Dinamis**: Rincian bank dan rekening pembayaran tampil otomatis dengan fitur 1-klik *Copy Rekening*.
  - **Galeri & Testimoni**: Showcase fasilitas dinamis dari Supabase Storage dan carousel ulasan multi-platform (Instagram, Facebook, X, Google Maps).
  - **Optimasi SEO Google**: Dilengkapi Schema.org JSON-LD (`SportsActivityLocation`), Open Graph preview WhatsApp/Sosmed, `sitemap.xml`, dan `robots.txt`.
- **Point of Sale (POS) & Manajemen Stok**:
  - Transaksi kasir terintegrasi dengan validasi stok *real-time* dan proteksi *race-condition safe* (`SELECT FOR UPDATE`).
  - Pencatatan harga modal & jual produk (shuttlecock, makanan, minuman) serta kalkulasi estimasi laba kotor otomatis.
- **Jadwal Rutin Member (Recurring Booking)**:
  - Manajemen jadwal tetap member dengan generator batch slot jadwal (**7 Hari**, **30 Hari / 1 Bulan**, **90 Hari / 3 Bulan**).
  - Otomatisasi pembatalan booking berstatus pending yang kadaluarsa (>2 jam).
- **Pelaporan & Ekspor Data**:
  - Laporan komprehensif pendapatan sewa lapangan, okupansi jam main, dan laba penjualan kasir POS.
  - Ekspor laporan berformat rapi ke PDF resmi (jsPDF + jsPDF-AutoTable) dan filter data fleksibel berdasarkan rentang tanggal.
- **Keamanan & Fleksibilitas**:
  - Row Level Security (RLS) PostgreSQL bertingkat di Supabase dengan Security Definer helpers (`is_staff()`, `is_admin()`).
  - Proteksi eskalasi hak akses (*privilege escalation*) via trigger database (`protect_profile_role`).
  - Supabase Storage Bucket `assets` terproteksi untuk upload logo, background hero, dan galeri.

---

## 🚀 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Framer Motion, SweetAlert2, jsPDF + jsPDF-AutoTable
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage, Views, RPC Functions)
- **Deployment**: Supabase Cloud (Backend & DB) + Shared Hosting / cPanel (Frontend SPA via `.htaccess`)

---

## 🛠️ Panduan Instalasi Lokal

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/theydoet666/booking-sorgadesa.git
   cd booking-sorgadesa
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Buat file `.env` di root direktori proyek (sesuaikan dengan kredensial Supabase Anda seperti pada `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
   ```

4. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```

5. **Build Production**:
   ```bash
   npm run build
   ```

---

## 🗄️ Database Setup (Supabase)
Seluruh skema database, migrasi keamanan, views, dan fungsi dapat ditemukan pada direktori `supabase/migrations/`:
- `supabase/migrations/01_phase1_security_hardening.sql` : Skrip hardening keamanan, relasi foreign keys, index, dan helper functions.
- `supabase/migrations/02_phase2_rls_and_privacy.sql` : Konfigurasi Row Level Security (RLS) multi-role dan view aman `public_jadwal_lapangan`.
- `supabase/migrations/03_phase3_storage_and_automation.sql` : Kebijakan Supabase Storage bucket `assets` dan fungsi otomatisasi booking expired.
- `supabase/migrations/04_phase4_final_hardening.sql` : Hardening akhir dan verifikasi integritas relasi tabel.
