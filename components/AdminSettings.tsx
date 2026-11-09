'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Shield, Database } from 'lucide-react';

export default function AdminSettings() {
  const { products, transactions, stockLogs } = useApp();

  return (
    <div className="page-container">
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Pengaturan Sistem &amp; Keamanan Akses</h2>
          <p className="page-subtitle">
            Konfigurasi matriks otorisasi peran pengguna (RBAC) dan informasi penyimpanan basis data lokal.
          </p>
        </div>
      </div>

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

      {/* Database Status Card */}
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

        <div className="kpi-grid">
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
      </div>
    </div>
  );
}
