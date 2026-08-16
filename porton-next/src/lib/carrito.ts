/* =============================================================
 * LÓGICA DEL CARRITO — funciones puras
 *
 * Aquí no hay React, ni localStorage, ni DOM. Entra un array de
 * items y sale otro array. Mismo criterio que `precio.ts`: lo que
 * decide se separa de lo que habla con el mundo, y así se puede
 * probar exhaustivamente.
 *
 * TODAS devuelven un array NUEVO, nunca modifican el que reciben.
 * En el sitio v1 se mutaba `cartState` en su sitio (`it.qty += 1`);
 * aquí no se puede, y el motivo es de React: si modificas el mismo
 * objeto, React ve la misma referencia, cree que nada cambió y no
 * vuelve a pintar. Es el error número uno al pasar de JS suelto a
 * React.
 * ============================================================= */

import type { ItemCarrito } from '@/types/carrito';

/**
 * Identidad de una combinación. Dos líneas con el mismo hash son el
 * mismo producto configurado igual, así que se suman en cantidad en
 * vez de aparecer dos veces.
 *
 * El formato es EXACTAMENTE el del sitio v1 (app.js), para que un
 * carrito guardado en localStorage por la versión vieja se siga
 * entendiendo. No inventar uno "mejor": rompería esos carritos.
 */
export function hashDe(
  it: Pick<
    ItemCarrito,
    'id' | 'option' | 'combo' | 'drink' | 'proteins' | 'flavors' | 'slice' | 'choices' | 'adiciones' | 'notes'
  >,
): string {
  return [
    it.id,
    it.option,
    it.combo,
    it.drink,
    it.proteins.join('+'),
    it.flavors.join('+'),
    it.slice,
    it.choices.join('+'),
    it.adiciones.map((a) => a.name).join('+'),
    it.notes,
  ].join('|');
}

/** Añade una línea. Si ya existe esa combinación, suma su cantidad. */
export function agregar(items: ItemCarrito[], nuevo: ItemCarrito): ItemCarrito[] {
  const i = items.findIndex((x) => x.hash === nuevo.hash);
  if (i === -1) return [...items, nuevo];

  const copia = [...items];
  copia[i] = { ...copia[i], qty: copia[i].qty + (nuevo.qty || 1) };
  return copia;
}

/**
 * Suma o resta cantidad. Si baja de 1, la línea desaparece —
 * mismo comportamiento que los botones ± del sitio v1.
 */
export function cambiarCantidad(items: ItemCarrito[], hash: string, delta: number): ItemCarrito[] {
  const i = items.findIndex((x) => x.hash === hash);
  if (i === -1) return items;

  const nuevaQty = items[i].qty + delta;
  if (nuevaQty <= 0) return items.filter((x) => x.hash !== hash);

  const copia = [...items];
  copia[i] = { ...copia[i], qty: nuevaQty };
  return copia;
}

export function eliminar(items: ItemCarrito[], hash: string): ItemCarrito[] {
  return items.filter((x) => x.hash !== hash);
}

export function subtotal(items: ItemCarrito[]): number {
  return items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
}

/** Unidades totales, que es lo que muestra la insignia del carrito. */
export function contar(items: ItemCarrito[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

/* -------------------------------------------------------------
 * LECTURA DE localStorage
 *
 * Lo que hay ahí es ENTRADA NO FIABLE: puede venir de la versión
 * vieja del sitio, estar a medias, o haberla editado el usuario a
 * mano. El sitio v1 hacía `JSON.parse` dentro de un try/catch, lo
 * cual evita que reviente pero NO evita que entre basura al carrito
 * (un item sin `hash`, por ejemplo, rompería los botones ±).
 *
 * Aquí se valida item por item y se descarta lo que no cuadre. Que
 * alguien manipule esto no es un problema de dinero — el servidor
 * recalcula el precio en /api/pedidos — pero sí de que la interfaz
 * no se rompa.
 * ----------------------------------------------------------- */

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const listaDeTextos = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function normalizar(crudo: unknown): ItemCarrito | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const o = crudo as Record<string, unknown>;

  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.unitPrice !== 'number' || !Number.isFinite(o.unitPrice) || o.unitPrice < 0) return null;

  const qty = typeof o.qty === 'number' && Number.isInteger(o.qty) && o.qty > 0 ? o.qty : 1;

  const adiciones: { name: string; price: number }[] = Array.isArray(o.adiciones)
    ? o.adiciones
        .map((a) => {
          const x = a as Record<string, unknown>;
          return typeof x?.name === 'string'
            ? { name: x.name, price: typeof x.price === 'number' ? x.price : 0 }
            : null;
        })
        .filter((a): a is { name: string; price: number } => a !== null)
    : [];

  const base = {
    id: o.id,
    name: texto(o.name) || o.id,
    cat: texto(o.cat),
    emoji: texto(o.emoji) || undefined,
    img: typeof o.img === 'string' ? o.img : null,
    option: texto(o.option),
    combo: o.combo === true,
    drink: typeof o.drink === 'string' ? o.drink : null,
    proteins: listaDeTextos(o.proteins),
    flavors: listaDeTextos(o.flavors),
    slice: texto(o.slice),
    choices: listaDeTextos(o.choices),
    adiciones,
    notes: texto(o.notes),
    unitPrice: o.unitPrice,
    qty,
  };

  // El hash se RECALCULA en vez de confiar en el guardado: si viniera
  // uno inventado, dos líneas distintas podrían fusionarse.
  return { ...base, hash: hashDe(base) };
}

/** Convierte el contenido crudo de localStorage en un carrito válido. */
export function leerCarrito(crudo: string | null): ItemCarrito[] {
  if (!crudo) return [];

  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!Array.isArray(datos)) return [];

  // Se vuelven a fusionar por hash: si el guardado traía duplicados,
  // quedan como una sola línea con la cantidad sumada.
  return datos.reduce<ItemCarrito[]>((acc, crudoItem) => {
    const it = normalizar(crudoItem);
    return it ? agregar(acc, it) : acc;
  }, []);
}
