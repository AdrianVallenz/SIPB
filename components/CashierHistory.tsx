'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDateTime, getLocalDateKey } from '@/lib/format';
import { downloadWorkbookXlsx } from '@/lib/excelExport';
import ReceiptModal from './ReceiptModal';
import PaginationBar from './PaginationBar';
import { Eye, ShoppingBag, Banknote, CreditCard, Search, Download } from 'lucide-react';

export default function CashierHistory() {
  const { user, transactions } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const {
    cashierTransactions,
    activeCount,
    totalShiftSales,
    cashSales,
    nonCashSales,
  } = useMemo(() => {
    const email = (user?.email || '').trim().toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    const filtered: Array<Transaction & { totalQty: number }> = [];
    let active = 0;
    let totalSales = 0;
    let cashTotal = 0;

    for (const t of transactions) {
      if ((t.cashierEmail || '').trim().toLowerCase() !== email) continue;
      let totalQty = 0;
      for (const item of t.items) {
        totalQty += item.quantity;
      }
      if (t.status !== 'VOIDED') {
        active += 1;
        totalSales += t.total;
        if (t.paymentMethod === 'Tunai') {
          cashTotal += t.total;
        }
      }
      const matchesSearch =
        !q ||
        t.invoiceNo.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q) ||
        t.items.some((i) => i.name.toLowerCase().includes(q));
      if (matchesSearch) {
        filtered.push({ ...t, totalQty });
      }
    }

    return {
      cashierTransactions: filtered,
      activeCount: active,
      totalShiftSales: totalSales,
      cashSales: cashTotal,
      nonCashSales: totalSales - cashTotal,
    };
  }, [transactions, user?.email, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(cashierTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return cashierTransactions.slice(start, start + pageSize);
  }, [cashierTransactions, safePage, pageSize]);

  const handleExportShiftExcel = () => {
    if (cashierTransactions.length === 0) return;
    const todayKey = getLocalDateKey(new Date());
    let totalQtyActive = 0;
    let totalSalesActive = 0;

    const rows = cashierTransactions.map((t) => {
      const isVoided = t.status === 'VOIDED';
      const itemSummary = t.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ') || '-';
      if (!isVoided) {
        totalQtyActive += t.totalQty;
        totalSalesActive += t.total;
      }
      return [
        t.invoiceNo,
        isVoided ? 'VOID / DIBATALKAN' : 'SELESAI',
        formatDateTime(t.createdAt, true),
        itemSummary,
        t.paymentMethod,
        t.totalQty,
        isVoided ? 0 : t.total,
      ];
    });

    downloadWorkbookXlsx({
      filename: `Riwayat-Shift-Kasir-${todayKey}.xlsx`,
      sheetName: 'Riwayat Shift Kasir',
      title: `REKAP RIWAYAT SHIFT KASIR — ${user?.name || user?.email || 'Kasir'}`,
      subtitle: `Dicetak: ${formatDateTime(new Date().toISOString(), true)} | Nota Aktif: ${activeCount}`,
      columns: [
        { header: 'No. Nota', type: 'center', minWidth: 22 },
        { header: 'Status', type: 'center', minWidth: 16 },
        { header: 'Waktu Transaksi', type: 'center', minWidth: 20 },
        { header: 'Rincian Barang', type: 'string', minWidth: 32, maxWidth: 48 },
        { header: 'Metode Bayar', type: 'center', minWidth: 14 },
        { header: 'Jumlah Item (Pcs)', type: 'integer', minWidth: 14 },
        { header: 'Total Tagihan', type: 'currency', minWidth: 17 },
      ],
      rows,
      totalsRow: ['TOTAL SHIFT AKTIF', `${activeCount} Nota`, null, null, null, totalQtyActive, totalSalesActive],
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Riwayat Shift Penjualan Saya</h2>
          <p className="page-subtitle">
            Rekapitulasi transaksi yang ditangani oleh petugas kasir aktif ({user?.name}).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportShiftExcel}
          disabled={cashierTransactions.length === 0}
          className="btn btn-secondary btn-sm no-print"
        >
          <Download size={14} />
          <span>Ekspor Excel Shift</span>
        </button>
      </div>

      {/* Shift Overview Cards */}
      <div className="kpi-grid kpi-grid-3">
        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Penjualan Shift
            </span>
            <ShoppingBag size={16} style={{ color: 'var(--accent-green-text)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-green-text)' }}>
            {formatRupiah(totalShiftSales)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Dari {activeCount} nota aktif
            {cashierTransactions.length > activeCount
              ? ` (${cashierTransactions.length - activeCount} void)`
              : ''}
          </div>
        </div>

        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Penerimaan Tunai (Kas Laci)
            </span>
            <Banknote size={16} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(cashSales)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Saldo uang tunai fisik di laci kasir
          </div>
        </div>

        <div className="sip-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Penerimaan Non-Tunai
            </span>
            <CreditCard size={16} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700 }}>
            {formatRupiah(nonCashSales)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Akumulasi QRIS, Transfer Bank &amp; Kartu Debit
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Daftar Nota Transaksi Kasir</h3>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '300px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Cari no. nota, item, metode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="sip-input"
              style={{ paddingLeft: '32px', fontSize: '12.5px', minHeight: '36px' }}
            />
          </div>
        </div>

        <div className="sip-table-container desktop-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Waktu Transaksi</th>
                <th>Jumlah Item</th>
                <th>Metode Bayar</th>
                <th>Total Tagihan</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono" style={{ fontWeight: 600, color: t.status === 'VOIDED' ? 'var(--accent-red)' : 'var(--accent-green-text)' }}>
                    {t.invoiceNo}
                    {t.status === 'VOIDED' && (
                      <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '9.5px', padding: '1px 6px' }}>
                        VOID
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatDateTime(t.createdAt, true)}
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px' }}>
                      {t.totalQty} pcs ({t.items.length} SKU)
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-muted">{t.paymentMethod}</span>
                  </td>
                  <td
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      fontSize: '13.5px',
                      textDecoration: t.status === 'VOIDED' ? 'line-through' : 'none',
                      color: t.status === 'VOIDED' ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {formatRupiah(t.total)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedReceipt(t)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px 10px', fontSize: '11px' }}
                    >
                      <Eye size={13} />
                      <span>Cetak Ulang Struk</span>
                    </button>
                  </td>
                </tr>
              ))}

              {cashierTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Belum ada transaksi penjualan yang tercatat pada shift Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cashier Transactions Card List */}
        <div className="mobile-card-list" style={{ padding: '14px' }}>
          {paginatedTransactions.map((t) => {
            const isVoided = t.status === 'VOIDED';
            return (
              <div key={t.id} className="mobile-data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      fontSize: '13.5px',
                      color: isVoided ? 'var(--accent-red)' : 'var(--accent-green-text)',
                    }}
                  >
                    {t.invoiceNo}
                  </span>
                  <span className="badge badge-muted">{t.paymentMethod}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>{formatDateTime(t.createdAt, true)}</span>
                  <span>
                    {t.totalQty} pcs ({t.items.length} SKU)
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      textDecoration: isVoided ? 'line-through' : 'none',
                      color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {formatRupiah(t.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(t)}
                    className="btn btn-primary btn-sm"
                    style={{ minHeight: '36px' }}
                  >
                    <Eye size={14} />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>
            );
          })}

          {cashierTransactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Belum ada transaksi penjualan yang tercatat pada shift Anda.
            </div>
          )}
        </div>

        <PaginationBar
          variant="border-top"
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={cashierTransactions.length}
          itemLabel="nota"
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {selectedReceipt && (
        <ReceiptModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
