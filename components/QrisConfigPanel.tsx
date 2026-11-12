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
  const [nmid, setNmid] = useState(paymentSettings.qrisNmid);
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
      'TRX-20261112-DEMO'
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

  const handlePayloadChange = (val: string) => {
    setQrisPayload(val);
    setFeedback(null);
    const trimmed = val.trim();
    if (!trimmed) return;
    const check = parseAndValidateQris(trimmed);
    if (check.valid) {
      if (check.merchantName && !merchantName.trim()) {
        setMerchantName(check.merchantName);
      }
      if (check.nmid && !nmid.trim()) {
        setNmid(check.nmid);
      }
    }
  };

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
        if (result.parsedInfo.nmid) {
          setNmid(result.parsedInfo.nmid);
        }
        setFeedback({
          type: 'success',
          text: `QRIS berhasil terbaca (${result.parsedInfo.merchantName || 'Merchant QRIS'}). Nominal tagihan akan otomatis dinamis saat kasir checkout.`,
        });
      } else {
        setFeedback({
          type: 'info',
          text: 'Gambar QRIS tersimpan sebagai QRIS statis. Untuk fitur nominal otomatis, unggah foto QRIS yang lebih tajam/jelas atau tempel string kode QRIS.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal memproses gambar QRIS. Pastikan file gambar valid.',
      });
    } finally {
      setIsDecodingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedPayload = qrisPayload.trim();
    if (trimmedPayload) {
      const check = parseAndValidateQris(trimmedPayload);
      if (!check.valid) {
        setFeedback({
          type: 'error',
          text: check.error || 'Format string QRIS tidak valid.',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const cleaned = trimmedPayload ? parseAndValidateQris(trimmedPayload) : null;
      const res = await updatePaymentSettings({
        qrisPayload: cleaned?.valid ? cleaned.cleanedPayload : '',
        qrisImageData,
        qrisMerchantName: (merchantName || cleaned?.merchantName || '').trim(),
        qrisNmid: (nmid || cleaned?.nmid || '').trim(),
        qrisTheme,
        qrisCustomNote: qrisCustomNote.trim(),
        showQrisOnReceipt,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal menyimpan pengaturan QRIS.' });
        return;
      }
      setFeedback({
        type: 'success',
        text: 'Konfigurasi QRIS Bayar & Rekening Toko berhasil disimpan dan disinkronkan ke seluruh kasir.',
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
    setNmid('');
    setPreviewQrUrl('');
    setIsSaving(true);
    try {
      await updatePaymentSettings({
        qrisPayload: '',
        qrisImageData: '',
        qrisMerchantName: '',
        qrisNmid: '',
      });
      setFeedback({ type: 'info', text: 'Data QRIS toko dikosongkan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isDynamicReady = Boolean(parsedPayload?.valid);
  const isStaticReady = !isDynamicReady && Boolean(qrisImageData);
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

      {/* Status Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
          <QrCode size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>Status QRIS Bayar Toko:</span>
        </div>
        <span
          className={`badge ${
            isDynamicReady ? 'badge-green' : isStaticReady ? 'badge-cyan' : 'badge-muted'
          }`}
        >
          {isDynamicReady
            ? 'Aktif • Dinamis (Nominal Otomatis)'
            : isStaticReady
            ? 'Aktif • Gambar Statis'
            : 'Belum Diatur'}
        </span>
      </div>

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="form-label">1. Unggah / Foto QRIS Merchant (Paling Praktis)</label>
            <button
              type="button"
              disabled={isDecodingImage}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{
                width: '100%',
                minHeight: '44px',
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
                  ? 'Membaca kode QRIS...'
                  : qrisImageData
                  ? 'Ganti Gambar QRIS Merchant'
                  : 'Pilih / Foto Gambar QRIS'}
              </span>
            </button>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.45 }}>
              Unggah screenshot QRIS dari GoPay Merchant, DANA Bisnis, BCA, BRI, Mandiri, ShopeePay, atau foto papan QRIS toko Anda. Sistem otomatis membaca kode EMVCo untuk QRIS Dinamis.
            </p>
          </div>

          <div>
            <label className="form-label">2. Atau Tempel Kode String QRIS (EMVCo)</label>
            <textarea
              rows={3}
              value={qrisPayload}
              onChange={(e) => handlePayloadChange(e.target.value)}
              placeholder="00020101021126610014COM.GO-JEK.WWW..."
              className="sip-input font-mono"
              style={{
                fontSize: '12px',
                resize: 'vertical',
                minHeight: '78px',
                wordBreak: 'break-all',
              }}
            />
            {parsedPayload && !parsedPayload.valid && (
              <div style={{ fontSize: '11.5px', color: 'var(--accent-red)', marginTop: '4px' }}>
                {parsedPayload.error}
              </div>
            )}
            {parsedPayload && parsedPayload.valid && (
              <div style={{ fontSize: '11.5px', color: 'var(--accent-green-text)', marginTop: '4px' }}>
                Kode QRIS valid ({parsedPayload.merchantName || 'Merchant'}
                {parsedPayload.merchantCity ? ` • ${parsedPayload.merchantCity}` : ''})
              </div>
            )}
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
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
            {isDynamicReady
              ? 'PRATINJAU QRIS DINAMIS (CONTOH RP 25.000)'
              : isStaticReady
              ? 'PRATINJAU GAMBAR QRIS TOKO'
              : 'PRATINJAU QRIS BAYAR'}
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
                maxWidth: '220px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, marginBottom: '2px' }}>
                {merchantName || parsedPayload?.merchantName || 'TOKO ANDA'}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: '9.5px', opacity: 0.78, marginBottom: '6px' }}
              >
                No. Nota: TRX-20261112-DEMO
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '6px' }}>
                <img
                  src={previewQrUrl}
                  alt="Pratinjau QRIS Dinamis"
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
                Uji Tagihan: {formatRupiah(25000)}
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
                maxWidth: '210px',
                width: '100%',
              }}
            >
              <img
                src={qrisImageData}
                alt="QRIS Merchant"
                style={{
                  width: '100%',
                  maxHeight: '220px',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '6px',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '160px',
                height: '160px',
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
              <QrCode size={38} opacity={0.45} />
              <span>Belum ada QRIS</span>
            </div>
          )}
        </div>
      </div>

      {/* Merchant Identity & Bank Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <label className="form-label">Nama Merchant QRIS</label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Contoh: TOKO MAJU JAYA"
            className="sip-input"
          />
        </div>
        <div>
          <label className="form-label">NMID QRIS (Opsional)</label>
          <input
            type="text"
            value={nmid}
            onChange={(e) => setNmid(e.target.value)}
            placeholder="ID10200..."
            className="sip-input font-mono"
          />
        </div>
        <div>
          <label className="form-label">Bank Transfer Toko (Opsional)</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Contoh: BCA / BRI / Mandiri"
            className="sip-input"
          />
        </div>
        <div>
          <label className="form-label">No. Rekening Transfer (Opsional)</label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="Contoh: 8820-192-381"
            className="sip-input font-mono"
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Atas Nama Rekening (Opsional)</label>
          <input
            type="text"
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            placeholder="Contoh: PT / Nama Pemilik Toko"
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
          <label className="form-label">Tema Kartu QRIS Nota</label>
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
          <label className="form-label">Catatan Custom di Kartu QRIS &amp; Nota (Opsional)</label>
          <input
            type="text"
            value={qrisCustomNote}
            onChange={(e) => setQrisCustomNote(e.target.value)}
            placeholder="Contoh: Pastikan nama toko sesuai & tunjukkan bukti bayar ke kasir"
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
          <span>Sertakan QR Code Custom pada Struk / Nota Cetak</span>
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
          disabled={isSaving || (Boolean(qrisPayload.trim()) && !parsedPayload?.valid)}
          className="btn btn-primary"
          style={{ minHeight: '42px', padding: '0 18px' }}
        >
          {isSaving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          <span>Simpan Konfigurasi QRIS &amp; Bayar</span>
        </button>
      </div>
    </form>
  );
}
