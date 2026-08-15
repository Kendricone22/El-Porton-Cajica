import { describe, it, expect } from 'vitest';
import { validarPedido, MAX_QTY, MAX_LINEAS } from '@/lib/precio';
import { MENU, ADICIONES, COMBO_PRICE, COMBO_DRINKS } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';

/* =============================================================
 * PRUEBAS DEL CÁLCULO DE PRECIO
 *
 * La mayoría NO están escritas a mano: se GENERAN recorriendo el menú
 * real. Así, cuando se añada un producto nuevo o una adición nueva,
 * la prueba correspondiente aparece sola. Escribir 4 casos a mano
 * daría una falsa sensación de cobertura.
 * ============================================================= */

const menu = MENU as ProductoMenu[];
const BEBIDA = COMBO_DRINKS[0];

/** Atajo: valida una sola línea y devuelve el resultado. */
const uno = (linea: Record<string, unknown>) => validarPedido([linea], menu);

/** Atajo: espera éxito y devuelve el precio unitario calculado. */
function precioDe(linea: Record<string, unknown>): number {
  const r = uno(linea);
  if (!r.ok) throw new Error(`Se esperaba éxito pero falló: ${r.errores.join(' / ')}`);
  return r.lineas[0].unitPrice;
}

/* ------------------------------------------------------------------ */
describe('cada producto, cada opción de precio', () => {
  // 59 productos × sus opciones ≈ 90 casos generados.
  for (const p of menu) {
    for (const o of p.options) {
      it(`${p.id} · "${o.label}" cuesta ${o.price}`, () => {
        expect(precioDe({ id: p.id, option: o.label, qty: 1 })).toBe(o.price);
      });
    }
  }

  it('sin indicar opción usa la primera, igual que el modal', () => {
    for (const p of menu) {
      expect(precioDe({ id: p.id, qty: 1 })).toBe(p.options[0].price);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('combo', () => {
  const conCombo = menu.filter((p) => p.combo);
  const sinCombo = menu.filter((p) => !p.combo);

  it('hay productos de los dos tipos (si no, la prueba no probaría nada)', () => {
    expect(conCombo.length).toBeGreaterThan(0);
    expect(sinCombo.length).toBeGreaterThan(0);
  });

  for (const p of conCombo) {
    it(`${p.id} con combo suma exactamente ${COMBO_PRICE}`, () => {
      const base = precioDe({ id: p.id, qty: 1 });
      const combo = precioDe({ id: p.id, qty: 1, combo: true, drink: BEBIDA });
      expect(combo - base).toBe(COMBO_PRICE);
    });
  }

  for (const p of sinCombo) {
    it(`${p.id} rechaza el combo`, () => {
      const r = uno({ id: p.id, qty: 1, combo: true, drink: BEBIDA });
      expect(r.ok).toBe(false);
    });
  }

  it('acepta las 9 bebidas del combo y ninguna otra', () => {
    const p = conCombo[0];
    for (const b of COMBO_DRINKS) {
      expect(uno({ id: p.id, qty: 1, combo: true, drink: b }).ok).toBe(true);
    }
    expect(uno({ id: p.id, qty: 1, combo: true, drink: 'Aguardiente' }).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('adiciones', () => {
  // Cada adición contra TODAS las categorías: debe sumar en las suyas
  // y ser rechazada en el resto.
  for (const ad of ADICIONES) {
    for (const p of menu) {
      const permitida = ad.cats.includes(p.cat);

      if (permitida) {
        it(`"${ad.name}" suma ${ad.price} en ${p.id}`, () => {
          const base = precioDe({ id: p.id, qty: 1 });
          const con = precioDe({ id: p.id, qty: 1, adiciones: [{ name: ad.name }] });
          expect(con - base).toBe(ad.price);
        });
      } else {
        it(`"${ad.name}" NO aplica a ${p.id}`, () => {
          expect(uno({ id: p.id, qty: 1, adiciones: [{ name: ad.name }] }).ok).toBe(false);
        });
      }
    }
  }

  it('suma varias adiciones a la vez', () => {
    const p = menu.find((x) => x.cat === 'hamburguesas')!;
    const aplicables = ADICIONES.filter((a) => a.cats.includes(p.cat));
    const base = precioDe({ id: p.id, qty: 1 });
    const total = precioDe({
      id: p.id,
      qty: 1,
      adiciones: aplicables.map((a) => ({ name: a.name })),
    });
    expect(total - base).toBe(aplicables.reduce((s, a) => s + a.price, 0));
  });

  it('rechaza adiciones repetidas', () => {
    const p = menu.find((x) => x.cat === 'hamburguesas')!;
    const ad = ADICIONES.find((a) => a.cats.includes('hamburguesas'))!;
    const r = uno({ id: p.id, qty: 1, adiciones: [{ name: ad.name }, { name: ad.name }] });
    expect(r.ok).toBe(false);
  });

  it('acepta la adición como texto suelto, no solo como objeto', () => {
    const p = menu.find((x) => x.cat === 'hamburguesas')!;
    const ad = ADICIONES.find((a) => a.cats.includes('hamburguesas'))!;
    expect(precioDe({ id: p.id, qty: 1, adiciones: [ad.name] })).toBe(
      p.options[0].price + ad.price,
    );
  });
});

/* ------------------------------------------------------------------ */
describe('los precios del navegador NUNCA se usan', () => {
  const p = menu.find((x) => x.combo)!;
  const ad = ADICIONES.find((a) => a.cats.includes(p.cat))!;

  it('ignora un unitPrice manipulado', () => {
    const r = uno({ id: p.id, qty: 1, unitPrice: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lineas[0].unitPrice).toBe(p.options[0].price);
      expect(r.avisos.length).toBe(1); // deja constancia
    }
  });

  it('ignora el precio que el navegador ponga en una adición', () => {
    const esperado = p.options[0].price + ad.price;
    expect(precioDe({ id: p.id, qty: 1, adiciones: [{ name: ad.name, price: 0 }] })).toBe(esperado);
    expect(precioDe({ id: p.id, qty: 1, adiciones: [{ name: ad.name, price: -99999 }] })).toBe(esperado);
  });

  it('no avisa cuando el navegador acierta', () => {
    const r = uno({ id: p.id, qty: 1, unitPrice: p.options[0].price });
    expect(r.ok && r.avisos.length).toBe(0);
  });

  it('el total de varias líneas es la suma de los del servidor', () => {
    const r = validarPedido(
      [
        { id: p.id, qty: 3, unitPrice: 1 },
        { id: p.id, qty: 2, combo: true, drink: BEBIDA, unitPrice: 1 },
      ],
      menu,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const base = p.options[0].price;
      expect(r.subtotal).toBe(base * 3 + (base + COMBO_PRICE) * 2);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('cantidades', () => {
  const p = menu[0];

  it('multiplica bien', () => {
    for (const q of [1, 2, 7, MAX_QTY]) {
      const r = uno({ id: p.id, qty: q });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.lineas[0].totalLinea).toBe(p.options[0].price * q);
    }
  });

  it.each([0, -1, -9999, 1.5, MAX_QTY + 1, NaN, Infinity, '3', {}, []])(
    'rechaza qty = %s',
    (q) => {
      expect(uno({ id: p.id, qty: q }).ok).toBe(false);
    },
  );

  // Leniencia deliberada: ausente o null = "no especificado" = 1.
  // Nunca puede inflar el cobro porque 1 es el mínimo.
  it.each([undefined, null])('qty = %s se interpreta como 1', (q) => {
    const r = uno({ id: p.id, qty: q });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lineas[0].qty).toBe(1);
  });

  it('sin el campo qty asume 1', () => {
    const r = uno({ id: p.id });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lineas[0].qty).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
describe('entradas basura', () => {
  const p = menu[0];

  it.each([null, undefined, 'texto', 42, {}, []])('rechaza items = %s', (items) => {
    expect(validarPedido(items, menu).ok).toBe(false);
  });

  it('rechaza más líneas que el máximo', () => {
    const muchas = Array.from({ length: MAX_LINEAS + 1 }, () => ({ id: p.id, qty: 1 }));
    expect(validarPedido(muchas, menu).ok).toBe(false);
  });

  it('acepta justo el máximo', () => {
    const justas = Array.from({ length: MAX_LINEAS }, () => ({ id: p.id, qty: 1 }));
    expect(validarPedido(justas, menu).ok).toBe(true);
  });

  it('rechaza producto inexistente, id vacío y id que no es texto', () => {
    expect(uno({ id: 'no-existe', qty: 1 }).ok).toBe(false);
    expect(uno({ id: '', qty: 1 }).ok).toBe(false);
    expect(uno({ id: 123, qty: 1 }).ok).toBe(false);
    expect(uno({ qty: 1 }).ok).toBe(false);
  });

  it('rechaza opción inexistente', () => {
    expect(uno({ id: p.id, option: 'Gratis total', qty: 1 }).ok).toBe(false);
  });

  it('rechaza un producto marcado como agotado', () => {
    const agotado = menu.map((x) => (x.id === p.id ? { ...x, available: false } : x));
    expect(validarPedido([{ id: p.id, qty: 1 }], agotado).ok).toBe(false);
  });

  it('un producto sin `available` se considera disponible', () => {
    expect(p.available).toBeUndefined();
    expect(uno({ id: p.id, qty: 1 }).ok).toBe(true);
  });

  it('informa TODOS los errores del pedido, no solo el primero', () => {
    const r = validarPedido([{ id: 'no-existe' }, { id: p.id, qty: 0 }], menu);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.length).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
describe('el resultado nunca produce números imposibles', () => {
  it('todo precio calculado es un entero positivo', () => {
    for (const p of menu) {
      for (const o of p.options) {
        const v = precioDe({ id: p.id, option: o.label, qty: 1 });
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('el subtotal de un pedido completo es entero (la columna es integer)', () => {
    const r = validarPedido(
      menu.slice(0, MAX_LINEAS).map((p) => ({ id: p.id, qty: 2 })),
      menu,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isInteger(r.subtotal)).toBe(true);
  });
});
