'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PaymentMethod } from '@/lib/types';
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
  Award,
  CreditCard,
  Activity,
  FileSpreadsheet,
  Database,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isCloudConnected, products, transactions, setActiveTab } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const {
    todayTransactions,
    todayRevenue,
    avgTicketToday,
    totalRevenue,
    totalGrossProfit,
    profitMarginPct,
    totalStockAssetValuation,
    totalPotentialSalesValuation,
    totalUnitsInStock,
    criticalProducts,
    outOfStockProducts,
    stockHealthPct,
    chartData,
    sevenDayRevenue,
    avgDailyRevenue,
    peakDay,
    maxChartVal,
    topProducts,
    paymentBreakdown,
  } = useMemo(() => {
    const todayKey = getLocalDateKey();
    const productBuyMap = new Map(products.map((p) => [p.id, p.buyPrice]));

    const todayTrx: Transaction[] = [];
    const revenueByDate = new Map<string, { total: number; count: number }>();
    const salesByProduct = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
    const salesByPayment = new Map<PaymentMethod, { count: number; total: number }>([
      ['Tunai', { count: 0, total: 0 }],
      ['QRIS', { count: 0, total: 0 }],
      ['Transfer Bank', { count: 0, total: 0 }],
      ['Kartu Debit', { count: 0, total: 0 }],
    ]);

    let revToday = 0;
    let revTotal = 0;
    let grossProfit = 0;
    let activeTrxCount = 0;

    for (const t of transactions) {
      if (t.status === 'VOIDED') continue;
      activeTrxCount += 1;
      const dateKey = getLocalDateKey(t.createdAt);
      if (dateKey === todayKey) {
        todayTrx.push(t);
        revToday += t.total;
      }
      revTotal += t.total;

      const prevDay = revenueByDate.get(dateKey) || { total: 0, count: 0 };
      revenueByDate.set(dateKey, { total: prevDay.total + t.total, count: prevDay.count + 1 });

      const payEntry = salesByPayment.get(t.paymentMethod) || { count: 0, total: 0 };
      salesByPayment.set(t.paymentMethod, {
        count: payEntry.count + 1,
        total: payEntry.total + t.total,
      });

      let trxCost = 0;
      for (const item of t.items) {
        const unitCost =
          item.buyPrice ?? productBuyMap.get(item.productId) ?? Math.round(item.price * 0.78);
        trxCost += unitCost * item.quantity;

        const prevProd = salesByProduct.get(item.productId) || {
          name: item.name,
          sku: item.sku,
          qty: 0,
          revenue: 0,
        };
        salesByProduct.set(item.productId, {
          name: item.name,
          sku: item.sku,
          qty: prevProd.qty + item.quantity,
          revenue: prevProd.revenue + item.subtotal,
        });
      }
      grossProfit += t.total - trxCost;
    }

    let stockAssetVal = 0;
    let potentialSalesVal = 0;
    let unitsInStock = 0;
    const critical: typeof products = [];
    const outOfStock: typeof products = [];

    for (const p of products) {
      stockAssetVal += p.buyPrice * p.stock;
      potentialSalesVal += p.sellPrice * p.stock;
      unitsInStock += p.stock;
      if (p.stock <= p.minStock) critical.push(p);
      if (p.stock === 0) outOfStock.push(p);
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = getLocalDateKey(d);
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      const entry = revenueByDate.get(key) || { total: 0, count: 0 };
      return { dateKey: key, dayLabel, total: entry.total, count: entry.count };
    });

    const sevenDayRev = last7Days.reduce((sum, d) => sum + d.total, 0);
    const avgDaily = Math.round(sevenDayRev / 7);
    const peak = last7Days.reduce(
      (best, cur) => (cur.total > best.total ? cur : best),
      last7Days[0] || { dayLabel: '-', total: 0, count: 0 }
    );
    const maxVal = Math.max(...last7Days.map((d) => d.total), 500000);

    const sortedTopProducts = Array.from(salesByProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentList = Array.from(salesByPayment.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
      sharePct: revTotal > 0 ? Math.round((data.total / revTotal) * 100) : 0,
    }));

    const marginPct = revTotal > 0 ? Math.round((grossProfit / revTotal) * 100) : 0;
    const healthyCount = Math.max(0, products.length - critical.length);
    const healthPct = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100;

    return {
      todayTransactions: todayTrx,
      todayRevenue: revToday,
      avgTicketToday: todayTrx.length > 0 ? Math.round(revToday / todayTrx.length) : activeTrxCount > 0 ? Math.round(revTotal / activeTrxCount) : 0,
      totalRevenue: revTotal,
      totalGrossProfit: grossProfit,
      profitMarginPct: marginPct,
      totalStockAssetValuation: stockAssetVal,
      totalPotentialSalesValuation: potentialSalesVal,
      totalUnitsInStock: unitsInStock,
      criticalProducts: critical,
      outOfStockProducts: outOfStock,
      stockHealthPct: healthPct,
      chartData: last7Days,
      sevenDayRevenue: sevenDayRev,
      avgDailyRevenue: avgDaily,
      peakDay: peak,
      maxChartVal: maxVal,
      topProducts: sortedTopProducts,
      paymentBreakdown: paymentList,
    };
  }, [products, transactions]);

  const svgWidth = 650;
  const svgHeight = 215;
  const paddingX = 48;
  const paddingY = 26;

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
      {/* Executive Banner Header */}
      <div
        className="sip-card"
        style={{
          padding: '18px 22px',
          background:
            'linear-gradient(135deg, rgba(var(--accent-cyan-rgb), 0.12) 0%, rgba(var(--accent-cyan-rgb), 0.02) 100%)',
          borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span className="badge badge-cyan">
              <Activity size={12} /> COMMAND CENTER
            </span>
            <span className="badge badge-muted font-mono" style={{ fontSize: '10.5px' }}>
              <Database size={11} style={{ color: 'var(--accent-cyan)' }} />
              {isCloudConnected ? 'Supabase Cloud Connected' : 'Local Storage Active'}
            </span>
          </div>
          <h2 className="page-title" style={{ marginTop: '2px' }}>
            Selamat Bertugas, {user?.name || 'Administrator'}
          </h2>
          <p className="page-subtitle">
            Pantau performa omzet real-time, margin laba kotor, kesehatan stok gudang, dan aktivitas kasir dalam satu layar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('products')} className="btn btn-secondary btn-sm">
            <Boxes size={14} />
            <span>Master Gudang</span>
          </button>
          <button onClick={() => setActiveTab('reports')} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={14} />
            <span>Laporan &amp; CSV</span>
          </button>
          <button onClick={() => setActiveTab('pos')} className="btn btn-primary btn-sm">
            <ShoppingCart size={14} />
            <span>Buka Kasir POS</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Omzet Hari Ini */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: '3px solid var(--accent-cyan)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Omzet Hari Ini
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                }}
              >
                <TrendingUp size={17} />
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '23px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {formatRupiah(todayRevenue)}
            </div>
          </div>

          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{todayTransactions.length} nota hari ini</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>
              Rata-rata: {formatRupiah(avgTicketToday)}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Omzet & Laba Kotor */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: '3px solid var(--accent-green)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Total Omzet &amp; Laba
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  backgroundColor: 'var(--accent-green-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-green-text)',
                }}
              >
                <DollarSign size={17} />
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '23px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatRupiah(totalRevenue)}
            </div>
          </div>

          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
            }}
          >
            <span style={{ color: 'var(--accent-green-text)', fontWeight: 700 }}>
              Laba: {formatRupiah(totalGrossProfit)}
            </span>
            <span className="badge badge-green font-mono" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
              +{profitMarginPct}% Margin
            </span>
          </div>
        </div>

        {/* KPI 3: Valuasi Aset Stok */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: '3px solid var(--accent-amber)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Valuasi Modal Stok
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  backgroundColor: 'var(--accent-amber-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-amber-text)',
                }}
              >
                <Package size={17} />
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '23px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatRupiah(totalStockAssetValuation)}
            </div>
          </div>

          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{totalUnitsInStock.toLocaleString('id-ID')} unit aktif</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>
              Ritel: {formatRupiah(totalPotentialSalesValuation)}
            </span>
          </div>
        </div>

        {/* KPI 4: Kesehatan Stok Gudang */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: `3px solid ${criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Kesehatan Stok
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  backgroundColor: criticalProducts.length > 0 ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green-text)',
                }}
              >
                <AlertTriangle size={17} />
              </span>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '23px',
                fontWeight: 800,
                color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green-text)',
              }}
            >
              {criticalProducts.length}{' '}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>SKU Kritis</span>
            </div>
          </div>

          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              {outOfStockProducts.length > 0
                ? `${outOfStockProducts.length} barang habis (0)`
                : 'Stok tersedia'}
            </span>
            <span className="badge badge-muted font-mono" style={{ fontSize: '10.5px' }}>
              {stockHealthPct}% Stok Aman
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: 7-Day Revenue Chart & Critical Stock Panel */}
      <div className="dashboard-split">
        {/* Revenue Chart */}
        <div className="sip-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800 }}>Tren Pendapatan 7 Hari Terakhir</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Grafik pergerakan nilai transaksi penjualan harian (tidak termasuk nota VOID)
              </p>
            </div>
            <span className="badge badge-cyan font-mono" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              Total 7 Hari: {formatRupiah(sevenDayRevenue)}
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
                  <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.02" />
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
                      fontWeight="600"
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
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="var(--bg-card)"
                    stroke="var(--accent-cyan)"
                    strokeWidth="2.75"
                  >
                    <title>{`${pt.dayLabel}: ${formatRupiah(pt.total)} (${pt.count} nota)`}</title>
                  </circle>
                  {pt.total > 0 && (
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      fill="var(--accent-cyan)"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {Math.round(pt.total / 1000)}k
                    </text>
                  )}
                  <text
                    x={pt.x}
                    y={svgHeight - 7}
                    fill="var(--text-secondary)"
                    fontSize="10.5"
                    fontWeight="600"
                    fontFamily="var(--font-sans)"
                    textAnchor="middle"
                  >
                    {pt.dayLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* 3-Column Chart Footer Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Akumulasi 7 Hari</div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                {formatRupiah(sevenDayRevenue)}
              </div>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Rata-rata Harian</div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                {formatRupiah(avgDailyRevenue)}
              </div>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Puncak Harian ({peakDay.dayLabel})</div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {formatRupiah(peakDay.total)}
              </div>
            </div>
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
                <h3 style={{ fontSize: '15.5px', fontWeight: 800 }}>Prioritas Restock Gudang</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Daftar SKU di bawah batas stok minimum
                </p>
              </div>
              {criticalProducts.length > 0 && (
                <span className="badge badge-red">{criticalProducts.length} SKU</span>
              )}
            </div>

            {criticalProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {criticalProducts.slice(0, 5).map((prod) => (
                  <div
                    key={prod.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: prod.stock === 0 ? 'var(--accent-red-bg)' : 'var(--accent-amber-bg)',
                      border: '1px solid',
                      borderColor:
                        prod.stock === 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
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
                      style={{ padding: '5px 10px', fontSize: '11px' }}
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
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Seluruh Stok Aman</div>
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
              style={{ width: '100%', fontSize: '12.5px' }}
            >
              <span>Kelola Seluruh Katalog ({products.length} SKU)</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Executive Analytics Row: Top 5 Products & Payment Methods Breakdown */}
      <div className="dashboard-grid-2">
        {/* Top 5 Best Selling Products */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Award size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Produk Terlaris (Top Performing SKU)</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Peringkat kontribusi omzet tertinggi berdasarkan transaksi selesai
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topProducts.map((prod, idx) => {
              const maxRev = topProducts[0]?.revenue || 1;
              const widthPct = Math.max(12, Math.round((prod.revenue / maxRev) * 100));
              return (
                <div key={prod.sku} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        className="font-mono"
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: idx === 0 ? 'rgba(var(--accent-cyan-rgb), 0.16)' : 'var(--bg-subtle)',
                          color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {prod.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span className="badge badge-muted font-mono" style={{ fontSize: '10.5px' }}>
                        {prod.qty} terjual
                      </span>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
                        {formatRupiah(prod.revenue)}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-cyan)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Belum ada data penjualan produk.
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <CreditCard size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Distribusi Metode Pembayaran</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Proporsi penerimaan kas tunai dan pembayaran non-tunai (digital)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paymentBreakdown.map((item) => (
              <div
                key={item.method}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.method}</span>
                    <span className="badge badge-muted font-mono" style={{ fontSize: '10px' }}>
                      {item.count} transaksi
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                      {formatRupiah(item.total)}
                    </span>
                    <span className="badge badge-cyan font-mono" style={{ fontSize: '10px' }}>
                      {item.sharePct}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(item.count > 0 ? 6 : 0, item.sharePct)}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent-cyan)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="sip-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15.5px', fontWeight: 800 }}>Transaksi Penjualan Terbaru</h3>
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
              {transactions.slice(0, 5).map((trx) => {
                const isVoided = trx.status === 'VOIDED';
                return (
                  <tr key={trx.id} style={{ opacity: isVoided ? 0.65 : 1 }}>
                    <td className="font-mono" style={{ fontWeight: 700, color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                      {trx.invoiceNo}
                      {isVoided && (
                        <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '9.5px', padding: '1px 6px' }}>
                          VOID
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(trx.createdAt)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{trx.cashierName}</td>
                    <td style={{ fontSize: '12.5px' }}>
                      {trx.items.reduce((s, i) => s + i.quantity, 0)} pcs ({trx.items.map((i) => i.name).slice(0, 2).join(', ')}
                      {trx.items.length > 2 ? '...' : ''})
                    </td>
                    <td>
                      <span className="badge badge-muted">{trx.paymentMethod}</span>
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        textDecoration: isVoided ? 'line-through' : 'none',
                        color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {formatRupiah(trx.total)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedReceipt(trx)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                      >
                        <Eye size={13} />
                        <span>Nota</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
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
