'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, PAYMENT_METHODS, PaymentMethod, Transaction } from '@/lib/types';
import {
  formatRupiah,
  formatNumberDots,
  parseNumberInput,
  generateInvoiceNo,
} from '@/lib/format';
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

function CartQtyInput({
  quantity,
  label,
  style,
  onCommit,
}: {
  quantity: number;
  label: string;
  style: React.CSSProperties;
  onCommit: (qty: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = (raw: string | null) => {
    setDraft(null);
    if (raw === null) return;
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    const parsed = parseInt(digits, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft ?? String(quantity)}
      onFocus={(e) => {
        setDraft(String(quantity));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, '');
        setDraft(cleaned);
        const parsed = parseInt(cleaned, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          onCommit(parsed);
        }
      }}
      onBlur={() => commitDraft(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="sip-input font-mono"
      style={style}
      aria-label={label}
    />
  );
}

export default function PosView() {
  const { user, products, categories: storeCategories, paymentSettings, processSale } = useApp();
  const { runtime, settings, isConnected, printTransaction } = useBluetoothPrinter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<
    'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-desc' | 'stock-asc'
  >('name-asc');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [posNotice, setPosNotice] = useState<string>('');

  // Mobile Cart Sheet & Printer Modal
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isMiniListExpanded, setIsMiniListExpanded] = useState(true);
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

  const categories = useMemo(() => ['Semua', ...storeCategories], [storeCategories]);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isConfirmingPaymentRef = useRef(false);

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

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.category, (map.get(p.category) || 0) + 1);
    }
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = products.filter((p) => {
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'id-ID');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'id-ID');
        case 'price-asc':
          return a.sellPrice - b.sellPrice;
        case 'price-desc':
          return b.sellPrice - a.sellPrice;
        case 'stock-desc':
          return b.stock - a.stock;
        case 'stock-asc':
          return a.stock - b.stock;
        default:
          return 0;
      }
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

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
    const prod = productMap.get(productId);
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

  const setExactQuantity = (productId: string, rawQty: number) => {
    const prod = productMap.get(productId);
    if (!prod || prod.stock <= 0) return;

    const clean = Math.max(1, Math.floor(Number(rawQty) || 1));
    const finalQty = Math.min(clean, prod.stock);
    if (clean > prod.stock) {
      notifyLimit(`Batas stok maksimal untuk "${prod.name}" adalah ${prod.stock} ${prod.unit}.`);
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: finalQty } : item
      )
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

  const maxCashierDiscount = Math.round(cartSubtotal * 0.25);
  const isCashierDiscountBlocked =
    user?.role !== 'admin' && discount > 0 && discount > maxCashierDiscount;
  const finalDiscount = Math.min(discount, cartSubtotal);
  const grandTotal = Math.max(0, cartSubtotal - finalDiscount);
  const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, cashGiven - grandTotal) : 0;

  const handleOpenCheckout = () => {
    if (validCart.length === 0) return;
    if (isCashierDiscountBlocked) {
      notifyLimit(
        `Otorisasi Kasir membatasi diskon maksimal 25% (${formatRupiah(maxCashierDiscount)}).`
      );
      return;
    }
    setPaymentError('');
    setCashGiven(grandTotal);
    setDraftInvoiceNo(generateInvoiceNo(user?.ownerId || ''));
    setIsMobileCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (isConfirmingPaymentRef.current) return;
    isConfirmingPaymentRef.current = true;
    setPaymentError('');
    try {
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

        const resolvedStoreName =
          settings.storeName && settings.storeName !== 'SIP BARANG'
            ? settings.storeName
            : paymentSettings.qrisMerchantName?.trim() || settings.storeName || 'SIP BARANG';

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
                paymentSettings.qrisMerchantName || parsedMerchant.merchantName || resolvedStoreName
              }`;
            } else {
              qrData = `NOTA|${res.transaction.invoiceNo}|${res.transaction.total}|${res.transaction.paymentMethod}|${res.transaction.status || 'COMPLETED'}`;
              qrCaption = 'QR VERIFIKASI NOTA';
            }
          }
          const printRes = await printTransaction(res.transaction, false, {
            storeName: resolvedStoreName,
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
    } finally {
      isConfirmingPaymentRef.current = false;
    }
  };

  const shortcutHandlersRef = useRef({
    onF2: () => {},
    onF8: () => {},
    onEscape: () => {},
  });

  useEffect(() => {
    shortcutHandlersRef.current = {
      onF2: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
      onF8: () => {
        if (completedTransaction || isPrinterModalOpen || isQrisSetupOpen) return;
        if (isPaymentModalOpen) {
          if (paymentMethod === 'Tunai' && cashGiven < grandTotal) return;
          void handleConfirmPayment();
          return;
        }
        handleOpenCheckout();
      },
      onEscape: () => {
        if (isQrisSetupOpen) setIsQrisSetupOpen(false);
        else if (isPrinterModalOpen) setIsPrinterModalOpen(false);
        else if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        else if (isMobileCartOpen) setIsMobileCartOpen(false);
        else if (completedTransaction) {
          setCompletedTransaction(null);
          setReceiptPrintNotice(null);
        }
      },
    };
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        shortcutHandlersRef.current.onF2();
      } else if (e.key === 'F8') {
        e.preventDefault();
        shortcutHandlersRef.current.onF8();
      } else if (e.key === 'Escape') {
        shortcutHandlersRef.current.onEscape();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const renderCartBody = (isSheet = false) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Fixed Top Cart Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '10px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <ShoppingCart size={17} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Keranjang Transaksi
          </h2>
          {totalPcsInCart > 0 && (
            <span className="badge badge-cyan font-mono" style={{ padding: '1px 7px', fontSize: '10.5px', flexShrink: 0 }}>
              {totalPcsInCart}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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

      {/* Scrollable Middle Cart Item List */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
          WebkitOverflowScrolling: 'touch',
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
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, minWidth: 0 }}>{prod.name}</span>
                <button
                  type="button"
                  onClick={() => removeFromCart(prod.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                  title="Hapus item"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  @ {formatRupiah(prod.sellPrice)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(prod.id, -1)}
                    className="btn btn-secondary btn-icon"
                    style={{ width: '30px', height: '30px', padding: 0 }}
                    aria-label={`Kurangi qty ${prod.name}`}
                  >
                    <Minus size={13} />
                  </button>

                  <CartQtyInput
                    quantity={item.quantity}
                    label={`Jumlah ${prod.name}`}
                    style={{
                      width: '44px',
                      height: '30px',
                      padding: '2px 4px',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      textAlign: 'center',
                    }}
                    onCommit={(val) => setExactQuantity(prod.id, val)}
                  />

                  <button
                    type="button"
                    onClick={() => updateQuantity(prod.id, 1)}
                    disabled={item.quantity >= prod.stock}
                    className="btn btn-secondary btn-icon"
                    style={{ width: '30px', height: '30px', padding: 0 }}
                    aria-label={`Tambah qty ${prod.name}`}
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

      {/* Fixed Bottom Cart Summary & Checkout Frame */}
      <div
        style={{
          paddingTop: '12px',
          marginTop: '10px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Potongan Diskon (Rp)</span>
          <div style={{ position: 'relative', width: '138px', flexShrink: 0 }}>
            <span
              className="font-mono"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11.5px',
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
              value={formatNumberDots(discount)}
              onChange={(e) => setDiscount(parseNumberInput(e.target.value))}
              placeholder="0"
              className="sip-input font-mono"
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '13px',
                textAlign: 'right',
                borderColor: isCashierDiscountBlocked ? 'var(--accent-red)' : undefined,
              }}
            />
          </div>
        </div>

        {isCashierDiscountBlocked && (
          <div style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 600, marginBottom: '6px', textAlign: 'right' }}>
            Maks. diskon kasir 25% ({formatRupiah(maxCashierDiscount)}).
          </div>
        )}

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
            marginTop: '6px',
            marginBottom: '10px',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(var(--accent-cyan-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-cyan-rgb), 0.28)',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Total Tagihan:</span>
          <span className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {formatRupiah(grandTotal)}
          </span>
        </div>

        <button
          type="button"
          disabled={validCart.length === 0 || isCashierDiscountBlocked}
          onClick={handleOpenCheckout}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', minHeight: '44px', fontSize: '13.5px' }}
        >
          <CreditCard size={16} />
          <span>Bayar &amp; Cetak Nota ({validCart.length} SKU)</span>
          <span
            className="hide-mobile font-mono"
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            F8
          </span>
        </button>
      </div>
    </div>
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
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari barang, ketik SKU + Enter / [F2]..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchQuery.trim().toLowerCase();
                    if (!q) return;
                    const exactSkuMatch = products.find((p) => p.sku.toLowerCase() === q);
                    const target =
                      exactSkuMatch || (filteredProducts.length === 1 ? filteredProducts[0] : null);
                    if (target) {
                      e.preventDefault();
                      if (target.stock <= 0) {
                        notifyLimit(`Stok "${target.name}" sedang habis.`);
                        return;
                      }
                      addToCart(target);
                      setSearchQuery('');
                    }
                  }
                }}
                className="sip-input"
                style={{ paddingLeft: '38px', paddingRight: searchQuery ? '38px' : '13px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '26px',
                    height: '26px',
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

            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className="btn btn-secondary btn-sm show-mobile-only"
              style={{
                borderColor: isConnected ? 'rgba(var(--accent-cyan-rgb), 0.5)' : 'var(--border-color)',
                color: isConnected ? 'var(--accent-green-text)' : 'var(--text-secondary)',
                minHeight: '38px',
                padding: '0 10px',
              }}
              aria-label="Printer Thermal Bluetooth"
              title="Pengaturan Printer Thermal"
            >
              {isConnected ? <BluetoothConnected size={16} /> : <Bluetooth size={16} />}
            </button>

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

          {/* Category & Sort Dropdown Controls (No Horizontal Slide Scrollbar) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="sip-select"
              style={{ fontSize: '12.5px', minHeight: '38px', fontWeight: 600 }}
              aria-label="Filter Kategori Barang"
            >
              {categories.map((cat) => {
                const count =
                  cat === 'Semua' ? products.length : categoryCountMap.get(cat) || 0;
                return (
                  <option key={cat} value={cat}>
                    {cat === 'Semua'
                      ? `Semua Kategori (${count})`
                      : `${cat} (${count})`}
                  </option>
                );
              })}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | 'name-asc'
                    | 'name-desc'
                    | 'price-asc'
                    | 'price-desc'
                    | 'stock-desc'
                    | 'stock-asc'
                )
              }
              className="sip-select"
              style={{ fontSize: '12.5px', minHeight: '38px', fontWeight: 600 }}
              aria-label="Urutkan Barang"
            >
              <option value="name-asc">Urutkan: Nama (A - Z)</option>
              <option value="name-desc">Urutkan: Nama (Z - A)</option>
              <option value="price-asc">Urutkan: Harga Termurah</option>
              <option value="price-desc">Urutkan: Harga Termahal</option>
              <option value="stock-desc">Urutkan: Stok Terbanyak</option>
              <option value="stock-asc">Urutkan: Stok Menipis</option>
            </select>
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
                  <div className="pos-card-header">
                    <span className="font-mono pos-card-sku">
                      {prod.sku}
                    </span>
                    <span
                      className={`badge ${
                        isOutOfStock ? 'badge-red' : isLowStock ? 'badge-amber' : 'badge-green'
                      } pos-stock-badge`}
                    >
                      {isOutOfStock
                        ? 'Habis'
                        : isLowStock
                        ? `Sisa ${prod.stock}`
                        : `${prod.stock} ${prod.unit}`}
                    </span>
                  </div>

                  <h3 className="pos-card-title">
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
                    <div className="pos-qty-stepper">
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, -1)}
                        className="btn btn-secondary btn-sm pos-qty-btn"
                        aria-label={`Kurangi ${prod.name}`}
                      >
                        <Minus size={14} />
                      </button>
                      <div className="font-mono pos-qty-val">
                        {inCart} <span className="pos-qty-unit">{prod.unit}</span>
                      </div>
                      <button
                        type="button"
                        disabled={inCart >= prod.stock}
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="btn btn-primary btn-sm pos-qty-btn"
                        aria-label={`Tambah ${prod.name}`}
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

      {/* DESKTOP / LANDSCAPE RIGHT: Fixed Frame Cart Panel */}
      <div className="sip-card pos-cart">{renderCartBody(false)}</div>

      {/* MOBILE PORTRAIT FIXED CASHIER PANEL FRAME (Scrollable Item List + Fixed Bayar Button) */}
      <div className="mobile-pos-cart-bar no-print">
        {validCart.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              paddingBottom: isMiniListExpanded ? '8px' : '6px',
              marginBottom: isMiniListExpanded ? '8px' : '6px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsMiniListExpanded((prev) => !prev)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ShoppingCart size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Daftar Belanja ({validCart.length} SKU &bull; {totalPcsInCart} pcs)</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {isMiniListExpanded ? '[Sembunyikan]' : '[Lihat Daftar]'}
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
              >
                Diskon / Rincian
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="btn btn-secondary btn-sm"
                style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px', color: 'var(--accent-red)' }}
                title="Kosongkan"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Selected Items List right inside the Fixed Mobile Cashier Frame */}
        {validCart.length > 0 && isMiniListExpanded && (
          <div
            style={{
              maxHeight: '132px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '10px',
              paddingRight: '2px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {validCart.map((item) => {
              const prod = productMap.get(item.productId);
              if (!prod) return null;
              return (
                <div
                  key={item.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prod.name}
                    </div>
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      {formatRupiah(prod.sellPrice * item.quantity)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, -1)}
                      className="btn btn-secondary btn-icon"
                      style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px', padding: 0 }}
                      aria-label={`Kurangi qty ${prod.name}`}
                    >
                      <Minus size={12} />
                    </button>
                    <CartQtyInput
                      quantity={item.quantity}
                      label={`Jumlah ${prod.name}`}
                      style={{
                        width: '36px',
                        height: '26px',
                        padding: '1px 2px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                      onCommit={(val) => setExactQuantity(prod.id, val)}
                    />
                    <button
                      type="button"
                      disabled={item.quantity >= prod.stock}
                      onClick={() => updateQuantity(prod.id, 1)}
                      className="btn btn-secondary btn-icon"
                      style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px', padding: 0 }}
                      aria-label={`Tambah qty ${prod.name}`}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(prod.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-red)',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                      }}
                      aria-label="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fixed Bottom Checkout Row (Always Visible, Zero Scrolling Needed) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {validCart.length > 0
                ? `Total Tagihan (${totalPcsInCart} pcs)`
                : 'Belum ada barang dipilih'}
            </div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {formatRupiah(grandTotal)}
            </div>
          </div>

          <button
            type="button"
            disabled={validCart.length === 0 || isCashierDiscountBlocked}
            onClick={handleOpenCheckout}
            className="btn btn-primary"
            style={{ padding: '10px 16px', minHeight: '42px', flexShrink: 0, fontWeight: 700 }}
          >
            <CreditCard size={15} />
            <span>Bayar Sekarang</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* MOBILE CART BOTTOM SHEET (Full View with Discount) */}
      {isMobileCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsMobileCartOpen(false)}>
          <div
            className="modal-content modal-sheet"
            style={{
              maxWidth: '520px',
              height: '80dvh',
              maxHeight: '80dvh',
              padding: '22px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderCartBody(true)}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (Fixed Header + Scrollable Middle + Fixed Confirmation Button Frame) */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal-content modal-sheet"
            style={{
              maxWidth: '500px',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '16px 18px 14px',
            }}
          >
            {/* Fixed Modal Header */}
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
                    Penyelesaian Pembayaran
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Pilih metode bayar &amp; klik tombol konfirmasi di bawah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn btn-secondary btn-icon"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Total Highlight */}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  TOTAL TAGIHAN ({totalPcsInCart} PCS)
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: '19px', fontWeight: 800, color: 'var(--accent-cyan)' }}
                >
                  {formatRupiah(grandTotal)}
                </div>
              </div>
            </div>

            {/* Scrollable Payment Details Body */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: '2px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {paymentError && (
                <div className="alert-box" style={{ marginBottom: '10px' }}>
                  <AlertTriangle size={16} />
                  <span>{paymentError}</span>
                </div>
              )}

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '10px' }}>
              <div className="pos-payment-grid">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: '8px 6px',
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {method === 'Tunai' && <Banknote size={14} />}
                      {method === 'QRIS' && <QrCode size={14} />}
                      {method === 'Transfer Bank' && <Building size={14} />}
                      {method === 'Kartu Debit' && <CreditCard size={14} />}
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
                <div style={{ position: 'relative' }}>
                  <span
                    className="font-mono"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '15px',
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
                    placeholder="0"
                    value={formatNumberDots(cashGiven)}
                    onChange={(e) => setCashGiven(parseNumberInput(e.target.value))}
                    className="sip-input font-mono"
                    style={{ paddingLeft: '44px', fontSize: '16px', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {[
                    { label: `Uang Pas (${formatRupiah(grandTotal)})`, val: grandTotal },
                    { label: 'Rp 50.000', val: 50000 },
                    { label: 'Rp 100.000', val: 100000 },
                    { label: 'Rp 200.000', val: 200000 },
                    { label: 'Rp 500.000', val: 500000 },
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
            </div>

            {/* Fixed Bottom Confirmation Button Frame */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                paddingTop: '12px',
                marginTop: '8px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                flexShrink: 0,
              }}
            >
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
            setSearchQuery('');
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 60);
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
            className="modal-content modal-sheet"
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
