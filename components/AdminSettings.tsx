'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Shield,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminSettings() {
  const { products, transactions, stockLogs, resetDemoData } = useApp();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleConfirmReset = () => {
    resetDemoData();
    setIsConfirmModalOpen(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3500);
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Pengaturan Sistem &amp; Keamanan Akses</h2>
          <p className="page-subtitle">
            Konfigurasi matriks otorisasi peran pengguna (RBAC) dan pemeliharaan penyimpanan data lokal.
          </p>
        </div>
      </div>

      {resetSuccess && (
        <div className="alert-box-info">
          <CheckCircle2 size={16} />
          <span>Basis data operasional berhasil dikembalikan ke pengaturan awal (default demo).</span>
        </div>
      )}

      {/* Role Matrix Comparison */}
      <div className="sip-card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Shield size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Matriks Otorisasi Hak Akses (Role-Based Access Control)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Pembatasan wewenang operasional antara Administrator dan Petugas Kasir
            </p>
          </div>
        </div>

        <div className="sip-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="sip-table">
            <thead>
              <tr>
                <th>Modul &amp; Hak Operasional</th>
                <th>
                  <span className="badge badge-cyan">Administrator (admin@sip.com)</span>
                </th>
                <th>
                  <span className="badge badge-green">Kasir POS (user@sip.com)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Terminal Kasir / Point of Sale (POS) &amp; Cetak Struk</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan (Akses Utama)</span></td>
              </tr>
              <tr>
                <td><strong>Rekapitulasi Transaksi Shift Pribadi</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
              </tr>
              <tr>
                <td><strong>Manajemen Master Produk (Tambah / Edit / Hapus SKU)</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span></td>
              </tr>
              <tr>
                <td><strong>Akses Informasi Harga Modal &amp; Margin Laba</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Disembunyikan (Rahasia)</span></td>
              </tr>
              <tr>
                <td><strong>Penyesuaian Stok &amp; Log Mutasi Gudang</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span></td>
              </tr>
              <tr>
                <td><strong>Dashboard Finansial &amp; Ekspor Laporan Sistem</strong></td>
                <td><span style={{ color: 'var(--accent-green-text)', fontWeight: 600 }}>Diizinkan</span></td>
                <td><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Dibatasi</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Maintenance Card */}
      <div className="sip-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Database size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Status Penyimpanan Basis Data Lokal</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Data disimpan secara persisten dan tervalidasi pada penyimpanan lokal peramban
            </p>
          </div>
        </div>

        <div className="kpi-grid" style={{ marginBottom: '18px' }}>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Total Master Produk</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {products.length} SKU
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Total Transaksi Tersimpan</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {transactions.length} Nota
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Catatan Log Mutasi Stok</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green-text)', marginTop: '4px' }}>
              {stockLogs.length} Log
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>Pulihkan Data Standar (Reset Demo)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Kembalikan 20 produk awal, riwayat transaksi contoh, dan saldo stok ke kondisi semula.
            </div>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-amber-text)', borderColor: 'rgba(210, 153, 34, 0.4)' }}
          >
            <RotateCcw size={14} />
            <span>Reset Data ke Default</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-amber-bg)',
                  color: 'var(--accent-amber-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
                Reset Seluruh Data ke Default?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Seluruh penambahan produk, perubahan stok, dan transaksi baru yang Anda buat akan dikembalikan ke data awal simulasi.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
