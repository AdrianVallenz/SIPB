/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { QrisCardTheme } from '@/lib/types';
import {
  buildDynamicQrisPayload,
  generateQrisQrDataUrl,
  parseAndValidateQris,
  processQrisImageUpload,
} from '@/lib/qris';
import { formatRupiah } from '@/lib/format';

const QRIS_THEMES: { id: QrisCardTheme; label: string; bg: string; text: string; accent: string }[] = [
  { id: 'classic', label: 'Klasik Nota', bg: '#FFFFFF', text: '#0F172A', accent: '#0284C7' },
  { id: 'ocean', label: 'Biru Modern', bg: '#EFF6FF', text: '#0F172A', accent: '#0369A1' },
  { id: 'emerald', label: 'Hijau Kasir', bg: '#ECFDF5', text: '#064E3B', accent: '#059669' },
  { id: 'dark', label: 'Gelap Elegan', bg: '#0F172A', text: '#F8FAFC', accent: '#38BDF8' },
];

interface QrisConfigPanelProps {
  onSaved?: () => void;
}

export default function QrisConfigPanel({ onSaved }: QrisConfigPanelProps) {
  const { paymentSettings, updatePaymentSettings } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [qrisPayload, setQrisPayload] = useState(paymentSettings.qrisPayload);
  const [qrisImageData, setQrisImageData] = useState(paymentSettings.qrisImageData);
  const [merchantName, setMerchantName] = useState(paymentSettings.qrisMerchantName);
  const [qrisTheme, setQrisTheme] = useState<QrisCardTheme>(paymentSettings.qrisTheme || 'classic');
  const [qrisCustomNote, setQrisCustomNote] = useState(paymentSettings.qrisCustomNote || '');
  const [showQrisOnReceipt, setShowQrisOnReceipt] = useState(
    paymentSettings.showQrisOnReceipt ?? true
  );
  const [bankName, setBankName] = useState(paymentSettings.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(paymentSettings.bankAccountNumber);
  const [bankAccountHolder, setBankAccountHolder] = useState(paymentSettings.bankAccountHolder);

  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const parsedPayload = useMemo(
    () => (qrisPayload.trim() ? parseAndValidateQris(qrisPayload) : null),
    [qrisPayload]
  );

  useEffect(() => {
    let active = true;
    if (!parsedPayload || !parsedPayload.valid) {
      return;
    }
    const sampleDynamic = buildDynamicQrisPayload(
      parsedPayload.cleanedPayload,
      25000,
      true,
      'TRX-CONTOH'
    );
    void generateQrisQrDataUrl(sampleDynamic)
      .then((url) => {
        if (active) setPreviewQrUrl(url);
      })
      .catch(() => {
        if (active) setPreviewQrUrl('');
      });
    return () => {
      active = false;
    };
  }, [parsedPayload]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Silakan pilih file gambar (PNG, JPG, atau WebP).' });
      return;
    }

    setIsDecodingImage(true);
    setFeedback(null);
    try {
      const result = await processQrisImageUpload(file);
      setQrisImageData(result.compressedDataUrl);

      if (result.decodedPayload && result.parsedInfo?.valid) {
        setQrisPayload(result.decodedPayload);
        if (result.parsedInfo.merchantName) {
          setMerchantName(result.parsedInfo.merchantName);
        }
        setFeedback({
          type: 'success',
          text: `Gambar QRIS berhasil dipasang (${result.parsedInfo.merchantName || 'Toko Anda'}). Nominal belanja pembeli akan muncul otomatis saat bayar di kasir.`,
        });
      } else {
        setQrisPayload('');
        setFeedback({
          type: 'info',
          text: 'Gambar QRIS berhasil dipasang dan siap ditampilkan di layar kasir saat pembayaran.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal memproses gambar QRIS. Pastikan file gambar tidak rusak.',
      });
    } finally {
      setIsDecodingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);
    try {
      const trimmedPayload = qrisPayload.trim();
      const cleaned = trimmedPayload ? parseAndValidateQris(trimmedPayload) : null;
      const res = await updatePaymentSettings({
        qrisPayload: cleaned?.valid ? cleaned.cleanedPayload : '',
        qrisImageData,
        qrisMerchantName: (merchantName || cleaned?.merchantName || '').trim(),
        qrisNmid: (cleaned?.nmid || paymentSettings.qrisNmid || '').trim(),
        qrisTheme,
        qrisCustomNote: qrisCustomNote.trim(),
        showQrisOnReceipt,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal menyimpan pengaturan pembayaran.' });
        return;
      }
      setFeedback({
        type: 'success',
        text: 'Pengaturan QRIS & rekening bank toko berhasil disimpan.',
      });
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearQris = async () => {
    setQrisPayload('');
    setQrisImageData('');
    setMerchantName('');
    setPreviewQrUrl('');
    setIsSaving(true);
    try {
      await updatePaymentSettings({
        qrisPayload: '',
        qrisImageData: '',
        qrisMerchantName: '',
        qrisNmid: '',
      });
      setFeedback({ type: 'info', text: 'Gambar QRIS toko telah dihapus.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isDynamicReady = Boolean(parsedPayload?.valid);
  const selectedThemeSpec = QRIS_THEMES.find((t) => t.id === qrisTheme) || QRIS_THEMES[0];

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {feedback && (
        <div
          className={feedback.type === 'error' ? 'alert-box' : 'sip-card'}
          style={{
            padding: '11px 14px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            ...(feedback.type === 'success'
              ? {
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.09)',
                }
              : feedback.type === 'info'
              ? {
                  borderColor: 'rgba(var(--accent-cyan-rgb), 0.35)',
                  backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.08)',
                }
              : {}),
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={15} style={{ color: 'var(--accent-green-text)', flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertCircle size={15} style={{ color: feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Upload / Scan Image + Live Preview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <label className="form-label">Gambar QRIS Toko</label>
            <button
              type="button"
              disabled={isDecodingImage}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{
                width: '100%',
                minHeight: '46px',
                borderStyle: 'dashed',
                borderColor: 'rgba(var(--accent-cyan-rgb), 0.5)',
                color: 'var(--accent-cyan)',
              }}
            >
              {isDecodingImage ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImagePlus size={16} />
              )}
              <span>
                {isDecodingImage
                  ? 'Memproses gambar QRIS...'
                  : qrisImageData || isDynamicReady
                  ? 'Ganti Gambar QRIS Toko'
                  : 'Pilih / Unggah Gambar QRIS'}
              </span>
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Unggah gambar atau foto QRIS toko Anda (dari GoPay Merchant, DANA Bisnis, BCA, BRI, Mandiri, ShopeePay, dll). Saat kasir memilih metode bayar QRIS, kode ini langsung tampil untuk di-scan pembeli.
            </p>
          </div>

          <div>
            <label className="form-label">Nama Toko pada Tampilan QRIS</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Contoh: TOKO SUMBER REJEKI"
              className="sip-input"
            />
          </div>
        </div>

        {/* Live QR Preview Box */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
            CONTOH TAMPILAN QRIS DI KASIR
          </div>

          {isDynamicReady && previewQrUrl ? (
            <div
              style={{
                backgroundColor: selectedThemeSpec.bg,
                color: selectedThemeSpec.text,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                width: '100%',
                maxWidth: '210px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                {merchantName || parsedPayload?.merchantName || 'TOKO ANDA'}
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '6px' }}>
                <img
                  src={previewQrUrl}
                  alt="Pratinjau QRIS Toko"
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
                />
              </div>
              <div
                className="font-mono"
                style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: selectedThemeSpec.accent,
                }}
              >
                Tagihan: {formatRupiah(25000)}
              </div>
              {qrisCustomNote.trim() && (
                <div style={{ fontSize: '9.5px', opacity: 0.85, marginTop: '3px' }}>
                  {qrisCustomNote.trim()}
                </div>
              )}
            </div>
          ) : qrisImageData ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '8px',
                borderRadius: '10px',
                maxWidth: '200px',
                width: '100%',
              }}
            >
              <img
                src={qrisImageData}
                alt="QRIS Toko"
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '6px',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '148px',
                height: '148px',
                borderRadius: '10px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
                fontSize: '11.5px',
                padding: '12px',
              }}
            >
              <QrCode size={34} opacity={0.45} />
              <span>Belum ada gambar QRIS</span>
            </div>
          )}
        </div>
      </div>

      {/* Bank Transfer Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <label className="form-label">Nama Bank Transfer (Opsional)</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Contoh: BCA / BRI / Mandiri"
            className="sip-input"
          />
        </div>
        <div>
          <label className="form-label">Nomor Rekening Toko (Opsional)</label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="Contoh: 8820-192-381"
            className="sip-input font-mono"
          />
        </div>
        <div>
          <label className="form-label">Atas Nama Rekening (Opsional)</label>
          <input
            type="text"
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            placeholder="Contoh: Nama Pemilik Toko"
            className="sip-input"
          />
        </div>
      </div>

      {/* Custom Nota QRIS Styling & Receipt Behavior */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div>
          <label className="form-label">Tema Warna Bingkai QRIS</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
              gap: '8px',
            }}
          >
            {QRIS_THEMES.map((t) => {
              const active = qrisTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQrisTheme(t.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: active ? 'var(--accent-cyan)' : 'var(--border-color)',
                    backgroundColor: active
                      ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                      : 'var(--bg-card)',
                    color: active ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '4px',
                      backgroundColor: t.bg,
                      border: `2px solid ${t.accent}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="form-label">Catatan Singkat di Bawah QRIS (Opsional)</label>
          <input
            type="text"
            value={qrisCustomNote}
            onChange={(e) => setQrisCustomNote(e.target.value)}
            placeholder="Contoh: Tunjukkan bukti bayar ke petugas kasir"
            className="sip-input"
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>Tampilkan Kode QRIS pada Struk Belanja Cetak</span>
          <input
            type="checkbox"
            checked={showQrisOnReceipt}
            onChange={(e) => setShowQrisOnReceipt(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
          />
        </label>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {(qrisPayload || qrisImageData) ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleClearQris()}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-red)' }}
          >
            <Trash2 size={14} />
            <span>Hapus QRIS</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary"
          style={{ minHeight: '42px', padding: '0 18px' }}
        >
          {isSaving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          <span>Simpan Pengaturan Pembayaran</span>
        </button>
      </div>
    </form>
  );
}
