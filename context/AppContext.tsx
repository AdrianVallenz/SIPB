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
import {
  CashierAccount,
  PaymentMethod,
  Product,
  StockLog,
  StorePaymentSettings,
  Transaction,
  UserSession,
} from '@/lib/types';
import {
  DEMO_ACCOUNTS,
  DEMO_OWNER_ID,
  getDefaultStorePaymentSettings,
  getStoredAccounts,
  getStoredCashiers,
  getStoredPaymentSettings,
  getStoredProducts,
  getStoredSession,
  getStoredStockLogs,
  getStoredTheme,
  getStoredTransactions,
  removeStoredAccount,
  saveStoredAccount,
  saveStoredCashiers,
  saveStoredPaymentSettings,
  saveStoredProducts,
  saveStoredSession,
  saveStoredStockLogs,
  saveStoredTheme,
  saveStoredTransactions,
} from '@/lib/storage';
import {
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
} from '@/lib/supabase';
import { INITIAL_PRODUCTS, INITIAL_STOCK_LOGS, INITIAL_TRANSACTIONS } from '@/lib/dummyData';
import { playCashierChime } from '@/lib/audio';
import { generateInvoiceNo } from '@/lib/format';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AppContextType {
  user: UserSession | null;
  isHydrated: boolean;
  isCloudConnected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  products: Product[];
  transactions: Transaction[];
  stockLogs: StockLog[];
  cashiers: CashierAccount[];
  paymentSettings: StorePaymentSettings;
  updatePaymentSettings: (
    patch: Partial<Omit<StorePaymentSettings, 'ownerId' | 'updatedAt'>>
  ) => Promise<ActionResult>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
const SSR_EMPTY_CASHIERS: CashierAccount[] = [];
const SSR_DEFAULT_PAYMENT_SETTINGS: StorePaymentSettings =
  getDefaultStorePaymentSettings(DEMO_OWNER_ID);

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

  const [user, setUser] = useState<UserSession | null>(() => getStoredSession());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());
  const [products, setProducts] = useState<Product[]>(() =>
    getStoredProducts(getStoredSession()?.ownerId || DEMO_OWNER_ID)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getStoredTransactions(getStoredSession()?.ownerId || DEMO_OWNER_ID)
  );
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() =>
    getStoredStockLogs(getStoredSession()?.ownerId || DEMO_OWNER_ID)
  );
  const [cashiers, setCashiers] = useState<CashierAccount[]>(() =>
    getStoredCashiers(getStoredSession()?.ownerId || DEMO_OWNER_ID)
  );
  const [paymentSettings, setPaymentSettings] = useState<StorePaymentSettings>(() =>
    getStoredPaymentSettings(getStoredSession()?.ownerId || DEMO_OWNER_ID)
  );
  const [activeTab, setActiveTabState] = useState<string>(() =>
    readStoredActiveTab(getStoredSession())
  );
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  const pendingDemoAuthRef = useRef<{
    email: string;
    promise: ReturnType<typeof signInSupabase>;
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const hydrateTenantCache = (ownerId: string) => {
    setProducts(getStoredProducts(ownerId));
    setTransactions(getStoredTransactions(ownerId));
    setStockLogs(getStoredStockLogs(ownerId));
    setCashiers(getStoredCashiers(ownerId));
    setPaymentSettings(getStoredPaymentSettings(ownerId));
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    const targetOwnerId = user.ownerId;
    (async () => {
      // Await inflight demo sign-in triggered by fast-path login so we never fire duplicate auth requests
      const inflight = pendingDemoAuthRef.current;
      if (!getSupabaseAccessToken() && inflight && inflight.email === user.email) {
        await inflight.promise;
        if (pendingDemoAuthRef.current === inflight) {
          pendingDemoAuthRef.current = null;
        }
      }
      if (!active) return;

      let snapshot = await fetchCloudSnapshot();
      if (
        !snapshot.connected &&
        !getSupabaseAccessToken() &&
        (user.email === 'admin@sip.com' || user.email === 'user@sip.com')
      ) {
        const authRes = await signInSupabase(user.email, '12345678');
        if (authRes.accessToken) {
          snapshot = await fetchCloudSnapshot(authRes.accessToken);
        }
      }
      if (!active || !snapshot.connected || getStoredSession()?.ownerId !== targetOwnerId) return;
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
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const setActiveTab = (tab: string) => {
    const activeUser = user || getStoredSession();
    if (!activeUser) return;
    if (activeUser.role === 'admin' && ADMIN_TABS.has(tab)) {
      setActiveTabState(tab);
      writeStoredActiveTab(tab);
    } else if (activeUser.role === 'user' && USER_TABS.has(tab)) {
      setActiveTabState(tab);
      writeStoredActiveTab(tab);
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

    // 1. Instant fast-path for built-in demo credentials + single-flight background Supabase auth
    const demoAccount = DEMO_ACCOUNTS[cleanEmail];
    if (demoAccount && pass === '12345678') {
      const session: UserSession = {
        id: demoAccount.id,
        ownerId: demoAccount.ownerId,
        email: cleanEmail,
        name: demoAccount.name,
        role: demoAccount.role,
        loginAt: new Date().toISOString(),
      };
      setSupabaseAccessToken(null);
      pendingDemoAuthRef.current = {
        email: cleanEmail,
        promise: signInSupabase(cleanEmail, pass),
      };
      activateSession(session);
      return { success: true };
    }

    // 2. Authenticate against Supabase Cloud Auth
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
      return { success: true };
    }

    // 3. Offline fallback ONLY when offline or for offline-created local accounts
    if (authRes.offline) {
      const customAcc = getStoredAccounts().find(
        (a) => a.email.toLowerCase() === cleanEmail && a.password === pass
      );
      if (customAcc) {
        if (customAcc.isActive === false) {
          return {
            success: false,
            message: 'Akun kasir sedang dinonaktifkan oleh Administrator.',
          };
        }
        const session: UserSession = {
          id: customAcc.id,
          ownerId: customAcc.ownerId,
          email: customAcc.email.toLowerCase(),
          name: customAcc.name,
          role: customAcc.role,
          loginAt: new Date().toISOString(),
        };
        activateSession(session);
        return { success: true };
      }
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
    if (cleanEmail === 'admin@sip.com' || cleanEmail === 'user@sip.com') {
      return { success: false, message: 'Email ini sudah terdaftar sebagai akun demo sistem.' };
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
      return { success: true };
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

    saveStoredAccount({
      id: newId,
      ownerId: newId,
      email: cleanEmail,
      name: cleanName,
      password: pass,
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
    return { success: true };
  };

  const logout = () => {
    pendingDemoAuthRef.current = null;
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
    hydrateTenantCache(DEMO_OWNER_ID);
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
    if (cleanEmail === 'admin@sip.com' || cleanEmail === 'user@sip.com') {
      return { success: false, error: 'Email tersebut reserved untuk akun demo sistem.' };
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

    saveStoredAccount({
      id,
      ownerId: user.ownerId,
      email: cleanEmail,
      name: cleanName,
      password,
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
      saveStoredAccount({
        ...localAcc,
        name: cleanName || localAcc.name,
        password: cleanPass || localAcc.password,
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

    await syncUpsertProducts(sampleProducts, user.ownerId);

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

    void syncUpsertProduct(newProduct, user.ownerId).then((res) => {
      if (res.ok && initialLog) {
        void syncInsertStockLogs([initialLog], user.ownerId);
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
    void syncUpsertProduct(sanitized, user.ownerId);

    if (existing.stock !== sanitized.stock) {
      const diff = Math.abs(sanitized.stock - existing.stock);
      const log: StockLog = {
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
      const updatedLogs = [log, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
      void syncInsertStockLogs([log], user.ownerId);
    }

    return { success: true };
  };

  const deleteProduct = (productId: string): ActionResult => {
    const authErr = requireAdmin();
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);
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
    if (authErr || !user) return authErr || { success: false, error: 'Sesi tidak valid.' };

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

    const updatedProd: Product = {
      ...prod,
      ownerId: user.ownerId,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    };
    const updated = products.map((p) => (p.id === productId ? updatedProd : p));
    setProducts(updated);
    saveStoredProducts(updated, user.ownerId);
    void syncUpsertProduct(updatedProd, user.ownerId);

    const log: StockLog = {
      id: makeId('log'),
      ownerId: user.ownerId,
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: cleanQty,
      previousStock,
      newStock,
      reason: reason.trim() || (type === 'IN' ? 'Restock barang masuk' : 'Penyesuaian stok gudang'),
      createdAt: new Date().toISOString(),
      operator: user.email,
    };
    const updatedLogs = [log, ...stockLogs];
    setStockLogs(updatedLogs);
    saveStoredStockLogs(updatedLogs, user.ownerId);
    void syncInsertStockLogs([log], user.ownerId);

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
    const updatedProducts = products.map((p) => {
      const cartItem = cartItems.find((ci) => ci.productId === p.id);
      if (cartItem) {
        const qty = Math.floor(cartItem.quantity);
        const newStock = p.stock - qty;
        saleLogs.push({
          id: makeId('log'),
          ownerId: user.ownerId,
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
    saveStoredProducts(updatedProducts, user.ownerId);

    // Use PATCH for stock updates so Cashier RLS succeeds without Admin INSERT privileges
    for (const ci of cartItems) {
      const changedProd = updatedProducts.find((p) => p.id === ci.productId);
      if (changedProd) {
        void syncUpdateProductStock(changedProd.id, changedProd.stock, changedProd.updatedAt);
      }
    }

    if (saleLogs.length > 0) {
      const updatedLogs = [...saleLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
      void syncInsertStockLogs(saleLogs, user.ownerId);
    }

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, user.ownerId);
    void syncInsertTransaction(newTransaction, user.ownerId);

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
    for (const [prodId] of itemQtyByProduct) {
      const changedProd = updatedProducts.find((p) => p.id === prodId);
      if (changedProd) {
        void syncUpdateProductStock(changedProd.id, changedProd.stock, changedProd.updatedAt);
      }
    }

    if (voidLogs.length > 0) {
      const updatedLogs = [...voidLogs, ...stockLogs];
      setStockLogs(updatedLogs);
      saveStoredStockLogs(updatedLogs, user.ownerId);
      void syncInsertStockLogs(voidLogs, user.ownerId);
    }

    setTransactions(updatedTransactions);
    saveStoredTransactions(updatedTransactions, user.ownerId);
    void syncVoidTransaction(transactionId, cleanReason, nowIso);

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

    const syncRes = await syncUpsertPaymentSettings(nextSettings, user.ownerId);
    if (!syncRes.ok && syncRes.error !== 'Offline') {
      return { success: false, error: syncRes.error || 'Gagal menyinkronkan pengaturan ke cloud.' };
    }

    return { success: true };
  };

  // Sinkronkan ref aksi setelah commit agar value Provider stabil di memo tanpa stale closure
  const actionsRef = useRef({
    toggleTheme,
    setActiveTab,
    login,
    register,
    logout,
    createCashier,
    toggleCashierStatus,
    updateCashier,
    deleteCashier,
    loadSampleCatalog,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    processSale,
    voidTransaction,
    updatePaymentSettings,
  });

  useEffect(() => {
    actionsRef.current = {
      toggleTheme,
      setActiveTab,
      login,
      register,
      logout,
      createCashier,
      toggleCashierStatus,
      updateCashier,
      deleteCashier,
      loadSampleCatalog,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      processSale,
      voidTransaction,
      updatePaymentSettings,
    };
  });

  const stableToggleTheme = useCallback(() => actionsRef.current.toggleTheme(), []);
  const stableSetActiveTab = useCallback((tab: string) => actionsRef.current.setActiveTab(tab), []);
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

  // Gunakan nilai deterministik saat SSR agar Landing HTML utuh tanpa hydration mismatch
  const contextValue = useMemo<AppContextType>(
    () => ({
      user: isInitialized ? user : null,
      isHydrated: isInitialized,
      isCloudConnected: isInitialized ? isCloudConnected : false,
      theme: isInitialized ? theme : 'dark',
      toggleTheme: stableToggleTheme,
      products: isInitialized ? products : INITIAL_PRODUCTS,
      transactions: isInitialized ? transactions : INITIAL_TRANSACTIONS,
      stockLogs: isInitialized ? stockLogs : INITIAL_STOCK_LOGS,
      cashiers: isInitialized ? cashiers : SSR_EMPTY_CASHIERS,
      paymentSettings: isInitialized ? paymentSettings : SSR_DEFAULT_PAYMENT_SETTINGS,
      updatePaymentSettings: stableUpdatePaymentSettings,
      activeTab: isInitialized ? activeTab : 'pos',
      setActiveTab: stableSetActiveTab,
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
      theme,
      products,
      transactions,
      stockLogs,
      cashiers,
      paymentSettings,
      activeTab,
      stableToggleTheme,
      stableUpdatePaymentSettings,
      stableSetActiveTab,
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
