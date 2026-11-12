'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Sun, Moon, LogOut, ShieldCheck, ShoppingBag, Clock, Package, Sparkles, UserPlus } from 'lucide-react';

interface HeaderProps {
  onOpenShowcase?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export default function Header({ onOpenShowcase, onOpenAuth }: HeaderProps) {
  const { user, theme, toggleTheme, logout } = useApp();
  const [timeString, setTimeString] = useState('');

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
    <header className="app-header">
      {/* Brand & System Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div
          style={{
            width: '35px',
            height: '35px',
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
          <Package size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
              SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
            </h1>
            <span className={isAdmin ? 'badge badge-cyan' : 'badge badge-green'} style={{ fontSize: '10.5px', padding: '2px 8px' }}>
              {isAdmin ? (
                <>
                  <ShieldCheck size={11} /> <span className="hide-mobile">Administrator</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={11} /> <span className="hide-mobile">Kasir POS</span>
                </>
              )}
            </span>
          </div>
          <p className="hide-mobile" style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
            Sistem Operasional Penjualan &amp; Manajemen Inventaris
          </p>
        </div>
      </div>

      {/* Right Controls: Showcase, Register/Switch Account, Clock, Theme Toggle, User Profile, Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenShowcase && (
          <button
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
            <span className="hide-mobile">Showcase</span>
          </button>
        )}

        {onOpenAuth && (
          <button
            onClick={() => onOpenAuth('register')}
            className="btn btn-secondary btn-sm"
            title="Daftar Akun Baru atau Ganti Akun"
            style={{ padding: '6px 10px' }}
          >
            <UserPlus size={13} />
            <span className="hide-mobile">Daftar / Masuk</span>
          </button>
        )}

        {timeString && (
          <div
            className="font-mono hide-mobile"
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
          <div className="hide-mobile" style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user.name}
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {user.email}
            </div>
          </div>

          <button
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
            <span className="hide-mobile">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
