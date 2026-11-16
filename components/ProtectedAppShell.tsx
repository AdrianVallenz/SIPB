'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

interface ProtectedAppShellProps {
  requiredRole: 'admin' | 'cashier';
  children: React.ReactNode;
}

/** Role-enforced application shell wrapping Header, Sidebar, and authenticated route content. */
export default function ProtectedAppShell({ requiredRole, children }: ProtectedAppShellProps) {
  const { user, isHydrated } = useApp();
  const router = useRouter();
  const pathname = usePathname() || '/';

  const isAuthorized =
    isHydrated &&
    user !== null &&
    (requiredRole === 'admin' ? user.role === 'admin' : user.role === 'user');

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      const nextTarget = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${nextTarget}`);
      return;
    }

    if (requiredRole === 'admin' && user.role !== 'admin') {
      router.replace('/kasir');
      return;
    }

    if (requiredRole === 'cashier' && user.role === 'admin') {
      router.replace(pathname === '/kasir/riwayat' ? '/admin/laporan' : '/admin/kasir');
    }
  }, [isHydrated, user, requiredRole, pathname, router]);

  if (!isAuthorized) {
    return <RouteLoadingScreen message="Memuat ruang kerja SIP Barang..." />;
  }

  return (
    <div className="app-shell">
      <Header
        onOpenAuth={(mode) => router.push(mode === 'register' ? '/login?mode=register' : '/login')}
      />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
