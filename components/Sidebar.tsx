'use client';

import React, { useMemo } from 'react';
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

  const lowStockCount = useMemo(
    () => products.reduce((count, p) => count + (p.stock <= p.minStock ? 1 : 0), 0),
    [products]
  );

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const adminNav = [
    {
      id: 'dashboard',
      label: 'Ringkasan Utama',
      mobileLabel: 'Beranda',
      icon: <LayoutDashboard size={16} />,
      mobileIcon: <LayoutDashboard size={19} />,
      badge: null,
      badgeStatusClass: '',
    },
    {
      id: 'products',
      label: 'Inventaris & Stok',
      mobileLabel: 'Produk',
      icon: <Package size={16} />,
      mobileIcon: <Package size={19} />,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeStatusClass: 'sb-status-warn',
    },
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      mobileLabel: 'Kasir',
      icon: <ShoppingCart size={16} />,
      mobileIcon: <ShoppingCart size={19} />,
      badge: null,
      badgeStatusClass: '',
    },
    {
      id: 'reports',
      label: 'Laporan Transaksi',
      mobileLabel: 'Laporan',
      icon: <FileText size={16} />,
      mobileIcon: <FileText size={19} />,
      badge: null,
      badgeStatusClass: '',
    },
    {
      id: 'settings',
      label: 'Pengaturan & Kasir',
      mobileLabel: 'Atur',
      icon: <Settings size={16} />,
      mobileIcon: <Settings size={19} />,
      badge: cashiers.length > 0 ? `${cashiers.length}` : null,
      badgeStatusClass: 'sb-status-accent',
    },
  ];

  const userNav = [
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      mobileLabel: 'Kasir POS',
      icon: <ShoppingCart size={16} />,
      mobileIcon: <ShoppingCart size={19} />,
      badge: null,
      badgeStatusClass: '',
    },
    {
      id: 'my-transactions',
      label: 'Riwayat Shift Saya',
      mobileLabel: 'Riwayat Shift',
      icon: <History size={16} />,
      mobileIcon: <History size={19} />,
      badge: null,
      badgeStatusClass: '',
    },
  ];

  const currentNav = isAdmin ? adminNav : userNav;

  return (
    <>
      {/* Desktop Sidebar — StudioBlank Architectural Navigation */}
      <aside className="app-sidebar">
        <div>
          <div style={{ marginBottom: '12px', paddingLeft: '10px' }}>
            <span className="sb-eyebrow">
              {isAdmin ? 'Menu Utama Toko' : 'Menu Kasir'}
            </span>
          </div>

          <nav className="app-sidebar-nav" style={{ gap: '2px' }}>
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
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: 0,
                    border: 'none',
                    borderLeft: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                    backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 140ms ease, color 140ms ease, border-color 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        display: 'flex',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`sb-status ${item.badgeStatusClass} sb-mono`}
                      style={{ height: '20px', padding: '0 6px', fontSize: '10px' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Architectural Access Level Footer */}
        <div
          style={{
            padding: '14px',
            borderRadius: 0,
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderLeft: `2px solid ${isAdmin ? 'var(--accent-cyan)' : 'var(--accent-green-text)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {isAdmin ? (
              <span
                style={{
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ShieldCheck size={13} /> Akses Pemilik Toko
              </span>
            ) : (
              <span
                style={{
                  color: 'var(--accent-green-text)',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Lock size={13} /> Akses Staf Kasir
              </span>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
            {isAdmin
              ? 'Kelola produk, harga modal, stok barang, dan laporan keuangan.'
              : 'Khusus melayani pembayaran pembeli dan cetak struk belanja.'}
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
