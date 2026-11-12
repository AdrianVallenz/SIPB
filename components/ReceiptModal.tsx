'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import PrinterModal from './PrinterModal';
import {
  Printer,
  Bluetooth,
  BluetoothConnected,
  X,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2,
} from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  initialPrintNotice?: { type: 'success' | 'error'; text: string } | null;
}

export default function ReceiptModal({
  transaction,
  onClose,
  initialPrintNotice = null,
}: ReceiptModalProps) {
  if (!transaction) return null;

  return (
    <ReceiptModalContent
      key={transaction.id}
      transaction={transaction}
      onClose={onClose}
      initialPrintNotice={initialPrintNotice}
    />
  );
}

function ReceiptModalContent({
  transaction,
  onClose,
  initialPrintNotice = null,
}: {
  transaction: Transaction;
  onClose: () => void;
  initialPrintNotice?: { type: 'success' | 'error'; text: string } | null;
}) {
  const { runtime, settings, supportInfo, isConnected, isBusy, printTransaction } =
    useBluetoothPrinter();

  const [printNotice, setPrintNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    initialPrintNotice
  );
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);

  const handleBrowserPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleBluetoothPrint = async () => {
    setPrintNotice(null);
    const res = await printTransaction(transaction, true);
    if (res.success) {
      setPrintNotice({
        type: 'success',
        text: `Struk ${transaction.invoiceNo} berhasil dicetak ke ${
          runtime.deviceName || settings.lastDeviceName || 'Printer Bluetooth'
        } (${settings.paperWidth}).`,
      });
    } else {
      setPrintNotice({
        type: 'error',
        text: res.error || 'Gagal mencetak ke printer Bluetooth.',
      });
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-content modal-sheet"
          style={{
            maxWidth: '420px',
            padding: '20px',
            backgroundColor: 'var(--bg-card)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Controls (No Print) */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={17} style={{ color: 'var(--accent-green-text)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Nota Transaksi Resmi</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Kertas Thermal {settings.paperWidth} &bull;{' '}
                  {isConnected
                    ? `BT: ${runtime.deviceName || settings.lastDeviceName}`
                    : 'BT Siaga'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowPrinterSetup(true)}
                className="btn btn-secondary btn-icon"
                title="Pengaturan Printer Bluetooth"
                style={{ padding: '6px' }}
              >
                <Settings2 size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-icon"
                style={{ padding: '6px' }}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {printNotice && (
            <div
              className={`no-print ${printNotice.type === 'error' ? 'alert-box' : 'alert-box-info'}`}
              style={{ marginBottom: '12px', fontSize: '12px', padding: '10px 12px' }}
            >
              {printNotice.type === 'success' ? (
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
              )}
              <span>{printNotice.text}</span>
            </div>
          )}

          {/* Printable Thermal Receipt Paper */}
          <div
            className="receipt-paper receipt-printable"
            style={{ width: settings.paperWidth === '80mm' ? '340px' : '300px' }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.05em' }}>
                {settings.storeName || 'SIP BARANG'}
              </div>
              {settings.storeTagline && (
                <div style={{ fontSize: '10px', color: '#555555' }}>{settings.storeTagline}</div>
              )}
              {settings.storeAddress && (
                <div style={{ fontSize: '9px', color: '#777777', marginTop: '2px' }}>
                  {settings.storeAddress}
                </div>
              )}
              {settings.storePhone && (
                <div style={{ fontSize: '9px', color: '#777777' }}>{settings.storePhone}</div>
              )}
            </div>

            <div className="receipt-divider" />

            {/* Meta Info */}
            <div style={{ fontSize: '10px', lineHeight: 1.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>No. Nota :</span>
                <span style={{ fontWeight: 700 }}>{transaction.invoiceNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>Waktu    :</span>
                <span>{formatDateTime(transaction.createdAt, true)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>Kasir    :</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>Metode   :</span>
                <span>{transaction.paymentMethod}</span>
              </div>
              {transaction.status === 'VOIDED' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#c00',
                    fontWeight: 700,
                  }}
                >
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
                {settings.receiptFooter || 'Terima Kasih Atas Kunjungan Anda'}
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
              flexDirection: 'column',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              disabled={isBusy || !supportInfo.supported}
              onClick={() => void handleBluetoothPrint()}
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '44px' }}
            >
              {isBusy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isConnected ? (
                <BluetoothConnected size={16} />
              ) : (
                <Bluetooth size={16} />
              )}
              <span>
                {runtime.status === 'connecting'
                  ? 'Menghubungkan Printer...'
                  : runtime.status === 'printing'
                  ? 'Mengirim ke Printer...'
                  : isConnected
                  ? `Cetak Bluetooth (${settings.paperWidth})`
                  : `Hubungkan & Cetak Bluetooth (${settings.paperWidth})`}
              </span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: '40px' }}
              >
                <Printer size={15} />
                <span>Cetak Browser / PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ minHeight: '40px', padding: '0 18px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      <PrinterModal isOpen={showPrinterSetup} onClose={() => setShowPrinterSetup(false)} />
    </>
  );
}
