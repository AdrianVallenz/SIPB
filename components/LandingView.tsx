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
  Lock,
  Printer,
  Globe,
  TrendingUp,
  AlertTriangle,
  LogIn,
  Play,
  ExternalLink,
  Search,
  History,
} from 'lucide-react';

interface LandingViewProps {
  onOpenLogin: () => void;
  onEnterApp: (role?: 'admin' | 'user', targetTab?: string) => void;
}

type ShowcaseTab = 'dashboard' | 'pos' | 'inventory' | 'reports';

export default function LandingView({ onOpenLogin, onEnterApp }: LandingViewProps) {
  const { user, theme, toggleTheme, products, transactions, stockLogs, isCloudConnected } = useApp();
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('dashboard');
  const [selectedSimPayment, setSelectedSimPayment] = useState<'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit'>('QRIS');

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
          backgroundColor: theme === 'dark' ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                border: '1.5px solid var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
                </span>
                <span className="badge badge-cyan font-mono" style={{ fontSize: '10px' }}>
                  v2.4 CLOUD
                </span>
              </div>
              <p className="hide-mobile" style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                Point of Sale &amp; Inventory Management System
              </p>
            </div>
          </div>

          {/* Center Anchor Links */}
          <nav
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              fontSize: '13px',
              fontWeight: 500,
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
              Arsitektur &amp; Cloud
            </a>
          </nav>

          {/* Right CTA Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <button
                onClick={() => onEnterApp()}
                className="btn btn-primary"
                style={{ padding: '8px 16px' }}
              >
                <span>Buka Dashboard ({user.role === 'admin' ? 'Admin' : 'Kasir'})</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenLogin}
                  className="btn btn-secondary hide-mobile"
                  style={{ padding: '8px 14px' }}
                >
                  <LogIn size={14} />
                  <span>Masuk</span>
                </button>
                <button
                  onClick={() => onEnterApp('admin', 'dashboard')}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  <Play size={14} />
                  <span>Coba Live Demo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {/* HERO SECTION */}
        <section
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '56px 24px 40px',
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
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.1)',
              border: '1px solid rgba(var(--accent-cyan-rgb), 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '22px',
            }}
          >
            <Sparkles size={14} />
            <span>Sistem Operasional Penjualan &amp; Inventaris Gudang Berbasis Cloud</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              maxWidth: '900px',
              margin: '0 auto 18px',
            }}
          >
            Kendalikan Kasir POS, Stok Gudang, &amp;{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>Audit Laba Bersih</span> Secara Real-Time.
          </h1>

          <p
            style={{
              fontSize: 'clamp(14px, 1.6vw, 17px)',
              color: 'var(--text-secondary)',
              maxWidth: '720px',
              margin: '0 auto 32px',
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
              gap: '12px',
              marginBottom: '42px',
            }}
          >
            <button
              onClick={() => onEnterApp('admin', 'dashboard')}
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: '14px' }}
            >
              <ShieldCheck size={17} />
              <span>Buka Demo Administrator</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onEnterApp('user', 'pos')}
              className="btn btn-secondary"
              style={{
                padding: '12px 22px',
                fontSize: '14px',
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.4)',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.06)',
              }}
            >
              <ShoppingCart size={17} style={{ color: 'var(--accent-cyan)' }} />
              <span>Buka Terminal Kasir POS</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="btn btn-secondary"
              style={{ padding: '12px 18px', fontSize: '14px' }}
            >
              <Lock size={15} />
              <span>Halaman Login Manual</span>
            </button>
          </div>

          {/* Live System Telemetry Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              maxWidth: '1040px',
              margin: '0 auto',
              textAlign: 'left',
            }}
          >
            <div className="sip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>KATALOG PRODUK AKTIF</span>
                <Package size={15} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
                {stats.totalProducts} SKU
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Total {stats.totalStockUnits.toLocaleString('id-ID')} unit tersedia di gudang
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>NILAI ASET INVENTARIS</span>
                <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {formatRupiah(stats.totalAssetValue)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Berdasarkan harga pokok pembelian (HPP)
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>SIMULASI OMZET &amp; MARGIN</span>
                <TrendingUp size={15} style={{ color: 'var(--accent-green-text)' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                {formatRupiah(stats.totalRevenue)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '2px', fontWeight: 600 }}>
                +{stats.profitMargin}% Rata-rata Margin Laba Bersih
              </div>
            </div>

            <div className="sip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>INFRASTRUKTUR DATABASE</span>
                <Globe size={15} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '15px', fontWeight: 700, marginTop: '3px' }}>
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
            padding: '28px 24px 64px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              INTERACTIVE PRODUCT TOUR
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
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
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            {[
              { id: 'dashboard', label: '1. Dashboard Eksekutif', icon: BarChart3, targetTab: 'dashboard', role: 'admin' },
              { id: 'pos', label: '2. Terminal Kasir POS & Struk', icon: ShoppingCart, targetTab: 'pos', role: 'user' },
              { id: 'inventory', label: '3. Master Gudang & Kartu Stok', icon: Layers, targetTab: 'products', role: 'admin' },
              { id: 'reports', label: '4. Laporan Laba & Audit Void', icon: FileSpreadsheet, targetTab: 'reports', role: 'admin' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeShowcase === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcase(tab.id as ShowcaseTab)}
                  className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
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
                padding: '12px 18px',
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-color)',
                gap: '12px',
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
                    marginLeft: '10px',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-green">
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
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-primary)' }}>
              {activeShowcase === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Dashboard Eksekutif &amp; Analitik Toko</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Ringkasan performa penjualan harian, estimasi laba bersih, dan deteksi dini stok gudang menipis.
                      </p>
                    </div>
                    <span className="badge badge-cyan">Otorisasi: Administrator</span>
                  </div>

                  <div className="kpi-grid">
                    <div className="sip-card">
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL PENDAPATAN BERSIH</div>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '6px' }}>
                        {formatRupiah(stats.totalRevenue)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Dari {stats.totalTransactions} transaksi selesai
                      </div>
                    </div>

                    <div className="sip-card">
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTIMASI LABA BERSIH</div>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: '6px' }}>
                        {formatRupiah(stats.netProfit)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '4px' }}>
                        Margin rata-rata +{stats.profitMargin}% setelah HPP
                      </div>
                    </div>

                    <div className="sip-card">
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>NILAI MODAL INVENTARIS</div>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}>
                        {formatRupiah(stats.totalAssetValue)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {stats.totalStockUnits} unit tersebar di 5 kategori
                      </div>
                    </div>

                    <div className="sip-card">
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>PERINGATAN STOK KRITIS</div>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: '6px' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
                          gap: '12px',
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
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', justifyContent: 'center', height: '120px' }}>
                              <div
                                title="Omzet"
                                style={{
                                  width: '12px',
                                  height: `${bar.rev}%`,
                                  backgroundColor: 'var(--accent-cyan)',
                                  borderRadius: '4px 4px 0 0',
                                }}
                              />
                              <div
                                title="Laba Bersih"
                                style={{
                                  width: '12px',
                                  height: `${bar.prof}%`,
                                  backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
                                  borderRadius: '4px 4px 0 0',
                                }}
                              />
                            </div>
                            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingBottom: '6px' }}>
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
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{item.name}</div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Terminal Kasir Point of Sale (POS) &amp; Struk Termal</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Mendukung shortcut keyboard cepat (<strong>F2</strong> Cari SKU/Barcode, <strong>F8</strong> Proses Bayar), multi-metode pembayaran, &amp; cetak struk 58mm/80mm.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="badge badge-muted font-mono">Shortcut: F2 / F8</span>
                      <span className="badge badge-green">Akses: Kasir &amp; Admin</span>
                    </div>
                  </div>

                  <div className="dashboard-split">
                    {/* Mini POS Product Grid */}
                    <div className="sip-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                          <Search size={15} style={{ color: 'var(--accent-cyan)' }} />
                          <span>Katalog Kasir Responsif (Klik produk untuk tambah ke keranjang)</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
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

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                          gap: '10px',
                        }}
                      >
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
                              <div style={{ fontSize: '12.5px', fontWeight: 600, lineHeight: 1.35 }}>{p.name}</div>
                            </div>
                            <div className="font-mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {formatRupiah(p.sellPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Thermal Receipt Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="receipt-paper" style={{ width: '100%', maxWidth: '310px' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Master Inventaris Gudang &amp; Audit Mutasi Stok</h3>
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
                              <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{p.sku}</td>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
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
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{log.productName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{log.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeShowcase === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Laporan Keuangan, Audit HPP &amp; Pembatalan Nota (Void)</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Filter laporan berdasarkan rentang tanggal &amp; metode pembayaran, ekspor ke CSV (Microsoft Excel), cetak PDF A4, atau batalkan transaksi (Void) dengan pengembalian stok otomatis.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
            padding: '20px 24px 64px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              KEUNGGULAN SISTEM
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Fitur Lengkap untuk Operasional Toko Modern
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Dibangun dengan standar performa tinggi, keamanan berlapis, dan kemudahan penggunaan bagi kasir maupun pemilik usaha.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px',
            }}
          >
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
                title: 'Otorisasi Multi-Peran & Proteksi Login',
                desc: 'Pemisahan hak akses ketat antara Administrator dan Kasir POS (pembatasan diskon kasir maks 25%, proteksi fitur Void nota, serta penguncian otomatis 5x gagal login).',
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
                        backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.12)',
                        border: '1px solid rgba(var(--accent-cyan-rgb), 0.3)',
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
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>{feat.title}</h3>
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
            padding: '12px 24px 64px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
              DUAL-ROLE ACCESS CONTROL
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Pilih Sesi Demo Sesuai Peran Operasional
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Klik salah satu tombol di bawah untuk langsung masuk dan mencoba seluruh fitur tanpa perlu mengetik kata sandi.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
              maxWidth: '980px',
              margin: '0 auto',
            }}
          >
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
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    admin@sip.com
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Mode Administrator Toko</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Akses penuh untuk pemilik usaha, kepala toko, atau manajer gudang.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'Dashboard Eksekutif, Grafik Tren 7 Hari & Analisis Margin Laba',
                    'CRUD Master Produk, Harga Modal (HPP), & Penyesuaian Stok (Opname)',
                    'Laporan Keuangan Lengkap, Filter Periode, & Ekspor CSV Excel',
                    'Otorisasi Pembatalan Nota (Void Transaksi) & Pengembalian Stok',
                    'Manajemen Backup/Restore Database JSON & Status Cloud Supabase',
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
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    user@sip.com
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Mode Kasir Penjualan (POS)</h3>
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
                  borderColor: 'rgba(var(--accent-cyan-rgb), 0.4)',
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
            padding: '12px 24px 72px',
          }}
        >
          <div className="sip-card" style={{ padding: '32px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>
                MODERN CLOUD ARCHITECTURE
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Teknologi &amp; Infrastruktur Produksi
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Dideploy secara global di jaringan Edge Vercel dengan database terkelola Supabase PostgreSQL (Region Singapore).
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
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
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px', marginBottom: '8px' }}>
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
          padding: '28px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              SIP <span style={{ color: 'var(--accent-cyan)' }}>BARANG</span>
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              &bull; Sistem Operasional Penjualan &amp; Inventaris Barang
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <a
              href="https://sipb.web.id"
              style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>sipb.web.id</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="https://pos.sipb.web.id"
              style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>pos.sipb.web.id</span>
              <ExternalLink size={12} />
            </a>
            <button onClick={onOpenLogin} className="btn btn-secondary btn-sm">
              Masuk Sistem
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

