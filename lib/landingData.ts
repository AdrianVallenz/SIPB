export interface CoreFeatureItem {
  id: string;
  badge: string;
  title: string;
  desc: string;
}

export const CORE_FEATURES: CoreFeatureItem[] = [
  {
    id: 'pos-speed',
    badge: 'POS Kecepatan Tinggi',
    title: 'Kasir Responsif & Shortcut Keyboard',
    desc: 'Transaksi lebih cepat dengan pencarian instan SKU/nama barang (F2), tombol uang pas & pecahan cepat, kalkulasi kembalian otomatis (F8), dan indikator suara transaksi.',
  },
  {
    id: 'precision-accounting',
    badge: 'Akuntansi Presisi',
    title: 'Perhitungan HPP & Laba Bersih Otomatis',
    desc: 'Setiap item transaksi mengunci harga beli (buyPrice) saat penjualan terjadi, sehingga laporan laba bersih tetap akurat meskipun harga modal barang berubah di kemudian hari.',
  },
  {
    id: 'warehouse-audit',
    badge: 'Audit Gudang',
    title: 'Kartu Stok & Deteksi Stok Kritis',
    desc: 'Pantau pergerakan stok masuk (IN), keluar (OUT), dan opname (ADJUSTMENT) lengkap dengan pencatatan waktu, alasan mutasi, serta operator yang bertugas.',
  },
  {
    id: 'rbac-security',
    badge: 'Keamanan RBAC',
    title: 'Otorisasi Multi-Peran & Registrasi Akun',
    desc: 'Pemisahan hak akses ketat antara Administrator dan Kasir POS (pembatasan diskon kasir maks 25%, proteksi fitur Void nota, serta fitur Daftar/Masuk operator baru).',
  },
  {
    id: 'cloud-postgres',
    badge: 'Cloud PostgreSQL',
    title: 'Sinkronisasi Real-Time Supabase Cloud',
    desc: 'Menggabungkan kecepatan state lokal dengan persistensi database Supabase Cloud PostgreSQL berfitur Row Level Security (RLS) dan cadangan/pemulihan JSON.',
  },
  {
    id: 'reporting-print',
    badge: 'Pelaporan & Cetak',
    title: 'Cetak Struk Termal & Ekspor CSV Excel',
    desc: 'Format cetak CSS khusus untuk printer struk termal kasir (58mm/80mm) dan laporan manajerial A4, ditambah unduhan laporan keuangan berformat CSV (UTF-8 BOM).',
  },
];

export const ADMIN_CAPABILITIES: string[] = [
  'Dashboard Eksekutif, Grafik Tren 7 Hari & Analisis Margin Laba',
  'CRUD Master Produk, Harga Modal (HPP), & Penyesuaian Stok (Opname)',
  'Laporan Keuangan Lengkap, Filter Periode, & Ekspor CSV Excel',
  'Otorisasi Pembatalan Nota (Void Transaksi) & Pengembalian Stok',
  'Pembuatan Akun Kasir POS & Isolasi Database Per Akun Supabase',
];

export const CASHIER_CAPABILITIES: string[] = [
  'Terminal Kasir Point of Sale (POS) Cepat dengan Shortcut F2 & F8',
  'Dukungan Pembayaran Tunai, QRIS, Transfer Bank, & Kartu Debit',
  'Batas Aman Diskon Kasir Maksimal 25% (Proteksi Anti-Fraud)',
  'Cetak Struk Termal Kasir (58mm/80mm) Langsung Setelah Bayar',
  'Riwayat Transaksi Shift Kasir & Rekapitulasi Setoran Tunai/Non-Tunai',
];

export const TECH_STACK_ITEMS = [
  {
    title: 'Next.js 16.4 & React 19',
    sub: 'App Router + TypeScript 5',
    detail: 'Arsitektur komponen modern dengan code-splitting dinamis & performa tinggi.',
  },
  {
    title: 'Supabase PostgreSQL',
    sub: 'Singapore (ap-southeast-1)',
    detail: 'Database relasional Cloud dengan kebijakan keamanan Row Level Security (RLS).',
  },
  {
    title: 'Vercel Edge Network',
    sub: 'SSL Auto-Renew & Custom Domain',
    detail: 'Terhubung langsung ke domain utama sipb.web.id dan terminal pos.sipb.web.id.',
  },
  {
    title: 'Enterprise Security Headers',
    sub: 'CSP, HSTS, X-Frame-Options',
    detail: 'Perlindungan terhadap injeksi skrip (XSS), clickjacking, dan brute-force login.',
  },
];

export const WEEKLY_SHOWCASE_BARS = [
  { day: 'Sen', rev: 55, prof: 35 },
  { day: 'Sel', rev: 72, prof: 48 },
  { day: 'Rab', rev: 64, prof: 40 },
  { day: 'Kam', rev: 88, prof: 58 },
  { day: 'Jum', rev: 78, prof: 52 },
  { day: 'Sab', rev: 96, prof: 68 },
  { day: 'Min', rev: 85, prof: 60 },
];

