'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import {
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Package,
  UserPlus,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  Store,
} from 'lucide-react';

interface HeaderProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Ringkasan Utama',
  products: 'Inventaris & Stok',
  pos: 'Terminal Kasir (POS)',
  reports: 'Laporan Transaksi',
  settings: 'Pengaturan & Kasir',
  'my-transactions': 'Riwayat Shift',
};

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Header({ onOpenAuth }: HeaderProps) {
  const { user, theme, toggleTheme, logout, activeTab, isCloudConnected, paymentSettings } =
    useApp();
  const { settings } = useBluetoothPrinter();

  const [timeString, setTimeString] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timePart = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setTimeString(timePart);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const currentTabLabel = TAB_LABELS[activeTab] || 'Operasional';
  const activeStoreName =
    paymentSettings.qrisMerchantName?.trim() ||
    settings.storeName?.trim() ||
    'SIP BARANG';
  const initials = getUserInitials(user.name);

  return (
    <>
      <header className="app-header">
        {/* Left: StudioBlank Architectural Brand & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div className="brand-emblem">
              <Package size={16} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
                </h1>
                <span className="sb-status sb-status-accent" style={{ height: '20px', padding: '0 6px', fontSize: '9.5px' }}>
                  {isAdmin ? (
                    <>
                      <ShieldCheck size={10} /> <span>Admin</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={10} /> <span>Kasir</span>
                    </>
                  )}
                </span>
              </div>

              {/* Mobile Subline */}
              <div
                className="show-mobile-only"
                style={{
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10.5px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  minWidth: 0,
                }}
              >
                <span className={`header-status-dot ${isCloudConnected ? 'online' : 'local'}`} />
                <span
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentTabLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Architectural Hairline Divider + Store & Module Breadcrumb (Desktop) */}
          <div
            className="hide-mobile"
            style={{
              width: '1px',
              height: '26px',
              backgroundColor: 'var(--border-color)',
              flexShrink: 0,
            }}
          />

          <div
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                maxWidth: '200px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={activeStoreName}
            >
              <Store size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeStoreName}
              </span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span
              style={{
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTabLabel}
            </span>
          </div>
        </div>

        {/* Right: Clean Architectural Controls (Desktop) */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="header-status-pill hide-tablet-header">
            <span className={`header-status-dot ${isCloudConnected ? 'online' : 'local'}`} />
            <span>{isCloudConnected ? 'Tersinkron' : 'Mode Offline'}</span>
            {timeString && (
              <>
                <span style={{ color: 'var(--border-color)' }}>|</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                  {timeString} WIB
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="sb-btn sb-btn-sm"
            style={{ height: '34px', padding: '0 10px' }}
            title={`Ubah ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
            aria-label="Ubah Tema"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={13} style={{ color: 'var(--accent-amber-text)' }} />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Gelap</span>
              </>
            )}
          </button>

          {/* User Account Popover & Quick Logout */}
          <div
            ref={accountMenuRef}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className="header-account-btn"
              aria-expanded={isAccountMenuOpen}
              aria-label="Menu Akun Pengguna"
            >
              <span className="header-avatar">{initials}</span>
              <div style={{ textAlign: 'left', lineHeight: 1.2, maxWidth: '130px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </div>
              </div>
              <ChevronDown
                size={13}
                style={{
                  color: 'var(--text-muted)',
                  transform: isAccountMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.14s ease',
                }}
              />
            </button>

            <button
              type="button"
              onClick={logout}
              className="sb-btn sb-btn-sm"
              style={{
                height: '34px',
                padding: '0 10px',
                color: 'var(--accent-red)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
              }}
              title="Keluar dari Sesi"
              aria-label="Keluar dari Sesi"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>

            {isAccountMenuOpen && (
              <div className="header-popover">
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</div>
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {user.email}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Toko: {activeStoreName}</span>
                    <span className="sb-status sb-mono" style={{ height: '19px', padding: '0 6px' }}>
                      {isCloudConnected ? 'Cloud' : 'Offline'}
                    </span>
                  </div>
                </div>

                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenAuth('register');
                    }}
                    className="header-popover-item"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus size={14} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Ganti / Daftar Akun Lain</span>
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    logout();
                  }}
                  className="header-popover-item"
                  style={{
                    color: 'var(--accent-red)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={14} />
                    <span>Keluar dari Sesi</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Compact Header Controls */}
        <div className="show-mobile-only" style={{ alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="sb-btn sb-btn-sm"
            style={{ width: '34px', height: '34px', padding: 0 }}
            aria-label="Ubah Tema"
          >
            {theme === 'dark' ? (
              <Sun size={14} style={{ color: 'var(--accent-amber-text)' }} />
            ) : (
              <Moon size={14} style={{ color: 'var(--accent-cyan)' }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="sb-btn sb-btn-sm"
            style={{ width: '34px', height: '34px', padding: 0 }}
            aria-label="Buka Menu Akun"
          >
            <Menu size={15} />
          </button>
        </div>
      </header>

      {/* Mobile Account Sheet */}
      {isMobileMenuOpen && (
        <div className="modal-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="modal-content modal-sheet"
            style={{ maxWidth: '460px', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span className="header-avatar" style={{ width: '34px', height: '34px', fontSize: '12px' }}>
                  {initials}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{user.name}</div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="sb-btn sb-btn-sm"
                style={{ width: '32px', height: '32px', padding: 0 }}
                aria-label="Tutup menu"
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                marginBottom: '12px',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Store size={14} style={{ color: 'var(--accent-cyan)' }} />
                {activeStoreName}
              </span>
              <span className="sb-status sb-mono">
                {isCloudConnected ? 'Tersinkron' : 'Mode Offline'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="sb-btn sb-btn-full"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserPlus size={15} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Ganti / Daftar Akun Lain</span>
                  </span>
                  <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="sb-btn sb-btn-full"
                style={{
                  justifyContent: 'center',
                  color: 'var(--accent-red)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                }}
              >
                <LogOut size={15} />
                <span>Keluar dari Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
