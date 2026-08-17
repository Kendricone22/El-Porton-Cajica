'use client';

/* =============================================================
 * CLIENTE DE SUPABASE PARA EL NAVEGADOR (solo el panel)
 *
 * Se crea UNA sola vez y se reutiliza. Si se creara uno por
 * componente, cada uno tendría su propia copia de la sesión y su
 * propio temporizador de renovación del token: acabarían pisándose.
 *
 * Usa la clave PÚBLICA (anon). Eso no es un descuido:
 *   · La frontera de seguridad son las políticas RLS de la base.
 *   · Al iniciar sesión, Supabase cambia el token por uno del usuario,
 *     y a partir de ahí las consultas van con SU identidad.
 *   · Un visitante sin sesión, con esta misma clave, no puede leer ni
 *     un pedido — verificado contra producción.
 *
 * La clave `service_role` JAMÁS se usa aquí: vive solo en el servidor.
 * ============================================================= */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function supabaseNavegador(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !clave) {
    throw new Error(
      '[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'En local van en porton-next/.env.local; en producción, en Vercel.',
    );
  }

  cliente = createClient(url, clave, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // El panel no llega por enlaces con token en la URL.
      detectSessionInUrl: false,
    },
  });
  return cliente;
}
