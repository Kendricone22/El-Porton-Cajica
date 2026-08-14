-- ==============================================================
--  EL PORTÓN CAJICÁ — Setup del EDITOR DE MENÚ (v2)
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Reemplaza  admin@ejemplo.com  por tu MISMO correo admin
--      (el mismo con el que entras al panel)
--   3) Pega todo y dale "Run".
--
--  Esto crea la tabla del menú y sus reglas de seguridad. Los 43
--  productos NO van aquí: los cargarás con un clic desde el panel
--  ("Importar menú actual"), usando tu sesión de admin.
--
--  Seguridad: TODOS pueden LEER el menú (la web lo necesita para
--  mostrarlo). SOLO tu correo admin puede editar / agregar / borrar.
-- ==============================================================

create table if not exists public.menu_items (
  id          text primary key,        -- ej. "h-sencilla"
  cat         text not null,           -- categoría (hamburguesas, perros, ...)
  sort_order  int  not null default 0, -- orden de aparición
  available   boolean not null default true,  -- disponible / agotado
  data        jsonb not null,          -- el producto completo (nombre, desc, precios, foto...)
  updated_at  timestamptz not null default now()
);

alter table public.menu_items enable row level security;

-- Todos (incluido el público) pueden LEER el menú
create policy "todos leen menu"
  on public.menu_items for select using (true);

-- 👇 Reemplaza admin@ejemplo.com por tu correo admin real (en las 3)
create policy "admin inserta menu"
  on public.menu_items for insert to authenticated
  with check ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

create policy "admin actualiza menu"
  on public.menu_items for update to authenticated
  using      ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' )
  with check ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

create policy "admin borra menu"
  on public.menu_items for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

create index if not exists menu_items_cat_idx on public.menu_items (cat, sort_order);
