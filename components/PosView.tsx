'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, PRODUCT_CATEGORIES, PAYMENT_METHODS, PaymentMethod, Transaction } from '@/lib/types';
import { formatRupiah } from '@/lib/format';
import ReceiptModal from './ReceiptModal';
import { playBeep } from '@/lib/audio';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface CartItemState {
  productId: string;
  quantity: number;
}

export default function PosView() {
  const { products, processSale } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [posNotice, setPosNotice] = useState<string>('');

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [paymentError, setPaymentError] = useState<string>('');

  // Finished Transaction Receipt
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  const categories = ['Semua', ...PRODUCT_CATEGORIES];
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyLimit = (msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setPosNotice(msg);
    noticeTimerRef.current = setTimeout(() => setPosNotice(''), 3000);
  };

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Valid cart items (only existing products with available stock, clamped to current stock)
  const validCart = useMemo(
    () =>
      cart
        .map((item) => {
          const prod = productMap.get(item.productId);
          if (!prod || prod.stock <= 0) return null;
          return {
            productId: item.productId,
            quantity: Math.min(item.quantity, prod.stock),
          };
        })
        .filter((item): item is CartItemState => item !== null),
    [cart, productMap]
  );

  const cartQtyMap = useMemo(() => new Map(validCart.map((c) => [c.productId, c.quantity])), [validCart]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    playBeep();
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          notifyLimit(`Batas stok maksimal untuk "${product.name}" adalah ${product.stock} ${product.unit}.`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    playBeep();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const clampedCurrent = Math.min(item.quantity, prod.stock);
            const newQty = delta > 0 ? item.quantity + delta : clampedCurrent + delta;
            if (newQty > prod.stock) {
              notifyLimit(`Stok tersedia untuk "${prod.name}" hanya ${prod.stock} ${prod.unit}.`);
              return { ...item, quantity: prod.stock };
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const { cartSubtotal, totalPcsInCart } = useMemo(() => {
    let subtotal = 0;
    let totalPcs = 0;
    for (const item of validCart) {
      const prod = productMap.get(item.productId);
      if (prod) {
        subtotal += prod.sellPrice * item.quantity;
        totalPcs += item.quantity;
      }
    }
    return { cartSubtotal: subtotal, totalPcsInCart: totalPcs };
  }, [validCart, productMap]);

  const finalDiscount = Math.min(discount, cartSubtotal);
  const grandTotal = Math.max(0, cartSubtotal - finalDiscount);
  const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, cashGiven - grandTotal) : 0;

  const handleOpenCheckout = () => {
    if (validCart.length === 0) return;
    setPaymentError('');
    setCashGiven(grandTotal);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    setPaymentError('');
    const res = processSale(validCart, paymentMethod, finalDiscount, cashGiven);
    if (res.success && res.transaction) {
      setIsPaymentModalOpen(false);
      setCart([]);
      setDiscount(0);
      setCompletedTransaction(res.transaction);
    } else {
      setPaymentError(res.error || 'Terjadi kesalahan saat memproses penjualan.');
    }
  };

  return (
    <div className="pos-layout">
      {/* LEFT: Products Catalog */}
      <div className="pos-catalog">
        {/* Search & Category Header */}
        <div className="sip-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Cari nama barang atau pindai kode SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sip-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="btn btn-secondary btn-sm">
                Reset
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '5px 13px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-color)',
                    backgroundColor: isSelected
                      ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                      : 'var(--bg-subtle)',
                    color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {posNotice && (
          <div className="alert-box-warning">
            <AlertTriangle size={15} />
            <span>{posNotice}</span>
          </div>
        )}

        {/* Catalog Grid */}
        <div className="pos-grid">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock <= 0;
            const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;
            const inCart = cartQtyMap.get(prod.id) || 0;

            return (
              <div
                key={prod.id}
                className="sip-card sip-card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '14px',
                  opacity: isOutOfStock ? 0.55 : 1,
                  borderColor: inCart > 0 ? 'rgba(var(--accent-cyan-rgb), 0.55)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '4px' }}>
                    <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {prod.sku}
                    </span>
                    <span
                      className={`badge ${
                        isOutOfStock ? 'badge-red' : isLowStock ? 'badge-amber' : 'badge-green'
                      }`}
                      style={{ fontSize: '10px', padding: '2px 7px' }}
                    >
                      {isOutOfStock
                        ? 'Habis'
                        : isLowStock
                        ? `Sisa ${prod.stock}`
                        : `${prod.stock} ${prod.unit}`}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      marginBottom: '4px',
                      lineHeight: 1.35,
                      minHeight: '36px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {prod.name}
                  </h3>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {prod.category}
                  </div>
                </div>

                <div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '10px',
                    }}
                  >
                    {formatRupiah(prod.sellPrice)}
                  </div>

                  {inCart > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, -1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px' }}
                      >
                        <Minus size={13} />
                      </button>
                      <div
                        className="font-mono"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        {inCart} {prod.unit}
                      </div>
                      <button
                        type="button"
                        disabled={inCart >= prod.stock}
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 10px' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={isOutOfStock}
                      onClick={() => addToCart(prod)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', padding: '7px 10px' }}
                    >
                      {isOutOfStock ? (
                        'Stok Habis'
                      ) : (
                        <>
                          <Plus size={14} /> Tambah
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div
              className="sip-card"
              style={{
                gridColumn: '1 / -1',
                padding: '36px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              Barang tidak ditemukan untuk kata kunci atau kategori ini.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Panel */}
      <div className="sip-card pos-cart">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Cart Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={17} style={{ color: 'var(--accent-cyan)' }} />
              <h2 style={{ fontSize: '14.5px', fontWeight: 700 }}>Keranjang Transaksi</h2>
              {totalPcsInCart > 0 && (
                <span className="badge badge-cyan font-mono" style={{ padding: '1px 7px', fontSize: '10.5px' }}>
                  {totalPcsInCart}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', color: 'var(--accent-red)', padding: '3px 8px' }}
                title="Kosongkan Keranjang"
              >
                <RotateCcw size={12} /> Kosongkan
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px',
            }}
          >
            { validCart.map((item) => {
              const prod = productMap.get(item.productId);
              if (!prod) return null;
              const itemTotal = prod.sellPrice * item.quantity;

              return (
                <div
                  key={item.productId}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, flex: 1 }}>
                      {prod.name}
                    </span>
                    <button
                      onClick={() => removeFromCart(prod.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Hapus item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      @ {formatRupiah(prod.sellPrice)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => updateQuantity(prod.id, -1)}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '24px', height: '24px', padding: 0 }}
                      >
                        <Minus size={11} />
                      </button>

                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(prod.id, 1)}
                        disabled={item.quantity >= prod.stock}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '24px', height: '24px', padding: 0 }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="font-mono"
                    style={{
                      textAlign: 'right',
                      marginTop: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {formatRupiah(itemTotal)}
                  </div>
                </div>
              );
            })}

            {validCart.length === 0 && (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                Keranjang masih kosong. Pilih barang dari daftar katalog untuk memulai transaksi.
              </div>
            )}
          </div>
        </div>

        {/* Cart Bottom Summary */}
        <div style={{ paddingTop: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Potongan Diskon (Rp)</span>
            <input
              type="number"
              min="0"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="sip-input font-mono"
              style={{ width: '115px', padding: '5px 9px', fontSize: '12px', textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>Subtotal ({totalPcsInCart} pcs):</span>
            <span className="font-mono">{formatRupiah(cartSubtotal)}</span>
          </div>

          {finalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: 'var(--accent-red)' }}>
              <span>Diskon:</span>
              <span className="font-mono">- {formatRupiah(finalDiscount)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '8px',
              marginBottom: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.1)',
              border: '1px solid rgba(var(--accent-cyan-rgb), 0.28)',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Total Tagihan:</span>
            <span className="font-mono" style={{ fontSize: '19px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {formatRupiah(grandTotal)}
            </span>
          </div>

          <button
            disabled={validCart.length === 0}
            onClick={handleOpenCheckout}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '13.5px' }}
          >
            <CreditCard size={16} />
            <span>Bayar &amp; Cetak Nota ({validCart.length} SKU)</span>
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
              Penyelesaian Pembayaran
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Pilih metode pembayaran pelanggan dan verifikasi nominal yang diterima.
            </p>

            {paymentError && (
              <div className="alert-box" style={{ marginBottom: '14px' }}>
                <AlertTriangle size={16} />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Total Highlight */}
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
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                TOTAL TAGIHAN PELANGGAN
              </div>
              <div
                className="font-mono"
                style={{ fontSize: '25px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}
              >
                {formatRupiah(grandTotal)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Metode Pembayaran</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-color)',
                        backgroundColor: isSelected
                          ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                          : 'var(--bg-card)',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {method === 'Tunai' && <Banknote size={17} />}
                      {method === 'QRIS' && <QrCode size={17} />}
                      {method === 'Transfer Bank' && <Building size={17} />}
                      {method === 'Kartu Debit' && <CreditCard size={17} />}
                      <span>{method}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Specific Details */}
            {paymentMethod === 'Tunai' && (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Nominal Uang Tunai Diterima (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(Math.max(0, parseInt(e.target.value) || 0))}
                  className="sip-input font-mono"
                  style={{ fontSize: '15px', fontWeight: 700 }}
                />

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {[
                    { label: 'Uang Pas', val: grandTotal },
                    { label: '50.000', val: 50000 },
                    { label: '100.000', val: 100000 },
                    { label: '200.000', val: 200000 },
                    { label: '500.000', val: 500000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCashGiven(preset.val)}
                      className="btn btn-secondary btn-sm font-mono"
                      style={{ fontSize: '11px' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: cashGiven < grandTotal ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
                    border: '1px solid',
                    borderColor:
                      cashGiven < grandTotal ? 'rgba(248, 81, 73, 0.35)' : 'rgba(46, 160, 67, 0.35)',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    {cashGiven < grandTotal ? 'Kurang Bayar:' : 'Uang Kembalian:'}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: cashGiven < grandTotal ? 'var(--accent-red)' : 'var(--accent-green-text)',
                    }}
                  >
                    {formatRupiah(cashGiven < grandTotal ? grandTotal - cashGiven : changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'QRIS' && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Pindai kode QRIS berikut menggunakan aplikasi pembayaran pelanggan:
                </div>
                <div
                  style={{
                    width: '148px',
                    height: '148px',
                    margin: '0 auto 10px',
                    backgroundColor: '#FFFFFF',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QrCode size={116} color="#111111" strokeWidth={1.5} />
                </div>
                <div className="font-mono" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  NMID: ID10293847561 &bull; SIP BARANG
                </div>
              </div>
            )}

            {paymentMethod === 'Transfer Bank' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '16px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Rekening Resmi Toko:</div>
                <div className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  BCA 8820-192-381 &mdash; a.n. SIP Operasional Barang
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Pastikan mutasi pembayaran telah diterima sebelum menyelesaikan nota.
                </div>
              </div>
            )}

            {paymentMethod === 'Kartu Debit' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '16px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Terminal EDC:</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Proses kartu debit pada mesin EDC dan pastikan bukti otorisasi tercetak sebelum melanjutkan.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paymentMethod === 'Tunai' && cashGiven < grandTotal}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                <Check size={16} />
                <span>Selesaikan &amp; Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </div>
  );
}
