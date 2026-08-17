import { describe, it, expect } from 'vitest';
import {
  MARCO_POR_DEFECTO,
  coordX,
  coordY,
  escalaY,
  etiquetaEje,
  formatoCorto,
  indiceMasCercano,
  llevaEtiqueta,
  marcasY,
  pasoEtiquetasX,
  rutaArea,
  rutaLinea,
  type Marco,
} from '@/lib/ventas';

const marco: Marco = { ancho: 600, ...MARCO_POR_DEFECTO };

/* ------------------------------------------------------------------ */
describe('etiquetas del eje X', () => {
  it('por día y semana muestra dd/mm', () => {
    expect(etiquetaEje('2026-08-05', 'dia')).toBe('05/08');
    expect(etiquetaEje('2026-12-31', 'semana')).toBe('31/12');
  });

  it('por mes muestra el mes abreviado y el año corto', () => {
    expect(etiquetaEje('2026-08-01', 'mes')).toBe('ago 26');
    expect(etiquetaEje('2026-01-01', 'mes')).toBe('ene 26');
    expect(etiquetaEje('2027-12-01', 'mes')).toBe('dic 27');
  });
});

/* ------------------------------------------------------------------ */
describe('escala del eje Y', () => {
  it('sin ventas usa una escala mínima en vez de dividir por cero', () => {
    expect(escalaY(0)).toEqual({ tope: 1000, paso: 250 });
    expect(escalaY(-5)).toEqual({ tope: 1000, paso: 250 });
  });

  it('el tope SIEMPRE queda por encima del máximo', () => {
    for (const max of [1, 999, 1000, 1001, 183412, 1_240_000, 7_777_777]) {
      expect(escalaY(max).tope).toBeGreaterThanOrEqual(max);
    }
  });

  it('el tope es múltiplo exacto del paso', () => {
    for (const max of [1234, 45000, 183412, 2_500_000]) {
      const e = escalaY(max);
      expect(Math.abs(e.tope % e.paso)).toBeLessThan(1e-6);
    }
  });

  it('da números redondos, no el máximo crudo', () => {
    // 183.412 no debe producir marcas de 183.412: la gracia es
    // "0 / 50k / 100k / 150k / 200k".
    const e = escalaY(183412);
    expect(e.paso).toBe(50000);
    expect(e.tope).toBe(200000);
  });

  it('produce entre 3 y 9 marcas, que es lo legible', () => {
    for (const max of [900, 12000, 183412, 1_240_000, 45_000_000]) {
      const n = marcasY(escalaY(max)).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(9);
    }
  });

  it('las marcas empiezan en 0 y llegan al tope', () => {
    const e = escalaY(183412);
    const m = marcasY(e);
    expect(m[0]).toBe(0);
    expect(m[m.length - 1]).toBe(e.tope);
  });
});

/* ------------------------------------------------------------------ */
describe('formato compacto', () => {
  it.each([
    [0, '$0'],
    [900, '$900'],
    [1000, '$1k'],
    [250000, '$250k'],
    [1_000_000, '$1M'],
    [1_200_000, '$1,2M'],
    [2_500_000, '$2,5M'],
  ])('%s → %s', (v, esperado) => {
    expect(formatoCorto(v as number)).toBe(esperado);
  });

  it('usa coma decimal, como se escribe en Colombia', () => {
    expect(formatoCorto(1_200_000)).toContain(',');
    expect(formatoCorto(1_200_000)).not.toContain('.');
  });
});

/* ------------------------------------------------------------------ */
describe('espaciado de etiquetas en el eje X', () => {
  it('con pocos puntos se muestran todas', () => {
    expect(pasoEtiquetasX(6)).toBe(1);
    expect(pasoEtiquetasX(3)).toBe(1);
  });

  it('con 30 días se reparten, no se amontonan', () => {
    const paso = pasoEtiquetasX(30);
    const cuantas = Array.from({ length: 30 }, (_, i) => i).filter((i) => llevaEtiqueta(i, 30, paso)).length;
    expect(cuantas).toBeLessThanOrEqual(7);
    expect(cuantas).toBeGreaterThanOrEqual(5);
  });

  it('la ÚLTIMA siempre lleva etiqueta', () => {
    for (const n of [7, 12, 30, 31]) {
      expect(llevaEtiqueta(n - 1, n, pasoEtiquetasX(n))).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('coordenadas', () => {
  it('el primer punto va en el margen izquierdo y el último en el derecho', () => {
    expect(coordX(0, 10, marco)).toBe(marco.padL);
    expect(coordX(9, 10, marco)).toBe(marco.ancho - marco.padR);
  });

  it('con un solo dato se centra, en vez de pegarse al borde', () => {
    const x = coordX(0, 1, marco);
    expect(x).toBeGreaterThan(marco.padL);
    expect(x).toBeLessThan(marco.ancho - marco.padR);
  });

  it('el cero va abajo y el tope arriba', () => {
    const abajo = coordY(0, 1000, marco);
    const arriba = coordY(1000, 1000, marco);
    expect(abajo).toBeGreaterThan(arriba);
    expect(arriba).toBe(marco.padT);
  });

  it('un tope de cero no produce NaN', () => {
    expect(Number.isFinite(coordY(0, 0, marco))).toBe(true);
  });

  it('los puntos van repartidos por igual', () => {
    const xs = [0, 1, 2, 3].map((i) => coordX(i, 4, marco));
    const saltos = xs.slice(1).map((x, i) => x - xs[i]);
    expect(Math.max(...saltos) - Math.min(...saltos)).toBeLessThan(1e-6);
  });
});

/* ------------------------------------------------------------------ */
describe('rutas SVG', () => {
  const valores = [1000, 3000, 2000, 5000];
  const tope = escalaY(5000).tope;

  it('la línea empieza con M y sigue con L', () => {
    const d = rutaLinea(valores, tope, marco);
    expect(d.startsWith('M')).toBe(true);
    expect((d.match(/L/g) ?? []).length).toBe(valores.length - 1);
  });

  it('el área baja al suelo y se cierra', () => {
    const d = rutaArea(valores, tope, marco);
    expect(d.endsWith('Z')).toBe(true);
    const suelo = marco.padT + (marco.alto - marco.padT - marco.padB);
    expect(d).toContain(String(suelo));
  });

  it('el área contiene la línea entera', () => {
    expect(rutaArea(valores, tope, marco).startsWith(rutaLinea(valores, tope, marco))).toBe(true);
  });

  it('sin datos no se genera ruta', () => {
    expect(rutaArea([], tope, marco)).toBe('');
  });

  it('ninguna coordenada sale NaN con datos raros', () => {
    for (const vs of [[0, 0, 0], [1], [0, 1_000_000]]) {
      const d = rutaLinea(vs, escalaY(Math.max(...vs)).tope, marco);
      expect(d).not.toContain('NaN');
    }
  });
});

/* ------------------------------------------------------------------ */
describe('punto más cercano al cursor', () => {
  it('en el borde izquierdo señala el primero, en el derecho el último', () => {
    expect(indiceMasCercano(marco.padL, 10, marco)).toBe(0);
    expect(indiceMasCercano(marco.ancho - marco.padR, 10, marco)).toBe(9);
  });

  it('en el centro señala el del medio', () => {
    expect(indiceMasCercano(marco.ancho / 2, 11, marco)).toBe(5);
  });

  it('fuera de la gráfica no se sale del rango', () => {
    expect(indiceMasCercano(-500, 10, marco)).toBe(0);
    expect(indiceMasCercano(9999, 10, marco)).toBe(9);
  });

  it('con un solo dato siempre señala ese', () => {
    expect(indiceMasCercano(123, 1, marco)).toBe(0);
  });
});
