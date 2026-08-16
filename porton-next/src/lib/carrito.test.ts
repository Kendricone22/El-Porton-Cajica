import { describe, it, expect } from 'vitest';
import {
  hashDe,
  agregar,
  cambiarCantidad,
  eliminar,
  subtotal,
  contar,
  leerCarrito,
} from '@/lib/carrito';
import type { ItemCarrito } from '@/types/carrito';

/** Fabrica un item de carrito válido, con el hash ya calculado. */
function item(over: Partial<ItemCarrito> = {}): ItemCarrito {
  const base = {
    id: 'h-sencilla',
    name: 'Sencilla',
    cat: 'hamburguesas',
    emoji: '🍔',
    img: null,
    option: 'Koller',
    combo: false,
    drink: null,
    proteins: [] as string[],
    flavors: [] as string[],
    slice: '',
    choices: [] as string[],
    adiciones: [] as { name: string; price: number }[],
    notes: '',
    unitPrice: 13000,
    qty: 1,
    ...over,
  };
  return { ...base, hash: hashDe(base) };
}

/* ------------------------------------------------------------------ */
describe('hash: qué cuenta como "el mismo producto"', () => {
  it('dos líneas idénticas comparten hash', () => {
    expect(item().hash).toBe(item().hash);
  });

  it.each([
    ['la opción', { option: 'Artesanal' }],
    ['el combo', { combo: true }],
    ['la bebida', { drink: 'Sprite' }],
    ['las proteínas', { proteins: ['Res'] }],
    ['los sabores', { flavors: ['Mitad Hawaiana'] }],
    ['los trozos', { slice: 'x10' }],
    ['los choices', { choices: ['Sin jalapeño'] }],
    ['las adiciones', { adiciones: [{ name: 'Tocineta', price: 6000 }] }],
    ['la nota', { notes: 'sin cebolla' }],
  ])('cambiar %s produce un hash distinto', (_, cambio) => {
    expect(item(cambio as Partial<ItemCarrito>).hash).not.toBe(item().hash);
  });

  it('la cantidad NO forma parte del hash (si no, nunca se sumarían)', () => {
    expect(item({ qty: 5 }).hash).toBe(item({ qty: 1 }).hash);
  });

  it('el orden de las adiciones SÍ importa (igual que en el sitio v1)', () => {
    const a = item({ adiciones: [{ name: 'Tocineta', price: 6000 }, { name: 'Huevo frito', price: 1500 }] });
    const b = item({ adiciones: [{ name: 'Huevo frito', price: 1500 }, { name: 'Tocineta', price: 6000 }] });
    // El modal las genera siempre en el orden de ADICIONES, así que en
    // la práctica no se dan las dos formas. Se deja documentado.
    expect(a.hash).not.toBe(b.hash);
  });
});

/* ------------------------------------------------------------------ */
describe('agregar', () => {
  it('mete una línea nueva', () => {
    expect(agregar([], item())).toHaveLength(1);
  });

  it('suma la cantidad si la combinación ya está', () => {
    const r = agregar(agregar([], item()), item());
    expect(r).toHaveLength(1);
    expect(r[0].qty).toBe(2);
  });

  it('crea líneas separadas si la combinación cambia', () => {
    const r = agregar(agregar([], item()), item({ combo: true, drink: 'Sprite' }));
    expect(r).toHaveLength(2);
  });

  it('respeta la cantidad del item que se agrega', () => {
    const r = agregar([item({ qty: 2 })], item({ qty: 3 }));
    expect(r[0].qty).toBe(5);
  });

  it('NO modifica el array original (React necesita una referencia nueva)', () => {
    const antes = [item()];
    const copia = [...antes];
    const despues = agregar(antes, item({ option: 'Pollo' }));
    expect(antes).toEqual(copia);
    expect(despues).not.toBe(antes);
  });

  it('tampoco modifica el objeto del item al sumar cantidad', () => {
    const original = item();
    const r = agregar([original], item());
    expect(original.qty).toBe(1);
    expect(r[0]).not.toBe(original);
  });
});

/* ------------------------------------------------------------------ */
describe('cantidad y borrado', () => {
  const it1 = item();

  it('suma y resta', () => {
    expect(cambiarCantidad([it1], it1.hash, 1)[0].qty).toBe(2);
    expect(cambiarCantidad([item({ qty: 3 })], it1.hash, -1)[0].qty).toBe(2);
  });

  it('al bajar de 1 la línea desaparece', () => {
    expect(cambiarCantidad([it1], it1.hash, -1)).toHaveLength(0);
  });

  it('un hash que no existe no cambia nada', () => {
    const antes = [it1];
    expect(cambiarCantidad(antes, 'inventado', 1)).toBe(antes);
    expect(eliminar(antes, 'inventado')).toEqual(antes);
  });

  it('eliminar quita solo esa línea', () => {
    const otro = item({ option: 'Pollo' });
    const r = eliminar([it1, otro], it1.hash);
    expect(r).toHaveLength(1);
    expect(r[0].hash).toBe(otro.hash);
  });
});

/* ------------------------------------------------------------------ */
describe('totales', () => {
  it('subtotal multiplica por cantidad', () => {
    expect(subtotal([item({ qty: 3 })])).toBe(39000);
  });

  it('subtotal suma varias líneas', () => {
    expect(subtotal([item({ qty: 2 }), item({ option: 'Pollo', unitPrice: 13500, qty: 1 })])).toBe(39500);
  });

  it('cuenta unidades, no líneas', () => {
    expect(contar([item({ qty: 3 }), item({ option: 'Pollo', qty: 2 })])).toBe(5);
  });

  it('carrito vacío da cero', () => {
    expect(subtotal([])).toBe(0);
    expect(contar([])).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
describe('leer de localStorage (entrada NO fiable)', () => {
  it.each([
    ['null', null],
    ['cadena vacía', ''],
    ['JSON roto', '{no es json'],
    ['no es una lista', '{"a":1}'],
    ['lista de basura', '[null,3,"texto",[]]'],
  ])('%s devuelve carrito vacío sin reventar', (_, crudo) => {
    expect(leerCarrito(crudo as string | null)).toEqual([]);
  });

  it('lee un carrito bien formado', () => {
    const guardado = JSON.stringify([item({ qty: 2 })]);
    const r = leerCarrito(guardado);
    expect(r).toHaveLength(1);
    expect(r[0].qty).toBe(2);
    expect(r[0].unitPrice).toBe(13000);
  });

  it('descarta los items sin id o sin precio válido', () => {
    const crudo = JSON.stringify([
      item(),
      { name: 'sin id', unitPrice: 100 },
      { id: 'x', unitPrice: 'gratis' },
      { id: 'y', unitPrice: -5 },
      { id: 'z', unitPrice: NaN },
    ]);
    expect(leerCarrito(crudo)).toHaveLength(1);
  });

  it('arregla una cantidad inválida en vez de tirar la línea', () => {
    const crudo = JSON.stringify([{ ...item(), qty: 0 }, { ...item({ option: 'Pollo' }), qty: -3 }]);
    const r = leerCarrito(crudo);
    expect(r).toHaveLength(2);
    expect(r.every((x) => x.qty === 1)).toBe(true);
  });

  it('recalcula el hash: uno manipulado no puede fusionar líneas distintas', () => {
    const a = { ...item(), hash: 'IGUAL' };
    const b = { ...item({ option: 'Pollo', unitPrice: 13500 }), hash: 'IGUAL' };
    const r = leerCarrito(JSON.stringify([a, b]));
    expect(r).toHaveLength(2);
  });

  it('fusiona duplicados que vinieran guardados por separado', () => {
    const r = leerCarrito(JSON.stringify([item(), item(), item()]));
    expect(r).toHaveLength(1);
    expect(r[0].qty).toBe(3);
  });

  it('sobrevive a campos ausentes rellenando valores razonables', () => {
    const r = leerCarrito(JSON.stringify([{ id: 'h-sencilla', unitPrice: 13000 }]));
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('h-sencilla');
    expect(r[0].qty).toBe(1);
    expect(r[0].adiciones).toEqual([]);
    expect(r[0].combo).toBe(false);
  });

  it('filtra adiciones mal formadas dentro de una línea válida', () => {
    const crudo = JSON.stringify([
      { ...item(), adiciones: [{ name: 'Tocineta', price: 6000 }, { precio: 1 }, null, 'texto'] },
    ]);
    const r = leerCarrito(crudo);
    expect(r[0].adiciones).toEqual([{ name: 'Tocineta', price: 6000 }]);
  });
});
