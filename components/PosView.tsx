'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, PRODUCT_CATEGORIES, PAYMENT_METHODS, PaymentMethod, Transaction } from '@/lib/types';
import { formatRupiah, generateInvoiceNo } from '@/lib/format';
import { buildDynamicQrisPayload, parseAndValidateQris } from '@/lib/qris';
import { useBluetoothPrinter } from '@/lib/usePrinter';
import ReceiptModal from './ReceiptModal';
import PrinterModal from './PrinterModal';
import QrisPaymentBox from './QrisPaymentBox';
import QrisConfigPanel from './QrisConfigPanel';
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
  Bluetooth,
  BluetoothConnected,
  ChevronRight,
  X,
} from 'lucide-react';

interface CartItemState {
  productId: string;
  quantity: number;
}

export default function PosView() {
  const { user, products, paymentSettings, processSale } = useApp();
  const { runtime, settings, isConnected, printTransaction } = useBluetoothPrinter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [posNotice, setPosNotice] = useState<string>('');

  // Mobile Cart Sheet & Printer Modal
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isQrisSetupOpen, setIsQrisSetupOpen] = useState(false);

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [draftInvoiceNo, setDraftInvoiceNo] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');

  // Finished Transaction Receipt & Auto-print Notice
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [receiptPrintNotice, setReceiptPrintNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const categories = ['Semua', ...PRODUCT_CATEGORIES];
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyLimit = (msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setPosNotice(msg);
    noticeTimerRef.current = setTimeout(() => setPosNotice(''), 3000);
  };

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

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

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

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
    setDraftInvoiceNo(generateInvoiceNo(user?.ownerId || ''));
    setIsMobileCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    setPaymentError('');
    const res = processSale(
      validCart,
      paymentMethod,
      finalDiscount,
      cashGiven,
      draftInvoiceNo
    );
    if (res.success && res.transaction) {
      setIsPaymentModalOpen(false);
      setIsMobileCartOpen(false);
      setCart([]);
      setDiscount(0);

      let autoNotice: { type: 'success' | 'error'; text: string } | null = null;
      if (settings.autoPrintOnSale && isConnected) {
        let qrData: string | undefined;
        let qrCaption: string | undefined;
        if (paymentSettings.showQrisOnReceipt ?? true) {
          const parsedMerchant = paymentSettings.qrisPayload.trim()
            ? parseAndValidateQris(paymentSettings.qrisPayload)
            : null;
          if (res.transaction.paymentMethod === 'QRIS' && parsedMerchant?.valid) {
            qrData = buildDynamicQrisPayload(
              parsedMerchant.cleanedPayload,
              res.transaction.total,
              true,
              res.transaction.invoiceNo
            );
            qrCaption = `QRIS NOTA • ${
              paymentSettings.qrisMerchantName || parsedMerchant.merchantName || settings.storeName
            }`;
          } else {
            qrData = `NOTA|${res.transaction.invoiceNo}|${res.transaction.total}|${res.transaction.paymentMethod}|${res.transaction.status || 'COMPLETED'}`;
            qrCaption = 'QR VERIFIKASI NOTA';
          }
        }
        const printRes = await printTransaction(res.transaction, false, {
          qrData,
          qrCaption,
          customNote: paymentSettings.qrisCustomNote || undefined,
        });
        autoNotice = printRes.success
          ? {
              type: 'success',
              text: `Struk otomatis dicetak ke ${runtime.deviceName || 'Printer Bluetooth'}.`,
            }
          : {
              type: 'error',
              text: printRes.error || 'Gagal cetak otomatis Bluetooth.',
            };
      }
      setReceiptPrintNotice(autoNotice);
      setCompletedTransaction(res.transaction);
    } else {
      setPaymentError(res.error || 'Terjadi kesalahan saat memproses penjualan.');
    }
  };

  const renderCartBody = (isSheet = false) => (
    <>
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
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Keranjang Transaksi</h2>
            {totalPcsInCart > 0 && (
              <span className="badge badge-cyan font-mono" style={{ padding: '1px 7px', fontSize: '10.5px' }}>
                {totalPcsInCart}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', color: 'var(--accent-red)', padding: '4px 8px' }}
                title="Kosongkan Keranjang"
              >
                <RotateCcw size={12} /> Kosongkan
              </button>
            )}
            {isSheet && (
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="btn btn-secondary btn-icon"
                aria-label="Tutup Keranjang"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: isSheet ? '38vh' : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px',
          }}
        >
          {validCart.map((item) => {
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
                  <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>{prod.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(prod.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Hapus item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    @ {formatRupiah(prod.sellPrice)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, -1)}
                      className="btn btn-secondary btn-icon"
                      style={{ width: '30px', height: '30px', padding: 0 }}
                    >
                      <Minus size={13} />
                    </button>

                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '13px', minWidth: '22px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, 1)}
                      disabled={item.quantity >= prod.stock}
                      className="btn btn-secondary btn-icon"
                      style={{ width: '30px', height: '30px', padding: 0 }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div
                  className="font-mono"
                  style={{
                    textAlign: 'right',
                    marginTop: '4px',
                    fontSize: '12.5px',
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
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12.5px',
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
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Potongan Diskon (Rp)</span>
          <input
            type="number"
            min="0"
            value={discount || ''}
            onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className="sip-input font-mono"
            style={{ width: '120px', padding: '6px 10px', fontSize: '13px', textAlign: 'right' }}
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
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Total Tagihan:</span>
          <span className="font-mono" style={{ fontSize: '19px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(grandTotal)}
          </span>
        </div>

        <button
          type="button"
          disabled={validCart.length === 0}
          onClick={handleOpenCheckout}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', minHeight: '44px', fontSize: '13.5px' }}
        >
          <CreditCard size={16} />
          <span>Bayar &amp; Cetak Nota ({validCart.length} SKU)</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="pos-layout">
      {/* LEFT: Products Catalog */}
      <div className="pos-catalog">
        {/* Search, Bluetooth Printer Bar & Category Header */}
        <div className="sip-card pos-search-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
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
                placeholder="Cari barang atau kode SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sip-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>

            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="btn btn-secondary btn-sm">
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className="btn btn-secondary btn-sm hide-mobile"
              style={{
                borderColor: isConnected ? 'rgba(var(--accent-cyan-rgb), 0.5)' : 'var(--border-color)',
                color: isConnected ? 'var(--accent-green-text)' : 'var(--text-secondary)',
              }}
              title="Status Printer Thermal Bluetooth"
            >
              {isConnected ? <BluetoothConnected size={14} /> : <Bluetooth size={14} />}
              <span>
                {isConnected ? runtime.deviceName || 'BT Terhubung' : 'Hubungkan Printer BT'}
              </span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="pos-category-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 13px',
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
                    flexShrink: 0,
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
                  padding: '13px',
                  opacity: isOutOfStock ? 0.55 : 1,
                  borderColor: inCart > 0 ? 'rgba(var(--accent-cyan-rgb), 0.65)' : undefined,
                  borderTop: inCart > 0 ? '3px solid var(--accent-cyan)' : undefined,
                  backgroundColor: inCart > 0 ? 'rgba(var(--accent-cyan-rgb), 0.06)' : undefined,
                  boxShadow: inCart > 0 ? 'var(--shadow-glow)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '4px' }}>
                    <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: '4px',
                      lineHeight: 1.35,
                      minHeight: '35px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {prod.name}
                  </h3>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {prod.category}
                  </div>
                </div>

                <div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '9px',
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
                        style={{ padding: '7px 10px', minHeight: '36px' }}
                      >
                        <Minus size={14} />
                      </button>
                      <div
                        className="font-mono"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '12.5px',
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
                        style={{ padding: '7px 10px', minHeight: '36px' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(prod)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', padding: '7px 10px', minHeight: '36px' }}
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

      {/* DESKTOP RIGHT: Sticky Cart Panel (hidden on tablet/mobile) */}
      <div className="sip-card pos-cart">{renderCartBody(false)}</div>

      {/* MOBILE / TABLET FLOATING CART BAR (always accessible without scrolling!) */}
      {validCart.length > 0 && (
        <div className="mobile-pos-cart-bar no-print">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {totalPcsInCart} pcs ({validCart.length} SKU) di keranjang
            </div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {formatRupiah(grandTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 16px', minHeight: '42px', flexShrink: 0 }}
          >
            <ShoppingCart size={16} />
            <span>Keranjang</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* MOBILE CART BOTTOM SHEET */}
      {isMobileCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsMobileCartOpen(false)}>
          <div
            className="modal-content modal-sheet"
            style={{ maxWidth: '520px', padding: '18px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderCartBody(true)}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content modal-sheet" style={{ maxWidth: '500px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Penyelesaian Pembayaran</h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="btn btn-secondary btn-icon"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
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
                marginBottom: '14px',
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
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Metode Pembayaran</label>
              <div className="pos-payment-grid">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: '11px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-color)',
                        backgroundColor: isSelected
                          ? 'rgba(var(--accent-cyan-rgb), 0.14)'
                          : 'var(--bg-card)',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        fontSize: '11.5px',
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
                  style={{ fontSize: '16px', fontWeight: 700 }}
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
                      style={{ fontSize: '11.5px', minHeight: '34px' }}
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
              <QrisPaymentBox
                invoiceNo={draftInvoiceNo}
                subtotal={cartSubtotal}
                discount={finalDiscount}
                grandTotal={grandTotal}
                totalPcs={totalPcsInCart}
                itemCount={validCart.length}
                storeName={settings.storeName}
                storeTagline={settings.storeTagline}
                isAdmin={user?.role === 'admin'}
                onOpenQrisSetup={() => setIsQrisSetupOpen(true)}
              />
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
                {paymentSettings.bankAccountNumber ? (
                  <div className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {[paymentSettings.bankName, paymentSettings.bankAccountNumber].filter(Boolean).join(' ')}
                    {paymentSettings.bankAccountHolder ? ` — a.n. ${paymentSettings.bankAccountHolder}` : ''}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Nomor rekening toko belum diisi oleh Admin (dapat diatur di Pengaturan).
                  </div>
                )}
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
                style={{ flex: 1, minHeight: '44px' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmPayment()}
                disabled={paymentMethod === 'Tunai' && cashGiven < grandTotal}
                className="btn btn-primary"
                style={{ flex: 2, minHeight: '44px' }}
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
          initialPrintNotice={receiptPrintNotice}
          onClose={() => {
            setCompletedTransaction(null);
            setReceiptPrintNotice(null);
          }}
        />
      )}

      <PrinterModal isOpen={isPrinterModalOpen} onClose={() => setIsPrinterModalOpen(false)} />

      {/* Quick QRIS Store Configuration Modal for Admin */}
      {isQrisSetupOpen && user?.role === 'admin' && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 135 }}
          onClick={() => setIsQrisSetupOpen(false)}
        >
          <div
            className="modal-card modal-sheet"
            style={{ maxWidth: '640px', width: '100%' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                  Pengaturan QRIS Bayar Toko
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrisSetupOpen(false)}
                className="btn btn-secondary btn-icon"
                aria-label="Tutup pengaturan QRIS"
              >
                <X size={16} />
              </button>
            </div>
            <QrisConfigPanel
              key={paymentSettings.updatedAt || 'init'}
              onSaved={() => setIsQrisSetupOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
