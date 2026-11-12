/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { useApp } from '@/context/AppContext';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import {
  buildDynamicQrisPayload,
  generateQrisQrDataUrl,
  parseAndValidateQris,
} from '@/lib/qris';
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
  QrCode,
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
  const { paymentSettings } = useApp();
  const { runtime, settings, supportInfo, isConnected, isBusy, printTransaction } =
    useBluetoothPrinter();

  const parsedMerchantQris = useMemo(
    () =>
      paymentSettings.qrisPayload.trim()
        ? parseAndValidateQris(paymentSettings.qrisPayload)
        : null,
    [paymentSettings.qrisPayload]
  );

  const hasValidMerchantQris = Boolean(parsedMerchantQris?.valid);
  const [showQrOnReceipt, setShowQrOnReceipt] = useState<boolean>(
    paymentSettings.showQrisOnReceipt ?? true
  );
  const [qrMode, setQrMode] = useState<'qris' | 'verify'>(() =>
    transaction.paymentMethod === 'QRIS' && hasValidMerchantQris ? 'qris' : 'verify'
  );
  const [qrImageState, setQrImageState] = useState<{ payload: string; url: string }>({
    payload: '',
    url: '',
  });

  const [printNotice, setPrintNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    initialPrintNotice
  );
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);

  const activeQrPayload = useMemo(() => {
    if (!showQrOnReceipt) return '';
    if (qrMode === 'qris' && parsedMerchantQris?.valid) {
      return buildDynamicQrisPayload(
        parsedMerchantQris.cleanedPayload,
        transaction.total,
        true,
        transaction.invoiceNo
      );
    }
    return `NOTA|${transaction.invoiceNo}|${transaction.total}|${transaction.paymentMethod}|${transaction.status || 'COMPLETED'}`;
  }, [showQrOnReceipt, qrMode, parsedMerchantQris, transaction]);

  useEffect(() => {
    let active = true;
    if (!activeQrPayload) return;
    void generateQrisQrDataUrl(activeQrPayload)
      .then((url) => {
        if (active) setQrImageState({ payload: activeQrPayload, url });
      })
      .catch(() => {
        // Fallback smoothly
      });
    return () => {
      active = false;
    };
  }, [activeQrPayload]);

  const currentQrDataUrl = qrImageState.payload === activeQrPayload ? qrImageState.url : '';
  const qrCaptionText =
    qrMode === 'qris' && hasValidMerchantQris
      ? `QRIS NOTA • ${paymentSettings.qrisMerchantName || parsedMerchantQris?.merchantName || settings.storeName}`
      : 'QR VERIFIKASI NOTA';

  const handleBrowserPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleBluetoothPrint = async () => {
    setPrintNotice(null);
    const res = await printTransaction(transaction, true, {
      qrData: activeQrPayload || undefined,
      qrCaption: activeQrPayload ? qrCaptionText : undefined,
      customNote: paymentSettings.qrisCustomNote || undefined,
    });
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

            {/* Footer & Real Nota / QRIS QR Code */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              {showQrOnReceipt && currentQrDataUrl ? (
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      fontSize: '8.5px',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: '#222222',
                      marginBottom: '4px',
                    }}
                  >
                    {qrCaptionText}
                  </div>
                  <div
                    style={{
                      width: qrMode === 'qris' && hasValidMerchantQris ? '118px' : '88px',
                      height: qrMode === 'qris' && hasValidMerchantQris ? '118px' : '88px',
                      margin: '0 auto 4px',
                      backgroundColor: '#FFFFFF',
                      padding: '4px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                    }}
                  >
                    <img
                      src={currentQrDataUrl}
                      alt={`QR ${transaction.invoiceNo}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  {qrMode === 'qris' && (paymentSettings.qrisNmid || parsedMerchantQris?.nmid) && (
                    <div style={{ fontSize: '8px', color: '#555555' }}>
                      NMID: {paymentSettings.qrisNmid || parsedMerchantQris?.nmid}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    height: '24px',
                    width: '180px',
                    margin: '0 auto 6px',
                    background:
                      'repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 9px)',
                  }}
                />
              )}
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em' }}>
                *{transaction.invoiceNo}*
              </div>
              {paymentSettings.qrisCustomNote && (
                <div style={{ fontSize: '8.5px', color: '#333333', marginTop: '4px', fontWeight: 600 }}>
                  {paymentSettings.qrisCustomNote}
                </div>
              )}
              <div style={{ fontSize: '9px', color: '#555555', marginTop: '4px' }}>
                {settings.receiptFooter || 'Terima Kasih Atas Kunjungan Anda'}
              </div>
              <div style={{ fontSize: '8px', color: '#777777' }}>
                Simpan struk ini sebagai bukti transaksi pembayaran yang sah.
              </div>
            </div>
          </div>

          {/* QR Nota Options Bar (No Print) */}
          <div
            className="no-print"
            style={{
              marginTop: '12px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              fontSize: '11.5px',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={showQrOnReceipt}
                onChange={(e) => setShowQrOnReceipt(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--accent-cyan)' }}
              />
              <QrCode size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>QR pada Nota</span>
            </label>

            {showQrOnReceipt && hasValidMerchantQris && (
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setQrMode('qris')}
                  className="btn btn-sm"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderColor: qrMode === 'qris' ? 'var(--accent-cyan)' : 'var(--border-color)',
                    backgroundColor:
                      qrMode === 'qris' ? 'rgba(var(--accent-cyan-rgb), 0.14)' : 'var(--bg-card)',
                    color: qrMode === 'qris' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  QRIS Nota
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('verify')}
                  className="btn btn-sm"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderColor: qrMode === 'verify' ? 'var(--accent-cyan)' : 'var(--border-color)',
                    backgroundColor:
                      qrMode === 'verify' ? 'rgba(var(--accent-cyan-rgb), 0.14)' : 'var(--bg-card)',
                    color: qrMode === 'verify' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  QR Verifikasi
                </button>
              </div>
            )}
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
