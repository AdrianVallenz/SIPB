/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Maximize2,
  QrCode,
  Receipt,
  Settings,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { QrisCardTheme } from '@/lib/types';
import {
  buildDynamicQrisPayload,
  generateQrisQrDataUrl,
  parseAndValidateQris,
} from '@/lib/qris';
import { formatRupiah } from '@/lib/format';

interface ThemePalette {
  cardBg: string;
  cardBorder: string;
  text: string;
  muted: string;
  accent: string;
  pillBg: string;
}

const CARD_THEME_STYLES: Record<QrisCardTheme, ThemePalette> = {
  classic: {
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    text: '#0F172A',
    muted: '#475569',
    accent: '#0284C7',
    pillBg: '#F1F5F9',
  },
  ocean: {
    cardBg: '#EFF6FF',
    cardBorder: '#BFDBFE',
    text: '#0F172A',
    muted: '#334155',
    accent: '#0369A1',
    pillBg: '#DBEAFE',
  },
  emerald: {
    cardBg: '#ECFDF5',
    cardBorder: '#A7F3D0',
    text: '#064E3B',
    muted: '#047857',
    accent: '#059669',
    pillBg: '#D1FAE5',
  },
  dark: {
    cardBg: '#0F172A',
    cardBorder: '#334155',
    text: '#F8FAFC',
    muted: '#94A3B8',
    accent: '#38BDF8',
    pillBg: '#1E293B',
  },
};

interface QrisPaymentBoxProps {
  invoiceNo: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalPcs: number;
  itemCount: number;
  storeName: string;
  storeTagline?: string;
  isAdmin: boolean;
  onOpenQrisSetup: () => void;
}

export default function QrisPaymentBox({
  invoiceNo,
  subtotal,
  discount,
  grandTotal,
  totalPcs,
  itemCount,
  storeName,
  storeTagline,
  isAdmin,
  onOpenQrisSetup,
}: QrisPaymentBoxProps) {
  const { paymentSettings } = useApp();
  const [useDynamicAmount, setUseDynamicAmount] = useState(true);
  const [isFullscreenQr, setIsFullscreenQr] = useState(false);
  const [qrState, setQrState] = useState<{ payload: string; url: string }>({
    payload: '',
    url: '',
  });

  const parsedPayload = useMemo(
    () =>
      paymentSettings.qrisPayload.trim()
        ? parseAndValidateQris(paymentSettings.qrisPayload)
        : null,
    [paymentSettings.qrisPayload]
  );

  const activePayload = useMemo(() => {
    if (!parsedPayload?.valid) return '';
    return buildDynamicQrisPayload(
      parsedPayload.cleanedPayload,
      grandTotal,
      useDynamicAmount,
      useDynamicAmount ? invoiceNo : undefined
    );
  }, [parsedPayload, grandTotal, useDynamicAmount, invoiceNo]);

  useEffect(() => {
    let active = true;
    if (!activePayload) return;
    void generateQrisQrDataUrl(activePayload)
      .then((url) => {
        if (active) setQrState({ payload: activePayload, url });
      })
      .catch(() => {
        // Fallback handled cleanly
      });
    return () => {
      active = false;
    };
  }, [activePayload]);

  const merchantTitle =
    paymentSettings.qrisMerchantName ||
    parsedPayload?.merchantName ||
    storeName ||
    'MERCHANT QRIS';
  const merchantNmid = paymentSettings.qrisNmid || parsedPayload?.nmid || '';
  const hasDynamicQr = Boolean(parsedPayload?.valid);
  const currentQrUrl = qrState.payload === activePayload ? qrState.url : '';
  const hasUploadedImage = Boolean(paymentSettings.qrisImageData);
  const palette = CARD_THEME_STYLES[paymentSettings.qrisTheme || 'classic'] || CARD_THEME_STYLES.classic;

  if (!hasDynamicQr && !hasUploadedImage) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px dashed rgba(var(--accent-cyan-rgb), 0.45)',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.12)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
          }}
        >
          <QrCode size={22} />
        </div>
        <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '4px' }}>
          QRIS Bayar Toko Belum Diatur
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: isAdmin ? '12px' : 0,
          }}
        >
          {isAdmin
            ? 'Unggah gambar atau tempel kode QRIS merchant toko Anda agar pelanggan bisa memindai QRIS custom yang otomatis membawa nominal & nomor nota.'
            : 'Minta Administrator untuk mengunggah gambar atau kode QRIS merchant toko melalui menu Pengaturan.'}
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenQrisSetup}
            className="btn btn-primary btn-sm"
            style={{ minHeight: '38px', padding: '0 14px' }}
          >
            <Settings size={14} />
            <span>Atur QRIS Toko Sekarang</span>
          </button>
        )}
      </div>
    );
  }

  const qrVisualSrc = hasDynamicQr ? currentQrUrl : paymentSettings.qrisImageData;

  return (
    <>
      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        {hasDynamicQr && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              marginBottom: '12px',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setUseDynamicAmount(true)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: useDynamicAmount ? 'var(--accent-cyan)' : 'transparent',
                color: useDynamicAmount ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              Dinamis + Nota
            </button>
            <button
              type="button"
              onClick={() => setUseDynamicAmount(false)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: !useDynamicAmount ? 'var(--accent-cyan)' : 'transparent',
                color: !useDynamicAmount ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              Statis (Asli)
            </button>
          </div>
        )}

        <div
          style={{
            backgroundColor: palette.cardBg,
            color: palette.text,
            borderRadius: '14px',
            border: `1px solid ${palette.cardBorder}`,
            padding: '14px 12px',
            margin: '0 auto 10px',
            maxWidth: '280px',
            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.14)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontSize: '10px',
              fontWeight: 800,
              color: palette.accent,
              letterSpacing: '0.07em',
            }}
          >
            <Receipt size={12} />
            <span>QRIS PEMBAYARAN NOTA</span>
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 800, marginTop: '3px', wordBreak: 'break-word' }}>
            {merchantTitle}
          </div>
          {storeTagline && storeName && merchantTitle !== storeName && (
            <div style={{ fontSize: '10px', color: palette.muted, marginTop: '1px' }}>
              {storeName}
            </div>
          )}
          {merchantNmid && (
            <div className="font-mono" style={{ fontSize: '9.5px', color: palette.muted, marginTop: '2px' }}>
              NMID: {merchantNmid}
            </div>
          )}

          {/* Nota Binding Strip */}
          <div
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              borderRadius: '8px',
              backgroundColor: palette.pillBg,
              fontSize: '10.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: palette.muted }}>No. Nota:</span>
              <span className="font-mono" style={{ fontWeight: 700 }}>
                {invoiceNo}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: palette.muted }}>Rincian:</span>
              <span>
                {itemCount} SKU &bull; {totalPcs} pcs
              </span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: palette.muted }}>
                  Subtotal {formatRupiah(subtotal)}:
                </span>
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  -{formatRupiah(discount)}
                </span>
              </div>
            )}
          </div>

          {/* White High-Contrast Quiet Zone for reliable scanning */}
          <div
            style={{
              margin: '10px auto 8px',
              width: '198px',
              minHeight: '198px',
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {qrVisualSrc ? (
              <img
                src={qrVisualSrc}
                alt={`QRIS ${invoiceNo}`}
                style={{
                  width: '100%',
                  maxHeight: '215px',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>Membuat QRIS Nota...</span>
            )}
          </div>

          <div
            className="font-mono"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              backgroundColor: palette.pillBg,
              fontSize: '15px',
              fontWeight: 800,
              color: palette.accent,
            }}
          >
            {formatRupiah(grandTotal)}
          </div>

          {paymentSettings.qrisCustomNote && (
            <div
              style={{
                fontSize: '10.5px',
                color: palette.muted,
                marginTop: '7px',
                lineHeight: 1.4,
              }}
            >
              {paymentSettings.qrisCustomNote}
            </div>
          )}
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {hasDynamicQr && useDynamicAmount ? (
            <span>
              Nominal tagihan &amp; No. Nota (<span className="font-mono">{invoiceNo}</span>) otomatis
              terisi saat pelanggan scan.
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} /> Pelanggan perlu memasukkan nominal{' '}
              {formatRupiah(grandTotal)} secara manual.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsFullscreenQr(true)}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: '36px' }}
          >
            <Maximize2 size={14} />
            <span>Perbesar Layar Penuh</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenQrisSetup}
              className="btn btn-secondary btn-sm"
              style={{ minHeight: '36px' }}
            >
              <Settings size={14} />
              <span>Ubah QRIS</span>
            </button>
          )}
        </div>
      </div>

      {/* High-contrast fullscreen scan view for smartphone cashiers */}
      {isFullscreenQr && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 140,
            backgroundColor: palette.cardBg,
            color: palette.text,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'max(18px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: palette.accent,
              }}
            >
              QRIS NOTA &bull; {invoiceNo}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreenQr(false)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '999px',
                border: `1px solid ${palette.cardBorder}`,
                backgroundColor: palette.pillBg,
                color: palette.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Tutup tampilan QRIS penuh"
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800 }}>{merchantTitle}</div>
            {merchantNmid && (
              <div className="font-mono" style={{ fontSize: '11.5px', color: palette.muted }}>
                NMID: {merchantNmid}
              </div>
            )}
            <div
              className="font-mono"
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: palette.pillBg,
                fontSize: '11.5px',
                fontWeight: 700,
              }}
            >
              Nota {invoiceNo} &bull; {totalPcs} pcs
            </div>
            <div
              style={{
                width: '270px',
                height: '270px',
                padding: '12px',
                borderRadius: '16px',
                border: '2px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
              }}
            >
              {qrVisualSrc && (
                <img
                  src={qrVisualSrc}
                  alt={`QRIS ${invoiceNo}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: palette.accent,
                marginTop: '4px',
              }}
            >
              {formatRupiah(grandTotal)}
            </div>
            <div style={{ fontSize: '12.5px', color: palette.muted }}>
              {paymentSettings.qrisCustomNote ||
                (hasDynamicQr && useDynamicAmount
                  ? 'Arahkan layar ke pelanggan — nominal & nomor nota terisi otomatis'
                  : 'Pastikan pelanggan memasukkan nominal di atas dengan tepat')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreenQr(false)}
            style={{
              width: '100%',
              maxWidth: '340px',
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: palette.accent,
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Kembali ke Konfirmasi Kasir
          </button>
        </div>
      )}
    </>
  );
}
