'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PAYMENT_METHODS } from '@/lib/types';
import { formatRupiah, formatDateTime, getLocalDateKey } from '@/lib/format';
import ReceiptModal from './ReceiptModal';
import {
  Search,
  Printer,
  Download,
  Eye,
} from 'lucide-react';

export default function AdminReports() {
  const { transactions } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);

  const now = new Date();
  const todayKey = getLocalDateKey(now);

  const filteredTransactions = transactions.filter((t) => {
    const tDate = new Date(t.createdAt);

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = getLocalDateKey(tDate) === todayKey;
    } else if (dateFilter === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      matchesDate = tDate >= past7;
    } else if (dateFilter === '30days') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      matchesDate = tDate >= past30;
    }

    const matchesMethod = methodFilter === 'Semua' || t.paymentMethod === methodFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.invoiceNo.toLowerCase().includes(q) ||
      t.cashierName.toLowerCase().includes(q) ||
      t.items.some((i) => i.name.toLowerCase().includes(q));

    return matchesDate && matchesMethod && matchesSearch;
  });

  // Aggregated Stats
  const totalOmzet = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalItemsSold = filteredTransactions.reduce(
    (sum, t) => sum + t.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );
  const averageTransaction =
    filteredTransactions.length > 0 ? Math.round(totalOmzet / filteredTransactions.length) : 0;

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['No. Nota', 'Waktu Transaksi', 'Kasir', 'Metode Bayar', 'Jumlah Item (Pcs)', 'Subtotal', 'Diskon', 'Total Bayar'];
    const rows = filteredTransactions.map((t) => [
      t.invoiceNo,
      formatDateTime(t.createdAt, true),
      `"${t.cashierName.replace(/"/g, '""')}"`,
      t.paymentMethod,
      t.items.reduce((s, i) => s + i.quantity, 0),
      t.subtotal,
      t.discount,
      t.total,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan-Penjualan-SIP-${todayKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Laporan Transaksi Penjualan</h2>
          <p className="page-subtitle">
            Rekapitulasi seluruh nota penjualan, filter metode pembayaran, dan ekspor data laporan.
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
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            className="btn btn-primary btn-sm"
          >
            <Printer size={14} />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="kpi-grid">
        <div className="sip-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Total Omzet Terfilter
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(totalOmzet)}
          </div>
        </div>

        <div className="sip-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Volume Transaksi
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
            {filteredTransactions.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Nota</span>
          </div>
        </div>

        <div className="sip-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Unit Barang Terjual
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-green-text)' }}>
            {totalItemsSold}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Pcs</span>
          </div>
        </div>

        <div className="sip-card" style={{ padding: '16px 20px' }}>
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
              }}
            />
            <input
              type="text"
              placeholder="Cari nomor nota, nama kasir, atau item barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sip-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | '7days' | '30days' | 'all')}
              className="sip-select"
            >
              <option value="all">Semua Periode Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="sip-select"
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
      </div>

      {/* Transactions Table */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div className="sip-table-container" style={{ border: 'none' }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Waktu Transaksi</th>
                <th>Petugas Kasir</th>
                <th>Rincian Item</th>
                <th>Metode Bayar</th>
                <th>Diskon</th>
                <th>Total Tagihan</th>
                <th className="no-print" style={{ textAlign: 'right' }}>
                  Struk
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
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
                      {t.items.map((i) => `${i.name} (${i.quantity}x)`).slice(0, 2).join(', ')}
                      {t.items.length > 2 ? '...' : ''}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-muted">{t.paymentMethod}</span>
                  </td>
                  <td className="font-mono" style={{ color: t.discount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {t.discount > 0 ? `- ${formatRupiah(t.discount)}` : '-'}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    {formatRupiah(t.total)}
                  </td>
                  <td className="no-print" style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setViewingReceipt(t)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px 10px', fontSize: '11px' }}
                    >
                      <Eye size={13} />
                      <span>Lihat Nota</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Tidak ada transaksi penjualan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingReceipt && (
        <ReceiptModal transaction={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      )}
    </div>
  );
}
