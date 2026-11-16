import type { Metadata } from 'next';
import AdminProducts from '@/components/AdminProducts';

export const metadata: Metadata = {
  title: 'Inventaris & Stok',
};

export default function AdminProductsPage() {
  return <AdminProducts />;
}
