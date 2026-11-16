'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CashierAccount,
  PaymentMethod,
  Product,
  PRODUCT_CATEGORIES,
  StockLog,
  StorePaymentSettings,
  Transaction,
  UserSession,
} from '@/lib/types';
import {
  getDefaultStorePaymentSettings,
  getStoredCashiers,
  getStoredCustomCategories,
  getStoredPaymentSettings,
  getStoredProducts,
  getStoredSession,
  getStoredStockLogs,
  getStoredTheme,
  getStoredTransactions,
  saveStoredCashiers,
  saveStoredCustomCategories,
  saveStoredPaymentSettings,
  saveStoredProducts,
  saveStoredSession,
  saveStoredStockLogs,
  saveStoredTheme,
  saveStoredTransactions,
} from '@/lib/storage';
import {
  adjustProductStockRpc,
  createCashierCloud,
  deleteCashierCloud,
  fetchCloudSnapshot,
  getSupabaseAccessToken,
  getSupabaseRefreshToken,
  processPosSaleRpc,
  registerAdminCloud,
  setSupabaseAccessToken,
  signInSupabase,
  syncDeleteProduct,
  syncInsertStockLogs,
  syncUpsertPaymentSettings,
  syncUpsertProduct,
  syncUpsertProducts,
  toggleCashierCloud,
  updateCashierCloud,
  updateOwnSupabaseAccount,
  voidPosTransactionRpc,
} from '@/lib/supabase';
import { INITIAL_PRODUCTS } from '@/lib/dummyData';
import { playCashierChime } from '@/lib/audio';
import { generateInvoiceNo } from '@/lib/format';
import { getRouteForTab, getTabFromPathname } from '@/lib/routes';

export type ConnectionStatus = 'connecting' | 'online' | 'disconnected';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  role?: 'admin' | 'user';
}

interface AppContextType {
  user: UserSession | null;
  isHydrated: boolean;
  isCloudConnected: boolean;
  connectionStatus: ConnectionStatus;
  reconnectCloud: () => Promise<boolean>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  products: Product[];
  categories: string[];
  customCategories: string[];
  addCategory: (name: string) => Promise<ActionResult>;
  deleteCategory: (name: string) => Promise<ActionResult>;
  transactions: Transaction[];
  stockLogs: StockLog[];
  cashiers: CashierAccount[];
  paymentSettings: StorePaymentSettings;
  updatePaymentSettings: (
    patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>
  ) => Promise<ActionResult>;
  updateOwnProfile: (patch: { name?: string; password?: string }) => Promise<ActionResult>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  enterDemo: (role?: 'admin' | 'user') => Promise<AuthResult>;
  login: (email: string, pass: string) => Promise<AuthResult>;
  register: (name: string, email: string, pass: string) => Promise<AuthResult>;
  logout: () => void;
  createCashier: (name: string, email: string, password: string) => Promise<ActionResult>;
  toggleCashierStatus: (cashierId: string, isActive: boolean) => Promise<ActionResult>;
  updateCashier: (
    cashierId: string,
    patch: { name?: string; password?: string }
  ) => Promise<ActionResult>;
  deleteCashier: (cashierId: string) => Promise<ActionResult>;
  loadSampleCatalog: () => Promise<ActionResult>;
  addProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Promise<ActionResult>;
  updateProduct: (product: Product) => Promise<ActionResult>;
  deleteProduct: (productId: string) => Promise<ActionResult>;
  adjustStock: (
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string
  ) => Promise<ActionResult>;
  processSale: (
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    discount: number,
    amountPaid: number,
    customInvoiceNo?: string
  ) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>;
  voidTransaction: (transactionId: string, reason: string) => Promise<ActionResult>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ADMIN_TABS = new Set(['dashboard', 'products', 'reports', 'pos', 'settings']);
const USER_TABS = new Set(['pos', 'my-transactions']);
const emptySubscribe = () => () => {};
const SSR_EMPTY_PRODUCTS: Product[] = [];
const SSR_EMPTY_CUSTOM_CATEGORIES: string[] = [];
const SSR_EMPTY_TRANSACTIONS: Transaction[] = [];
const SSR_EMPTY_STOCK_LOGS: StockLog[] = [];
const SSR_EMPTY_CASHIERS: CashierAccount[] = [];
const SSR_DEFAULT_PAYMENT_SETTINGS: StorePaymentSettings = getDefaultStorePaymentSettings('');

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const ACTIVE_TAB_SESSION_KEY = 'sip_active_tab';

function readStoredActiveTab(session: UserSession | null): string {
  if (!session) return 'pos';
  const fallback = session.role === 'admin' ? 'dashboard' : 'pos';
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY);
    if (!saved) return fallback;
    if (session.role === 'admin' && ADMIN_TABS.has(saved)) return saved;
    if (session.role === 'user' && USER_TABS.has(saved)) return saved;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeStoredActiveTab(tab: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (tab) {
      sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, tab);
    } else {
      sessionStorage.removeItem(ACTIVE_TAB_SESSION_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const pathname = usePathname() || '/';
  const router = useRouter();

  const [user, setUser] = useState<UserSession | null>(() => getStoredSession());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());
  const [products, setProducts] = useState<Product[]>(() =>
    getStoredProducts(user?.ownerId || '')
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getStoredTransactions(user?.ownerId || '')
  );
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() =>
    getStoredStockLogs(user?.ownerId || '')
  );
  const [cashiers, setCashiers] = useState<CashierAccount[]>(() =>
    getStoredCashiers(user?.ownerId || '')
  );
  const [paymentSettings, setPaymentSettings] = useState<StorePaymentSettings>(() =>
    getStoredPaymentSettings(user?.ownerId || '')
  );
  const [customCategories, setCustomCategories] = useState<string[]>(() =>
    getStoredCustomCategories(user?.ownerId || '')
  );
  const [activeTab, setActiveTabState] = useState<string>(() =>
    readStoredActiveTab(user)
  );
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const demoAuthPromiseRef = useRef<Promise<AuthResult> | null>(null);
  const isCloudConnected = connectionStatus === 'online';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const hydrateTenantCache = useCallback((ownerId: string) => {
    setProducts(getStoredProducts(ownerId));
    setTransactions(getStoredTransactions(ownerId));
    setStockLogs(getStoredStockLogs(ownerId));
    setCashiers(getStoredCashiers(ownerId));
    setPaymentSettings(getStoredPaymentSettings(ownerId));
    setCustomCategories(getStoredCustomCategories(ownerId));
  }, []);

  const clearExpiredSession = useCallback(() => {
    setUser(null);
    setConnectionStatus('connecting');
    setSupabaseAccessToken(null);
    saveStoredSession(null);
    writeStoredActiveTab(null);
    hydrateTenantCache('');
    router.replace('/login');
  }, [hydrateTenantCache, router]);

  const syncFromCloud = useCallback(
    async (targetOwnerId: string): Promise<boolean> => {
      if (!targetOwnerId) return false;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnectionStatus('disconnected');
        return false;
      }

      const snapshot = await fetchCloudSnapshot();
      if (snapshot.authExpired) {
        if (getStoredSession()?.ownerId === targetOwnerId) {
          clearExpiredSession();
        }
        return false;
      }

      if (!snapshot.connected || getStoredSession()?.ownerId !== targetOwnerId) {
        setConnectionStatus('disconnected');
        return false;
      }

      setConnectionStatus('online');
      if (snapshot.products) {
        setProducts(snapshot.products);
        saveStoredProducts(snapshot.products, targetOwnerId);
      }
      if (snapshot.transactions) {
        setTransactions(snapshot.transactions);
        saveStoredTransactions(snapshot.transactions, targetOwnerId);
      }
      if (snapshot.stockLogs) {
        setStockLogs(snapshot.stockLogs);
        saveStoredStockLogs(snapshot.stockLogs, targetOwnerId);
      }
      if (snapshot.cashiers) {
        setCashiers(snapshot.cashiers);
        saveStoredCashiers(snapshot.cashiers, targetOwnerId);
      }
      if (snapshot.paymentSettings) {
        setPaymentSettings(snapshot.paymentSettings);
        saveStoredPaymentSettings(snapshot.paymentSettings, targetOwnerId);
        if (Array.isArray(snapshot.paymentSettings.customCategories)) {
          setCustomCategories(snapshot.paymentSettings.customCategories);
          saveStoredCustomCategories(snapshot.paymentSettings.customCategories, targetOwnerId);
        }
      } else {
        setPaymentSettings(getStoredPaymentSettings(targetOwnerId));
      }
      return true;
    },
    [clearExpiredSession]
  );

  const reconnectCloud = useCallback(async (): Promise<boolean> => {
    const targetOwnerId = getStoredSession()?.ownerId || user?.ownerId || '';
    if (!targetOwnerId) return false;
    setConnectionStatus('connecting');
    return syncFromCloud(targetOwnerId);
  }, [syncFromCloud, user?.ownerId]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const targetOwnerId = user.ownerId;
    (async () => {
      if (!active) return;
      await syncFromCloud(targetOwnerId);
    })();

    const handleOnline = () => {
      if (active) {
        setConnectionStatus('connecting');
        void syncFromCloud(targetOwnerId);
      }
    };
    const handleOffline = () => {
      if (active) setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, syncFromCloud]);

  const setActiveTab = (tab: string) => {
    const activeUser = user || getStoredSession();
    if (!activeUser) return;
    if (
      (activeUser.role === 'admin' && ADMIN_TABS.has(tab)) ||
      (activeUser.role === 'user' && USER_TABS.has(tab))
    ) {
      setActiveTabState(tab);
      writeStoredActiveTab(tab);
      const targetRoute = getRouteForTab(tab, activeUser.role);
      if (pathname !== targetRoute) {
        router.push(targetRoute);
      }
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const activateSession = (session: UserSession) => {
    const defaultTab = session.role === 'admin' ? 'dashboard' : 'pos';
    setFailedAttempts(0);
    setLockoutUntil(0);
    setConnectionStatus('connecting');
    hydrateTenantCache(session.ownerId);
    saveStoredSession(session);
    writeStoredActiveTab(defaultTab);
    setUser(session);
    setActiveTabState(defaultTab);
  };

  const enterDemo = async (role: 'admin' | 'user' = 'admin'): Promise<AuthResult> => {
    if (demoAuthPromiseRef.current) {
      return demoAuthPromiseRef.current;
    }

    const run = (async (): Promise<AuthResult> => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
          success: false,
          message: 'Koneksi internet terputus. Demo hanya tersedia dalam mode Full Online.',
        };
      }
      const demoEmail = role === 'user' ? 'kasir@sipb.web.id' : 'admin@sipb.web.id';
      const demoPass = role === 'user' ? 'kasir123' : 'admin123';
      setSupabaseAccessToken(null);
      const authRes = await signInSupabase(demoEmail, demoPass);
      if (authRes.accessToken && authRes.user) {
        const session: UserSession = {
          id: authRes.user.id,
          ownerId: authRes.user.ownerId || authRes.user.id,
          email: authRes.user.email,
          name: authRes.user.name,
          role: authRes.user.role,
          loginAt: new Date().toISOString(),
        };
        activateSession(session);
        return { success: true, role: session.role };
      }
      return {
        success: false,
        message:
          authRes.error ||
          'Tidak dapat terhubung ke server cloud Demo. Periksa koneksi internet Anda.',
      };
    })();

    demoAuthPromiseRef.current = run;
    try {
      return await run;
    } finally {
      demoAuthPromiseRef.current = null;
    }
  };

  const login = async (email: string, pass: string): Promise<AuthResult> => {
    const now = Date.now();
    if (lockoutUntil > now) {
      const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
      return {
        success: false,
        message: `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik lagi.`,
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, message: 'Email dan kata sandi wajib diisi.' };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        message: 'Koneksi internet terputus. Masuk ke aplikasi memerlukan koneksi online ke server cloud.',
      };
    }

    // Authenticate exclusively against Supabase Cloud Auth
    const authRes = await signInSupabase(cleanEmail, pass);
    if (authRes.banned) {
      return {
        success: false,
        message: authRes.error || 'Akun kasir dinonaktifkan oleh Administrator.',
      };
    }

    if (authRes.accessToken && authRes.user) {
      const session: UserSession = {
        id: authRes.user.id,
        ownerId: authRes.user.ownerId || authRes.user.id,
        email: authRes.user.email,
        name: authRes.user.name,
        role: authRes.user.role,
        loginAt: new Date().toISOString(),
      };
      activateSession(session);
      return { success: true, role: session.role };
    }

    if (authRes.offline) {
      return {
        success: false,
        message:
          authRes.error || 'Tidak dapat terhubung ke server cloud. Periksa koneksi internet Anda.',
      };
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
      message: authRes.error || 'Kredensial tidak valid. Periksa kembali email dan kata sandi Anda.',
    };
  };

  const register = async (name: string, email: string, pass: string): Promise<AuthResult> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Nama lengkap / nama toko minimal 2 karakter.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Format alamat email tidak valid.' };
    }
    if (!pass || pass.length < 6) {
      return { success: false, message: 'Kata sandi minimal terdiri dari 6 karakter.' };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        message: 'Koneksi internet terputus. Pendaftaran akun memerlukan koneksi online ke server cloud.',
      };
    }

    // Always register self-signup users as Administrator of their own isolated cloud store
    const cloudReg = await registerAdminCloud(cleanName, cleanEmail, pass);
    if (cloudReg.ok && cloudReg.user) {
      setSupabaseAccessToken(null);
      const signInRes = await signInSupabase(cleanEmail, pass);
      if (!signInRes.accessToken) {
        return {
          success: false,
          message:
            signInRes.error ||
            'Akun cloud berhasil dibuat, tetapi gagal masuk otomatis. Silakan login secara manual.',
        };
      }
      const session: UserSession = {
        id: cloudReg.user.id,
        ownerId: cloudReg.user.ownerId,
        email: cleanEmail,
        name: cleanName,
        role: 'admin',
        loginAt: new Date().toISOString(),
      };
      activateSession(session);
      return { success: true, role: 'admin' };
    }

    return {
      success: false,
      message:
        cloudReg.error || 'Pendaftaran gagal. Gunakan email lain atau periksa koneksi internet Anda.',
    };
  };

  const logout = () => {
    setUser(null);
    setConnectionStatus('connecting');
    setSupabaseAccessToken(null);
    saveStoredSession(null);
    writeStoredActiveTab(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('sip_screen_mode');
      } catch {
        // Ignore storage error
      }
    }
    hydrateTenantCache('');
    router.replace('/login');
  };

  const requireOnlineCloudSession = (): string | null => {
    if (!user) {
      return 'Sesi pengguna tidak ditemukan. Silakan masuk kembali.';
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('disconnected');
      return 'Koneksi internet terputus. Aplikasi berjalan Full Online — sambungkan internet untuk melanjutkan.';
    }
    if (!getSupabaseAccessToken() && !getSupabaseRefreshToken()) {
      setConnectionStatus('disconnected');
      return 'Sesi cloud tidak aktif. Silakan masuk ulang ke sistem.';
    }
    return null;
  };

  const markCloudSyncResult = (res: { ok: boolean; offline?: boolean }) => {
    if (res.ok) {
      setConnectionStatus('online');
    } else if (res.offline) {
      setConnectionStatus('disconnected');
    }
  };

  const requireAdmin = (): ActionResult | null => {
    if (!user || user.role !== 'admin') {
      return {
        success: false,
        error: 'Akses ditolak: tindakan ini memerlukan otorisasi Administrator.',
      };
    }
    return null;
  };

  const createCashier = async (
    name: string,
    email: string,
    password: string
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Nama kasir minimal 2 karakter.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Format email kasir tidak valid.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Kata sandi kasir minimal 6 karakter.' };
    }

    const cloudRes = await createCashierCloud(cleanName, cleanEmail, password);
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok || !cloudRes.cashier) {
      return {
        success: false,
        error: cloudRes.error || 'Gagal membuat akun kasir di server cloud.',
      };
    }

    const updated = [cloudRes.cashier, ...cashiers.filter((c) => c.id !== cloudRes.cashier!.id)];
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);
    return { success: true };
  };

  const isLockedDemoCashier = (cashierId: string): boolean => {
    const target = cashiers.find((c) => c.id === cashierId);
    return Boolean(target && target.email.toLowerCase() === 'kasir@sipb.web.id');
  };

  const toggleCashierStatus = async (
    cashierId: string,
    isActive: boolean
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    if (isLockedDemoCashier(cashierId)) {
      return {
        success: false,
        error: 'Akun kasir demo publik (kasir@sipb.web.id) dikunci agar tetap dapat digunakan untuk evaluasi.',
      };
    }
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cloudRes = await toggleCashierCloud(cashierId, isActive);
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok) {
      return { success: false, error: cloudRes.error || 'Gagal mengubah status kasir di cloud.' };
    }

    const updated = cashiers.map((c) => (c.id === cashierId ? { ...c, isActive } : c));
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);
    return { success: true };
  };

  const updateCashier = async (
    cashierId: string,
    patch: { name?: string; password?: string }
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    if (isLockedDemoCashier(cashierId)) {
      return {
        success: false,
        error: 'Akun kasir demo publik (kasir@sipb.web.id) dikunci agar tetap dapat digunakan untuk evaluasi.',
      };
    }
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cleanName = patch.name?.trim();
    const cleanPass = patch.password;
    if (!cleanName && !cleanPass) {
      return { success: false, error: 'Isi nama baru atau kata sandi baru.' };
    }
    if (cleanPass && cleanPass.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
    }

    const cloudRes = await updateCashierCloud(cashierId, {
      ...(cleanName ? { name: cleanName } : {}),
      ...(cleanPass ? { password: cleanPass } : {}),
    });
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok) {
      return { success: false, error: cloudRes.error || 'Gagal memperbarui akun kasir di cloud.' };
    }

    if (cleanName) {
      const updated = cashiers.map((c) =>
        c.id === cashierId ? { ...c, name: cleanName } : c
      );
      setCashiers(updated);
      saveStoredCashiers(updated, user.ownerId);
    }
    return { success: true };
  };

  const deleteCashier = async (cashierId: string): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    if (isLockedDemoCashier(cashierId)) {
      return {
        success: false,
        error: 'Akun kasir demo publik (kasir@sipb.web.id) dikunci agar tetap dapat digunakan untuk evaluasi.',
      };
    }
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cloudRes = await deleteCashierCloud(cashierId);
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok) {
      return { success: false, error: cloudRes.error || 'Gagal menghapus akun kasir di cloud.' };
    }

    const updated = cashiers.filter((c) => c.id !== cashierId);
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);
    return { success: true };
  };

  const loadSampleCatalog = async (): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    if (products.length > 0) {
      return {
        success: false,
        error: 'Katalog sudah memiliki data produk. Paket contoh hanya untuk toko kosong.',
      };
    }

    const tag = user.ownerId.replace(/-/g, '').slice(0, 4).toUpperCase();
    const nowIso = new Date().toISOString();
    const sampleProducts: Product[] = INITIAL_PRODUCTS.slice(0, 8).map((p, idx) => ({
      ...p,
      id: makeId(`prd-${idx + 1}`),
      ownerId: user.ownerId,
      sku: `${p.sku}-${tag}`,
      updatedAt: nowIso,
    }));

    const cloudRes = await syncUpsertProducts(sampleProducts, user.ownerId);
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok) {
      return {
        success: false,
        error: cloudRes.error || 'Gagal mengunggah produk contoh ke server cloud.',
      };
    }

    setProducts(sampleProducts);
    saveStoredProducts(sampleProducts, user.ownerId);
    return { success: true };
  };

  const addProduct = async (
    newProdData: Omit<Product, 'id' | 'updatedAt'>
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

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
    const ownerId = user.ownerId;

    const newProduct: Product = {
      ...newProdData,
      ownerId,
      sku: cleanSku,
      name: cleanName,
      buyPrice,
      sellPrice,
      stock,
      minStock,
      unit: newProdData.unit.trim() || 'pcs',
      description: newProdData.description?.trim() || '',
      id: makeId('prd'),
      updatedAt: new Date().toISOString(),
    };

    const prodRes = await syncUpsertProduct(newProduct, ownerId);
    markCloudSyncResult(prodRes);
    if (!prodRes.ok) {
      return {
        success: false,
        error: prodRes.error || 'Gagal menyimpan produk ke server cloud.',
      };
    }

    const updated = [newProduct, ...products];
    setProducts(updated);
    saveStoredProducts(updated, ownerId);

    const initialLog: StockLog | null =
      newProduct.stock > 0
        ? {
            id: makeId('log'),
            ownerId,
            productId: newProduct.id,
            productName: newProduct.name,
            type: 'IN',
            quantity: newProduct.stock,
            previousStock: 0,
            newStock: newProduct.stock,
            reason: 'Saldo awal penambahan produk baru',
            createdAt: new Date().toISOString(),
            operator: user.email,
          }
        : null;

    if (initialLog) {
      const logRes = await syncInsertStockLogs([initialLog], ownerId);
      markCloudSyncResult(logRes);
      if (logRes.ok) {
        const updatedLogs = [initialLog, ...stockLogs];
        setStockLogs(updatedLogs);
        saveStoredStockLogs(updatedLogs, ownerId);
      }
    }

    return { success: true };
  };

  const updateProduct = async (updatedProd: Product): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

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

    const ownerId = user.ownerId;
    const sanitized: Product = {
      ...updatedProd,
      ownerId,
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

    const prodRes = await syncUpsertProduct(sanitized, ownerId);
    markCloudSyncResult(prodRes);
    if (!prodRes.ok) {
      return {
        success: false,
        error: prodRes.error || 'Gagal memperbarui produk di server cloud.',
      };
    }

    const updated = products.map((p) => (p.id === sanitized.id ? sanitized : p));
    setProducts(updated);
    saveStoredProducts(updated, ownerId);

    if (existing.stock !== sanitized.stock) {
      const diff = Math.abs(sanitized.stock - existing.stock);
      const editLog: StockLog = {
        id: makeId('log'),
        ownerId,
        productId: sanitized.id,
        productName: sanitized.name,
        type: 'ADJUSTMENT',
        quantity: diff,
        previousStock: existing.stock,
        newStock: sanitized.stock,
        reason: 'Koreksi stok melalui edit master produk',
        createdAt: new Date().toISOString(),
        operator: user.email,
      };
      const logRes = await syncInsertStockLogs([editLog], ownerId);
      markCloudSyncResult(logRes);
      if (logRes.ok) {
        const updatedLogs = [editLog, ...stockLogs];
        setStockLogs(updatedLogs);
        saveStoredStockLogs(updatedLogs, ownerId);
      }
    }

    return { success: true };
  };

  const deleteProduct = async (productId: string): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const delRes = await syncDeleteProduct(productId);
    markCloudSyncResult(delRes);
    if (!delRes.ok) {
      return {
        success: false,
        error: delRes.error || 'Gagal menghapus produk dari server cloud.',
      };
    }

    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);
    return { success: true };
  };

  const adjustStock = async (
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, error: 'Produk tidak ditemukan.' };

    const cleanQty = Math.floor(Number(quantity) || 0);
    if (type === 'ADJUSTMENT' ? cleanQty < 0 : cleanQty <= 0) {
      return {
        success: false,
        error:
          type === 'ADJUSTMENT'
            ? 'Nilai stok fisik tidak boleh negatif.'
            : 'Jumlah penyesuaian stok harus lebih dari 0.',
      };
    }

    const ownerId = user.ownerId;
    const rpcRes = await adjustProductStockRpc({
      productId,
      quantity: cleanQty,
      type,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    });
    markCloudSyncResult(rpcRes);
    if (!rpcRes.ok || !rpcRes.product) {
      if (!rpcRes.offline) {
        void syncFromCloud(ownerId);
      }
      return {
        success: false,
        error: rpcRes.error || 'Gagal memperbarui stok produk di server cloud.',
      };
    }

    const updated = products.map((p) =>
      p.id === productId
        ? {
            ...p,
            stock: rpcRes.product!.stock,
            updatedAt: rpcRes.product!.updatedAt,
          }
        : p
    );
    setProducts(updated);
    saveStoredProducts(updated, ownerId);

    if (rpcRes.stockLog) {
      const updatedLogs = [rpcRes.stockLog, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, ownerId);
    }

    return { success: true };
  };

  const processSale = async (
    cartItems: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    discount: number,
    amountPaid: number,
    customInvoiceNo?: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> => {
    const netErr = requireOnlineCloudSession();
    if (netErr || !user) {
      return { success: false, error: netErr || 'Sesi pengguna tidak ditemukan. Silakan masuk kembali.' };
    }
    if (!cartItems.length) {
      return { success: false, error: 'Keranjang belanja masih kosong.' };
    }

    // Build O(1) lookup Map for fast client pre-validation before locking rows in Postgres
    const productById = new Map<string, Product>(products.map((p) => [p.id, p]));
    const cartQtyById = new Map<string, number>();

    for (const item of cartItems) {
      const qty = Math.floor(Number(item.quantity) || 0);
      if (qty <= 0) {
        return { success: false, error: 'Kuantitas item tidak valid.' };
      }
      const prod = productById.get(item.productId);
      if (!prod) {
        return { success: false, error: `Produk tidak ditemukan.` };
      }
      const accumulatedQty = (cartQtyById.get(item.productId) || 0) + qty;
      if (prod.stock < accumulatedQty) {
        return {
          success: false,
          error: `Stok "${prod.name}" tidak mencukupi (Tersedia: ${prod.stock}, Diminta: ${accumulatedQty}).`,
        };
      }
      cartQtyById.set(item.productId, accumulatedQty);
    }

    let subtotal = 0;
    for (const item of cartItems) {
      const prod = productById.get(item.productId)!;
      subtotal += prod.sellPrice * Math.floor(item.quantity);
    }

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

    const finalAmountPaid = paymentMethod === 'Tunai' ? safeAmountPaid : grandTotal;
    const ownerId = user.ownerId;
    const cleanInvoiceNo = customInvoiceNo?.trim();
    const invoiceNo =
      cleanInvoiceNo && /^TRX-[A-Z0-9\-]{6,30}$/.test(cleanInvoiceNo)
        ? cleanInvoiceNo
        : generateInvoiceNo(ownerId);

    // Atomic transaction in Postgres (FOR UPDATE row lock + stock check + audit logs)
    const rpcRes = await processPosSaleRpc({
      trxId: makeId('trx'),
      invoiceNo,
      cashierName: user.name,
      paymentMethod,
      discount: finalDiscount,
      amountPaid: finalAmountPaid,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: Math.floor(Number(item.quantity) || 0),
      })),
      createdAt: new Date().toISOString(),
    });
    markCloudSyncResult(rpcRes);

    if (!rpcRes.ok || !rpcRes.transaction) {
      if (!rpcRes.offline) {
        void syncFromCloud(ownerId);
      }
      return {
        success: false,
        error: rpcRes.error || 'Gagal menyimpan transaksi ke server cloud. Periksa koneksi internet Anda.',
      };
    }

    const patchById = new Map((rpcRes.updatedProducts || []).map((p) => [p.id, p]));
    const updatedProducts = products.map((p) => {
      const patch = patchById.get(p.id);
      return patch ? { ...p, stock: patch.stock, updatedAt: patch.updatedAt } : p;
    });
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts, ownerId);

    if (rpcRes.stockLogs && rpcRes.stockLogs.length > 0) {
      const updatedLogs = [...rpcRes.stockLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, ownerId);
    }

    const updatedTransactions = [rpcRes.transaction, ...transactions];
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, ownerId);

    playCashierChime();

    return { success: true, transaction: rpcRes.transaction };
  };

  const voidTransaction = async (
    transactionId: string,
    reason: string
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const targetTrx = transactions.find((t) => t.id === transactionId);
    if (!targetTrx) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }
    if (targetTrx.status === 'VOIDED') {
      return { success: false, error: 'Nota transaksi ini sudah dibatalkan sebelumnya.' };
    }

    const cleanReason = reason.trim() || 'Pembatalan nota / retur barang oleh Administrator';
    const nowIso = new Date().toISOString();
    const ownerId = user.ownerId;

    const rpcRes = await voidPosTransactionRpc({
      transactionId,
      voidReason: cleanReason,
      voidedAt: nowIso,
    });
    markCloudSyncResult(rpcRes);
    if (!rpcRes.ok) {
      if (!rpcRes.offline) {
        void syncFromCloud(ownerId);
      }
      return {
        success: false,
        error: rpcRes.error || 'Gagal membatalkan nota di server cloud.',
      };
    }

    const patchById = new Map((rpcRes.updatedProducts || []).map((p) => [p.id, p]));
    const updatedProducts = products.map((p) => {
      const patch = patchById.get(p.id);
      return patch ? { ...p, stock: patch.stock, updatedAt: patch.updatedAt } : p;
    });
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts, ownerId);

    if (rpcRes.stockLogs && rpcRes.stockLogs.length > 0) {
      const updatedLogs = [...rpcRes.stockLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, ownerId);
    }

    const updatedTransactions = transactions.map((t) =>
      t.id === transactionId
        ? {
            ...t,
            status: 'VOIDED' as const,
            voidReason: rpcRes.voidReason || cleanReason,
            voidedAt: rpcRes.voidedAt || nowIso,
          }
        : t
    );
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, ownerId);

    return { success: true };
  };

  const updatePaymentSettings = async (
    patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const ownerId = user.ownerId;
    const base = paymentSettings.ownerId === ownerId
      ? paymentSettings
      : getDefaultStorePaymentSettings(ownerId);

    const nextSettings: StorePaymentSettings = {
      ...base,
      ...patch,
      ownerId,
      updatedAt: new Date().toISOString(),
    };

    const syncRes = await syncUpsertPaymentSettings(nextSettings, ownerId);
    markCloudSyncResult(syncRes);
    if (!syncRes.ok) {
      return {
        success: false,
        error: syncRes.error || 'Gagal menyinkronkan pengaturan ke server cloud.',
      };
    }

    setPaymentSettings(nextSettings);
    saveStoredPaymentSettings(nextSettings, ownerId);

    return { success: true };
  };

  const updateOwnProfile = async (patch: {
    name?: string;
    password?: string;
  }): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cleanName = patch.name?.trim();
    const nextPassword = patch.password;
    if (!cleanName && !nextPassword) {
      return { success: false, error: 'Isi nama baru atau kata sandi baru.' };
    }
    if (cleanName && cleanName.length < 2) {
      return { success: false, error: 'Nama pemilik/toko minimal 2 karakter.' };
    }
    if (nextPassword && nextPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
    }

    const isDemoAdmin = user.email.toLowerCase() === 'admin@sipb.web.id';
    if (nextPassword && isDemoAdmin) {
      return {
        success: false,
        error: 'Kata sandi akun demo publik (admin@sipb.web.id) dikunci agar tetap dapat digunakan untuk evaluasi.',
      };
    }

    const cloudRes = await updateOwnSupabaseAccount({
      ...(cleanName ? { name: cleanName } : {}),
      ...(nextPassword ? { password: nextPassword } : {}),
    });
    markCloudSyncResult(cloudRes);
    if (!cloudRes.ok) {
      return { success: false, error: cloudRes.error || 'Gagal memperbarui profil akun di cloud.' };
    }

    if (cleanName) {
      const updatedSession: UserSession = { ...user, name: cleanName };
      setUser(updatedSession);
      saveStoredSession(updatedSession);
    }

    return { success: true };
  };

  const categories = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    const pushUnique = (cat: string) => {
      const trimmed = cat.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    };
    for (const c of PRODUCT_CATEGORIES) pushUnique(c);
    for (const c of customCategories) pushUnique(c);
    for (const p of products) {
      if (p.category) pushUnique(p.category);
    }
    return result;
  }, [customCategories, products]);

  const addCategory = async (rawName: string): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const cleanName = rawName.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) {
      return { success: false, error: 'Nama kategori minimal 2 karakter.' };
    }
    if (cleanName.length > 40) {
      return { success: false, error: 'Nama kategori maksimal 40 karakter.' };
    }
    if (categories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `Kategori "${cleanName}" sudah ada.` };
    }

    const updated = [...customCategories, cleanName];
    const ownerId = user.ownerId;
    const base =
      paymentSettings.ownerId === ownerId
        ? paymentSettings
        : getDefaultStorePaymentSettings(ownerId);
    const nextSettings: StorePaymentSettings = {
      ...base,
      ownerId,
      customCategories: updated,
      updatedAt: new Date().toISOString(),
    };
    const syncRes = await syncUpsertPaymentSettings(nextSettings, ownerId);
    markCloudSyncResult(syncRes);
    if (!syncRes.ok) {
      return { success: false, error: syncRes.error || 'Gagal menyimpan kategori ke server cloud.' };
    }

    setPaymentSettings(nextSettings);
    saveStoredPaymentSettings(nextSettings, ownerId);
    setCustomCategories(updated);
    saveStoredCustomCategories(updated, ownerId);
    return { success: true };
  };

  const deleteCategory = async (targetName: string): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };
    const netErr = requireOnlineCloudSession();
    if (netErr) return { success: false, error: netErr };

    const lower = targetName.trim().toLowerCase();
    if (PRODUCT_CATEGORIES.some((c) => c.toLowerCase() === lower)) {
      return { success: false, error: 'Kategori bawaan toko tidak dapat dihapus.' };
    }

    const usedCount = products.filter((p) => p.category.toLowerCase() === lower).length;
    if (usedCount > 0) {
      return {
        success: false,
        error: `Kategori ini masih dipakai oleh ${usedCount} produk. Ubah kategori produk tersebut terlebih dahulu.`,
      };
    }

    const updated = customCategories.filter((c) => c.toLowerCase() !== lower);
    const ownerId = user.ownerId;
    const base =
      paymentSettings.ownerId === ownerId
        ? paymentSettings
        : getDefaultStorePaymentSettings(ownerId);
    const nextSettings: StorePaymentSettings = {
      ...base,
      ownerId,
      customCategories: updated,
      updatedAt: new Date().toISOString(),
    };
    const syncRes = await syncUpsertPaymentSettings(nextSettings, ownerId);
    markCloudSyncResult(syncRes);
    if (!syncRes.ok) {
      return { success: false, error: syncRes.error || 'Gagal memperbarui kategori di server cloud.' };
    }

    setPaymentSettings(nextSettings);
    saveStoredPaymentSettings(nextSettings, ownerId);
    setCustomCategories(updated);
    saveStoredCustomCategories(updated, ownerId);
    return { success: true };
  };

  // Sinkronkan ref aksi setelah commit agar value Provider stabil di memo tanpa stale closure
  const actionsRef = useRef({
    toggleTheme,
    setActiveTab,
    enterDemo,
    login,
    register,
    logout,
    createCashier,
    toggleCashierStatus,
    updateCashier,
    deleteCashier,
    loadSampleCatalog,
    addCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    processSale,
    voidTransaction,
    updatePaymentSettings,
    updateOwnProfile,
  });

  useEffect(() => {
    actionsRef.current = {
      toggleTheme,
      setActiveTab,
      enterDemo,
      login,
      register,
      logout,
      createCashier,
      toggleCashierStatus,
      updateCashier,
      deleteCashier,
      loadSampleCatalog,
      addCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      processSale,
      voidTransaction,
      updatePaymentSettings,
      updateOwnProfile,
    };
  });

  const stableToggleTheme = useCallback(() => actionsRef.current.toggleTheme(), []);
  const stableSetActiveTab = useCallback((tab: string) => actionsRef.current.setActiveTab(tab), []);
  const stableEnterDemo = useCallback(
    (role?: 'admin' | 'user') => actionsRef.current.enterDemo(role),
    []
  );
  const stableLogin = useCallback(
    (email: string, pass: string) => actionsRef.current.login(email, pass),
    []
  );
  const stableRegister = useCallback(
    (name: string, email: string, pass: string) => actionsRef.current.register(name, email, pass),
    []
  );
  const stableLogout = useCallback(() => actionsRef.current.logout(), []);
  const stableCreateCashier = useCallback(
    (name: string, email: string, password: string) =>
      actionsRef.current.createCashier(name, email, password),
    []
  );
  const stableToggleCashierStatus = useCallback(
    (cashierId: string, isActive: boolean) =>
      actionsRef.current.toggleCashierStatus(cashierId, isActive),
    []
  );
  const stableUpdateCashier = useCallback(
    (cashierId: string, patch: { name?: string; password?: string }) =>
      actionsRef.current.updateCashier(cashierId, patch),
    []
  );
  const stableDeleteCashier = useCallback(
    (cashierId: string) => actionsRef.current.deleteCashier(cashierId),
    []
  );
  const stableLoadSampleCatalog = useCallback(() => actionsRef.current.loadSampleCatalog(), []);
  const stableAddCategory = useCallback(
    (name: string) => actionsRef.current.addCategory(name),
    []
  );
  const stableDeleteCategory = useCallback(
    (name: string) => actionsRef.current.deleteCategory(name),
    []
  );
  const stableAddProduct = useCallback(
    (product: Omit<Product, 'id' | 'updatedAt'>) => actionsRef.current.addProduct(product),
    []
  );
  const stableUpdateProduct = useCallback(
    (product: Product) => actionsRef.current.updateProduct(product),
    []
  );
  const stableDeleteProduct = useCallback(
    (productId: string) => actionsRef.current.deleteProduct(productId),
    []
  );
  const stableAdjustStock = useCallback(
    (
      productId: string,
      quantity: number,
      type: 'IN' | 'OUT' | 'ADJUSTMENT',
      reason: string
    ) => actionsRef.current.adjustStock(productId, quantity, type, reason),
    []
  );
  const stableProcessSale = useCallback(
    (
      items: { productId: string; quantity: number }[],
      paymentMethod: PaymentMethod,
      discount: number,
      amountPaid: number,
      customInvoiceNo?: string
    ) => actionsRef.current.processSale(items, paymentMethod, discount, amountPaid, customInvoiceNo),
    []
  );
  const stableVoidTransaction = useCallback(
    (transactionId: string, reason: string) =>
      actionsRef.current.voidTransaction(transactionId, reason),
    []
  );
  const stableUpdatePaymentSettings = useCallback(
    (patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>) =>
      actionsRef.current.updatePaymentSettings(patch),
    []
  );
  const stableUpdateOwnProfile = useCallback(
    (patch: { name?: string; password?: string }) =>
      actionsRef.current.updateOwnProfile(patch),
    []
  );

  const routeTab = getTabFromPathname(pathname, user?.role);
  const effectiveTab = routeTab ?? activeTab;

  // Gunakan nilai deterministik saat SSR agar HTML utuh tanpa hydration mismatch
  const contextValue = useMemo<AppContextType>(
    () => ({
      user: isInitialized ? user : null,
      isHydrated: isInitialized,
      isCloudConnected: isInitialized ? isCloudConnected : false,
      connectionStatus: isInitialized ? connectionStatus : 'connecting',
      reconnectCloud,
      theme: isInitialized ? theme : 'dark',
      toggleTheme: stableToggleTheme,
      products: isInitialized ? products : SSR_EMPTY_PRODUCTS,
      categories: isInitialized ? categories : PRODUCT_CATEGORIES,
      customCategories: isInitialized ? customCategories : SSR_EMPTY_CUSTOM_CATEGORIES,
      addCategory: stableAddCategory,
      deleteCategory: stableDeleteCategory,
      transactions: isInitialized ? transactions : SSR_EMPTY_TRANSACTIONS,
      stockLogs: isInitialized ? stockLogs : SSR_EMPTY_STOCK_LOGS,
      cashiers: isInitialized ? cashiers : SSR_EMPTY_CASHIERS,
      paymentSettings: isInitialized ? paymentSettings : SSR_DEFAULT_PAYMENT_SETTINGS,
      updatePaymentSettings: stableUpdatePaymentSettings,
      updateOwnProfile: stableUpdateOwnProfile,
      activeTab: isInitialized ? effectiveTab : 'pos',
      setActiveTab: stableSetActiveTab,
      enterDemo: stableEnterDemo,
      login: stableLogin,
      register: stableRegister,
      logout: stableLogout,
      createCashier: stableCreateCashier,
      toggleCashierStatus: stableToggleCashierStatus,
      updateCashier: stableUpdateCashier,
      deleteCashier: stableDeleteCashier,
      loadSampleCatalog: stableLoadSampleCatalog,
      addProduct: stableAddProduct,
      updateProduct: stableUpdateProduct,
      deleteProduct: stableDeleteProduct,
      adjustStock: stableAdjustStock,
      processSale: stableProcessSale,
      voidTransaction: stableVoidTransaction,
    }),
    [
      isInitialized,
      user,
      isCloudConnected,
      connectionStatus,
      reconnectCloud,
      theme,
      products,
      categories,
      customCategories,
      transactions,
      stockLogs,
      cashiers,
      paymentSettings,
      effectiveTab,
      stableToggleTheme,
      stableAddCategory,
      stableDeleteCategory,
      stableUpdatePaymentSettings,
      stableUpdateOwnProfile,
      stableSetActiveTab,
      stableEnterDemo,
      stableLogin,
      stableRegister,
      stableLogout,
      stableCreateCashier,
      stableToggleCashierStatus,
      stableUpdateCashier,
      stableDeleteCashier,
      stableLoadSampleCatalog,
      stableAddProduct,
      stableUpdateProduct,
      stableDeleteProduct,
      stableAdjustStock,
      stableProcessSale,
      stableVoidTransaction,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
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
