/* =============================================================
 * FICHA DEL PLATO (la que sale junto a la foto ampliada)
 *
 * Decisión explícita del cliente: SOLO categoría, nombre, "qué lleva"
 * y frases de detalle. **Ni precios ni botones** — eso ya está en la
 * tarjeta y en el modal, y en móvil la ficha ocupaba demasiado.
 *
 * ⚠️ REGLA ANTI-INVENCIÓN: las frases de detalle se DERIVAN de los
 * datos reales del producto (opciones, proteínas, sabores, combo).
 * No hay ni una línea de texto escrita a mano por producto. Si mañana
 * cambian las opciones de un plato, su ficha cambia sola.
 * ============================================================= */

import type { Categoria, ProductoMenu } from '@/types/menu';

export type Ficha = {
  categoria: Categoria | null;
  nombre: string;
  /** El "qué lleva": la descripción del propio producto. */
  descripcion: string;
  detalles: string[];
};

/** "a, b o c" — enumeración en español, con "o" antes del último. */
export function enumerar(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' o ' + items[items.length - 1];
}

export function fichaDe(item: ProductoMenu, categorias: Categoria[]): Ficha {
  const detalles: string[] = [];

  if (item.options.length > 1) {
    const etiquetas = item.options.map((o) => o.label);
    detalles.push(
      item.cat === 'hamburguesas'
        ? `Elige la proteína: ${enumerar(etiquetas)}.`
        : `Disponible en ${enumerar(etiquetas)}.`,
    );
  }

  if (item.proteins && item.chooseProteins) {
    detalles.push(
      item.chooseProteins > 1
        ? `Escoge ${item.chooseProteins} proteínas entre ${enumerar(item.proteins)}.`
        : `Escoge la proteína: ${enumerar(item.proteins)}.`,
    );
  }

  // Solo si la descripción no lo dice ya: las de pizza suelen incluirlo
  // y quedaría repetido.
  if (item.pizza && item.maxFlavors && !/sabor/i.test(item.desc)) {
    detalles.push(`Puedes combinar hasta ${item.maxFlavors} sabores en la misma pizza.`);
  }

  for (const ch of item.choices ?? []) {
    if (ch.options.length) detalles.push(`Elige: ${enumerar(ch.options)}.`);
  }

  if (item.combo) {
    detalles.push('Se puede pedir en combo con papas a la francesa y bebida.');
  }

  return {
    categoria: categorias.find((c) => c.key === item.cat) ?? null,
    nombre: item.name,
    descripcion: item.desc,
    detalles,
  };
}
