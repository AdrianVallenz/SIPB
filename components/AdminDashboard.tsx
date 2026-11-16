'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PaymentMethod, ProductCategory } from '@/lib/types';
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

function formatShortAmount(val: number): string {
  if (val <= 0) return '0';
  if (val >= 1_000_000) {
    const jt = val / 1_000_000;
    return `${jt >= 10 ? Math.round(jt) : Number(jt.toFixed(1)).toString().replace('.', ',')}jt`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}rb`;
  }
  return String(Math.round(val));
}

export default function AdminDashboard() {
  const {
    user,
    products,
    categories,
    transactions,
    stockLogs,
    cashiers,
    setActiveTab,
  } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(7);
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
    topProducts,
    paymentBreakdown,
    categoryPerformance,
    digitalSharePct,
    activeCashiersCount,
  } = useMemo(() => {
    const todayKey = getLocalDateKey();
    const productMetaMap = new Map<string, { buyPrice: number; category: ProductCategory }>();

    let stockAssetVal = 0;
    let potentialSalesVal = 0;
    let unitsInStock = 0;
    const critical: typeof products = [];
    const outOfStock: typeof products = [];
    const stockByCat = new Map<ProductCategory, { skuCount: number; stockUnits: number }>(
      categories.map((c) => [c, { skuCount: 0, stockUnits: 0 }])
    );

    // Single O(P) pass: build lookup map + compute inventory valuation & category stock
    for (const p of products) {
      productMetaMap.set(p.id, { buyPrice: p.buyPrice, category: p.category });
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
      categories.map((c) => [c, { revenue: 0, unitsSold: 0 }])
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
        const meta = productMetaMap.get(item.productId);
        const unitCost =
          item.buyPrice ?? meta?.buyPrice ?? Math.round(item.price * 0.78);
        trxCost += unitCost * item.quantity;

        const cat = meta?.category;
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

    const catList = categories.map((category) => {
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
      topProducts: sortedTopProducts,
      paymentBreakdown: paymentList,
      categoryPerformance: catList,
      digitalSharePct: revTotal > 0 ? Math.round((digitalTotal / revTotal) * 100) : 0,
      activeCashiersCount: cashiers.reduce((acc, c) => acc + (c.isActive ? 1 : 0), 0),
    };
  }, [products, categories, transactions, cashiers, chartRange]);

  const maxChartVal = useMemo(
    () =>
      Math.max(
        ...chartData.map((d) => (chartMetric === 'profit' ? Math.max(d.profit, 0) : d.total)),
        250000
      ),
    [chartData, chartMetric]
  );

  const svgWidth = 560;
  const svgHeight = 236;
  const paddingLeft = 62;
  const paddingRight = 28;
  const paddingTop = 34;
  const paddingBottom = 32;
  const plotStartX = paddingLeft + 22;
  const plotEndX = svgWidth - paddingRight - 14;
  const plotWidth = plotEndX - plotStartX;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = svgHeight - paddingBottom;

  const points = chartData.map((d, index) => {
    const x =
      chartData.length > 1
        ? plotStartX + (index / (chartData.length - 1)) * plotWidth
        : svgWidth / 2;
    const revY = baselineY - (d.total / maxChartVal) * plotHeight;
    const profY = baselineY - (Math.max(0, d.profit) / maxChartVal) * plotHeight;
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="sb-status sb-status-solid">
                <Activity size={11} /> Panel Kendali Toko
              </span>
              <span className="sb-status">
                <Calendar size={11} />
                {formattedTodayDate}
              </span>
            </div>

            <h2 className="sb-h1">
              <span style={{ fontWeight: 300 }}>Selamat bertugas, </span>
              <span style={{ fontWeight: 700 }}>{user?.name || 'Pemilik Toko'}</span>
            </h2>

            <p className="sb-subtitle" style={{ maxWidth: '640px' }}>
              Pantau pemasukan uang, keuntungan bersih, ketersediaan barang dagangan, dan aktivitas kasir toko Anda dalam satu tampilan praktis.
            </p>
          </div>

          <div className="sb-toolbar">
            <button type="button" onClick={() => setActiveTab('settings')} className="sb-btn">
              <Users size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>{activeCashiersCount} Staf Kasir Siap</span>
            </button>
            <button type="button" onClick={() => setActiveTab('products')} className="sb-btn">
              <Boxes size={13} />
              <span>Kelola Produk &amp; Stok</span>
            </button>
            <button type="button" onClick={() => setActiveTab('reports')} className="sb-btn">
              <FileSpreadsheet size={13} />
              <span>Laporan Penjualan</span>
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
                <div className="sb-eyebrow">Panduan Cepat Memulai</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  3 Langkah Mudah Menjalankan Toko Anda
                </h3>
              </div>
              <span className="sb-status sb-status-accent">Persiapan Awal</span>
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
                    Daftar Produk &amp; Harga ({products.length} Barang)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {products.length > 0
                      ? 'Produk sudah siap dijual di kasir'
                      : 'Input harga beli & jual agar laba otomatis terhitung'}
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
                    Akses Staf Kasir ({cashiers.length} Akun)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {cashiers.length > 0
                      ? 'Staf kasir siap melayani pembeli'
                      : 'Buat akun staf agar data laba pemilik tetap aman'}
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
                    Mulai Layani Transaksi ({activeTrxCount} Penjualan)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Terima bayar tunai/QRIS, cetak struk, dan kurangi stok otomatis
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
              <span className="sb-eyebrow">01 / Pemasukan Hari Ini</span>
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
                <span className="sb-status sb-mono">Pemasukan real-time hari ini</span>
              )}
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span>{todayTransactions.length} nota transaksi hari ini</span>
            <span className="sb-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Rata-rata: {formatRupiah(avgTicketToday)}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Omzet & Laba Bersih */}
        <div className="sb-kpi-cell">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">02 / Total Penjualan &amp; Laba</span>
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
              Keuntungan Bersih: {formatRupiah(totalGrossProfit)}
            </span>
            <span className="sb-status sb-status-accent sb-mono">+{profitMarginPct}% Margin</span>
          </div>
        </div>

        {/* KPI 3: Valuasi Modal & Potensi Ritel */}
        <div className="sb-kpi-cell">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">03 / Modal Tertanam di Stok</span>
              <Package size={15} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <div className="sb-kpi-value" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(totalStockAssetValuation)}
            </div>

            <div style={{ marginTop: '10px' }}>
              <span className="sb-status sb-mono">
                Potensi Keuntungan: +{formatRupiah(potentialProfitUpside)}
              </span>
            </div>
          </div>

          <div className="sb-kpi-footer">
            <span>{totalUnitsInStock.toLocaleString('id-ID')} unit barang di toko</span>
            <span className="sb-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Nilai Jual: {formatRupiah(totalPotentialSalesValuation)}
            </span>
          </div>
        </div>

        {/* KPI 4: Kesehatan Inventaris */}
        <div className={`sb-kpi-cell ${criticalProducts.length > 0 ? 'is-danger' : 'is-primary'}`}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="sb-eyebrow">04 / Peringatan Stok Menipis</span>
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
                Barang Kritis
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
                ? `${outOfStockProducts.length} produk sudah habis!`
                : `${products.length} total jenis barang`}
            </span>
            <span className="sb-status sb-mono">{stockHealthPct}% Stok Aman</span>
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
                <div className="sb-eyebrow">Grafik Penjualan Toko</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  Tren Omzet &amp; Keuntungan Bersih ({chartRange} Hari Terakhir)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  Arahkan kursor atau ketuk titik grafik untuk melihat rincian omzet dan laba per hari
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
                  {([7, 14, 30] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setChartRange(days);
                        setHoveredIdx(null);
                      }}
                      className={`sb-chip ${chartRange === days ? 'active' : ''}`}
                    >
                      {days} Hari
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
                gap: '10px 14px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
              }}
            >
              {activePoint ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px 14px', flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activePoint.fullLabel}
                  </span>
                  <span className="sb-status sb-mono">{activePoint.count} nota</span>
                  <span className="sb-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Omzet: {formatRupiah(activePoint.total)}
                  </span>
                  <span className="sb-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    Laba: {formatRupiah(activePoint.profit)}
                  </span>
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px' }}>
                {(chartMetric === 'both' || chartMetric === 'revenue') && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'var(--accent-cyan)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    Total Omzet
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
                        flexShrink: 0,
                      }}
                    />
                    Laba Bersih
                  </span>
                )}
              </div>
            </div>

            {/* Flat Geometric SVG Bar + Line Plot (Mobile-safe, zero clipping) */}
            <div className="sb-chart-scroll">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="sb-chart-svg"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = baselineY - ratio * plotHeight;
                  const axisVal = maxChartVal * ratio;
                  return (
                    <g key={i}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="var(--border-color)"
                        strokeDasharray={ratio === 0 ? undefined : '2 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        fill="var(--text-muted)"
                        fontSize="10.5"
                        fontWeight="500"
                        fontFamily="var(--font-mono)"
                        textAnchor="end"
                      >
                        {formatShortAmount(axisVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Subtle Vertical Data Bars Behind Points */}
                {points.map((pt, idx) => {
                  const isSelected = hoveredIdx === idx;
                  const barWidth = chartRange === 7 ? 24 : chartRange === 14 ? 12 : 6;
                  const revBarH = Math.max(0, baselineY - pt.revY);
                  const profBarH = Math.max(0, baselineY - pt.profY);
                  return (
                    <g key={`bar-${pt.dateKey}`}>
                      {(chartMetric === 'both' || chartMetric === 'revenue') && revBarH > 0 && (
                        <rect
                          x={pt.x - barWidth / 2}
                          y={pt.revY}
                          width={barWidth}
                          height={revBarH}
                          fill="var(--accent-cyan)"
                          fillOpacity={isSelected ? '0.24' : '0.11'}
                        />
                      )}
                      {chartMetric === 'profit' && profBarH > 0 && (
                        <rect
                          x={pt.x - barWidth / 2}
                          y={pt.profY}
                          width={barWidth}
                          height={profBarH}
                          fill="var(--text-primary)"
                          fillOpacity={isSelected ? '0.22' : '0.10'}
                        />
                      )}
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
                    strokeOpacity={chartMetric === 'both' ? '0.72' : '0.9'}
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
                    y1={paddingTop - 8}
                    x2={activePoint.x}
                    y2={baselineY}
                    stroke="var(--text-primary)"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                  />
                )}

                {points.map((pt, idx) => {
                  const isSelected = hoveredIdx === idx;
                  const showXLabel =
                    chartRange === 7 ||
                    (chartRange === 14
                      ? idx % 2 === 0 || idx === points.length - 1
                      : idx % 5 === 0 || idx === points.length - 1);
                  const revSize = isSelected ? 8 : chartRange === 30 ? 4 : 5.5;
                  const profSize = isSelected ? 7 : chartRange === 30 ? 3.5 : 4.5;
                  const valLabelY = Math.max(15, (chartMetric === 'profit' ? pt.profY : pt.revY) - 10);
                  const displayVal = chartMetric === 'profit' ? Math.max(0, pt.profit) : pt.total;
                  return (
                    <g
                      key={pt.dateKey}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onClick={() => setHoveredIdx(idx)}
                    >
                      <rect
                        x={pt.x - 18}
                        y={paddingTop - 12}
                        width="36"
                        height={svgHeight - paddingTop + 6}
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

                      {displayVal > 0 && (isSelected || idx === points.length - 1) && (
                        <text
                          x={pt.x}
                          y={valLabelY}
                          fill={chartMetric === 'profit' ? 'var(--text-primary)' : 'var(--accent-cyan)'}
                          fontSize="10.5"
                          fontWeight="600"
                          fontFamily="var(--font-mono)"
                          textAnchor="middle"
                        >
                          {formatShortAmount(displayVal)}
                        </text>
                      )}

                      {showXLabel && (
                        <text
                          x={pt.x}
                          y={svgHeight - 8}
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
              <div className="sb-eyebrow">Total {chartRange} Hari Terakhir</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatRupiah(periodRevenue)}
              </div>
              <div className="sb-mono" style={{ fontSize: '11px', color: 'var(--accent-green-text)' }}>
                Keuntungan: {formatRupiah(periodProfit)}
              </div>
            </div>

            <div className="sb-metric-cell">
              <div className="sb-eyebrow">Rata-rata Penjualan Harian</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatRupiah(avgDailyRevenue)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Modal Barang (HPP): {formatRupiah(hppTotal)}
              </div>
            </div>

            <div className="sb-metric-cell">
              <div className="sb-eyebrow">Hari Paling Ramai ({peakDay.dayLabel})</div>
              <div className="sb-mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {formatRupiah(peakDay.total)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {peakDay.count} nota penjualan selesai
              </div>
            </div>
          </div>
        </section>

        {/* Critical Stock Panel */}
        <section className="sb-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sb-panel-header">
              <div>
                <div className="sb-eyebrow">Pengawasan Stok Toko</div>
                <h3 className="sb-h2" style={{ marginTop: '4px' }}>
                  Barang Menipis Perlu Dipesan Ulang
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  Segera pesan ke supplier sebelum barang habis agar pembeli tidak kecewa
                </p>
              </div>
              {criticalProducts.length > 0 && (
                <span className="sb-status sb-status-danger sb-mono">{criticalProducts.length} Barang</span>
              )}
            </div>

            {criticalProducts.length > 0 ? (
              <div className="sb-list">
                {criticalProducts.slice(0, 5).map((prod) => {
                  const isZero = prod.stock === 0;
                  const fillPct = isZero
                    ? 8
                    : Math.max(12, Math.min(100, Math.round((prod.stock / Math.max(1, prod.minStock)) * 100)));
                  return (
                    <div
                      key={prod.id}
                      className="sb-list-row-col"
                      style={{
                        borderLeft: `2px solid ${isZero ? 'var(--accent-red)' : 'var(--accent-amber)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
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
                            (Min. {prod.minStock})
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
                  Semua Stok Masih Aman
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 300 }}>
                  Seluruh barang dagangan berada di atas batas minimal. Anda tidak perlu khawatir kehabisan stok hari ini.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="sb-btn sb-btn-full"
          >
            <span>Lihat &amp; Kelola Semua Barang ({products.length} Produk)</span>
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
              <div className="sb-eyebrow">Pilihan Pembayaran Pembeli</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <CreditCard size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Komposisi Pembayaran (Tunai vs Non-Tunai)</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Ketahui kebiasaan bayar pembeli (Tunai, QRIS, Transfer, Debit) untuk memudahkan rekonsiliasi uang fisik kasir
              </p>
            </div>
            <span className="sb-status sb-status-accent sb-mono">Non-Tunai: {digitalSharePct}%</span>
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

            {/* Method Breakdown Rows with Visual Data Bars */}
            <div className="sb-list" style={{ width: '100%' }}>
              {paymentBreakdown.map((item) => {
                const accent = PAYMENT_ACCENTS[item.method];
                const barWidthPct = item.total > 0 ? Math.max(8, item.sharePct) : 0;
                return (
                  <div key={item.method} className="sb-list-row-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
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

                    <div className="sb-progress-track">
                      <div
                        className="sb-progress-fill"
                        style={{
                          width: `${barWidthPct}%`,
                          backgroundColor: accent.color,
                        }}
                      />
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
              <div className="sb-eyebrow">Produk Unggulan</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Award size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>5 Produk Paling Cepat Terjual</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Barang yang paling banyak diminati pembeli dan menghasilkan perputaran omzet tertinggi
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                      <span
                        className="sb-mono"
                        style={{
                          width: '24px',
                          height: '24px',
                          border: `1px solid ${idx === 0 ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                          backgroundColor: idx === 0 ? 'var(--accent-cyan)' : 'transparent',
                          color: idx === 0 ? 'var(--accent-cyan-text)' : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        0{idx + 1}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
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
                        <div className="sb-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {prod.sku}
                          {prod.category ? ` • ${prod.category}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        className="sb-mono"
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        }}
                      >
                        {formatRupiah(prod.revenue)}
                      </div>
                      <div className="sb-mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {prod.qty} terjual
                      </div>
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
              <div className="sb-eyebrow">Pengelompokan Barang</div>
              <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Layers size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Kontribusi Penjualan Per Kategori</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                Ketahui kategori barang apa yang paling menghasilkan laba dan seberapa banyak sisa stoknya
              </p>
            </div>
          </div>

          <div className="sb-list">
            {categoryPerformance.map((cat) => {
              const isLeading = cat.revenue > 0 && cat.revenue === maxCategoryRevenue;
              const indicatorColor = isLeading ? 'var(--accent-cyan)' : 'var(--text-secondary)';
              const barWidthPct =
                cat.revenue > 0
                  ? Math.max(10, Math.round((cat.revenue / maxCategoryRevenue) * 100))
                  : 0;
              return (
                <div key={cat.category} className="sb-list-row-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: indicatorColor,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{cat.category}</span>
                      </div>
                      <div className="sb-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', paddingLeft: '16px' }}>
                        {cat.skuCount} SKU &bull; {cat.stockUnits} unit stok
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="sb-mono" style={{ fontWeight: 600, fontSize: '13px' }}>
                        {formatRupiah(cat.revenue)}
                      </div>
                      <div
                        className="sb-mono"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isLeading ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          marginTop: '2px',
                        }}
                      >
                        {cat.sharePct}% omzet
                      </div>
                    </div>
                  </div>
                  <div className="sb-progress-track">
                    <div
                      className="sb-progress-fill"
                      style={{
                        width: `${barWidthPct}%`,
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
                <div className="sb-eyebrow">Catatan Keluar-Masuk Barang</div>
                <h3 className="sb-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <ClipboardList size={15} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Riwayat Mutasi Stok Terkini</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
                  Pencatatan barang masuk dari supplier, barang keluar/rusak, dan penyesuaian stok fisik secara transparan
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
                Belum ada riwayat mutasi stok barang.
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
                Akses Staf Kasir: <strong>{activeCashiersCount} Kasir Siap Bertugas</strong> dari {cashiers.length} akun terdaftar
              </span>
            </div>
            <button type="button" onClick={() => setActiveTab('settings')} className="sb-btn sb-btn-sm">
              <span>Atur Akun Kasir</span>
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
            <div className="sb-eyebrow">Riwayat Kasir</div>
            <h3 className="sb-h2" style={{ marginTop: '4px' }}>
              Nota Penjualan Terbaru
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 300 }}>
              5 penjualan terakhir yang baru saja dilayani di kasir toko Anda
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
                <th>Waktu Transaksi</th>
                <th>Petugas Kasir</th>
                <th>Barang yang Dibeli</th>
                <th>Metode Bayar</th>
                <th>Total Bayar</th>
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
