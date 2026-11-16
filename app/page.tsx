'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getDefaultRouteForRole } from '@/lib/routes';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

/** Root entry point: routes directly to the role dashboard or enters Demo Admin Dashboard. */
export default function HomePage() {
  const { user, isHydrated, enterDemo } = useApp();
  const router = useRouter();

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

    enterDemo('admin');
    router.replace('/admin/dashboard');
  }, [isHydrated, user, enterDemo, router]);

  return <RouteLoadingScreen message="Membuka Dashboard SIP Barang..." />;
}
