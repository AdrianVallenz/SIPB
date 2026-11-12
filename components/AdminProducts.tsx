'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, ProductCategory, PRODUCT_CATEGORIES } from '@/lib/types';
import { formatRupiah, formatDateTime } from '@/lib/format';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  PackagePlus,
  X,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Boxes,
  Sparkles,
} from 'lucide-react';

export default function AdminProducts() {
  const { products, stockLogs, addProduct, updateProduct, deleteProduct, adjustStock, loadSampleCatalog } = useApp();
  const [isImportingSample, setIsImportingSample] = useState(false);

  const [viewMode, setViewMode] = useState<'catalog' | 'logs'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [stockStatusFilter, setStockStatusFilter] = useState<'Semua' | 'Aman' | 'Menipis' | 'Habis'>('Semua');

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [modalError, setModalError] = useState<string>('');

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Elektronik' as ProductCategory,
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 5,
    unit: 'pcs',
    description: '',
  });

  // Restock modal form
  const [restockType, setRestockType] = useState<'IN' | 'OUT'>('IN');
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockReason, setRestockReason] = useState<string>('');

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (msg: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMsg(msg);
    feedbackTimerRef.current = setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Filtering products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'Semua' || p.category === categoryFilter;

    let matchesStatus = true;
    if (stockStatusFilter === 'Aman') matchesStatus = p.stock > p.minStock;
    else if (stockStatusFilter === 'Menipis') matchesStatus = p.stock > 0 && p.stock <= p.minStock;
    else if (stockStatusFilter === 'Habis') matchesStatus = p.stock === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenAdd = () => {
    const randomSku = 'PRD-' + Math.floor(100 + Math.random() * 900);
    setModalError('');
    setFormData({
      sku: randomSku,
      name: '',
      category: 'Elektronik',
      buyPrice: 10000,
      sellPrice: 15000,
      stock: 10,
      minStock: 5,
      unit: 'pcs',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setModalError('');
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      description: p.description || '',
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const res = addProduct({
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      buyPrice: Number(formData.buyPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      unit: formData.unit,
      description: formData.description,
    });
    if (!res.success) {
      setModalError(res.error || 'Gagal menambahkan produk.');
      return;
    }
    setIsAddModalOpen(false);
    showFeedback(`Produk "${formData.name}" berhasil ditambahkan ke katalog.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setModalError('');
    const res = updateProduct({
      ...editingProduct,
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      buyPrice: Number(formData.buyPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      unit: formData.unit,
      description: formData.description,
    });
    if (!res.success) {
      setModalError(res.error || 'Gagal memperbarui produk.');
      return;
    }
    setEditingProduct(null);
    showFeedback(`Perubahan pada "${formData.name}" berhasil disimpan.`);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    setModalError('');
    const res = adjustStock(
      restockProduct.id,
      restockQty,
      restockType,
      restockReason || (restockType === 'IN' ? 'Restock pasokan supplier' : 'Pengurangan stok rusak/hilang')
    );
    if (!res.success) {
      setModalError(res.error || 'Gagal menyesuaikan stok.');
      return;
    }
    const prodName = restockProduct.name;
    setRestockProduct(null);
    setRestockReason('');
    showFeedback(`Stok "${prodName}" berhasil diperbarui.`);
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Manajemen Barang &amp; Inventaris</h2>
          <p className="page-subtitle">
            Kelola katalog SKU, pantau margin harga modal &amp; jual, serta riwayat mutasi stok gudang.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sub-navigation Tabs */}
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className="btn btn-sm"
              style={{
                backgroundColor: viewMode === 'catalog' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'catalog' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderColor: viewMode === 'catalog' ? 'var(--border-color)' : 'transparent',
              }}
            >
              <Boxes size={14} />
              <span>Katalog ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('logs')}
              className="btn btn-sm"
              style={{
                backgroundColor: viewMode === 'logs' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'logs' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderColor: viewMode === 'logs' ? 'var(--border-color)' : 'transparent',
              }}
            >
              <ClipboardList size={14} />
              <span>Log Mutasi ({stockLogs.length})</span>
            </button>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>
            <Plus size={15} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="alert-box-info">
          <CheckCircle2 size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {viewMode === 'catalog' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="sip-card" style={{ padding: '14px 18px' }}>
            <div className="filter-grid-3">
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari kode SKU atau nama barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sip-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>

              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="sip-select"
                >
                  <option value="Semua">Semua Kategori</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as 'Semua' | 'Aman' | 'Menipis' | 'Habis')}
                  className="sip-select"
                >
                  <option value="Semua">Semua Status Stok</option>
                  <option value="Aman">Stok Aman</option>
                  <option value="Menipis">Stok Menipis</option>
                  <option value="Habis">Stok Habis</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Products Table (Desktop) */}
          <div className="sip-card desktop-table-wrap" style={{ padding: 0 }}>
            <div className="sip-table-container" style={{ border: 'none' }}>
              <table className="sip-table">
                <thead>
                  <tr>
                    <th>Kode SKU</th>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>Harga Modal</th>
                    <th>Harga Jual</th>
                    <th>Margin</th>
                    <th>Sisa Stok</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const margin =
                      p.sellPrice > 0 ? Math.round(((p.sellPrice - p.buyPrice) / p.sellPrice) * 100) : 0;
                    const isOutOfStock = p.stock === 0;
                    const isLowStock = p.stock > 0 && p.stock <= p.minStock;

                    return (
                      <tr key={p.id}>
                        <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {p.sku}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                maxWidth: '280px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-muted">{p.category}</span>
                        </td>
                        <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatRupiah(p.buyPrice)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700 }}>
                          {formatRupiah(p.sellPrice)}
                        </td>
                        <td>
                          <span className={`badge ${margin >= 0 ? 'badge-green' : 'badge-red'} font-mono`}>
                            {margin >= 0 ? `+${margin}%` : `${margin}%`}
                          </span>
                        </td>
                        <td className="font-mono">
                          <strong>{p.stock}</strong>{' '}
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.unit}</span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isOutOfStock ? 'badge-red' : isLowStock ? 'badge-amber' : 'badge-green'
                            }`}
                          >
                            {isOutOfStock ? 'Habis' : isLowStock ? 'Menipis' : 'Tersedia'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setModalError('');
                                setRestockProduct(p);
                                setRestockQty(10);
                                setRestockType('IN');
                              }}
                              className="btn btn-secondary btn-icon"
                              title="Penyesuaian Stok"
                              style={{ color: 'var(--accent-cyan)' }}
                            >
                              <PackagePlus size={15} />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="btn btn-secondary btn-icon"
                              title="Edit Produk"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => setDeletingProduct(p)}
                              className="btn btn-secondary btn-icon"
                              title="Hapus Produk"
                              style={{ color: 'var(--accent-red)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        {products.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              Katalog Toko Anda Masih Kosong
                            </div>
                            <p style={{ fontSize: '12.5px', maxWidth: '420px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              Setiap akun Administrator memiliki database produk terpisah. Mulai dengan menambahkan produk pertama atau muat contoh katalog awal.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={handleOpenAdd}
                                className="btn btn-primary btn-sm"
                              >
                                <Plus size={14} />
                                <span>Tambah Produk Pertama</span>
                              </button>
                              <button
                                type="button"
                                disabled={isImportingSample}
                                onClick={async () => {
                                  setIsImportingSample(true);
                                  try {
                                    const res = await loadSampleCatalog();
                                    if (res.success) {
                                      showFeedback('8 produk contoh berhasil ditambahkan ke katalog toko Anda.');
                                    }
                                  } finally {
                                    setIsImportingSample(false);
                                  }
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                                <span>{isImportingSample ? 'Memuat Contoh...' : 'Muat 8 Produk Contoh'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          'Tidak ada produk yang sesuai dengan kriteria pencarian.'
                        )}
                      </td>
                    </tr>
                  )}
              </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Products Card List */}
          <div className="mobile-card-list">
            {filteredProducts.map((p) => {
              const margin =
                p.sellPrice > 0 ? Math.round(((p.sellPrice - p.buyPrice) / p.sellPrice) * 100) : 0;
              const isOutOfStock = p.stock === 0;
              const isLowStock = p.stock > 0 && p.stock <= p.minStock;

              return (
                <div key={p.id} className="mobile-data-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {p.sku}
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: '10px', padding: '1px 7px' }}>
                          {p.category}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>{p.name}</div>
                    </div>
                    <span
                      className={`badge ${
                        isOutOfStock ? 'badge-red' : isLowStock ? 'badge-amber' : 'badge-green'
                      }`}
                    >
                      {isOutOfStock ? 'Habis' : `${p.stock} ${p.unit}`}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Harga Jual</div>
                      <div className="font-mono" style={{ fontWeight: 700, fontSize: '13.5px' }}>
                        {formatRupiah(p.sellPrice)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Modal</div>
                      <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatRupiah(p.buyPrice)}
                      </div>
                    </div>
                    <span className={`badge ${margin >= 0 ? 'badge-green' : 'badge-red'} font-mono`}>
                      {margin >= 0 ? `+${margin}%` : `${margin}%`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError('');
                        setRestockProduct(p);
                        setRestockQty(10);
                        setRestockType('IN');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, minHeight: '36px', color: 'var(--accent-cyan)' }}
                    >
                      <PackagePlus size={14} />
                      <span>Stok</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, minHeight: '36px' }}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProduct(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '36px', color: 'var(--accent-red)' }}
                      aria-label="Hapus Produk"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="sip-card" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
                {products.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Katalog Toko Anda Masih Kosong
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button type="button" onClick={handleOpenAdd} className="btn btn-primary btn-sm">
                        <Plus size={14} />
                        <span>Tambah Produk</span>
                      </button>
                      <button
                        type="button"
                        disabled={isImportingSample}
                        onClick={async () => {
                          setIsImportingSample(true);
                          try {
                            const res = await loadSampleCatalog();
                            if (res.success) {
                              showFeedback('8 produk contoh berhasil ditambahkan ke katalog toko Anda.');
                            }
                          } finally {
                            setIsImportingSample(false);
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                        <span>{isImportingSample ? 'Memuat...' : 'Muat 8 Contoh'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  'Tidak ada produk yang sesuai dengan kriteria pencarian.'
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Stock Mutation Logs View */
        <div className="sip-card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Riwayat Log Mutasi Stok Gudang</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Catatan audit setiap penambahan barang masuk, pengurangan barang rusak, dan koreksi stok.
            </p>
          </div>
          <div className="sip-table-container desktop-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="sip-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Nama Produk</th>
                  <th>Tipe Mutasi</th>
                  <th>Kuantitas</th>
                  <th>Perubahan Stok</th>
                  <th>Keterangan / Alasan</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {stockLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.productName}</td>
                    <td>
                      <span
                        className={`badge ${
                          log.type === 'IN'
                            ? 'badge-green'
                            : log.type === 'OUT'
                            ? 'badge-red'
                            : 'badge-cyan'
                        }`}
                      >
                        {log.type === 'IN' ? 'Stok Masuk' : log.type === 'OUT' ? 'Stok Keluar' : 'Koreksi'}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {log.type === 'IN'
                        ? `+${log.quantity}`
                        : log.type === 'OUT'
                        ? `-${log.quantity}`
                        : log.newStock >= log.previousStock
                        ? `+${log.newStock - log.previousStock}`
                        : `${log.newStock - log.previousStock}`}
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {log.previousStock} &rarr; <strong style={{ color: 'var(--text-primary)' }}>{log.newStock}</strong>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>{log.reason}</td>
                    <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {log.operator}
                    </td>
                  </tr>
                ))}
                {stockLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Belum ada riwayat mutasi stok yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list" style={{ padding: '14px' }}>
            {stockLogs.map((log) => (
              <div key={log.id} className="mobile-data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{log.productName}</span>
                  <span
                    className={`badge ${
                      log.type === 'IN'
                        ? 'badge-green'
                        : log.type === 'OUT'
                        ? 'badge-red'
                        : 'badge-cyan'
                    }`}
                  >
                    {log.type === 'IN' ? `+${log.quantity}` : log.type === 'OUT' ? `-${log.quantity}` : 'Koreksi'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.reason}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span className="font-mono">
                    Stok: {log.previousStock} &rarr; <strong>{log.newStock}</strong>
                  </span>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))}
            {stockLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Belum ada riwayat mutasi stok yang tercatat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {(isAddModalOpen || editingProduct) && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
                {isAddModalOpen ? 'Tambah Produk Baru' : 'Edit Informasi Produk'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="alert-box" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div className="form-grid-sku">
                <div>
                  <label className="form-label">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="sip-input font-mono"
                    placeholder="ELK-001"
                  />
                </div>

                <div>
                  <label className="form-label">Nama Produk</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="sip-input"
                    placeholder="Contoh: Mouse Wireless Logitech"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="form-label">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    className="sip-select"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Satuan Barang</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="sip-input"
                    placeholder="pcs, box, kg, pouch, unit"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="form-label">Harga Modal / Beli (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={formData.buyPrice === 0 ? '' : formData.buyPrice}
                    onChange={(e) => setFormData({ ...formData, buyPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="sip-input font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Harga Jual Kasir (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={formData.sellPrice === 0 ? '' : formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="sip-input font-mono"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="form-label">{isAddModalOpen ? 'Stok Awal' : 'Jumlah Stok'}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.stock === 0 ? '' : formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="sip-input font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Batas Minimum Peringatan Stok</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={formData.minStock === 0 ? '' : formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="sip-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Deskripsi Singkat (Opsional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="sip-input"
                  placeholder="Spesifikasi atau catatan produk..."
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK / STOCK ADJUSTMENT MODAL */}
      {restockProduct && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Penyesuaian Stok Gudang</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{restockProduct.name}</p>
              </div>
              <button onClick={() => setRestockProduct(null)} className="btn btn-secondary btn-icon">
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="alert-box" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Jenis Mutasi</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRestockType('IN')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: restockType === 'IN' ? 'var(--accent-green)' : 'var(--border-color)',
                      backgroundColor: restockType === 'IN' ? 'var(--accent-green-bg)' : 'transparent',
                      color: restockType === 'IN' ? 'var(--accent-green-text)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    + Stok Masuk (Restock)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestockType('OUT')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: restockType === 'OUT' ? 'var(--accent-red)' : 'var(--border-color)',
                      backgroundColor: restockType === 'OUT' ? 'var(--accent-red-bg)' : 'transparent',
                      color: restockType === 'OUT' ? 'var(--accent-red)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    - Stok Keluar (Rusak)
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Jumlah Barang ({restockProduct.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="1"
                  value={restockQty === 0 ? '' : restockQty}
                  onChange={(e) => setRestockQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="sip-input font-mono"
                  style={{ fontSize: '15px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="form-label">Catatan Operasional</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerimaan PO supplier atau kemasan rusak"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="sip-input"
                />
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stok Saat Ini:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {restockProduct.stock} {restockProduct.unit}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estimasi Akhir:</span>
                <span
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    color: restockType === 'IN' ? 'var(--accent-green-text)' : 'var(--accent-red)',
                  }}
                >
                  {restockType === 'IN'
                    ? restockProduct.stock + restockQty
                    : Math.max(0, restockProduct.stock - restockQty)}{' '}
                  {restockProduct.unit}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Simpan Mutasi Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProduct && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-red-bg)',
                  color: 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Hapus Produk?</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Produk <strong>&ldquo;{deletingProduct.name}&rdquo;</strong> akan dihapus permanen dari katalog.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeletingProduct(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Batal
              </button>
              <button
                onClick={() => {
                  const name = deletingProduct.name;
                  const res = deleteProduct(deletingProduct.id);
                  setDeletingProduct(null);
                  if (res.success) {
                    showFeedback(`Produk "${name}" telah dihapus.`);
                  }
                }}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
