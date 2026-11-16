'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CashierAccount, StorePaymentSettings } from '@/lib/types';
import { PrinterSettings, resolveStoreReceiptProfile } from '@/lib/bluetoothPrinter';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import QrisConfigPanel from './QrisConfigPanel';
import {
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
  Printer,
  QrCode,
} from 'lucide-react';

interface AdminProfileFormProps {
  initialName: string;
  email: string;
  updateOwnProfile: (patch: {
    name?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onFeedback: (fb: { type: 'success' | 'error'; text: string } | null) => void;
}

function AdminProfileForm({
  initialName,
  email,
  updateOwnProfile,
  onFeedback,
}: AdminProfileFormProps) {
  const [adminName, setAdminName] = useState(initialName);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const isDemoAdmin = email.toLowerCase() === 'admin@sipb.web.id';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    onFeedback(null);
    setIsSavingProfile(true);
    try {
      const patch: { name?: string; password?: string } = {};
      if (adminName.trim() && adminName.trim() !== initialName) {
        patch.name = adminName.trim();
      }
      if (adminNewPassword) {
        patch.password = adminNewPassword;
      }
      const res = await updateOwnProfile(patch);
      if (!res.success) {
        onFeedback({ type: 'error', text: res.error || 'Gagal memperbarui profil administrator.' });
        return;
      }
      setAdminNewPassword('');
      onFeedback({
        type: 'success',
        text: 'Profil akun Administrator berhasil diperbarui.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '18px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px',
        alignItems: 'end',
      }}
    >
      <div>
        <label className="form-label">Nama Administrator / Pemilik</label>
        <input
          type="text"
          required
          minLength={2}
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          className="sip-input"
          placeholder="Nama pemilik toko"
        />
      </div>

      <div>
        <label className="form-label">
          Kata Sandi Baru <span style={{ fontWeight: 400 }}>(Kosongkan jika tetap)</span>
        </label>
        <input
          type="password"
          minLength={6}
          disabled={isDemoAdmin}
          value={adminNewPassword}
          onChange={(e) => setAdminNewPassword(e.target.value)}
          className="sip-input font-mono"
          placeholder={isDemoAdmin ? 'Terkunci pada akun demo' : 'Min. 6 karakter baru'}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSavingProfile}
          className="btn btn-primary"
          style={{ width: '100%', height: '38px' }}
        >
          {isSavingProfile ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Simpan Profil Admin</span>
          )}
        </button>
      </div>
    </form>
  );
}

interface StoreReceiptIdentityFormProps {
  paymentSettings: StorePaymentSettings;
  printerSettings: PrinterSettings;
  updatePaymentSettings: (
    patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>
  ) => Promise<{ success: boolean; error?: string }>;
  updatePrinterSettings: (patch: Partial<PrinterSettings>) => void;
  onFeedback: (fb: { type: 'success' | 'error'; text: string } | null) => void;
}

function StoreReceiptIdentityForm({
  paymentSettings,
  printerSettings,
  updatePaymentSettings,
  updatePrinterSettings,
  onFeedback,
}: StoreReceiptIdentityFormProps) {
  const initialProfile = resolveStoreReceiptProfile(paymentSettings, printerSettings);
  const [storeName, setStoreName] = useState(initialProfile.storeName);
  const [storeTagline, setStoreTagline] = useState(initialProfile.storeTagline);
  const [storeAddress, setStoreAddress] = useState(initialProfile.storeAddress);
  const [storePhone, setStorePhone] = useState(initialProfile.storePhone);
  const [receiptFooter, setReceiptFooter] = useState(initialProfile.receiptFooter);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(initialProfile.paperWidth);
  const [isSavingStore, setIsSavingStore] = useState(false);

  const handleSaveStoreIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingStore) return;
    onFeedback(null);

    const trimmedName = storeName.trim();
    if (!trimmedName) {
      onFeedback({ type: 'error', text: 'Nama toko di struk wajib diisi.' });
      return;
    }

    setIsSavingStore(true);
    try {
      const normalized = {
        storeName: trimmedName,
        storeTagline: storeTagline.trim(),
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        receiptFooter: receiptFooter.trim(),
        paperWidth,
      };
      const res = await updatePaymentSettings(normalized);
      if (!res.success) {
        onFeedback({
          type: 'error',
          text: res.error || 'Gagal menyimpan identitas toko ke server.',
        });
        return;
      }
      updatePrinterSettings(normalized);
      onFeedback({
        type: 'success',
        text: 'Identitas toko & pengaturan struk berhasil disimpan ke cloud untuk semua perangkat kasir.',
      });
    } finally {
      setIsSavingStore(false);
    }
  };

  return (
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: '1 1 220px' }}>
          <Printer size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>
              Identitas Toko &amp; Tampilan Struk Belanja
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Informasi nama toko, alamat, nomor telepon, dan pesan penutup tersimpan di cloud dan otomatis dipakai oleh semua perangkat kasir.
            </p>
          </div>
        </div>
        <span className="badge badge-cyan" style={{ flexShrink: 0 }}>
          Ukuran Kertas: {paperWidth}
        </span>
      </div>

      <form
        onSubmit={handleSaveStoreIdentity}
        style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
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
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              disabled={isSavingStore}
              placeholder="Contoh: Toko Sumber Rejeki"
              className="sip-input"
            />
          </div>
          <div>
            <label className="form-label">Slogan / Subjudul Toko</label>
            <input
              type="text"
              value={storeTagline}
              onChange={(e) => setStoreTagline(e.target.value)}
              disabled={isSavingStore}
              placeholder="Contoh: Belanja Hemat Setiap Hari"
              className="sip-input"
            />
          </div>
          <div>
            <label className="form-label">Alamat Toko</label>
            <input
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              disabled={isSavingStore}
              placeholder="Contoh: Jl. Merdeka No. 12"
              className="sip-input"
            />
          </div>
          <div>
            <label className="form-label">Nomor Telepon / WhatsApp Toko</label>
            <input
              type="text"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              disabled={isSavingStore}
              placeholder="Contoh: 0812-3456-7890"
              className="sip-input"
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label className="form-label">Pesan Penutup di Bawah Struk</label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              disabled={isSavingStore}
              placeholder="Contoh: Terima kasih sudah berbelanja di toko kami!"
              className="sip-input"
            />
          </div>

          <div>
            <label className="form-label">Ukuran Kertas Struk Kasir</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['58mm', '80mm'] as const).map((w) => {
                const selected = paperWidth === w;
                return (
                  <button
                    key={w}
                    type="button"
                    disabled={isSavingStore}
                    onClick={() => setPaperWidth(w)}
                    className="btn btn-sm"
                    style={{
                      minHeight: '38px',
                      borderColor: selected ? 'var(--accent-cyan)' : 'var(--border-color)',
                      backgroundColor: selected
                        ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                        : 'var(--bg-card)',
                      color: selected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    }}
                  >
                    Kertas {w} ({w === '58mm' ? 'Kecil' : 'Lebar'})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSavingStore}
              className="btn btn-primary"
              style={{ width: '100%', height: '38px' }}
            >
              {isSavingStore ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Identitas Struk</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AdminSettings() {
  const {
    user,
    cashiers,
    paymentSettings,
    updatePaymentSettings,
    createCashier,
    toggleCashierStatus,
    updateCashier,
    deleteCashier,
    updateOwnProfile,
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
  const [editModalError, setEditModalError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { settings: printerSettings, updateSettings: updatePrinterSettings } =
    useBluetoothPrinter();

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
        text: `Akun kasir "${cashierEmail.trim().toLowerCase()}" berhasil dibuat dan siap digunakan untuk masuk ke halaman kasir.`,
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
    setEditModalError('');
    setEditingCashier(c);
    setEditName(c.name);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCashier || isSavingEdit) return;
    setEditModalError('');
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
        setEditModalError(res.error || 'Gagal memperbarui kasir.');
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

  const isQrisConfigured = Boolean(
    paymentSettings.qrisPayload.trim() || paymentSettings.qrisImageData
  );
  const activeCashiersCount = cashiers.filter((c) => c.isActive).length;

  return (
    <div className="page-container">
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Pengaturan Toko, Pembayaran &amp; Staf Kasir</h2>
          <p className="page-subtitle">
            Atur identitas toko pada struk belanja, gambar QRIS &amp; nomor rekening pembayaran, serta akun petugas kasir toko Anda.
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

      {/* Admin Profile & Password Section */}
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: '1 1 220px' }}>
            <KeyRound size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>
                Profil &amp; Keamanan Akun Administrator
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Perbarui nama pemilik atau kata sandi akun Administrator Anda ({user?.email}).
              </p>
            </div>
          </div>
          <span className="badge badge-muted font-mono" style={{ flexShrink: 0 }}>
            Admin Toko
          </span>
        </div>

        {user && (
          <AdminProfileForm
            key={user.id}
            initialName={user.name}
            email={user.email}
            updateOwnProfile={updateOwnProfile}
            onFeedback={setFeedback}
          />
        )}
      </div>

      {/* Store Receipt Identity & Paper Width (Synced to Cloud) */}
      <StoreReceiptIdentityForm
        key={paymentSettings.updatedAt || 'store-init'}
        paymentSettings={paymentSettings}
        printerSettings={printerSettings}
        updatePaymentSettings={updatePaymentSettings}
        updatePrinterSettings={updatePrinterSettings}
        onFeedback={setFeedback}
      />

      {/* Store QRIS & Bank Transfer Configuration */}
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: '1 1 220px' }}>
            <QrCode size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>
                QRIS &amp; Rekening Pembayaran Toko
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Pasang gambar QRIS dan nomor rekening bank toko Anda agar kasir dapat menerima pembayaran non-tunai dengan mudah.
              </p>
            </div>
          </div>
          <span className={`badge ${isQrisConfigured ? 'badge-green' : 'badge-muted'}`} style={{ flexShrink: 0 }}>
            {isQrisConfigured ? 'QRIS Siap Digunakan' : 'QRIS Belum Dipasang'}
          </span>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <QrisConfigPanel key={paymentSettings.updatedAt || 'init'} />
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: '1 1 220px' }}>
            <Users size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>
                Akun Staf Kasir Toko ({cashiers.length})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Buat akun khusus untuk staf penjaga kasir. Kasir hanya dapat melayani penjualan tanpa bisa melihat harga modal atau laporan laba Anda.
              </p>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ flexShrink: 0 }}>{activeCashiersCount} Kasir Aktif</span>
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
              <label className="form-label">Kata Sandi Kasir (Min. 6 Karakter)</label>
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
                <th>Terdaftar Sejak</th>
                <th style={{ textAlign: 'right' }}>Pengaturan</th>
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
                  const isDemoCashier = c.email.toLowerCase() === 'kasir@sipb.web.id';
                  const lockReason =
                    'Akun kasir demo dikunci agar selalu dapat digunakan untuk evaluasi aplikasi';
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                            {c.isActive ? 'Aktif (Bisa Masuk Kasir)' : 'Dinonaktifkan'}
                          </span>
                          {isDemoCashier && (
                            <span
                              className="badge badge-muted font-mono"
                              title={lockReason}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Lock size={11} />
                              Demo Terkunci
                            </span>
                          )}
                        </div>
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
                            disabled={isBusy || isDemoCashier}
                            onClick={() => openEditModal(c)}
                            className="btn btn-secondary btn-sm"
                            title={isDemoCashier ? lockReason : 'Ubah Nama / Ganti Kata Sandi'}
                          >
                            <KeyRound size={13} />
                            <span>Ubah / Sandi</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || isDemoCashier}
                            onClick={() => void handleToggleStatus(c)}
                            className="btn btn-secondary btn-sm"
                            title={
                              isDemoCashier
                                ? lockReason
                                : c.isActive
                                  ? 'Nonaktifkan Kasir'
                                  : 'Aktifkan Kasir'
                            }
                            style={{
                              color: c.isActive
                                ? 'var(--accent-amber-text)'
                                : 'var(--accent-green-text)',
                            }}
                          >
                            <Power size={13} />
                            <span>{c.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          {isConfirming && !isDemoCashier ? (
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
                              disabled={isBusy || isDemoCashier}
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--accent-red)' }}
                              title={isDemoCashier ? lockReason : 'Hapus Akun Kasir'}
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
              const isDemoCashier = c.email.toLowerCase() === 'kasir@sipb.web.id';
              const lockReason =
                'Akun kasir demo dikunci agar selalu dapat diakses untuk evaluasi aplikasi';
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      {isDemoCashier && (
                        <span
                          className="badge badge-muted font-mono"
                          title={lockReason}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Lock size={10} />
                          Demo Terkunci
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Terdaftar: {formattedDate}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      disabled={isBusy || isDemoCashier}
                      title={isDemoCashier ? lockReason : 'Ubah Nama / Ganti Kata Sandi'}
                      onClick={() => openEditModal(c)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, minHeight: '36px' }}
                    >
                      <KeyRound size={13} />
                      <span>Ubah / Sandi</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || isDemoCashier}
                      title={
                        isDemoCashier
                          ? lockReason
                          : c.isActive
                            ? 'Nonaktifkan Kasir'
                            : 'Aktifkan Kasir'
                      }
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

                    {isConfirming && !isDemoCashier ? (
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
                        disabled={isBusy || isDemoCashier}
                        title={isDemoCashier ? lockReason : 'Hapus Akun Kasir'}
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

      {/* Edit Cashier Modal */}
      {editingCashier && (
        <div className="modal-backdrop" onClick={() => setEditingCashier(null)}>
          <div
            className="modal-content modal-sheet"
            style={{ maxWidth: '420px', padding: '22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Ubah Data Akun Kasir</h3>
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
              {editModalError && (
                <div className="alert-box">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{editModalError}</span>
                </div>
              )}

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
                  placeholder="Min. 6 karakter untuk mengganti sandi"
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
