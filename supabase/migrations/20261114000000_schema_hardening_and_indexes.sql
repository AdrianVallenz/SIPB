-- 1. Drop legacy global UNIQUE constraints that block multi-tenant SKUs & invoice numbers.
-- Per-tenant uniqueness is already enforced by idx_products_owner_sku and idx_transactions_owner_invoice_no.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sku_key;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_invoice_no_key;

-- 2. Composite indexes matching multi-tenant RLS filters + default sort order
CREATE INDEX IF NOT EXISTS idx_products_owner_updated_at
  ON public.products (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_owner_created_at
  ON public.transactions (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_owner_cashier_created_at
  ON public.transactions (owner_id, cashier_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_logs_owner_created_at
  ON public.stock_logs (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_cashiers_owner_email
  ON public.store_cashiers (owner_id, email);

-- 3. Drop single-column owner_id indexes superseded by leftmost composite prefixes
-- (Preserve idx_stock_logs_product_id for FK cascade performance)
DROP INDEX IF EXISTS public.idx_products_owner_id;
DROP INDEX IF EXISTS public.idx_transactions_owner_id;
DROP INDEX IF EXISTS public.idx_stock_logs_owner_id;
DROP INDEX IF EXISTS public.idx_transactions_cashier_email;

