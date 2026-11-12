'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  History,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export default function Sidebar() {
  const { user, activeTab, setActiveTab, products, cashiers } = useApp();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const adminNav = [
    {
      id: 'dashboard',
      label: 'Ringkasan Utama',
      mobileLabel: 'Beranda',
      icon: <LayoutDashboard size={17} />,
      mobileIcon: <LayoutDashboard size={19} />,
      badge: null,
    },
    {
      id: 'products',
      label: 'Inventaris & Stok',
      mobileLabel: 'Produk',
      icon: <Package size={17} />,
      mobileIcon: <Package size={19} />,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeColor: 'badge-amber',
    },
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      mobileLabel: 'Kasir',
      icon: <ShoppingCart size={17} />,
      mobileIcon: <ShoppingCart size={19} />,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Laporan Transaksi',
      mobileLabel: 'Laporan',
      icon: <FileText size={17} />,
      mobileIcon: <FileText size={19} />,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Pengaturan & Kasir',
      mobileLabel: 'Atur',
      icon: <Settings size={17} />,
      mobileIcon: <Settings size={19} />,
      badge: cashiers.length > 0 ? `${cashiers.length}` : null,
      badgeColor: 'badge-cyan',
    },
  ];

  const userNav = [
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      mobileLabel: 'Kasir POS',
      icon: <ShoppingCart size={17} />,
      mobileIcon: <ShoppingCart size={19} />,
      badge: null,
    },
    {
      id: 'my-transactions',
      label: 'Riwayat Shift Saya',
      mobileLabel: 'Riwayat Shift',
      icon: <History size={17} />,
      mobileIcon: <History size={19} />,
      badge: null,
    },
  ];

  const currentNav = isAdmin ? adminNav : userNav;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div>
          <div style={{ marginBottom: '10px', paddingLeft: '10px' }}>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.07em',
              }}
            >
              {isAdmin ? 'Navigasi Administrator' : 'Navigasi Kasir'}
            </span>
          </div>

          <nav className="app-sidebar-nav">
            {currentNav.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(var(--accent-cyan-rgb), 0.4)' : 'transparent',
                    backgroundColor: isActive ? 'rgba(var(--accent-cyan-rgb), 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  className={`app-sidebar-btn ${!isActive ? 'sip-card-hover' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)', display: 'flex' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`badge ${item.badgeColor || 'badge-muted'}`}
                      style={{ fontSize: '10px', padding: '1px 7px' }}
                      title={`${item.badge} produk mencapai batas stok minimum`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Compact Access Level Footer */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {isAdmin ? (
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} /> Otorisasi Penuh
              </span>
            ) : (
              <span style={{ color: 'var(--accent-green-text)', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={13} /> Mode Operasional Kasir
              </span>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
            {isAdmin
              ? 'Akses penuh ke katalog harga modal, penyesuaian stok, dan laporan.'
              : 'Akses khusus transaksi penjualan dan cetak struk pelanggan.'}
          </p>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-nav no-print"
        aria-label="Navigasi Smartphone"
        style={{
          gridTemplateColumns: `repeat(${currentNav.length}, 1fr)`,
        }}
      >
        {currentNav.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`mobile-bottom-nav-btn ${isActive ? 'is-active' : ''}`}
            >
              <span className="mobile-bottom-nav-icon">
                {item.mobileIcon}
                {item.badge && (
                  <span className="mobile-bottom-nav-badge">{item.badge}</span>
                )}
              </span>
              <span className="mobile-bottom-nav-label">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
