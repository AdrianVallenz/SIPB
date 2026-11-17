export interface CoreFeatureItem {
  id: string;
  badge: string;
  title: string;
  desc: string;
}

export const CORE_FEATURES: CoreFeatureItem[] = [
  {
    id: 'pos-speed',
    badge: 'Kasir Cepat & Praktis',
    title: 'Transaksi Kilat Tanpa Antre Panjang',
    desc: 'Layani pembeli dalam hitungan detik. Scan barcode atau cari nama barang (F2), pilih pecahan uang cepat, hitung kembalian otomatis (F8), dan cetak struk nota seketika.',
  },
  {
    id: 'precision-accounting',
    badge: 'Hitung Laba Otomatis',
    title: 'Keuntungan Bersih Terhitung Akurat',
    desc: 'Setiap transaksi otomatis memotong harga modal beli (HPP). Anda langsung tahu keuntungan bersih harian toko Anda tanpa perlu pusing hitung buku catatan manual.',
  },
  {
    id: 'warehouse-audit',
    badge: 'Kontrol Stok Barang',
    title: 'Peringatan Stok Habis & Anti-Kehilangan',
    desc: 'Lacak setiap barang masuk dari supplier, barang keluar, dan barang rusak. Sistem memberi alarm dini sebelum barang dagangan Anda habis di rak toko.',
  },
  {
    id: 'rbac-security',
    badge: 'Cegah Kecurangan',
    title: 'Kunci Rahasia Toko & Batasi Akses Staf',
    desc: 'Staf kasir hanya bisa melayani transaksi jual-beli. Harga modal, laporan keuntungan bersih, dan pembatalan nota tetap terkunci aman hanya untuk pemilik toko.',
  },
  {
    id: 'cloud-sync',
    badge: 'Penyimpanan Cloud Aman',
    title: 'Pantau Toko dari Mana Saja via HP',
    desc: 'Data toko Anda tersimpan aman di cloud. Pemilik bisa pantau penjualan, pergerakan stok, dan laporan laba secara real-time dari mana saja.',
  },
  {
    id: 'reporting-print',
    badge: 'Struk & Laporan Usaha',
    title: 'Cetak Struk Bluetooth & Laporan Siap Excel',
    desc: 'Cetak struk nota kasir ke printer thermal Bluetooth (58mm/80mm) dalam satu ketukan, dan unduh rekapan laporan pembukuan toko langsung ke file Excel.',
  },
];

export const ADMIN_CAPABILITIES: string[] = [
  'Pantau Pemasukan, Grafik Penjualan Harian, & Keuntungan Bersih Real-Time',
  'Atur Daftar Barang, Harga Modal (HPP), dan Penyesuaian Stok Fisik Toko',
  'Laporan Keuangan Toko Lengkap, Filter Rentang Tanggal, & Unduh ke Excel',
  'Otorisasi Pembatalan Nota (Void) dengan Pengembalian Stok Otomatis',
  'Buat Akun Kasir Khusus Staf & Lindungi Data Keuntungan Rahasia Pemilik',
];

export const CASHIER_CAPABILITIES: string[] = [
  'Layar Kasir Point of Sale (POS) Kilat dengan Shortcut Keyboard Cepat (F2 & F8)',
  'Terima Berbagai Pembayaran: Tunai, QRIS Otomatis, Transfer Bank, dan Debit',
  'Batas Diskon Kasir Maksimal 25% untuk Mencegah Salah Ketik Kasir',
  'Cetak Struk Nota Pembayaran ke Printer Thermal Bluetooth Langsung Setelah Bayar',
  'Rekapitulasi Penjualan Shift Kasir dan Total Setoran Uang Fisik Kasir',
];

export const TECH_STACK_ITEMS = [
  {
    title: 'Buka di HP, Tablet, & Komputer',
    sub: 'Tanpa Perlu Instal Aplikasi Berat',
    detail: 'Cukup buka lewat browser di smartphone kasir, tablet meja, maupun laptop toko tanpa membebani memori perangkat.',
  },
  {
    title: 'Data Toko Aman & Tersimpan Otomatis',
    sub: 'Tidak Akan Hilang Saat Ganti HP',
    detail: 'Seluruh riwayat transaksi, katalog produk, dan laporan keuangan tersimpan aman dengan cadangan cloud otomatis.',
  },
  {
    title: 'Operasional Full Online Real-Time',
    sub: 'Sinkronisasi Langsung ke Server Cloud',
    detail: 'Setiap transaksi kasir, pembaruan stok, dan laporan keuangan langsung tersimpan real-time ke database cloud terpusat.',
  },
  {
    title: 'QRIS Dinamis & Struk Bluetooth',
    sub: 'Cocok untuk Semua Jenis Toko Ritel',
    detail: 'QRIS langsung muncul pas nominal nota tanpa input manual, dan cetak struk nota langsung terhubung ke printer Bluetooth.',
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

