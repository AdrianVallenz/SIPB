'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PaymentMethod, PRODUCT_CATEGORIES, ProductCategory } from '@/lib/types';
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
  Users,
  Layers,
  Calendar,
  ArrowDownRight,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

const PAYMENT_ACCENTS: Record<PaymentMethod, { color: string; bg: string; label: string }> = {
  Tunai: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', label: 'Kas Fisik' },
  QRIS: { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.14)', label: 'Scan Instan' },
  'Transfer Bank': { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)', label: 'Rekening' },
  'Kartu Debit': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', label: 'EDC / Debit' },
};

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Elektronik: '#06B6D4',
  'Sembako & Pangan': '#10B981',
  'Minuman & Snack': '#F59E0B',
  'Alat Tulis Kantor': '#6366F1',
  'Kebutuhan Rumah': '#EC4899',
};

export default function AdminDashboard() {
  const { user, isCloudConnected, products, transactions, stockLogs, cashiers, setActiveTab } =
    useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [chartRange, setChartRange] = useState<7 | 14>(7);
  const [chartMetric, setChartMetric] = useState<'both' | 'revenue' | 'profit'>('both');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formattedTodayDate = useMemo(
    () =>
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const {
    activeTrxCount,
    todayTransactions,
    todayRevenue,
    avgTicketToday,
    totalRevenue,
    totalGrossProfit,
    profitMarginPct,
    hppTotal,
    totalStockAssetValuation,
    totalPotentialSalesValuation,
    potentialProfitUpside,
    totalUnitsInStock,
    criticalProducts,
    outOfStockProducts,
    stockHealthPct,
    chartData,
    periodRevenue,
    periodProfit,
    avgDailyRevenue,
    peakDay,
    maxChartVal,
    topProducts,
    paymentBreakdown,
    categoryPerformance,
    digitalSharePct,
    activeCashiersCount,
  } = useMemo(() => {
    const todayKey = getLocalDateKey();
    const productBuyMap = new Map(products.map((p) => [p.id, p.buyPrice]));
    const productCatMap = new Map(products.map((p) => [p.id, p.category]));

    const todayTrx: Transaction[] = [];
    const byDate = new Map<string, { total: number; profit: number; count: number }>();
    const salesByProduct = new Map<
      string,
      { name: string; sku: string; category?: ProductCategory; qty: number; revenue: number }
    >();
    const salesByPayment = new Map<PaymentMethod, { count: number; total: number }>([
      ['Tunai', { count: 0, total: 0 }],
      ['QRIS', { count: 0, total: 0 }],
      ['Transfer Bank', { count: 0, total: 0 }],
      ['Kartu Debit', { count: 0, total: 0 }],
    ]);
    const revByCategory = new Map<ProductCategory, { revenue: number; unitsSold: number }>(
      PRODUCT_CATEGORIES.map((c) => [c, { revenue: 0, unitsSold: 0 }])
    );

    let revToday = 0;
    let revTotal = 0;
    let grossProfit = 0;
    let totalCost = 0;
    let validCount = 0;

    for (const t of transactions) {
      if (t.status === 'VOIDED') continue;
      validCount += 1;
      const dateKey = getLocalDateKey(t.createdAt);
      if (dateKey === todayKey) {
        todayTrx.push(t);
        revToday += t.total;
      }
      revTotal += t.total;

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

        const cat = productCatMap.get(item.productId);
        if (cat) {
          const prevCat = revByCategory.get(cat) || { revenue: 0, unitsSold: 0 };
          revByCategory.set(cat, {
            revenue: prevCat.revenue + item.subtotal,
            unitsSold: prevCat.unitsSold + item.quantity,
          });
        }

        const prevProd = salesByProduct.get(item.productId) || {
          name: item.name,
          sku: item.sku,
          category: cat,
          qty: 0,
          revenue: 0,
        };
        salesByProduct.set(item.productId, {
          name: item.name,
          sku: item.sku,
          category: prevProd.category || cat,
          qty: prevProd.qty + item.quantity,
          revenue: prevProd.revenue + item.subtotal,
        });
      }

      const trxProfit = t.total - trxCost;
      grossProfit += trxProfit;
      totalCost += trxCost;

      const prevDay = byDate.get(dateKey) || { total: 0, profit: 0, count: 0 };
      byDate.set(dateKey, {
        total: prevDay.total + t.total,
        profit: prevDay.profit + trxProfit,
        count: prevDay.count + 1,
      });
    }

    let stockAssetVal = 0;
    let potentialSalesVal = 0;
    let unitsInStock = 0;
    const critical: typeof products = [];
    const outOfStock: typeof products = [];
    const stockByCat = new Map<ProductCategory, { skuCount: number; stockUnits: number }>(
      PRODUCT_CATEGORIES.map((c) => [c, { skuCount: 0, stockUnits: 0 }])
    );

    for (const p of products) {
      stockAssetVal += p.buyPrice * p.stock;
      potentialSalesVal += p.sellPrice * p.stock;
      unitsInStock += p.stock;
      if (p.stock <= p.minStock) critical.push(p);
      if (p.stock === 0) outOfStock.push(p);

      const catStock = stockByCat.get(p.category) || { skuCount: 0, stockUnits: 0 };
      stockByCat.set(p.category, {
        skuCount: catStock.skuCount + 1,
        stockUnits: catStock.stockUnits + p.stock,
      });
    }

    critical.sort((a, b) => a.stock - b.stock);

    const daysSeries = Array.from({ length: chartRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (chartRange - 1 - i));
      const key = getLocalDateKey(d);
      const dayLabel =
        chartRange <= 7
          ? d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
          : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const fullLabel = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
      const entry = byDate.get(key) || { total: 0, profit: 0, count: 0 };
      return {
        dateKey: key,
        dayLabel,
        fullLabel,
        total: entry.total,
        profit: entry.profit,
        count: entry.count,
      };
    });

    const pRevenue = daysSeries.reduce((sum, d) => sum + d.total, 0);
    const pProfit = daysSeries.reduce((sum, d) => sum + d.profit, 0);
    const avgDaily = Math.round(pRevenue / chartRange);
    const peak = daysSeries.reduce(
      (best, cur) => (cur.total > best.total ? cur : best),
      daysSeries[0] || { dayLabel: '-', fullLabel: '-', total: 0, profit: 0, count: 0 }
    );
    const maxVal = Math.max(
      ...daysSeries.map((d) => (chartMetric === 'profit' ? Math.max(d.profit, 0) : d.total)),
      250000
    );

    const sortedTopProducts = Array.from(salesByProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentList = Array.from(salesByPayment.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
      sharePct: revTotal > 0 ? Math.round((data.total / revTotal) * 100) : 0,
    }));

    const digitalTotal = paymentList
      .filter((p) => p.method !== 'Tunai')
      .reduce((s, p) => s + p.total, 0);

    const catList = PRODUCT_CATEGORIES.map((category) => {
      const sales = revByCategory.get(category) || { revenue: 0, unitsSold: 0 };
      const inv = stockByCat.get(category) || { skuCount: 0, stockUnits: 0 };
      return {
        category,
        revenue: sales.revenue,
        unitsSold: sales.unitsSold,
        skuCount: inv.skuCount,
        stockUnits: inv.stockUnits,
        sharePct: revTotal > 0 ? Math.round((sales.revenue / revTotal) * 100) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.stockUnits - a.stockUnits);

    const marginPct = revTotal > 0 ? Math.round((grossProfit / revTotal) * 100) : 0;
    const healthyCount = Math.max(0, products.length - critical.length);
    const healthPct = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100;

    return {
      activeTrxCount: validCount,
      todayTransactions: todayTrx,
      todayRevenue: revToday,
      avgTicketToday:
        todayTrx.length > 0
          ? Math.round(revToday / todayTrx.length)
          : validCount > 0
            ? Math.round(revTotal / validCount)
            : 0,
      totalRevenue: revTotal,
      totalGrossProfit: grossProfit,
      profitMarginPct: marginPct,
      hppTotal: totalCost,
      totalStockAssetValuation: stockAssetVal,
      totalPotentialSalesValuation: potentialSalesVal,
      potentialProfitUpside: Math.max(0, potentialSalesVal - stockAssetVal),
      totalUnitsInStock: unitsInStock,
      criticalProducts: critical,
      outOfStockProducts: outOfStock,
      stockHealthPct: healthPct,
      chartData: daysSeries,
      periodRevenue: pRevenue,
      periodProfit: pProfit,
      avgDailyRevenue: avgDaily,
      peakDay: peak,
      maxChartVal: maxVal,
      topProducts: sortedTopProducts,
      paymentBreakdown: paymentList,
      categoryPerformance: catList,
      digitalSharePct: revTotal > 0 ? Math.round((digitalTotal / revTotal) * 100) : 0,
      activeCashiersCount: cashiers.filter((c) => c.isActive).length,
    };
  }, [products, transactions, cashiers, chartRange, chartMetric]);

  const svgWidth = 680;
  const svgHeight = 235;
  const paddingX = 52;
  const paddingY = 28;

  const points = chartData.map((d, index) => {
    const x =
      chartData.length > 1
        ? paddingX + (index / (chartData.length - 1)) * (svgWidth - paddingX * 2)
        : svgWidth / 2;
    const revY = svgHeight - paddingY - (d.total / maxChartVal) * (svgHeight - paddingY * 2);
    const profY =
      svgHeight - paddingY - (Math.max(0, d.profit) / maxChartVal) * (svgHeight - paddingY * 2);
    return { x, revY, profY, ...d };
  });

  const revPathD = points.reduce(
    (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.revY}` : `${acc} L ${curr.x} ${curr.revY}`),
    ''
  );
  const revAreaD =
    points.length > 0
      ? `${revPathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
      : '';

  const profitPathD = points.reduce(
    (acc, curr, idx) =>
      idx === 0 ? `M ${curr.x} ${curr.profY}` : `${acc} L ${curr.x} ${curr.profY}`,
    ''
  );
  const profitAreaD =
    points.length > 0
      ? `${profitPathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
      : '';

  // Donut segments for Payment Methods
  const donutRadius = 52;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = paymentBreakdown.reduce<
    { method: PaymentMethod; color: string; dash: number; offset: number }[]
  >((acc, item) => {
    const prevUsed = acc.reduce((sum, s) => sum + s.dash, 0);
    const pct = totalRevenue > 0 ? item.total / totalRevenue : 0;
    const dash = pct * donutCircumference;
    acc.push({
      method: item.method,
      color: PAYMENT_ACCENTS[item.method].color,
      dash,
      offset: -prevUsed,
    });
    return acc;
  }, []);

  const activePoint =
    hoveredIdx !== null && points[hoveredIdx]
      ? points[hoveredIdx]
      : points.length > 0
        ? points[points.length - 1]
        : null;

  const revVsAvgPct =
    avgDailyRevenue > 0 ? Math.round(((todayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100) : 0;

  return (
    <div className="page-container">
      {/* Executive Command Banner */}
      <div
        className="sip-card"
        style={{
          padding: '20px 22px',
          background:
            'linear-gradient(135deg, rgba(var(--accent-cyan-rgb), 0.13) 0%, rgba(16, 185, 129, 0.05) 55%, rgba(var(--accent-cyan-rgb), 0.02) 100%)',
          borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">
              <Activity size={12} /> EXECUTIVE COMMAND CENTER
            </span>
            <span className="badge badge-muted font-mono" style={{ fontSize: '10.5px' }}>
              <Database size={11} style={{ color: 'var(--accent-cyan)' }} />
              {isCloudConnected ? 'Supabase Cloud Live' : 'Cache Lokal Aktif'}
            </span>
            <span className="badge badge-muted" style={{ fontSize: '10.5px' }}>
              <Calendar size={11} style={{ color: 'var(--accent-cyan)' }} />
              {formattedTodayDate}
            </span>
          </div>

          <h2 className="page-title" style={{ fontSize: 'clamp(18px, 2.2vw, 22px)', marginTop: '2px' }}>
            Selamat Bertugas, {user?.name || 'Administrator'}
          </h2>
          <p className="page-subtitle">
            Ringkasan omzet real-time, profitabilitas HPP, kesehatan stok gudang, serta performa kasir toko Anda.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('settings')} className="btn btn-secondary btn-sm">
            <Users size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>{activeCashiersCount} Kasir Aktif</span>
          </button>
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

      {/* Onboarding Checklist for Fresh New Stores */}
      {(products.length === 0 || cashiers.length === 0) && (
        <div
          className="sip-card"
          style={{
            padding: '16px 20px',
            borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
            backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                Panduan Persiapan Toko Baru (Terisolasi Per Akun)
              </span>
            </div>
            <span className="badge badge-cyan">Setup Awal</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="sip-card sip-card-hover"
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                  1. Katalog Barang ({products.length} SKU)
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {products.length > 0 ? 'Produk siap dijual' : 'Tambah produk atau muat contoh'}
                </div>
              </div>
              {products.length > 0 ? (
                <CheckCircle2 size={18} style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
              ) : (
                <ArrowUpRight size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="sip-card sip-card-hover"
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                  2. Akun Kasir POS ({cashiers.length} Akun)
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {cashiers.length > 0 ? 'Kasir siap login di POS' : 'Buat akun kasir untuk staf Anda'}
                </div>
              </div>
              {cashiers.length > 0 ? (
                <CheckCircle2 size={18} style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
              ) : (
                <ArrowUpRight size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="sip-card sip-card-hover"
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                  3. Transaksi Kasir ({activeTrxCount} Nota)
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Catat penjualan tunai &amp; non-tunai
                </div>
              </div>
              <ArrowUpRight size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
            </button>
          </div>
        </div>
      )}

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
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Omzet Hari Ini
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
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

            <div className="font-mono dashboard-kpi-value" style={{ color: 'var(--accent-cyan)' }}>
              {formatRupiah(todayRevenue)}
            </div>

            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {avgDailyRevenue > 0 ? (
                <span
                  className={`badge ${revVsAvgPct >= 0 ? 'badge-green' : 'badge-amber'} font-mono`}
                  style={{ fontSize: '10px', padding: '2px 7px' }}
                >
                  {revVsAvgPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {revVsAvgPct >= 0 ? `+${revVsAvgPct}%` : `${revVsAvgPct}%`} vs rata-rata harian
                </span>
              ) : (
                <span className="badge badge-muted font-mono" style={{ fontSize: '10px' }}>
                  Real-time hari ini
                </span>
              )}
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
              gap: '6px',
            }}
          >
            <span>{todayTransactions.length} nota hari ini</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>
              Basket: {formatRupiah(avgTicketToday)}
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
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Omzet &amp; Laba
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
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

            <div className="font-mono dashboard-kpi-value" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(totalRevenue)}
            </div>

            {/* HPP vs Margin Visual Split Bar */}
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, profitMarginPct))}%`,
                    backgroundColor: '#10B981',
                    height: '100%',
                  }}
                />
              </div>
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
              gap: '6px',
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

        {/* KPI 3: Valuasi Modal & Potensi Ritel */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: '3px solid var(--accent-amber)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Valuasi Modal Stok
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
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

            <div className="font-mono dashboard-kpi-value" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(totalStockAssetValuation)}
            </div>

            <div style={{ marginTop: '6px' }}>
              <span className="badge badge-amber font-mono" style={{ fontSize: '10px', padding: '2px 7px' }}>
                Potensi Laba Stok: +{formatRupiah(potentialProfitUpside)}
              </span>
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
              gap: '6px',
            }}
          >
            <span>{totalUnitsInStock.toLocaleString('id-ID')} unit aktif</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>
              Ritel: {formatRupiah(totalPotentialSalesValuation)}
            </span>
          </div>
        </div>

        {/* KPI 4: Kesehatan Inventaris */}
        <div
          className="sip-card sip-card-hover"
          style={{
            borderTop: `3px solid ${criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Kesehatan Inventaris
              </span>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor:
                    criticalProducts.length > 0 ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
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
              className="font-mono dashboard-kpi-value"
              style={{
                color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-green-text)',
              }}
            >
              {criticalProducts.length}{' '}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SKU Kritis
              </span>
            </div>

            {/* Stock Health Gauge Bar */}
            <div style={{ marginTop: '8px' }}>
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
                    width: `${stockHealthPct}%`,
                    height: '100%',
                    backgroundColor:
                      stockHealthPct >= 80
                        ? '#10B981'
                        : stockHealthPct >= 50
                          ? '#F59E0B'
                          : '#EF4444',
                    borderRadius: 'var(--radius-full)',
                  }}
                />
              </div>
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
              gap: '6px',
            }}
          >
            <span>
              {outOfStockProducts.length > 0
                ? `${outOfStockProducts.length} habis stok (0)`
                : `${products.length} total SKU`}
            </span>
            <span className="badge badge-muted font-mono" style={{ fontSize: '10.5px' }}>
              {stockHealthPct}% Stok Aman
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Interactive Revenue & Profit Chart + Restock Priority */}
      <div className="dashboard-split">
        {/* Interactive Revenue & Gross Profit Chart */}
        <div
          className="sip-card"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800 }}>
                Tren Omzet &amp; Laba Kotor ({chartRange} Hari Terakhir)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Arahkan kursor atau ketuk titik grafik untuk melihat rincian performa harian (non-VOID)
              </p>
            </div>

            {/* Interactive Controls */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '2px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {(
                  [
                    { id: 'both', label: 'Keduanya' },
                    { id: 'revenue', label: 'Omzet' },
                    { id: 'profit', label: 'Laba' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChartMetric(opt.id)}
                    style={{
                      border: 'none',
                      padding: '4px 9px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: chartMetric === opt.id ? 'var(--bg-card)' : 'transparent',
                      color: chartMetric === opt.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      boxShadow: chartMetric === opt.id ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  padding: '2px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {([7, 14] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      setChartRange(days);
                      setHoveredIdx(null);
                    }}
                    style={{
                      border: 'none',
                      padding: '4px 9px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: chartRange === days ? 'var(--bg-card)' : 'transparent',
                      color: chartRange === days ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      boxShadow: chartRange === days ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {days}H
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Tooltip Strip & Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
            }}
          >
            {activePoint ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activePoint.fullLabel}
                </span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  Omzet: {formatRupiah(activePoint.total)}
                </span>
                <span
                  className="font-mono"
                  style={{ color: 'var(--accent-green-text)', fontWeight: 700 }}
                >
                  Laba: {formatRupiah(activePoint.profit)}
                </span>
                <span className="badge badge-muted font-mono" style={{ fontSize: '10px' }}>
                  {activePoint.count} nota
                </span>
              </div>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
              {(chartMetric === 'both' || chartMetric === 'revenue') && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-cyan)',
                    }}
                  />
                  Omzet
                </span>
              )}
              {(chartMetric === 'both' || chartMetric === 'profit') && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                    }}
                  />
                  Laba Kotor
                </span>
              )}
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: '480px', userSelect: 'none' }}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
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

              {(chartMetric === 'both' || chartMetric === 'revenue') && revAreaD && (
                <path d={revAreaD} fill="url(#revAreaGrad)" />
              )}
              {chartMetric === 'profit' && profitAreaD && (
                <path d={profitAreaD} fill="url(#profitAreaGrad)" />
              )}

              {(chartMetric === 'both' || chartMetric === 'revenue') && revPathD && (
                <path
                  d={revPathD}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {(chartMetric === 'both' || chartMetric === 'profit') && profitPathD && (
                <path
                  d={profitPathD}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={chartMetric === 'both' ? '2.25' : '2.75'}
                  strokeDasharray={chartMetric === 'both' ? '5 4' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Vertical Guide */}
              {activePoint && hoveredIdx !== null && (
                <line
                  x1={activePoint.x}
                  y1={paddingY - 6}
                  x2={activePoint.x}
                  y2={svgHeight - paddingY}
                  stroke="var(--accent-cyan)"
                  strokeOpacity="0.45"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
              )}

              {points.map((pt, idx) => {
                const isSelected = hoveredIdx === idx;
                const showXLabel = chartRange === 7 || idx % 2 === 0 || idx === points.length - 1;
                return (
                  <g
                    key={pt.dateKey}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                  >
                    {/* Wide invisible hit target */}
                    <rect
                      x={pt.x - 18}
                      y={paddingY - 10}
                      width="36"
                      height={svgHeight - paddingY}
                      fill="transparent"
                    />

                    {(chartMetric === 'both' || chartMetric === 'revenue') && (
                      <circle
                        cx={pt.x}
                        cy={pt.revY}
                        r={isSelected ? '6.5' : '4.5'}
                        fill="var(--bg-card)"
                        stroke="#06B6D4"
                        strokeWidth={isSelected ? '3' : '2.5'}
                      />
                    )}

                    {(chartMetric === 'both' || chartMetric === 'profit') && (
                      <circle
                        cx={pt.x}
                        cy={pt.profY}
                        r={isSelected ? '5.5' : '4'}
                        fill="var(--bg-card)"
                        stroke="#10B981"
                        strokeWidth={isSelected ? '2.75' : '2.25'}
                      />
                    )}

                    {pt.total > 0 && chartRange === 7 && chartMetric !== 'profit' && (
                      <text
                        x={pt.x}
                        y={pt.revY - 10}
                        fill="var(--accent-cyan)"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        {Math.round(pt.total / 1000)}k
                      </text>
                    )}

                    {showXLabel && (
                      <text
                        x={pt.x}
                        y={svgHeight - 7}
                        fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'}
                        fontSize="10"
                        fontWeight={isSelected ? '700' : '600'}
                        fontFamily="var(--font-sans)"
                        textAnchor="middle"
                      >
                        {pt.dayLabel}
                      </text>
                    )}
                  </g>
                );
              })}
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
            <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Akumulasi {chartRange} Hari
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                {formatRupiah(periodRevenue)}
              </div>
              <div className="font-mono" style={{ fontSize: '10.5px', color: 'var(--accent-green-text)', marginTop: '1px' }}>
                Laba: {formatRupiah(periodProfit)}
              </div>
            </div>

            <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Rata-rata Harian
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                {formatRupiah(avgDailyRevenue)}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                HPP Tercatat: {formatRupiah(hppTotal)}
              </div>
            </div>

            <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Puncak ({peakDay.dayLabel})
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {formatRupiah(peakDay.total)}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {peakDay.count} transaksi selesai
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
                  SKU dengan stok menipis atau habis
                </p>
              </div>
              {criticalProducts.length > 0 && (
                <span className="badge badge-red">{criticalProducts.length} SKU</span>
              )}
            </div>

            {criticalProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {criticalProducts.slice(0, 5).map((prod) => {
                  const isZero = prod.stock === 0;
                  const fillPct = Math.min(100, Math.round((prod.stock / Math.max(1, prod.minStock)) * 100));
                  return (
                    <div
                      key={prod.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isZero ? 'var(--accent-red-bg)' : 'var(--accent-amber-bg)',
                        border: '1px solid',
                        borderColor: isZero ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
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
                            {prod.sku} &bull; Sisa:{' '}
                            <strong style={{ color: isZero ? 'var(--accent-red)' : 'var(--accent-amber-text)' }}>
                              {prod.stock} {prod.unit}
                            </strong>{' '}
                            (Min {prod.minStock})
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('products')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: '11px', flexShrink: 0 }}
                        >
                          Restock
                        </button>
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          backgroundColor: 'rgba(0,0,0,0.12)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${fillPct}%`,
                            height: '100%',
                            backgroundColor: isZero ? '#EF4444' : '#F59E0B',
                            borderRadius: 'var(--radius-full)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
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

      {/* Executive Analytics Row 1: Payment Methods Donut & Top Performing Products */}
      <div className="dashboard-grid-2">
        {/* Payment Method Donut + Distribution */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <CreditCard size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Komposisi Metode Pembayaran</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rasio transaksi tunai vs pembayaran digital (non-tunai)
              </p>
            </div>
            <span className="badge badge-cyan font-mono" style={{ fontSize: '10.5px' }}>
              Digital: {digitalSharePct}%
            </span>
          </div>

          <div className="dashboard-donut-layout">
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '144px', height: '144px', flexShrink: 0 }}>
              <svg viewBox="0 0 140 140" style={{ width: '144px', height: '144px', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--bg-subtle)"
                  strokeWidth="16"
                />
                {totalRevenue > 0 &&
                  donutSegments.map(
                    (seg) =>
                      seg.dash > 0 && (
                        <circle
                          key={seg.method}
                          cx="70"
                          cy="70"
                          r={donutRadius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="16"
                          strokeDasharray={`${seg.dash} ${donutCircumference - seg.dash}`}
                          strokeDashoffset={seg.offset}
                        />
                      )
                  )}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <span className="font-mono" style={{ fontSize: '19px', fontWeight: 800 }}>
                  {activeTrxCount}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Total Nota
                </span>
              </div>
            </div>

            {/* Method Breakdown Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {paymentBreakdown.map((item) => {
                const accent = PAYMENT_ACCENTS[item.method];
                return (
                  <div
                    key={item.method}
                    style={{
                      padding: '8px 11px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: accent.color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{item.method}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {item.count} transaksi &bull; {accent.label}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                        {formatRupiah(item.total)}
                      </div>
                      <div className="font-mono" style={{ fontSize: '10.5px', fontWeight: 700, color: accent.color }}>
                        {item.sharePct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 5 Best Selling Products */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Award size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Produk Terlaris (Top Performing SKU)</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Kontribusi omzet tertinggi berdasarkan transaksi selesai
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topProducts.map((prod, idx) => {
              const maxRev = topProducts[0]?.revenue || 1;
              const widthPct = Math.max(12, Math.round((prod.revenue / maxRev) * 100));
              const barColor = idx === 0 ? '#06B6D4' : idx === 1 ? '#10B981' : '#3B82F6';
              return (
                <div key={prod.sku} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        className="font-mono"
                        style={{
                          width: '23px',
                          height: '23px',
                          borderRadius: '7px',
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
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {prod.name}
                        </div>
                        <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {prod.sku}
                          {prod.category ? ` • ${prod.category}` : ''}
                        </div>
                      </div>
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
                        backgroundColor: barColor,
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Belum ada data penjualan produk.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive Analytics Row 2: Category Performance & Stock Audit Feed */}
      <div className="dashboard-grid-2">
        {/* Category Performance */}
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Layers size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Performa &amp; Stok Per Kategori</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Sebaran pendapatan dan ketersediaan unit barang di setiap kategori
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {categoryPerformance.map((cat) => {
              const color = CATEGORY_COLORS[cat.category];
              return (
                <div
                  key={cat.category}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '3px',
                          backgroundColor: color,
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '12.5px' }}>{cat.category}</span>
                      <span className="badge badge-muted font-mono" style={{ fontSize: '10px' }}>
                        {cat.skuCount} SKU / {cat.stockUnits} unit
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                        {formatRupiah(cat.revenue)}
                      </span>
                      <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color }}>
                        {cat.sharePct}%
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
                        width: `${Math.max(cat.revenue > 0 ? 5 : 0, cat.sharePct)}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warehouse Audit Feed & Active Cashier Snapshot */}
        <div className="sip-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <ClipboardList size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Aktivitas Mutasi Gudang Terbaru</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Audit perubahan stok masuk, keluar, dan opname terakhir
                </p>
              </div>
              <button onClick={() => setActiveTab('products')} className="btn btn-secondary btn-sm">
                <span>Semua Log</span>
              </button>
            </div>

            {stockLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {stockLogs.slice(0, 4).map((log) => {
                  const badgeClass =
                    log.type === 'IN'
                      ? 'badge-green'
                      : log.type === 'OUT'
                        ? 'badge-amber'
                        : 'badge-cyan';
                  const sign = log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : '';
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <span className={`badge ${badgeClass} font-mono`} style={{ fontSize: '10px', padding: '1px 7px' }}>
                            {log.type} {sign}
                            {log.quantity}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '12.5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {log.productName}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {log.reason} &bull; <span className="font-mono">{log.operator}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                          {log.previousStock} &rarr; {log.newStock}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Belum ada log mutasi stok gudang.
              </div>
            )}
          </div>

          <div
            style={{
              padding: '11px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(var(--accent-cyan-rgb), 0.3)',
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <Users size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>
                Tim Kasir Toko: <strong>{activeCashiersCount} Aktif</strong> dari {cashiers.length} akun terdaftar
              </span>
            </div>
            <button onClick={() => setActiveTab('settings')} className="btn btn-secondary btn-sm">
              <span>Kelola Kasir</span>
              <ArrowUpRight size={13} />
            </button>
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
              5 aktivitas transaksi terakhir yang tercatat di terminal kasir toko Anda
            </p>
          </div>
          <button onClick={() => setActiveTab('reports')} className="btn btn-secondary btn-sm">
            <span>Buka Laporan Lengkap</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="sip-table-container desktop-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
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
                    <td
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)',
                      }}
                    >
                      {trx.invoiceNo}
                      {isVoided && (
                        <span
                          className="badge badge-red"
                          style={{ marginLeft: '6px', fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          VOID
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(trx.createdAt)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{trx.cashierName}</td>
                    <td style={{ fontSize: '12.5px' }}>
                      {trx.items.reduce((s, i) => s + i.quantity, 0)} pcs (
                      {trx.items
                        .map((i) => i.name)
                        .slice(0, 2)
                        .join(', ')}
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

        {/* Mobile Recent Transactions Cards */}
        <div className="mobile-card-list" style={{ padding: '14px' }}>
          {transactions.slice(0, 5).map((trx) => {
            const isVoided = trx.status === 'VOIDED';
            return (
              <div key={trx.id} className="mobile-data-card" style={{ opacity: isVoided ? 0.68 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      fontSize: '13.5px',
                      color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)',
                    }}
                  >
                    {trx.invoiceNo}
                  </span>
                  <span className="badge badge-muted">{trx.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>{formatDateTime(trx.createdAt)}</span>
                  <span>{trx.cashierName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 800,
                      fontSize: '14.5px',
                      textDecoration: isVoided ? 'line-through' : 'none',
                    }}
                  >
                    {formatRupiah(trx.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(trx)}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: '34px' }}
                  >
                    <Eye size={13} />
                    <span>Nota</span>
                  </button>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Belum ada transaksi penjualan yang tercatat.
            </div>
          )}
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptModal transaction={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
