-- ==============================================================
--  EL PORTÓN CAJICÁ — Arreglo: "infinite recursion detected in
--  policy for relation admins"
--
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Pega todo esto tal cual (NO hay que reemplazar ningún correo,
--      ya quedaron guardados en la tabla admins la vez anterior)
--   3) Dale "Run"
--
--  Qué pasó: las políticas de "admins" se preguntaban a sí mismas
--  "¿este correo está en la tabla admins?" consultando la MISMA
--  tabla admins — y para responder esa pregunta, Postgres vuelve a
--  aplicar la misma política, que vuelve a preguntar lo mismo, sin
--  parar nunca (recursión infinita).
--
--  Arreglo: una función que consulta la tabla "por fuera" de las
--  reglas de seguridad (evita el ciclo). Todas las políticas que
--  antes preguntaban directamente a la tabla ahora usan esta función.
-- ==============================================================

create or replace function public.is_admin(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where email = p_email);
$$;

revoke all on function public.is_admin(text) from public;
grant execute on function public.is_admin(text) to authenticated;

-- ---------- Tabla ADMINS ----------
drop policy if exists "admins ven la lista" on public.admins;
create policy "admins ven la lista"
  on public.admins for select to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admins agregan administradores" on public.admins;
create policy "admins agregan administradores"
  on public.admins for insert to authenticated
  with check ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admins borran administradores" on public.admins;
create policy "admins borran administradores"
  on public.admins for delete to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

-- ---------- PEDIDOS y EVENTOS ----------
drop policy if exists "admin lee pedidos" on public.orders;
create policy "admin lee pedidos"
  on public.orders for select to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin actualiza pedidos" on public.orders;
create policy "admin actualiza pedidos"
  on public.orders for update to authenticated
  using      ( public.is_admin(auth.jwt() ->> 'email') )
  with check ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin lee eventos" on public.events;
create policy "admin lee eventos"
  on public.events for select to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

-- ---------- MENÚ ----------
drop policy if exists "admin inserta menu" on public.menu_items;
create policy "admin inserta menu"
  on public.menu_items for insert to authenticated
  with check ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin actualiza menu" on public.menu_items;
create policy "admin actualiza menu"
  on public.menu_items for update to authenticated
  using      ( public.is_admin(auth.jwt() ->> 'email') )
  with check ( public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin borra menu" on public.menu_items;
create policy "admin borra menu"
  on public.menu_items for delete to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

-- ---------- FOTOS del menú (Storage) ----------
drop policy if exists "admin sube fotos del menu" on storage.objects;
create policy "admin sube fotos del menu"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'menu-photos' and public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin reemplaza fotos del menu" on storage.objects;
create policy "admin reemplaza fotos del menu"
  on storage.objects for update to authenticated
  using      ( bucket_id = 'menu-photos' and public.is_admin(auth.jwt() ->> 'email') )
  with check ( bucket_id = 'menu-photos' and public.is_admin(auth.jwt() ->> 'email') );

drop policy if exists "admin borra fotos del menu" on storage.objects;
create policy "admin borra fotos del menu"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'menu-photos' and public.is_admin(auth.jwt() ->> 'email') );
