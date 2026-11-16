'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import LoginView from '@/components/LoginView';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import { resolvePostLoginRedirect } from '@/lib/routes';

function LoginPageContent() {
  const { enterDemo } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const nextPath = searchParams.get('next');

  return (
    <LoginView
      key={initialMode}
      initialMode={initialMode}
      onOpenDemoDashboard={async () => {
        const res = await enterDemo('admin');
        if (res.success) {
          router.replace('/admin/dashboard');
          return { success: true };
        }
        return { success: false, message: res.message };
      }}
      onLoginSuccess={(role = 'admin') => {
        router.replace(resolvePostLoginRedirect(nextPath, role));
      }}
    />
  );
}

/** Authentication route (/login) supporting login, admin store signup, and quick Demo Dashboard entry. */
export default function LoginPage() {
  return (
    <Suspense fallback={<RouteLoadingScreen message="Memuat halaman autentikasi..." />}>
      <LoginPageContent />
    </Suspense>
  );
}
