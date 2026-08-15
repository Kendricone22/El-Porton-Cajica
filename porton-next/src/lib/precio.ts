/* =============================================================
 * CÁLCULO Y VALIDACIÓN DEL PRECIO — la pieza crítica
 *
 * Reproduce la fórmula que hoy vive en el navegador (`recalc()` en
 * js/app.js), pero aquí es la que MANDA:
 *
 *   unitPrice = precio de la opción elegida
 *             + COMBO_PRICE si lleva combo
 *             + suma de las adiciones
 *
 * Los sabores de pizza, los trozos, las proteínas y los `choices`
 * NO alteran el precio (verificado leyendo app.js).
 *
 * Esta función es PURA: no toca la red ni la base de datos. Recibe el
 * menú ya resuelto y el pedido que llegó, y devuelve números. Por eso
 * se puede probar exhaustivamente sin levantar nada.
 *
 * REGLA DE ORO: los precios que entran en la suma salen SIEMPRE del
 * menú y de la tabla de adiciones del servidor. Los que manda el
 * navegador solo se usan para compararlos y avisar; jamás para cobrar.
 * ============================================================= */

import { ADICIONES, COMBO_PRICE, COMBO_DRINKS } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';

/** Topes para que un pedido absurdo no llegue nunca a la base de datos. */
export const MAX_LINEAS = 40;
export const MAX_QTY = 30;

export type LineaValidada = {
  id: string;
  name: string;
  cat: string;
  qty: number;
  option: string;
  combo: boolean;
  drink: string | null;
  adiciones: { name: string; price: number }[];
  /** Calculado por el servidor. Es el que vale. */
  unitPrice: number;
  totalLinea: number;
};

export type Resultado =
  | { ok: true; lineas: LineaValidada[]; subtotal: number; avisos: string[] }
  | { ok: false; errores: string[] };

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const esEnteroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Valida el pedido entrante contra el menú real y recalcula el total.
 *
 * `items` llega como `unknown` a propósito: viene de la red, así que no
 * se puede dar por hecha ninguna forma. Todo se comprueba.
 */
export function validarPedido(items: unknown, menu: ProductoMenu[]): Resultado {
  const errores: string[] = [];
  const avisos: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, errores: ['El pedido no trae productos.'] };
  }
  if (items.length > MAX_LINEAS) {
    return { ok: false, errores: [`El pedido trae ${items.length} líneas; el máximo es ${MAX_LINEAS}.`] };
  }

  const porId = new Map(menu.map((p) => [p.id, p]));
  const adicionesPorNombre = new Map(ADICIONES.map((a) => [a.name, a]));
  const lineas: LineaValidada[] = [];

  items.forEach((crudo, i) => {
    const n = i + 1;
    const linea = crudo as Record<string, unknown>;
    const fallo = (msg: string) => errores.push(`Línea ${n}: ${msg}`);

    /* --- el producto existe y se puede pedir --- */
    if (!esTexto(linea?.id)) return fallo('no trae identificador de producto.');
    const item = porId.get(linea.id);
    if (!item) return fallo(`el producto "${linea.id}" no existe en el menú.`);
    if (item.available === false) return fallo(`"${item.name}" está agotado.`);

    /* --- cantidad ---
       `null` y `undefined` se tratan igual: "no especificado" → 1.
       Es DELIBERADO y no es un descuido del operador `??`: rechazar un
       pedido por un campo mal formado sería perder una venta, y 1 es el
       mínimo posible, así que esta leniencia nunca puede inflar el cobro.
       Cualquier otro valor raro (0, negativo, decimal, texto) SÍ se
       rechaza, porque ahí ya no se puede adivinar la intención. */
    const qty = linea.qty === undefined || linea.qty === null ? 1 : linea.qty;
    if (!esEnteroEntre(qty, 1, MAX_QTY)) {
      return fallo(`cantidad inválida para "${item.name}" (debe ser un entero entre 1 y ${MAX_QTY}).`);
    }

    /* --- opción de precio ---
       El cliente manda la ETIQUETA, no el precio. Si no manda ninguna,
       se usa la primera, igual que hace el modal por defecto. */
    const etiqueta = esTexto(linea.option) ? linea.option : item.options[0].label;
    const opcion = item.options.find((o) => o.label === etiqueta);
    if (!opcion) {
      return fallo(`la opción "${etiqueta}" no existe para "${item.name}".`);
    }

    /* --- combo --- */
    const combo = linea.combo === true;
    if (combo && !item.combo) {
      return fallo(`"${item.name}" no admite combo.`);
    }
    let drink: string | null = null;
    if (combo) {
      if (!esTexto(linea.drink)) return fallo(`el combo de "${item.name}" no trae bebida.`);
      if (!COMBO_DRINKS.includes(linea.drink)) {
        return fallo(`la bebida "${linea.drink}" no es una de las del combo.`);
      }
      drink = linea.drink;
    }

    /* --- adiciones ---
       Se buscan por nombre en la tabla del SERVIDOR. El precio que venga
       en el pedido se ignora por completo. Además se comprueba que la
       adición aplique a la categoría del producto. */
    const adiciones: { name: string; price: number }[] = [];
    const vistas = new Set<string>();
    const crudas = linea.adiciones;
    if (crudas !== undefined && !Array.isArray(crudas)) {
      return fallo('el campo de adiciones no es una lista.');
    }
    for (const a of (crudas ?? []) as unknown[]) {
      const nombre = esTexto(a) ? a : esTexto((a as Record<string, unknown>)?.name) ? ((a as Record<string, unknown>).name as string) : null;
      if (!nombre) return fallo('una adición no trae nombre.');
      if (vistas.has(nombre)) return fallo(`la adición "${nombre}" viene repetida.`);
      vistas.add(nombre);

      const ad = adicionesPorNombre.get(nombre);
      if (!ad) return fallo(`la adición "${nombre}" no existe.`);
      if (!ad.cats.includes(item.cat)) {
        return fallo(`la adición "${nombre}" no aplica a "${item.name}".`);
      }
      adiciones.push({ name: ad.name, price: ad.price });
    }

    /* --- LA SUMA. Solo con precios del servidor. --- */
    const unitPrice =
      opcion.price + (combo ? COMBO_PRICE : 0) + adiciones.reduce((s, a) => s + a.price, 0);

    // Si el navegador mandó su propio precio y no coincide, se deja
    // constancia pero se cobra el del servidor.
    if (typeof linea.unitPrice === 'number' && linea.unitPrice !== unitPrice) {
      avisos.push(
        `Línea ${n} ("${item.name}"): el navegador dijo ${linea.unitPrice} y el precio real es ${unitPrice}.`,
      );
    }

    lineas.push({
      id: item.id,
      name: item.name,
      cat: item.cat,
      qty,
      option: opcion.label,
      combo,
      drink,
      adiciones,
      unitPrice,
      totalLinea: unitPrice * qty,
    });
  });

  if (errores.length) return { ok: false, errores };

  const subtotal = lineas.reduce((s, l) => s + l.totalLinea, 0);
  return { ok: true, lineas, subtotal, avisos };
}
