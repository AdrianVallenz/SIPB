import React from 'react';
import ProtectedAppShell from '@/components/ProtectedAppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAppShell requiredRole="admin">{children}</ProtectedAppShell>;
}
