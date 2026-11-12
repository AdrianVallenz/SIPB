alter table public.store_payment_settings
  add column if not exists qris_theme text not null default 'classic',
  add column if not exists qris_custom_note text not null default '',
  add column if not exists show_qris_on_receipt boolean not null default true;

