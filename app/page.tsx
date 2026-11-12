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

function AppContent() {
  const { user, activeTab, setActiveTab, login } = useApp();
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('pos.')) {
      return 'app';
    }
    return 'landing';
  });

  const handleEnterApp = (role?: 'admin' | 'user', targetTab?: string) => {
    if (role && (!user || user.role !== role)) {
      const targetEmail = role === 'admin' ? 'admin@sip.com' : 'user@sip.com';
      login(targetEmail, '12345678');
    }
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setScreenMode('app');
  };

  if (screenMode === 'landing') {
    return (
      <LandingView
        onOpenLogin={() => setScreenMode('login')}
        onEnterApp={handleEnterApp}
      />
    );
  }

  if (screenMode === 'login' || !user) {
    return (
      <LoginView
        onBackToShowcase={() => setScreenMode('landing')}
        onLoginSuccess={() => setScreenMode('app')}
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
      <Header onOpenShowcase={() => setScreenMode('landing')} />
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
