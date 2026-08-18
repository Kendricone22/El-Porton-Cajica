import { describe, it, expect } from 'vitest';
import {
  agruparPorCategoria,
  emojiCategoria,
  etiquetaCategoria,
  generarId,
  idDisponible,
  limpiarOpciones,
  problemaConLaFoto,
  queFaltaEnProducto,
  rutaFoto,
  textoPrecio,
  type FilaMenu,
} from '@/lib/menu-admin';
import { CATEGORIES } from '@/data/menu';

const fila = (id: string, cat: string): FilaMenu => ({
  id,
  cat,
  sort_order: 0,
  available: true,
  data: { id, cat: cat as never, name: id },
});

/* ------------------------------------------------------------------ */
describe('categorías', () => {
  it('traduce la clave a su nombre y emoji reales', () => {
    expect(etiquetaCategoria('hamburguesas', CATEGORIES)).toBe('Hamburguesas');
    expect(emojiCategoria('hamburguesas', CATEGORIES)).toBe('🍔');
  });

  it('una clave desconocida se deja tal cual, con emoji genérico', () => {
    expect(etiquetaCategoria('inventada', CATEGORIES)).toBe('inventada');
    expect(emojiCategoria('inventada', CATEGORIES)).toBe('🍽️');
  });
});

/* ------------------------------------------------------------------ */
describe('precio mostrado en la lista', () => {
  it('una sola opción va sin "Desde"', () => {
    expect(textoPrecio([{ label: 'U', price: 13000 }])).toBe('$13.000');
  });

  it('varias opciones llevan "Desde" y el mínimo', () => {
    expect(
      textoPrecio([
        { label: 'a', price: 17000 },
        { label: 'b', price: 13000 },
      ]),
    ).toBe('Desde $13.000');
  });

  it('sin opciones se muestra una raya, no $0 ni NaN', () => {
    expect(textoPrecio([])).toBe('—');
    expect(textoPrecio(undefined)).toBe('—');
  });
});

/* ------------------------------------------------------------------ */
describe('identificadores', () => {
  it('pasa a minúsculas y separa con guiones', () => {
    expect(generarId('Hamburguesa Clásica')).toBe('hamburguesa-clasica');
  });

  it('quita tildes y la eñe SIN perder la letra', () => {
    // Si se borraran los caracteres no ASCII, "Montañera" perdería la ñ
    // y quedaría "montaera"; peor aún, dos platos distintos podrían
    // acabar con el mismo id.
    expect(generarId('Montañera')).toBe('montanera');
    expect(generarId('Piña Jalapeño')).toBe('pina-jalapeno');
  });

  it('quita símbolos y no deja guiones sueltos en los extremos', () => {
    expect(generarId('  ¡Súper Combo!  ')).toBe('super-combo');
    expect(generarId('--Perro--')).toBe('perro');
  });

  it('nunca pasa de 40 caracteres', () => {
    expect(generarId('a'.repeat(120)).length).toBeLessThanOrEqual(40);
  });

  it('un nombre sin letras ni números genera un id de respaldo', () => {
    expect(idDisponible('¿?¡!', []).startsWith('item-')).toBe(true);
  });

  it('si el id ya existe, se le añade un sufijo', () => {
    const usado = generarId('Clásica');
    const nuevo = idDisponible('Clásica', [usado]);
    expect(nuevo).not.toBe(usado);
    expect(nuevo.startsWith(usado)).toBe(true);
  });

  it('si está libre, se usa tal cual', () => {
    expect(idDisponible('Clásica', ['otro'])).toBe('clasica');
  });
});

/* ------------------------------------------------------------------ */
describe('agrupación por categoría', () => {
  it('respeta el orden de CATEGORIES, no el de llegada', () => {
    const filas = [fila('a', 'bebidas'), fila('b', 'hamburguesas'), fila('c', 'perros')];
    expect(agruparPorCategoria(filas, CATEGORIES).map((g) => g.cat)).toEqual([
      'hamburguesas',
      'perros',
      'bebidas',
    ]);
  });

  it('agrupa todos los de una categoría juntos', () => {
    const filas = [fila('a', 'perros'), fila('b', 'hamburguesas'), fila('c', 'perros')];
    const g = agruparPorCategoria(filas, CATEGORIES);
    expect(g.find((x) => x.cat === 'perros')?.filas).toHaveLength(2);
  });

  it('no pierde ninguna fila', () => {
    const filas = [fila('a', 'perros'), fila('b', 'hamburguesas'), fila('c', 'inventada')];
    const total = agruparPorCategoria(filas, CATEGORIES).reduce((s, g) => s + g.filas.length, 0);
    expect(total).toBe(3);
  });

  it('sin filas devuelve una lista vacía', () => {
    expect(agruparPorCategoria([], CATEGORIES)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
describe('limpieza de opciones antes de guardar', () => {
  it('una opción sin nombre pasa a llamarse "Porción"', () => {
    expect(limpiarOpciones([{ label: '  ', price: 100 }])[0].label).toBe('Porción');
  });

  it('descarta las opciones de precio 0 o negativo', () => {
    // Una opción a $0 dejaría añadir el plato gratis.
    const r = limpiarOpciones([
      { label: 'a', price: 0 },
      { label: 'b', price: -500 },
      { label: 'c', price: 13000 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe('c');
  });

  it('redondea los precios', () => {
    expect(limpiarOpciones([{ label: 'a', price: 13000.7 }])[0].price).toBe(13001);
  });

  it('recorta los espacios del nombre', () => {
    expect(limpiarOpciones([{ label: '  Koller  ', price: 1 }])[0].label).toBe('Koller');
  });
});

/* ------------------------------------------------------------------ */
describe('validación del producto', () => {
  it('sin nombre no se puede guardar', () => {
    expect(queFaltaEnProducto('   ', [{ label: 'a', price: 100 }])).toHaveLength(1);
  });

  it('sin ninguna opción con precio tampoco', () => {
    expect(queFaltaEnProducto('Clásica', [{ label: 'a', price: 0 }])).toHaveLength(1);
  });

  it('con nombre y una opción válida, se puede', () => {
    expect(queFaltaEnProducto('Clásica', [{ label: 'a', price: 13000 }])).toEqual([]);
  });

  it('si falla todo, se avisa de las dos cosas a la vez', () => {
    expect(queFaltaEnProducto('', [])).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
describe('foto del producto', () => {
  it('rechaza lo que no sea imagen', () => {
    expect(problemaConLaFoto('application/pdf', 1000)).toBe('Solo se permiten imágenes.');
  });

  it('rechaza más de 5MB', () => {
    expect(problemaConLaFoto('image/jpeg', 6 * 1024 * 1024)).toMatch(/5MB/);
  });

  it('acepta una imagen normal', () => {
    expect(problemaConLaFoto('image/jpeg', 200 * 1024)).toBeNull();
    expect(problemaConLaFoto('image/png', 1)).toBeNull();
  });

  it('la ruta lleva el id del plato y la marca de tiempo', () => {
    expect(rutaFoto('h-clasica', 'foto.JPG', 1755000000000)).toBe('h-clasica-1755000000000.jpg');
  });

  it('un producto nuevo (sin id todavía) usa "nuevo"', () => {
    expect(rutaFoto(null, 'x.png', 1)).toBe('nuevo-1.png');
  });

  it('limpia los caracteres raros de la extensión', () => {
    expect(rutaFoto('a', 'foto.j p g!', 1)).toBe('a-1.jpg');
    expect(rutaFoto('a', 'foto.JPEG', 1)).toBe('a-1.jpeg');
  });

  it('un archivo SIN punto usa su nombre como extensión (heredado de v1)', () => {
    // `split('.').pop()` devuelve el nombre entero cuando no hay punto.
    // Queda feo pero es inofensivo: Storage acepta cualquier ruta y el
    // navegador se guía por el tipo MIME, no por la extensión. Se deja
    // igual que v1 a propósito, no se "mejora" durante la migración.
    expect(rutaFoto('a', 'sin-extension', 1)).toBe('a-1.sinextension');
  });
});
