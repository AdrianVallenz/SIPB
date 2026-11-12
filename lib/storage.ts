import {
  Product,
  Transaction,
  StockLog,
  UserSession,
  CashierAccount,
  StorePaymentSettings,
} from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_STOCK_LOGS } from './dummyData';

export const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_CASHIER_ID = '00000000-0000-0000-0000-000000000002';

const STORAGE_KEYS = {
  PRODUCTS: 'sip_products_v2',
  TRANSACTIONS: 'sip_transactions_v2',
  STOCK_LOGS: 'sip_stock_logs_v2',
  CASHIERS: 'sip_cashiers_v2',
  PAYMENT_SETTINGS: 'sip_payment_settings_v1',
  SESSION: 'sip_session_v2',
  THEME: 'sip_theme_v1',
  ACCOUNTS: 'sip_registered_accounts_v2',
} as const;

const tenantKey = (base: string, ownerId?: string) => `${base}_${ownerId || DEMO_OWNER_ID}`;

export interface RegisteredAccount {
  id: string;
  ownerId: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  isActive?: boolean;
  createdAt: string;
}

// 12 hours max session duration (1 cashier shift)
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const DEMO_ACCOUNTS: Record<
  string,
  { id: string; ownerId: string; name: string; role: 'admin' | 'user' }
> = {
  'admin@sip.com': {
    id: DEMO_OWNER_ID,
    ownerId: DEMO_OWNER_ID,
    name: 'Administrator Toko',
    role: 'admin',
  },
  'user@sip.com': {
    id: DEMO_CASHIER_ID,
    ownerId: DEMO_OWNER_ID,
    name: 'Kasir Penjualan',
    role: 'user',
  },
};

export const getStoredAccounts = (): RegisteredAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.ownerId === 'string' &&
        typeof a.email === 'string' &&
        typeof a.name === 'string' &&
        typeof a.password === 'string' &&
        (a.role === 'admin' || a.role === 'user')
    );
  } catch {
    return [];
  }
};

export const saveStoredAccount = (account: RegisteredAccount): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredAccounts().filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify([...existing, account]));
  } catch (err) {
    console.error('Failed to save registered account', err);
  }
};

export const removeStoredAccount = (idOrEmail: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const target = idOrEmail.toLowerCase();
    const existing = getStoredAccounts().filter(
      (a) => a.id.toLowerCase() !== target && a.email.toLowerCase() !== target
    );
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to remove registered account', err);
  }
};

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

export const getStoredProducts = (ownerId: string = DEMO_OWNER_ID): Product[] => {
  const defaultProducts = ownerId === DEMO_OWNER_ID ? INITIAL_PRODUCTS : [];
  if (typeof window === 'undefined') return defaultProducts;
  try {
    const key = tenantKey(STORAGE_KEYS.PRODUCTS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (defaultProducts.length > 0) {
        localStorage.setItem(key, JSON.stringify(defaultProducts));
      }
      return defaultProducts;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidProduct)) {
      return defaultProducts;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read products from storage', err);
    return defaultProducts;
  }
};

export const saveStoredProducts = (products: Product[], ownerId: string = DEMO_OWNER_ID): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(tenantKey(STORAGE_KEYS.PRODUCTS, ownerId), JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products to storage', err);
  }
};

export const getStoredTransactions = (ownerId: string = DEMO_OWNER_ID): Transaction[] => {
  const defaultTrx = ownerId === DEMO_OWNER_ID ? INITIAL_TRANSACTIONS : [];
  if (typeof window === 'undefined') return defaultTrx;
  try {
    const key = tenantKey(STORAGE_KEYS.TRANSACTIONS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (defaultTrx.length > 0) {
        localStorage.setItem(key, JSON.stringify(defaultTrx));
      }
      return defaultTrx;
    }
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
      return defaultTrx;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read transactions from storage', err);
    return defaultTrx;
  }
};

export const saveStoredTransactions = (
  transactions: Transaction[],
  ownerId: string = DEMO_OWNER_ID
): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      tenantKey(STORAGE_KEYS.TRANSACTIONS, ownerId),
      JSON.stringify(transactions)
    );
  } catch (err) {
    console.error('Failed to save transactions to storage', err);
  }
};

export const getStoredStockLogs = (ownerId: string = DEMO_OWNER_ID): StockLog[] => {
  const defaultLogs = ownerId === DEMO_OWNER_ID ? INITIAL_STOCK_LOGS : [];
  if (typeof window === 'undefined') return defaultLogs;
  try {
    const key = tenantKey(STORAGE_KEYS.STOCK_LOGS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (defaultLogs.length > 0) {
        localStorage.setItem(key, JSON.stringify(defaultLogs));
      }
      return defaultLogs;
    }
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (l) =>
          l && typeof l === 'object' && typeof l.id === 'string' && typeof l.productName === 'string'
      )
    ) {
      return defaultLogs;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read stock logs from storage', err);
    return defaultLogs;
  }
};

export const saveStoredStockLogs = (logs: StockLog[], ownerId: string = DEMO_OWNER_ID): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(tenantKey(STORAGE_KEYS.STOCK_LOGS, ownerId), JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save stock logs to storage', err);
  }
};

export const getStoredCashiers = (ownerId: string = DEMO_OWNER_ID): CashierAccount[] => {
  const defaultCashiers: CashierAccount[] =
    ownerId === DEMO_OWNER_ID
      ? [
          {
            id: DEMO_CASHIER_ID,
            ownerId: DEMO_OWNER_ID,
            email: 'user@sip.com',
            name: 'Kasir Penjualan',
            isActive: true,
            createdAt: '2026-11-12T00:00:00.000Z',
          },
        ]
      : [];
  if (typeof window === 'undefined') return defaultCashiers;
  try {
    const key = tenantKey(STORAGE_KEYS.CASHIERS, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (defaultCashiers.length > 0) {
        localStorage.setItem(key, JSON.stringify(defaultCashiers));
      }
      return defaultCashiers;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultCashiers;
    return parsed.filter(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof c.id === 'string' &&
        typeof c.email === 'string' &&
        typeof c.name === 'string'
    );
  } catch {
    return defaultCashiers;
  }
};

export const saveStoredCashiers = (
  cashiers: CashierAccount[],
  ownerId: string = DEMO_OWNER_ID
): void => {
  if (typeof window === 'undefined') return;
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
    const customAccount = getStoredAccounts().find((a) => a.email.toLowerCase() === emailLower);
    if (customAccount && customAccount.isActive === false) {
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
  ownerId: string = DEMO_OWNER_ID
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
  updatedAt: '',
});

export const getStoredPaymentSettings = (
  ownerId: string = DEMO_OWNER_ID
): StorePaymentSettings => {
  const defaults = getDefaultStorePaymentSettings(ownerId);
  if (typeof window === 'undefined') return defaults;
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
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return defaults;
  }
};

export const saveStoredPaymentSettings = (
  settings: StorePaymentSettings,
  ownerId: string = DEMO_OWNER_ID
): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      tenantKey(STORAGE_KEYS.PAYMENT_SETTINGS, ownerId),
      JSON.stringify({ ...settings, ownerId })
    );
  } catch (err) {
    console.error('Failed to save store payment settings to storage', err);
  }
};
