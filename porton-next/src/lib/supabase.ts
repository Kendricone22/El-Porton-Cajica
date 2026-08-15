/* =============================================================
 * ACCESO A SUPABASE DESDE EL SERVIDOR
 *
 * Dos credenciales, dos usos, y NUNCA se confunden:
 *
 *   'publica'  -> la anon key. Respeta las políticas RLS.
 *                 Se usa para leer el menú, que es público por diseño.
 *
 *   'servidor' -> la service_role. SE SALTA TODAS LAS POLÍTICAS RLS.
 *                 Solo para escribir el pedido, y solo DESPUÉS de
 *                 haberlo validado. Jamás sale de este proceso.
 *
 * Se usa `fetch` directamente en vez de @supabase/supabase-js: son dos
 * llamadas HTTP, no compensa una dependencia, y así se ve exactamente
 * qué cabeceras viajan.
 * ============================================================= */

export type Credencial = 'publica' | 'servidor';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLAVE_SERVIDOR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Falla al arrancar si falta configuración, en vez de fallar a mitad de
 * un pedido con un error incomprensible.
 */
function exigir(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `[supabase] Falta la variable de entorno ${nombre}. ` +
        `En local se define en porton-next/.env.local; en producción, en Vercel → Settings → Environment Variables.`,
    );
  }
  return valor;
}

function clave(cred: Credencial): string {
  if (cred === 'servidor') {
    // Cinturón y tirantes: si este módulo acabara alguna vez en un bundle
    // de navegador, la variable sin NEXT_PUBLIC_ sería undefined y esto
    // reventaría de forma ruidosa en vez de fallar en silencio.
    if (typeof window !== 'undefined') {
      throw new Error('[supabase] La clave de servidor no puede usarse desde el navegador.');
    }
    return exigir('SUPABASE_SERVICE_ROLE_KEY', CLAVE_SERVIDOR);
  }
  return exigir('NEXT_PUBLIC_SUPABASE_ANON_KEY', CLAVE_PUBLICA);
}

/**
 * Llamada cruda a la API REST de Supabase (PostgREST).
 *
 * @param ruta  p.ej. '/rest/v1/menu_items?select=data,available'
 * @param cred  qué credencial usar. Por defecto la pública: el permiso
 *              amplio hay que pedirlo a propósito, nunca por descuido.
 */
export async function supabaseRest(
  ruta: string,
  init: RequestInit = {},
  cred: Credencial = 'publica',
): Promise<Response> {
  const base = exigir('NEXT_PUBLIC_SUPABASE_URL', URL_BASE);
  const k = clave(cred);

  return fetch(base + ruta, {
    ...init,
    headers: {
      apikey: k,
      Authorization: `Bearer ${k}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    // El menú y los pedidos son datos vivos: nunca se sirven de caché.
    cache: 'no-store',
  });
}
