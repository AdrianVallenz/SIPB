import {
  Product,
  Transaction,
  StockLog,
  UserSession,
  CashierAccount,
  StorePaymentSettings,
} from './types';

const STORAGE_KEYS = {
  PRODUCTS: 'sip_products_v2',
  TRANSACTIONS: 'sip_transactions_v2',
  STOCK_LOGS: 'sip_stock_logs_v2',
  CASHIERS: 'sip_cashiers_v2',
  PAYMENT_SETTINGS: 'sip_payment_settings_v1',
  CUSTOM_CATEGORIES: 'sip_custom_categories_v1',
  SESSION: 'sip_session_v2',
  THEME: 'sip_theme_v1',
} as const;

const LEGACY_OFFLINE_KEYS = [
  'sip_offline_queue_v1',
  'sip_registered_accounts_v2',
] as const;

const tenantKey = (base: string, ownerId: string) => `${base}_${ownerId}`;

// 12 hours max session duration (1 cashier shift)
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const LEGACY_DEMO_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'demo-store-sip-barang',
]);
const LEGACY_DEMO_EMAILS = new Set(['admin@sip.com', 'user@sip.com']);

const isValidProduct = (item: unknown): item is Product => {
  if (!item || typeof item !== 'object') return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.sku === 'string' &&
    typeof p.name === 'string' &&
    typeof p.buyPrice === 'number' &&
    Number.isFinite(p.buyPrice) &&
    typeof p.sellPrice === 'number' &&
    Number.isFinite(p.sellPrice) &&
    typeof p.stock === 'number' &&
    Number.isFinite(p.stock)
  );
};

export const getStoredProducts = (ownerId: string = ''): Product[] => {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const key = tenantKey(STORAGE_KEYS.PRODUCTS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidProduct)) {
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read products from storage', err);
    return [];
  }
};

export const saveStoredProducts = (products: Product[], ownerId: string = ''): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(tenantKey(STORAGE_KEYS.PRODUCTS, ownerId), JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products to storage', err);
  }
};

export const getStoredTransactions = (ownerId: string = ''): Transaction[] => {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const key = tenantKey(STORAGE_KEYS.TRANSACTIONS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (t) =>
          t &&
          typeof t === 'object' &&
          typeof t.id === 'string' &&
          typeof t.invoiceNo === 'string' &&
          typeof t.total === 'number' &&
          Array.isArray(t.items)
      )
    ) {
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read transactions from storage', err);
    return [];
  }
};

export const saveStoredTransactions = (
  transactions: Transaction[],
  ownerId: string = ''
): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      tenantKey(STORAGE_KEYS.TRANSACTIONS, ownerId),
      JSON.stringify(transactions)
    );
  } catch (err) {
    console.error('Failed to save transactions to storage', err);
  }
};

export const getStoredStockLogs = (ownerId: string = ''): StockLog[] => {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const key = tenantKey(STORAGE_KEYS.STOCK_LOGS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (l) =>
          l && typeof l === 'object' && typeof l.id === 'string' && typeof l.productName === 'string'
      )
    ) {
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read stock logs from storage', err);
    return [];
  }
};

export const saveStoredStockLogs = (logs: StockLog[], ownerId: string = ''): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(tenantKey(STORAGE_KEYS.STOCK_LOGS, ownerId), JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save stock logs to storage', err);
  }
};

export const getStoredCashiers = (ownerId: string = ''): CashierAccount[] => {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const key = tenantKey(STORAGE_KEYS.CASHIERS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof c.id === 'string' &&
        typeof c.email === 'string' &&
        typeof c.name === 'string'
    );
  } catch {
    return [];
  }
};

export const saveStoredCashiers = (
  cashiers: CashierAccount[],
  ownerId: string = ''
): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(tenantKey(STORAGE_KEYS.CASHIERS, ownerId), JSON.stringify(cashiers));
  } catch (err) {
    console.error('Failed to save cashiers to storage', err);
  }
};

export const getStoredSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      typeof parsed.ownerId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'user')
    ) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }

    const emailLower = parsed.email.toLowerCase();
    for (const legacyKey of LEGACY_OFFLINE_KEYS) {
      localStorage.removeItem(legacyKey);
    }

    const hasCloudTokens = Boolean(
      localStorage.getItem('sip_supabase_token_v1') ||
        localStorage.getItem('sip_supabase_refresh_v1')
    );
    if (
      !hasCloudTokens ||
      LEGACY_DEMO_IDS.has(parsed.id) ||
      LEGACY_DEMO_IDS.has(parsed.ownerId) ||
      LEGACY_DEMO_EMAILS.has(emailLower)
    ) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }

    // Check session expiration (TTL)
    const loginTime = typeof parsed.loginAt === 'string' ? new Date(parsed.loginAt).getTime() : NaN;
    if (Number.isNaN(loginTime) || Date.now() - loginTime > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }

    return {
      id: parsed.id,
      ownerId: parsed.ownerId,
      email: emailLower,
      name: parsed.name,
      role: parsed.role,
      loginAt: parsed.loginAt!,
    };
  } catch (err) {
    console.error('Failed to read session from storage', err);
    return null;
  }
};

export const saveStoredSession = (session: UserSession | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Failed to save session to storage', err);
  }
};

export const getStoredTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (raw === 'light' || raw === 'dark') return raw;
    return 'dark';
  } catch {
    return 'dark';
  }
};

export const saveStoredTheme = (theme: 'dark' | 'light'): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.error('Failed to save theme to storage', err);
  }
};

export const getDefaultStorePaymentSettings = (
  ownerId: string = ''
): StorePaymentSettings => ({
  ownerId,
  qrisPayload: '',
  qrisImageData: '',
  qrisMerchantName: '',
  qrisNmid: '',
  qrisTheme: 'classic',
  qrisCustomNote: '',
  showQrisOnReceipt: true,
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  storeName: '',
  storeTagline: '',
  storeAddress: '',
  storePhone: '',
  receiptFooter: '',
  paperWidth: '58mm',
  customCategories: [],
  updatedAt: '',
});

export const getStoredPaymentSettings = (
  ownerId: string = ''
): StorePaymentSettings => {
  const defaults = getDefaultStorePaymentSettings(ownerId);
  if (!ownerId || typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(tenantKey(STORAGE_KEYS.PAYMENT_SETTINGS, ownerId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StorePaymentSettings>;
    if (!parsed || typeof parsed !== 'object') return defaults;
    const validTheme =
      parsed.qrisTheme === 'ocean' ||
      parsed.qrisTheme === 'emerald' ||
      parsed.qrisTheme === 'dark'
        ? parsed.qrisTheme
        : 'classic';
    return {
      ownerId,
      qrisPayload: typeof parsed.qrisPayload === 'string' ? parsed.qrisPayload : '',
      qrisImageData: typeof parsed.qrisImageData === 'string' ? parsed.qrisImageData : '',
      qrisMerchantName:
        typeof parsed.qrisMerchantName === 'string' ? parsed.qrisMerchantName : '',
      qrisNmid: typeof parsed.qrisNmid === 'string' ? parsed.qrisNmid : '',
      qrisTheme: validTheme,
      qrisCustomNote: typeof parsed.qrisCustomNote === 'string' ? parsed.qrisCustomNote : '',
      showQrisOnReceipt:
        typeof parsed.showQrisOnReceipt === 'boolean' ? parsed.showQrisOnReceipt : true,
      bankName: typeof parsed.bankName === 'string' ? parsed.bankName : '',
      bankAccountNumber:
        typeof parsed.bankAccountNumber === 'string' ? parsed.bankAccountNumber : '',
      bankAccountHolder:
        typeof parsed.bankAccountHolder === 'string' ? parsed.bankAccountHolder : '',
      storeName: typeof parsed.storeName === 'string' ? parsed.storeName : '',
      storeTagline: typeof parsed.storeTagline === 'string' ? parsed.storeTagline : '',
      storeAddress: typeof parsed.storeAddress === 'string' ? parsed.storeAddress : '',
      storePhone: typeof parsed.storePhone === 'string' ? parsed.storePhone : '',
      receiptFooter: typeof parsed.receiptFooter === 'string' ? parsed.receiptFooter : '',
      paperWidth: parsed.paperWidth === '80mm' ? '80mm' : '58mm',
      customCategories: Array.isArray(parsed.customCategories)
        ? parsed.customCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return defaults;
  }
};

export const saveStoredPaymentSettings = (
  settings: StorePaymentSettings,
  ownerId: string = ''
): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      tenantKey(STORAGE_KEYS.PAYMENT_SETTINGS, ownerId),
      JSON.stringify({ ...settings, ownerId })
    );
  } catch (err) {
    console.error('Failed to save store payment settings to storage', err);
  }
};

export const getStoredCustomCategories = (ownerId: string = ''): string[] => {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(tenantKey(STORAGE_KEYS.CUSTOM_CATEGORIES, ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim());
  } catch {
    return [];
  }
};

export const saveStoredCustomCategories = (
  categories: string[],
  ownerId: string = ''
): void => {
  if (!ownerId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      tenantKey(STORAGE_KEYS.CUSTOM_CATEGORIES, ownerId),
      JSON.stringify(categories)
    );
  } catch (err) {
    console.error('Failed to save custom categories to storage', err);
  }
};
