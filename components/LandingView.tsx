'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatRupiah } from '@/lib/format';
import {
  ADMIN_CAPABILITIES,
  CASHIER_CAPABILITIES,
  CORE_FEATURES,
  TECH_STACK_ITEMS,
} from '@/lib/landingData';
import ShowcasePreview, { ShowcaseTab } from '@/components/landing/ShowcasePreview';
import {
  Package,
  ShieldCheck,
  ShoppingCart,
  BarChart3,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Printer,
  Globe,
  TrendingUp,
  LogIn,
  UserPlus,
  History,
  Menu,
  X,
  QrCode,
  Bluetooth,
  Smartphone,
} from 'lucide-react';

const CORE_FEATURE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  'pos-speed': Zap,
  'precision-accounting': TrendingUp,
  'warehouse-audit': History,
  'rbac-security': ShieldCheck,
  'cloud-postgres': Database,
  'reporting-print': Printer,
};

interface LandingViewProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onEnterApp: (role?: 'admin' | 'user', targetTab?: string) => void;
}

export default function LandingView({ onOpenAuth, onEnterApp }: LandingViewProps) {
  const { user, theme, toggleTheme, products, transactions, stockLogs, isCloudConnected } = useApp();
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('dashboard');
  const [selectedSimPayment, setSelectedSimPayment] = useState<'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit'>('QRIS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute live showcase stats in O(P + T) using product buyPrice Map
  const stats = useMemo(() => {
    const productBuyMap = new Map(products.map((p) => [p.id, p.buyPrice]));
    const activeTrx = transactions.filter((t) => t.status !== 'VOIDED');
    let totalRevenue = 0;
    let totalCogs = 0;

    for (const t of activeTrx) {
      totalRevenue += t.total;
      for (const item of t.items) {
        const fallbackBuy = productBuyMap.get(item.productId) ?? Math.round(item.price * 0.75);
        totalCogs += (item.buyPrice ?? fallbackBuy) * item.quantity;
      }
    }

    let totalStockUnits = 0;
    let totalAssetValue = 0;
    let lowStockCount = 0;
    for (const p of products) {
      totalStockUnits += p.stock;
      totalAssetValue += p.buyPrice * p.stock;
      if (p.stock <= p.minStock) lowStockCount += 1;
    }

    const netProfit = totalRevenue - totalCogs;

    return {
      totalProducts: products.length,
      totalTransactions: activeTrx.length,
      totalRevenue,
      netProfit,
      totalStockUnits,
      totalAssetValue,
      lowStockCount,
      profitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 24,
    };
  }, [products, transactions]);

  const sampleProducts = useMemo(() => products.slice(0, 6), [products]);
  const sampleLogs = useMemo(() => stockLogs.slice(0, 4), [stockLogs]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Top Ambient Glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-180px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '920px',
          height: '380px',
          background: 'radial-gradient(circle, rgba(var(--accent-cyan-rgb), 0.14) 0%, rgba(var(--accent-cyan-rgb), 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Sticky Navigation Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--bg-header)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -1,
            height: '1px',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(var(--accent-cyan-rgb), 0.35) 50%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <div className="landing-nav-inner">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div className="brand-emblem">
              <Package size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '15.5px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
              </span>
              <span className="badge badge-cyan font-mono hide-mobile" style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                v2.4 CLOUD
              </span>
            </div>
          </div>

          {/* Center Floating Pill Nav (Desktop) */}
          <nav className="landing-nav-pill hide-mobile" aria-label="Navigasi Utama">
            <a href="#showcase" className="landing-nav-link">
              Showcase
            </a>
            <a href="#fitur" className="landing-nav-link">
              Fitur
            </a>
            <a href="#akses-peran" className="landing-nav-link">
              Mode Akses
            </a>
            <a href="#arsitektur" className="landing-nav-link">
              Arsitektur Cloud
            </a>
          </nav>

          {/* Right CTA Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div className="header-toolbar">
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

              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="header-tool-btn hide-xs"
                >
                  <LogIn size={13} />
                  <span>Masuk</span>
                </button>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="header-tool-btn hide-mobile"
                >
                  <UserPlus size={13} />
                  <span>Ganti Akun</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="header-tool-btn header-tool-icon show-mobile-only"
                aria-label="Menu Navigasi"
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() => onEnterApp()}
                className="btn btn-primary btn-sm"
                style={{ height: '38px', padding: '0 14px', borderRadius: '11px' }}
              >
                <span>Dashboard</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="btn btn-primary btn-sm btn-nav-compact"
                style={{ height: '38px', padding: '0 14px', borderRadius: '11px' }}
              >
                <UserPlus size={14} className="hide-xs" />
                <span>Daftar</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="show-mobile-only"
            style={{
              flexDirection: 'column',
              gap: '10px',
              padding: '14px 18px 18px',
              backgroundColor: 'var(--bg-card)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', justifyContent: 'flex-start' }}
              >
                <BarChart3 size={14} /> Showcase Sistem
              </a>
              <a
                href="#fitur"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', justifyContent: 'flex-start' }}
              >
                <Zap size={14} /> Fitur Unggulan
              </a>
              <a
                href="#akses-peran"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', justifyContent: 'flex-start' }}
              >
                <ShieldCheck size={14} /> Akses Peran
              </a>
              <a
                href="#arsitektur"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', justifyContent: 'flex-start' }}
              >
                <Database size={14} /> Arsitektur Cloud
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="btn btn-secondary btn-sm"
              >
                <LogIn size={14} />
                <span>Masuk Akun</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('register');
                }}
                className="btn btn-primary btn-sm"
              >
                <UserPlus size={14} />
                <span>Daftar Akun Baru</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {/* HERO SECTION */}
        <section
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '44px 18px 36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.12)',
              border: '1px solid rgba(var(--accent-cyan-rgb), 0.35)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '20px',
              maxWidth: '100%',
            }}
          >
            <Sparkles size={14} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Sistem Operasional Penjualan &amp; Inventaris Gudang Cloud
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(26px, 4.5vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.16,
              maxWidth: '900px',
              margin: '0 auto 16px',
            }}
          >
            Kendalikan Kasir POS, Stok Gudang, &amp;{' '}
            <span className="hero-gradient-text">Audit Laba Bersih</span>{' '}
            Secara Real-Time.
          </h1>

          <p
            style={{
              fontSize: 'clamp(13.5px, 1.6vw, 16.5px)',
              color: 'var(--text-secondary)',
              maxWidth: '720px',
              margin: '0 auto 28px',
              lineHeight: 1.65,
            }}
          >
            <strong>SIP Barang</strong> dirancang untuk kecepatan transaksi kasir di smartphone maupun desktop.
            Dilengkapi kalkulasi HPP &amp; margin otomatis, otorisasi multi-peran (Admin &amp; Kasir), cetak struk
            langsung ke <strong>Printer Thermal Bluetooth (58mm/80mm)</strong>, serta sinkronisasi database{' '}
            <strong>Supabase Cloud PostgreSQL</strong>.
          </p>

          {/* Hero Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '38px',
            }}
          >
            <button
              onClick={() => onEnterApp('admin', 'dashboard')}
              className="btn btn-primary"
              style={{ padding: '12px 20px', fontSize: '13.5px' }}
            >
              <ShieldCheck size={17} />
              <span>Buka Demo Administrator</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onEnterApp('user', 'pos')}
              className="btn btn-secondary"
              style={{
                padding: '12px 20px',
                fontSize: '13.5px',
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.45)',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.08)',
              }}
            >
              <ShoppingCart size={17} style={{ color: 'var(--accent-cyan)' }} />
              <span>Buka Terminal Kasir POS</span>
            </button>

            <button
              onClick={() => onOpenAuth('register')}
              className="btn btn-secondary"
              style={{ padding: '12px 18px', fontSize: '13.5px' }}
            >
              <UserPlus size={15} />
              <span>Daftar / Masuk Akun</span>
            </button>
          </div>

          {/* Live System Telemetry Strip */}
          <div className="landing-telemetry-grid">
            <div className="sip-card" style={{ padding: '16px 18px', borderTop: '3px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>KATALOG PRODUK AKTIF</span>
                <Package size={15} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '21px', fontWeight: 800 }}>
                {stats.totalProducts} SKU
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Total {stats.totalStockUnits.toLocaleString('id-ID')} unit tersedia di gudang
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px', borderTop: '3px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>NILAI ASET INVENTARIS</span>
                <Database size={15} style={{ color: 'var(--accent-amber-text)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {formatRupiah(stats.totalAssetValue)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Berdasarkan harga pokok pembelian (HPP)
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px', borderTop: '3px solid var(--accent-green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>SIMULASI OMZET &amp; MARGIN</span>
                <TrendingUp size={15} style={{ color: 'var(--accent-green-text)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800 }}>
                {formatRupiah(stats.totalRevenue)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '2px', fontWeight: 700 }}>
                +{stats.profitMargin}% Rata-rata Margin Laba Bersih
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px', borderTop: '3px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>INFRASTRUKTUR DATABASE</span>
                <Globe size={15} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '15px', fontWeight: 800, marginTop: '3px' }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-cyan)',
                    boxShadow: '0 0 8px var(--accent-cyan)',
                  }}
                />
                <span>Supabase + Vercel</span>
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {isCloudConnected ? 'Cloud Sync Active (PostgreSQL)' : 'Hybrid Cloud + Local Storage'}
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE MODULE SHOWCASE WINDOW */}
        <ShowcasePreview
          activeShowcase={activeShowcase}
          onSelectShowcase={setActiveShowcase}
          selectedSimPayment={selectedSimPayment}
          onSelectSimPayment={setSelectedSimPayment}
          stats={stats}
          products={products}
          sampleProducts={sampleProducts}
          sampleLogs={sampleLogs}
          transactions={transactions}
          onEnterApp={onEnterApp}
        />

        {/* BENTO GRID: 6 CORE FEATURES */}
        <section
          id="fitur"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '16px 18px 56px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              KEUNGGULAN SISTEM
            </span>
            <h2 style={{ fontSize: 'clamp(21px, 3vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Fitur Lengkap untuk Operasional Toko Modern
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Dibangun dengan standar performa tinggi, keamanan berlapis, dan kemudahan penggunaan di PC maupun smartphone.
            </p>
          </div>

          <div className="landing-bento-grid">
            {CORE_FEATURES.map((feat) => {
              const Icon = CORE_FEATURE_ICONS[feat.id] || Zap;
              return (
                <div key={feat.id} className="sip-card sip-card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                        border: '1px solid rgba(var(--accent-cyan-rgb), 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="badge badge-muted">{feat.badge}</span>
                  </div>
                  <h3 style={{ fontSize: '15.5px', fontWeight: 700, marginTop: '2px' }}>{feat.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ROLE COMPARISON SECTION */}
        <section
          id="akses-peran"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 18px 56px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              DUAL-ROLE ACCESS CONTROL
            </span>
            <h2 style={{ fontSize: 'clamp(21px, 3vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Pilih Sesi Demo atau Daftar Akun Administrator
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pendaftaran akun baru otomatis menjadi Administrator pemilik toko dengan database terpisah. Akun Kasir POS dibuat langsung oleh Admin di dalam sistem.
            </p>
          </div>

          <div className="landing-role-grid">
            {/* Admin Role Card */}
            <div
              className="sip-card"
              style={{
                border: '1.5px solid rgba(var(--accent-cyan-rgb), 0.45)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-cyan">FULL ACCESS CONTROL</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    admin@sip.com
                  </span>
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, marginBottom: '6px' }}>Mode Administrator Toko</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Akses penuh untuk pemilik usaha, kepala toko, atau manajer gudang.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ADMIN_CAPABILITIES.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEnterApp('admin', 'dashboard')}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                <ShieldCheck size={16} />
                <span>Masuk Instan sebagai Administrator</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Cashier Role Card */}
            <div
              className="sip-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">POS TERMINAL OPERATOR</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    user@sip.com
                  </span>
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, marginBottom: '6px' }}>Mode Kasir Penjualan (POS)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Antarmuka terfokus dan aman untuk operator kasir di meja pembayaran.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {CASHIER_CAPABILITIES.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--accent-green-text)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEnterApp('user', 'pos')}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderColor: 'rgba(var(--accent-cyan-rgb), 0.45)',
                }}
              >
                <ShoppingCart size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Masuk Instan sebagai Kasir POS</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE & TECH STACK */}
        <section
          id="arsitektur"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 18px 64px',
          }}
        >
          <div className="sip-card" style={{ padding: '24px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
                MODERN CLOUD ARCHITECTURE
              </span>
              <h2 style={{ fontSize: 'clamp(20px, 2.8vw, 24px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Teknologi &amp; Infrastruktur Produksi
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Dideploy secara global di jaringan Edge Vercel dengan database terkelola Supabase PostgreSQL (Region Singapore).
              </p>
            </div>

            <div className="landing-tech-grid">
              {TECH_STACK_ITEMS.map((tech) => (
                <div
                  key={tech.title}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{tech.title}</div>
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '2px', marginBottom: '8px' }}>
                    {tech.sub}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tech.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          padding: '40px 18px 24px',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="landing-footer-grid" style={{ paddingBottom: '28px', borderBottom: '1px solid var(--border-color)' }}>
            {/* Brand Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-emblem">
                  <Package size={18} />
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>
                    SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Kasir Pintar &amp; Manajemen Stok Toko
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '390px' }}>
                Solusi kasir harian dan pencatatan stok untuk toko retail, minimarket, maupun usaha berkembang. Pantau omzet, laba bersih, serta kelola kasir dengan cepat langsung dari smartphone atau komputer.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <span className="badge badge-green" style={{ fontSize: '10.5px' }}>
                  <QrCode size={11} /> QRIS Nota Otomatis
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
                  <Bluetooth size={11} /> Struk Bluetooth
                </span>
                <span className="badge badge-muted" style={{ fontSize: '10.5px' }}>
                  <Smartphone size={11} /> Siap di HP &amp; PC
                </span>
              </div>
            </div>

            {/* Navigation Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Fitur Operasional
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <a href="#showcase" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Simulasi Kasir &amp; Dashboard
                </a>
                <a href="#fitur" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Keunggulan &amp; Pembukuan Toko
                </a>
                <a href="#akses-peran" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Kontrol Pemilik &amp; Kasir
                </a>
                <a href="#arsitektur" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Keamanan &amp; Sinkronisasi Data
                </a>
              </div>
            </div>

            {/* Payment & Hardware Highlights Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Dukungan Pembayaran &amp; Perangkat
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12.5px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <QrCode size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      QRIS Custom Sesuai Nota
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Nominal tagihan &amp; nomor nota terisi otomatis saat di-scan pelanggan
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12.5px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-green-bg)',
                      color: 'var(--accent-green-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Printer size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Printer Thermal Bluetooth 58 / 80mm
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Cetak struk &amp; QR nota langsung dari Chrome Android maupun PC
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div
            style={{
              paddingTop: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <span>&copy; 2026 SIP Barang. Solusi Kasir &amp; Operasional Toko Modern.</span>
            <span style={{ fontSize: '11.5px', fontWeight: 500 }}>
              Siap di Smartphone &amp; Desktop &bull; QRIS Dinamis &bull; Cetak Thermal Bluetooth
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
