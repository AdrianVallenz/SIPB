'use client';

import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import LoginView from '@/components/LoginView';
import AdminDashboard from '@/components/AdminDashboard';
import AdminProducts from '@/components/AdminProducts';
import AdminReports from '@/components/AdminReports';
import AdminSettings from '@/components/AdminSettings';
import PosView from '@/components/PosView';
import CashierHistory from '@/components/CashierHistory';

function AppContent() {
  const { user, activeTab } = useApp();

  if (!user) {
    return <LoginView />;
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
      <Header />
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
