/* =============================================================
 * LÓGICA DEL CATÁLOGO — funciones puras
 *
 * Las reglas de qué se ve y cómo, separadas de cómo se pinta.
 * Portadas de `initCatalogo` (js/app.js) sin cambiar el criterio.
 * ============================================================= */

import { ADICIONES } from '@/data/menu';
import type { Categoria, ProductoMenu } from '@/types/menu';

/** Platos visibles antes del botón "Mostrar más". */
export const LIMITE_VISIBLES = 8;

/** Un plato se muestra salvo que el panel lo haya marcado agotado. */
export const estaDisponible = (p: ProductoMenu): boolean => p.available !== false;

/**
 * Solo se pintan las pestañas de categorías que tienen algo que enseñar.
 *
 * Importa por el menú en vivo: si Supabase todavía no trae una categoría
 * (o se agotó entera), su pestaña no debe aparecer para luego abrir una
 * sección vacía. Si NINGUNA tuviera productos se devuelven todas, para
 * no dejar la barra de filtros en blanco.
 */
export function categoriasConProductos(
  menu: ProductoMenu[],
  categorias: Categoria[],
): Categoria[] {
  const conAlgo = categorias.filter((c) => menu.some((p) => p.cat === c.key && estaDisponible(p)));
  return conAlgo.length ? conAlgo : categorias;
}

export function productosDe(menu: ProductoMenu[], cat: string): ProductoMenu[] {
  return menu.filter((p) => p.cat === cat && estaDisponible(p));
}

/** El precio más bajo de todas sus opciones. */
export function precioDesde(p: ProductoMenu): number {
  return Math.min(...p.options.map((o) => o.price));
}

/** Si hay varias opciones, el precio se muestra como "Desde $X". */
export const tieneVariosPrecios = (p: ProductoMenu): boolean => p.options.length > 1;

/**
 * El botón dice "Personalizar" solo si hay algo que elegir. Una cerveza
 * o un agua no se personalizan, así que ahí dice "Agregar" (el PRD
 * contempla los dos textos). El modal se abre igual en los dos casos:
 * sirve para la cantidad y las notas.
 */
export function esPersonalizable(p: ProductoMenu): boolean {
  return (
    p.options.length > 1 ||
    !!p.choices ||
    !!p.proteins ||
    !!p.pizza ||
    !!p.slices ||
    !!p.combo ||
    ADICIONES.some((a) => a.cats.includes(p.cat))
  );
}

/**
 * Retraso escalonado de la animación de entrada: cada tarjeta entra
 * 40 ms después de la anterior, con tope para que una lista larga no se
 * sienta lenta.
 */
export const retrasoCascada = (indice: number): string =>
  `${Math.min(indice * 40, 320)}ms`;
