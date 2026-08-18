/* =============================================================
 * EDITOR DE MENÚ — tipos y funciones puras
 * ============================================================= */

import type { Categoria, ProductoMenu } from '@/types/menu';

/**
 * Lo que se guarda en la columna `data` de `menu_items`.
 *
 * ⚠️ `img` admite `null` y eso NO es casualidad: al pulsar "Quitar
 * foto" se guarda `null`. Pero la fusión del menú (`conValor` en
 * menu-servidor.ts) DESCARTA los nulos, para que una fila importada al
 * panel antes de que el código tuviera foto no borre la buena.
 *
 * Consecuencia real, heredada de v1: si el plato trae su foto en
 * `data.js`, quitarla desde el panel NO la quita de la web. Para eso
 * hay que quitarla también del código. Se deja igual a propósito.
 */
export type DatosGuardados = Partial<Omit<ProductoMenu, 'img'>> & { img?: string | null };

/** Una fila de la tabla `menu_items` de Supabase. */
export type FilaMenu = {
  id: string;
  cat: string;
  sort_order: number;
  available: boolean;
  data: DatosGuardados;
};

export type OpcionEditable = { label: string; price: number };

export const etiquetaCategoria = (clave: string, cats: Categoria[]): string =>
  cats.find((c) => c.key === clave)?.label ?? clave;

export const emojiCategoria = (clave: string, cats: Categoria[]): string =>
  cats.find((c) => c.key === clave)?.emoji ?? '🍽️';

/** "Desde $13.000" si hay varias opciones, "$13.000" si solo hay una. */
export function textoPrecio(opciones?: OpcionEditable[]): string {
  if (!opciones?.length) return '—';
  const min = Math.min(...opciones.map((o) => Number(o.price) || 0));
  return (opciones.length > 1 ? 'Desde ' : '') + '$' + min.toLocaleString('es-CO');
}

/**
 * Convierte un nombre en un identificador seguro para la base de datos.
 *
 * `normalize('NFD')` separa las tildes de su letra y luego se borran los
 * acentos sueltos, así "Mazorcada Montañera" no acaba con caracteres
 * raros ni pierde letras. Sin eso, la ñ y las tildes desaparecerían y
 * dos platos distintos podrían chocar en el mismo id.
 */
export function generarId(nombre: string): string {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Un id libre: si ya existe, se le añade un sufijo corto. */
export function idDisponible(nombre: string, usados: string[]): string {
  const base = generarId(nombre) || `item-${Date.now().toString(36)}`;
  if (!usados.includes(base)) return base;
  return `${base}-${Date.now().toString(36).slice(-3)}`;
}

/** Agrupa los productos por categoría, en el orden de CATEGORIES. */
export function agruparPorCategoria(
  filas: FilaMenu[],
  cats: Categoria[],
): { cat: string; filas: FilaMenu[] }[] {
  // `string[]` a propósito: las filas de Supabase pueden traer una
  // categoría que ya no exista en el código, y esas también hay que
  // agruparlas (van al final, con indexOf = -1).
  const orden: string[] = cats.map((c) => c.key);
  const grupos = new Map<string, FilaMenu[]>();
  for (const f of filas) {
    const lista = grupos.get(f.cat) ?? [];
    lista.push(f);
    grupos.set(f.cat, lista);
  }
  return [...grupos.entries()]
    .sort((a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0]))
    .map(([cat, filas]) => ({ cat, filas }));
}

/**
 * Limpia las opciones antes de guardar: nombre por defecto "Porción",
 * precio redondeado, y fuera las que no cuestan nada — una opción a $0
 * dejaría añadir el plato gratis.
 */
export function limpiarOpciones(crudas: OpcionEditable[]): OpcionEditable[] {
  return crudas
    .map((o) => ({ label: (o.label || '').trim() || 'Porción', price: Math.round(Number(o.price) || 0) }))
    .filter((o) => o.price > 0);
}

/** Qué impide guardar el producto. */
export function queFaltaEnProducto(nombre: string, opciones: OpcionEditable[]): string[] {
  const falta: string[] = [];
  if (!nombre.trim()) falta.push('Ponle un nombre al producto.');
  if (!limpiarOpciones(opciones).length) falta.push('Agrega al menos una opción con precio mayor a 0.');
  return falta;
}

/** Comprobaciones de la foto antes de subirla. */
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

export function problemaConLaFoto(tipo: string, bytes: number): string | null {
  if (!tipo.startsWith('image/')) return 'Solo se permiten imágenes.';
  if (bytes > MAX_FOTO_BYTES) return 'La imagen pesa más de 5MB, usa una más liviana.';
  return null;
}

/** Nombre del archivo en Storage: id del plato + marca de tiempo. */
export function rutaFoto(idProducto: string | null, nombreArchivo: string, ahora = Date.now()): string {
  const ext = (nombreArchivo.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${idProducto || 'nuevo'}-${ahora}.${ext}`;
}
