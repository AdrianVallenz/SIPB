import {
  CashierAccount,
  PaymentMethod,
  Product,
  ProductCategory,
  Role,
  StockLog,
  Transaction,
  TransactionItem,
} from './types';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzyetnpufudiklffmtcx.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_lBeZJDupVS3nBap6Q7JP5A_PlBVqSFv';

const TENANT_AUTH_URL = `${SUPABASE_URL}/functions/v1/tenant-auth`;
const TOKEN_STORAGE_KEY = 'sip_supabase_token_v1';
const REFRESH_STORAGE_KEY = 'sip_supabase_refresh_v1';

export function getSupabaseAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSupabaseRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSupabaseAccessToken(
  token: string | null,
  refreshToken?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

let inflightRefresh: Promise<string | null> | null = null;

export async function refreshSupabaseToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;
  const refreshToken = getSupabaseRefreshToken();
  if (!refreshToken) return null;

  inflightRefresh = (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (data.access_token) {
        setSupabaseAccessToken(data.access_token, data.refresh_token || refreshToken);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

async function fetchWithSupabaseAuth(
  url: string,
  init: RequestInit,
  customToken?: string | null
): Promise<Response> {
  const token = customToken ?? getSupabaseAccessToken();
  const buildHeaders = (tok: string | null): Record<string, string> => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${tok || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) || {}),
  });

  let res = await fetch(url, { ...init, headers: buildHeaders(token) });
  if (res.status === 401 && token) {
    const refreshed = await refreshSupabaseToken();
    if (refreshed) {
      res = await fetch(url, { ...init, headers: buildHeaders(refreshed) });
    }
  }
  return res;
}

export interface SupabaseAuthUser {
  id: string;
  ownerId: string;
  email: string;
  name: string;
  role: Role;
}

export async function signInSupabase(
  email: string,
  password: string
): Promise<{
  accessToken: string | null;
  user?: SupabaseAuthUser;
  error?: string;
  offline?: boolean;
  banned?: boolean;
}> {
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
      let rawMsg = '';
      try {
        const errBody = (await res.json()) as {
          error_description?: string;
          msg?: string;
          error?: string;
        };
        rawMsg = errBody.error_description || errBody.msg || errBody.error || '';
      } catch {
        // ignore JSON parse failure
      }
      const lower = rawMsg.toLowerCase();
      if (lower.includes('ban')) {
        return {
          accessToken: null,
          banned: true,
          error: 'Akun kasir sedang dinonaktifkan oleh Administrator.',
        };
      }
      return { accessToken: null, error: 'Email atau kata sandi tidak valid.' };
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      user?: {
        id: string;
        email?: string;
        user_metadata?: { name?: string };
        app_metadata?: { role?: string; owner_id?: string };
      };
    };
    if (data.access_token && data.user) {
      setSupabaseAccessToken(data.access_token, data.refresh_token);
      const role: Role = data.user.app_metadata?.role === 'user' ? 'user' : 'admin';
      const ownerId =
        data.user.app_metadata?.owner_id || (role === 'admin' ? data.user.id : '');
      const name =
        data.user.user_metadata?.name ||
        (role === 'admin' ? 'Administrator Toko' : 'Kasir Penjualan');
      return {
        accessToken: data.access_token,
        user: {
          id: data.user.id,
          ownerId,
          email: (data.user.email || email).toLowerCase(),
          name,
          role,
        },
      };
    }
    return { accessToken: null };
  } catch {
    return { accessToken: null, offline: true, error: 'Offline mode' };
  }
}

async function callTenantAuth<T>(
  body: Record<string, unknown>,
  token?: string | null
): Promise<{ ok: boolean; data?: T; error?: string; offline?: boolean }> {
  try {
    const res = await fetchWithSupabaseAuth(
      TENANT_AUTH_URL,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token
    );
    const parsed = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: parsed.error || 'Permintaan gagal diproses oleh server.',
      };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, offline: true, error: 'Tidak dapat terhubung ke server cloud.' };
  }
}

export async function registerAdminCloud(
  name: string,
  email: string,
  password: string
): Promise<{
  ok: boolean;
  user?: { id: string; email: string; name: string; role: 'admin'; ownerId: string };
  error?: string;
  offline?: boolean;
}> {
  const res = await callTenantAuth<{
    user?: { id: string; email: string; name: string; role: 'admin'; ownerId: string };
  }>({
    action: 'register_admin',
    name,
    email,
    password,
  });
  return {
    ok: res.ok,
    user: res.data?.user,
    error: res.error,
    offline: res.offline,
  };
}

export async function createCashierCloud(
  name: string,
  email: string,
  password: string,
  token?: string | null
): Promise<{ ok: boolean; cashier?: CashierAccount; error?: string; offline?: boolean }> {
  const res = await callTenantAuth<{ cashier?: CashierAccount }>(
    { action: 'create_cashier', name, email, password },
    token
  );
  return {
    ok: res.ok,
    cashier: res.data?.cashier,
    error: res.error,
    offline: res.offline,
  };
}

export async function toggleCashierCloud(
  cashierId: string,
  isActive: boolean,
  token?: string | null
): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  const res = await callTenantAuth<{ success?: boolean }>(
    { action: 'toggle_cashier', cashierId, isActive },
    token
  );
  return { ok: res.ok, error: res.error, offline: res.offline };
}

export async function updateCashierCloud(
  cashierId: string,
  patch: { name?: string; password?: string },
  token?: string | null
): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  const res = await callTenantAuth<{ success?: boolean }>(
    { action: 'update_cashier', cashierId, ...patch },
    token
  );
  return { ok: res.ok, error: res.error, offline: res.offline };
}

export async function deleteCashierCloud(
  cashierId: string,
  token?: string | null
): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  const res = await callTenantAuth<{ success?: boolean }>(
    { action: 'delete_cashier', cashierId },
    token
  );
  return { ok: res.ok, error: res.error, offline: res.offline };
}

interface DbProductRow {
  id: string;
  owner_id?: string;
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
  owner_id?: string;
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
  owner_id?: string;
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

interface DbCashierRow {
  id: string;
  owner_id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export async function fetchCloudSnapshot(token?: string | null): Promise<{
  products?: Product[];
  transactions?: Transaction[];
  stockLogs?: StockLog[];
  cashiers?: CashierAccount[];
  connected: boolean;
}> {
  const activeToken = token ?? getSupabaseAccessToken();
  if (!activeToken) return { connected: false };

  try {
    const [prodRes, trxRes, logRes, cashRes] = await Promise.all([
      fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/products?select=*&order=updated_at.desc`, {}, activeToken),
      fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=created_at.desc`, {}, activeToken),
      fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/stock_logs?select=*&order=created_at.desc`, {}, activeToken),
      fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/store_cashiers?select=*&order=created_at.desc`, {}, activeToken),
    ]);

    if (!prodRes.ok || !trxRes.ok || !logRes.ok) {
      return { connected: false };
    }

    const [prodRows, trxRows, logRows] = (await Promise.all([
      prodRes.json(),
      trxRes.json(),
      logRes.json(),
    ])) as [DbProductRow[], DbTransactionRow[], DbStockLogRow[]];

    const cashRows: DbCashierRow[] = cashRes.ok ? ((await cashRes.json()) as DbCashierRow[]) : [];

    const products: Product[] = prodRows.map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
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
      ownerId: r.owner_id,
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
      ownerId: r.owner_id,
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

    const cashiers: CashierAccount[] = cashRows.map((c) => ({
      id: c.id,
      ownerId: c.owner_id,
      email: c.email,
      name: c.name,
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
    }));

    return { products, transactions, stockLogs, cashiers, connected: true };
  } catch {
    return { connected: false };
  }
}

export async function syncUpsertProduct(
  p: Product,
  ownerId: string
): Promise<{ ok: boolean; error?: string; code?: string }> {
  try {
    const res = await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: p.id,
        owner_id: p.ownerId || ownerId,
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
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
      return { ok: false, error: err.message, code: err.code };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Offline' };
  }
}

export async function syncUpdateProductStock(
  productId: string,
  stock: number,
  updatedAt: string
): Promise<void> {
  try {
    await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stock,
        updated_at: updatedAt,
      }),
    });
  } catch {
    // Fallback remains in localStorage
  }
}

export async function syncDeleteProduct(productId: string): Promise<void> {
  try {
    await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore offline error
  }
}

export async function syncInsertStockLogs(logs: StockLog[], ownerId: string): Promise<void> {
  if (!logs.length) return;
  try {
    await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/stock_logs`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(
        logs.map((l) => ({
          id: l.id,
          owner_id: l.ownerId || ownerId,
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

export async function syncInsertTransaction(t: Transaction, ownerId: string): Promise<void> {
  try {
    await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: t.id,
        owner_id: t.ownerId || ownerId,
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
    await fetchWithSupabaseAuth(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${encodeURIComponent(transactionId)}`, {
      method: 'PATCH',
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
