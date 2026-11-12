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
      icon: <LayoutDashboard size={17} />,
      badge: null,
    },
    {
      id: 'products',
      label: 'Inventaris & Stok',
      icon: <Package size={17} />,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeColor: 'badge-amber',
    },
    {
      id: 'reports',
      label: 'Laporan Transaksi',
      icon: <FileText size={17} />,
      badge: null,
    },
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      icon: <ShoppingCart size={17} />,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Pengaturan & Kasir',
      icon: <Settings size={17} />,
      badge: cashiers.length > 0 ? `${cashiers.length}` : null,
      badgeColor: 'badge-cyan',
    },
  ];

  const userNav = [
    {
      id: 'pos',
      label: 'Terminal Kasir (POS)',
      icon: <ShoppingCart size={17} />,
      badge: null,
    },
    {
      id: 'my-transactions',
      label: 'Riwayat Shift Saya',
      icon: <History size={17} />,
      badge: null,
    },
  ];

  const currentNav = isAdmin ? adminNav : userNav;

  return (
    <aside className="app-sidebar">
      <div>
        <div className="hide-mobile" style={{ marginBottom: '10px', paddingLeft: '10px' }}>
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
        className="hide-mobile"
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
  );
}
