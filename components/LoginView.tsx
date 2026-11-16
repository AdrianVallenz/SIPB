'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sun,
  Moon,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Package,
  Eye,
  EyeOff,
  LayoutDashboard,
  UserPlus,
  LogIn,
  User,
  Database,
  Loader2,
} from 'lucide-react';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  onOpenDemoDashboard?: () => void;
  onLoginSuccess?: (role?: 'admin' | 'user') => void;
}

export default function LoginView({
  initialMode = 'login',
  onOpenDemoDashboard,
  onLoginSuccess,
}: LoginViewProps) {
  const { login, register, theme, toggleTheme } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.message || 'Autentikasi gagal.');
        } else {
          onLoginSuccess?.(res.role);
        }
      } else {
        const res = await register(name, email, password);
        if (!res.success) {
          setError(res.message || 'Pendaftaran gagal.');
        } else {
          onLoginSuccess?.(res.role ?? 'admin');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setAuthMode(nextMode);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        backgroundImage:
          'radial-gradient(ellipse 75% 45% at 50% 0%, rgba(var(--accent-cyan-rgb), 0.12) 0%, transparent 70%)',
        padding: '76px 16px 32px',
        position: 'relative',
      }}
    >
      {/* Top Bar: Demo Dashboard & Unified Action Capsule */}
      <header
        className="app-header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {onOpenDemoDashboard ? (
            <button
              type="button"
              onClick={onOpenDemoDashboard}
              className="header-tool-btn"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                height: '36px',
                padding: '0 12px',
              }}
            >
              <LayoutDashboard size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span className="hide-mobile">Masuk Demo Dashboard</span>
              <span className="show-mobile-only" style={{ fontSize: '12px' }}>Dashboard</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="brand-emblem">
                <Package size={16} />
              </div>
              <span style={{ fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
              </span>
            </div>
          )}
        </div>

        <div className="header-toolbar">
          <button
            type="button"
            onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            className="header-tool-btn"
          >
            {authMode === 'login' ? (
              <>
                <UserPlus size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Daftar Admin</span>
              </>
            ) : (
              <>
                <LogIn size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Masuk Akun</span>
              </>
            )}
          </button>

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
      </header>

      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
              border: '1.5px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Package size={24} />
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}
          >
            SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sistem Operasional Penjualan &amp; Inventaris Gudang
          </p>
        </div>

        {/* Auth Card */}
        <div className="sip-card" style={{ padding: '24px 22px', boxShadow: 'var(--shadow-md)' }}>
          {/* Segmented Switcher: Masuk vs Daftar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: authMode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: authMode === 'login' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: authMode === 'login' ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: authMode === 'login' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn size={14} />
              <span>Masuk Akun</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('register')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: authMode === 'register' ? 'var(--bg-card)' : 'transparent',
                color: authMode === 'register' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: authMode === 'register' ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: authMode === 'register' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <UserPlus size={14} />
              <span>Daftar Admin</span>
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px' }}>
              {authMode === 'login'
                ? 'Masuk ke Sistem Operasional'
                : 'Daftar Akun Administrator Toko Baru'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {authMode === 'login'
                ? 'Masuk sebagai Administrator toko atau menggunakan akun Kasir yang dibuat oleh Admin Anda.'
                : 'Pendaftaran mandiri otomatis menjadi akun Administrator dengan ruang database toko tersendiri.'}
            </p>
          </div>

          {error && (
            <div className="alert-box" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {authMode === 'register' && (
              <div>
                <label className="form-label">Nama Pemilik / Nama Toko</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko Maju Jaya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="sip-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Alamat Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="nama@sipb.web.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sip-input font-mono"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                Kata Sandi{' '}
                {authMode === 'register' && (
                  <span style={{ fontWeight: 400 }}>(Min. 6 karakter)</span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={authMode === 'register' ? 6 : 1}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sip-input font-mono"
                  style={{ paddingLeft: '36px', paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Tampilkan kata sandi"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(var(--accent-cyan-rgb), 0.35)',
                  backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.08)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Database
                  size={16}
                  style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }}
                />
                <div style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    Otomatis Menjadi Akun Administrator:
                  </strong>{' '}
                  Database produk, stok, &amp; transaksi dipisahkan per akun. Anda dapat membuat
                  akun <strong>Kasir POS</strong> khusus toko Anda melalui{' '}
                  <strong>Pengaturan Sistem</strong> setelah masuk.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ marginTop: '4px', padding: '11px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Memproses Autentikasi...</span>
                </>
              ) : (
                <>
                  <span>
                    {authMode === 'login'
                      ? 'Masuk Sekarang'
                      : 'Buat Akun Administrator & Masuk'}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {authMode === 'login' && (
              <div
                style={{
                  marginTop: '6px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                  }}
                >
                  AKUN DEMO CEPAT (ADMIN &amp; KASIR)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEmail('admin@sipb.web.id');
                      setPassword('admin123');
                      setError('');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '7px 10px' }}
                  >
                    <span>Isi Demo Admin</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEmail('kasir@sipb.web.id');
                      setPassword('kasir123');
                      setError('');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '7px 10px' }}
                  >
                    <span>Isi Demo Kasir</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            marginTop: '18px',
          }}
        >
          &copy; {new Date().getFullYear()} SIP Barang &bull; Sistem Operasional Terpadu
        </p>
      </div>
    </div>
  );
}
