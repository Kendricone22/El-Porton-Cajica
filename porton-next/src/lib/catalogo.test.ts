import { describe, it, expect } from 'vitest';
import {
  LIMITE_VISIBLES,
  categoriasConProductos,
  esPersonalizable,
  estaDisponible,
  precioDesde,
  productosDe,
  retrasoCascada,
  tieneVariosPrecios,
} from '@/lib/catalogo';
import { MENU, CATEGORIES, ADICIONES } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';

const menu = MENU as ProductoMenu[];

/* ------------------------------------------------------------------ */
describe('disponibilidad', () => {
  it('sin la clave `available` el plato SE MUESTRA', () => {
    // Los 59 del código no la traen; solo la añade Supabase al agotar.
    expect(menu.every((p) => p.available === undefined)).toBe(true);
    expect(menu.every(estaDisponible)).toBe(true);
  });

  it('available:false lo oculta, available:true lo muestra', () => {
    expect(estaDisponible({ ...menu[0], available: false })).toBe(false);
    expect(estaDisponible({ ...menu[0], available: true })).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
describe('pestañas de categoría', () => {
  it('con el menú completo salen las 7', () => {
    expect(categoriasConProductos(menu, CATEGORIES)).toHaveLength(7);
  });

  it('una categoría entera agotada no saca pestaña', () => {
    const sinBebidas = menu.map((p) => (p.cat === 'bebidas' ? { ...p, available: false } : p));
    const r = categoriasConProductos(sinBebidas, CATEGORIES);
    expect(r).toHaveLength(6);
    expect(r.some((c) => c.key === 'bebidas')).toBe(false);
  });

  it('una categoría sin productos tampoco', () => {
    const r = categoriasConProductos(
      menu.filter((p) => p.cat !== 'infantil'),
      CATEGORIES,
    );
    expect(r.some((c) => c.key === 'infantil')).toBe(false);
  });

  it('si NINGUNA tiene productos, devuelve todas (no deja la barra vacía)', () => {
    expect(categoriasConProductos([], CATEGORIES)).toHaveLength(7);
  });
});

/* ------------------------------------------------------------------ */
describe('productos por categoría', () => {
  it.each(CATEGORIES.map((c) => c.key))('la categoría %s solo trae los suyos', (key) => {
    const r = productosDe(menu, key);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.cat === key)).toBe(true);
  });

  it('la suma de todas las categorías da el menú entero', () => {
    const total = CATEGORIES.reduce((s, c) => s + productosDe(menu, c.key).length, 0);
    expect(total).toBe(menu.length);
  });

  it('excluye los agotados', () => {
    const conAgotado = menu.map((p, i) => (i === 0 ? { ...p, available: false } : p));
    expect(productosDe(conAgotado, menu[0].cat)).toHaveLength(productosDe(menu, menu[0].cat).length - 1);
  });
});

/* ------------------------------------------------------------------ */
describe('precio mostrado', () => {
  it('es el más bajo de sus opciones, en los 59', () => {
    for (const p of menu) {
      expect(precioDesde(p)).toBe(Math.min(...p.options.map((o) => o.price)));
    }
  });

  it('lleva "Desde" solo si hay más de una opción', () => {
    for (const p of menu) {
      expect(tieneVariosPrecios(p)).toBe(p.options.length > 1);
    }
  });

  it('ningún producto queda sin precio', () => {
    expect(menu.every((p) => Number.isFinite(precioDesde(p)) && precioDesde(p) > 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
describe('texto del botón', () => {
  it('una bebida sin nada que elegir dice "Agregar"', () => {
    // Las bebidas no tienen adiciones asociadas en ADICIONES.
    expect(ADICIONES.some((a) => a.cats.includes('bebidas'))).toBe(false);
    const simple = menu.find((p) => p.cat === 'bebidas' && p.options.length === 1 && !p.choices);
    expect(simple).toBeTruthy();
    expect(esPersonalizable(simple!)).toBe(false);
  });

  it('una hamburguesa siempre es personalizable', () => {
    expect(menu.filter((p) => p.cat === 'hamburguesas').every(esPersonalizable)).toBe(true);
  });

  it('cada motivo por separado la hace personalizable', () => {
    const base = menu.find((p) => p.cat === 'bebidas' && !esPersonalizable(p))!;
    expect(esPersonalizable({ ...base, options: [...base.options, { label: 'B', price: 1 }] })).toBe(true);
    expect(esPersonalizable({ ...base, combo: true })).toBe(true);
    expect(esPersonalizable({ ...base, pizza: true })).toBe(true);
    expect(esPersonalizable({ ...base, slices: ['x8'] })).toBe(true);
    expect(esPersonalizable({ ...base, proteins: ['Res'] })).toBe(true);
    expect(esPersonalizable({ ...base, choices: [{ title: 'T', options: ['a', 'b'] }] })).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
describe('vista colapsada', () => {
  it('el tope es 8', () => {
    expect(LIMITE_VISIBLES).toBe(8);
  });

  it('hay categorías por encima y por debajo del tope (si no, no probaría nada)', () => {
    const tamanos = CATEGORIES.map((c) => productosDe(menu, c.key).length);
    expect(tamanos.some((n) => n > LIMITE_VISIBLES)).toBe(true);
    expect(tamanos.some((n) => n <= LIMITE_VISIBLES)).toBe(true);
  });

  it('la cascada escalona 40ms y topa en 320ms', () => {
    expect(retrasoCascada(0)).toBe('0ms');
    expect(retrasoCascada(3)).toBe('120ms');
    expect(retrasoCascada(8)).toBe('320ms');
    expect(retrasoCascada(50)).toBe('320ms');
  });
});
