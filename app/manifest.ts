import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIP Barang — Kasir POS & Inventaris Toko',
    short_name: 'SIP Barang',
    description:
      'Sistem operasional penjualan barang (POS), manajemen stok gudang, QRIS dinamis sesuai nota, dan laporan HPP terpadu.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B1120',
    theme_color: '#10B981',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

