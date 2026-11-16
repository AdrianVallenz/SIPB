alter policy "products_insert_admin"
  on public.products
  with check ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

alter policy "products_delete_admin"
  on public.products
  using ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

alter policy "transactions_select_role_scoped"
  on public.transactions
  using (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    or cashier_email = ((select auth.jwt()) ->> 'email')
  );

alter policy "transactions_insert_authenticated"
  on public.transactions
  with check (
    (select auth.uid()) is not null
    and cashier_email = ((select auth.jwt()) ->> 'email')
  );

alter policy "transactions_update_admin_void"
  on public.transactions
  using ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );
