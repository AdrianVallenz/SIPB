'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AppProvider, useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import LoginView from '@/components/LoginView';
import LandingView from '@/components/LandingView';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'));
const AdminProducts = dynamic(() => import('@/components/AdminProducts'));
const AdminReports = dynamic(() => import('@/components/AdminReports'));
const AdminSettings = dynamic(() => import('@/components/AdminSettings'));
const PosView = dynamic(() => import('@/components/PosView'));
const CashierHistory = dynamic(() => import('@/components/CashierHistory'));

type ScreenMode = 'landing' | 'login' | 'app';

const SCREEN_MODE_KEY = 'sip_screen_mode';

function readStoredScreenMode(): ScreenMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(SCREEN_MODE_KEY);
    if (val === 'landing' || val === 'login' || val === 'app') return val;
    return null;
  } catch {
    return null;
  }
}

function writeStoredScreenMode(mode: ScreenMode) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SCREEN_MODE_KEY, mode);
  } catch {
    // Ignore storage quota or private browsing restriction
  }
}

function AppContent() {
  const { user, isHydrated, activeTab, setActiveTab, login } = useApp();
  const [manualScreen, setManualScreen] = useState<ScreenMode | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const navigateScreen = (mode: ScreenMode) => {
    setManualScreen(mode);
    writeStoredScreenMode(mode);
  };

  const isPosSubdomain =
    isHydrated && typeof window !== 'undefined' && window.location.hostname.startsWith('pos.');
  const savedScreen = isHydrated ? readStoredScreenMode() : null;

  const screenMode: ScreenMode =
    manualScreen ??
    (isPosSubdomain
      ? user
        ? 'app'
        : 'login'
      : savedScreen === 'app' && user
        ? 'app'
        : savedScreen === 'login' && !user
          ? 'login'
          : 'landing');

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    navigateScreen('login');
  };

  const handleEnterApp = async (role?: 'admin' | 'user', targetTab?: string) => {
    if (role && (!user || user.role !== role)) {
      const targetEmail = role === 'admin' ? 'admin@sip.com' : 'user@sip.com';
      const res = await login(targetEmail, '12345678');
      if (!res.success) return;
    }
    if (targetTab) {
      setActiveTab(targetTab);
    }
    navigateScreen('app');
  };

  if (screenMode === 'landing') {
    return (
      <LandingView
        onOpenAuth={handleOpenAuth}
        onEnterApp={handleEnterApp}
      />
    );
  }

  if (screenMode === 'login' || !user) {
    return (
      <LoginView
        key={authInitialMode}
        initialMode={authInitialMode}
        onBackToShowcase={() => navigateScreen('landing')}
        onLoginSuccess={() => navigateScreen('app')}
      />
    );
  }

  const isAdmin = user.role === 'admin';

  const renderCurrentView = () => {
    if (isAdmin) {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'products':
          return <AdminProducts />;
        case 'reports':
          return <AdminReports />;
        case 'pos':
          return <PosView />;
        case 'settings':
          return <AdminSettings />;
        default:
          return <AdminDashboard />;
      }
    } else {
      switch (activeTab) {
        case 'pos':
          return <PosView />;
        case 'my-transactions':
          return <CashierHistory />;
        default:
          return <PosView />;
      }
    }
  };

  return (
    <div className="app-shell">
      <Header
        onOpenShowcase={() => navigateScreen('landing')}
        onOpenAuth={handleOpenAuth}
      />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">{renderCurrentView()}</main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
