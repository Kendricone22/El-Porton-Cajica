import { describe, it, expect } from 'vitest';
import {
  adicionesDe,
  aItemCarrito,
  centroEtiqueta,
  ofreceCombo,
  polar,
  precioDe,
  queFalta,
  rangosPizza,
  rutaSector,
  saboresConPorcion,
  seleccionInicial,
  type Seleccion,
} from '@/lib/modal';
import { validarPedido } from '@/lib/precio';
import { MENU, ADICIONES, COMBO_DRINKS, COMBO_PRICE } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';

const menu = MENU as ProductoMenu[];
const sel = (item: ProductoMenu, over: Partial<Seleccion> = {}): Seleccion => ({
  ...seleccionInicial(item),
  ...over,
});

/* ==================================================================
 * LA PRUEBA CLAVE
 *
 * El navegador calcula un precio para pintarlo y el servidor calcula
 * otro para cobrarlo. Si los dos se separan, el cliente ve un número
 * y se le cobra otro. Aquí se comprueba que COINCIDEN, recorriendo el
 * menú real: cada producto, cada opción, con y sin combo, y con todas
 * sus adiciones.
 * ================================================================== */
describe('el precio del modal SIEMPRE coincide con el del servidor', () => {
  for (const p of menu) {
    for (let i = 0; i < p.options.length; i++) {
      it(`${p.id} · opción "${p.options[i].label}"`, () => {
        const s = sel(p, {
          opcion: i,
          combo: p.combo,
          bebida: p.combo ? 0 : null,
          adiciones: adicionesDe(p.cat).map((a) => a.name),
          proteinas: p.proteins ? p.proteins.slice(0, p.chooseProteins ?? 1) : [],
          pizzaCantidad: p.pizza ? 1 : 0,
          pizzaSabores: p.pizza ? ['Hawaiana'] : [],
        });

        const linea = aItemCarrito(p, s);
        const r = validarPedido([linea], menu);

        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(r.lineas[0].unitPrice).toBe(linea.unitPrice);
          // Y el servidor no tiene nada que objetar del precio recibido.
          expect(r.avisos).toEqual([]);
        }
      });
    }
  }

  it('lo mismo sin adiciones ni combo, en los 59', () => {
    for (const p of menu) {
      const linea = aItemCarrito(p, sel(p, {
        proteinas: p.proteins ? p.proteins.slice(0, p.chooseProteins ?? 1) : [],
      }));
      const r = validarPedido([linea], menu);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.lineas[0].unitPrice).toBe(linea.unitPrice);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('precio', () => {
  const burger = menu.find((p) => p.cat === 'hamburguesas')!;

  it('parte del precio de la opción elegida', () => {
    burger.options.forEach((o, i) => {
      expect(precioDe(burger, sel(burger, { opcion: i }))).toBe(o.price);
    });
  });

  it('el combo suma exactamente COMBO_PRICE', () => {
    const sin = precioDe(burger, sel(burger));
    const con = precioDe(burger, sel(burger, { combo: true, bebida: 0 }));
    expect(con - sin).toBe(COMBO_PRICE);
  });

  it('cada adición suma su precio', () => {
    const aplicables = adicionesDe(burger.cat);
    const base = precioDe(burger, sel(burger));
    const todas = precioDe(burger, sel(burger, { adiciones: aplicables.map((a) => a.name) }));
    expect(todas - base).toBe(aplicables.reduce((s, a) => s + a.price, 0));
  });

  it('sabores, trozos, proteínas y choices NO cambian el precio', () => {
    const pizza = menu.find((p) => p.pizza && p.slices)!;
    const base = precioDe(pizza, sel(pizza));
    expect(precioDe(pizza, sel(pizza, { pizzaCantidad: 3, pizzaSabores: ['A', 'B', 'C'], trozo: 1 }))).toBe(base);

    const maz = menu.find((p) => p.proteins)!;
    expect(precioDe(maz, sel(maz, { proteinas: maz.proteins! }))).toBe(precioDe(maz, sel(maz)));

    const conChoice = menu.find((p) => p.choices)!;
    expect(precioDe(conChoice, sel(conChoice, { elecciones: [1] }))).toBe(precioDe(conChoice, sel(conChoice)));
  });

  it('una adición que no aplica a la categoría no suma nada', () => {
    const pizza = menu.find((p) => p.pizza)!;
    const soloBurger = ADICIONES.find((a) => a.cats.length === 1 && a.cats[0] === 'hamburguesas')!;
    // El modal nunca la ofrecería; si llegara igual, el servidor la rechaza.
    const linea = aItemCarrito(pizza, sel(pizza, {
      adiciones: [soloBurger.name],
      pizzaCantidad: 1,
      pizzaSabores: ['Hawaiana'],
    }));
    expect(validarPedido([linea], menu).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('porciones de pizza', () => {
  it('1 sabor va sin prefijo', () => {
    expect(saboresConPorcion(1, ['Hawaiana'])).toEqual(['Hawaiana']);
  });

  it('2 sabores son dos mitades', () => {
    expect(saboresConPorcion(2, ['A', 'B'])).toEqual(['Mitad A', 'Mitad B']);
  });

  it('3 sabores son una mitad y dos cuartos', () => {
    expect(saboresConPorcion(3, ['A', 'B', 'C'])).toEqual(['Mitad A', 'Cuarto B', 'Cuarto C']);
  });

  it('las porciones sin elegir se omiten', () => {
    expect(saboresConPorcion(3, ['A', null, 'C'])).toEqual(['Mitad A', 'Cuarto C']);
  });
});

/* ------------------------------------------------------------------ */
describe('geometría del círculo', () => {
  it.each([1, 2, 3])('con %s sabores los sectores cubren el círculo entero', (n) => {
    const total = rangosPizza(n).reduce((s, [a0, a1]) => s + (a1 - a0), 0);
    expect(total).toBe(360);
  });

  it('el número de sectores coincide con el de sabores', () => {
    [1, 2, 3].forEach((n) => expect(rangosPizza(n)).toHaveLength(n));
  });

  it('0° está arriba del círculo', () => {
    const [x, y] = polar(100, 100, 92, 0);
    expect(Math.round(x)).toBe(100);
    expect(Math.round(y)).toBe(8);
  });

  it('90° está a la derecha (sentido horario)', () => {
    const [x, y] = polar(100, 100, 92, 90);
    expect(Math.round(x)).toBe(192);
    expect(Math.round(y)).toBe(100);
  });

  it('la ruta del sector empieza en el centro y se cierra', () => {
    const d = rutaSector(100, 100, 92, 0, 180);
    expect(d.startsWith('M100,100')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('un sector de más de 180° usa el arco grande', () => {
    expect(rutaSector(100, 100, 92, 270, 450)).toContain(' 0 0 1 '); // 180 exactos → arco pequeño
    expect(rutaSector(100, 100, 92, 0, 200)).toContain(' 0 1 1 ');
  });

  it('con 1 sabor la etiqueta va en el centro', () => {
    expect(centroEtiqueta(100, 100, 92, 1, 0, 360)).toEqual([100, 100]);
  });

  it('con varios sabores la etiqueta va dentro de su sector', () => {
    const [x, y] = centroEtiqueta(100, 100, 92, 2, 0, 180);
    const dist = Math.hypot(x - 100, y - 100);
    expect(dist).toBeLessThan(92);
    expect(dist).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
describe('qué falta antes de poder añadir (NO existe en v1)', () => {
  const burger = menu.find((p) => p.combo)!;
  const pizza = menu.find((p) => p.pizza)!;
  const maz = menu.find((p) => p.proteins && p.chooseProteins === 2)!;

  it('un producto simple no necesita nada', () => {
    const simple = menu.find((p) => p.cat === 'bebidas')!;
    expect(queFalta(simple, sel(simple))).toEqual([]);
  });

  it('combo marcado sin bebida → falta la bebida', () => {
    expect(queFalta(burger, sel(burger, { combo: true }))).toContain('Elige la bebida de tu combo');
  });

  it('combo con bebida → ya no falta', () => {
    expect(queFalta(burger, sel(burger, { combo: true, bebida: 3 }))).toEqual([]);
  });

  it('sin marcar combo no se pide bebida', () => {
    expect(queFalta(burger, sel(burger))).toEqual([]);
  });

  it('pizza sin elegir cuántos sabores', () => {
    expect(queFalta(pizza, sel(pizza)).length).toBe(1);
  });

  it('pizza con porciones a medias', () => {
    const f = queFalta(pizza, sel(pizza, { pizzaCantidad: 2, pizzaSabores: ['A', null] }));
    expect(f).toContain('Falta elegir el sabor de alguna porción');
  });

  it('pizza completa no falta nada', () => {
    expect(queFalta(pizza, sel(pizza, { pizzaCantidad: 2, pizzaSabores: ['A', 'B'] }))).toEqual([]);
  });

  it('mazorcada con menos proteínas de las pedidas', () => {
    expect(queFalta(maz, sel(maz, { proteinas: [maz.proteins![0]] })).length).toBe(1);
    expect(queFalta(maz, sel(maz, { proteinas: maz.proteins!.slice(0, 2) }))).toEqual([]);
  });

  it('ningún producto del menú queda bloqueado si se completa bien', () => {
    for (const p of menu) {
      const s = sel(p, {
        combo: false,
        pizzaCantidad: p.pizza ? 1 : 0,
        pizzaSabores: p.pizza ? ['Hawaiana'] : [],
        proteinas: p.proteins ? p.proteins.slice(0, p.chooseProteins ?? 1) : [],
      });
      expect(queFalta(p, s)).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('la línea que entra al carrito', () => {
  const burger = menu.find((p) => p.combo)!;

  it('guarda la etiqueta de la opción, no su índice', () => {
    const l = aItemCarrito(burger, sel(burger, { opcion: 1 }));
    expect(l.option).toBe(burger.options[1].label);
  });

  it('guarda la bebida por NOMBRE', () => {
    const l = aItemCarrito(burger, sel(burger, { combo: true, bebida: 2 }));
    expect(l.drink).toBe(COMBO_DRINKS[2]);
  });

  it('sin combo la bebida es null aunque hubiera una elegida', () => {
    expect(aItemCarrito(burger, sel(burger, { combo: false, bebida: 2 })).drink).toBeNull();
  });

  it('las adiciones llevan su precio real, no el que diga nadie', () => {
    const a = adicionesDe(burger.cat)[0];
    const l = aItemCarrito(burger, sel(burger, { adiciones: [a.name] }));
    expect(l.adiciones).toEqual([{ name: a.name, price: a.price }]);
  });

  it('recorta los espacios de las notas', () => {
    expect(aItemCarrito(burger, sel(burger, { notas: '  sin cebolla  ' })).notes).toBe('sin cebolla');
  });

  it('trae hash y cantidad 1', () => {
    const l = aItemCarrito(burger, sel(burger));
    expect(l.hash.length).toBeGreaterThan(0);
    expect(l.qty).toBe(1);
  });

  it('dos configuraciones distintas dan hash distinto', () => {
    const a = aItemCarrito(burger, sel(burger, { combo: true, bebida: 0 }));
    const b = aItemCarrito(burger, sel(burger, { combo: true, bebida: 1 }));
    expect(a.hash).not.toBe(b.hash);
  });
});

/* ------------------------------------------------------------------ */
describe('oferta de combo al añadir', () => {
  it('se ofrece en hamburguesas y perros sin combo', () => {
    for (const p of menu.filter((x) => x.cat === 'hamburguesas' || x.cat === 'perros')) {
      expect(ofreceCombo(p, sel(p))).toBe(true);
    }
  });

  it('no se ofrece si ya lo lleva', () => {
    const b = menu.find((p) => p.cat === 'hamburguesas')!;
    expect(ofreceCombo(b, sel(b, { combo: true }))).toBe(false);
  });

  it('no se ofrece en el resto de categorías', () => {
    for (const p of menu.filter((x) => x.cat !== 'hamburguesas' && x.cat !== 'perros')) {
      expect(ofreceCombo(p, sel(p))).toBe(false);
    }
  });
});
