# 📦 SIP BARANG — Sistem Informasi Operasional Penjualan & Inventaris Barang (POS)

**SIP Barang** adalah aplikasi web operasional toko ritel terpadu berbasis **Next.js (TypeScript)** dan **PostgreSQL (Supabase)** dalam mode **Full Online Cloud** yang dirancang untuk mengelola inventaris barang gudang, pencatatan mutasi stok atomik, transaksi kasir *Point of Sale* (POS) dengan dukungan **QRIS Dinamis (EMVCo CRC-16)** & **Printer Struk Thermal Bluetooth (ESC/POS)**, serta laporan keuangan yang dapat dicetak maupun diekspor ke **Excel (`.xlsx`)**.

---

## ✨ Fitur Utama (Berdasarkan Hak Akses Peran)

Aplikasi ini menerapkan **Role-Based Access Control (RBAC)** dengan **2 peran pengguna** yang terisolasi per toko (`owner_id`):

### 1. Peran Administrator / Pemilik Toko (`admin`)
- **Dashboard Analitik Real-Time**: Memantau pemasukan harian, total penjualan, laba bersih (*gross profit*), margin keuntungan, nilai modal & potensi jual aset stok gudang, grafik tren 7/14/30 hari, serta pengawasan stok menipis.
- **CRUD Produk & Kategori Cloud**: Menambah, mengubah, dan menghapus produk (SKU unik per toko, harga modal, harga jual, satuan, batas stok minimum) serta mengelola kategori barang bawaan maupun kategori kustom yang tersinkron ke cloud.
- **Manajemen Mutasi Stok Gudang Atomik**: Mencatat barang masuk (*Restock*), barang keluar, atau stok opname melalui RPC Postgres `adjust_product_stock` dengan penguncian baris (`FOR UPDATE`) dan audit log operator.
- **Pencarian, Filter, & Pagination**: Pencarian instan berdasarkan kode SKU/nama/nomor nota, filter kategori, periode waktu, metode bayar, status stok, serta **Pagination** dinamis.
- **Laporan Transaksi, Ekspor Excel (`.xlsx`), & Cetak PDF**: Merekap seluruh nota penjualan, membatalkan nota (`VOIDED` melalui RPC `void_pos_transaction` dengan pengembalian stok otomatis), mengekspor laporan ke **Microsoft Excel (`.xlsx`)** dengan kolom & format Rupiah rapi, mencetak laporan, dan meninjau ulang struk transaksi.
- **Pengaturan Toko, Struk, QRIS, & Manajemen Kasir**: Mengelola profil pemilik toko, identitas header/footer & ukuran kertas struk (`58mm`/`80mm`) di cloud untuk semua perangkat kasir, unggah QRIS statis/EMVCo toko, rekening transfer bank, serta membuat dan mengelola akun staf kasir melalui Edge Function `tenant-auth`.

### 2. Peran Staf Kasir (`user`)
- **Terminal Kasir (POS) Cepat**: Pencarian barang, scan barcode/SKU (tekan `Enter` untuk tambah otomatis ke keranjang), filter kategori, serta kalkulasi diskon (dibatasi maksimal 25% untuk kasir) dan kembalian tunai dengan pemisah ribuan otomatis.
- **Multi-Metode Pembayaran**: Mendukung **Tunai**, **QRIS Dinamis** (nominal tagihan otomatis terkunci pada QR), **Transfer Bank**, dan **Kartu Debit** dengan eksekusi transaksi atomik melalui RPC `process_pos_sale`.
- **Cetak Struk Nota & Riwayat Shift**: Mencetak struk pembayaran `58mm`/`80mm` melalui browser/PDF atau **Printer Thermal Bluetooth ESC/POS**, serta meninjau rekap transaksi shift sendiri pada menu **Riwayat Shift Saya**.
- **Proteksi Data Finansial**: Staf kasir hanya memiliki akses operasional kasir dan **tidak dapat** melihat harga modal, laba bersih pemilik toko, laporan toko menyeluruh, maupun mengubah data master produk atau stok gudang secara manual.

---

## 🖼️ Tampilan Aplikasi (Screenshots per Section)

### 1. Landing Page & Showcase Platform (`/` & `/showcase`)

#### 1.1 Hero, Penjelasan Aplikasi, & Ringkasan Telemetri
Halaman utama (`/`) menyajikan ringkasan manfaat sistem, tombol **Masuk ke Sistem** / **Daftar Akun Administrator**, serta kartu telemetri stok dan omzet.

![Landing Page Hero SIP Barang](./public/screenshots/showcase-01-hero.png)

#### 1.2 Interactive Product Tour (`#showcase`)
Pratinjau interaktif 4 modul utama sistem (**Dashboard Eksekutif**, **Terminal Kasir POS**, **Master Gudang & Stok**, serta **Laporan & Audit Void**) yang dapat dicoba langsung dari landing page.

![Interactive Product Tour Showcase](./public/screenshots/showcase-02-preview.png)

#### 1.3 Keunggulan Sistem (`#fitur`)
Enam kartu penjelasan fitur utama mulai dari kecepatan transaksi POS, kalkulasi laba bersih HPP otomatis, pengawasan stok gudang, penguncian rahasia modal, penyimpanan cloud, hingga cetak struk Bluetooth & Excel.

![Keunggulan Sistem SIP Barang](./public/screenshots/showcase-03-fitur.png)

#### 1.4 Pemisahan Hak Akses Pemilik Toko & Kasir (`#akses-peran`)
Perbandingan kapabilitas peran **Administrator Toko** vs **Operator Kasir POS** untuk menjaga keamanan data keuangan usaha.

![Pemisahan Hak Akses Peran](./public/screenshots/showcase-04-peran.png)

#### 1.5 Jaminan Keandalan Sistem & Footer (`#arsitektur`)
Ringkasan dukungan multi-perangkat (HP, tablet, desktop), operasional Full Online real-time, QRIS dinamis, dan footer informasi perangkat kasir.

![Jaminan Keandalan & Footer](./public/screenshots/showcase-05-arsitektur.png)

---

### 2. Halaman Autentikasi (`/login`)
Form masuk terpadu untuk **Administrator** dan **Staf Kasir** (termasuk akun evaluasi melalui input email & kata sandi), dilengkapi tab **Daftar Admin** serta tombol **Kembali ke Beranda** di pojok kiri atas.

![Halaman Autentikasi Login](./public/screenshots/01-login.png)

---

### 3. Panel Administrator (`/admin`)

#### 3.1 Dashboard Analitik — Ringkasan KPI (`/admin/dashboard`)
Menampilkan 4 kartu metrik utama (Pemasukan Hari Ini, Total Penjualan & Keuntungan Bersih, Modal Tertanam di Stok, serta Peringatan Stok Menipis).

![Dashboard Analitik Admin KPI](./public/screenshots/02-admin-dashboard-kpi.png)

#### 3.2 Dashboard Analitik — Grafik Tren Omzet, Laba, & Pengawasan Stok (`/admin/dashboard`)
Menampilkan grafik interaktif **Tren Omzet & Keuntungan Bersih** (`7 / 14 / 30 Hari`), daftar barang menipis siap *restock*, komposisi pembayaran, dan 5 produk paling cepat terjual.

![Dashboard Analitik Admin Grafik](./public/screenshots/03-admin-dashboard-grafik.png)

#### 3.3 Manajemen Barang, Kategori, & Pagination (`/admin/produk`)
Pengelolaan katalog produk lengkap dengan harga modal, harga jual, persentase margin otomatis, sisa stok, tombol aksi *restock*/edit/hapus, kelola kategori kustom, dan pagination.

![Inventaris & Katalog Produk](./public/screenshots/04-admin-produk.png)

#### 3.4 Riwayat Log Mutasi Stok Gudang (`/admin/produk` — Tab Log Mutasi)
Jejak audit terperinci untuk setiap pergerakan stok (`Stok Masuk`, `Stok Keluar`, `Penyesuaian`), menampilkan stok awal -> stok akhir, alasan/nomor nota, serta email operator.

![Riwayat Audit Log Mutasi Stok](./public/screenshots/05-admin-log-stok.png)

#### 3.5 Laporan Transaksi Penjualan, Ekspor Excel & Cetak Laporan (`/admin/laporan`)
Rekapitulasi seluruh nota penjualan, estimasi laba bersih, pencarian nota/kasir, filter rentang tanggal & metode pembayaran, pembatalan nota (*Void*), serta ekspor Excel (`.xlsx`)/cetak laporan.

![Laporan Transaksi Penjualan](./public/screenshots/06-admin-laporan.png)

#### 3.6 Pratinjau Struk Nota 58mm/80mm & QRIS Dinamis
Tampilan nota transaksi resmi dengan identitas toko dari cloud, rincian barang, QRIS dinamis sesuai nominal/QR verifikasi nota, cetak langsung ke printer Bluetooth thermal, maupun cetak PDF browser.

![Pratinjau Struk Nota Transaksi](./public/screenshots/07-struk-nota.png)

#### 3.7 Pengaturan Profil Admin, Identitas Toko/Struk Cloud, & Unggah QRIS (`/admin/pengaturan`)
Konfigurasi nama pemilik toko, identitas struk (`store_name`, `store_tagline`, `store_address`, `store_phone`, `receipt_footer`, `paper_width`) yang tersimpan di cloud, serta unggah gambar QRIS toko.

![Pengaturan Toko & QRIS](./public/screenshots/08-admin-pengaturan-toko.png)

#### 3.8 Tema QRIS, Rekening Bank, & Manajemen Akun Staf Kasir (`/admin/pengaturan`)
Kustomisasi tema tampilan QRIS (`Klasik Nota`, `Biru Modern`, `Hijau Kasir`, `Gelap Elegan`), rekening bank transfer, serta manajemen akun staf kasir (tambah kasir, ubah nama/kata sandi, aktif/nonaktifkan, dan hapus akun).

![Manajemen Akun Staf Kasir](./public/screenshots/09-admin-pengaturan-kasir.png)

---

### 4. Panel Staf Kasir (`/kasir`)

#### 4.1 Terminal Kasir POS & Keranjang Belanja (`/kasir`)
Antarmuka kasir cepat dengan kartu produk siap ketuk/scan SKU, pencarian instan, keranjang belanja interaktif di sisi kanan, input potongan diskon, dan tombol pembayaran pintas `F8`.

![Terminal Kasir POS](./public/screenshots/10-kasir-pos.png)

#### 4.2 Penyelesaian Pembayaran & QRIS Dinamis
Modal pembayaran multi-metode (`Tunai`, `QRIS`, `Transfer Bank`, `Kartu Debit`) dengan QRIS dinamis yang mengunci nominal tagihan pas agar pembeli cukup scan dan nominal langsung terisi otomatis.

![Modal Pembayaran QRIS Dinamis](./public/screenshots/11-kasir-pembayaran-qris.png)

#### 4.3 Riwayat Shift Penjualan Saya (`/kasir/riwayat`)
Halaman khusus staf kasir untuk memantau total penjualan shift aktif, pemisahan penerimaan tunai (kas laci) vs non-tunai, pencarian nota, cetak ulang struk, dan ekspor Excel (`.xlsx`) shift.

![Riwayat Shift Kasir](./public/screenshots/12-kasir-riwayat-shift.png)

---

## 🔐 Standar Keamanan & Integritas Transaksi

1. **Autentikasi & Password Hashing**:
   - Seluruh akun pengguna (`admin` & `user`) diautentikasi melalui **Supabase Auth (`auth.users`)** dengan hashing kata sandi standar **Bcrypt** dan sesi JWT ber-*claim* `owner_id` & `role`.
2. **Row-Level Security (RLS) Multi-Tenant**:
   - Seluruh tabel (`products`, `transactions`, `stock_logs`, `store_cashiers`, `store_payment_settings`) dilindungi kebijakan **Row-Level Security (RLS)** di PostgreSQL sehingga setiap toko terisolasi ketat berdasarkan `owner_id` dan peran pengguna.
3. **Transaksi & Mutasi Stok Atomik (`SECURITY INVOKER` RPC)**:
   - Operasi checkout POS (`process_pos_sale`), pembatalan transaksi (`void_pos_transaction`), dan penyesuaian stok (`adjust_product_stock`) dieksekusi atomik di server PostgreSQL menggunakan penguncian baris (`FOR UPDATE` terurut), idempotensi nomor transaksi, validasi stok server-side, serta perhitungan ulang subtotal, diskon, dan kembalian di database.
4. **Proteksi Edge Function & Sanitasi Ekspor**:
   - Pengelolaan akun kasir melalui Edge Function `tenant-auth` memverifikasi peran `admin` dan kepemilikan toko (`owner_id`), membatasi percobaan login gagal (*rate-limiting lockout*), serta menghasilkan file Excel (`.xlsx`) kompatibel Microsoft Excel dengan tipe `inlineStr` aman anti-injeksi formula (`lib/excelExport.ts`).

---

## 🔀 Flowchart Alur Operasional Sistem

Diagram alir berikut menggambarkan alur lengkap sistem mulai dari autentikasi pengguna (`Administrator` vs `Kasir POS`), modul manajemen gudang & laporan admin, hingga proses checkout kasir, sinkronisasi cloud, dan cetak struk:

![Flowchart Alur Operasional Sistem SIP Barang](./public/screenshots/flowchart-sistem-sipb.png)

---

## 🗄️ Rancangan Database & Entity Relationship Diagram (ERD)

Skrip skema & migrasi SQL tersedia di [`database/schema.sql`](./database/schema.sql) dan [`supabase/migrations/`](./supabase/migrations).

```mermaid
erDiagram
    AUTH_USERS ||--o{ STORE_CASHIERS : "memiliki staf kasir"
    AUTH_USERS ||--o{ PRODUCTS : "mengelola katalog"
    AUTH_USERS ||--o{ TRANSACTIONS : "mencatat penjualan"
    AUTH_USERS ||--o{ STOCK_LOGS : "merekam audit stok"
    AUTH_USERS ||--o| STORE_PAYMENT_SETTINGS : "mengatur toko, QRIS & kategori"
    PRODUCTS ||--o{ STOCK_LOGS : "riwayat mutasi"

    AUTH_USERS {
        uuid id PK
        string email UK
        string encrypted_password "Bcrypt Hash"
        jsonb raw_app_meta_data "role (admin/user), owner_id"
        timestamptz created_at
    }

    STORE_CASHIERS {
        uuid id PK, FK
        uuid owner_id FK
        string email UK
        string name
        boolean is_active
        timestamptz created_at
    }

    PRODUCTS {
        text id PK
        uuid owner_id FK
        text sku
        text name
        text category
        bigint buy_price
        bigint sell_price
        integer stock
        integer min_stock
        text unit
        text description
        timestamptz updated_at
    }

    TRANSACTIONS {
        text id PK
        uuid owner_id FK
        text invoice_no
        timestamptz created_at
        text cashier_email
        text cashier_name
        jsonb items "Daftar item, qty, harga, subtotal"
        bigint subtotal
        bigint discount
        bigint tax
        bigint total
        text payment_method "Tunai | QRIS | Transfer Bank | Kartu Debit"
        bigint amount_paid
        bigint change
        text status "COMPLETED | VOIDED"
        text void_reason
        timestamptz voided_at
    }

    STOCK_LOGS {
        text id PK
        uuid owner_id FK
        text product_id FK
        text product_name
        text type "IN | OUT | ADJUSTMENT"
        integer quantity
        integer previous_stock
        integer new_stock
        text reason
        text operator
        timestamptz created_at
    }

    STORE_PAYMENT_SETTINGS {
        uuid owner_id PK, FK
        text qris_payload
        text qris_image_data
        text qris_merchant_name
        text qris_nmid
        text qris_theme
        text qris_custom_note
        boolean show_qris_on_receipt
        text bank_name
        text bank_account_number
        text bank_account_holder
        text store_name
        text store_tagline
        text store_address
        text store_phone
        text receipt_footer
        text paper_width "58mm | 80mm"
        jsonb custom_categories
        timestamptz updated_at
    }
```

---

## 🧪 Akun Tes (Untuk Pengujian Aplikasi)

Silakan masuk melalui halaman `/login` menggunakan alamat email dan kata sandi berikut untuk menguji masing-masing peran:

| Peran Pengguna | Alamat Email | Kata Sandi | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Administrator (Pemilik Toko)** | `admin@sipb.web.id` | `admin123` | Akses penuh: Dashboard, CRUD Produk & Kategori, Mutasi Stok, POS, Laporan (Excel `.xlsx`/Print/Void), Pengaturan Toko & Kelola Kasir. |
| **User / Staf Kasir** | `kasir@sipb.web.id` | `kasir123` | Akses terbatas khusus operasional **Terminal Kasir (POS)**, **Riwayat Shift Saya**, dan cetak struk transaksi. |

> Selain akun tes di atas, Anda juga dapat mendaftarkan workspace toko baru secara mandiri melalui tab **Daftar Admin** di halaman `/login`.

---

## 🚀 Cara Instalasi & Menjalankan di Komputer Lokal

### Prasyarat
- **Node.js** versi `18.18+` atau `20+`
- **Git**
- Proyek **Supabase** aktif (aplikasi berjalan dalam mode **Full Online**).

### Langkah Instalasi

1. **Clone repository ini dari GitHub:**
   ```bash
   git clone https://github.com/AdrianVallenz/SIPB.git
   cd SIPB
   ```

2. **Instal seluruh dependensi paket:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable Supabase:**
   Buat file `.env.local` di direktori utama dan terapkan seluruh migrasi di [`./supabase/migrations`](./supabase/migrations) (serta deploy Edge Function di `./supabase/functions/tenant-auth`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://project-id-anda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-supabase-anda
   ```

4. **Jalankan server pengembangan (*development server*):**
   ```bash
   npm run dev
   ```

5. **Buka aplikasi di browser:**
   Kunjungi [http://localhost:3000](http://localhost:3000).
