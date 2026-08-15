# Esquema de la base de datos — El Portón Cajicá

Todo lo que define la base de datos de producción en Supabase vive aquí.
Hasta hoy estos archivos existían **solo en una carpeta local sin git**: si ese
disco fallaba, la estructura de la base de datos de producción se perdía.

Estos scripts **no se despliegan** (ver `.vercelignore`). Se pegan a mano en
Supabase → SQL Editor → New query.

## Orden de ejecución

Si algún día hay que reconstruir el proyecto desde cero, hay que correrlos
**en este orden** — varios dependen de tablas creadas por los anteriores:

| # | Archivo | Qué crea | Estado en producción |
|---|---------|----------|----------------------|
| 1 | `supabase-setup.sql` | Tablas `orders` y `events` + RLS | ✅ aplicado 2026-07-17 |
| 2 | `menu-setup.sql` | Tabla `menu_items` (menú editable) + RLS | ✅ aplicado 2026-07-18 |
| 3 | `storage-setup.sql` | Bucket `menu-photos` + políticas de Storage | ✅ aplicado 2026-07-19 |
| 4 | `multi-admin-setup.sql` | Tabla `admins` + migra TODAS las políticas al allowlist | ✅ aplicado 2026-07-20 |
| 5 | `fix-admins-recursion.sql` | Función `is_admin()` — arregla la recursión infinita | ✅ aplicado 2026-07-20 |
| 6 | `visitas-setup.sql` | Tabla `visits` + `visitas_resumen()` / `visitas_serie()` | ✅ aplicado 2026-08-01 |
| 7 | `analitica-setup.sql` | `ventas_serie()` / `ventas_totales()` | ✅ aplicado (confirmado 2026-08-14) |

**Los 7 están aplicados.**

### Cómo se comprueba si una función existe (sin entrar al panel)

Llamándola por la API REST y mirando **el código de error**, no el HTTP:

- `PGRST202` + *"Could not find the function … in the schema cache"* → **no existe**.
- `P0001` → **sí existe**: ese código es una excepción lanzada desde dentro del
  cuerpo de la función, así que llegó a ejecutarse.

Las cuatro funciones de reporte (`ventas_totales`, `ventas_serie`,
`visitas_resumen`, `visitas_serie`) responden `P0001: "no autorizado"` incluso
usando la clave `service_role`. **Eso es correcto y es a propósito:** comprueban
la identidad del usuario (`auth.jwt() ->> 'email'` contra `is_admin()`), no el
rol de la conexión. Una clave de servicio no lleva correo, así que tampoco pasa.
Solo un admin con sesión iniciada obtiene datos.

## Ojo con dos cosas

**1. Los archivos 1, 2 y 3 están superados por el 4 y el 5.**
Escribieron sus políticas RLS con un único correo admin escrito a mano
(`(auth.jwt() ->> 'email') = 'admin@ejemplo.com'`). El archivo 4 las reemplaza
por una comprobación contra la tabla `admins`, y el 5 la reescribe otra vez
para usar `public.is_admin()`. **El estado correcto de las políticas es el que
dejan el 4 y el 5**, no el de los tres primeros. Se conservan igual porque son
los que crean las tablas.

**2. Hay que reemplazar los correos de ejemplo antes de correrlos.**
Los archivos 1-4 traen marcadores (`admin@ejemplo.com`,
`TU-CORREO-AQUI@ejemplo.com`) que hay que cambiar por el correo real del admin.
Se dejan como marcador a propósito para no meter datos personales en git.
Los archivos 5, 6 y 7 no tienen nada que reemplazar.

## Por qué la recursión del archivo 5

La primera versión de las políticas de `public.admins` consultaba
`select email from public.admins` dentro de una política **sobre esa misma
tabla**: Postgres vuelve a aplicar la política a la subconsulta y recursa
infinitamente. `fix-admins-recursion.sql` lo resuelve con una función
`security definer` (corre como su dueño, así que se salta RLS). El mismo patrón
malo se había copiado a las políticas de `orders`, `events`, `menu_items` y
`storage.objects`, así que el arreglo las reescribe todas.
