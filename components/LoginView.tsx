'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  ShoppingCart,
  Sun,
  Moon,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Package,
  Eye,
  EyeOff,
  ArrowLeft,
  UserPlus,
  LogIn,
  User,
  CheckCircle2,
} from 'lucide-react';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  onBackToShowcase?: () => void;
  onLoginSuccess?: () => void;
}

export default function LoginView({
  initialMode = 'login',
  onBackToShowcase,
  onLoginSuccess,
}: LoginViewProps) {
  const { login, register, theme, toggleTheme } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authMode === 'login') {
      const res = login(email, password);
      if (!res.success) {
        setError(res.message || 'Autentikasi gagal.');
      } else {
        onLoginSuccess?.();
      }
    } else {
      const res = register(name, email, password, role);
      if (!res.success) {
        setError(res.message || 'Pendaftaran gagal.');
      } else {
        onLoginSuccess?.();
      }
    }
  };

  const handleQuickDemo = (targetRole: 'admin' | 'user') => {
    const targetEmail = targetRole === 'admin' ? 'admin@sip.com' : 'user@sip.com';
    setEmail(targetEmail);
    setPassword('12345678');
    setError('');
    const res = login(targetEmail, '12345678');
    if (!res.success) {
      setError(res.message || 'Autentikasi gagal.');
    } else {
      onLoginSuccess?.();
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
        padding: '72px 16px 32px',
        position: 'relative',
      }}
    >
      {/* Top Bar: Back to Showcase & Theme Toggle */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme === 'dark' ? 'rgba(15, 17, 21, 0.85)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 40,
        }}
      >
        <div>
          {onBackToShowcase && (
            <button
              onClick={onBackToShowcase}
              className="btn btn-secondary btn-sm"
              style={{ padding: '7px 13px' }}
            >
              <ArrowLeft size={14} />
              <span>Halaman Utama (Showcase)</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            className="btn btn-secondary btn-sm"
          >
            {authMode === 'login' ? (
              <>
                <UserPlus size={13} />
                <span>Daftar Akun</span>
              </>
            ) : (
              <>
                <LogIn size={13} />
                <span>Masuk Akun</span>
              </>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-icon"
            title={`Ubah ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
            aria-label="Ubah Tema"
            style={{ width: '36px', height: '36px' }}
          >
            {theme === 'dark' ? (
              <Sun size={16} style={{ color: 'var(--accent-amber-text)' }} />
            ) : (
              <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />
            )}
          </button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
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
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
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
              <span>Daftar Baru</span>
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px' }}>
              {authMode === 'login' ? 'Masuk ke Sistem Operasional' : 'Registrasi Operator / Admin Baru'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {authMode === 'login'
                ? 'Gunakan kredensial akun Anda atau pilih sesi demo instan di bawah.'
                : 'Buat akun baru untuk langsung mengakses fitur Kasir POS atau Dashboard Admin.'}
            </p>
          </div>

          {error && (
            <div className="alert-box" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {authMode === 'register' && (
              <div>
                <label className="form-label">Nama Lengkap Petugas</label>
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
                    placeholder="Contoh: Budi Santoso"
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
                Kata Sandi {authMode === 'register' && <span style={{ fontWeight: 400 }}>(Min. 6 karakter)</span>}
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
              <div>
                <label className="form-label">Pilih Peran Operasional</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '3px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid',
                      borderColor: role === 'user' ? 'var(--accent-cyan)' : 'var(--border-color)',
                      backgroundColor:
                        role === 'user' ? 'rgba(var(--accent-cyan-rgb), 0.1)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '12px', color: role === 'user' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        <ShoppingCart size={14} /> Kasir POS
                      </span>
                      {role === 'user' && <CheckCircle2 size={13} style={{ color: 'var(--accent-cyan)' }} />}
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      Transaksi &amp; Struk
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '3px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid',
                      borderColor: role === 'admin' ? 'var(--accent-cyan)' : 'var(--border-color)',
                      backgroundColor:
                        role === 'admin' ? 'rgba(var(--accent-cyan-rgb), 0.1)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '12px', color: role === 'admin' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        <ShieldCheck size={14} /> Administrator
                      </span>
                      {role === 'admin' && <CheckCircle2 size={13} style={{ color: 'var(--accent-cyan)' }} />}
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      Full Akses &amp; Gudang
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px', padding: '11px' }}>
              <span>{authMode === 'login' ? 'Masuk Sekarang' : 'Daftar & Masuk Sekarang'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '18px 0 14px',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span>Akses Cepat Sesi Demo (1-Klik)</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          {/* Quick Role Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="btn btn-secondary"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                gap: '3px',
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                <ShieldCheck size={15} />
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Administrator</span>
              </div>
              <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                admin@sip.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('user')}
              className="btn btn-secondary"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                gap: '3px',
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green-text)' }}>
                <ShoppingCart size={15} />
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Kasir POS</span>
              </div>
              <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                user@sip.com
              </span>
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '18px' }}>
          &copy; {new Date().getFullYear()} SIP Barang &bull; Sistem Operasional Terpadu
        </p>
      </div>
    </div>
  );
}
