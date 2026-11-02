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
} from 'lucide-react';

export default function LoginView() {
  const { login, theme, toggleTheme } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(email, password);
    if (!res.success) {
      setError(res.message || 'Autentikasi gagal.');
    }
  };

  const handleQuickDemo = (role: 'admin' | 'user') => {
    const targetEmail = role === 'admin' ? 'admin@sip.com' : 'user@sip.com';
    setEmail(targetEmail);
    setPassword('12345678');
    setError('');
    login(targetEmail, '12345678');
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
        padding: '24px',
        position: 'relative',
      }}
    >
      {/* Theme Toggle */}
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-icon"
          title={`Ubah ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          aria-label="Ubah Tema"
          style={{ width: '38px', height: '38px' }}
        >
          {theme === 'dark' ? (
            <Sun size={17} style={{ color: 'var(--accent-amber-text)' }} />
          ) : (
            <Moon size={17} style={{ color: 'var(--accent-cyan)' }} />
          )}
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
              margin: '0 auto 14px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Package size={24} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sistem Operasional Penjualan &amp; Inventaris Gudang
          </p>
        </div>

        {/* Login Card */}
        <div className="sip-card" style={{ padding: '26px 24px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>Masuk ke Sistem</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Gunakan kredensial akun Anda atau pilih akses cepat di bawah.
            </p>
          </div>

          {error && (
            <div className="alert-box" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  placeholder="nama@sip.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sip-input font-mono"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Kata Sandi</label>
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
                  autoComplete="current-password"
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

            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px', padding: '11px' }}>
              <span>Masuk Sekarang</span>
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
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span>Akses Cepat Sesi Demo</span>
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
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.3)',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.05)',
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
                borderColor: 'rgba(46, 160, 67, 0.35)',
                backgroundColor: 'rgba(46, 160, 67, 0.06)',
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

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '18px' }}>
          &copy; {new Date().getFullYear()} SIP Barang &bull; Sistem Operasional Terpadu
        </p>
      </div>
    </div>
  );
}
