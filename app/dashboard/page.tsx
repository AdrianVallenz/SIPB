'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getDefaultRouteForRole } from '@/lib/routes';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

/** Smart /dashboard alias forwarding directly into the active role workspace or Demo Admin Dashboard. */
export default function DashboardAliasPage() {
  const { user, isHydrated, enterDemo } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    if (user) {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }

    enterDemo('admin');
    router.replace('/admin/dashboard');
  }, [isHydrated, user, enterDemo, router]);

  return <RouteLoadingScreen message="Mengarahkan ke Dashboard..." />;
}
