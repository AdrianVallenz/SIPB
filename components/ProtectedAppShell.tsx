'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WifiOff, RefreshCw } from 'lucide-react';
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
  const { user, isHydrated, connectionStatus, reconnectCloud } = useApp();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    if (isReconnecting) return;
    setIsReconnecting(true);
    try {
      await reconnectCloud();
    } finally {
      setIsReconnecting(false);
    }
  };

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
        <main className="app-main">
          {connectionStatus === 'disconnected' && (
            <div
              className="alert-box"
              style={{
                margin: '12px 16px 0',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WifiOff size={16} style={{ flexShrink: 0 }} />
                <span>
                  Koneksi server cloud terputus. Mode Full Online aktif — sambungkan internet untuk
                  mencatat transaksi dan menyimpan perubahan.
                </span>
              </div>
              <button
                type="button"
                disabled={isReconnecting}
                onClick={() => void handleReconnect()}
                className="btn btn-secondary btn-sm"
                style={{ minHeight: '30px' }}
              >
                <RefreshCw size={13} className={isReconnecting ? 'animate-spin' : undefined} />
                <span>{isReconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang'}</span>
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
