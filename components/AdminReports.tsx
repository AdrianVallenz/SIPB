'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, PAYMENT_METHODS } from '@/lib/types';
import { formatRupiah, formatDateTime, getLocalDateKey, sanitizeCsvCell } from '@/lib/format';
import ReceiptModal from './ReceiptModal';
import {
  Search,
  Printer,
  Download,
  Eye,
  Ban,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminReports() {
  const { transactions, voidTransaction } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);

  // Void Modal State
  const [voidingTrx, setVoidingTrx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidError, setVoidError] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayKey = getLocalDateKey(new Date());

  const { filteredTransactions, activeTransactions, totalOmzet, totalItemsSold, averageTransaction } =
    useMemo(() => {
      const now = new Date();
      const past7StartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();
      const past30StartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0).getTime();
      const q = searchQuery.trim().toLowerCase();

      const filtered = transactions.filter((t) => {
        let matchesDate = true;
        if (dateFilter === 'today') {
          matchesDate = getLocalDateKey(t.createdAt) === todayKey;
        } else if (dateFilter === '7days') {
          matchesDate = Date.parse(t.createdAt) >= past7StartMs;
        } else if (dateFilter === '30days') {
          matchesDate = Date.parse(t.createdAt) >= past30StartMs;
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
      let itemsSold = 0;

      for (const t of filtered) {
        if (t.status !== 'VOIDED') {
          active.push(t);
          omzet += t.total;
          for (const i of t.items) {
            itemsSold += i.quantity;
          }
        }
      }

      const avg = active.length > 0 ? Math.round(omzet / active.length) : 0;

      return {
        filteredTransactions: filtered,
        activeTransactions: active,
        totalOmzet: omzet,
        totalItemsSold: itemsSold,
        averageTransaction: avg,
      };
    }, [transactions, dateFilter, methodFilter, searchQuery, todayKey]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

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
      'Keterangan Void',
    ];
    const rows = filteredTransactions.map((t) => [
      sanitizeCsvCell(t.invoiceNo),
      sanitizeCsvCell(t.status === 'VOIDED' ? 'VOID / DIBATALKAN' : 'SELESAI'),
      sanitizeCsvCell(formatDateTime(t.createdAt, true)),
      sanitizeCsvCell(t.cashierName),
      sanitizeCsvCell(t.paymentMethod),
      t.items.reduce((s, i) => s + i.quantity, 0),
      t.subtotal,
      t.discount,
      t.status === 'VOIDED' ? 0 : t.total,
      sanitizeCsvCell(t.voidReason || '-'),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan-Penjualan-SIP-${todayKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      {/* Header */}
      <div className="page-header">
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

      {feedbackMsg && (
        <div className="alert-box-info">
          <CheckCircle2 size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="kpi-grid">
        <div className="sip-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Total Omzet Bersih
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(totalOmzet)}
          </div>
        </div>

        <div className="sip-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Nota Sah / Aktif
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
            {activeTransactions.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
              Nota
            </span>
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
                setDateFilter(e.target.value as 'today' | '7days' | '30days' | 'all');
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
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
                        {t.items.slice(0, 2).map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                        {t.items.length > 2 ? '...' : ''}
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
                        textDecoration: isVoided ? 'line-through' : 'none',
                        color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {formatRupiah(t.total)}
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
          </table>
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
      {filteredTransactions.length > 0 && (
        <div
          className="sip-card no-print"
          style={{
            padding: '12px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Menampilkan{' '}
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {(safePage - 1) * pageSize + 1}&ndash;
                {Math.min(safePage * pageSize, filteredTransactions.length)}
              </strong>{' '}
              dari{' '}
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {filteredTransactions.length}
              </strong>{' '}
              transaksi
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="sip-select font-mono"
              style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '12px', minHeight: '32px' }}
              aria-label="Jumlah transaksi per halaman"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / halaman
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', minHeight: '32px' }}
            >
              <ChevronLeft size={14} />
              <span className="hide-xs">Sebelumnya</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .slice(0, 7)
              .map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`btn btn-sm font-mono ${
                    pageNum === safePage ? 'btn-primary' : 'btn-secondary'
                  }`}
                  style={{ minWidth: '32px', minHeight: '32px', padding: '0 8px' }}
                >
                  {pageNum}
                </button>
              ))}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', minHeight: '32px' }}
            >
              <span className="hide-xs">Berikutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

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
