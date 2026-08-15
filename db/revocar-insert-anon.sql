-- ==============================================================
--  EL PORTÓN CAJICÁ — Cerrar la puerta vieja de los pedidos
--
--  ⛔⛔⛔  NO CORRAS ESTE ARCHIVO TODAVÍA  ⛔⛔⛔
--
--  Este script le quita a `anon` el permiso de INSERT sobre `orders`.
--  Ese permiso es EL QUE USA EL SITIO EN VIVO ACTUAL para registrar
--  los pedidos.
--
--  Si lo corres antes de que la versión Next esté sirviendo el sitio:
--    · el cliente arma su pedido y WhatsApp se abre con normalidad
--    · pero el pedido NO se guarda en ninguna parte
--    · y NO sale ningún error, porque el registro es fire-and-forget
--    · resultado: panel vacío, cero analítica, y nadie se entera
--
--  CUÁNDO SÍ CORRERLO — en este orden exacto:
--    1) Vercel ya sirve la versión Next en el dominio real
--    2) Haces un pedido de prueba REAL en el sitio nuevo
--    3) Compruebas que ese pedido aparece en el panel
--    4) *Ahora sí* pegas esto y le das Run
--    5) Repites otro pedido de prueba y compruebas que sigue llegando
--
--  Si algo sale mal después de correrlo, al final de este archivo está
--  el script para devolverlo todo como estaba.
-- ==============================================================


-- --------------------------------------------------------------
--  POR QUÉ HACE FALTA
--
--  La política actual (supabase-setup.sql, línea 43) es:
--
--      on public.orders for insert to anon with check (true)
--
--  `with check (true)` significa literalmente "acepta cualquier fila
--  que mande cualquiera". Como la clave anon viaja en el JavaScript
--  del navegador (y es pública por diseño), cualquier persona puede
--  insertar un pedido con el precio que se le antoje — incluido $0.
--
--  A partir de aquí, la única forma de crear un pedido es el endpoint
--  POST /api/pedidos, que recalcula el total con los precios reales de
--  `menu_items` y escribe con la clave `service_role` (que vive solo en
--  el servidor y se salta RLS).
-- --------------------------------------------------------------

-- 1) Quitar TODA política de INSERT que haya sobre `orders`.
--
--    Hoy se llama "public inserta pedidos" (supabase-setup.sql:42), pero
--    no se pone el nombre a mano a propósito: si el nombre no coincidiera,
--    `drop policy if exists` no haría NADA y parecería que funcionó.
--    Este bloque las busca en el catálogo y avisa de cuál eliminó.
do $$
declare
  p record;
  n int := 0;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'orders' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.orders', p.policyname);
    raise notice 'Política de INSERT eliminada: %', p.policyname;
    n := n + 1;
  end loop;

  if n = 0 then
    raise notice 'No había ninguna política de INSERT sobre orders (¿ya se corrió esto?).';
  end if;
end $$;


-- 2) Dejar constancia de que la tabla sigue con RLS activo.
--    (Ya lo estaba; esto es idempotente y sirve de red de seguridad:
--    sin RLS, quitar la política no serviría de nada.)
alter table public.orders enable row level security;


-- 3) Comprobación: qué políticas quedan sobre `orders`.
--    Lo esperado después de correr esto son SOLO las de admin
--    (select y update para `authenticated`), y NINGUNA de insert.
select
  policyname  as politica,
  roles,
  cmd         as operacion,
  qual        as condicion_lectura,
  with_check  as condicion_escritura
from pg_policies
where schemaname = 'public' and tablename = 'orders'
order by cmd, policyname;


-- ==============================================================
--  NOTA SOBRE LA TABLA `events`
--
--  `events` (add_to_cart, checkout_opened, order_sent) conserva su
--  INSERT para anon A PROPÓSITO. Son eventos de analítica que salen
--  del navegador y no llevan dinero asociado: lo peor que puede pasar
--  es que alguien ensucie las estadísticas.
--
--  Si algún día se quiere cerrar también, hay que enrutar la analítica
--  por el servidor primero — mismo patrón: abrir la puerta nueva antes
--  de cerrar la vieja.
-- ==============================================================


-- ==============================================================
--  MARCHA ATRÁS (solo si hay que volver al sitio viejo)
--
--  Descomenta y corre esto para restaurar EXACTAMENTE la política que
--  había antes (mismo nombre que en supabase-setup.sql:42, para que el
--  esquema quede idéntico al de origen):
--
--  create policy "public inserta pedidos"
--    on public.orders for insert to anon with check (true);
-- ==============================================================
