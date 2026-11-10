'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDateTime } from '@/lib/format';
import ReceiptModal from './ReceiptModal';
import { Eye, ShoppingBag, Banknote, CreditCard } from 'lucide-react';

export default function CashierHistory() {
  const { user, transactions } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const cashierTransactions = transactions.filter((t) => t.cashierEmail === user?.email);
  const activeCashierTransactions = cashierTransactions.filter((t) => t.status !== 'VOIDED');

  const totalShiftSales = activeCashierTransactions.reduce((sum, t) => sum + t.total, 0);
  const cashSales = activeCashierTransactions
    .filter((t) => t.paymentMethod === 'Tunai')
    .reduce((sum, t) => sum + t.total, 0);
  const nonCashSales = totalShiftSales - cashSales;

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
      </div>

      {/* Shift Overview Cards */}
      <div className="kpi-grid">
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
            Dari {activeCashierTransactions.length} nota aktif
            {cashierTransactions.length > activeCashierTransactions.length
              ? ` (${cashierTransactions.length - activeCashierTransactions.length} void)`
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Daftar Nota Transaksi Kasir</h3>
        </div>

        <div className="sip-table-container" style={{ border: 'none', borderRadius: 0 }}>
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
              {cashierTransactions.map((t) => (
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
                      {t.items.reduce((s, i) => s + i.quantity, 0)} pcs ({t.items.length} SKU)
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
