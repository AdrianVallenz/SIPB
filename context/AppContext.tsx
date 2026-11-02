'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  resetAllStorageToDefault,
} from '@/lib/storage';
import { playCashierChime } from '@/lib/audio';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  user: UserSession | null;
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
  resetDemoData: () => ActionResult;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ADMIN_TABS = new Set(['dashboard', 'products', 'reports', 'pos', 'settings']);
const USER_TABS = new Set(['pos', 'my-transactions']);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [activeTab, setActiveTabState] = useState<string>('pos');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadedTheme = getStoredTheme();
    setTheme(loadedTheme);
    document.documentElement.setAttribute('data-theme', loadedTheme);

    const loadedSession = getStoredSession();
    setUser(loadedSession);
    if (loadedSession) {
      setActiveTabState(loadedSession.role === 'admin' ? 'dashboard' : 'pos');
    }

    setProducts(getStoredProducts());
    setTransactions(getStoredTransactions());
    setStockLogs(getStoredStockLogs());
    setIsInitialized(true);
  }, []);

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
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === 'admin@sip.com' && pass === '12345678') {
      const session: UserSession = {
        email: 'admin@sip.com',
        name: 'Administrator Toko',
        role: 'admin',
        loginAt: new Date().toISOString(),
      };
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
      setUser(session);
      saveStoredSession(session);
      setActiveTabState('pos');
      return { success: true };
    }

    return {
      success: false,
      message: 'Kredensial tidak valid. Periksa kembali email dan kata sandi Anda.',
    };
  };

  const logout = () => {
    setUser(null);
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
    }

    return { success: true };
  };

  const deleteProduct = (productId: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated);
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

    const updated = products.map((p) =>
      p.id === productId ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } : p
    );
    setProducts(updated);
    saveStoredProducts(updated);

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
    };

    const updatedProducts = products.map((p) => {
      const cartItem = cartItems.find((ci) => ci.productId === p.id);
      if (cartItem) {
        return {
          ...p,
          stock: p.stock - Math.floor(cartItem.quantity),
          updatedAt: now.toISOString(),
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions);

    playCashierChime();

    return { success: true, transaction: newTransaction };
  };

  const resetDemoData = (): ActionResult => {
    const authErr = requireAdmin();
    if (authErr) return authErr;

    resetAllStorageToDefault();
    setProducts(getStoredProducts());
    setTransactions(getStoredTransactions());
    setStockLogs(getStoredStockLogs());
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        user,
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
        resetDemoData,
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
