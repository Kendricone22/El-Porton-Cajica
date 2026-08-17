'use client';

/* =============================================================
 * SESIÓN DEL PANEL
 *
 * Resuelve en qué pantalla debe estar el administrador:
 *   'cargando'  → todavía se está mirando si hay sesión guardada
 *   'fuera'     → hay que iniciar sesión
 *   'mfa'       → sesión iniciada, falta el código de dos pasos
 *   'dentro'    → acceso completo
 *
 * ⚠️ CAMBIO DELIBERADO RESPECTO A v1 — SEGURIDAD
 *
 * v1 comprueba el segundo factor así:
 *
 *     try { …listFactors()… } catch (e) { return true; }
 *
 * es decir, si la comprobación FALLA, deja pasar al panel. Se hizo para
 * no dejar al administrador fuera de su propio negocio, y como decisión
 * de desarrollo se entiende. Pero en producción es un fallo abierto:
 * cualquier cosa que rompa esa llamada salta el segundo factor.
 *
 * Aquí falla CERRADO y se ofrece reintentar. El motivo de v1 no aplica:
 * un error pasajero se arregla reintentando, y el riesgo real de quedar
 * fuera —perder el teléfono con la app de códigos— no depende de esto
 * (para eso está el panel de Supabase).
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseNavegador } from '@/lib/supabase-navegador';

export type EstadoSesion = 'cargando' | 'fuera' | 'mfa' | 'dentro';

export type SesionAdmin = {
  estado: EstadoSesion;
  sesion: Session | null;
  correo: string | null;
  /** Id del factor TOTP a verificar, cuando el estado es 'mfa'. */
  factorId: string | null;
  error: string | null;
  revisar: () => Promise<void>;
  salir: () => Promise<void>;
};

export function useSesionAdmin(): SesionAdmin {
  const sb = supabaseNavegador();
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [sesion, setSesion] = useState<Session | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Decide el estado a partir de la sesión y del segundo factor. */
  const revisar = useCallback(async () => {
    setError(null);

    const { data: datosSesion } = await sb.auth.getSession();
    const s = datosSesion.session;
    setSesion(s);

    if (!s) {
      setEstado('fuera');
      return;
    }

    try {
      const { data, error: errFactores } = await sb.auth.mfa.listFactors();
      if (errFactores) throw errFactores;

      const verificados = (data.totp ?? []).filter((f) => f.status === 'verified');
      if (!verificados.length) {
        // Nadie activó el segundo paso: se entra directo, como siempre.
        setEstado('dentro');
        return;
      }

      const { data: nivel } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (nivel?.currentLevel === 'aal2') {
        setEstado('dentro');
        return;
      }

      setFactorId(verificados[0].id);
      setEstado('mfa');
    } catch (e) {
      // Falla CERRADO. Ver la nota de arriba.
      console.error('[admin] no se pudo comprobar el segundo factor:', e);
      setError(
        'No pudimos verificar el segundo paso de seguridad. Revisa tu conexión e inténtalo de nuevo.',
      );
      setEstado('fuera');
    }
  }, [sb]);

  useEffect(() => {
    void revisar();

    // Si la sesión caduca o se cierra en otra pestaña, se reevalúa.
    const { data } = sb.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setSesion(null);
        setFactorId(null);
        setEstado('fuera');
      }
    });
    return () => data.subscription.unsubscribe();
  }, [sb, revisar]);

  const salir = useCallback(async () => {
    await sb.auth.signOut();
    setSesion(null);
    setFactorId(null);
    setEstado('fuera');
  }, [sb]);

  return {
    estado,
    sesion,
    correo: sesion?.user?.email ?? null,
    factorId,
    error,
    revisar,
    salir,
  };
}
