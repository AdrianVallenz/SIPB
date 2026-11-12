'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CheckCircle2,
  AlertCircle,
  Printer,
  Loader2,
  X,
  Sliders,
} from 'lucide-react';

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrinterModal({ isOpen, onClose }: PrinterModalProps) {
  const { user } = useApp();
  const {
    runtime,
    settings,
    supportInfo,
    isConnected,
    isBusy,
    connect,
    disconnect,
    updateSettings,
    testPrint,
  } = useBluetoothPrinter();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showStoreForm, setShowStoreForm] = useState(false);

  if (!isOpen) return null;

  const isAdmin = user?.role === 'admin';

  const handleConnect = async () => {
    setFeedback(null);
    const res = await connect();
    if (res.success) {
      setFeedback({
        type: 'success',
        text: `Printer "${res.deviceName}" berhasil terhubung via Bluetooth.`,
      });
    } else if (res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  const handleTestPrint = async () => {
    setFeedback(null);
    const res = await testPrint();
    if (res.success) {
      setFeedback({
        type: 'success',
        text: 'Struk uji coba berhasil dikirim ke printer thermal Bluetooth!',
      });
    } else if (res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-sheet"
        style={{ maxWidth: '480px', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            marginBottom: '14px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isConnected
                  ? 'var(--accent-green-bg)'
                  : 'rgba(var(--accent-cyan-rgb), 0.14)',
                color: isConnected ? 'var(--accent-green-text)' : 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isConnected ? <BluetoothConnected size={18} /> : <Bluetooth size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0 }}>
                Printer Thermal Bluetooth
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Cetak langsung ke printer thermal 58mm / 80mm tanpa dialog OS
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="btn btn-secondary btn-icon" aria-label="Tutup">
            <X size={16} />
          </button>
        </div>

        {/* Browser Support Warning */}
        {!supportInfo.supported && (
          <div className="alert-box-warning" style={{ marginBottom: '14px', fontSize: '12px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{supportInfo.reason}</span>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={feedback.type === 'error' ? 'alert-box' : 'alert-box-info'}
            style={{ marginBottom: '14px', fontSize: '12.5px' }}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Connection Status Card */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid',
            borderColor: isConnected ? 'rgba(var(--accent-cyan-rgb), 0.45)' : 'var(--border-color)',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                STATUS PERANGKAT
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                {isConnected
                  ? runtime.deviceName || settings.lastDeviceName || 'Printer Thermal BLE'
                  : settings.lastDeviceName
                  ? `Terakhir: ${settings.lastDeviceName} (Terputus)`
                  : 'Belum ada printer terhubung'}
              </div>
            </div>
            <span className={`badge ${isConnected ? 'badge-green' : 'badge-muted'}`}>
              {runtime.status === 'connecting'
                ? 'Menghubungkan...'
                : runtime.status === 'printing'
                ? 'Mencetak...'
                : isConnected
                ? 'Terhubung'
                : 'Siaga'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isConnected ? (
              <button
                type="button"
                disabled={isBusy || !supportInfo.supported}
                onClick={() => void handleConnect()}
                className="btn btn-primary"
                style={{ flex: 1, minHeight: '42px' }}
              >
                {runtime.status === 'connecting' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Bluetooth size={15} />
                )}
                <span>Hubungkan Printer Bluetooth</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleTestPrint()}
                  className="btn btn-primary"
                  style={{ flex: 1, minHeight: '42px' }}
                >
                  {runtime.status === 'printing' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Printer size={15} />
                  )}
                  <span>Tes Cetak Struk</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    disconnect();
                    setFeedback(null);
                  }}
                  className="btn btn-secondary"
                  style={{ minHeight: '42px', color: 'var(--accent-red)' }}
                >
                  <BluetoothOff size={15} />
                  <span>Putus</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Paper Size & Auto Print */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label className="form-label">Lebar Kertas Thermal</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['58mm', '80mm'] as const).map((w) => {
                const selected = settings.paperWidth === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => updateSettings({ paperWidth: w })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: selected ? 'var(--accent-cyan)' : 'var(--border-color)',
                      backgroundColor: selected ? 'rgba(var(--accent-cyan-rgb), 0.14)' : 'var(--bg-subtle)',
                      color: selected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>Thermal {w}</div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {w === '58mm' ? '32 karakter / baris (Portabel)' : '48 karakter / baris (Meja)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Cetak Otomatis Setelah Bayar</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Langsung kirim ke printer Bluetooth saat transaksi selesai (jika sudah terhubung)
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPrintOnSale}
              onChange={(e) => updateSettings({ autoPrintOnSale: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', flexShrink: 0 }}
            />
          </label>
        </div>

        {/* Store Header Identity Quick Editor (Admin only) */}
        {isAdmin && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <button
              type="button"
              onClick={() => setShowStoreForm((v) => !v)}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between', padding: '9px 12px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Sliders size={14} style={{ color: 'var(--accent-cyan)' }} />
                Identitas Toko &amp; Footer Struk
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {showStoreForm ? 'Tutup' : 'Ubah'}
              </span>
            </button>

            {showStoreForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <div>
                  <label className="form-label">Nama Toko (Header Struk)</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => updateSettings({ storeName: e.target.value })}
                    className="sip-input"
                  />
                </div>
                <div>
                  <label className="form-label">Subjudul / Tagline</label>
                  <input
                    type="text"
                    value={settings.storeTagline}
                    onChange={(e) => updateSettings({ storeTagline: e.target.value })}
                    className="sip-input"
                  />
                </div>
                <div>
                  <label className="form-label">Alamat Toko</label>
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={(e) => updateSettings({ storeAddress: e.target.value })}
                    className="sip-input"
                  />
                </div>
                <div>
                  <label className="form-label">No. Telepon / Website</label>
                  <input
                    type="text"
                    value={settings.storePhone}
                    onChange={(e) => updateSettings({ storePhone: e.target.value })}
                    className="sip-input"
                  />
                </div>
                <div>
                  <label className="form-label">Ucapan Footer Struk</label>
                  <input
                    type="text"
                    value={settings.receiptFooter}
                    onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
                    className="sip-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
          }}
        >
          Tips: Nyalakan printer Bluetooth (58mm/80mm BLE seperti RPP02N, Eppos, Xprinter, Blueprint, Panda, Zjiang) sebelum menekan <strong>Hubungkan Printer Bluetooth</strong> pada Google Chrome di Android/Desktop.
        </div>
      </div>
    </div>
  );
}

