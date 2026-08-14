-- ==============================================================
--  EL PORTÓN CAJICÁ — Gráficos de ventas del panel
--
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Pega TODO esto y dale "Run". No hay nada que reemplazar.
--
--  REQUISITO: haber corrido antes `multi-admin-setup.sql` y
--  `fix-admins-recursion.sql` (de ahí sale public.is_admin).
--
--  POR QUÉ ESTO VIVE EN LA BASE Y NO EN EL NAVEGADOR:
--   La API de Supabase devuelve como máximo 1000 filas por consulta.
--   El panel venía leyendo TODOS los pedidos con select('*') para
--   calcular los KPIs: al pasar de 1000 pedidos esos números se
--   quedarían topados y MAL, sin ningún error visible. Con ~20
--   pedidos al día eso pasa en menos de dos meses. Agregando en
--   Postgres el número siempre es exacto y viajan 30 filas, no 1000.
--
--  Criterio de dinero: se excluyen los pedidos 'cancelado', igual
--  que el KPI "Ingreso" que ya existía. Las fechas se cortan en
--  hora de Bogotá (si no, el día arrancaría a las 7 p.m. anterior).
-- ==============================================================

-- ---------- Serie de ventas: por día, semana o mes ----------
-- Devuelve TODOS los periodos del rango, incluidos los de cero, para
-- que la gráfica no salga con huecos.
create or replace function public.ventas_serie(p_gran text default 'dia', p_periodos int default 30)
returns table (inicio date, ingreso bigint, pedidos bigint)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_unit text;
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;

  v_unit := case p_gran when 'semana' then 'week' when 'mes' then 'month' else 'day' end;
  if p_periodos is null or p_periodos < 1 or p_periodos > 120 then p_periodos := 30; end if;

  return query
  with tope as (
    select date_trunc(v_unit, (now() at time zone 'America/Bogota'))::date as t
  ),
  rango as (
    select generate_series(
             (select t from tope) - ((p_periodos - 1) || ' ' || v_unit)::interval,
             (select t from tope),
             ('1 ' || v_unit)::interval
           )::date as inicio
  ),
  ped as (
    select date_trunc(v_unit, (o.created_at at time zone 'America/Bogota'))::date as inicio,
           o.subtotal
    from public.orders o
    where o.status <> 'cancelado'
  )
  select r.inicio,
         coalesce(sum(p.subtotal), 0)::bigint,
         count(p.subtotal)::bigint
  from rango r
  left join ped p on p.inicio = r.inicio
  group by r.inicio
  order by r.inicio;
end;
$$;

-- ---------- Productos más pedidos en la misma ventana ----------
-- Sale de `items` (jsonb) de cada pedido. `unidades` suma cantidades y
-- `ingreso` suma cantidad × precio unitario del momento de la compra.
create or replace function public.ventas_top(p_gran text default 'dia', p_periodos int default 30, p_limite int default 8)
returns table (producto text, categoria text, unidades bigint, ingreso bigint)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_unit  text;
  v_desde date;
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;

  v_unit := case p_gran when 'semana' then 'week' when 'mes' then 'month' else 'day' end;
  if p_periodos is null or p_periodos < 1 or p_periodos > 120 then p_periodos := 30; end if;
  if p_limite  is null or p_limite  < 1 or p_limite  > 50  then p_limite  := 8;  end if;

  v_desde := (date_trunc(v_unit, (now() at time zone 'America/Bogota'))
              - ((p_periodos - 1) || ' ' || v_unit)::interval)::date;

  return query
  select coalesce(it ->> 'name', '(sin nombre)')::text,
         coalesce(it ->> 'cat', '')::text,
         sum(coalesce((it ->> 'qty')::int, 1))::bigint,
         sum(coalesce((it ->> 'qty')::int, 1) * coalesce((it ->> 'unitPrice')::int, 0))::bigint
  from public.orders o
  cross join lateral jsonb_array_elements(o.items) as it
  where o.status <> 'cancelado'
    and (o.created_at at time zone 'America/Bogota')::date >= v_desde
    and jsonb_typeof(o.items) = 'array'
  group by 1, 2
  order by 3 desc, 4 desc
  limit p_limite;
end;
$$;

-- ---------- Totales de arriba (los 4 KPIs) ----------
-- Mismo criterio que tenía el panel, pero exacto pasando las 1000 filas.
create or replace function public.ventas_totales()
returns table (pedidos_totales bigint, pedidos_hoy bigint, ingreso bigint, ticket bigint)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;

  return query
  select count(*)::bigint,
         count(*) filter (
           where (o.created_at at time zone 'America/Bogota')::date
               = (now() at time zone 'America/Bogota')::date
         )::bigint,
         coalesce(sum(o.subtotal) filter (where o.status <> 'cancelado'), 0)::bigint,
         case when count(*) filter (where o.status <> 'cancelado') > 0
              then (coalesce(sum(o.subtotal) filter (where o.status <> 'cancelado'), 0)
                    / count(*) filter (where o.status <> 'cancelado'))::bigint
              else 0::bigint
         end
  from public.orders o;
end;
$$;

-- ---------- Permisos: solo el admin autenticado ----------
revoke all on function public.ventas_serie(text, int)      from public, anon;
revoke all on function public.ventas_top(text, int, int)   from public, anon;
revoke all on function public.ventas_totales()             from public, anon;
grant execute on function public.ventas_serie(text, int)    to authenticated;
grant execute on function public.ventas_top(text, int, int) to authenticated;
grant execute on function public.ventas_totales()           to authenticated;
