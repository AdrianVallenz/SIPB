'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getDefaultRouteForRole } from '@/lib/routes';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

/** Smart /dashboard alias forwarding directly into the active role workspace or /login. */
export default function DashboardAliasPage() {
  const { user, isHydrated } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    if (user) {
      router.replace(getDefaultRouteForRole(user.role));
    } else {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  return <RouteLoadingScreen message="Mengarahkan ke Dashboard..." />;
}
