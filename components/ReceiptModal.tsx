'use client';

import React from 'react';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { Printer, X, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        style={{
          maxWidth: '400px',
          padding: '22px',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {/* Top Header Controls (No Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={17} style={{ color: 'var(--accent-green-text)' }} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Nota Transaksi Resmi</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Printable Thermal Receipt Paper */}
        <div className="receipt-paper receipt-printable">
          {/* Store Header */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.05em' }}>
              SIP BARANG
            </div>
            <div style={{ fontSize: '10px', color: '#555555' }}>
              Sistem Operasional &amp; Kasir Terpadu
            </div>
            <div style={{ fontSize: '9px', color: '#777777', marginTop: '2px' }}>
              Jl. Jenderal Sudirman Kav. 24, Jakarta
            </div>
            <div style={{ fontSize: '9px', color: '#777777' }}>
              Telp: (021) 555-8899 &bull; sipb.web.id
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Meta Info */}
          <div style={{ fontSize: '10px', lineHeight: 1.55 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Nota :</span>
              <span style={{ fontWeight: 700 }}>{transaction.invoiceNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Waktu    :</span>
              <span>{formatDateTime(transaction.createdAt, true)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kasir    :</span>
              <span>{transaction.cashierName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Metode   :</span>
              <span>{transaction.paymentMethod}</span>
            </div>
            {transaction.status === 'VOIDED' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00', fontWeight: 700 }}>
                <span>Status   :</span>
                <span>DIBATALKAN (VOID)</span>
              </div>
            )}
          </div>

          <div className="receipt-divider" />

          {/* Items Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '10px',
              marginBottom: '6px',
            }}
          >
            <span>RINCIAN BARANG</span>
            <span>SUBTOTAL</span>
          </div>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {transaction.items.map((item, idx) => (
              <div key={idx} style={{ fontSize: '10px' }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444444' }}>
                  <span>
                    {item.quantity} x {formatRupiah(item.price)}
                  </span>
                  <span style={{ fontWeight: 600, color: '#111111' }}>
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-divider" />

          {/* Totals Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>

            {transaction.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
                <span>Diskon:</span>
                <span>- {formatRupiah(transaction.discount)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '12px',
                marginTop: '4px',
                paddingTop: '4px',
                borderTop: '1px solid #111111',
              }}
            >
              <span>TOTAL BAYAR:</span>
              <span>{formatRupiah(transaction.total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>Bayar ({transaction.paymentMethod}):</span>
              <span>{formatRupiah(transaction.amountPaid)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Kembalian:</span>
              <span>{formatRupiah(transaction.change)}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Footer & Barcode simulation */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <div
              style={{
                height: '24px',
                width: '180px',
                margin: '0 auto 6px',
                background:
                  'repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 9px)',
              }}
            />
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em' }}>
              *{transaction.invoiceNo}*
            </div>
            <div style={{ fontSize: '9px', color: '#555555', marginTop: '6px' }}>
              Terima Kasih Atas Kunjungan Anda
            </div>
            <div style={{ fontSize: '8px', color: '#777777' }}>
              Simpan struk ini sebagai bukti transaksi pembayaran yang sah.
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons (No Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '18px',
          }}
        >
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 1 }}>
            <Printer size={15} />
            <span>Cetak Struk</span>
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
