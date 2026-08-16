/* =============================================================
 * MOTOR DE HORARIO Y FESTIVOS DE COLOMBIA
 *
 * Responde a una sola pregunta: ¿está abierto El Portón AHORA MISMO?
 *
 * ⚠️ Todo se calcula en la zona horaria del NEGOCIO, no en la del
 * visitante. Si alguien entra desde Madrid, o tiene el reloj del
 * celular mal puesto, la respuesta sigue siendo la correcta.
 *
 * Los festivos colombianos son tres familias:
 *   · Fijos que no se mueven (Año Nuevo, Trabajo, Independencia…).
 *   · Fijos que se corren al lunes siguiente (Ley Emiliani 51 de 1983).
 *   · Móviles atados a la Pascua: Jueves y Viernes Santo no se mueven;
 *     Ascensión, Corpus Christi y Sagrado Corazón sí se corren.
 *
 * La aritmética de días va en UTC a propósito: sumar 24 horas a una
 * fecha local se rompe en los cambios de horario de verano. En UTC un
 * día son siempre 86.400.000 ms exactos.
 * ============================================================= */

import { BUSINESS } from '@/data/menu';

type Franja = { open: string; close: string };
type Negocio = {
  timeZone: string;
  siteUrl: string;
  hours: Record<number, Franja | null>;
  holidayMondayHours: Franja;
};

const B = BUSINESS as Negocio;
const DIA_MS = 86_400_000;

/* -------------------------------------------------------------
 * Fecha y hora tal como se viven en Cajicá
 * ----------------------------------------------------------- */

export type MomentoLocal = {
  y: number;
  m: number;
  d: number;
  /** Minutos transcurridos desde medianoche. */
  minutos: number;
  /** Día de la semana, 0 = domingo. */
  dow: number;
};

const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: B.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function momentoLocal(fecha: Date = new Date()): MomentoLocal {
  const p: Record<string, string> = {};
  for (const x of formateador.formatToParts(fecha)) {
    if (x.type !== 'literal') p[x.type] = x.value;
  }

  // Algunos motores devuelven "24" a medianoche en lugar de "00".
  let hh = Number(p.hour);
  if (hh === 24) hh = 0;

  const y = Number(p.year);
  const m = Number(p.month);
  const d = Number(p.day);

  return {
    y,
    m,
    d,
    minutos: hh * 60 + Number(p.minute),
    dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
  };
}

/* -------------------------------------------------------------
 * Festivos
 * ----------------------------------------------------------- */

/** Domingo de Pascua por el cómputo gregoriano anónimo (Meeus/Jones/Butcher). */
export function pascuaUTC(y: number): number {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, mes - 1, dia);
}

/** Ley Emiliani: al lunes siguiente. Si ya cae lunes, se queda. */
export function aLunes(ms: number): number {
  const w = new Date(ms).getUTCDay();
  return ms + ((8 - w) % 7) * DIA_MS;
}

const clave = (ms: number) => {
  const x = new Date(ms);
  return `${x.getUTCMonth() + 1}-${x.getUTCDate()}`;
};

const cache = new Map<number, Set<string>>();

export function festivosDe(y: number): Set<string> {
  const guardado = cache.get(y);
  if (guardado) return guardado;

  // Fijos que NO se mueven.
  const s = new Set(['1-1', '5-1', '7-20', '8-7', '12-8', '12-25']);

  // Fijos que se corren al lunes: Reyes, San José, San Pedro y San Pablo,
  // Asunción, Día de la Raza, Todos los Santos, Independencia de Cartagena.
  for (const [mes, dia] of [
    [1, 6],
    [3, 19],
    [6, 29],
    [8, 15],
    [10, 12],
    [11, 1],
    [11, 11],
  ]) {
    s.add(clave(aLunes(Date.UTC(y, mes - 1, dia))));
  }

  const E = pascuaUTC(y);
  s.add(clave(E - 3 * DIA_MS)); // Jueves Santo
  s.add(clave(E - 2 * DIA_MS)); // Viernes Santo

  // Ascensión (+39), Corpus (+60) y Sagrado Corazón (+68) siempre corren
  // al lunes siguiente, que cae en +43, +64 y +71.
  for (const n of [43, 64, 71]) s.add(clave(E + n * DIA_MS));

  cache.set(y, s);
  return s;
}

export const esFestivo = (y: number, m: number, d: number) => festivosDe(y).has(`${m}-${d}`);

/* -------------------------------------------------------------
 * Horario
 * ----------------------------------------------------------- */

/** El horario que aplica a un día concreto, o null si está cerrado. */
export function horarioDe(y: number, m: number, d: number, dow: number): Franja | null {
  const h = B.hours[dow];
  if (h) return h;
  // Lunes: cerrado, salvo que sea festivo colombiano.
  return esFestivo(y, m, d) ? B.holidayMondayHours : null;
}

export const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + (Number(m) || 0);
};

export const deMinutos = (n: number): string =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** "13:30" → "1:30 p.m." */
export function hora12(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const h = Number(hs);
  const m = Number(ms) || 0;
  const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

const fmtDia = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type DiaServicio = {
  ms: number;
  abre: number;
  cierra: number;
  esHoy: boolean;
};

/** Los próximos días en los que SÍ se atiende (salta los cerrados). */
function proximosDias(desde: MomentoLocal, cuantos: number): DiaServicio[] {
  const base = Date.UTC(desde.y, desde.m - 1, desde.d);
  const out: DiaServicio[] = [];

  for (let n = 0; n < 14 && out.length < cuantos; n++) {
    const ms = base + n * DIA_MS;
    const x = new Date(ms);
    const h = horarioDe(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCDay());
    if (!h) continue;
    out.push({ ms, abre: aMinutos(h.open), cierra: aMinutos(h.close), esHoy: n === 0 });
  }
  return out;
}

function etiquetaDia(dia: DiaServicio, hoy: MomentoLocal): string {
  if (dia.esHoy) return 'hoy';
  if (dia.ms === Date.UTC(hoy.y, hoy.m - 1, hoy.d) + DIA_MS) return 'mañana';
  return capitalizar(fmtDia.format(new Date(dia.ms)).replace(/,/g, ''));
}

export type EstadoNegocio = {
  abierto: boolean;
  /** Hora de cierre de hoy, si hoy se atiende. */
  cierraA: string;
  /** Cuándo vuelve a abrir, si ahora está cerrado. */
  proxima: { etiqueta: string; hora: string } | null;
};

export function estadoEn(fecha: Date = new Date()): EstadoNegocio {
  const L = momentoLocal(fecha);
  const hoy = horarioDe(L.y, L.m, L.d, L.dow);

  let abierto = false;
  let cierraA = '';

  if (hoy) {
    abierto = L.minutos >= aMinutos(hoy.open) && L.minutos < aMinutos(hoy.close);
    cierraA = hora12(hoy.close);
  }

  let proxima: EstadoNegocio['proxima'] = null;
  if (!abierto) {
    for (const dia of proximosDias(L, 3)) {
      // Hoy sirve como "próxima" solo si todavía no ha abierto.
      if (dia.esHoy && L.minutos >= dia.cierra) continue;
      proxima = { etiqueta: etiquetaDia(dia, L), hora: hora12(deMinutos(dia.abre)) };
      break;
    }
  }

  return { abierto, cierraA, proxima };
}
