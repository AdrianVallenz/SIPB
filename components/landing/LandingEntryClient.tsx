'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingView from '@/components/LandingView';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import { useApp } from '@/context/AppContext';
import { getRouteForTab } from '@/lib/routes';

interface LandingEntryClientProps {
  redirectPosSubdomain?: boolean;
}

/** Shared client wrapper rendering LandingView with Demo Dashboard, auth routing, and pos.* subdomain guard. */
export default function LandingEntryClient({ redirectPosSubdomain = false }: LandingEntryClientProps) {
  const router = useRouter();
  const { user, isHydrated, setActiveTab, enterDemo } = useApp();
  const [isOpeningDemo, setIsOpeningDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const isPosSubdomain =
    redirectPosSubdomain &&
    isHydrated &&
    typeof window !== 'undefined' &&
    window.location.hostname.startsWith('pos.');

  useEffect(() => {
    if (!isPosSubdomain) return;
    if (user) {
      router.replace(user.role === 'admin' ? '/admin/kasir' : '/kasir');
    } else {
      router.replace('/login?next=/kasir');
    }
  }, [isPosSubdomain, user, router]);

  if (isPosSubdomain) {
    return <RouteLoadingScreen message="Membuka Terminal Kasir POS..." />;
  }

  return (
    <LandingView
      isOpeningDemo={isOpeningDemo}
      demoError={demoError}
      onOpenAuth={(mode) => {
        router.push(mode === 'register' ? '/login?mode=register' : '/login');
      }}
      onEnterApp={async (targetTab) => {
        if (isOpeningDemo) return;
        setDemoError(null);
        const safeTab = targetTab || (user?.role === 'user' ? 'pos' : 'dashboard');

        if (user) {
          setActiveTab(safeTab);
          router.push(getRouteForTab(safeTab, user.role));
          return;
        }

        const roleToEnter = safeTab === 'pos' ? 'user' : 'admin';
        setIsOpeningDemo(true);
        try {
          const res = await enterDemo(roleToEnter);
          if (res.success) {
            const activeRole = res.role || roleToEnter;
            setActiveTab(safeTab);
            router.push(getRouteForTab(safeTab, activeRole));
            return;
          }
          setDemoError(
            res.message || 'Gagal membuka Demo Dashboard. Periksa koneksi internet Anda.'
          );
        } finally {
          setIsOpeningDemo(false);
        }
      }}
    />
  );
}
