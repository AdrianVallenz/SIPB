'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getDefaultRouteForRole } from '@/lib/routes';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

/** Smart /dashboard alias forwarding directly into the active online role workspace or Cloud Demo Dashboard. */
export default function DashboardAliasPage() {
  const { user, isHydrated, enterDemo } = useApp();
  const router = useRouter();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isHydrated) return;

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
      message="Mengarahkan ke Dashboard Cloud..."
      error={connectError}
      onRetry={() => {
        setConnectError(null);
        setRetryTick((n) => n + 1);
      }}
      onSecondaryAction={() => router.replace('/login')}
    />
  );
}
