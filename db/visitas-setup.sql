-- ==============================================================
--  EL PORTÓN CAJICÁ — Registro de visitas a la página
--
--  Cómo usar:
--   1) Supabase → SQL Editor → New query
--   2) Pega TODO esto y dale "Run". (No hay nada que reemplazar:
--      usa la tabla `admins` que ya existe, vía public.is_admin.)
--
--  REQUISITO: haber corrido antes `multi-admin-setup.sql` y
--  `fix-admins-recursion.sql` (de ahí sale public.is_admin).
--
--  Qué mide y qué NO:
--   · PERSONAS  = navegadores distintos (uuid en localStorage).
--                 No es "seres humanos": el mismo señor en celular y
--                 computador cuenta 2, y si borra datos vuelve a contar.
--   · VISITAS   = sesiones. Se corta a los 30 min de inactividad.
--   · VISTAS    = cargas de página (si recarga 5 veces, son 5).
--
--  Privacidad (Ley 1581): NO se guarda IP, ni nombre, ni correo, ni
--  huella del dispositivo. Solo un identificador aleatorio que el
--  propio visitante puede borrar limpiando el navegador. Aun así,
--  conviene mencionarlo en la Política de Tratamiento de Datos.
-- ==============================================================

-- ---------- Tabla de VISITAS ----------
create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  uuid not null,      -- persiste en el navegador  → "personas"
  session_id  uuid not null,      -- caduca a los 30 min       → "visitas"
  path        text,               -- ruta visitada (/, /index.html…)
  referrer    text                -- SOLO el dominio de origen (instagram.com…)
);

alter table public.visits enable row level security;

-- El público solo INSERTA; jamás puede leer (igual que orders/events).
drop policy if exists "public inserta visitas" on public.visits;
create policy "public inserta visitas"
  on public.visits for insert to anon with check (true);

drop policy if exists "admin lee visitas" on public.visits;
create policy "admin lee visitas"
  on public.visits for select to authenticated
  using ( public.is_admin(auth.jwt() ->> 'email') );

-- Índices: las 3 consultas del panel filtran por fecha y agrupan por visitante.
create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_visitor_idx    on public.visits (visitor_id);

-- ==============================================================
--  FUNCIONES DE AGREGACIÓN
--
--  Por qué en la base de datos y no en el navegador:
--   1) PostgREST devuelve máximo 1000 filas por consulta. Con visitas
--      reales eso se pasa en días y los números saldrían MAL (topados),
--      sin ningún error visible.
--   2) Las personas únicas NO se pueden sumar por día: alguien que
--      entra lunes y martes es 1 persona en la semana, no 2. El conteo
--      distinto tiene que hacerse sobre el periodo completo.
--
--  Son `security definer` (se saltan RLS), así que cada una verifica
--  is_admin de entrada y se le revoca el permiso a anon.
--  Las fechas se cortan en hora de Bogotá, no en UTC: si no, "hoy"
--  arrancaría a las 7 p.m. del día anterior.
-- ==============================================================

-- ---------- Resumen: hoy / últimos 7 días / últimos 30 días ----------
create or replace function public.visitas_resumen()
returns table (periodo text, personas bigint, visitas bigint, vistas bigint)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;

  return query
  with b as (
    select v.visitor_id, v.session_id,
           (v.created_at at time zone 'America/Bogota')::date as d
    from public.visits v
  ),
  hoy as (select (now() at time zone 'America/Bogota')::date as d)
  select 'hoy'::text, count(distinct b.visitor_id), count(distinct b.session_id), count(*)
    from b, hoy where b.d = hoy.d
  union all
  select 'semana'::text, count(distinct b.visitor_id), count(distinct b.session_id), count(*)
    from b, hoy where b.d >= hoy.d - 6
  union all
  select 'mes'::text, count(distinct b.visitor_id), count(distinct b.session_id), count(*)
    from b, hoy where b.d >= hoy.d - 29;
end;
$$;

-- ---------- Serie diaria (para la gráfica de barras) ----------
-- Devuelve TODOS los días del rango, incluidos los de cero, para que la
-- gráfica no se vea con huecos.
create or replace function public.visitas_serie(dias int default 30)
returns table (dia date, personas bigint, visitas bigint, vistas bigint)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;
  if dias is null or dias < 1 or dias > 365 then dias := 30; end if;

  return query
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  rango as (
    select generate_series((select d from hoy) - (dias - 1), (select d from hoy), interval '1 day')::date as dia
  ),
  b as (
    select v.visitor_id, v.session_id,
           (v.created_at at time zone 'America/Bogota')::date as d
    from public.visits v
    where (v.created_at at time zone 'America/Bogota')::date >= (select d from hoy) - (dias - 1)
  )
  select r.dia,
         count(distinct b.visitor_id),
         count(distinct b.session_id),
         count(b.visitor_id)
  from rango r left join b on b.d = r.dia
  group by r.dia
  order by r.dia;
end;
$$;

-- ---------- Recurrencia: ¿cuántas veces vuelve la gente? ----------
-- Agrupa a las personas del periodo según cuántas VISITAS distintas hicieron.
create or replace function public.visitas_recurrencia(dias int default 30)
returns table (tramo text, personas bigint)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_admin(auth.jwt() ->> 'email') then
    raise exception 'no autorizado';
  end if;
  if dias is null or dias < 1 or dias > 365 then dias := 30; end if;

  return query
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  por_persona as (
    select v.visitor_id, count(distinct v.session_id) as n
    from public.visits v
    where (v.created_at at time zone 'America/Bogota')::date >= (select d from hoy) - (dias - 1)
    group by v.visitor_id
  ),
  clasificado as (
    select case when n = 1 then '1 vez'
                when n between 2 and 3 then '2-3 veces'
                else '4 o más' end as tramo,
           case when n = 1 then 1 when n between 2 and 3 then 2 else 3 end as orden
    from por_persona
  )
  select c.tramo, count(*)::bigint
  from clasificado c
  group by c.tramo, c.orden
  order by c.orden;
end;
$$;

-- ---------- Permisos: solo el admin autenticado puede llamarlas ----------
revoke all on function public.visitas_resumen()          from public, anon;
revoke all on function public.visitas_serie(int)         from public, anon;
revoke all on function public.visitas_recurrencia(int)   from public, anon;
grant execute on function public.visitas_resumen()        to authenticated;
grant execute on function public.visitas_serie(int)       to authenticated;
grant execute on function public.visitas_recurrencia(int) to authenticated;

-- ==============================================================
--  LIMPIEZA (opcional, recomendada)
--  Una fila por carga de página crece rápido. Esto borra lo que pase
--  de 1 año. Córrelo a mano de vez en cuando, o progrÁmalo con pg_cron
--  si algún día activas esa extensión.
--
--    delete from public.visits where created_at < now() - interval '1 year';
-- ==============================================================
