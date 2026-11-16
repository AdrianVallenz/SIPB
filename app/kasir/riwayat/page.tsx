import type { Metadata } from 'next';
import CashierHistory from '@/components/CashierHistory';

export const metadata: Metadata = {
  title: 'Riwayat Shift Kasir',
};

export default function KasirHistoryPage() {
  return <CashierHistory />;
}
