'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingView from '@/components/LandingView';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import { useApp } from '@/context/AppContext';
import { getRouteForTab } from '@/lib/routes';

interface LandingEntryClientProps {
  redirectPosSubdomain?: boolean;
}

/** Shared client wrapper rendering LandingView with auth routing and pos.* subdomain guard. */
export default function LandingEntryClient({ redirectPosSubdomain = false }: LandingEntryClientProps) {
  const router = useRouter();
  const { user, isHydrated, setActiveTab } = useApp();

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
      onOpenAuth={(mode) => {
        router.push(mode === 'register' ? '/login?mode=register' : '/login');
      }}
      onEnterApp={(targetTab) => {
        if (!user) {
          const nextRoute = targetTab ? getRouteForTab(targetTab, targetTab === 'pos' ? 'user' : 'admin') : '';
          router.push(nextRoute ? `/login?next=${encodeURIComponent(nextRoute)}` : '/login');
          return;
        }
        const safeTab = targetTab || (user.role === 'user' ? 'pos' : 'dashboard');
        setActiveTab(safeTab);
        router.push(getRouteForTab(safeTab, user.role));
      }}
    />
  );
}
