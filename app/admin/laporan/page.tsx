import type { Metadata } from 'next';
import AdminReports from '@/components/AdminReports';

export const metadata: Metadata = {
  title: 'Laporan Transaksi',
};

export default function AdminReportsPage() {
  return <AdminReports />;
}
