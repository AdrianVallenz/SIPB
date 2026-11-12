'use client';

import React, { createContext, useContext, useState, useEffect, useSyncExternalStore } from 'react';
import { Product, Transaction, StockLog, UserSession, PaymentMethod } from '@/lib/types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredTransactions,
  saveStoredTransactions,
  getStoredStockLogs,
  saveStoredStockLogs,
  getStoredSession,
  saveStoredSession,
  getStoredTheme,
  saveStoredTheme,
} from '@/lib/storage';
import {
  signInSupabase,
  setSupabaseAccessToken,
  fetchCloudSnapshot,
  syncUpsertProduct,
  syncDeleteProduct,
  syncInsertStockLogs,
  syncInsertTransaction,
  syncVoidTransaction,
} from '@/lib/supabase';
import { playCashierChime } from '@/lib/audio';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  user: UserSession | null;
  isCloudConnected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  products: Product[];
  transactions: Transaction[];
  stockLogs: StockLog[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  login: (email: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  addProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => ActionResult;
  updateProduct: (product: Product) => ActionResult;
  deleteProduct: (productId: string) => ActionResult;
  adjustStock: (
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string
  ) => ActionResult;
  processSale: (
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    discount: number,
    amountPaid: number
  ) => { success: boolean; transaction?: Transaction; error?: string };
  voidTransaction: (transactionId: string, reason: string) => ActionResult;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ADMIN_TABS = new Set(['dashboard', 'products', 'reports', 'pos', 'settings']);
const USER_TABS = new Set(['pos', 'my-transactions']);
const emptySubscribe = () => () => {};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [user, setUser] = useState<UserSession | null>(() => getStoredSession());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => getStoredStockLogs());
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const session = getStoredSession();
    return session?.role === 'admin' ? 'dashboard' : 'pos';
  });
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      let snapshot = await fetchCloudSnapshot();
      if (!snapshot.connected) {
        const authRes = await signInSupabase(user.email, '12345678');
        if (authRes.accessToken) {
          snapshot = await fetchCloudSnapshot(authRes.accessToken);
        }
      }
      if (!active || !snapshot.connected) return;
      setIsCloudConnected(true);
      if (snapshot.products && snapshot.products.length > 0) {
        setProducts(snapshot.products);
        saveStoredProducts(snapshot.products);
      }
      if (snapshot.transactions) {
        setTransactions(snapshot.transactions);
        saveStoredTransactions(snapshot.transactions);
      }
      if (snapshot.stockLogs) {
        setStockLogs(snapshot.stockLogs);
        saveStoredStockLogs(snapshot.stockLogs);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const setActiveTab = (tab: string) => {
    if (!user) return;
    if (user.role === 'admin' && ADMIN_TABS.has(tab)) {
      setActiveTabState(tab);
    } else if (user.role === 'user' && USER_TABS.has(tab)) {
      setActiveTabState(tab);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const login = (email: string, pass: string): { success: boolean; message?: string } => {
    const now = Date.now();
    if (lockoutUntil > now) {
      const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
      return {
        success: false,
        message: `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik lagi.`,
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === 'admin@sip.com' && pass === '12345678') {
      const session: UserSession = {
        email: 'admin@sip.com',
        name: 'Administrator Toko',
        role: 'admin',
        loginAt: new Date().toISOString(),
      };
      setFailedAttempts(0);
      setLockoutUntil(0);
      setUser(session);
      saveStoredSession(session);
      setActiveTabState('dashboard');
      return { success: true };
    }

    if (cleanEmail === 'user@sip.com' && pass === '12345678') {
      const session: UserSession = {
        email: 'user@sip.com',
        name: 'Kasir Penjualan',
        role: 'user',
        loginAt: new Date().toISOString(),
      };
      setFailedAttempts(0);
      setLockoutUntil(0);
      setUser(session);
      saveStoredSession(session);
      setActiveTabState('pos');
      return { success: true };
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setLockoutUntil(now + 30000);
      setFailedAttempts(0);
      return {
        success: false,
        message: 'Batas percobaan login terlampaui (5x). Akun dikunci sementara selama 30 detik.',
      };
    }

    return {
      success: false,
      message: 'Kredensial tidak valid. Periksa kembali email dan kata sandi Anda.',
    };
  };

  const logout = () => {
    setUser(null);
    setIsCloudConnected(false);
    setSupabaseAccessToken(null);
    saveStoredSession(null);
  };

  const requireAdmin = (): ActionResult | null => {
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: tindakan ini memerlukan otorisasi Administrator.' };
    }
    return null;
  };

  const addProduct = (newProdData: Omit<Product, 'id' | 'updatedAt'>): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const cleanSku = newProdData.sku.trim().toUpperCase();
    const cleanName = newProdData.name.trim();
    if (!cleanSku || !cleanName) {
      return { success: false, error: 'Kode SKU dan Nama Produk wajib diisi.' };
    }

    if (products.some((p) => p.sku.toUpperCase() === cleanSku)) {
      return { success: false, error: `Kode SKU "${cleanSku}" sudah terdaftar pada produk lain.` };
    }

    const buyPrice = Math.max(0, Math.round(Number(newProdData.buyPrice) || 0));
    const sellPrice = Math.max(0, Math.round(Number(newProdData.sellPrice) || 0));
    const stock = Math.max(0, Math.floor(Number(newProdData.stock) || 0));
    const minStock = Math.max(1, Math.floor(Number(newProdData.minStock) || 1));

    const newProduct: Product = {
      ...newProdData,
      sku: cleanSku,
      name: cleanName,
      buyPrice,
      sellPrice,
      stock,
      minStock,
      unit: newProdData.unit.trim() || 'pcs',
      description: newProdData.description?.trim() || '',
      id: 'prd-' + Date.now().toString(36),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newProduct, ...products];
    setProducts(updated);
    saveStoredProducts(updated);
    void syncUpsertProduct(newProduct);

    if (newProduct.stock > 0) {
      const log: StockLog = {
        id: 'log-' + Date.now().toString(36),
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'IN',
        quantity: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'Saldo awal penambahan produk baru',
        createdAt: new Date().toISOString(),
        operator: user?.email || 'admin@sip.com',
      };
      const updatedLogs = [log, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs);
      void syncInsertStockLogs([log]);
    }

    return { success: true };
  };

  const updateProduct = (updatedProd: Product): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const existing = products.find((p) => p.id === updatedProd.id);
    if (!existing) {
      return { success: false, error: 'Produk tidak ditemukan.' };
    }

    const cleanSku = updatedProd.sku.trim().toUpperCase();
    const cleanName = updatedProd.name.trim();
    if (!cleanSku || !cleanName) {
      return { success: false, error: 'Kode SKU dan Nama Produk wajib diisi.' };
    }

    if (products.some((p) => p.id !== updatedProd.id && p.sku.toUpperCase() === cleanSku)) {
      return { success: false, error: `Kode SKU "${cleanSku}" sudah digunakan oleh produk lain.` };
    }

    const sanitized: Product = {
      ...updatedProd,
      sku: cleanSku,
      name: cleanName,
      buyPrice: Math.max(0, Math.round(Number(updatedProd.buyPrice) || 0)),
      sellPrice: Math.max(0, Math.round(Number(updatedProd.sellPrice) || 0)),
      stock: Math.max(0, Math.floor(Number(updatedProd.stock) || 0)),
      minStock: Math.max(1, Math.floor(Number(updatedProd.minStock) || 1)),
      unit: updatedProd.unit.trim() || 'pcs',
      description: updatedProd.description?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    const updated = products.map((p) => (p.id === sanitized.id ? sanitized : p));
    setProducts(updated);
    saveStoredProducts(updated);
    void syncUpsertProduct(sanitized);

    if (existing.stock !== sanitized.stock) {
      const diff = Math.abs(sanitized.stock - existing.stock);
      const log: StockLog = {
        id: 'log-' + Date.now().toString(36),
        productId: sanitized.id,
        productName: sanitized.name,
        type: 'ADJUSTMENT',
        quantity: diff,
        previousStock: existing.stock,
        newStock: sanitized.stock,
        reason: 'Koreksi stok melalui edit master produk',
        createdAt: new Date().toISOString(),
        operator: user?.email || 'admin@sip.com',
      };
      const updatedLogs = [log, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs);
      void syncInsertStockLogs([log]);
    }

    return { success: true };
  };

  const deleteProduct = (productId: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated);
    void syncDeleteProduct(productId);
    return { success: true };
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string
  ): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, error: 'Produk tidak ditemukan.' };

    const cleanQty = Math.floor(Number(quantity) || 0);
    if (cleanQty <= 0) {
      return { success: false, error: 'Jumlah penyesuaian stok harus lebih dari 0.' };
    }

    const previousStock = prod.stock;
    let newStock = previousStock;

    if (type === 'IN') {
      newStock = previousStock + cleanQty;
    } else if (type === 'OUT') {
      if (cleanQty > previousStock) {
        return {
          success: false,
          error: `Jumlah pengurangan (${cleanQty}) melebihi stok saat ini (${previousStock}).`,
        };
      }
      newStock = previousStock - cleanQty;
    } else {
      newStock = Math.max(0, cleanQty);
    }

    const updatedProd = { ...prod, stock: newStock, updatedAt: new Date().toISOString() };
    const updated = products.map((p) => (p.id === productId ? updatedProd : p));
    setProducts(updated);
    saveStoredProducts(updated);
    void syncUpsertProduct(updatedProd);

    const log: StockLog = {
      id: 'log-' + Date.now().toString(36),
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: cleanQty,
      previousStock,
      newStock,
      reason: reason.trim() || (type === 'IN' ? 'Restock barang masuk' : 'Penyesuaian stok gudang'),
      createdAt: new Date().toISOString(),
      operator: user?.email || 'admin@sip.com',
    };
    const updatedLogs = [log, ...stockLogs];
    setStockLogs(updatedLogs);
    saveStoredStockLogs(updatedLogs);
    void syncInsertStockLogs([log]);

    return { success: true };
  };

  const processSale = (
    cartItems: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    discount: number,
    amountPaid: number
  ) => {
    if (!user) {
      return { success: false, error: 'Sesi pengguna tidak ditemukan. Silakan masuk kembali.' };
    }
    if (!cartItems.length) {
      return { success: false, error: 'Keranjang belanja masih kosong.' };
    }

    for (const item of cartItems) {
      const qty = Math.floor(Number(item.quantity) || 0);
      if (qty <= 0) {
        return { success: false, error: 'Kuantitas item tidak valid.' };
      }
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        return { success: false, error: `Produk tidak ditemukan.` };
      }
      if (prod.stock < qty) {
        return {
          success: false,
          error: `Stok "${prod.name}" tidak mencukupi (Tersedia: ${prod.stock}, Diminta: ${qty}).`,
        };
      }
    }

    let subtotal = 0;
    const transactionItems = cartItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId)!;
      const qty = Math.floor(item.quantity);
      const itemSubtotal = prod.sellPrice * qty;
      subtotal += itemSubtotal;
      return {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        buyPrice: prod.buyPrice,
        price: prod.sellPrice,
        quantity: qty,
        subtotal: itemSubtotal,
      };
    });

    const safeDiscount = Math.max(0, Math.round(Number(discount) || 0));
    const maxCashierDiscount = Math.round(subtotal * 0.25);
    if (user.role !== 'admin' && safeDiscount > maxCashierDiscount) {
      return {
        success: false,
        error: `Otorisasi Kasir hanya mengizinkan diskon maksimal 25% (Rp ${maxCashierDiscount.toLocaleString('id-ID')}). Hubungi Administrator untuk diskon lebih besar.`,
      };
    }

    const finalDiscount = Math.min(safeDiscount, subtotal);
    const grandTotal = Math.max(0, subtotal - finalDiscount);
    const safeAmountPaid = Math.max(0, Math.round(Number(amountPaid) || 0));

    if (paymentMethod === 'Tunai' && safeAmountPaid < grandTotal) {
      return {
        success: false,
        error: `Nominal uang tunai (Rp ${safeAmountPaid.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${grandTotal.toLocaleString('id-ID')}).`,
      };
    }

    const change = paymentMethod === 'Tunai' ? Math.max(0, safeAmountPaid - grandTotal) : 0;
    const finalAmountPaid = paymentMethod === 'Tunai' ? safeAmountPaid : grandTotal;

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `TRX-${dateStr}-${randomSuffix}`;

    const newTransaction: Transaction = {
      id: 'trx-' + Date.now().toString(36),
      invoiceNo,
      createdAt: now.toISOString(),
      cashierEmail: user.email,
      cashierName: user.name,
      items: transactionItems,
      subtotal,
      discount: finalDiscount,
      tax: 0,
      total: grandTotal,
      paymentMethod,
      amountPaid: finalAmountPaid,
      change,
      status: 'COMPLETED',
    };

    const saleLogs: StockLog[] = [];
    const updatedProducts = products.map((p) => {
      const cartItem = cartItems.find((ci) => ci.productId === p.id);
      if (cartItem) {
        const qty = Math.floor(cartItem.quantity);
        const newStock = p.stock - qty;
        saleLogs.push({
          id: `log-${now.getTime().toString(36)}-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'OUT',
          quantity: qty,
          previousStock: p.stock,
          newStock,
          reason: `Penjualan Kasir (${invoiceNo})`,
          createdAt: now.toISOString(),
          operator: user.email,
        });
        return {
          ...p,
          stock: newStock,
          updatedAt: now.toISOString(),
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);
    for (const ci of cartItems) {
      const changedProd = updatedProducts.find((p) => p.id === ci.productId);
      if (changedProd) void syncUpsertProduct(changedProd);
    }

    if (saleLogs.length > 0) {
      const updatedLogs = [...saleLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs);
      void syncInsertStockLogs(saleLogs);
    }

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions);
    void syncInsertTransaction(newTransaction);

    playCashierChime();

    return { success: true, transaction: newTransaction };
  };

  const voidTransaction = (transactionId: string, reason: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const targetTrx = transactions.find((t) => t.id === transactionId);
    if (!targetTrx) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }
    if (targetTrx.status === 'VOIDED') {
      return { success: false, error: 'Nota transaksi ini sudah dibatalkan sebelumnya.' };
    }

    const cleanReason = reason.trim() || 'Pembatalan nota / retur barang oleh Administrator';
    const nowIso = new Date().toISOString();
    const voidLogs: StockLog[] = [];

    // Restore stock for each item in the voided transaction
    const itemQtyByProduct = new Map<string, number>();
    for (const item of targetTrx.items) {
      itemQtyByProduct.set(item.productId, (itemQtyByProduct.get(item.productId) || 0) + item.quantity);
    }

    const updatedProducts = products.map((p) => {
      const returnQty = itemQtyByProduct.get(p.id);
      if (returnQty && returnQty > 0) {
        const newStock = p.stock + returnQty;
        voidLogs.push({
          id: `log-void-${Date.now().toString(36)}-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'IN',
          quantity: returnQty,
          previousStock: p.stock,
          newStock,
          reason: `Void Nota ${targetTrx.invoiceNo}: ${cleanReason}`,
          createdAt: nowIso,
          operator: user?.email || 'admin@sip.com',
        });
        return {
          ...p,
          stock: newStock,
          updatedAt: nowIso,
        };
      }
      return p;
    });

    const updatedTransactions = transactions.map((t) =>
      t.id === transactionId
        ? {
            ...t,
            status: 'VOIDED' as const,
            voidReason: cleanReason,
            voidedAt: nowIso,
          }
        : t
    );

    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);
    for (const [prodId] of itemQtyByProduct) {
      const changedProd = updatedProducts.find((p) => p.id === prodId);
      if (changedProd) void syncUpsertProduct(changedProd);
    }

    if (voidLogs.length > 0) {
      const updatedLogs = [...voidLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs);
      void syncInsertStockLogs(voidLogs);
    }

    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions);
    void syncVoidTransaction(transactionId, cleanReason, nowIso);

    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isCloudConnected,
        theme,
        toggleTheme,
        products,
        transactions,
        stockLogs,
        activeTab,
        setActiveTab,
        login,
        logout,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        processSale,
        voidTransaction,
      }}
    >
      {isInitialized ? children : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
