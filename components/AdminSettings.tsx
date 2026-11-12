'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CashierAccount } from '@/lib/types';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import {
  Shield,
  Database,
  UserPlus,
  Users,
  Trash2,
  Power,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  User,
  Lock,
  X,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Printer,
} from 'lucide-react';

export default function AdminSettings() {
  const {
    user,
    products,
    transactions,
    stockLogs,
    cashiers,
    isCloudConnected,
    createCashier,
    toggleCashierStatus,
    updateCashier,
    deleteCashier,
  } = useApp();

  const [cashierName, setCashierName] = useState('');
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editingCashier, setEditingCashier] = useState<CashierAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    runtime: printerRuntime,
    settings: printerSettings,
    supportInfo: btSupport,
    isConnected: isPrinterConnected,
    isBusy: isPrinterBusy,
    connect: connectPrinter,
    disconnect: disconnectPrinter,
    updateSettings: updatePrinterSettings,
    testPrint,
  } = useBluetoothPrinter();

  const handleConnectBt = async () => {
    setFeedback(null);
    const res = await connectPrinter();
    if (res.success) {
      setFeedback({
        type: 'success',
        text: `Printer Bluetooth "${res.deviceName}" berhasil terhubung.`,
      });
    } else if (res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  const handleTestBtPrint = async () => {
    setFeedback(null);
    const res = await testPrint();
    if (res.success) {
      setFeedback({
        type: 'success',
        text: 'Tes cetak struk berhasil dikirim ke printer Bluetooth!',
      });
    } else if (res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setFeedback(null);
    setIsCreating(true);
    try {
      const res = await createCashier(cashierName, cashierEmail, cashierPassword);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal membuat akun kasir.' });
        return;
      }
      setFeedback({
        type: 'success',
        text: `Akun kasir "${cashierEmail.trim().toLowerCase()}" berhasil dibuat dan siap digunakan di Terminal POS.`,
      });
      setCashierName('');
      setCashierEmail('');
      setCashierPassword('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (c: CashierAccount) => {
    if (busyId) return;
    setFeedback(null);
    setBusyId(c.id);
    try {
      const nextState = !c.isActive;
      const res = await toggleCashierStatus(c.id, nextState);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal memperbarui status akun kasir.' });
      } else {
        setFeedback({
          type: 'success',
          text: `Akun kasir "${c.name}" sekarang ${nextState ? 'Aktif' : 'Dinonaktifkan'}.`,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCashier = async (c: CashierAccount) => {
    if (busyId) return;
    setFeedback(null);
    setBusyId(c.id);
    try {
      const res = await deleteCashier(c.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal menghapus akun kasir.' });
      } else {
        setFeedback({ type: 'success', text: `Akun kasir "${c.name}" (${c.email}) dihapus.` });
      }
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const openEditModal = (c: CashierAccount) => {
    setEditingCashier(c);
    setEditName(c.name);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCashier || isSavingEdit) return;
    setFeedback(null);
    setIsSavingEdit(true);
    try {
      const patch: { name?: string; password?: string } = {};
      if (editName.trim() && editName.trim() !== editingCashier.name) {
        patch.name = editName.trim();
      }
      if (editPassword) {
        patch.password = editPassword;
      }
      const res = await updateCashier(editingCashier.id, patch);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Gagal memperbarui kasir.' });
        return;
      }
      setFeedback({
        type: 'success',
        text: `Data akun kasir "${editName.trim() || editingCashier.name}" berhasil diperbarui.`,
      });
      setEditingCashier(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Pengaturan Sistem &amp; Manajemen Akun Kasir</h2>
          <p className="page-subtitle">
            Buat dan kelola akun petugas kasir untuk toko Anda, pantau status isolasi database per pengguna, serta otorisasi peran.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={feedback.type === 'error' ? 'alert-box' : 'sip-card'}
          style={
            feedback.type === 'success'
              ? {
                  padding: '12px 16px',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.09)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }
              : { justifyContent: 'space-between' }
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px',
            }}
            aria-label="Tutup notifikasi"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bluetooth Thermal Printer & Store Receipt Config */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isPrinterConnected ? (
              <BluetoothConnected size={18} style={{ color: 'var(--accent-green-text)' }} />
            ) : (
              <Bluetooth size={18} style={{ color: 'var(--accent-cyan)' }} />
            )}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                Printer Thermal Bluetooth &amp; Identitas Struk
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Hubungkan printer thermal 58mm/80mm langsung via Bluetooth (Android Chrome / Desktop) &amp; atur header struk.
              </p>
            </div>
          </div>
          <span className={`badge ${isPrinterConnected ? 'badge-green' : 'badge-muted'}`}>
            {isPrinterConnected
              ? `Terhubung: ${printerRuntime.deviceName || printerSettings.lastDeviceName || 'Thermal BLE'}`
              : 'Belum Terhubung'}
          </span>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!btSupport.supported && (
            <div className="alert-box-warning" style={{ fontSize: '12px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{btSupport.reason}</span>
            </div>
          )}

          {/* Pairing & Paper Size */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  KONEKSI PRINTER BLUETOOTH
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '4px' }}>
                  {isPrinterConnected
                    ? printerRuntime.deviceName || printerSettings.lastDeviceName
                    : printerSettings.lastDeviceName
                    ? `Terakhir: ${printerSettings.lastDeviceName}`
                    : 'Siap dipasangkan (BLE ESC/POS)'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!isPrinterConnected ? (
                  <button
                    type="button"
                    disabled={isPrinterBusy || !btSupport.supported}
                    onClick={() => void handleConnectBt()}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, minHeight: '38px' }}
                  >
                    {printerRuntime.status === 'connecting' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Bluetooth size={14} />
                    )}
                    <span>Hubungkan Printer</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isPrinterBusy}
                      onClick={() => void handleTestBtPrint()}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, minHeight: '38px' }}
                    >
                      {printerRuntime.status === 'printing' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Printer size={14} />
                      )}
                      <span>Tes Cetak</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPrinterBusy}
                      onClick={disconnectPrinter}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '38px', color: 'var(--accent-red)' }}
                    >
                      <BluetoothOff size={14} />
                      <span>Putus</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  UKURAN KERTAS &amp; OTOMATISASI
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['58mm', '80mm'] as const).map((w) => {
                    const selected = printerSettings.paperWidth === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updatePrinterSettings({ paperWidth: w })}
                        className="btn btn-sm"
                        style={{
                          borderColor: selected ? 'var(--accent-cyan)' : 'var(--border-color)',
                          backgroundColor: selected
                            ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                            : 'var(--bg-card)',
                          color: selected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        }}
                      >
                        {w} ({w === '58mm' ? '32 kol' : '48 kol'})
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
                  gap: '10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Cetak otomatis Bluetooth usai checkout</span>
                <input
                  type="checkbox"
                  checked={printerSettings.autoPrintOnSale}
                  onChange={(e) => updatePrinterSettings({ autoPrintOnSale: e.target.checked })}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent-cyan)' }}
                />
              </label>
            </div>
          </div>

          {/* Store Header Customization */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <label className="form-label">Nama Toko di Struk</label>
              <input
                type="text"
                value={printerSettings.storeName}
                onChange={(e) => updatePrinterSettings({ storeName: e.target.value })}
                className="sip-input"
              />
            </div>
            <div>
              <label className="form-label">Tagline / Subjudul Struk</label>
              <input
                type="text"
                value={printerSettings.storeTagline}
                onChange={(e) => updatePrinterSettings({ storeTagline: e.target.value })}
                className="sip-input"
              />
            </div>
            <div>
              <label className="form-label">Alamat Toko</label>
              <input
                type="text"
                value={printerSettings.storeAddress}
                onChange={(e) => updatePrinterSettings({ storeAddress: e.target.value })}
                className="sip-input"
              />
            </div>
            <div>
              <label className="form-label">Telepon / Website Struk</label>
              <input
                type="text"
                value={printerSettings.storePhone}
                onChange={(e) => updatePrinterSettings({ storePhone: e.target.value })}
                className="sip-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Pesan Footer Struk</label>
            <input
              type="text"
              value={printerSettings.receiptFooter}
              onChange={(e) => updatePrinterSettings({ receiptFooter: e.target.value })}
              className="sip-input"
            />
          </div>
        </div>
      </div>

      {/* Cashier Account Management Section */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                Manajemen Akun Kasir Toko Anda ({cashiers.length})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Akun kasir hanya dapat dibuat oleh Administrator dan otomatis terhubung ke katalog &amp; stok toko ini.
              </p>
            </div>
          </div>
          <span className="badge badge-cyan">ADMIN-PROVISIONED CASHIER</span>
        </div>

        {/* Create New Cashier Form */}
        <form
          onSubmit={handleCreateCashier}
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <UserPlus size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span>Tambah Akun Kasir Baru</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            <div>
              <label className="form-label">Nama Petugas Kasir</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rina Shift Pagi"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="sip-input"
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email Login Kasir</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="kasir1@tokoanda.com"
                  value={cashierEmail}
                  onChange={(e) => setCashierEmail(e.target.value)}
                  className="sip-input font-mono"
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Kata Sandi Awal (Min. 6)</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={cashierPassword}
                  onChange={(e) => setCashierPassword(e.target.value)}
                  className="sip-input font-mono"
                  style={{ paddingLeft: '34px', paddingRight: '34px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label="Lihat sandi"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isCreating}
                className="btn btn-primary"
                style={{ width: '100%', height: '38px' }}
              >
                {isCreating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    <span>Buat Akun Kasir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Cashiers List — Desktop Table */}
        <div className="sip-table-container desktop-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>Nama Kasir</th>
                <th>Email Login</th>
                <th>Status Akses</th>
                <th>Dibuat Pada</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}
                  >
                    Belum ada akun kasir untuk toko Anda. Gunakan formulir di atas untuk menambahkan kasir pertama.
                  </td>
                </tr>
              ) : (
                cashiers.map((c) => {
                  const isBusy = busyId === c.id;
                  const isConfirming = confirmDeleteId === c.id;
                  const formattedDate = new Date(c.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '12.5px' }}>
                          {c.email}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                          {c.isActive ? 'Aktif (Bisa Masuk POS)' : 'Dinonaktifkan'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {formattedDate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditModal(c)}
                            className="btn btn-secondary btn-sm"
                            title="Ubah Nama / Reset Kata Sandi"
                          >
                            <KeyRound size={13} />
                            <span>Edit / Sandi</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleStatus(c)}
                            className="btn btn-secondary btn-sm"
                            title={c.isActive ? 'Nonaktifkan Kasir' : 'Aktifkan Kasir'}
                            style={{
                              color: c.isActive
                                ? 'var(--accent-amber-text)'
                                : 'var(--accent-green-text)',
                            }}
                          >
                            <Power size={13} />
                            <span>{c.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          {isConfirming ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDeleteCashier(c)}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: 'var(--accent-red)',
                                  color: '#fff',
                                  borderColor: 'var(--accent-red)',
                                }}
                              >
                                Yakin Hapus?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="btn btn-secondary btn-sm"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--accent-red)' }}
                              title="Hapus Akun Kasir"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cashiers List — Mobile Cards */}
        <div className="mobile-card-list" style={{ padding: '14px' }}>
          {cashiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px 8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Belum ada akun kasir untuk toko Anda. Gunakan formulir di atas untuk menambahkan kasir pertama.
            </div>
          ) : (
            cashiers.map((c) => {
              const isBusy = busyId === c.id;
              const isConfirming = confirmDeleteId === c.id;
              const formattedDate = new Date(c.createdAt).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div key={c.id} className="mobile-data-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                      <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {c.email}
                      </div>
                    </div>
                    <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                      {c.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Dibuat: {formattedDate}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEditModal(c)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, minHeight: '36px' }}
                    >
                      <KeyRound size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleStatus(c)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        flex: 1,
                        minHeight: '36px',
                        color: c.isActive ? 'var(--accent-amber-text)' : 'var(--accent-green-text)',
                      }}
                    >
                      <Power size={13} />
                      <span>{c.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>

                    {isConfirming ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDeleteCashier(c)}
                          className="btn btn-danger btn-sm"
                          style={{ minHeight: '36px' }}
                        >
                          Hapus!
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '36px' }}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ minHeight: '36px', color: 'var(--accent-red)' }}
                        aria-label="Hapus Kasir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Role Matrix Comparison */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Shield size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
              Matriks Otorisasi Hak Akses (Role-Based Access Control)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Pembatasan wewenang operasional antara Administrator pemilik toko dan Petugas Kasir buatannya
            </p>
          </div>
        </div>

        <div className="sip-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>Modul &amp; Hak Operasional</th>
                <th>
                  <span className="badge badge-cyan">Administrator</span>
                </th>
                <th>
                  <span className="badge badge-green">Kasir POS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Terminal Kasir / Point of Sale (POS) &amp; Cetak Struk</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan (Akses Utama)
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Rekapitulasi Transaksi Shift Pribadi</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Semua Kasir Toko
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Shift Pribadi
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Manajemen Master Produk (Tambah / Edit / Hapus SKU)</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Akses Informasi Harga Modal &amp; Margin Laba</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                    Disembunyikan (Rahasia)
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Buat / Nonaktifkan Akun Petugas Kasir</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Dashboard Finansial &amp; Ekspor Laporan Sistem</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>
                    Diizinkan
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Status Card */}
      <div className="sip-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                Isolasi Basis Data Per Akun (Supabase PostgreSQL + RLS)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Data katalog, stok, transaksi, dan kasir terisolasi oleh ID Tenant{' '}
                <code className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                  {user?.ownerId.slice(0, 8)}...
                </code>{' '}
                ({user?.email}).
              </p>
            </div>
          </div>
          <span className={`badge ${isCloudConnected ? 'badge-green' : 'badge-amber'}`}>
            {isCloudConnected ? 'Terhubung ke Supabase Cloud' : 'Mode Cache Lokal'}
          </span>
        </div>

        <div className="kpi-grid">
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Master Produk Toko Ini
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {products.length} SKU
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Transaksi Toko Ini
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                marginTop: '4px',
              }}
            >
              {transactions.length} Nota
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Catatan Log Mutasi Stok
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--accent-green-text)',
                marginTop: '4px',
              }}
            >
              {stockLogs.length} Log
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Akun Kasir Terdaftar
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                marginTop: '4px',
              }}
            >
              {cashiers.length} Kasir
            </div>
          </div>
        </div>
      </div>

      {/* Edit Cashier Modal */}
      {editingCashier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div className="sip-card" style={{ width: '100%', maxWidth: '420px', padding: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Edit Akun Kasir</h3>
              <button
                type="button"
                onClick={() => setEditingCashier(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label className="form-label">Email Kasir</label>
                <input
                  type="text"
                  disabled
                  value={editingCashier.email}
                  className="sip-input font-mono"
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div>
                <label className="form-label">Nama Petugas Kasir</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="sip-input"
                />
              </div>

              <div>
                <label className="form-label">
                  Kata Sandi Baru <span style={{ fontWeight: 400 }}>(Kosongkan jika tidak diubah)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Min. 6 karakter untuk reset sandi"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="sip-input font-mono"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCashier(null)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" disabled={isSavingEdit} className="btn btn-primary">
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
