-- Multi-tenant user isolation & admin-managed cashier accounts

-- 1. Backfill existing demo auth.users metadata with explicit owner_id
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'owner_id', '00000000-0000-0000-0000-000000000001'
)
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- 2. Create store_cashiers table to track cashiers owned by each admin
create table if not exists public.store_cashiers (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_cashiers_owner_id on public.store_cashiers (owner_id);

grant select on public.store_cashiers to authenticated;
alter table public.store_cashiers enable row level security;

create policy "store_cashiers_select_scoped"
  on public.store_cashiers
  for select
  to authenticated
  using (
    (
      (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
      and owner_id = (select auth.uid())
    )
    or id = (select auth.uid())
  );

-- Seed demo cashier row
insert into public.store_cashiers (id, owner_id, email, name, is_active)
select
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'name', 'Kasir Penjualan'),
  true
from auth.users u
where u.id = '00000000-0000-0000-0000-000000000002'
on conflict (id) do nothing;

-- 3. Add owner_id to products, transactions, stock_logs
alter table public.products
  add column if not exists owner_id uuid not null default '00000000-0000-0000-0000-000000000001'
  references auth.users(id) on delete cascade;
alter table public.products alter column owner_id set default auth.uid();
create index if not exists idx_products_owner_id on public.products (owner_id);
create unique index if not exists idx_products_owner_sku on public.products (owner_id, sku);

alter table public.transactions
  add column if not exists owner_id uuid not null default '00000000-0000-0000-0000-000000000001'
  references auth.users(id) on delete cascade;
alter table public.transactions alter column owner_id set default auth.uid();
create index if not exists idx_transactions_owner_id on public.transactions (owner_id);
create unique index if not exists idx_transactions_owner_invoice_no on public.transactions (owner_id, invoice_no);

alter table public.stock_logs
  add column if not exists owner_id uuid not null default '00000000-0000-0000-0000-000000000001'
  references auth.users(id) on delete cascade;
alter table public.stock_logs alter column owner_id set default auth.uid();
create index if not exists idx_stock_logs_owner_id on public.stock_logs (owner_id);

-- 4. Update existing RLS policies with tenant isolation
alter policy "products_select_authenticated"
  on public.products
  using (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
  );

alter policy "products_insert_admin"
  on public.products
  with check (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  );

alter policy "products_update_authenticated"
  on public.products
  using (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
  )
  with check (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
  );

alter policy "products_delete_admin"
  on public.products
  using (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  );

alter policy "transactions_select_role_scoped"
  on public.transactions
  using (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
    and (
      (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
      or cashier_email = ((select auth.jwt()) ->> 'email')
    )
  );

alter policy "transactions_insert_authenticated"
  on public.transactions
  with check (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
    and cashier_email = ((select auth.jwt()) ->> 'email')
  );

alter policy "transactions_update_admin_void"
  on public.transactions
  using (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  )
  with check (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  );

alter policy "stock_logs_select_authenticated"
  on public.stock_logs
  using (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
  );

alter policy "stock_logs_insert_authenticated"
  on public.stock_logs
  with check (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.owner_id = stock_logs.owner_id
    )
  );
