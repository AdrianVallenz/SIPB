'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { Product, StockLog, Transaction } from '@/lib/types';
import { calcMarginPct, formatRupiah } from '@/lib/format';
import { WEEKLY_SHOWCASE_BARS } from '@/lib/landingData';

export type ShowcaseTab = 'dashboard' | 'pos' | 'inventory' | 'reports';

export interface ShowcaseStats {
  totalProducts: number;
  totalTransactions: number;
  totalRevenue: number;
  netProfit: number;
  totalStockUnits: number;
  totalAssetValue: number;
  lowStockCount: number;
  profitMargin: number;
}

interface ShowcasePreviewProps {
  activeShowcase: ShowcaseTab;
  onSelectShowcase: (tab: ShowcaseTab) => void;
  selectedSimPayment: 'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit';
  onSelectSimPayment: (method: 'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit') => void;
  stats: ShowcaseStats;
  products: Product[];
  sampleProducts: Product[];
  sampleLogs: StockLog[];
  transactions: Transaction[];
  onEnterApp: (role?: 'admin' | 'user', targetTab?: string) => void;
}

const SHOWCASE_TABS: { id: ShowcaseTab; label: string; shortLabel: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: '1. Dashboard Eksekutif', shortLabel: 'Dashboard', icon: BarChart3 },
  { id: 'pos', label: '2. Terminal Kasir POS', shortLabel: 'Kasir POS', icon: ShoppingCart },
  { id: 'inventory', label: '3. Master Gudang & Stok', shortLabel: 'Gudang', icon: Layers },
  { id: 'reports', label: '4. Laporan & Audit Void', shortLabel: 'Laporan', icon: FileSpreadsheet },
];

export default function ShowcasePreview({
  activeShowcase,
  onSelectShowcase,
  selectedSimPayment,
  onSelectSimPayment,
  stats,
  products,
  sampleProducts,
  sampleLogs,
  transactions,
  onEnterApp,
}: ShowcasePreviewProps) {
  return (
    <section
      id="showcase"
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 18px 56px',
        width: '100%',
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

      {/* Showcase Selector Tabs (Horizontal scrollable strip on smartphone) */}
      <div className="landing-showcase-tabs">
        {SHOWCASE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeShowcase === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectShowcase(tab.id)}
              className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                padding: '9px 14px',
                fontSize: '12.5px',
                flexShrink: 0,
              }}
            >
              <Icon size={15} />
              <span className="hide-mobile">{tab.label}</span>
              <span className="show-mobile-only">{tab.shortLabel}</span>
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
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
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
              type="button"
              onClick={() =>
                onEnterApp(
                  activeShowcase === 'pos' ? 'user' : 'admin',
                  activeShowcase === 'inventory' ? 'products' : activeShowcase
                )
              }
              className="btn btn-primary btn-sm"
            >
              <span>Buka Modul Ini</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Showcase Body Content */}
        <div className="landing-showcase-body">
          {activeShowcase === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 800 }}>Dashboard Eksekutif &amp; Analitik Toko</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Ringkasan performa penjualan harian, estimasi laba bersih, dan deteksi dini stok gudang menipis.
                  </p>
                </div>
                <span className="badge badge-cyan">Otorisasi: Administrator</span>
              </div>

              <div className="kpi-grid">
                <div className="sip-card" style={{ borderTop: '3px solid var(--accent-cyan)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL PENDAPATAN BERSIH</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '6px' }}>
                    {formatRupiah(stats.totalRevenue)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Dari {stats.totalTransactions} transaksi selesai
                  </div>
                </div>

                <div className="sip-card" style={{ borderTop: '3px solid var(--accent-green)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>ESTIMASI LABA BERSIH</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: '6px' }}>
                    {formatRupiah(stats.netProfit)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '4px', fontWeight: 600 }}>
                    Margin rata-rata +{stats.profitMargin}% setelah HPP
                  </div>
                </div>

                <div className="sip-card" style={{ borderTop: '3px solid var(--accent-amber)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>NILAI MODAL INVENTARIS</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px' }}>
                    {formatRupiah(stats.totalAssetValue)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {stats.totalStockUnits} unit tersebar di 5 kategori
                  </div>
                </div>

                <div className="sip-card" style={{ borderTop: '3px solid var(--accent-red)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>PERINGATAN STOK KRITIS</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: '6px' }}>
                    {stats.lowStockCount} SKU
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Di bawah batas minimum gudang (minStock)
                  </div>
                </div>
              </div>

              <div className="dashboard-split">
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
                      gap: '6px',
                      alignItems: 'end',
                      height: '150px',
                      paddingTop: '16px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    {WEEKLY_SHOWCASE_BARS.map((bar) => (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 800 }}>Terminal Kasir Point of Sale (POS) &amp; Struk Termal</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Mendukung shortcut keyboard cepat (<strong>F2</strong> Cari SKU/Barcode, <strong>F8</strong> Proses Bayar), QRIS nota dinamis, &amp; cetak struk 58mm/80mm.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-muted font-mono">Shortcut: F2 / F8</span>
                  <span className="badge badge-green">Akses: Kasir &amp; Admin</span>
                </div>
              </div>

              <div className="dashboard-split">
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
                          type="button"
                          onClick={() => onSelectSimPayment(m)}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '4px' }}>
                            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                        {formatRupiah((sampleProducts[0]?.sellPrice || 0) + (sampleProducts[1]?.sellPrice || 0))}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 800 }}>Master Inventaris Gudang &amp; Audit Mutasi Stok</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Kelola harga modal (HPP), harga jual, kalkulasi persentase margin otomatis, serta lacak setiap stok masuk (IN), keluar (OUT), dan opname (ADJUSTMENT).
                  </p>
                </div>
                <span className="badge badge-cyan">Dilindungi Row Level Security (RLS)</span>
              </div>

              <div className="sip-table-container desktop-table-wrap">
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
                      const margin = calcMarginPct(p.sellPrice, p.buyPrice);
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

              <div className="mobile-card-list">
                {sampleProducts.slice(0, 4).map((p) => {
                  const margin = calcMarginPct(p.sellPrice, p.buyPrice);
                  const isLow = p.stock <= p.minStock;
                  return (
                    <div key={p.id} className="mobile-data-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <span className="font-mono" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {p.sku} &bull; {p.category}
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{p.name}</div>
                        </div>
                        <span className={isLow ? 'badge badge-amber font-mono' : 'badge badge-green font-mono'}>
                          {p.stock} {p.unit}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span className="font-mono">HPP: {formatRupiah(p.buyPrice)}</span>
                        <span className="font-mono" style={{ fontWeight: 700 }}>{formatRupiah(p.sellPrice)}</span>
                        <span className="badge badge-green font-mono">+{margin}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="landing-telemetry-grid" style={{ maxWidth: '100%' }}>
                {sampleLogs.map((log) => (
                  <div key={log.id} className="sip-card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 800 }}>Laporan Keuangan, Audit HPP &amp; Pembatalan Nota (Void)</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Filter laporan berdasarkan rentang tanggal &amp; metode pembayaran, ekspor ke CSV (Microsoft Excel), cetak PDF A4, atau batalkan transaksi (Void) dengan pengembalian stok otomatis.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">CSV UTF-8 BOM Ready</span>
                  <span className="badge badge-cyan">Auto-Restore Stock on Void</span>
                </div>
              </div>

              <div className="sip-table-container desktop-table-wrap">
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

              <div className="mobile-card-list">
                {transactions.slice(0, 4).map((t) => (
                  <div key={t.id} className="mobile-data-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
                        {t.invoiceNo}
                      </span>
                      {t.status === 'VOIDED' ? (
                        <span className="badge badge-red">VOID</span>
                      ) : (
                        <span className="badge badge-green">LUNAS</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.cashierName} &bull; {t.paymentMethod}</span>
                      <span className="font-mono" style={{ fontWeight: 700 }}>{formatRupiah(t.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

