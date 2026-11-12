-- Multi-tenant store QRIS & bank transfer payment configuration
create table if not exists public.store_payment_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  qris_payload text not null default '',
  qris_image_data text not null default '',
  qris_merchant_name text not null default '',
  qris_nmid text not null default '',
  bank_name text not null default '',
  bank_account_number text not null default '',
  bank_account_holder text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.store_payment_settings enable row level security;

grant select, insert, update on public.store_payment_settings to authenticated;

create policy "store_payment_settings_select_scoped"
  on public.store_payment_settings
  for select
  to authenticated
  using (
    owner_id = coalesce(
      nullif(((select auth.jwt()) -> 'app_metadata' ->> 'owner_id'), '')::uuid,
      case
        when (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') then (select auth.uid())
        else null
      end
    )
  );

create policy "store_payment_settings_insert_admin"
  on public.store_payment_settings
  for insert
  to authenticated
  with check (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  );

create policy "store_payment_settings_update_admin"
  on public.store_payment_settings
  for update
  to authenticated
  using (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  )
  with check (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and owner_id = (select auth.uid())
  );

