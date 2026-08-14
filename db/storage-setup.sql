-- ==============================================================
--  EL PORTÓN CAJICÁ — Setup del BUCKET DE FOTOS del menú
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Reemplaza  admin@ejemplo.com  por tu MISMO correo admin
--      (el mismo correo que usaste en menu-setup.sql / supabase-setup.sql)
--   3) Pega todo y dale "Run".
--
--  Esto crea un espacio de almacenamiento ("bucket") llamado
--  "menu-photos" donde el panel admin sube las fotos de los
--  productos. Sin esto, el botón "Cambiar foto" del editor de
--  menú va a fallar con un error claro (no rompe nada más).
--
--  Seguridad: TODOS pueden VER las fotos (la web pública las
--  necesita para mostrar el catálogo). SOLO tu correo admin
--  puede subir / reemplazar / borrar fotos.
-- ==============================================================

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

-- Todos (incluido el público) pueden VER las fotos
create policy "todos ven fotos del menu"
  on storage.objects for select
  using (bucket_id = 'menu-photos');

-- 👇 Reemplaza admin@ejemplo.com por tu correo admin real (en las 3)
create policy "admin sube fotos del menu"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') = 'admin@ejemplo.com');

create policy "admin reemplaza fotos del menu"
  on storage.objects for update to authenticated
  using      (bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') = 'admin@ejemplo.com')
  with check (bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') = 'admin@ejemplo.com');

create policy "admin borra fotos del menu"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and (auth.jwt() ->> 'email') = 'admin@ejemplo.com');
