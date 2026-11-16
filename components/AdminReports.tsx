'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PAYMENT_METHODS } from '@/lib/types';
import { formatRupiah, formatDateTime, getLocalDateKey, sanitizeCsvCell } from '@/lib/format';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import ReceiptModal from './ReceiptModal';
import PaginationBar from './PaginationBar';
import {
  Search,
  Printer,
  Download,
  Eye,
  Ban,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function AdminReports() {
  const { user, transactions, products, paymentSettings, voidTransaction } = useApp();
  const { settings: printerSettings } = useBluetoothPrinter();

  const todayKey = getLocalDateKey(new Date());
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(todayKey);
  const [customEndDate, setCustomEndDate] = useState<string>(todayKey);
  const [methodFilter, setMethodFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);

  // Void Modal State
  const [voidingTrx, setVoidingTrx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidError, setVoidError] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productBuyMap = useMemo(
    () => new Map(products.map((p) => [p.id, p.buyPrice])),
    [products]
  );

  const {
    filteredTransactions,
    activeTransactions,
    totalOmzet,
    totalSubtotal,
    totalDiscount,
    voidedCount,
    totalProfit,
    totalItemsSold,
    averageTransaction,
    paymentRecap,
  } = useMemo(() => {
    const now = new Date();
    const past7StartMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    ).getTime();
    const past30StartMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
      0,
      0,
      0,
      0
    ).getTime();
    const q = searchQuery.trim().toLowerCase();

    const filtered = transactions.filter((t) => {
      let matchesDate = true;
      const trxKey = getLocalDateKey(t.createdAt);
      if (dateFilter === 'today') {
        matchesDate = trxKey === todayKey;
      } else if (dateFilter === '7days') {
        matchesDate = Date.parse(t.createdAt) >= past7StartMs;
      } else if (dateFilter === '30days') {
        matchesDate = Date.parse(t.createdAt) >= past30StartMs;
      } else if (dateFilter === 'custom') {
        const minDate =
          customStartDate && customEndDate && customStartDate > customEndDate
            ? customEndDate
            : customStartDate;
        const maxDate =
          customStartDate && customEndDate && customStartDate > customEndDate
            ? customStartDate
            : customEndDate;
        if (minDate && trxKey < minDate) matchesDate = false;
        if (maxDate && trxKey > maxDate) matchesDate = false;
      }

      const matchesMethod = methodFilter === 'Semua' || t.paymentMethod === methodFilter;
      const matchesSearch =
        !q ||
        t.invoiceNo.toLowerCase().includes(q) ||
        t.cashierName.toLowerCase().includes(q) ||
        t.items.some((i) => i.name.toLowerCase().includes(q));

      return matchesDate && matchesMethod && matchesSearch;
    });

    const active: Transaction[] = [];
    let omzet = 0;
    let subtotal = 0;
    let discount = 0;
    let voided = 0;
    let profit = 0;
    let itemsSold = 0;
    const byMethod = new Map<string, { count: number; total: number }>();

    for (const t of filtered) {
      if (t.status === 'VOIDED') {
        voided += 1;
        continue;
      }
      active.push(t);
      omzet += t.total;
      subtotal += t.subtotal;
      discount += t.discount;
      const prev = byMethod.get(t.paymentMethod) ?? { count: 0, total: 0 };
      byMethod.set(t.paymentMethod, { count: prev.count + 1, total: prev.total + t.total });

      let cogs = 0;
      for (const i of t.items) {
        itemsSold += i.quantity;
        const unitBuy = i.buyPrice ?? productBuyMap.get(i.productId) ?? Math.round(i.price * 0.78);
        cogs += unitBuy * i.quantity;
      }
      profit += t.total - cogs;
    }

    const avg = active.length > 0 ? Math.round(omzet / active.length) : 0;
    const recap = Array.from(byMethod.entries())
      .map(([method, stats]) => ({ method, count: stats.count, total: stats.total }))
      .sort((a, b) => b.total - a.total);

    return {
      filteredTransactions: filtered,
      activeTransactions: active,
      totalOmzet: omzet,
      totalSubtotal: subtotal,
      totalDiscount: discount,
      voidedCount: voided,
      totalProfit: profit,
      totalItemsSold: itemsSold,
      averageTransaction: avg,
      paymentRecap: recap,
    };
  }, [
    transactions,
    productBuyMap,
    dateFilter,
    customStartDate,
    customEndDate,
    methodFilter,
    searchQuery,
    todayKey,
  ]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [isPrintingAll, setIsPrintingAll] = useState<boolean>(false);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    if (isPrintingAll) return filteredTransactions;
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize, isPrintingAll]);

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'No. Nota',
      'Status',
      'Waktu Transaksi',
      'Kasir',
      'Metode Bayar',
      'Jumlah Item (Pcs)',
      'Subtotal',
      'Diskon',
      'Total Bayar',
      'Estimasi Laba Bersih',
      'Keterangan Void',
    ];
    const rows = filteredTransactions.map((t) => {
      const cogs = t.items.reduce((s, i) => {
        const unitBuy = i.buyPrice ?? productBuyMap.get(i.productId) ?? Math.round(i.price * 0.78);
        return s + unitBuy * i.quantity;
      }, 0);
      const netProfit = t.status === 'VOIDED' ? 0 : t.total - cogs;
      return [
        sanitizeCsvCell(t.invoiceNo),
        sanitizeCsvCell(t.status === 'VOIDED' ? 'VOID / DIBATALKAN' : 'SELESAI'),
        sanitizeCsvCell(formatDateTime(t.createdAt, true)),
        sanitizeCsvCell(t.cashierName),
        sanitizeCsvCell(t.paymentMethod),
        t.items.reduce((s, i) => s + i.quantity, 0),
        t.subtotal,
        t.discount,
        t.status === 'VOIDED' ? 0 : t.total,
        netProfit,
        sanitizeCsvCell(t.voidReason || '-'),
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan-Penjualan-SIP-${todayKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isPrintingAll || typeof window === 'undefined') return;
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    const printTimer = setTimeout(() => {
      window.print();
    }, 80);
    return () => {
      clearTimeout(printTimer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrintingAll]);

  const handlePrintReport = () => {
    if (typeof window === 'undefined') return;
    setIsPrintingAll(true);
  };

  const reportStoreName =
    printerSettings.storeName && printerSettings.storeName !== 'SIP BARANG'
      ? printerSettings.storeName
      : paymentSettings.qrisMerchantName?.trim() || printerSettings.storeName || 'SIP BARANG';

  const activePeriodLabel =
    dateFilter === 'today'
      ? `Hari Ini (${todayKey})`
      : dateFilter === '7days'
        ? '7 Hari Terakhir'
        : dateFilter === '30days'
          ? '30 Hari Terakhir'
          : dateFilter === 'custom'
            ? `${customStartDate || '-'} s/d ${customEndDate || '-'}`
            : 'Semua Periode Waktu';

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingTrx) return;
    setVoidError('');

    const res = voidTransaction(
      voidingTrx.id,
      voidReason || 'Pembatalan nota / retur barang oleh Administrator'
    );
    if (!res.success) {
      setVoidError(res.error || 'Gagal membatalkan transaksi.');
      return;
    }

    const inv = voidingTrx.invoiceNo;
    setVoidingTrx(null);
    setVoidReason('');
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMsg(
      `Nota ${inv} berhasil dibatalkan (Void). Seluruh stok item terkait telah dikembalikan otomatis ke gudang.`
    );
    feedbackTimerRef.current = setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="page-container">
      {/* Official Print Report Header (Visible only in Print / PDF) */}
      <div className="print-report-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            borderBottom: '2.5px solid #0F172A',
            paddingBottom: '12px',
            marginBottom: '6px',
          }}
        >
          <div style={{ borderLeft: '4px solid #047857', paddingLeft: '12px' }}>
            <div style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>
              {reportStoreName}
            </div>
            {printerSettings.storeTagline && (
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#047857', marginTop: '2px' }}>
                {printerSettings.storeTagline}
              </div>
            )}
            {(printerSettings.storeAddress || printerSettings.storePhone) && (
              <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                {[
                  printerSettings.storeAddress,
                  printerSettings.storePhone ? `Telp: ${printerSettings.storePhone}` : '',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            )}
          </div>

          <div
            style={{
              textAlign: 'right',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '8px 12px',
              minWidth: '250px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em', color: '#047857' }}>
              LAPORAN TRANSAKSI PENJUALAN
            </div>
            <div style={{ fontSize: '10.5px', color: '#334155', marginTop: '4px', lineHeight: 1.5 }}>
              <div>
                <strong>Periode:</strong> {activePeriodLabel}
              </div>
              <div>
                <strong>Metode Bayar:</strong> {methodFilter}
              </div>
              <div>
                <strong>Dicetak:</strong> {formatDateTime(new Date().toISOString(), true)}
              </div>
              <div>
                <strong>Operator:</strong> {user?.name || 'Administrator'} &bull; {filteredTransactions.length} baris ({activeTransactions.length} sah{voidedCount > 0 ? `, ${voidedCount} void` : ''})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="page-header no-print">
        <div>
          <h2 className="page-title">Laporan Transaksi Penjualan</h2>
          <p className="page-subtitle">
            Rekapitulasi seluruh nota penjualan, pembatalan nota (Void/Retur), dan ekspor data laporan.
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCsv}
            disabled={filteredTransactions.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="btn btn-primary btn-sm"
          >
            <Printer size={14} />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="alert-box-info">
          <CheckCircle2 size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="kpi-grid">
        <div className="sip-card print-kpi-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Total Omzet Bersih
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(totalOmzet)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-green-text)', marginTop: '4px', fontWeight: 600 }}>
            Est. Laba Bersih: <span className="font-mono">{formatRupiah(totalProfit)}</span>
          </div>
        </div>

        <div className="sip-card print-kpi-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Nota Sah / Aktif
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
            {activeTransactions.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
              Nota
            </span>
          </div>
          {voidedCount > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px', fontWeight: 600 }}>
              {voidedCount} Nota Dibatalkan (Void)
            </div>
          )}
        </div>

        <div className="sip-card print-kpi-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Unit Barang Terjual
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-green-text)' }}>
            {totalItemsSold}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Pcs</span>
          </div>
        </div>

        <div className="sip-card print-kpi-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Rata-Rata Nilai Nota
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
            {formatRupiah(averageTransaction)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="sip-card no-print" style={{ padding: '14px 18px' }}>
        <div className="filter-grid-3">
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Cari nomor nota, nama kasir, atau item barang..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="sip-input"
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '36px' : '13px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                aria-label="Hapus pencarian"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as 'today' | '7days' | '30days' | 'custom' | 'all');
                setCurrentPage(1);
              }}
              className="sip-select"
              aria-label="Filter Periode Tanggal"
            >
              <option value="all">Semua Periode Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="custom">Rentang Tanggal Kustom</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="sip-select"
              aria-label="Filter Metode Pembayaran"
            >
              <option value="Semua">Semua Metode Bayar</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div>
              <label className="form-label" style={{ fontSize: '11.5px' }}>
                Dari Tanggal
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="sip-input font-mono"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px' }}>
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="sip-input font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table (Desktop) & Card List (Mobile) */}
      <div className="sip-card desktop-table-wrap" style={{ padding: 0 }}>
        <div className="sip-table-container" style={{ border: 'none' }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Waktu Transaksi</th>
                <th>Petugas Kasir</th>
                <th>Rincian Item</th>
                <th>Metode Bayar</th>
                <th>Status</th>
                <th>Total Tagihan</th>
                <th className="no-print" style={{ textAlign: 'right' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t) => {
                const isVoided = t.status === 'VOIDED';
                return (
                  <tr key={t.id} style={{ opacity: isVoided ? 0.65 : 1 }}>
                    <td className="font-mono" style={{ fontWeight: 600, color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                      {t.invoiceNo}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDateTime(t.createdAt)}
                    </td>
                    <td>{t.cashierName}</td>
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {t.items.length} SKU ({t.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isPrintingAll
                          ? t.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')
                          : `${t.items.slice(0, 2).map((i) => `${i.name} (${i.quantity}x)`).join(', ')}${t.items.length > 2 ? '...' : ''}`}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-muted">{t.paymentMethod}</span>
                    </td>
                    <td>
                      {isVoided ? (
                        <div>
                          <span className="badge badge-red">Dibatalkan (Void)</span>
                          {t.voidReason && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {t.voidReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-green">Selesai</span>
                      )}
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      <span style={{ textDecoration: isVoided ? 'line-through' : 'none' }}>
                        {formatRupiah(t.total)}
                      </span>
                      {t.discount > 0 && (
                        <div style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          Diskon: -{formatRupiah(t.discount)}
                        </div>
                      )}
                    </td>
                    <td className="no-print" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setViewingReceipt(t)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          title="Lihat & Cetak Struk"
                        >
                          <Eye size={13} />
                          <span>Nota</span>
                        </button>
                        {!isVoided && (
                          <button
                            onClick={() => {
                              setVoidError('');
                              setVoidReason('');
                              setVoidingTrx(t);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--accent-red)' }}
                            title="Batalkan Nota & Kembalikan Stok ke Gudang"
                          >
                            <Ban size={13} />
                            <span>Void</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Tidak ada transaksi penjualan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                    TOTAL KESELURUHAN ({activeTransactions.length} Nota Sah
                    {voidedCount > 0 ? `, ${voidedCount} Void` : ''})
                  </td>
                  <td style={{ fontSize: '11.5px', fontWeight: 700 }}>
                    {totalItemsSold} pcs terjual
                  </td>
                  <td colSpan={2} style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {totalDiscount > 0
                      ? `Total Diskon: -${formatRupiah(totalDiscount)}`
                      : `Subtotal: ${formatRupiah(totalSubtotal)}`}
                  </td>
                  <td className="font-mono" style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    <div>{formatRupiah(totalOmzet)}</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--accent-green-text)' }}>
                      Laba: {formatRupiah(totalProfit)}
                    </div>
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Official Print Report Footer: Payment Method Recap & Sign-off (Visible only in Print / PDF) */}
      <div className="print-report-footer" style={{ marginTop: '10px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            gap: '16px',
            alignItems: 'stretch',
          }}
        >
          {/* Payment Recap Box */}
          <div
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '10px 12px',
              background: '#F8FAFC',
            }}
          >
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#0F172A',
                borderBottom: '1px solid #CBD5E1',
                paddingBottom: '5px',
                marginBottom: '6px',
              }}
            >
              Rekapitulasi Metode Pembayaran (Nota Sah)
            </div>
            {paymentRecap.length === 0 ? (
              <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                Belum ada transaksi sah pada periode ini.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  {paymentRecap.map((row) => (
                    <tr key={row.method}>
                      <td style={{ padding: '3px 0', color: '#334155', fontWeight: 600 }}>{row.method}</td>
                      <td style={{ padding: '3px 8px', color: '#64748B', textAlign: 'right' }}>
                        {row.count} nota
                      </td>
                      <td
                        className="font-mono"
                        style={{ padding: '3px 0', color: '#0F172A', fontWeight: 700, textAlign: 'right' }}
                      >
                        {formatRupiah(row.total)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid #94A3B8' }}>
                    <td style={{ paddingTop: '5px', fontWeight: 800, color: '#0F172A' }}>Total Omzet Sah</td>
                    <td
                      style={{
                        paddingTop: '5px',
                        paddingRight: '8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#334155',
                      }}
                    >
                      {activeTransactions.length} nota
                    </td>
                    <td
                      className="font-mono"
                      style={{ paddingTop: '5px', textAlign: 'right', fontWeight: 800, color: '#047857' }}
                    >
                      {formatRupiah(totalOmzet)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Authorization Signature Box */}
          <div
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'right' }}>
              Dokumen dicetak otomatis melalui sistem POS &bull; {reportStoreName}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '18px',
                marginTop: '10px',
                textAlign: 'center',
                fontSize: '10.5px',
                color: '#334155',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Disiapkan Oleh,</div>
                <div style={{ height: '38px' }} />
                <div style={{ borderTop: '1px solid #64748B', paddingTop: '4px', fontWeight: 700, color: '#0F172A' }}>
                  {user?.name || 'Operator / Admin'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Mengetahui,</div>
                <div style={{ height: '38px' }} />
                <div style={{ borderTop: '1px solid #64748B', paddingTop: '4px', fontWeight: 700, color: '#0F172A' }}>
                  Pemilik / Pimpinan Toko
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Reports Card List */}
      <div className="mobile-card-list no-print">
        {paginatedTransactions.map((t) => {
          const isVoided = t.status === 'VOIDED';
          return (
            <div key={t.id} className="mobile-data-card" style={{ opacity: isVoided ? 0.68 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span
                  className="font-mono"
                  style={{ fontWeight: 700, fontSize: '13.5px', color: isVoided ? 'var(--accent-red)' : 'var(--accent-cyan)' }}
                >
                  {t.invoiceNo}
                </span>
                {isVoided ? (
                  <span className="badge badge-red">VOID</span>
                ) : (
                  <span className="badge badge-green">Selesai</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', gap: '8px' }}>
                <span>{formatDateTime(t.createdAt)}</span>
                <span>Kasir: {t.cashierName}</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t.items.length} SKU ({t.items.reduce((s, i) => s + i.quantity, 0)} pcs) &bull;{' '}
                {t.items.slice(0, 2).map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                {t.items.length > 2 ? '...' : ''}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color)',
                  gap: '8px',
                }}
              >
                <div>
                  <span className="badge badge-muted" style={{ fontSize: '10px', marginBottom: '2px' }}>
                    {t.paymentMethod}
                  </span>
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      textDecoration: isVoided ? 'line-through' : 'none',
                    }}
                  >
                    {formatRupiah(t.total)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setViewingReceipt(t)}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: '36px' }}
                  >
                    <Eye size={14} />
                    <span>Nota</span>
                  </button>
                  {!isVoided && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoidError('');
                        setVoidReason('');
                        setVoidingTrx(t);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '36px', color: 'var(--accent-red)' }}
                    >
                      <Ban size={14} />
                      <span>Void</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="sip-card" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
            Tidak ada transaksi penjualan yang cocok dengan filter pencarian.
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      <PaginationBar
        variant="card"
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredTransactions.length}
        itemLabel="transaksi"
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* VOID TRANSACTION CONFIRMATION MODAL */}
      {voidingTrx && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Batalkan Nota (Void / Retur)?</h3>
              </div>
              <button onClick={() => setVoidingTrx(null)} className="btn btn-secondary btn-icon">
                <X size={16} />
              </button>
            </div>

            {voidError && (
              <div className="alert-box" style={{ marginBottom: '14px' }}>
                <span>{voidError}</span>
              </div>
            )}

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Anda akan membatalkan nota <strong className="font-mono">{voidingTrx.invoiceNo}</strong> senilai{' '}
              <strong className="font-mono">{formatRupiah(voidingTrx.total)}</strong>. Seluruh unit barang pada nota ini akan dikembalikan otomatis ke stok gudang dan dicatat pada Log Mutasi Stok.
            </p>

            <form onSubmit={handleConfirmVoid} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Alasan Pembatalan / Retur</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Salah input kuantitas kasir / Retur pelanggan"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="sip-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setVoidingTrx(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Kembali
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>
                  <Ban size={14} />
                  <span>Konfirmasi Void Nota</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <ReceiptModal transaction={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      )}
    </div>
  );
}
