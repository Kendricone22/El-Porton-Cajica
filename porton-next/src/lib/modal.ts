/* =============================================================
 * MODAL DE PERSONALIZACIÓN — lógica pura
 *
 * Todo lo que decide qué se puede pedir, cuánto cuesta y cómo queda
 * descrito, sin React ni DOM. Portado de `initModal` (js/app.js).
 *
 * La geometría de la pizza también vive aquí: son matemáticas, no
 * presentación, y así se puede comprobar que los sectores suman el
 * círculo entero.
 * ============================================================= */

import { ADICIONES, COMBO_DRINKS, COMBO_PRICE } from '@/data/menu';
import type { CategoriaId, ProductoMenu } from '@/types/menu';
import type { ItemCarrito } from '@/types/carrito';
import { hashDe } from '@/lib/carrito';

export type Seleccion = {
  /** Índice dentro de `item.options`. Manda el precio base. */
  opcion: number;
  proteinas: string[];
  /** 0 = todavía no eligió cuántos sabores. */
  pizzaCantidad: number;
  pizzaSabores: (string | null)[];
  trozo: number;
  /** Un índice por cada `item.choices`. */
  elecciones: number[];
  combo: boolean;
  /** Índice en COMBO_DRINKS, o null si no ha elegido. */
  bebida: number | null;
  /** Nombres de las adiciones marcadas. */
  adiciones: string[];
  notas: string;
};

export const adicionesDe = (cat: CategoriaId) => ADICIONES.filter((a) => a.cats.includes(cat));

export function seleccionInicial(item: ProductoMenu): Seleccion {
  return {
    opcion: 0,
    proteinas: [],
    pizzaCantidad: 0,
    pizzaSabores: [],
    trozo: 0,
    elecciones: (item.choices ?? []).map(() => 0),
    combo: false,
    bebida: null,
    adiciones: [],
    notas: '',
  };
}

/**
 * El precio. Misma fórmula que `recalc()` en v1 y que la del servidor:
 * opción + combo + adiciones. Sabores, trozos, proteínas y `choices`
 * NO cuestan.
 */
export function precioDe(item: ProductoMenu, sel: Seleccion): number {
  const base = item.options[sel.opcion]?.price ?? item.options[0].price;
  const extras = sel.adiciones.reduce((s, nombre) => {
    const a = ADICIONES.find((x) => x.name === nombre);
    return s + (a ? a.price : 0);
  }, 0);
  return base + (sel.combo ? COMBO_PRICE : 0) + extras;
}

/**
 * Sabores con su porción, tal y como aparecen en el carrito y en el
 * mensaje de WhatsApp:
 *   1 sabor  → entero, sin prefijo
 *   2 sabores→ "Mitad X" + "Mitad Y"
 *   3 sabores→ "Mitad X" + "Cuarto Y" + "Cuarto Z"
 */
export function saboresConPorcion(cantidad: number, sabores: (string | null)[]): string[] {
  return sabores.flatMap((f, i) => {
    if (!f) return [];
    const prefijo = cantidad === 1 ? '' : cantidad === 2 ? 'Mitad ' : i === 0 ? 'Mitad ' : 'Cuarto ';
    return [prefijo + f];
  });
}

/**
 * Qué le falta al pedido para poder añadirse.
 *
 * ⚠️ ESTO NO EXISTE EN v1, ES UN ARREGLO DELIBERADO. Allí se puede
 * añadir un combo sin bebida, una pizza sin sabores o una mazorcada
 * sin proteínas: el pedido sale a medias y alguien tiene que
 * preguntar por WhatsApp. Además el endpoint /api/pedidos rechaza el
 * combo sin bebida, así que sin esto el modal generaría pedidos que
 * el servidor no acepta.
 */
export function queFalta(item: ProductoMenu, sel: Seleccion): string[] {
  const falta: string[] = [];

  if (item.combo && sel.combo && sel.bebida === null) {
    falta.push('Elige la bebida de tu combo');
  }

  if (item.pizza) {
    if (sel.pizzaCantidad === 0) {
      falta.push('Elige cuántos sabores quieres');
    } else if (sel.pizzaSabores.slice(0, sel.pizzaCantidad).some((f) => !f)) {
      falta.push('Falta elegir el sabor de alguna porción');
    }
  }

  if (item.proteins && item.chooseProteins) {
    const n = item.chooseProteins;
    if (sel.proteinas.length < n) {
      falta.push(n > 1 ? `Elige ${n} proteínas` : 'Elige la proteína');
    }
  }

  return falta;
}

/** Convierte la selección en la línea que entra al carrito. */
export function aItemCarrito(item: ProductoMenu, sel: Seleccion): ItemCarrito {
  const opcion = item.options[sel.opcion] ?? item.options[0];

  const base = {
    id: item.id,
    name: item.name,
    cat: item.cat,
    emoji: item.emoji,
    img: item.img ?? null,
    option: opcion.label,
    combo: sel.combo,
    drink: sel.combo && sel.bebida !== null ? COMBO_DRINKS[sel.bebida] : null,
    proteins: sel.proteinas,
    flavors: item.pizza ? saboresConPorcion(sel.pizzaCantidad, sel.pizzaSabores) : [],
    slice: item.slices ? (item.slices[sel.trozo] ?? '') : '',
    choices: (item.choices ?? []).map((ch, i) => ch.options[sel.elecciones[i]] ?? ch.options[0]),
    adiciones: sel.adiciones.map((nombre) => {
      const a = ADICIONES.find((x) => x.name === nombre)!;
      return { name: a.name, price: a.price };
    }),
    notes: sel.notas.trim(),
    unitPrice: precioDe(item, sel),
    qty: 1,
  };

  return { ...base, hash: hashDe(base) };
}

/** Se ofrece el combo al añadir sin él (solo hamburguesas y perros). */
export const ofreceCombo = (item: ProductoMenu, sel: Seleccion): boolean =>
  !sel.combo && (item.cat === 'hamburguesas' || item.cat === 'perros');

/* -------------------------------------------------------------
 * GEOMETRÍA DE LA PIZZA
 * ----------------------------------------------------------- */

/**
 * Los sectores de cada reparto, en grados.
 *   1 → el círculo entero
 *   2 → dos mitades
 *   3 → una mitad (arriba, cruzando el 0) y dos cuartos
 */
export const rangosPizza = (n: number): [number, number][] =>
  n === 1 ? [[0, 360]] : n === 2 ? [[0, 180], [180, 360]] : [[270, 450], [90, 180], [180, 270]];

/** Punto de la circunferencia. 0° = arriba, en sentido horario. */
export function polar(cx: number, cy: number, r: number, grados: number): [number, number] {
  const a = ((grados - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Ruta SVG de un sector (porción de pizza). */
export function rutaSector(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [sx, sy] = polar(cx, cy, r, a0);
  const [ex, ey] = polar(cx, cy, r, a1);
  const grande = a1 - a0 > 180 ? 1 : 0;
  return `M${cx},${cy} L${sx.toFixed(1)},${sy.toFixed(1)} A${r},${r} 0 ${grande} 1 ${ex.toFixed(1)},${ey.toFixed(1)} Z`;
}

/** Dónde va la etiqueta de cada porción. */
export function centroEtiqueta(
  cx: number,
  cy: number,
  r: number,
  n: number,
  a0: number,
  a1: number,
): [number, number] {
  return n === 1 ? [cx, cy] : polar(cx, cy, r * 0.5, (a0 + a1) / 2);
}
