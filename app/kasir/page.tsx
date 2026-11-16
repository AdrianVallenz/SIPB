import type { Metadata } from 'next';
import PosView from '@/components/PosView';

export const metadata: Metadata = {
  title: 'Terminal Kasir POS',
};

export default function KasirPosPage() {
  return <PosView />;
}
