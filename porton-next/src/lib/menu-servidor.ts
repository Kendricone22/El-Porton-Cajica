/* =============================================================
 * EL MENÚ, VISTO DESDE EL SERVIDOR — con tres capas de respaldo
 *
 * Replica las reglas de fusión de `initMenuSync` (js/app.js) para que
 * el precio que valida el servidor sea el mismo que ve el cliente:
 *
 *   El CÓDIGO manda en qué platos existen y sus valores por defecto.
 *   SUPABASE manda en lo que el dueño edita desde el panel
 *   (precio, descripción, agotado, foto) y en los platos que él crea.
 *
 * -------------------------------------------------------------
 * POR QUÉ TRES CAPAS Y NO UN TEMPORIZADOR
 *
 * En Vercel no hay un servidor encendido de forma permanente: cada
 * petición puede caer en una instancia recién arrancada, y entre
 * peticiones no corre ningún proceso de fondo. Un `setInterval` que
 * refresque el menú cada 5 minutos NO funcionaría: se ejecutaría a
 * veces, nunca, o en veinte instancias a la vez.
 *
 * Lo que sí funciona:
 *
 *   Capa 1 · Caché de datos de Next  → se comparte entre invocaciones,
 *            incluso entre instancias distintas. Es la que evita la
 *            mayoría de las llamadas a Supabase.
 *   Capa 2 · Memoria del proceso     → el último menú bueno que vio
 *            ESTA instancia. Cubre el caso de que Supabase caiga
 *            estando la instancia caliente.
 *   Capa 3 · El menú del código      → va dentro del bundle. No puede
 *            fallar nunca, ni con Supabase apagado del todo.
 *
 * Cuál se usó se devuelve en `origen`, para que quede en el log y en la
 * respuesta. Si alguna vez hay que investigar un precio raro, ese campo
 * dice exactamente de dónde salió.
 * ============================================================= */

import { MENU } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';
import { supabaseRest } from '@/lib/supabase';

/** Cada cuánto se considera vieja la copia de la capa 1 (segundos). */
const REVALIDAR_S = 30;

/** Cuánto se acepta servir desde la memoria del proceso (ms). */
const MAX_EDAD_MEMORIA_MS = 15 * 60 * 1000; // 15 minutos

export type OrigenMenu = 'supabase' | 'memoria' | 'codigo';

export type MenuResuelto = {
  menu: ProductoMenu[];
  origen: OrigenMenu;
  /** Antigüedad de la copia en memoria, si se usó esa capa. */
  edadMs: number | null;
};

type FilaMenu = {
  data: Partial<ProductoMenu> | null;
  available: boolean | null;
};

/* --- Capa 2: sobrevive entre peticiones mientras la instancia siga viva --- */
let ultimoBueno: { menu: ProductoMenu[]; ts: number } | null = null;

/**
 * Descarta las claves sin valor que venga del panel.
 *
 * Si un plato se importó al panel ANTES de que el código le pusiera,
 * por ejemplo, la foto, la fila remota trae `img: null`. Sin este
 * filtro, ese null pisaría la foto buena.
 * (Es exactamente el `conValor()` de app.js.)
 */
function conValor<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Aplica las reglas de fusión sobre las filas que devolvió Supabase. */
function fusionar(filas: FilaMenu[]): ProductoMenu[] {
  const remotos = new Map<string, ProductoMenu>();
  for (const f of filas) {
    if (!f?.data?.id) continue;
    remotos.set(f.data.id, { ...f.data, available: f.available } as ProductoMenu);
  }

  const fusion: ProductoMenu[] = [];

  // 1) Todo lo que existe en el código, con lo editado en el panel encima.
  for (const base of MENU) {
    const r = remotos.get(base.id);
    fusion.push(r ? { ...base, ...conValor(r) } : base);
    remotos.delete(base.id);
  }

  // 2) Y los platos creados desde el panel, que no están en el código.
  for (const r of remotos.values()) fusion.push(r);

  return fusion;
}

/** Un intento de lectura. Lanza si algo va mal. */
async function leerDeSupabase(): Promise<ProductoMenu[]> {
  const res = await supabaseRest('/rest/v1/menu_items?select=data,available&order=sort_order.asc', {
    // Capa 1: caché compartida entre invocaciones.
    next: { revalidate: REVALIDAR_S },
  } as RequestInit);

  if (!res.ok) throw new Error(`Supabase respondió ${res.status} al leer menu_items.`);

  const filas: unknown = await res.json();
  if (!Array.isArray(filas)) throw new Error('Respuesta inesperada de menu_items (no es una lista).');

  // Tabla vacía = el panel nunca importó el menú. No es un error:
  // el menú del código es la fuente válida en ese caso.
  if (filas.length === 0) return MENU;

  return fusionar(filas as FilaMenu[]);
}

/**
 * Devuelve el menú efectivo. **Nunca lanza**: en el peor de los casos
 * cae al menú del código, que va en el bundle y siempre está.
 *
 * Un solo reintento rápido: los fallos de red suelen ser instantáneos y
 * transitorios. Más reintentos solo alargarían la espera del cliente.
 */
export async function obtenerMenu(): Promise<MenuResuelto> {
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const menu = await leerDeSupabase();
      ultimoBueno = { menu, ts: Date.now() };
      return { menu, origen: 'supabase', edadMs: null };
    } catch (e) {
      if (intento === 1) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      console.error('[menu] no se pudo leer de Supabase tras 2 intentos:', e);
    }
  }

  // Capa 2
  if (ultimoBueno) {
    const edadMs = Date.now() - ultimoBueno.ts;
    if (edadMs <= MAX_EDAD_MEMORIA_MS) {
      console.warn(`[menu] sirviendo desde memoria del proceso (${Math.round(edadMs / 1000)}s de antigüedad).`);
      return { menu: ultimoBueno.menu, origen: 'memoria', edadMs };
    }
    console.warn(`[menu] la copia en memoria tiene ${Math.round(edadMs / 60000)} min; se descarta.`);
  }

  // Capa 3 — no puede fallar.
  console.warn('[menu] usando el menú del CÓDIGO. Los precios editados en el panel no se están aplicando.');
  return { menu: MENU, origen: 'codigo', edadMs: null };
}
