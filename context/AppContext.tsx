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
  getOfflineSyncQueue,
  getStoredAccounts,
  getStoredCashiers,
  getStoredCustomCategories,
  getStoredPaymentSettings,
  getStoredProducts,
  getStoredSession,
  getStoredStockLogs,
  getStoredTheme,
  getStoredTransactions,
  hashPasswordSha256,
  OfflineSyncTask,
  removeStoredAccount,
  saveOfflineSyncQueue,
  saveStoredAccount,
  saveStoredCashiers,
  saveStoredCustomCategories,
  saveStoredPaymentSettings,
  saveStoredProducts,
  saveStoredSession,
  saveStoredStockLogs,
  saveStoredTheme,
  saveStoredTransactions,
  verifyPasswordHash,
} from '@/lib/storage';
import {
  CloudSyncResult,
  createCashierCloud,
  deleteCashierCloud,
  fetchCloudSnapshot,
  getSupabaseAccessToken,
  registerAdminCloud,
  setSupabaseAccessToken,
  signInSupabase,
  syncDeleteProduct,
  syncInsertStockLogs,
  syncInsertTransaction,
  syncUpdateProductStock,
  syncUpsertPaymentSettings,
  syncUpsertProduct,
  syncUpsertProducts,
  syncVoidTransaction,
  toggleCashierCloud,
  updateCashierCloud,
  updateOwnSupabaseAccount,
} from '@/lib/supabase';
import { INITIAL_PRODUCTS, INITIAL_STOCK_LOGS, INITIAL_TRANSACTIONS } from '@/lib/dummyData';
import { playCashierChime } from '@/lib/audio';
import { generateInvoiceNo } from '@/lib/format';
import { getRouteForTab, getTabFromPathname } from '@/lib/routes';

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
  pendingSyncCount: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  products: Product[];
  categories: string[];
  customCategories: string[];
  addCategory: (name: string) => ActionResult;
  deleteCategory: (name: string) => ActionResult;
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
  enterDemo: (role?: 'admin' | 'user') => void;
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
    amountPaid: number,
    customInvoiceNo?: string
  ) => { success: boolean; transaction?: Transaction; error?: string };
  voidTransaction: (transactionId: string, reason: string) => ActionResult;
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
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    getOfflineSyncQueue(user?.ownerId || '').length
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const executeCloudTask = useCallback(
    async (task: OfflineSyncTask, ownerId: string): Promise<CloudSyncResult> => {
      switch (task.type) {
        case 'upsert_product':
          return syncUpsertProduct(task.product, ownerId);
        case 'upsert_products':
          return syncUpsertProducts(task.products, ownerId);
        case 'update_stock':
          return syncUpdateProductStock(task.productId, task.stock, task.updatedAt);
        case 'delete_product':
          return syncDeleteProduct(task.productId);
        case 'insert_logs':
          return syncInsertStockLogs(task.logs, ownerId);
        case 'insert_transaction':
          return syncInsertTransaction(task.transaction, ownerId);
        case 'void_transaction':
          return syncVoidTransaction(task.transactionId, task.voidReason, task.voidedAt);
        case 'upsert_payment':
          return syncUpsertPaymentSettings(task.settings, ownerId);
      }
    },
    []
  );

  const dispatchCloudTask = useCallback(
    async (task: OfflineSyncTask, ownerId: string): Promise<CloudSyncResult> => {
      if (!ownerId || !getSupabaseAccessToken()) {
        return { ok: false, offline: true, error: 'Offline' };
      }

      const enqueue = () => {
        const existing = getOfflineSyncQueue(ownerId);
        const next = [...existing, task];
        saveOfflineSyncQueue(next, ownerId);
        setPendingSyncCount(next.length);
      };

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueue();
        setIsCloudConnected(false);
        return { ok: false, offline: true, error: 'Offline' };
      }

      const res = await executeCloudTask(task, ownerId);
      if (!res.ok && res.offline) {
        enqueue();
        setIsCloudConnected(false);
      }
      return res;
    },
    [executeCloudTask]
  );

  const flushAndHydrateFromCloud = useCallback(
    async (targetOwnerId: string): Promise<boolean> => {
      if (!targetOwnerId || !getSupabaseAccessToken()) return false;
      const queued = getOfflineSyncQueue(targetOwnerId);
      const remaining: OfflineSyncTask[] = [];
      let hitOffline = false;

      for (let i = 0; i < queued.length; i++) {
        const task = queued[i];
        if (hitOffline) {
          remaining.push(task);
          continue;
        }
        const res = await executeCloudTask(task, targetOwnerId);
        if (!res.ok && res.offline) {
          hitOffline = true;
          remaining.push(task);
        }
      }

      saveOfflineSyncQueue(remaining, targetOwnerId);
      if (getStoredSession()?.ownerId === targetOwnerId) {
        setPendingSyncCount(remaining.length);
      }
      if (remaining.length > 0) {
        setIsCloudConnected(false);
        return false;
      }

      const snapshot = await fetchCloudSnapshot();
      if (!snapshot.connected || getStoredSession()?.ownerId !== targetOwnerId) {
        setIsCloudConnected(false);
        return false;
      }
      setIsCloudConnected(true);
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
      } else {
        setPaymentSettings(getStoredPaymentSettings(targetOwnerId));
      }
      return true;
    },
    [executeCloudTask]
  );

  const hydrateTenantCache = (ownerId: string) => {
    setProducts(getStoredProducts(ownerId));
    setTransactions(getStoredTransactions(ownerId));
    setStockLogs(getStoredStockLogs(ownerId));
    setCashiers(getStoredCashiers(ownerId));
    setPaymentSettings(getStoredPaymentSettings(ownerId));
    setCustomCategories(getStoredCustomCategories(ownerId));
    setPendingSyncCount(getOfflineSyncQueue(ownerId).length);
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    const targetOwnerId = user.ownerId;
    (async () => {
      if (!active) return;
      await flushAndHydrateFromCloud(targetOwnerId);
    })();

    const handleOnline = () => {
      if (active) {
        void flushAndHydrateFromCloud(targetOwnerId);
      }
    };
    const handleOffline = () => {
      if (active) setIsCloudConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, flushAndHydrateFromCloud]);

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
    setIsCloudConnected(false);
    hydrateTenantCache(session.ownerId);
    saveStoredSession(session);
    writeStoredActiveTab(defaultTab);
    setUser(session);
    setActiveTabState(defaultTab);
  };

  const activateBuiltInDemo = (role: 'admin' | 'user' = 'admin'): 'admin' | 'user' => {
    const DEMO_OWNER_ID = 'demo-store-sip-barang';
    const nowIso = new Date().toISOString();
    const isDemoAdmin = role === 'admin';

    if (getStoredProducts(DEMO_OWNER_ID).length === 0) {
      const seededProducts: Product[] = INITIAL_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `demo-prd-${idx + 1}`,
        ownerId: DEMO_OWNER_ID,
        updatedAt: nowIso,
      }));
      saveStoredProducts(seededProducts, DEMO_OWNER_ID);
    }

    if (getStoredTransactions(DEMO_OWNER_ID).length === 0) {
      const buyPriceById = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p.buyPrice]));
      const productIndexById = new Map(INITIAL_PRODUCTS.map((p, idx) => [p.id, idx + 1]));
      const seededTransactions: Transaction[] = INITIAL_TRANSACTIONS.map((trx, idx) => ({
        ...trx,
        id: `demo-trx-${idx + 1}`,
        ownerId: DEMO_OWNER_ID,
        items: trx.items.map((item) => {
          const matchedIndex = productIndexById.get(item.productId);
          return {
            ...item,
            productId: matchedIndex ? `demo-prd-${matchedIndex}` : item.productId,
            buyPrice: item.buyPrice ?? buyPriceById.get(item.productId),
          };
        }),
      }));
      saveStoredTransactions(seededTransactions, DEMO_OWNER_ID);
    }

    if (getStoredStockLogs(DEMO_OWNER_ID).length === 0) {
      const productIndexById = new Map(INITIAL_PRODUCTS.map((p, idx) => [p.id, idx + 1]));
      const seededLogs: StockLog[] = INITIAL_STOCK_LOGS.map((log, idx) => {
        const matchedIndex = productIndexById.get(log.productId);
        return {
          ...log,
          id: `demo-log-${idx + 1}`,
          ownerId: DEMO_OWNER_ID,
          productId: matchedIndex ? `demo-prd-${matchedIndex}` : log.productId,
        };
      });
      saveStoredStockLogs(seededLogs, DEMO_OWNER_ID);
    }

    if (getStoredCashiers(DEMO_OWNER_ID).length === 0) {
      saveStoredCashiers(
        [
          {
            id: 'demo-cashier-01',
            ownerId: DEMO_OWNER_ID,
            email: 'kasir@sipb.web.id',
            name: 'Budi Santoso (Kasir Demo)',
            isActive: true,
            createdAt: nowIso,
          },
        ],
        DEMO_OWNER_ID
      );
    }

    const demoSession: UserSession = {
      id: isDemoAdmin ? DEMO_OWNER_ID : 'demo-cashier-01',
      ownerId: DEMO_OWNER_ID,
      email: isDemoAdmin ? 'admin@sipb.web.id' : 'kasir@sipb.web.id',
      name: isDemoAdmin ? 'Administrator Toko Demo' : 'Budi Santoso (Kasir Demo)',
      role: isDemoAdmin ? 'admin' : 'user',
      loginAt: nowIso,
    };
    activateSession(demoSession);
    return demoSession.role;
  };

  const enterDemo = (role: 'admin' | 'user' = 'admin') => {
    setSupabaseAccessToken(null);
    activateBuiltInDemo(role);
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

    // Authenticate against Supabase Cloud Auth
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

    // 3. Built-in Demo Accounts (for evaluation / testing as documented in README.md)
    if (
      (cleanEmail === 'admin@sipb.web.id' && pass === 'admin123') ||
      (cleanEmail === 'kasir@sipb.web.id' && pass === 'kasir123')
    ) {
      const demoRole = activateBuiltInDemo(
        cleanEmail === 'admin@sipb.web.id' ? 'admin' : 'user'
      );
      return { success: true, role: demoRole };
    }

    // 4. Offline fallback ONLY when offline or for offline-created local accounts
    const storedMatch = getStoredAccounts().find(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (storedMatch && (await verifyPasswordHash(pass, storedMatch.password))) {
      if (storedMatch.isActive === false) {
        return {
          success: false,
          message: 'Akun kasir sedang dinonaktifkan oleh Administrator.',
        };
      }
      const session: UserSession = {
        id: storedMatch.id,
        ownerId: storedMatch.ownerId,
        email: storedMatch.email.toLowerCase(),
        name: storedMatch.name,
        role: storedMatch.role,
        loginAt: new Date().toISOString(),
      };
      activateSession(session);
      return { success: true, role: session.role };
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

    // Always register self-signup users as Administrator of their own isolated store
    const cloudReg = await registerAdminCloud(cleanName, cleanEmail, pass);
    if (cloudReg.ok && cloudReg.user) {
      await signInSupabase(cleanEmail, pass);
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

    if (!cloudReg.offline) {
      return {
        success: false,
        message: cloudReg.error || 'Pendaftaran gagal. Gunakan email lain atau silakan masuk.',
      };
    }

    // Offline fallback
    if (getStoredAccounts().some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Alamat email ini sudah terdaftar. Silakan masuk.' };
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `adm-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const hashedPassword = await hashPasswordSha256(pass);

    saveStoredAccount({
      id: newId,
      ownerId: newId,
      email: cleanEmail,
      name: cleanName,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: nowIso,
    });

    activateSession({
      id: newId,
      ownerId: newId,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      loginAt: nowIso,
    });
    return { success: true, role: 'admin' };
  };

  const logout = () => {
    setUser(null);
    setIsCloudConnected(false);
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
    if (cloudRes.ok && cloudRes.cashier) {
      const updated = [cloudRes.cashier, ...cashiers.filter((c) => c.id !== cloudRes.cashier!.id)];
      setCashiers(updated);
      saveStoredCashiers(updated, user.ownerId);
      return { success: true };
    }

    if (!cloudRes.offline) {
      return { success: false, error: cloudRes.error || 'Gagal membuat akun kasir.' };
    }

    if (
      cashiers.some((c) => c.email.toLowerCase() === cleanEmail) ||
      getStoredAccounts().some((a) => a.email.toLowerCase() === cleanEmail)
    ) {
      return { success: false, error: 'Email kasir sudah digunakan.' };
    }

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `kasir-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const newCashier: CashierAccount = {
      id,
      ownerId: user.ownerId,
      email: cleanEmail,
      name: cleanName,
      isActive: true,
      createdAt: nowIso,
    };

    const hashedPassword = await hashPasswordSha256(password);

    saveStoredAccount({
      id,
      ownerId: user.ownerId,
      email: cleanEmail,
      name: cleanName,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      createdAt: nowIso,
    });
    const updated = [newCashier, ...cashiers];
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);
    return { success: true };
  };

  const toggleCashierStatus = async (
    cashierId: string,
    isActive: boolean
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

    const cloudRes = await toggleCashierCloud(cashierId, isActive);
    if (!cloudRes.ok && !cloudRes.offline) {
      return { success: false, error: cloudRes.error || 'Gagal mengubah status kasir.' };
    }

    const updated = cashiers.map((c) => (c.id === cashierId ? { ...c, isActive } : c));
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);

    const localAcc = getStoredAccounts().find((a) => a.id === cashierId);
    if (localAcc) {
      saveStoredAccount({ ...localAcc, isActive });
    }
    return { success: true };
  };

  const updateCashier = async (
    cashierId: string,
    patch: { name?: string; password?: string }
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
    if (!cloudRes.ok && !cloudRes.offline) {
      return { success: false, error: cloudRes.error || 'Gagal memperbarui akun kasir.' };
    }

    if (cleanName) {
      const updated = cashiers.map((c) =>
        c.id === cashierId ? { ...c, name: cleanName } : c
      );
      setCashiers(updated);
      saveStoredCashiers(updated, user.ownerId);
    }
    const localAcc = getStoredAccounts().find((a) => a.id === cashierId);
    if (localAcc) {
      const nextHashedPass = cleanPass
        ? await hashPasswordSha256(cleanPass)
        : localAcc.password;
      saveStoredAccount({
        ...localAcc,
        name: cleanName || localAcc.name,
        password: nextHashedPass,
      });
    }
    return { success: true };
  };

  const deleteCashier = async (cashierId: string): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

    const cloudRes = await deleteCashierCloud(cashierId);
    if (!cloudRes.ok && !cloudRes.offline) {
      return { success: false, error: cloudRes.error || 'Gagal menghapus akun kasir.' };
    }

    const updated = cashiers.filter((c) => c.id !== cashierId);
    setCashiers(updated);
    saveStoredCashiers(updated, user.ownerId);
    removeStoredAccount(cashierId);
    return { success: true };
  };

  const loadSampleCatalog = async (): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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

    setProducts(sampleProducts);
    saveStoredProducts(sampleProducts, user.ownerId);

    await dispatchCloudTask({ id: makeId('sync'), type: 'upsert_products', products: sampleProducts }, user.ownerId);

    return { success: true };
  };

  const addProduct = (newProdData: Omit<Product, 'id' | 'updatedAt'>): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
      ownerId: user.ownerId,
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

    const updated = [newProduct, ...products];
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);

    const initialLog: StockLog | null =
      newProduct.stock > 0
        ? {
            id: makeId('log'),
            ownerId: user.ownerId,
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
      const updatedLogs = [initialLog, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
    }

    void dispatchCloudTask({ id: makeId('sync'), type: 'upsert_product', product: newProduct }, user.ownerId).then((res) => {
      if (initialLog) {
        if (res.ok || res.offline) {
          void dispatchCloudTask({ id: makeId('sync'), type: 'insert_logs', logs: [initialLog] }, user.ownerId);
        }
      }
    });

    return { success: true };
  };

  const updateProduct = (updatedProd: Product): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
      ownerId: user.ownerId,
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
    saveStoredProducts(updated, user.ownerId);

    let editLog: StockLog | null = null;
    if (existing.stock !== sanitized.stock) {
      const diff = Math.abs(sanitized.stock - existing.stock);
      editLog = {
        id: makeId('log'),
        ownerId: user.ownerId,
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
      const updatedLogs = [editLog, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
    }

    const ownerId = user.ownerId;
    void dispatchCloudTask({ id: makeId('sync'), type: 'upsert_product', product: sanitized }, ownerId).then((res) => {
      if (editLog && (res.ok || res.offline)) {
        void dispatchCloudTask({ id: makeId('sync'), type: 'insert_logs', logs: [editLog] }, ownerId);
      }
    });

    return { success: true };
  };

  const deleteProduct = (productId: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);
    void dispatchCloudTask({ id: makeId('sync'), type: 'delete_product', productId }, user.ownerId);
    return { success: true };
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string
  ): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
      if (cleanQty === previousStock) {
        return {
          success: false,
          error: `Stok saat ini sudah ${previousStock} ${prod.unit}. Ubah nilai untuk melakukan opname.`,
        };
      }
      newStock = Math.max(0, cleanQty);
    }

    const updatedProd: Product = {
      ...prod,
      ownerId: user.ownerId,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    };
    const updated = products.map((p) => (p.id === productId ? updatedProd : p));
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);

    const log: StockLog = {
      id: makeId('log'),
      ownerId: user.ownerId,
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: type === 'ADJUSTMENT' ? Math.abs(newStock - previousStock) : cleanQty,
      previousStock,
      newStock,
      reason:
        reason.trim() ||
        (type === 'IN'
          ? 'Restock barang masuk'
          : type === 'OUT'
            ? 'Pengurangan stok rusak/hilang'
            : 'Stok opname fisik gudang'),
      createdAt: new Date().toISOString(),
      operator: user.email,
    };
    const updatedLogs = [log, ...stockLogs];
    setStockLogs(updatedLogs);
    saveStoredStockLogs(updatedLogs, user.ownerId);

    const ownerId = user.ownerId;
    void dispatchCloudTask({ id: makeId('sync'), type: 'upsert_product', product: updatedProd }, ownerId).then((res) => {
      if (res.ok || res.offline) {
        void dispatchCloudTask({ id: makeId('sync'), type: 'insert_logs', logs: [log] }, ownerId);
      }
    });

    return { success: true };
  };

  const processSale = (
    cartItems: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    discount: number,
    amountPaid: number,
    customInvoiceNo?: string
  ) => {
    if (!user) {
      return { success: false, error: 'Sesi pengguna tidak ditemukan. Silakan masuk kembali.' };
    }
    if (!cartItems.length) {
      return { success: false, error: 'Keranjang belanja masih kosong.' };
    }

    // Build O(1) lookup Map for products and aggregate quantities
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
    const transactionItems = cartItems.map((item) => {
      const prod = productById.get(item.productId)!;
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
    const cleanInvoiceNo = customInvoiceNo?.trim();
    const invoiceNo =
      cleanInvoiceNo && /^TRX-[A-Z0-9\-]{6,30}$/.test(cleanInvoiceNo)
        ? cleanInvoiceNo
        : generateInvoiceNo(user.ownerId);

    const newTransaction: Transaction = {
      id: makeId('trx'),
      ownerId: user.ownerId,
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
    const stockSyncQueue: Array<{ id: string; stock: number; updatedAt: string }> = [];

    const updatedProducts = products.map((p) => {
      const deductQty = cartQtyById.get(p.id);
      if (deductQty && deductQty > 0) {
        const newStock = p.stock - deductQty;
        const updatedAt = now.toISOString();
        saleLogs.push({
          id: makeId('log'),
          ownerId: user.ownerId,
          productId: p.id,
          productName: p.name,
          type: 'OUT',
          quantity: deductQty,
          previousStock: p.stock,
          newStock,
          reason: `Penjualan Kasir (${invoiceNo})`,
          createdAt: updatedAt,
          operator: user.email,
        });
        stockSyncQueue.push({ id: p.id, stock: newStock, updatedAt });
        return {
          ...p,
          stock: newStock,
          updatedAt,
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts, user.ownerId);

    // Concurrently dispatch stock updates with offline queue fallback
    if (stockSyncQueue.length > 0) {
      void Promise.allSettled(
        stockSyncQueue.map((item) =>
          dispatchCloudTask(
            { id: makeId('sync'), type: 'update_stock', productId: item.id, stock: item.stock, updatedAt: item.updatedAt },
            user.ownerId
          )
        )
      );
    }

    if (saleLogs.length > 0) {
      const updatedLogs = [...saleLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
      void dispatchCloudTask({ id: makeId('sync'), type: 'insert_logs', logs: saleLogs }, user.ownerId);
    }

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, user.ownerId);
    void dispatchCloudTask({ id: makeId('sync'), type: 'insert_transaction', transaction: newTransaction }, user.ownerId);

    playCashierChime();

    return { success: true, transaction: newTransaction };
  };

  const voidTransaction = (transactionId: string, reason: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
    const voidStockSyncQueue: Array<{ id: string; stock: number; updatedAt: string }> = [];

    const itemQtyByProduct = new Map<string, number>();
    for (const item of targetTrx.items) {
      itemQtyByProduct.set(
        item.productId,
        (itemQtyByProduct.get(item.productId) || 0) + item.quantity
      );
    }

    const updatedProducts = products.map((p) => {
      const returnQty = itemQtyByProduct.get(p.id);
      if (returnQty && returnQty > 0) {
        const newStock = p.stock + returnQty;
        voidLogs.push({
          id: makeId('log-void'),
          ownerId: user.ownerId,
          productId: p.id,
          productName: p.name,
          type: 'IN',
          quantity: returnQty,
          previousStock: p.stock,
          newStock,
          reason: `Void Nota ${targetTrx.invoiceNo}: ${cleanReason}`,
          createdAt: nowIso,
          operator: user.email,
        });
        voidStockSyncQueue.push({ id: p.id, stock: newStock, updatedAt: nowIso });
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
    saveStoredProducts(updatedProducts, user.ownerId);
    if (voidStockSyncQueue.length > 0) {
      void Promise.allSettled(
        voidStockSyncQueue.map((item) =>
          dispatchCloudTask(
            { id: makeId('sync'), type: 'update_stock', productId: item.id, stock: item.stock, updatedAt: item.updatedAt },
            user.ownerId
          )
        )
      );
    }

    if (voidLogs.length > 0) {
      const updatedLogs = [...voidLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
      void dispatchCloudTask({ id: makeId('sync'), type: 'insert_logs', logs: voidLogs }, user.ownerId);
    }

    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, user.ownerId);
    void dispatchCloudTask(
      { id: makeId('sync'), type: 'void_transaction', transactionId, voidReason: cleanReason, voidedAt: nowIso },
      user.ownerId
    );

    return { success: true };
  };

  const updatePaymentSettings = async (
    patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>
  ): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

    const base = paymentSettings.ownerId === user.ownerId
      ? paymentSettings
      : getDefaultStorePaymentSettings(user.ownerId);

    const nextSettings: StorePaymentSettings = {
      ...base,
      ...patch,
      ownerId: user.ownerId,
      updatedAt: new Date().toISOString(),
    };

    setPaymentSettings(nextSettings);
    saveStoredPaymentSettings(nextSettings, user.ownerId);

    const syncRes = await dispatchCloudTask(
      { id: makeId('sync'), type: 'upsert_payment', settings: nextSettings },
      user.ownerId
    );
    if (!syncRes.ok && !syncRes.offline) {
      return { success: false, error: syncRes.error || 'Gagal menyinkronkan pengaturan ke cloud.' };
    }

    return { success: true };
  };

  const updateOwnProfile = async (patch: {
    name?: string;
    password?: string;
  }): Promise<ActionResult> => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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

    if (getSupabaseAccessToken()) {
      const cloudRes = await updateOwnSupabaseAccount({
        ...(cleanName ? { name: cleanName } : {}),
        ...(nextPassword ? { password: nextPassword } : {}),
      });
      if (!cloudRes.ok && !cloudRes.offline) {
        return { success: false, error: cloudRes.error || 'Gagal memperbarui profil akun.' };
      }
    }

    const localAcc = getStoredAccounts().find(
      (a) => a.email.toLowerCase() === user.email.toLowerCase()
    );
    if (localAcc) {
      const nextPass = nextPassword
        ? await hashPasswordSha256(nextPassword)
        : localAcc.password;
      saveStoredAccount({
        ...localAcc,
        name: cleanName || localAcc.name,
        password: nextPass,
      });
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

  const addCategory = (rawName: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
    setCustomCategories(updated);
    saveStoredCustomCategories(updated, user.ownerId);
    return { success: true };
  };

  const deleteCategory = (targetName: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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
    setCustomCategories(updated);
    saveStoredCustomCategories(updated, user.ownerId);
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
      pendingSyncCount: isInitialized ? pendingSyncCount : 0,
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
      pendingSyncCount,
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
