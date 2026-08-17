/* =============================================================
 * VENTANA DE VENTAS — matemática de las gráficas
 *
 * Escalas, etiquetas de ejes y rutas SVG. Todo puro: entra un array
 * de números y salen coordenadas. Lo que pinta va aparte.
 * ============================================================= */

export type Granularidad = 'dia' | 'semana' | 'mes';

export const PERIODOS: Record<Granularidad, number> = { dia: 30, semana: 12, mes: 12 };
export const TITULO: Record<Granularidad, string> = {
  dia: 'Últimos 30 días',
  semana: 'Últimas 12 semanas',
  mes: 'Últimos 12 meses',
};
export const UNIDAD: Record<Granularidad, string> = { dia: 'día', semana: 'semana', mes: 'mes' };

export type PuntoSerie = { inicio: string; ingreso: number; pedidos: number };
export type FilaTop = { producto: string; categoria: string; unidades: number; ingreso: number };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-08-05" → "05/08" por día y semana, "ago 26" por mes. */
export function etiquetaEje(iso: string, gran: Granularidad): string {
  const p = String(iso).split('-');
  if (gran === 'mes') return `${MESES[Number(p[1]) - 1]} ${p[0].slice(2)}`;
  return `${p[2]}/${p[1]}`;
}

/**
 * Escala redonda para el eje Y: 0 / 250k / 500k… en vez de 0 / 183.412.
 * Se busca un paso "bonito" (0,25 · 0,5 · 1 o 2 veces la potencia de 10
 * más cercana) y se sube el tope hasta el múltiplo siguiente.
 */
export function escalaY(max: number): { tope: number; paso: number } {
  if (!(max > 0)) return { tope: 1000, paso: 250 };
  const magnitud = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / magnitud;
  const paso = (n <= 1 ? 0.25 : n <= 2 ? 0.5 : n <= 5 ? 1 : 2) * magnitud;
  return { tope: Math.ceil(max / paso) * paso, paso };
}

/** Los valores de las marcas del eje Y, de 0 al tope. */
export function marcasY(escala: { tope: number; paso: number }): number[] {
  const out: number[] = [];
  for (let v = 0; v <= escala.tope + 1; v += escala.paso) out.push(v);
  return out;
}

/** Formato compacto para las marcas: $1,2M · $250k · $900. */
export function formatoCorto(v: number): string {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'k';
  return '$' + v;
}

/**
 * Cada cuántos puntos se pinta una etiqueta en el eje X. Con 30 días no
 * caben las 30, así que se muestran ~6 repartidas.
 */
export const pasoEtiquetasX = (cuantos: number): number => Math.max(1, Math.ceil(cuantos / 6));

/** ¿Esta posición lleva etiqueta? La última SIEMPRE la lleva. */
export const llevaEtiqueta = (i: number, total: number, paso: number): boolean =>
  i % paso === 0 || i === total - 1;

/* -------------------------------------------------------------
 * Coordenadas
 * ----------------------------------------------------------- */

export type Marco = {
  ancho: number;
  alto: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
};

export const MARCO_POR_DEFECTO: Omit<Marco, 'ancho'> = {
  alto: 240,
  padL: 54,
  padR: 14,
  padT: 12,
  padB: 26,
};

/** Posición horizontal del punto i. Con un solo dato, va centrado. */
export function coordX(i: number, total: number, m: Marco): number {
  const pw = m.ancho - m.padL - m.padR;
  return m.padL + (total === 1 ? pw / 2 : (i / (total - 1)) * pw);
}

/** Posición vertical de un valor. 0 abajo, el tope arriba. */
export function coordY(v: number, tope: number, m: Marco): number {
  const ph = m.alto - m.padT - m.padB;
  return m.padT + ph - (tope ? (v / tope) * ph : 0);
}

/** La línea de la gráfica. */
export function rutaLinea(valores: number[], tope: number, m: Marco): string {
  return valores
    .map((v, i) => `${i ? 'L' : 'M'}${coordX(i, valores.length, m).toFixed(1)} ${coordY(v, tope, m).toFixed(1)}`)
    .join(' ');
}

/** El área bajo la línea: la misma ruta, bajada al suelo y cerrada. */
export function rutaArea(valores: number[], tope: number, m: Marco): string {
  if (!valores.length) return '';
  const suelo = m.padT + (m.alto - m.padT - m.padB);
  const n = valores.length;
  return (
    rutaLinea(valores, tope, m) +
    ` L${coordX(n - 1, n, m).toFixed(1)} ${suelo}` +
    ` L${coordX(0, n, m).toFixed(1)} ${suelo} Z`
  );
}

/** Qué punto de la serie corresponde a una posición del ratón. */
export function indiceMasCercano(px: number, total: number, m: Marco): number {
  if (total <= 1) return 0;
  const pw = m.ancho - m.padL - m.padR;
  const proporcion = (px - m.padL) / pw;
  return Math.min(total - 1, Math.max(0, Math.round(proporcion * (total - 1))));
}
