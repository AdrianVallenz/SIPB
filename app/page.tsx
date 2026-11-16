'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getDefaultRouteForRole } from '@/lib/routes';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

/** Root entry point: routes directly to the online role dashboard or authenticates online Demo Admin. */
export default function HomePage() {
  const { user, isHydrated, enterDemo } = useApp();
  const router = useRouter();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isHydrated) return;

    const isPosSubdomain =
      typeof window !== 'undefined' && window.location.hostname.startsWith('pos.');

    if (isPosSubdomain) {
      if (user) {
        router.replace(user.role === 'admin' ? '/admin/kasir' : '/kasir');
      } else {
        router.replace('/login?next=/kasir');
      }
      return;
    }

    if (user) {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await enterDemo('admin');
      if (cancelled) return;
      if (res.success) {
        router.replace('/admin/dashboard');
      } else {
        setConnectError(
          res.message || 'Gagal terhubung ke server cloud. Pastikan internet Anda aktif.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, user, enterDemo, router, retryTick]);

  return (
    <RouteLoadingScreen
      message="Menghubungkan ke Server Cloud SIP Barang..."
      error={connectError}
      onRetry={() => {
        setConnectError(null);
        setRetryTick((n) => n + 1);
      }}
      onSecondaryAction={() => router.replace('/login')}
    />
  );
}
