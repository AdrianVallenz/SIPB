import type { Metadata } from 'next';
import PosView from '@/components/PosView';

export const metadata: Metadata = {
  title: 'Terminal Kasir (Admin)',
};

export default function AdminKasirPage() {
  return <PosView />;
}
