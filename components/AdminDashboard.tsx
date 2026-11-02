'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { formatRupiah, getLocalDateKey, formatDateTime } from '@/lib/format';
import ReceiptModal from './ReceiptModal';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ShoppingCart,
  Boxes,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export default function AdminDashboard() {
  const { products, transactions, setActiveTab } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const todayKey = getLocalDateKey();
  const todayTransactions = transactions.filter((t) => getLocalDateKey(t.createdAt) === todayKey);

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

  // Gross Profit calculation across all transactions
  const totalGrossProfit = transactions.reduce((sum, t) => {
    const trxCost = t.items.reduce((itemCost, item) => {
      const unitCost =
        item.buyPrice ?? products.find((p) => p.id === item.productId)?.buyPrice ?? Math.round(item.price * 0.78);
      return itemCost + unitCost * item.quantity;
    }, 0);
    return sum + (t.total - trxCost);
  }, 0);

  // Stock Asset Valuation
  const totalStockAssetValuation = products.reduce((sum, p) => sum + p.buyPrice * p.stock, 0);
  const totalPotentialSalesValuation = products.reduce((sum, p) => sum + p.sellPrice * p.stock, 0);

  // Low stock alerts
  const criticalProducts = products.filter((p) => p.stock <= p.minStock);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  // Last 7 days chart data (local timezone)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: getLocalDateKey(d),
      dayLabel: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
    };
  });

  const chartData = last7Days.map(({ key, dayLabel }) => {
    const dayTrx = transactions.filter((t) => getLocalDateKey(t.createdAt) === key);
    const dayTotal = dayTrx.reduce((sum, t) => sum + t.total, 0);
    return { dateKey: key, dayLabel, total: dayTotal, count: dayTrx.length };
  });

  const sevenDayRevenue = chartData.reduce((sum, d) => sum + d.total, 0);
  const maxChartVal = Math.max(...chartData.map((d) => d.total), 500000);

  const svgWidth = 650;
  const svgHeight = 220;
  const paddingX = 46;
  const paddingY = 28;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (d.total / maxChartVal) * (svgHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
      : '';

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Ringkasan Operasional &amp; Finansial</h2>
          <p className="page-subtitle">
            Ikhtisar performa penjualan harian, valuasi aset gudang, dan pemantauan stok kritis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('products')} className="btn btn-secondary btn-sm">
            <Boxes size={15} />
            <span>Kelola Inventaris</span>
          </button>
          <button onClick={() => setActiveTab('pos')} className="btn btn-primary btn-sm">
            <ShoppingCart size={15} />
            <span>Buka Terminal Kasir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="sip-card sip-card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Omzet Hari Ini
            </span>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '23px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
            {formatRupiah(todayRevenue)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {todayTransactions.length} transaksi tercatat hari ini
          </div>
        </div>

        {/* KPI 2: Total Omzet & Laba Kotor */}
        <div className="sip-card sip-card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Omzet &amp; Laba
            </span>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-green-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-green-text)',
              }}
            >
              <DollarSign size={16} />
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '23px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {formatRupiah(totalRevenue)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', fontWeight: 500 }}>
            Estimasi laba kotor: {formatRupiah(totalGrossProfit)}
          </div>
        </div>

        {/* KPI 3: Valuasi Aset Stok */}
        <div className="sip-card sip-card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Valuasi Modal Stok
            </span>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 139, 253, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Package size={16} />
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '23px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {formatRupiah(totalStockAssetValuation)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Nilai jual stok: {formatRupiah(totalPotentialSalesValuation)}
          </div>
        </div>

        {/* KPI 4: Status Stok Kritis */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderColor: criticalProducts.length > 0 ? 'rgba(248, 81, 73, 0.4)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Peringatan Stok Gudang
            </span>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: criticalProducts.length > 0 ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green-text)',
              }}
            >
              <AlertTriangle size={16} />
            </span>
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: '23px',
              fontWeight: 700,
              color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green-text)',
              marginBottom: '4px',
            }}
          >
            {criticalProducts.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>SKU Kritis</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {outOfStockProducts.length > 0
              ? `${outOfStockProducts.length} barang habis total (stok 0)`
              : 'Tidak ada barang yang habis total'}
          </div>
        </div>
      </div>

      {/* Main Split: 7-Day Revenue Chart & Critical Stock Panel */}
      <div className="dashboard-split">
        {/* Revenue Chart */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Tren Pendapatan 7 Hari Terakhir</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Grafik pergerakan nilai transaksi penjualan harian
              </p>
            </div>
            <span className="badge badge-cyan font-mono">
              7 Hari: {formatRupiah(sevenDayRevenue)}
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: '460px' }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
                const valK = Math.round((maxChartVal * ratio) / 1000);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="var(--border-color)"
                      strokeDasharray={ratio === 0 ? undefined : '4 4'}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      fill="var(--text-muted)"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                      textAnchor="end"
                    >
                      {valK > 0 ? `${valK}k` : '0'}
                    </text>
                  </g>
                );
              })}

              {areaD && <path d={areaD} fill="url(#areaGradient)" />}

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="var(--bg-card)"
                    stroke="var(--accent-cyan)"
                    strokeWidth="2.5"
                  >
                    <title>{`${pt.dayLabel}: ${formatRupiah(pt.total)} (${pt.count} nota)`}</title>
                  </circle>
                  {pt.total > 0 && (
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      fill="var(--accent-cyan)"
                      fontSize="9.5"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {Math.round(pt.total / 1000)}k
                    </text>
                  )}
                  <text
                    x={pt.x}
                    y={svgHeight - 8}
                    fill="var(--text-secondary)"
                    fontSize="10"
                    fontFamily="var(--font-sans)"
                    textAnchor="middle"
                  >
                    {pt.dayLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Critical Stock Panel */}
        <div
          className="sip-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Prioritas Restock</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Barang di bawah batas minimum stok
                </p>
              </div>
              {criticalProducts.length > 0 && (
                <span className="badge badge-red">{criticalProducts.length} Item</span>
              )}
            </div>

            {criticalProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {criticalProducts.slice(0, 4).map((prod) => (
                  <div
                    key={prod.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: prod.stock === 0 ? 'var(--accent-red-bg)' : 'var(--accent-amber-bg)',
                      border: '1px solid',
                      borderColor:
                        prod.stock === 0 ? 'rgba(248, 81, 73, 0.3)' : 'rgba(210, 153, 34, 0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '12.5px',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {prod.name}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sisa:{' '}
                        <strong style={{ color: prod.stock === 0 ? 'var(--accent-red)' : 'var(--accent-amber-text)' }}>
                          {prod.stock} {prod.unit}
                        </strong>{' '}
                        (Min: {prod.minStock})
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 9px', fontSize: '11px' }}
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-green-text)',
                }}
              >
                <CheckCircle2 size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Seluruh Stok Aman</div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Semua produk berada di atas batas minimum inventaris.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('products')}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '12px' }}
            >
              <span>Kelola Seluruh Katalog ({products.length} SKU)</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Transaksi Penjualan Terbaru</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              5 aktivitas transaksi terakhir yang tercatat di terminal kasir
            </p>
          </div>
          <button onClick={() => setActiveTab('reports')} className="btn btn-secondary btn-sm">
            <span>Buka Laporan Lengkap</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="sip-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Waktu</th>
                <th>Petugas Kasir</th>
                <th>Ringkasan Item</th>
                <th>Metode Bayar</th>
                <th>Total Tagihan</th>
                <th style={{ textAlign: 'right' }}>Struk</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map((trx) => (
                <tr key={trx.id}>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {trx.invoiceNo}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatDateTime(trx.createdAt)}
                  </td>
                  <td>{trx.cashierName}</td>
                  <td style={{ fontSize: '12.5px' }}>
                    {trx.items.reduce((s, i) => s + i.quantity, 0)} pcs ({trx.items.map((i) => i.name).slice(0, 2).join(', ')}
                    {trx.items.length > 2 ? '...' : ''})
                  </td>
                  <td>
                    <span className="badge badge-muted">{trx.paymentMethod}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700 }}>
                    {formatRupiah(trx.total)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedReceipt(trx)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px 9px', fontSize: '11px' }}
                    >
                      <Eye size={13} />
                      <span>Nota</span>
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                    Belum ada transaksi penjualan yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptModal transaction={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
