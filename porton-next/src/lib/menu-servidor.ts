/* =============================================================
 * EL MENÚ, VISTO DESDE EL SERVIDOR
 *
 * Replica las reglas de fusión de `initMenuSync` (js/app.js) para que
 * el precio que valida el servidor sea EXACTAMENTE el mismo que ve el
 * cliente en pantalla. Si las dos reglas se separan, el endpoint
 * empezaría a rechazar pedidos legítimos.
 *
 *   El CÓDIGO manda en qué platos existen y sus valores por defecto.
 *   SUPABASE manda en lo que el dueño edita desde el panel
 *   (precio, descripción, agotado, foto) y en los platos que él crea.
 *
 * ⚠️ UNA DIFERENCIA DELIBERADA CON EL CLIENTE:
 * en el navegador, si Supabase falla se usa el menú del código y no
 * pasa nada grave. Aquí NO: este módulo lanza. Cobrar con precios
 * potencialmente desactualizados sería justo el fallo que este
 * endpoint existe para evitar. Y en la práctica, si no se puede leer
 * `menu_items` tampoco se va a poder escribir el pedido.
 * ============================================================= */

import { MENU } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';
import { supabaseRest } from '@/lib/supabase';

type FilaMenu = {
  data: Partial<ProductoMenu> | null;
  available: boolean | null;
};

/**
 * Descarta las claves sin valor que venga del panel.
 *
 * Por qué importa: si un plato se importó al panel ANTES de que el
 * código le pusiera, por ejemplo, la foto, la fila remota trae
 * `img: null`. Sin este filtro, ese null pisaría la foto buena.
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

/**
 * Devuelve el menú efectivo: el del código con las ediciones del panel
 * encima, más los platos creados desde el panel.
 *
 * @throws si Supabase no responde o responde con error.
 */
export async function obtenerMenu(): Promise<ProductoMenu[]> {
  const res = await supabaseRest(
    '/rest/v1/menu_items?select=data,available&order=sort_order.asc',
  );

  if (!res.ok) {
    throw new Error(`[menu] Supabase respondió ${res.status} al leer menu_items.`);
  }

  const filas: unknown = await res.json();
  if (!Array.isArray(filas)) {
    throw new Error('[menu] Respuesta inesperada de menu_items (no es una lista).');
  }

  // Tabla vacía = el panel nunca importó el menú. No es un error:
  // el menú del código es la fuente válida en ese caso.
  if (filas.length === 0) return MENU;

  const remotos = new Map<string, ProductoMenu>();
  for (const f of filas as FilaMenu[]) {
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
