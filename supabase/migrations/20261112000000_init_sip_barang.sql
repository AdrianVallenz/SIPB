-- Migration: Initial SIP Barang Schema & RLS Policies
-- Project: SIP Barang (wzyetnpufudiklffmtcx)

create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category text not null,
  buy_price bigint not null default 0 check (buy_price >= 0),
  sell_price bigint not null default 0 check (sell_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 1 check (min_stock >= 1),
  unit text not null default 'pcs',
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  invoice_no text not null unique,
  created_at timestamptz not null default now(),
  cashier_email text not null,
  cashier_name text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  tax bigint not null default 0,
  total bigint not null default 0,
  payment_method text not null,
  amount_paid bigint not null default 0,
  change bigint not null default 0,
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'VOIDED')),
  void_reason text,
  voided_at timestamptz
);

create table if not exists public.stock_logs (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  product_name text not null,
  type text not null check (type in ('IN', 'OUT', 'ADJUSTMENT')),
  quantity integer not null check (quantity >= 0),
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  operator text not null
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_cashier_email on public.transactions(cashier_email);
create index if not exists idx_stock_logs_product_id on public.stock_logs(product_id);
create index if not exists idx_stock_logs_created_at on public.stock_logs(created_at desc);

alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.stock_logs enable row level security;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select, insert on public.stock_logs to authenticated;

create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using ( (select auth.uid()) is not null );

create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

create policy "products_update_authenticated"
  on public.products for update
  to authenticated
  using ( (select auth.uid()) is not null )
  with check ( (select auth.uid()) is not null );

create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

create policy "transactions_select_role_scoped"
  on public.transactions for select
  to authenticated
  using (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    or cashier_email = ((select auth.jwt()) ->> 'email')
  );

create policy "transactions_insert_authenticated"
  on public.transactions for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and cashier_email = ((select auth.jwt()) ->> 'email')
  );

create policy "transactions_update_admin_void"
  on public.transactions for update
  to authenticated
  using ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

create policy "stock_logs_select_authenticated"
  on public.stock_logs for select
  to authenticated
  using ( (select auth.uid()) is not null );

create policy "stock_logs_insert_authenticated"
  on public.stock_logs for insert
  to authenticated
  with check ( (select auth.uid()) is not null );

