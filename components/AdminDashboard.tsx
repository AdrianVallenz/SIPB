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
} from 'lucide-react';

const PAYMENT_ACCENTS: Record<PaymentMethod, { color: string; label: string }> = {
  QRIS: { color: 'var(--accent-cyan)', label: 'Scan Instan' },
  Tunai: { color: 'var(--text-primary)', label: 'Kas Fisik' },
  'Transfer Bank': { color: 'var(--text-secondary)', label: 'Rekening' },
  'Kartu Debit': { color: 'var(--text-muted)', label: 'EDC / Debit' },
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

  const profitPathD = points.reduce(
    (acc, curr, idx) =>
      idx === 0 ? `M ${curr.x} ${curr.profY}` : `${acc} L ${curr.x} ${curr.profY}`,
    ''
  );

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

  const maxCategoryRevenue = Math.max(1, ...categoryPerformance.map((cat) => cat.revenue));

  return (
    <>
      <div className="sb-dashboard">
        {/* Executive Command Header */}
        <header className="sb-header-band">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, flex: '1 1 420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="sb-status sb-status-solid">
                <Activity size={11} /> Executive Command Center
              </span>
              <span className="sb-status sb-mono">
                <Database size={11} style={{ color: 'var(--accent-cyan)' }} />
                {isCloudConnected ? 'Supabase Cloud Live' : 'Cache Lokal Aktif'}
              </span>
              <span className="sb-status">
                <Calendar size={11} />
                {formattedTodayDate}
              </span>
            </div>

            <h2 className="sb-h1">
              <span style={{ fontWeight: 300 }}>Selamat bertugas, </span>
              <span style={{ fontWeight: 700 }}>{user?.name || 'Administrator'}</span>
            </h2>

            <p className="sb-subtitle" style={{ maxWidth: '640px' }}>
              Ringkasan omzet real-time, profitabilitas HPP, kesehatan stok gudang, serta performa kasir toko Anda.
            </p>
          </div>

          <div className="sb-toolbar">
            <button type="button" onClick={() => setActiveTab('settings')} className="sb-btn">
              <Users size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>{activeCashiersCount} Kasir Aktif</span>
            </button>
            <button type="button" onClick={() => setActiveTab('products')} className="sb-btn">
              <Boxes size={13} />
              <span>Master Gudang</span>
            </button>
            <button type="button" onClick={() => setActiveTab('reports')} className="sb-btn">
              <FileSpreadsheet size={13} />
              <span>Laporan &amp; CSV</span>
            </button>
            <button type="button" onClick={() => setActiveTab('pos')} className="sb-btn sb-btn-primary">
              <ShoppingCart size={13} />
              <span>Buka Kasir POS</span>
            </button>
          </div>
        </header>

        {/* Onboarding Checklist for Fresh New Stores */}
        {(products.length === 0 || cashiers.length === 0) && (
          <section className="sb-panel" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div className="sb-eyebrow">Persiapan Awal &bull; Terisolasi Per Akun</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  Panduan Persiapan Toko Baru
                </h3>
              </div>
              <span className="sb-status sb-status-accent">Setup Awal</span>
            </div>

            <div className="sb-onboarding-grid">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="sb-onboarding-btn"
              >
                <div>
                  <div className="sb-eyebrow sb-mono">Langkah 01</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '4px' }}>
                    Katalog Barang ({products.length} SKU)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {products.length > 0 ? 'Produk siap dijual' : 'Tambah produk atau muat contoh'}
                  </div>
                </div>
                {products.length > 0 ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                ) : (
                  <ArrowUpRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="sb-onboarding-btn"
              >
                <div>
                  <div className="sb-eyebrow sb-mono">Langkah 02</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '4px' }}>
                    Akun Kasir POS ({cashiers.length} Akun)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {cashiers.length > 0 ? 'Kasir siap login di POS' : 'Buat akun kasir untuk staf Anda'}
                  </div>
                </div>
                {cashiers.length > 0 ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                ) : (
                  <ArrowUpRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="sb-onboarding-btn"
              >
                <div>
                  <div className="sb-eyebrow sb-mono">Langkah 03</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '4px' }}>
                    Transaksi Kasir ({activeTrxCount} Nota)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Catat penjualan tunai &amp; non-tunai
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              </button>
            </div>
          </section>
        )}

      {/* 4 Executive KPI Cards — Unified Hairline Grid */}
      <section className="sb-kpi-frame" aria-label="Ringkasan KPI Utama">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="sb-kpi-cell is-primary">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">01 / Omzet Hari Ini</span>
              <TrendingUp size={15} style={{ color: 'var(--accent-cyan)' }} />
            </div>

            <div className="sb-kpi-value" style={{ color: 'var(--accent-cyan)' }}>
              {formatRupiah(todayRevenue)}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {avgDailyRevenue > 0 ? (
                <span
                  className={`sb-status ${revVsAvgPct >= 0 ? 'sb-status-accent' : 'sb-status-warn'} sb-mono`}
                >
                  {revVsAvgPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {revVsAvgPct >= 0 ? `+${revVsAvgPct}%` : `${revVsAvgPct}%`} vs rata-rata
                </span>
              ) : (
                <span className="sb-status sb-mono">Real-time hari ini</span>
              )}
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span>{todayTransactions.length} nota hari ini</span>
            <span className="sb-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Basket: {formatRupiah(avgTicketToday)}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Omzet & Laba Kotor */}
        <div className="sb-kpi-cell">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">02 / Total Omzet &amp; Laba</span>
              <DollarSign size={15} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <div className="sb-kpi-value" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(totalRevenue)}
            </div>

            <div style={{ marginTop: '14px' }}>
              <div className="sb-progress-track">
                <div
                  className="sb-progress-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, profitMarginPct))}%`,
                    backgroundColor: 'var(--accent-cyan)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
              Laba: {formatRupiah(totalGrossProfit)}
            </span>
            <span className="sb-status sb-status-accent sb-mono">+{profitMarginPct}% Margin</span>
          </div>
        </div>

        {/* KPI 3: Valuasi Modal & Potensi Ritel */}
        <div className="sb-kpi-cell">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">03 / Valuasi Modal Stok</span>
              <Package size={15} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <div className="sb-kpi-value" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(totalStockAssetValuation)}
            </div>

            <div style={{ marginTop: '10px' }}>
              <span className="sb-status sb-mono">
                Potensi: +{formatRupiah(potentialProfitUpside)}
              </span>
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span>{totalUnitsInStock.toLocaleString('id-ID')} unit aktif</span>
            <span className="sb-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Ritel: {formatRupiah(totalPotentialSalesValuation)}
            </span>
          </div>
        </div>

        {/* KPI 4: Kesehatan Inventaris */}
        <div className={`sb-kpi-cell ${criticalProducts.length > 0 ? 'is-danger' : 'is-primary'}`}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">04 / Kesehatan Inventaris</span>
              <AlertTriangle
                size={15}
                style={{ color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}
              />
            </div>

            <div
              className="sb-kpi-value"
              style={{
                color: criticalProducts.length > 0 ? 'var(--accent-red)' : 'var(--text-primary)',
              }}
            >
              {criticalProducts.length}{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                SKU Kritis
              </span>
            </div>

            <div style={{ marginTop: '14px' }}>
              <div className="sb-progress-track">
                <div
                  className="sb-progress-fill"
                  style={{
                    width: `${stockHealthPct}%`,
                    backgroundColor:
                      stockHealthPct >= 80
                        ? 'var(--accent-cyan)'
                        : stockHealthPct >= 50
                          ? 'var(--accent-amber)'
                          : 'var(--accent-red)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span>
              {outOfStockProducts.length > 0
                ? `${outOfStockProducts.length} habis stok (0)`
                : `${products.length} total SKU`}
            </span>
            <span className="sb-status sb-mono">{stockHealthPct}% Aman</span>
          </div>
        </div>
      </section>

      {/* Main Split: Interactive Revenue & Profit Chart + Restock Priority */}
      <div className="sb-split">
        {/* Interactive Revenue & Gross Profit Chart */}
        <section className="sb-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sb-panel-header">
              <div>
                <div className="sb-eyebrow">Analitik Performa Harian &bull; Non-VOID</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  Tren Omzet &amp; Laba Kotor ({chartRange} Hari Terakhir)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  Arahkan kursor atau ketuk titik grafik untuk inspeksi rincian harian
                </p>
              </div>

              {/* Interactive Controls: Sharp StudioBlank Filter Chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="sb-chip-group" role="group" aria-label="Metrik grafik">
                  {(
                    [
                      { id: 'both', label: 'Semua' },
                      { id: 'revenue', label: 'Omzet' },
                      { id: 'profit', label: 'Laba' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChartMetric(opt.id)}
                      className={`sb-chip ${chartMetric === opt.id ? 'active' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="sb-chip-group" role="group" aria-label="Rentang hari">
                  {([7, 14] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setChartRange(days);
                        setHoveredIdx(null);
                      }}
                      className={`sb-chip ${chartRange === days ? 'active' : ''}`}
                    >
                      {days}H
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Inspector Strip & Sharp Square Legend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
              }}
            >
              {activePoint ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activePoint.fullLabel}
                  </span>
                  <span className="sb-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Omzet: {formatRupiah(activePoint.total)}
                  </span>
                  <span className="sb-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    Laba: {formatRupiah(activePoint.profit)}
                  </span>
                  <span className="sb-status sb-mono">{activePoint.count} nota</span>
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
                {(chartMetric === 'both' || chartMetric === 'revenue') && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'var(--accent-cyan)',
                        display: 'inline-block',
                      }}
                    />
                    Omzet
                  </span>
                )}
                {(chartMetric === 'both' || chartMetric === 'profit') && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        border: '1.5px solid var(--text-primary)',
                        backgroundColor: 'transparent',
                        display: 'inline-block',
                      }}
                    />
                    Laba Kotor
                  </span>
                )}
              </div>
            </div>

            {/* Flat Geometric SVG Line Plot (Zero gradients, mobile-scroll safe with crisp readable scale) */}
            <div className="sb-chart-scroll">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="sb-chart-svg"
                onMouseLeave={() => setHoveredIdx(null)}
              >
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
                        strokeDasharray={ratio === 0 ? undefined : '2 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        fill="var(--text-muted)"
                        fontSize="11"
                        fontWeight="500"
                        fontFamily="var(--font-mono)"
                        textAnchor="end"
                      >
                        {valK > 0 ? `${valK}k` : '0'}
                      </text>
                    </g>
                  );
                })}

                {(chartMetric === 'both' || chartMetric === 'revenue') && revPathD && (
                  <path
                    d={revPathD}
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="2.25"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                )}

                {(chartMetric === 'both' || chartMetric === 'profit') && profitPathD && (
                  <path
                    d={profitPathD}
                    fill="none"
                    stroke="var(--text-primary)"
                    strokeOpacity={chartMetric === 'both' ? '0.68' : '0.9'}
                    strokeWidth={chartMetric === 'both' ? '1.75' : '2.25'}
                    strokeDasharray={chartMetric === 'both' ? '4 4' : undefined}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                )}

                {/* Hover Vertical Hairline */}
                {activePoint && hoveredIdx !== null && (
                  <line
                    x1={activePoint.x}
                    y1={paddingY - 6}
                    x2={activePoint.x}
                    y2={svgHeight - paddingY}
                    stroke="var(--text-primary)"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                  />
                )}

                {points.map((pt, idx) => {
                  const isSelected = hoveredIdx === idx;
                  const showXLabel = chartRange === 7 || idx % 2 === 0 || idx === points.length - 1;
                  const revSize = isSelected ? 8 : 5;
                  const profSize = isSelected ? 7 : 4.5;
                  return (
                    <g
                      key={pt.dateKey}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onClick={() => setHoveredIdx(idx)}
                    >
                      <rect
                        x={pt.x - 18}
                        y={paddingY - 10}
                        width="36"
                        height={svgHeight - paddingY}
                        fill="transparent"
                      />

                      {(chartMetric === 'both' || chartMetric === 'revenue') && (
                        <rect
                          x={pt.x - revSize / 2}
                          y={pt.revY - revSize / 2}
                          width={revSize}
                          height={revSize}
                          fill={isSelected ? 'var(--accent-cyan)' : 'var(--bg-card)'}
                          stroke="var(--accent-cyan)"
                          strokeWidth="2"
                        />
                      )}

                      {(chartMetric === 'both' || chartMetric === 'profit') && (
                        <rect
                          x={pt.x - profSize / 2}
                          y={pt.profY - profSize / 2}
                          width={profSize}
                          height={profSize}
                          fill={isSelected ? 'var(--text-primary)' : 'var(--bg-card)'}
                          stroke="var(--text-primary)"
                          strokeWidth="1.75"
                        />
                      )}

                      {pt.total > 0 && chartRange === 7 && chartMetric !== 'profit' && (
                        <text
                          x={pt.x}
                          y={pt.revY - 10}
                          fill="var(--accent-cyan)"
                          fontSize="11"
                          fontWeight="600"
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
                          fontSize="11"
                          fontWeight={isSelected ? '700' : '500'}
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
          </div>

          {/* 3-Column Chart Footer Architectural Metrics */}
          <div className="sb-metric-bar">
            <div className="sb-metric-cell">
              <div className="sb-eyebrow">Akumulasi {chartRange} Hari</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatRupiah(periodRevenue)}
              </div>
              <div className="sb-mono" style={{ fontSize: '11px', color: 'var(--accent-green-text)' }}>
                Laba: {formatRupiah(periodProfit)}
              </div>
            </div>

            <div className="sb-metric-cell">
              <div className="sb-eyebrow">Rata-rata Harian</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatRupiah(avgDailyRevenue)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                HPP: {formatRupiah(hppTotal)}
              </div>
            </div>

            <div className="sb-metric-cell">
              <div className="sb-eyebrow">Puncak ({peakDay.dayLabel})</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {formatRupiah(peakDay.total)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {peakDay.count} transaksi selesai
              </div>
            </div>
          </div>
        </section>

        {/* Critical Stock Panel */}
        <section className="sb-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sb-panel-header">
              <div>
                <div className="sb-eyebrow">Pengawasan Stok</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  Prioritas Restock Gudang
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  SKU dengan stok menipis atau habis
                </p>
              </div>
              {criticalProducts.length > 0 && (
                <span className="sb-status sb-status-danger sb-mono">{criticalProducts.length} SKU</span>
              )}
            </div>

            {criticalProducts.length > 0 ? (
              <div className="sb-list">
                {criticalProducts.slice(0, 5).map((prod) => {
                  const isZero = prod.stock === 0;
                  const fillPct = Math.min(100, Math.round((prod.stock / Math.max(1, prod.minStock)) * 100));
                  return (
                    <div
                      key={prod.id}
                      className="sb-list-row-col"
                      style={{
                        borderLeft: `2px solid ${isZero ? 'var(--accent-red)' : 'var(--accent-amber)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {prod.name}
                          </div>
                          <div className="sb-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {prod.sku} &bull; Sisa:{' '}
                            <strong style={{ color: isZero ? 'var(--accent-red)' : 'var(--accent-amber-text)' }}>
                              {prod.stock} {prod.unit}
                            </strong>{' '}
                            (Min {prod.minStock})
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('products')}
                          className="sb-btn sb-btn-sm"
                          style={{ flexShrink: 0 }}
                        >
                          Restock
                        </button>
                      </div>

                      <div className="sb-progress-track">
                        <div
                          className="sb-progress-fill"
                          style={{
                            width: `${fillPct}%`,
                            backgroundColor: isZero ? 'var(--accent-red)' : 'var(--accent-amber)',
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
                  padding: '32px 18px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-green-text)',
                }}
              >
                <CheckCircle2 size={22} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--accent-cyan)' }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  Seluruh Stok Aman
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 300 }}>
                  Semua produk berada di atas batas minimum inventaris.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="sb-btn sb-btn-full"
          >
            <span>Kelola Seluruh Katalog ({products.length} SKU)</span>
            <ArrowUpRight size={14} />
          </button>
        </section>
      </div>

      {/* Executive Analytics Row 1: Payment Methods Donut & Top Performing Products */}
      <div className="sb-grid-2">
        {/* Payment Method Donut + Distribution */}
        <section className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-eyebrow">Kanal Pembayaran</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <CreditCard size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Komposisi Metode Pembayaran</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Rasio transaksi tunai vs pembayaran digital (non-tunai)
              </p>
            </div>
            <span className="sb-status sb-status-accent sb-mono">Digital: {digitalSharePct}%</span>
          </div>

          <div className="sb-donut-layout">
            {/* Flat Geometric Donut Chart */}
            <div style={{ position: 'relative', width: '144px', height: '144px', flexShrink: 0 }}>
              <svg viewBox="0 0 140 140" style={{ width: '144px', height: '144px', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--border-color)"
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
                          strokeLinecap="butt"
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
                <span className="sb-mono" style={{ fontSize: '20px', fontWeight: 600 }}>
                  {activeTrxCount}
                </span>
                <span className="sb-eyebrow" style={{ fontSize: '9.5px', marginTop: '2px' }}>
                  Total Nota
                </span>
              </div>
            </div>

            {/* Method Breakdown Rows */}
            <div className="sb-list" style={{ width: '100%' }}>
              {paymentBreakdown.map((item) => {
                const accent = PAYMENT_ACCENTS[item.method];
                return (
                  <div key={item.method} className="sb-list-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          backgroundColor: accent.color,
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.method}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.count} transaksi &bull; {accent.label}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="sb-mono" style={{ fontWeight: 600, fontSize: '13px' }}>
                        {formatRupiah(item.total)}
                      </div>
                      <div
                        className="sb-mono"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: item.method === 'QRIS' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        }}
                      >
                        {item.sharePct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Top 5 Best Selling Products */}
        <section className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-eyebrow">Peringkat Penjualan</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Award size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Produk Terlaris (Top Performing SKU)</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Kontribusi omzet tertinggi berdasarkan transaksi selesai
              </p>
            </div>
            <span className="sb-status sb-mono">Top 5</span>
          </div>

          <div className="sb-list">
            {topProducts.map((prod, idx) => {
              const maxRev = topProducts[0]?.revenue || 1;
              const widthPct = Math.max(10, Math.round((prod.revenue / maxRev) * 100));
              const barColor =
                idx === 0
                  ? 'var(--accent-cyan)'
                  : idx === 1
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)';
              return (
                <div key={prod.sku} className="sb-list-row-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        className="sb-mono"
                        style={{
                          width: '26px',
                          height: '26px',
                          border: `1px solid ${idx === 0 ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                          backgroundColor: idx === 0 ? 'var(--accent-cyan)' : 'transparent',
                          color: idx === 0 ? 'var(--accent-cyan-text)' : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        0{idx + 1}
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
                        <div className="sb-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {prod.sku}
                          {prod.category ? ` • ${prod.category}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span className="sb-status sb-mono">{prod.qty} terjual</span>
                      <span
                        className="sb-mono"
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        }}
                      >
                        {formatRupiah(prod.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="sb-progress-track">
                    <div
                      className="sb-progress-fill"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Belum ada data penjualan produk.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Executive Analytics Row 2: Category Performance & Stock Audit Feed */}
      <div className="sb-grid-2">
        {/* Category Performance */}
        <section className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-eyebrow">Segmentasi Katalog</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Layers size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Performa &amp; Stok Per Kategori</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Sebaran pendapatan dan ketersediaan unit barang di setiap kategori
              </p>
            </div>
          </div>

          <div className="sb-list">
            {categoryPerformance.map((cat) => {
              const isLeading = cat.revenue > 0 && cat.revenue === maxCategoryRevenue;
              const indicatorColor = isLeading ? 'var(--accent-cyan)' : 'var(--text-secondary)';
              return (
                <div key={cat.category} className="sb-list-row-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: indicatorColor,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{cat.category}</span>
                      <span className="sb-status sb-mono">
                        {cat.skuCount} SKU / {cat.stockUnits} unit
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="sb-mono" style={{ fontWeight: 600, fontSize: '13px' }}>
                        {formatRupiah(cat.revenue)}
                      </span>
                      <span
                        className="sb-mono"
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: isLeading ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        }}
                      >
                        {cat.sharePct}%
                      </span>
                    </div>
                  </div>
                  <div className="sb-progress-track">
                    <div
                      className="sb-progress-fill"
                      style={{
                        width: `${Math.max(cat.revenue > 0 ? 5 : 0, cat.sharePct)}%`,
                        backgroundColor: indicatorColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Warehouse Audit Feed & Active Cashier Snapshot */}
        <section className="sb-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sb-panel-header">
              <div>
                <div className="sb-eyebrow">Audit Inventaris</div>
                <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <ClipboardList size={15} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Aktivitas Mutasi Gudang Terbaru</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  Audit perubahan stok masuk, keluar, dan opname terakhir
                </p>
              </div>
              <button type="button" onClick={() => setActiveTab('products')} className="sb-btn sb-btn-sm">
                <span>Semua Log</span>
              </button>
            </div>

            {stockLogs.length > 0 ? (
              <div className="sb-list">
                {stockLogs.slice(0, 4).map((log) => {
                  const statusClass =
                    log.type === 'IN'
                      ? 'sb-status-accent'
                      : log.type === 'OUT'
                        ? 'sb-status-warn'
                        : '';
                  const sign = log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : '';
                  return (
                    <div key={log.id} className="sb-list-row">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`sb-status ${statusClass} sb-mono`}>
                            {log.type} {sign}
                            {log.quantity}
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
                            {log.productName}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {log.reason} &bull; <span className="sb-mono">{log.operator}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="sb-mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                          {log.previousStock} &rarr; {log.newStock}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Belum ada log mutasi stok gudang.
              </div>
            )}
          </div>

          <div
            style={{
              padding: '14px 16px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
              <Users size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>
                Tim Kasir Toko: <strong>{activeCashiersCount} Aktif</strong> dari {cashiers.length} akun terdaftar
              </span>
            </div>
            <button type="button" onClick={() => setActiveTab('settings')} className="sb-btn sb-btn-sm">
              <span>Kelola Kasir</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
      </div>

      {/* Recent Transactions Table */}
      <section className="sb-panel" style={{ padding: 0, gap: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div className="sb-eyebrow">Log Terminal Kasir</div>
            <h3 className="sb-h2" style={{ marginTop: '4px' }}>
              Transaksi Penjualan Terbaru
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
              5 aktivitas transaksi terakhir yang tercatat di terminal kasir toko Anda
            </p>
          </div>
          <button type="button" onClick={() => setActiveTab('reports')} className="sb-btn sb-btn-sm">
            <span>Buka Laporan Lengkap</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="sip-table-container desktop-table-wrap" style={{ border: 'none' }}>
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
                      className="sb-mono"
                      style={{
                        fontWeight: 600,
                        color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)',
                      }}
                    >
                      {trx.invoiceNo}
                      {isVoided && (
                        <span className="sb-status sb-status-danger sb-mono" style={{ marginLeft: '8px' }}>
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
                      <span className="sb-status sb-mono">{trx.paymentMethod}</span>
                    </td>
                    <td
                      className="sb-mono"
                      style={{
                        fontWeight: 600,
                        textDecoration: isVoided ? 'line-through' : 'none',
                        color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {formatRupiah(trx.total)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(trx)}
                        className="sb-btn sb-btn-sm"
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Belum ada transaksi penjualan yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Recent Transactions Cards */}
        <div className="mobile-card-list">
          {transactions.slice(0, 5).map((trx) => {
            const isVoided = trx.status === 'VOIDED';
            return (
              <div key={trx.id} className="sb-mobile-trx-row" style={{ opacity: isVoided ? 0.68 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="sb-mono"
                    style={{
                      fontWeight: 600,
                      fontSize: '13.5px',
                      color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)',
                    }}
                  >
                    {trx.invoiceNo}
                  </span>
                  <span className="sb-status sb-mono">{trx.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>{formatDateTime(trx.createdAt)}</span>
                  <span>{trx.cashierName}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    className="sb-mono"
                    style={{
                      fontWeight: 600,
                      fontSize: '15px',
                      textDecoration: isVoided ? 'line-through' : 'none',
                    }}
                  >
                    {formatRupiah(trx.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(trx)}
                    className="sb-btn sb-btn-sm"
                  >
                    <Eye size={13} />
                    <span>Nota</span>
                  </button>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Belum ada transaksi penjualan yang tercatat.
            </div>
          )}
        </div>
      </section>
      </div>

      {selectedReceipt && (
        <ReceiptModal transaction={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </>
  );
}
