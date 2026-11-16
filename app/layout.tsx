import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1F5F9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1120' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sipb.web.id'),
  title: {
    default: 'SIP Barang — Sistem Operasional Penjualan & Inventaris Cloud',
    template: '%s | SIP Barang',
  },
  description:
    'Platform kasir POS dan operasional toko modern. Transaksi kasir kilat, QRIS dinamis pas sesuai nota, hitung laba bersih otomatis, cetak struk Bluetooth, dan data toko tersimpan aman di cloud.',
  applicationName: 'SIP Barang',
  keywords: [
    'aplikasi kasir POS',
    'sistem operasional penjualan barang',
    'manajemen stok toko',
    'QRIS kasir dinamis',
    'cetak struk thermal bluetooth',
    'laporan laba rugi toko retail',
  ],
  authors: [{ name: 'SIP Barang', url: 'https://sipb.web.id' }],
  creator: 'SIP Barang',
  publisher: 'SIP Barang',
  category: 'business',
  alternates: {
    canonical: 'https://sipb.web.id',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://sipb.web.id',
    siteName: 'SIP Barang',
    title: 'SIP Barang — Kasir POS Cepat, QRIS Nota & Manajemen Stok Toko',
    description:
      'Terminal kasir Point of Sale kilat, perhitungan laba bersih otomatis, pantauan stok toko, dan pencatatan transaksi terpadu.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SIP Barang — Sistem Operasional Penjualan & Inventaris',
    description:
      'Platform kasir POS terpadu, QRIS dinamis sesuai nota, cetak struk thermal 58mm/80mm, dan analitik laba bersih toko.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://sipb.web.id/#organization',
      name: 'SIP Barang',
      url: 'https://sipb.web.id',
      description: 'Penyedia platform kasir POS dan operasional toko retail modern.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://sipb.web.id/#website',
      url: 'https://sipb.web.id',
      name: 'SIP Barang',
      inLanguage: 'id-ID',
      publisher: { '@id': 'https://sipb.web.id/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://sipb.web.id/#software',
      name: 'SIP Barang',
      url: 'https://sipb.web.id',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS, Windows, macOS',
      inLanguage: 'id-ID',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'IDR',
      },
      featureList: [
        'Terminal Kasir Point of Sale (POS) dengan shortcut F2 dan F8',
        'QRIS Dinamis EMVCo menyesuaikan total tagihan dan nomor nota',
        'Manajemen inventaris gudang, batas stok aman, dan riwayat mutasi',
        'Kalkulasi HPP dan keuntungan bersih otomatis secara real-time',
        'Cetak struk thermal 58mm/80mm via Web Bluetooth atau Print CSS',
        'Perlindungan data toko pribadi yang aman dan terpisah di cloud',
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
