-- ==============================================================
--  EL PORTÓN CAJICÁ — Habilitar VARIOS administradores
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Reemplaza  TU-CORREO-AQUI@ejemplo.com  por TU correo admin
--      actual (el que ya usas para entrar al panel)
--   3) Pega todo y dale "Run"
--
--  Qué hace: crea una tabla "admins" (lista de correos permitidos) y
--  cambia TODAS las políticas de seguridad que antes solo aceptaban
--  UN correo fijo, para que ahora acepten a cualquiera que esté en
--  esa lista. Después de correr esto, agregar un jefe nuevo es un
--  solo INSERT (ver el final de este archivo) — no hay que tocar
--  ninguna política de seguridad nunca más.
--
--  IMPORTANTE: esto NO crea las cuentas de tus jefes. Eso se hace
--  aparte, invitándolos desde Supabase → Authentication → Users →
--  "Invite user" (les llega un correo y ellos ponen su propia clave).
-- ==============================================================

-- ---------- Tabla de administradores permitidos ----------
create table if not exists public.admins (
  email      text primary key,
  added_at   timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Cualquier admin ya en la lista puede ver/gestionar la lista
drop policy if exists "admins ven la lista" on public.admins;
create policy "admins ven la lista"
  on public.admins for select to authenticated
  using ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admins agregan administradores" on public.admins;
create policy "admins agregan administradores"
  on public.admins for insert to authenticated
  with check ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admins borran administradores" on public.admins;
create policy "admins borran administradores"
  on public.admins for delete to authenticated
  using ( (auth.jwt() ->> 'email') in (select email from public.admins) );

-- 👇 Siembra con TU correo actual (así no te quedas afuera)
insert into public.admins (email) values ('TU-CORREO-AQUI@ejemplo.com')
on conflict (email) do nothing;

-- ---------- Migrar políticas de PEDIDOS y EVENTOS ----------
drop policy if exists "admin lee pedidos" on public.orders;
create policy "admin lee pedidos"
  on public.orders for select to authenticated
  using ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin actualiza pedidos" on public.orders;
create policy "admin actualiza pedidos"
  on public.orders for update to authenticated
  using      ( (auth.jwt() ->> 'email') in (select email from public.admins) )
  with check ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin lee eventos" on public.events;
create policy "admin lee eventos"
  on public.events for select to authenticated
  using ( (auth.jwt() ->> 'email') in (select email from public.admins) );

-- ---------- Migrar políticas del MENÚ ----------
drop policy if exists "admin inserta menu" on public.menu_items;
create policy "admin inserta menu"
  on public.menu_items for insert to authenticated
  with check ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin actualiza menu" on public.menu_items;
create policy "admin actualiza menu"
  on public.menu_items for update to authenticated
  using      ( (auth.jwt() ->> 'email') in (select email from public.admins) )
  with check ( (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin borra menu" on public.menu_items;
create policy "admin borra menu"
  on public.menu_items for delete to authenticated
  using ( (auth.jwt() ->> 'email') in (select email from public.admins) );

-- ---------- Migrar políticas de FOTOS del menú (Storage) ----------
drop policy if exists "admin sube fotos del menu" on storage.objects;
create policy "admin sube fotos del menu"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin reemplaza fotos del menu" on storage.objects;
create policy "admin reemplaza fotos del menu"
  on storage.objects for update to authenticated
  using      ( bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') in (select email from public.admins) )
  with check ( bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') in (select email from public.admins) );

drop policy if exists "admin borra fotos del menu" on storage.objects;
create policy "admin borra fotos del menu"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') in (select email from public.admins) );

-- ==============================================================
--  PARA AGREGAR UN JEFE DESPUÉS DE INVITARLO (repite esto por cada uno):
--
--  insert into public.admins (email) values ('correo-del-jefe@ejemplo.com');
--
--  Para QUITAR a alguien:
--  delete from public.admins where email = 'correo-a-quitar@ejemplo.com';
-- ==============================================================
