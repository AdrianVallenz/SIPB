import { Product, Transaction, StockLog, UserSession } from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_STOCK_LOGS } from './dummyData';

const STORAGE_KEYS = {
  PRODUCTS: 'sip_products_v1',
  TRANSACTIONS: 'sip_transactions_v1',
  STOCK_LOGS: 'sip_stock_logs_v1',
  SESSION: 'sip_session_v1',
  THEME: 'sip_theme_v1',
} as const;

const VALID_ACCOUNTS: Record<string, { name: string; role: 'admin' | 'user' }> = {
  'admin@sip.com': { name: 'Administrator Toko', role: 'admin' },
  'user@sip.com': { name: 'Kasir Penjualan', role: 'user' },
};

export const getStoredProducts = (): Product[] => {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_PRODUCTS;
    return parsed;
  } catch (err) {
    console.error('Failed to read products from storage', err);
    return INITIAL_PRODUCTS;
  }
};

export const saveStoredProducts = (products: Product[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products to storage', err);
  }
};

export const getStoredTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_TRANSACTIONS;
    return parsed;
  } catch (err) {
    console.error('Failed to read transactions from storage', err);
    return INITIAL_TRANSACTIONS;
  }
};

export const saveStoredTransactions = (transactions: Transaction[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to storage', err);
  }
};

export const getStoredStockLogs = (): StockLog[] => {
  if (typeof window === 'undefined') return INITIAL_STOCK_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
      return INITIAL_STOCK_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_STOCK_LOGS;
    return parsed;
  } catch (err) {
    console.error('Failed to read stock logs from storage', err);
    return INITIAL_STOCK_LOGS;
  }
};

export const saveStoredStockLogs = (logs: StockLog[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save stock logs to storage', err);
  }
};

export const getStoredSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (!parsed || typeof parsed.email !== 'string') {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }
    const account = VALID_ACCOUNTS[parsed.email.toLowerCase()];
    if (!account || parsed.role !== account.role) {
      // Prevent privilege escalation via localStorage tampering
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }
    return {
      email: parsed.email.toLowerCase(),
      name: account.name,
      role: account.role,
      loginAt: typeof parsed.loginAt === 'string' ? parsed.loginAt : new Date().toISOString(),
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

export const resetAllStorageToDefault = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
  } catch (err) {
    console.error('Failed to reset storage', err);
  }
};
