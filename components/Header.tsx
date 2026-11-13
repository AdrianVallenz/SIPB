'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import PrinterModal from './PrinterModal';
import {
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Package,
  Sparkles,
  UserPlus,
  Bluetooth,
  BluetoothConnected,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  Store,
} from 'lucide-react';

interface HeaderProps {
  onOpenShowcase?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Produk & Stok',
  pos: 'Kasir POS',
  reports: 'Laporan',
  settings: 'Pengaturan',
  'my-transactions': 'Riwayat Shift',
};

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Header({ onOpenShowcase, onOpenAuth }: HeaderProps) {
  const { user, theme, toggleTheme, logout, activeTab, isCloudConnected, paymentSettings } = useApp();
  const { runtime, settings, isConnected } = useBluetoothPrinter();

  const [timeString, setTimeString] = useState('');
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      const timePart = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setTimeString(`${datePart} • ${timePart}`);
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
        {/* Brand & Store Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div className="brand-emblem">
            <Package size={17} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <h1
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
              </h1>
              <span
                className={isAdmin ? 'badge badge-cyan' : 'badge badge-green'}
                style={{ fontSize: '10px', padding: '2px 7px' }}
              >
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

            {/* Active Page + Store Subline */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginTop: '1px',
                minWidth: 0,
              }}
            >
              <span
                className={`header-status-dot ${isCloudConnected ? 'online' : 'local'} show-mobile-only`}
                style={{ width: '6px', height: '6px' }}
              />
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentTabLabel}
              </span>
              <span className="hide-mobile" style={{ color: 'var(--text-muted)' }}>
                &bull;
              </span>
              <span
                className="hide-mobile"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)',
                  maxWidth: '210px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={activeStoreName}
              >
                <Store size={11} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeStoreName}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Cloud Status + Compact Clock */}
          <div className="header-status-pill hide-tablet-header">
            <span className={`header-status-dot ${isCloudConnected ? 'online' : 'local'}`} />
            <span>{isCloudConnected ? 'Cloud Sync' : 'Mode Lokal'}</span>
            {timeString && (
              <>
                <span style={{ color: 'var(--border-color)' }}>|</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                  {timeString}
                </span>
              </>
            )}
          </div>

          {/* Grouped Control Capsule */}
          <div className="header-toolbar">
            <button
              type="button"
              onClick={() => setIsPrinterOpen(true)}
              className={`header-tool-btn ${isConnected ? 'is-active' : ''}`}
              title="Pengaturan Printer Thermal Bluetooth"
            >
              {isConnected ? <BluetoothConnected size={14} /> : <Bluetooth size={14} />}
              <span
                style={{
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isConnected ? runtime.deviceName || 'BT Aktif' : 'Printer BT'}
              </span>
            </button>

            {onOpenShowcase && (
              <button
                type="button"
                onClick={onOpenShowcase}
                className="header-tool-btn"
                title="Lihat Halaman Showcase & Fitur Sistem"
              >
                <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Showcase</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="header-tool-btn header-tool-icon"
              title={`Ubah ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
              aria-label="Ubah Tema"
            >
              {theme === 'dark' ? (
                <Sun size={15} style={{ color: 'var(--accent-amber-text)' }} />
              ) : (
                <Moon size={15} style={{ color: 'var(--accent-cyan)' }} />
              )}
            </button>
          </div>

          {/* User Account Popover & Quick Logout */}
          <div ref={accountMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className="header-account-btn"
              aria-expanded={isAccountMenuOpen}
              aria-label="Menu Akun Pengguna"
            >
              <span className="header-avatar">{initials}</span>
              <div style={{ textAlign: 'left', lineHeight: 1.2, maxWidth: '125px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
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
                size={14}
                style={{
                  color: 'var(--text-muted)',
                  transform: isAccountMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-icon"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                color: 'var(--accent-red)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
              title="Keluar dari Sesi"
              aria-label="Keluar dari Sesi"
            >
              <LogOut size={15} />
            </button>

            {isAccountMenuOpen && (
              <div className="header-popover">
                <div
                  style={{
                    padding: '8px 10px 10px',
                    marginBottom: '6px',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{user.name}</div>
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
                    <span className={isCloudConnected ? 'badge badge-green' : 'badge badge-amber'} style={{ padding: '1px 6px', fontSize: '9.5px' }}>
                      {isCloudConnected ? 'Cloud' : 'Lokal'}
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
                      <span>Daftar / Ganti Akun</span>
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}

                {onOpenShowcase && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenShowcase();
                    }}
                    className="header-popover-item"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Halaman Showcase</span>
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setIsPrinterOpen(true);
                  }}
                  className="header-popover-item"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Bluetooth size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Konfigurasi Printer BT</span>
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    logout();
                  }}
                  className="header-popover-item"
                  style={{
                    color: 'var(--accent-red)',
                    marginTop: '4px',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px',
                    borderRadius: '0 0 9px 9px',
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
        <div className="show-mobile-only" style={{ alignItems: 'center', flexShrink: 0 }}>
          <div className="header-toolbar">
            <button
              type="button"
              onClick={() => setIsPrinterOpen(true)}
              className={`header-tool-btn ${isConnected ? 'is-active' : ''}`}
              style={{ padding: '0 9px' }}
              aria-label="Printer Bluetooth"
            >
              {isConnected ? <BluetoothConnected size={14} /> : <Bluetooth size={14} />}
              <span style={{ fontSize: '11.5px', fontWeight: 700 }}>
                {isConnected ? 'BT Aktif' : 'BT'}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="header-tool-btn header-tool-icon"
              aria-label="Ubah Tema"
            >
              {theme === 'dark' ? (
                <Sun size={15} style={{ color: 'var(--accent-amber-text)' }} />
              ) : (
                <Moon size={15} style={{ color: 'var(--accent-cyan)' }} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="header-tool-btn header-tool-icon"
              aria-label="Buka Menu Akun"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Account & Quick Actions Sheet */}
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
                <span className="header-avatar" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                  {initials}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{user.name}</div>
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
                className="btn btn-secondary btn-icon"
                aria-label="Tutup menu"
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
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
              <span className={`badge ${isCloudConnected ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                {isCloudConnected ? 'Cloud Sync' : 'Mode Lokal'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPrinterOpen(true);
                }}
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', padding: '12px 14px', minHeight: '46px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isConnected ? (
                    <BluetoothConnected size={16} style={{ color: 'var(--accent-green-text)' }} />
                  ) : (
                    <Bluetooth size={16} style={{ color: 'var(--accent-cyan)' }} />
                  )}
                  <span style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Printer Thermal Bluetooth</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {isConnected
                        ? `Terhubung: ${runtime.deviceName || settings.lastDeviceName} (${settings.paperWidth})`
                        : `Belum terhubung (${settings.paperWidth})`}
                    </div>
                  </span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>

              {onOpenShowcase && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenShowcase();
                  }}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '12px 14px', minHeight: '44px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Lihat Halaman Showcase</span>
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}

              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '12px 14px', minHeight: '44px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserPlus size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Daftar / Ganti Akun</span>
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="btn"
                style={{
                  marginTop: '6px',
                  minHeight: '44px',
                  backgroundColor: 'var(--accent-red-bg)',
                  color: 'var(--accent-red)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                }}
              >
                <LogOut size={16} />
                <span>Keluar dari Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PrinterModal isOpen={isPrinterOpen} onClose={() => setIsPrinterOpen(false)} />
    </>
  );
}
