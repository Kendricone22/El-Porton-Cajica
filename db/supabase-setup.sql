-- ==============================================================
--  EL PORTÓN CAJICÁ — Setup de la base de datos del panel admin
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Reemplaza  admin@ejemplo.com  por el correo REAL del admin
--      (el mismo con el que crearás el usuario en Authentication)
--   3) Pega TODO esto y dale "Run".
--
--  Seguridad (RLS): el público (anon) SOLO puede INSERTAR pedidos y
--  eventos, NUNCA leerlos. Únicamente el correo admin autenticado
--  puede leer. Aunque la anon key es pública, nadie puede ver los
--  datos de tus clientes sin iniciar sesión como admin.
-- ==============================================================

-- ---------- Tabla de PEDIDOS ----------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  customer_name    text not null,
  customer_phone   text not null,
  customer_address text not null,
  payment_method   text,
  cash_change      text,
  subtotal         integer not null default 0,
  items            jsonb not null default '[]',
  status           text not null default 'nuevo'   -- nuevo | en_camino | entregado | cancelado
);

-- ---------- Tabla de EVENTOS (embudo/analítica) ----------
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null,   -- add_to_cart | checkout_opened | order_sent
  meta        jsonb
);

-- ---------- Activar Row Level Security ----------
alter table public.orders enable row level security;
alter table public.events enable row level security;

-- ---------- Políticas: el público solo INSERTA ----------
create policy "public inserta pedidos"
  on public.orders for insert to anon with check (true);

create policy "public inserta eventos"
  on public.events for insert to anon with check (true);

-- ---------- Políticas: solo el ADMIN lee ----------
-- 👇 Reemplaza admin@ejemplo.com por tu correo admin real
create policy "admin lee pedidos"
  on public.orders for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

create policy "admin lee eventos"
  on public.events for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

-- ---------- Política: el admin puede cambiar el estado del pedido ----------
create policy "admin actualiza pedidos"
  on public.orders for update to authenticated
  using      ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' )
  with check ( (auth.jwt() ->> 'email') = 'admin@ejemplo.com' );

-- ---------- Índices útiles ----------
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists events_type_idx on public.events (type, created_at desc);
