import { describe, it, expect } from 'vitest';
import { enumerar, fichaDe } from '@/lib/ficha';
import { MENU, CATEGORIES } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';

const menu = MENU as ProductoMenu[];
const ficha = (p: ProductoMenu) => fichaDe(p, CATEGORIES);

/* ------------------------------------------------------------------ */
describe('enumerar en español', () => {
  it.each([
    [[], ''],
    [['Koller'], 'Koller'],
    [['Koller', 'Pollo'], 'Koller o Pollo'],
    [['Koller', 'Pollo', 'Artesanal'], 'Koller, Pollo o Artesanal'],
    [['a', 'b', 'c', 'd'], 'a, b, c o d'],
  ])('%s → "%s"', (entrada, esperado) => {
    expect(enumerar(entrada as string[])).toBe(esperado);
  });
});

/* ------------------------------------------------------------------ */
describe('la ficha siempre corresponde a SU plato', () => {
  it('los 59 productos producen una ficha con su propio nombre y descripción', () => {
    for (const p of menu) {
      const f = ficha(p);
      expect(f.nombre).toBe(p.name);
      expect(f.descripcion).toBe(p.desc);
    }
  });

  it('cada uno trae su categoría real', () => {
    for (const p of menu) {
      expect(ficha(p).categoria?.key).toBe(p.cat);
    }
  });

  it('ninguna ficha queda sin descripción', () => {
    expect(menu.every((p) => ficha(p).descripcion.trim().length > 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
describe('las frases se derivan de los datos, no se inventan', () => {
  it('un plato de una sola opción no genera la frase de opciones', () => {
    const unaSola = menu.find((p) => p.options.length === 1 && !p.proteins && !p.pizza && !p.choices && !p.combo)!;
    expect(ficha(unaSola).detalles).toEqual([]);
  });

  it('las hamburguesas dicen "Elige la proteína"', () => {
    for (const p of menu.filter((x) => x.cat === 'hamburguesas' && x.options.length > 1)) {
      expect(ficha(p).detalles[0]).toMatch(/^Elige la proteína: /);
    }
  });

  it('el resto de categorías dicen "Disponible en"', () => {
    for (const p of menu.filter((x) => x.cat !== 'hamburguesas' && x.options.length > 1)) {
      expect(ficha(p).detalles[0]).toMatch(/^Disponible en /);
    }
  });

  it('las etiquetas de la frase son EXACTAMENTE las opciones del plato', () => {
    for (const p of menu.filter((x) => x.options.length > 1)) {
      const frase = ficha(p).detalles[0];
      for (const o of p.options) expect(frase).toContain(o.label);
    }
  });

  it('las mazorcadas dicen cuántas proteínas escoger, con las suyas', () => {
    for (const p of menu.filter((x) => x.proteins && x.chooseProteins)) {
      const f = ficha(p).detalles.join(' ');
      expect(f).toMatch(/Escoge/);
      for (const prot of p.proteins!) expect(f).toContain(prot);
    }
  });

  it('los combos se anuncian solo donde aplican', () => {
    const frase = 'Se puede pedir en combo con papas a la francesa y bebida.';
    for (const p of menu) {
      expect(ficha(p).detalles.includes(frase)).toBe(p.combo);
    }
  });

  it('los `choices` aparecen con sus opciones', () => {
    for (const p of menu.filter((x) => x.choices?.length)) {
      const f = ficha(p).detalles.join(' ');
      for (const o of p.choices![0].options) expect(f).toContain(o);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('la frase de sabores de pizza no se repite', () => {
  const pizzas = menu.filter((p) => p.pizza && p.maxFlavors);

  it('hay pizzas con círculo (si no, la prueba no probaría nada)', () => {
    expect(pizzas.length).toBeGreaterThan(0);
  });

  it('se omite cuando la descripción ya habla de sabores', () => {
    for (const p of pizzas) {
      const tieneFrase = ficha(p).detalles.some((d) => /combinar hasta \d+ sabores/.test(d));
      const yaLoDice = /sabor/i.test(p.desc);
      expect(tieneFrase).toBe(!yaLoDice);
    }
  });

  it('si la descripción no lo dice, la frase lleva el máximo real', () => {
    const p = { ...pizzas[0], desc: 'Masa artesanal.', maxFlavors: 3 } as ProductoMenu;
    expect(ficha(p).detalles).toContain('Puedes combinar hasta 3 sabores en la misma pizza.');
  });
});

/* ------------------------------------------------------------------ */
describe('lo que la ficha NO debe llevar (decisión del cliente)', () => {
  it('ningún precio aparece en la ficha de ningún producto', () => {
    for (const p of menu) {
      const texto = [ficha(p).descripcion, ...ficha(p).detalles].join(' ');
      // Ni con símbolo ni el número suelto de ninguna de sus opciones.
      expect(texto).not.toMatch(/\$\s?\d/);
      for (const o of p.options) {
        expect(texto).not.toContain(o.price.toLocaleString('es-CO'));
      }
    }
  });

  it('la ficha solo expone estos cuatro campos', () => {
    expect(Object.keys(ficha(menu[0])).sort()).toEqual(['categoria', 'descripcion', 'detalles', 'nombre']);
  });
});
