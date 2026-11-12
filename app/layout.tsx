import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sipb.web.id'),
  title: 'SIP Barang — Sistem Informasi Penjualan & Inventaris',
  description: 'Sistem Operasional Penjualan Barang (POS) dan Manajemen Inventaris Gudang Terpadu',
  alternates: {
    canonical: 'https://sipb.web.id',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
