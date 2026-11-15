-- ============================================================================
-- SIP BARANG - RANCANGAN DATABASE (PostgreSQL / Supabase)
-- Sistem Informasi Operasional Penjualan & Inventaris Barang (Point of Sale)
-- ============================================================================

-- 1. TABEL STAF KASIR TOKO (Relasi Multi-Tenant ke Akun Admin auth.users)
CREATE TABLE IF NOT EXISTS public.store_cashiers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_cashiers_owner_id ON public.store_cashiers(owner_id);

-- 2. TABEL KATALOG PRODUK & STOK GUDANG
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  buy_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (buy_price >= 0),
  sell_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(owner_id, sku);

-- 3. TABEL TRANSAKSI PENJUALAN KASIR (POS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cashier_email TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Tunai', 'QRIS', 'Transfer Bank', 'Kartu Debit')),
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  change NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'VOIDED')),
  void_reason TEXT,
  voided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_owner_id ON public.transactions(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_no ON public.transactions(owner_id, invoice_no);

-- 4. TABEL RIWAYAT LOG MUTASI STOK GUDANG
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operator TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_owner_id ON public.stock_logs(owner_id, created_at DESC);

-- 5. TABEL PENGATURAN PEMBAYARAN TOKO (QRIS & REKENING BANK)
CREATE TABLE IF NOT EXISTS public.store_payment_settings (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  qris_payload TEXT NOT NULL DEFAULT '',
  qris_image_data TEXT NOT NULL DEFAULT '',
  qris_merchant_name TEXT NOT NULL DEFAULT '',
  qris_nmid TEXT NOT NULL DEFAULT '',
  qris_theme TEXT NOT NULL DEFAULT 'clean',
  qris_custom_note TEXT NOT NULL DEFAULT '',
  show_qris_on_receipt BOOLEAN NOT NULL DEFAULT TRUE,
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account_number TEXT NOT NULL DEFAULT '',
  bank_account_holder TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- KEAMANAN ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- ============================================================================
ALTER TABLE public.store_cashiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

-- Helper fungsi untuk mengambil owner_id dari JWT klaim pengguna (Admin atau Kasir)
CREATE OR REPLACE FUNCTION public.current_store_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'owner_id')::uuid,
    auth.uid()
  );
$$;

CREATE POLICY "Tenant isolation on products"
  ON public.products
  FOR ALL
  USING (owner_id = public.current_store_owner_id())
  WITH CHECK (owner_id = public.current_store_owner_id());

CREATE POLICY "Tenant isolation on transactions"
  ON public.transactions
  FOR ALL
  USING (owner_id = public.current_store_owner_id())
  WITH CHECK (owner_id = public.current_store_owner_id());

CREATE POLICY "Tenant isolation on stock_logs"
  ON public.stock_logs
  FOR ALL
  USING (owner_id = public.current_store_owner_id())
  WITH CHECK (owner_id = public.current_store_owner_id());

CREATE POLICY "Tenant isolation on store_cashiers"
  ON public.store_cashiers
  FOR ALL
  USING (owner_id = public.current_store_owner_id())
  WITH CHECK (owner_id = public.current_store_owner_id());

CREATE POLICY "Tenant isolation on store_payment_settings"
  ON public.store_payment_settings
  FOR ALL
  USING (owner_id = public.current_store_owner_id())
  WITH CHECK (owner_id = public.current_store_owner_id());
