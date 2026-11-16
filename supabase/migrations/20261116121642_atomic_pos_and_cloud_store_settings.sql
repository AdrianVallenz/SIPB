-- 1. Extend store_payment_settings for cloud-synced receipt identity & custom categories
alter table public.store_payment_settings
  add column if not exists store_name text not null default '',
  add column if not exists store_tagline text not null default '',
  add column if not exists store_address text not null default '',
  add column if not exists store_phone text not null default '',
  add column if not exists receipt_footer text not null default '',
  add column if not exists paper_width text not null default '58mm'
    check (paper_width in ('58mm', '80mm')),
  add column if not exists custom_categories jsonb not null default '[]'::jsonb;

-- 2. Atomic POS Checkout RPC (SECURITY INVOKER, row locks ordered by product_id)
create or replace function public.process_pos_sale(
  p_trx_id text,
  p_invoice_no text,
  p_cashier_name text,
  p_payment_method text,
  p_discount bigint,
  p_amount_paid bigint,
  p_items jsonb,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(v_jwt -> 'app_metadata' ->> 'role', 'admin');
  v_owner_id uuid := coalesce(
    nullif(v_jwt -> 'app_metadata' ->> 'owner_id', '')::uuid,
    case when v_role = 'admin' then v_uid else null end
  );
  v_email text := lower(coalesce(v_jwt ->> 'email', ''));
  v_now timestamptz := coalesce(p_created_at, now());
  v_item record;
  v_prod public.products%rowtype;
  v_qty integer;
  v_subtotal bigint := 0;
  v_item_subtotal bigint;
  v_final_discount bigint;
  v_grand_total bigint;
  v_change bigint;
  v_final_paid bigint;
  v_built_items jsonb := '[]'::jsonb;
  v_updated_products jsonb := '[]'::jsonb;
  v_logs_json jsonb := '[]'::jsonb;
  v_new_stock integer;
  v_log_id text;
  v_existing public.transactions%rowtype;
begin
  if v_uid is null or v_owner_id is null or v_email = '' then
    raise exception 'Sesi cloud tidak valid. Silakan masuk kembali.';
  end if;

  select * into v_existing
  from public.transactions
  where id = p_trx_id
    and owner_id = v_owner_id;
  if found then
    return jsonb_build_object(
      'transaction', jsonb_build_object(
        'id', v_existing.id,
        'ownerId', v_existing.owner_id,
        'invoiceNo', v_existing.invoice_no,
        'createdAt', v_existing.created_at,
        'cashierEmail', v_existing.cashier_email,
        'cashierName', v_existing.cashier_name,
        'items', v_existing.items,
        'subtotal', v_existing.subtotal,
        'discount', v_existing.discount,
        'tax', v_existing.tax,
        'total', v_existing.total,
        'paymentMethod', v_existing.payment_method,
        'amountPaid', v_existing.amount_paid,
        'change', v_existing.change,
        'status', v_existing.status
      ),
      'updated_products', '[]'::jsonb,
      'stock_logs', '[]'::jsonb
    );
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang belanja masih kosong.';
  end if;

  if p_payment_method not in ('Tunai', 'QRIS', 'Transfer Bank', 'Kartu Debit') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  for v_item in
    select
      (elem ->> 'productId') as product_id,
      sum((elem ->> 'quantity')::integer)::integer as total_qty
    from jsonb_array_elements(p_items) as elem
    group by (elem ->> 'productId')
    order by (elem ->> 'productId')
  loop
    v_qty := coalesce(v_item.total_qty, 0);
    if v_qty <= 0 then
      raise exception 'Kuantitas item tidak valid.';
    end if;

    select * into v_prod
    from public.products
    where id = v_item.product_id
      and owner_id = v_owner_id
    for update;

    if not found then
      raise exception 'Produk tidak ditemukan.';
    end if;

    if v_prod.stock < v_qty then
      raise exception 'Stok "%" tidak mencukupi (Tersedia: %, Diminta: %).', v_prod.name, v_prod.stock, v_qty;
    end if;

    v_new_stock := v_prod.stock - v_qty;
    v_item_subtotal := v_prod.sell_price * v_qty;
    v_subtotal := v_subtotal + v_item_subtotal;

    update public.products
    set stock = v_new_stock,
        updated_at = v_now
    where id = v_prod.id
      and owner_id = v_owner_id;

    v_built_items := v_built_items || jsonb_build_object(
      'productId', v_prod.id,
      'sku', v_prod.sku,
      'name', v_prod.name,
      'buyPrice', v_prod.buy_price,
      'price', v_prod.sell_price,
      'quantity', v_qty,
      'subtotal', v_item_subtotal
    );

    v_updated_products := v_updated_products || jsonb_build_object(
      'id', v_prod.id,
      'stock', v_new_stock,
      'updatedAt', v_now
    );

    v_log_id := 'log-' || gen_random_uuid()::text;
    insert into public.stock_logs (
      id, owner_id, product_id, product_name, type, quantity,
      previous_stock, new_stock, reason, created_at, operator
    )
    values (
      v_log_id, v_owner_id, v_prod.id, v_prod.name, 'OUT', v_qty,
      v_prod.stock, v_new_stock, 'Penjualan Kasir (' || p_invoice_no || ')', v_now, v_email
    );

    v_logs_json := v_logs_json || jsonb_build_object(
      'id', v_log_id,
      'ownerId', v_owner_id,
      'productId', v_prod.id,
      'productName', v_prod.name,
      'type', 'OUT',
      'quantity', v_qty,
      'previousStock', v_prod.stock,
      'newStock', v_new_stock,
      'reason', 'Penjualan Kasir (' || p_invoice_no || ')',
      'createdAt', v_now,
      'operator', v_email
    );
  end loop;

  v_final_discount := greatest(0, coalesce(p_discount, 0));
  if v_role <> 'admin' and v_final_discount > round(v_subtotal * 0.25) then
    raise exception 'Otorisasi Kasir hanya mengizinkan diskon maksimal 25%%.';
  end if;
  v_final_discount := least(v_final_discount, v_subtotal);
  v_grand_total := greatest(0, v_subtotal - v_final_discount);

  if p_payment_method = 'Tunai' and coalesce(p_amount_paid, 0) < v_grand_total then
    raise exception 'Nominal uang tunai kurang dari total tagihan (Rp %).', v_grand_total;
  end if;

  if p_payment_method = 'Tunai' then
    v_final_paid := coalesce(p_amount_paid, 0);
    v_change := greatest(0, v_final_paid - v_grand_total);
  else
    v_final_paid := v_grand_total;
    v_change := 0;
  end if;

  insert into public.transactions (
    id, owner_id, invoice_no, created_at, cashier_email, cashier_name,
    items, subtotal, discount, tax, total, payment_method, amount_paid, change, status
  )
  values (
    p_trx_id, v_owner_id, p_invoice_no, v_now, v_email,
    coalesce(nullif(trim(p_cashier_name), ''), v_email),
    v_built_items, v_subtotal, v_final_discount, 0, v_grand_total,
    p_payment_method, v_final_paid, v_change, 'COMPLETED'
  )
  returning * into v_existing;

  return jsonb_build_object(
    'transaction', jsonb_build_object(
      'id', v_existing.id,
      'ownerId', v_existing.owner_id,
      'invoiceNo', v_existing.invoice_no,
      'createdAt', v_existing.created_at,
      'cashierEmail', v_existing.cashier_email,
      'cashierName', v_existing.cashier_name,
      'items', v_existing.items,
      'subtotal', v_existing.subtotal,
      'discount', v_existing.discount,
      'tax', v_existing.tax,
      'total', v_existing.total,
      'paymentMethod', v_existing.payment_method,
      'amountPaid', v_existing.amount_paid,
      'change', v_existing.change,
      'status', v_existing.status
    ),
    'updated_products', v_updated_products,
    'stock_logs', v_logs_json
  );
end;
$$;

revoke all on function public.process_pos_sale(text, text, text, text, bigint, bigint, jsonb, timestamptz) from public;
grant execute on function public.process_pos_sale(text, text, text, text, bigint, bigint, jsonb, timestamptz) to authenticated;

-- 3. Atomic Void Transaction RPC (Admin only, restores live stock atomically)
create or replace function public.void_pos_transaction(
  p_transaction_id text,
  p_void_reason text default null,
  p_voided_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(v_jwt -> 'app_metadata' ->> 'role', '');
  v_email text := lower(coalesce(v_jwt ->> 'email', ''));
  v_now timestamptz := coalesce(p_voided_at, now());
  v_reason text := coalesce(nullif(trim(p_void_reason), ''), 'Pembatalan nota / retur barang oleh Administrator');
  v_trx public.transactions%rowtype;
  v_item record;
  v_prod public.products%rowtype;
  v_new_stock integer;
  v_log_id text;
  v_updated_products jsonb := '[]'::jsonb;
  v_logs_json jsonb := '[]'::jsonb;
begin
  if v_uid is null or v_role <> 'admin' then
    raise exception 'Akses ditolak: hanya Administrator yang dapat membatalkan transaksi.';
  end if;

  select * into v_trx
  from public.transactions
  where id = p_transaction_id
    and owner_id = v_uid
  for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  if v_trx.status = 'VOIDED' then
    raise exception 'Nota transaksi ini sudah dibatalkan sebelumnya.';
  end if;

  for v_item in
    select
      (elem ->> 'productId') as product_id,
      sum((elem ->> 'quantity')::integer)::integer as return_qty
    from jsonb_array_elements(v_trx.items) as elem
    group by (elem ->> 'productId')
    order by (elem ->> 'productId')
  loop
    continue when coalesce(v_item.return_qty, 0) <= 0;

    select * into v_prod
    from public.products
    where id = v_item.product_id
      and owner_id = v_uid
    for update;

    if found then
      v_new_stock := v_prod.stock + v_item.return_qty;

      update public.products
      set stock = v_new_stock,
          updated_at = v_now
      where id = v_prod.id
        and owner_id = v_uid;

      v_updated_products := v_updated_products || jsonb_build_object(
        'id', v_prod.id,
        'stock', v_new_stock,
        'updatedAt', v_now
      );

      v_log_id := 'log-void-' || gen_random_uuid()::text;
      insert into public.stock_logs (
        id, owner_id, product_id, product_name, type, quantity,
        previous_stock, new_stock, reason, created_at, operator
      )
      values (
        v_log_id, v_uid, v_prod.id, v_prod.name, 'IN', v_item.return_qty,
        v_prod.stock, v_new_stock, 'Void Nota ' || v_trx.invoice_no || ': ' || v_reason, v_now, v_email
      );

      v_logs_json := v_logs_json || jsonb_build_object(
        'id', v_log_id,
        'ownerId', v_uid,
        'productId', v_prod.id,
        'productName', v_prod.name,
        'type', 'IN',
        'quantity', v_item.return_qty,
        'previousStock', v_prod.stock,
        'newStock', v_new_stock,
        'reason', 'Void Nota ' || v_trx.invoice_no || ': ' || v_reason,
        'createdAt', v_now,
        'operator', v_email
      );
    end if;
  end loop;

  update public.transactions
  set status = 'VOIDED',
      void_reason = v_reason,
      voided_at = v_now
  where id = p_transaction_id
    and owner_id = v_uid;

  return jsonb_build_object(
    'transactionId', p_transaction_id,
    'voidReason', v_reason,
    'voidedAt', v_now,
    'updated_products', v_updated_products,
    'stock_logs', v_logs_json
  );
end;
$$;

revoke all on function public.void_pos_transaction(text, text, timestamptz) from public;
grant execute on function public.void_pos_transaction(text, text, timestamptz) to authenticated;

-- 4. Atomic Stock Adjustment RPC (Admin only, reads live row lock)
create or replace function public.adjust_product_stock(
  p_product_id text,
  p_quantity integer,
  p_type text,
  p_reason text default null,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(v_jwt -> 'app_metadata' ->> 'role', '');
  v_email text := lower(coalesce(v_jwt ->> 'email', ''));
  v_now timestamptz := coalesce(p_created_at, now());
  v_prod public.products%rowtype;
  v_new_stock integer;
  v_log_qty integer;
  v_clean_reason text;
  v_log_id text;
begin
  if v_uid is null or v_role <> 'admin' then
    raise exception 'Akses ditolak: hanya Administrator yang dapat menyesuaikan stok.';
  end if;

  if p_type not in ('IN', 'OUT', 'ADJUSTMENT') then
    raise exception 'Jenis mutasi stok tidak valid.';
  end if;

  if (p_type = 'ADJUSTMENT' and coalesce(p_quantity, -1) < 0)
     or (p_type <> 'ADJUSTMENT' and coalesce(p_quantity, 0) <= 0) then
    raise exception 'Jumlah penyesuaian stok tidak valid.';
  end if;

  select * into v_prod
  from public.products
  where id = p_product_id
    and owner_id = v_uid
  for update;

  if not found then
    raise exception 'Produk tidak ditemukan.';
  end if;

  if p_type = 'IN' then
    v_new_stock := v_prod.stock + p_quantity;
    v_log_qty := p_quantity;
  elsif p_type = 'OUT' then
    if p_quantity > v_prod.stock then
      raise exception 'Jumlah pengurangan (%) melebihi stok saat ini (%).', p_quantity, v_prod.stock;
    end if;
    v_new_stock := v_prod.stock - p_quantity;
    v_log_qty := p_quantity;
  else
    if p_quantity = v_prod.stock then
      raise exception 'Stok saat ini sudah % %. Ubah nilai untuk melakukan opname.', v_prod.stock, v_prod.unit;
    end if;
    v_new_stock := p_quantity;
    v_log_qty := abs(v_new_stock - v_prod.stock);
  end if;

  v_clean_reason := coalesce(
    nullif(trim(p_reason), ''),
    case
      when p_type = 'IN' then 'Restock barang masuk'
      when p_type = 'OUT' then 'Pengurangan stok rusak/hilang'
      else 'Stok opname fisik gudang'
    end
  );

  update public.products
  set stock = v_new_stock,
      updated_at = v_now
  where id = v_prod.id
    and owner_id = v_uid;

  v_log_id := 'log-' || gen_random_uuid()::text;
  insert into public.stock_logs (
    id, owner_id, product_id, product_name, type, quantity,
    previous_stock, new_stock, reason, created_at, operator
  )
  values (
    v_log_id, v_uid, v_prod.id, v_prod.name, p_type, v_log_qty,
    v_prod.stock, v_new_stock, v_clean_reason, v_now, v_email
  );

  return jsonb_build_object(
    'product', jsonb_build_object(
      'id', v_prod.id,
      'stock', v_new_stock,
      'updatedAt', v_now
    ),
    'stock_log', jsonb_build_object(
      'id', v_log_id,
      'ownerId', v_uid,
      'productId', v_prod.id,
      'productName', v_prod.name,
      'type', p_type,
      'quantity', v_log_qty,
      'previousStock', v_prod.stock,
      'newStock', v_new_stock,
      'reason', v_clean_reason,
      'createdAt', v_now,
      'operator', v_email
    )
  );
end;
$$;

revoke all on function public.adjust_product_stock(text, integer, text, text, timestamptz) from public;
grant execute on function public.adjust_product_stock(text, integer, text, text, timestamptz) to authenticated;
