import { Product, ProductCategory, Transaction, TransactionItem, StockLog, PaymentMethod } from './types';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzyetnpufudiklffmtcx.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_lBeZJDupVS3nBap6Q7JP5A_PlBVqSFv';

const TOKEN_STORAGE_KEY = 'sip_supabase_token_v1';

export function getSupabaseAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSupabaseAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // Ignore storage errors
  }
}

function getHeaders(customToken?: string | null): Record<string, string> {
  const token = customToken ?? getSupabaseAccessToken();
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function signInSupabase(
  email: string,
  password: string
): Promise<{ accessToken: string | null; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return { accessToken: null, error: 'Gagal mengautentikasi sesi cloud.' };
    }
    const data = (await res.json()) as { access_token?: string };
    if (data.access_token) {
      setSupabaseAccessToken(data.access_token);
      return { accessToken: data.access_token };
    }
    return { accessToken: null };
  } catch {
    return { accessToken: null, error: 'Offline mode' };
  }
}

interface DbProductRow {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  description: string;
  updated_at: string;
}

interface DbTransactionRow {
  id: string;
  invoice_no: string;
  created_at: string;
  cashier_email: string;
  cashier_name: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  change: number;
  status: 'COMPLETED' | 'VOIDED';
  void_reason?: string | null;
  voided_at?: string | null;
}

interface DbStockLogRow {
  id: string;
  product_id: string;
  product_name: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
  operator: string;
}

export async function fetchCloudSnapshot(token?: string | null): Promise<{
  products?: Product[];
  transactions?: Transaction[];
  stockLogs?: StockLog[];
  connected: boolean;
}> {
  const activeToken = token ?? getSupabaseAccessToken();
  if (!activeToken) return { connected: false };

  try {
    const headers = getHeaders(activeToken);
    const [prodRes, trxRes, logRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=updated_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/stock_logs?select=*&order=created_at.desc`, { headers }),
    ]);

    if (!prodRes.ok || !trxRes.ok || !logRes.ok) {
      return { connected: false };
    }

    const [prodRows, trxRows, logRows] = (await Promise.all([
      prodRes.json(),
      trxRes.json(),
      logRes.json(),
    ])) as [DbProductRow[], DbTransactionRow[], DbStockLogRow[]];

    const products: Product[] = prodRows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      category: r.category,
      buyPrice: Number(r.buy_price),
      sellPrice: Number(r.sell_price),
      stock: Number(r.stock),
      minStock: Number(r.min_stock),
      unit: r.unit,
      description: r.description || '',
      updatedAt: r.updated_at,
    }));

    const transactions: Transaction[] = trxRows.map((r) => ({
      id: r.id,
      invoiceNo: r.invoice_no,
      createdAt: r.created_at,
      cashierEmail: r.cashier_email,
      cashierName: r.cashier_name,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      tax: Number(r.tax),
      total: Number(r.total),
      paymentMethod: r.payment_method,
      amountPaid: Number(r.amount_paid),
      change: Number(r.change),
      status: r.status || 'COMPLETED',
      voidReason: r.void_reason || undefined,
      voidedAt: r.voided_at || undefined,
    }));

    const stockLogs: StockLog[] = logRows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      type: r.type,
      quantity: Number(r.quantity),
      previousStock: Number(r.previous_stock),
      newStock: Number(r.new_stock),
      reason: r.reason,
      createdAt: r.created_at,
      operator: r.operator,
    }));

    return { products, transactions, stockLogs, connected: true };
  } catch {
    return { connected: false };
  }
}

export async function syncUpsertProduct(p: Product): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        buy_price: p.buyPrice,
        sell_price: p.sellPrice,
        stock: p.stock,
        min_stock: p.minStock,
        unit: p.unit,
        description: p.description || '',
        updated_at: p.updatedAt,
      }),
    });
  } catch {
    // Fallback remains in localStorage
  }
}

export async function syncDeleteProduct(productId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  } catch {
    // Ignore offline error
  }
}

export async function syncInsertStockLogs(logs: StockLog[]): Promise<void> {
  if (!logs.length) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/stock_logs`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(
        logs.map((l) => ({
          id: l.id,
          product_id: l.productId,
          product_name: l.productName,
          type: l.type,
          quantity: l.quantity,
          previous_stock: l.previousStock,
          new_stock: l.newStock,
          reason: l.reason,
          created_at: l.createdAt,
          operator: l.operator,
        }))
      ),
    });
  } catch {
    // Ignore offline error
  }
}

export async function syncInsertTransaction(t: Transaction): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: t.id,
        invoice_no: t.invoiceNo,
        created_at: t.createdAt,
        cashier_email: t.cashierEmail,
        cashier_name: t.cashierName,
        items: t.items,
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        payment_method: t.paymentMethod,
        amount_paid: t.amountPaid,
        change: t.change,
        status: t.status || 'COMPLETED',
        void_reason: t.voidReason || null,
        voided_at: t.voidedAt || null,
      }),
    });
  } catch {
    // Ignore offline error
  }
}

export async function syncVoidTransaction(
  transactionId: string,
  voidReason: string,
  voidedAt: string
): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${encodeURIComponent(transactionId)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'VOIDED',
        void_reason: voidReason,
        voided_at: voidedAt,
      }),
    });
  } catch {
    // Ignore offline error
  }
}

