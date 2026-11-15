'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, ProductCategory, PRODUCT_CATEGORIES } from '@/lib/types';
import {
  formatRupiah,
  formatNumberDots,
  parseNumberInput,
  formatDateTime,
  calcMarginPct,
} from '@/lib/format';
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
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminProducts() {
  const {
    products,
    categories,
    addCategory,
    deleteCategory,
    stockLogs,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    loadSampleCatalog,
  } = useApp();
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

  // Category Management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isInlineAddingCategory, setIsInlineAddingCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

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

  // Memoized filtering: skips string lowercasing if search is empty
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'Semua' || p.category === categoryFilter;

      let matchesStatus = true;
      if (stockStatusFilter === 'Aman') matchesStatus = p.stock > p.minStock;
      else if (stockStatusFilter === 'Menipis') matchesStatus = p.stock > 0 && p.stock <= p.minStock;
      else if (stockStatusFilter === 'Habis') matchesStatus = p.stock === 0;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, stockStatusFilter]);

  // Pagination state (Catalog & Logs)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(8);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safePage, pageSize]);

  const totalLogPages = Math.max(1, Math.ceil(stockLogs.length / logPageSize));
  const safeLogPage = Math.min(logPage, totalLogPages);
  const paginatedLogs = useMemo(() => {
    const start = (safeLogPage - 1) * logPageSize;
    return stockLogs.slice(start, start + logPageSize);
  }, [stockLogs, safeLogPage, logPageSize]);

  const handleOpenAdd = () => {
    const randomSku = 'PRD-' + Math.floor(100 + Math.random() * 900);
    setModalError('');
    setIsInlineAddingCategory(false);
    setInlineCategoryName('');
    setFormData({
      sku: randomSku,
      name: '',
      category: categories[0] || 'Elektronik',
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
    setIsInlineAddingCategory(false);
    setInlineCategoryName('');
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

  const handleAddCategoryModal = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    const createdName = newCategoryName.trim();
    const res = addCategory(createdName);
    if (!res.success) {
      setCategoryError(res.error || 'Gagal menambahkan kategori.');
      return;
    }
    setNewCategoryName('');
    showFeedback(`Kategori "${createdName}" berhasil ditambahkan.`);
  };

  const handleSaveInlineCategory = () => {
    setModalError('');
    const created = inlineCategoryName.trim();
    const res = addCategory(created);
    if (!res.success) {
      setModalError(res.error || 'Gagal menambahkan kategori baru.');
      return;
    }
    setFormData((prev) => ({ ...prev, category: created }));
    setInlineCategoryName('');
    setIsInlineAddingCategory(false);
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

          <button
            type="button"
            onClick={() => {
              setCategoryError('');
              setNewCategoryName('');
              setIsCategoryModalOpen(true);
            }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 14px' }}
          >
            <Tag size={14} />
            <span>Kelola Kategori ({categories.length})</span>
          </button>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>
            <Plus size={15} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="alert-box-info" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg('')}
            aria-label="Tutup pemberitahuan"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
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
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari kode SKU atau nama barang..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="sip-input"
                  style={{ paddingLeft: '36px', paddingRight: searchQuery ? '36px' : '13px' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    aria-label="Hapus pencarian"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="sip-select"
                >
                  <option value="Semua">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value as 'Semua' | 'Aman' | 'Menipis' | 'Habis');
                    setCurrentPage(1);
                  }}
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
                  {paginatedProducts.map((p) => {
                    const margin = calcMarginPct(p.sellPrice, p.buyPrice);
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
            {paginatedProducts.map((p) => {
              const margin = calcMarginPct(p.sellPrice, p.buyPrice);
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

          {/* Catalog Pagination Bar */}
          {filteredProducts.length > 0 && (
            <div
              className="sip-card"
              style={{
                padding: '12px 18px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Menampilkan{' '}
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {(safePage - 1) * pageSize + 1}&ndash;
                    {Math.min(safePage * pageSize, filteredProducts.length)}
                  </strong>{' '}
                  dari{' '}
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {filteredProducts.length}
                  </strong>{' '}
                  produk
                </span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="sip-select font-mono"
                  style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '12px', minHeight: '32px' }}
                  aria-label="Jumlah baris per halaman"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} / halaman
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', minHeight: '32px' }}
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`btn btn-sm font-mono ${
                      pageNum === safePage ? 'btn-primary' : 'btn-secondary'
                    }`}
                    style={{ minWidth: '32px', minHeight: '32px', padding: '0 8px' }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', minHeight: '32px' }}
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
                {paginatedLogs.map((log) => (
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
            {paginatedLogs.map((log) => (
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

          {stockLogs.length > 0 && (
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Menampilkan{' '}
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {(safeLogPage - 1) * logPageSize + 1}&ndash;
                    {Math.min(safeLogPage * logPageSize, stockLogs.length)}
                  </strong>{' '}
                  dari{' '}
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {stockLogs.length}
                  </strong>{' '}
                  log mutasi
                </span>
                <select
                  value={logPageSize}
                  onChange={(e) => {
                    setLogPageSize(Number(e.target.value));
                    setLogPage(1);
                  }}
                  className="sip-select font-mono"
                  style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '12px', minHeight: '32px' }}
                  aria-label="Jumlah log per halaman"
                >
                  {[5, 8, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} / halaman
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  disabled={safeLogPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', minHeight: '32px' }}
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>
                {Array.from({ length: totalLogPages }, (_, idx) => idx + 1)
                  .slice(0, 7)
                  .map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setLogPage(pageNum)}
                      className={`btn btn-sm font-mono ${
                        pageNum === safeLogPage ? 'btn-primary' : 'btn-secondary'
                      }`}
                      style={{ minWidth: '32px', minHeight: '32px', padding: '0 8px' }}
                    >
                      {pageNum}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={safeLogPage >= totalLogPages}
                  onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', minHeight: '32px' }}
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Kategori
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsInlineAddingCategory((prev) => !prev);
                        setInlineCategoryName('');
                        setModalError('');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      <span>{isInlineAddingCategory ? 'Pilih yang ada' : 'Kategori Baru'}</span>
                    </button>
                  </div>

                  {isInlineAddingCategory ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={inlineCategoryName}
                        onChange={(e) => setInlineCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveInlineCategory();
                          }
                        }}
                        className="sip-input"
                        placeholder="Ketik nama kategori..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveInlineCategory}
                        className="btn btn-primary btn-sm"
                        style={{ flexShrink: 0, padding: '0 12px' }}
                      >
                        Tambah
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                      className="sip-select"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
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
                  <div style={{ position: 'relative' }}>
                    <span
                      className="font-mono"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        pointerEvents: 'none',
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0"
                      value={formatNumberDots(formData.buyPrice)}
                      onChange={(e) =>
                        setFormData({ ...formData, buyPrice: parseNumberInput(e.target.value) })
                      }
                      className="sip-input font-mono"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Harga Jual Kasir (Rp)</label>
                  <div style={{ position: 'relative' }}>
                    <span
                      className="font-mono"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        pointerEvents: 'none',
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0"
                      value={formatNumberDots(formData.sellPrice)}
                      onChange={(e) =>
                        setFormData({ ...formData, sellPrice: parseNumberInput(e.target.value) })
                      }
                      className="sip-input font-mono"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
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

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '480px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Kelola Kategori Barang</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Tambahkan kategori baru untuk mengelompokkan katalog &amp; filter di Kasir POS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>

            {categoryError && (
              <div className="alert-box" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{categoryError}</span>
              </div>
            )}

            <form
              onSubmit={handleAddCategoryModal}
              style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="sip-input"
                placeholder="Nama kategori baru (contoh: Kosmetik, Pakaian, Obat)..."
                maxLength={40}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flexShrink: 0, padding: '0 16px' }}
              >
                <Plus size={15} />
                <span>Tambah</span>
              </button>
            </form>

            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '2px',
              }}
            >
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category.toLowerCase() === cat.toLowerCase()
                ).length;
                const isBuiltIn = PRODUCT_CATEGORIES.some(
                  (base) => base.toLowerCase() === cat.toLowerCase()
                );

                return (
                  <div
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Tag size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          backgroundColor: isBuiltIn ? 'var(--bg-card)' : 'var(--accent-green-bg)',
                          color: isBuiltIn ? 'var(--text-muted)' : 'var(--accent-green-text)',
                          border: '1px solid var(--border-color)',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {isBuiltIn ? 'Bawaan' : 'Kustom'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        className="font-mono"
                        style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                      >
                        {count} produk
                      </span>

                      {!isBuiltIn && (
                        <button
                          type="button"
                          disabled={count > 0}
                          title={
                            count > 0
                              ? 'Pindahkan atau hapus produk di kategori ini terlebih dahulu'
                              : `Hapus kategori ${cat}`
                          }
                          onClick={() => {
                            setCategoryError('');
                            const res = deleteCategory(cat);
                            if (!res.success) {
                              setCategoryError(res.error || 'Gagal menghapus kategori.');
                              return;
                            }
                            if (categoryFilter === cat) {
                              setCategoryFilter('Semua');
                            }
                            showFeedback(`Kategori "${cat}" telah dihapus.`);
                          }}
                          className="btn btn-secondary btn-icon"
                          style={{
                            width: '28px',
                            height: '28px',
                            opacity: count > 0 ? 0.4 : 1,
                            cursor: count > 0 ? 'not-allowed' : 'pointer',
                            color: count > 0 ? 'var(--text-muted)' : 'var(--accent-red)',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="btn btn-secondary"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
