import React from 'react';
import ProtectedAppShell from '@/components/ProtectedAppShell';

export default function KasirLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAppShell requiredRole="cashier">{children}</ProtectedAppShell>;
}
