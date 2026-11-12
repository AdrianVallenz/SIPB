'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatRupiah } from '@/lib/format';
import {
  Package,
  ShieldCheck,
  ShoppingCart,
  BarChart3,
  FileSpreadsheet,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Layers,
  Zap,
  Printer,
  Globe,
  TrendingUp,
  AlertTriangle,
  LogIn,
  UserPlus,
  ExternalLink,
  Search,
  History,
  Menu,
  X,
} from 'lucide-react';

interface LandingViewProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onEnterApp: (role?: 'admin' | 'user', targetTab?: string) => void;
}

type ShowcaseTab = 'dashboard' | 'pos' | 'inventory' | 'reports';

export default function LandingView({ onOpenAuth, onEnterApp }: LandingViewProps) {
  const { user, theme, toggleTheme, products, transactions, stockLogs, isCloudConnected } = useApp();
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('dashboard');
  const [selectedSimPayment, setSelectedSimPayment] = useState<'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit'>('QRIS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute live showcase stats from real state
  const stats = useMemo(() => {
    const activeTrx = transactions.filter((t) => t.status !== 'VOIDED');
    const totalRevenue = activeTrx.reduce((acc, t) => acc + t.total, 0);
    let totalCogs = 0;
    for (const t of activeTrx) {
      for (const item of t.items) {
        const fallbackBuy = products.find((p) => p.id === item.productId)?.buyPrice ?? Math.round(item.price * 0.75);
        totalCogs += (item.buyPrice ?? fallbackBuy) * item.quantity;
      }
    }
    const netProfit = totalRevenue - totalCogs;
    const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
    const totalAssetValue = products.reduce((acc, p) => acc + p.buyPrice * p.stock, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

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
          backgroundColor: theme === 'dark' ? 'rgba(15, 17, 21, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="landing-nav-inner">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                border: '1.5px solid var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                boxShadow: 'var(--shadow-glow)',
                flexShrink: 0,
              }}
            >
              <Package size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '15.5px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
                </span>
                <span className="badge badge-cyan font-mono hide-mobile" style={{ fontSize: '9.5px' }}>
                  v2.4 CLOUD
                </span>
              </div>
              <p className="hide-mobile" style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                Point of Sale &amp; Inventory Management
              </p>
            </div>
          </div>

          {/* Center Anchor Links (Desktop) */}
          <nav
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '22px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <a href="#showcase" style={{ color: 'inherit', textDecoration: 'none' }}>
              Showcase Interaktif
            </a>
            <a href="#fitur" style={{ color: 'inherit', textDecoration: 'none' }}>
              Fitur Unggulan
            </a>
            <a href="#akses-peran" style={{ color: 'inherit', textDecoration: 'none' }}>
              Mode Akses
            </a>
            <a href="#arsitektur" style={{ color: 'inherit', textDecoration: 'none' }}>
              Arsitektur Cloud
            </a>
          </nav>

          {/* Right CTA Controls: Theme + Masuk + Daftar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {user ? (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="btn btn-secondary btn-sm hide-mobile"
                  style={{ padding: '8px 12px' }}
                >
                  <UserPlus size={14} />
                  <span>Ganti / Daftar Akun</span>
                </button>
                <button
                  onClick={() => onEnterApp()}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 14px' }}
                >
                  <span>Dashboard ({user.role === 'admin' ? 'Admin' : 'Kasir'})</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="btn btn-secondary btn-sm btn-nav-compact"
                  style={{ padding: '8px 13px' }}
                >
                  <LogIn size={14} className="hide-xs" />
                  <span>Masuk</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="btn btn-primary btn-sm btn-nav-compact"
                  style={{ padding: '8px 14px' }}
                >
                  <UserPlus size={14} className="hide-xs" />
                  <span>Daftar</span>
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="btn btn-secondary btn-icon show-mobile-only"
              aria-label="Menu Navigasi"
              style={{ width: '36px', height: '36px' }}
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
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
            <span style={{ color: 'var(--accent-cyan)' }}>Audit Laba Bersih</span> Secara Real-Time.
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
            <strong>SIP Barang</strong> dirancang untuk kecepatan transaksi kasir ritel dan akurasi manajemen gudang.
            Dilengkapi kalkulasi HPP &amp; margin otomatis, otorisasi multi-peran (Admin &amp; Kasir), cetak struk termal,
            serta sinkronisasi database <strong>Supabase Cloud PostgreSQL</strong>.
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
        <section
          id="showcase"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '24px 18px 56px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              INTERACTIVE PRODUCT TOUR
            </span>
            <h2 style={{ fontSize: 'clamp(21px, 3vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Eksplorasi Modul Sistem Secara Langsung
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pilih tab di bawah untuk melihat pratinjau antarmuka dan fitur dari setiap modul utama SIP Barang.
            </p>
          </div>

          {/* Showcase Selector Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            {[
              { id: 'dashboard', label: '1. Dashboard Eksekutif', icon: BarChart3 },
              { id: 'pos', label: '2. Terminal Kasir POS', icon: ShoppingCart },
              { id: 'inventory', label: '3. Master Gudang & Stok', icon: Layers },
              { id: 'reports', label: '4. Laporan & Audit Void', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeShowcase === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcase(tab.id as ShowcaseTab)}
                  className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    padding: '9px 15px',
                    fontSize: '12.5px',
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mock Browser Application Frame */}
          <div
            className="sip-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Browser Top Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-color)',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span
                  className="font-mono hide-mobile"
                  style={{
                    marginLeft: '8px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  https://{activeShowcase === 'pos' ? 'pos.sipb.web.id' : 'sipb.web.id'}/{activeShowcase}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green hide-mobile">
                  <CheckCircle2 size={11} /> Live Preview Data
                </span>
                <button
                  onClick={() =>
                    onEnterApp(
                      activeShowcase === 'pos' ? 'user' : 'admin',
                      activeShowcase === 'inventory' ? 'products' : activeShowcase
                    )
                  }
                  className="btn btn-primary btn-sm"
                >
                  <span>Buka Modul Ini Sekarang</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Showcase Body Content */}
            <div style={{ padding: '20px 16px', backgroundColor: 'var(--bg-primary)' }}>
              {activeShowcase === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Dashboard Eksekutif &amp; Analitik Toko</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Ringkasan performa penjualan harian, estimasi laba bersih, dan deteksi dini stok gudang menipis.
                      </p>
                    </div>
                    <span className="badge badge-cyan">Otorisasi: Administrator</span>
                  </div>

                  <div className="kpi-grid">
                    <div className="sip-card" style={{ borderTop: '3px solid var(--accent-cyan)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL PENDAPATAN BERSIH</div>
                      <div className="font-mono" style={{ fontSize: '21px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '6px' }}>
                        {formatRupiah(stats.totalRevenue)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Dari {stats.totalTransactions} transaksi selesai
                      </div>
                    </div>

                    <div className="sip-card" style={{ borderTop: '3px solid var(--accent-green)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>ESTIMASI LABA BERSIH</div>
                      <div className="font-mono" style={{ fontSize: '21px', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: '6px' }}>
                        {formatRupiah(stats.netProfit)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '4px', fontWeight: 600 }}>
                        Margin rata-rata +{stats.profitMargin}% setelah HPP
                      </div>
                    </div>

                    <div className="sip-card" style={{ borderTop: '3px solid var(--accent-amber)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>NILAI MODAL INVENTARIS</div>
                      <div className="font-mono" style={{ fontSize: '21px', fontWeight: 800, marginTop: '6px' }}>
                        {formatRupiah(stats.totalAssetValue)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {stats.totalStockUnits} unit tersebar di 5 kategori
                      </div>
                    </div>

                    <div className="sip-card" style={{ borderTop: '3px solid var(--accent-red)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>PERINGATAN STOK KRITIS</div>
                      <div className="font-mono" style={{ fontSize: '21px', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: '6px' }}>
                        {stats.lowStockCount} SKU
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Di bawah batas minimum gudang (minStock)
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-split">
                    {/* Simulated 7-Day Trend Bar Chart */}
                    <div className="sip-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>Tren Omzet &amp; Laba 7 Hari Terakhir</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Visualisasi grafik perbandingan pendapatan vs laba bersih</div>
                        </div>
                        <span className="badge badge-muted font-mono">Real-Time Chart</span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: '8px',
                          alignItems: 'end',
                          height: '150px',
                          paddingTop: '16px',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        {[
                          { day: 'Sen', rev: 55, prof: 35 },
                          { day: 'Sel', rev: 72, prof: 48 },
                          { day: 'Rab', rev: 64, prof: 40 },
                          { day: 'Kam', rev: 88, prof: 58 },
                          { day: 'Jum', rev: 78, prof: 52 },
                          { day: 'Sab', rev: 96, prof: 68 },
                          { day: 'Min', rev: 85, prof: 60 },
                        ].map((bar) => (
                          <div key={bar.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center', height: '120px' }}>
                              <div
                                title="Omzet"
                                style={{
                                  width: '10px',
                                  height: `${bar.rev}%`,
                                  backgroundColor: 'var(--accent-cyan)',
                                  borderRadius: '4px 4px 0 0',
                                }}
                              />
                              <div
                                title="Laba Bersih"
                                style={{
                                  width: '10px',
                                  height: `${bar.prof}%`,
                                  backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.38)',
                                  borderRadius: '4px 4px 0 0',
                                }}
                              />
                            </div>
                            <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: '6px' }}>
                              {bar.day}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Low Stock Watchlist */}
                    <div className="sip-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>Deteksi Stok Menipis</span>
                        <AlertTriangle size={15} style={{ color: 'var(--accent-amber-text)' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {products
                          .filter((p) => p.stock <= p.minStock)
                          .slice(0, 4)
                          .map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '9px 12px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-subtle)',
                                border: '1px solid var(--border-color)',
                                gap: '8px',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </div>
                                <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {item.sku} &bull; Min: {item.minStock} {item.unit}
                                </div>
                              </div>
                              <span className="badge badge-amber font-mono">
                                Sisa {item.stock} {item.unit}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeShowcase === 'pos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Terminal Kasir Point of Sale (POS) &amp; Struk Termal</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Mendukung shortcut keyboard cepat (<strong>F2</strong> Cari SKU/Barcode, <strong>F8</strong> Proses Bayar), multi-metode pembayaran, &amp; cetak struk 58mm/80mm.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-muted font-mono">Shortcut: F2 / F8</span>
                      <span className="badge badge-green">Akses: Kasir &amp; Admin</span>
                    </div>
                  </div>

                  <div className="dashboard-split">
                    {/* Mini POS Product Grid */}
                    <div className="sip-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                          <Search size={15} style={{ color: 'var(--accent-cyan)' }} />
                          <span>Katalog Kasir Responsif</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(['Tunai', 'QRIS', 'Transfer Bank', 'Kartu Debit'] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setSelectedSimPayment(m)}
                              className={selectedSimPayment === m ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pos-grid">
                        {sampleProducts.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                  {p.sku}
                                </span>
                                <span className="badge badge-muted font-mono" style={{ fontSize: '10px' }}>
                                  Stok: {p.stock}
                                </span>
                              </div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, lineHeight: 1.35 }}>{p.name}</div>
                            </div>
                            <div className="font-mono" style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                              {formatRupiah(p.sellPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Thermal Receipt Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="receipt-paper">
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px' }}>SIP BARANG POS</div>
                          <div style={{ fontSize: '10px', color: '#555' }}>Jl. Operasional Niaga No. 88</div>
                          <div style={{ fontSize: '10px', color: '#555' }}>https://sipb.web.id</div>
                        </div>
                        <div className="receipt-divider" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <span>No: TRX-20261112-8821</span>
                          <span>Kasir: Kasir POS</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <span>Metode: {selectedSimPayment}</span>
                          <span>Status: LUNAS</span>
                        </div>
                        <div className="receipt-divider" />
                        {sampleProducts.slice(0, 2).map((item) => (
                          <div key={item.id} style={{ marginBottom: '6px' }}>
                            <div style={{ fontWeight: 700 }}>{item.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>1 x {formatRupiah(item.sellPrice)}</span>
                              <span>{formatRupiah(item.sellPrice)}</span>
                            </div>
                          </div>
                        ))}
                        <div className="receipt-divider" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px' }}>
                          <span>GRAND TOTAL</span>
                          <span>
                            {formatRupiah(
                              (sampleProducts[0]?.sellPrice || 0) + (sampleProducts[1]?.sellPrice || 0)
                            )}
                          </span>
                        </div>
                        <div className="receipt-divider" />
                        <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#555', marginTop: '6px' }}>
                          Terima kasih atas kunjungan Anda!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeShowcase === 'inventory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Master Inventaris Gudang &amp; Audit Mutasi Stok</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Kelola harga modal (HPP), harga jual, kalkulasi persentase margin otomatis, serta lacak setiap stok masuk (IN), keluar (OUT), dan opname (ADJUSTMENT).
                      </p>
                    </div>
                    <span className="badge badge-cyan">Dilindungi Row Level Security (RLS)</span>
                  </div>

                  <div className="sip-table-container">
                    <table className="sip-table">
                      <thead>
                        <tr>
                          <th>Kode SKU</th>
                          <th>Nama Barang</th>
                          <th>Kategori</th>
                          <th>Harga Beli (HPP)</th>
                          <th>Harga Jual</th>
                          <th>Margin</th>
                          <th>Status Stok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleProducts.slice(0, 5).map((p) => {
                          const margin = p.sellPrice > 0 ? Math.round(((p.sellPrice - p.buyPrice) / p.sellPrice) * 100) : 0;
                          const isLow = p.stock <= p.minStock;
                          return (
                            <tr key={p.id}>
                              <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{p.sku}</td>
                              <td style={{ fontWeight: 600 }}>{p.name}</td>
                              <td><span className="badge badge-muted">{p.category}</span></td>
                              <td className="font-mono">{formatRupiah(p.buyPrice)}</td>
                              <td className="font-mono" style={{ fontWeight: 700 }}>{formatRupiah(p.sellPrice)}</td>
                              <td><span className="badge badge-green font-mono">+{margin}%</span></td>
                              <td>
                                <span className={isLow ? 'badge badge-amber font-mono' : 'badge badge-cyan font-mono'}>
                                  {p.stock} {p.unit} {isLow ? '(Menipis)' : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Recent Stock Logs Strip */}
                  <div className="landing-telemetry-grid" style={{ maxWidth: '100%' }}>
                    {sampleLogs.map((log) => (
                      <div key={log.id} className="sip-card" style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span className={log.type === 'IN' ? 'badge badge-green' : log.type === 'OUT' ? 'badge badge-amber' : 'badge badge-cyan'}>
                            Mutasi {log.type} ({log.type === 'IN' ? '+' : '-'}{log.quantity})
                          </span>
                          <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {log.previousStock} &rarr; {log.newStock}
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{log.productName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{log.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeShowcase === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Laporan Keuangan, Audit HPP &amp; Pembatalan Nota (Void)</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Filter laporan berdasarkan rentang tanggal &amp; metode pembayaran, ekspor ke CSV (Microsoft Excel), cetak PDF A4, atau batalkan transaksi (Void) dengan pengembalian stok otomatis.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-green">CSV UTF-8 BOM Ready</span>
                      <span className="badge badge-cyan">Auto-Restore Stock on Void</span>
                    </div>
                  </div>

                  <div className="sip-table-container">
                    <table className="sip-table">
                      <thead>
                        <tr>
                          <th>No. Invoice</th>
                          <th>Kasir</th>
                          <th>Metode Bayar</th>
                          <th>Total Tagihan</th>
                          <th>Status Nota</th>
                          <th>Fitur Audit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 4).map((t) => (
                          <tr key={t.id}>
                            <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{t.invoiceNo}</td>
                            <td>{t.cashierName}</td>
                            <td><span className="badge badge-muted">{t.paymentMethod}</span></td>
                            <td className="font-mono" style={{ fontWeight: 700 }}>{formatRupiah(t.total)}</td>
                            <td>
                              {t.status === 'VOIDED' ? (
                                <span className="badge badge-red">DIBATALKAN (VOID)</span>
                              ) : (
                                <span className="badge badge-green">SELESAI (LUNAS)</span>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Cetak Ulang Struk &bull; Detail Item &bull; Void Otorisasi Admin
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

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
            {[
              {
                icon: Zap,
                badge: 'POS Kecepatan Tinggi',
                title: 'Kasir Responsif & Shortcut Keyboard',
                desc: 'Transaksi lebih cepat dengan pencarian instan SKU/nama barang (F2), tombol uang pas & pecahan cepat, kalkulasi kembalian otomatis (F8), dan indikator suara transaksi.',
              },
              {
                icon: TrendingUp,
                badge: 'Akuntansi Presisi',
                title: 'Perhitungan HPP & Laba Bersih Otomatis',
                desc: 'Setiap item transaksi mengunci harga beli (buyPrice) saat penjualan terjadi, sehingga laporan laba bersih tetap akurat meskipun harga modal barang berubah di kemudian hari.',
              },
              {
                icon: History,
                badge: 'Audit Gudang',
                title: 'Kartu Stok & Deteksi Stok Kritis',
                desc: 'Pantau pergerakan stok masuk (IN), keluar (OUT), dan opname (ADJUSTMENT) lengkap dengan pencatatan waktu, alasan mutasi, serta operator yang bertugas.',
              },
              {
                icon: ShieldCheck,
                badge: 'Keamanan RBAC',
                title: 'Otorisasi Multi-Peran & Registrasi Akun',
                desc: 'Pemisahan hak akses ketat antara Administrator dan Kasir POS (pembatasan diskon kasir maks 25%, proteksi fitur Void nota, serta fitur Daftar/Masuk operator baru).',
              },
              {
                icon: Database,
                badge: 'Cloud PostgreSQL',
                title: 'Sinkronisasi Real-Time Supabase Cloud',
                desc: 'Menggabungkan kecepatan state lokal dengan persistensi database Supabase Cloud PostgreSQL berfitur Row Level Security (RLS) dan cadangan/pemulihan JSON.',
              },
              {
                icon: Printer,
                badge: 'Pelaporan & Cetak',
                title: 'Cetak Struk Termal & Ekspor CSV Excel',
                desc: 'Format cetak CSS khusus untuk printer struk termal kasir (58mm/80mm) dan laporan manajerial A4, ditambah unduhan laporan keuangan berformat CSV (UTF-8 BOM).',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="sip-card sip-card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
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
                  {[
                    'Dashboard Eksekutif, Grafik Tren 7 Hari & Analisis Margin Laba',
                    'CRUD Master Produk, Harga Modal (HPP), & Penyesuaian Stok (Opname)',
                    'Laporan Keuangan Lengkap, Filter Periode, & Ekspor CSV Excel',
                    'Otorisasi Pembatalan Nota (Void Transaksi) & Pengembalian Stok',
                    'Pembuatan Akun Kasir POS & Isolasi Database Per Akun Supabase',
                  ].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
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
                  {[
                    'Terminal Kasir Point of Sale (POS) Cepat dengan Shortcut F2 & F8',
                    'Dukungan Pembayaran Tunai, QRIS, Transfer Bank, & Kartu Debit',
                    'Batas Aman Diskon Kasir Maksimal 25% (Proteksi Anti-Fraud)',
                    'Cetak Struk Termal Kasir (58mm/80mm) Langsung Setelah Bayar',
                    'Riwayat Transaksi Shift Kasir & Rekapitulasi Setoran Tunai/Non-Tunai',
                  ].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--accent-green-text)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
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
          <div className="sip-card" style={{ padding: '28px 22px' }}>
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
              {[
                {
                  title: 'Next.js 16.4 & React 19',
                  sub: 'App Router + TypeScript 5',
                  detail: 'Arsitektur komponen modern dengan code-splitting dinamis & performa tinggi.',
                },
                {
                  title: 'Supabase PostgreSQL',
                  sub: 'Singapore (ap-southeast-1)',
                  detail: 'Database relasional Cloud dengan kebijakan keamanan Row Level Security (RLS).',
                },
                {
                  title: 'Vercel Edge Network',
                  sub: 'SSL Auto-Renew & Custom Domain',
                  detail: 'Terhubung langsung ke domain utama sipb.web.id dan terminal pos.sipb.web.id.',
                },
                {
                  title: 'Enterprise Security Headers',
                  sub: 'CSP, HSTS, X-Frame-Options',
                  detail: 'Perlindungan terhadap injeksi skrip (XSS), clickjacking, dan brute-force login.',
                },
              ].map((tech) => (
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
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                    border: '1px solid rgba(var(--accent-cyan-rgb), 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Package size={18} />
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>
                    SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sistem Operasional Penjualan &amp; Inventaris
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '380px' }}>
                Platform operasional retail modern dengan terminal kasir POS tercepat, pemantauan margin HPP real-time, serta isolasi database per toko berbasis Supabase PostgreSQL &amp; Row Level Security.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-green font-mono" style={{ fontSize: '10.5px' }}>
                  <CheckCircle2 size={11} /> Sistem Operasional Aktif
                </span>
                <span className="badge badge-cyan font-mono" style={{ fontSize: '10.5px' }}>
                  Multi-Tenant RLS
                </span>
              </div>
            </div>

            {/* Navigation Column (No Login/Daftar buttons) */}
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
                Eksplorasi Fitur
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <a href="#showcase" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Showcase Modul Interaktif
                </a>
                <a href="#fitur" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Keunggulan Operasional
                </a>
                <a href="#akses-peran" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Kontrol Akses Admin &amp; Kasir
                </a>
                <a href="#arsitektur" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Arsitektur &amp; Infrastruktur Cloud
                </a>
              </div>
            </div>

            {/* Endpoints & Infrastructure Column */}
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
                Portal &amp; Infrastruktur
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href="https://sipb.web.id"
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      sipb.web.id
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Portal Showcase &amp; Dashboard Admin
                    </div>
                  </div>
                  <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                </a>

                <a
                  href="https://pos.sipb.web.id"
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-green-text)' }}>
                      pos.sipb.web.id
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Terminal Khusus Kasir POS
                    </div>
                  </div>
                  <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                </a>
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
            <span>&copy; 2026 SIP Barang. Seluruh hak cipta dilindungi.</span>
            <span className="font-mono" style={{ fontSize: '11px' }}>
              Next.js 16 &bull; Supabase PostgreSQL (ap-southeast-1) &bull; Vercel Edge
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
