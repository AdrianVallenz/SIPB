'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import PrinterModal from './PrinterModal';
import {
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Package,
  Sparkles,
  UserPlus,
  Bluetooth,
  BluetoothConnected,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface HeaderProps {
  onOpenShowcase?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export default function Header({ onOpenShowcase, onOpenAuth }: HeaderProps) {
  const { user, theme, toggleTheme, logout } = useApp();
  const { runtime, settings, isConnected } = useBluetoothPrinter();
  const [timeString, setTimeString] = useState('');
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <>
      <header className="app-header">
        {/* Brand & System Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
              border: '1.5px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0,
            }}
          >
            <Package size={17} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <h1 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
                SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
              </h1>
              <span className={isAdmin ? 'badge badge-cyan' : 'badge badge-green'} style={{ fontSize: '10px', padding: '2px 7px' }}>
                {isAdmin ? (
                  <>
                    <ShieldCheck size={11} /> <span>Admin</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={11} /> <span>Kasir</span>
                  </>
                )}
              </span>
            </div>
            <p className="hide-mobile" style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
              Sistem Operasional Penjualan &amp; Manajemen Inventaris
            </p>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsPrinterOpen(true)}
            className="btn btn-secondary btn-sm"
            title="Atur Printer Thermal Bluetooth"
            style={{
              borderColor: isConnected ? 'rgba(var(--accent-cyan-rgb), 0.5)' : 'var(--border-color)',
              color: isConnected ? 'var(--accent-green-text)' : 'var(--text-primary)',
              padding: '6px 10px',
            }}
          >
            {isConnected ? <BluetoothConnected size={13} /> : <Bluetooth size={13} />}
            <span>{isConnected ? runtime.deviceName || 'BT Aktif' : 'Printer BT'}</span>
          </button>

          {onOpenShowcase && (
            <button
              type="button"
              onClick={onOpenShowcase}
              className="btn btn-secondary btn-sm"
              title="Lihat Halaman Showcase & Fitur Sistem"
              style={{
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.4)',
                color: 'var(--accent-cyan)',
                padding: '6px 10px',
              }}
            >
              <Sparkles size={13} />
              <span>Showcase</span>
            </button>
          )}

          {onOpenAuth && (
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="btn btn-secondary btn-sm"
              title="Daftar Akun Baru atau Ganti Akun"
              style={{ padding: '6px 10px' }}
            >
              <UserPlus size={13} />
              <span>Daftar / Masuk</span>
            </button>
          )}

          {timeString && (
            <div
              className="font-mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: 500,
                padding: '5px 11px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span>{timeString}</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-secondary btn-icon"
            title={`Ubah ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
            aria-label="Ubah Tema"
            style={{ width: '34px', height: '34px' }}
          >
            {theme === 'dark' ? (
              <Sun size={16} style={{ color: 'var(--accent-amber-text)' }} />
            ) : (
              <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />
            )}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingLeft: '8px',
              borderLeft: '1px solid var(--border-color)',
            }}
          >
            <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {user.email}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{
                color: 'var(--accent-red)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                padding: '6px 10px',
              }}
              title="Keluar dari Sesi"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Mobile Compact Header Controls */}
        <div className="show-mobile-only" style={{ alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsPrinterOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 10px',
              borderColor: isConnected ? 'rgba(var(--accent-cyan-rgb), 0.55)' : 'var(--border-color)',
              backgroundColor: isConnected ? 'var(--accent-green-bg)' : 'var(--bg-subtle)',
              color: isConnected ? 'var(--accent-green-text)' : 'var(--text-primary)',
            }}
            aria-label="Printer Bluetooth"
          >
            {isConnected ? <BluetoothConnected size={14} /> : <Bluetooth size={14} />}
            <span style={{ fontSize: '11.5px', fontWeight: 700 }}>
              {isConnected ? 'BT Aktif' : 'Printer'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-secondary btn-icon"
            aria-label="Ubah Tema"
            style={{ width: '36px', height: '36px' }}
          >
            {theme === 'dark' ? (
              <Sun size={16} style={{ color: 'var(--accent-amber-text)' }} />
            ) : (
              <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="btn btn-secondary btn-icon"
            aria-label="Buka Menu Akun"
            style={{ width: '36px', height: '36px' }}
          >
            <Menu size={17} />
          </button>
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
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{user.name}</div>
                <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {user.email}
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
