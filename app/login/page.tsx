'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginView from '@/components/LoginView';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import { resolvePostLoginRedirect } from '@/lib/routes';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const nextPath = searchParams.get('next');

  return (
    <LoginView
      key={initialMode}
      initialMode={initialMode}
      onLoginSuccess={(role = 'admin') => {
        router.replace(resolvePostLoginRedirect(nextPath, role));
      }}
    />
  );
}

/** Authentication route (/login) supporting email/password login and admin store signup. */
export default function LoginPage() {
  return (
    <Suspense fallback={<RouteLoadingScreen message="Memuat halaman autentikasi..." />}>
      <LoginPageContent />
    </Suspense>
  );
}
