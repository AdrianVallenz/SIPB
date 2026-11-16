import type { Metadata } from 'next';
import AdminSettings from '@/components/AdminSettings';

export const metadata: Metadata = {
  title: 'Pengaturan & Kasir',
};

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
