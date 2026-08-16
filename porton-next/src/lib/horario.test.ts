import { describe, it, expect } from 'vitest';
import {
  aLunes,
  aMinutos,
  deMinutos,
  esFestivo,
  estadoEn,
  festivosDe,
  hora12,
  horarioDe,
  momentoLocal,
  pascuaUTC,
} from '@/lib/horario';

/** Fecha y hora EN CAJICÁ (UTC-5) expresada como instante real. */
const enCajica = (y: number, m: number, d: number, hh: number, mm = 0) =>
  new Date(Date.UTC(y, m - 1, d, hh + 5, mm));

const fecha = (ms: number) => {
  const x = new Date(ms);
  return `${x.getUTCFullYear()}-${x.getUTCMonth() + 1}-${x.getUTCDate()}`;
};

/* ------------------------------------------------------------------ */
describe('Pascua', () => {
  // Fechas oficiales del Domingo de Resurrección.
  it.each([
    [2024, '2024-3-31'],
    [2025, '2025-4-20'],
    [2026, '2026-4-5'],
    [2027, '2027-3-28'],
    [2030, '2030-4-21'],
  ])('en %s cae el %s', (y, esperado) => {
    expect(fecha(pascuaUTC(y))).toBe(esperado);
  });

  it('siempre cae en domingo', () => {
    for (let y = 2024; y <= 2040; y++) {
      expect(new Date(pascuaUTC(y)).getUTCDay()).toBe(0);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('Ley Emiliani: traslado al lunes', () => {
  it('un festivo en martes se va al lunes siguiente', () => {
    const martes = Date.UTC(2026, 0, 6); // 6 de enero de 2026, martes
    expect(new Date(martes).getUTCDay()).toBe(2);
    expect(fecha(aLunes(martes))).toBe('2026-1-12');
  });

  it('un festivo que YA cae en lunes se queda donde está', () => {
    const lunes = Date.UTC(2025, 0, 6); // 6 de enero de 2025, lunes
    expect(new Date(lunes).getUTCDay()).toBe(1);
    expect(fecha(aLunes(lunes))).toBe('2025-1-6');
  });

  it('el resultado siempre es lunes', () => {
    for (let n = 0; n < 40; n++) {
      const ms = Date.UTC(2026, 0, 1) + n * 86_400_000;
      expect(new Date(aLunes(ms)).getUTCDay()).toBe(1);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('festivos colombianos de 2026', () => {
  it.each([
    ['Año Nuevo', 1, 1],
    ['Día del Trabajo', 5, 1],
    ['Independencia', 7, 20],
    ['Batalla de Boyacá', 8, 7],
    ['Inmaculada Concepción', 12, 8],
    ['Navidad', 12, 25],
  ])('%s (%s/%s) es festivo y NO se mueve', (_, m, d) => {
    expect(esFestivo(2026, m, d)).toBe(true);
  });

  it('Reyes 2026 se traslada: el 6 (martes) NO, el 12 (lunes) SÍ', () => {
    expect(esFestivo(2026, 1, 6)).toBe(false);
    expect(esFestivo(2026, 1, 12)).toBe(true);
  });

  it('Jueves y Viernes Santo de 2026 (2 y 3 de abril) no se mueven', () => {
    expect(esFestivo(2026, 4, 2)).toBe(true);
    expect(esFestivo(2026, 4, 3)).toBe(true);
  });

  it('Colombia tiene 18 festivos, que caen en 17 o 18 fechas distintas', () => {
    // 18 en los años normales. 17 cuando dos coinciden — ver la prueba
    // siguiente: no es un fallo del cálculo.
    for (const y of [2024, 2025, 2026, 2027, 2028, 2029, 2030]) {
      expect(festivosDe(y).size).toBeGreaterThanOrEqual(17);
      expect(festivosDe(y).size).toBeLessThanOrEqual(18);
    }
  });

  it('en 2025 y 2030, San Pedro y el Sagrado Corazón caen el MISMO lunes', () => {
    // Los dos se trasladan por Ley Emiliani y aterrizan en la misma
    // fecha: 30/06/2025 y 01/07/2030. Para "¿es festivo?" da igual que
    // coincidan, y el negocio abre ese lunes de todos modos — pero
    // explica por qué esos años tienen 17 fechas en vez de 18.
    expect(festivosDe(2025).size).toBe(17);
    expect(esFestivo(2025, 6, 30)).toBe(true);

    expect(festivosDe(2030).size).toBe(17);
    expect(esFestivo(2030, 7, 1)).toBe(true);
  });

  it('todos los festivos móviles caen en lunes, salvo Semana Santa', () => {
    const E = pascuaUTC(2026);
    for (const n of [43, 64, 71]) {
      expect(new Date(E + n * 86_400_000).getUTCDay()).toBe(1);
    }
  });

  it('un día cualquiera no es festivo', () => {
    expect(esFestivo(2026, 2, 17)).toBe(false);
    expect(esFestivo(2026, 9, 3)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('qué horario aplica cada día', () => {
  it('de martes a domingo se atiende', () => {
    // 17 al 22 de febrero de 2026: martes → domingo
    for (let d = 17; d <= 22; d++) {
      const dow = new Date(Date.UTC(2026, 1, d)).getUTCDay();
      expect(horarioDe(2026, 2, d, dow)).not.toBeNull();
    }
  });

  it('el lunes normal está cerrado', () => {
    const dow = new Date(Date.UTC(2026, 1, 16)).getUTCDay(); // lunes 16 feb
    expect(dow).toBe(1);
    expect(horarioDe(2026, 2, 16, dow)).toBeNull();
  });

  it('pero un LUNES FESTIVO sí abre', () => {
    // 12 de enero de 2026: Reyes trasladado, y es lunes.
    const dow = new Date(Date.UTC(2026, 0, 12)).getUTCDay();
    expect(dow).toBe(1);
    expect(esFestivo(2026, 1, 12)).toBe(true);
    expect(horarioDe(2026, 0 + 1, 12, dow)).toEqual({ open: '13:00', close: '22:00' });
  });
});

/* ------------------------------------------------------------------ */
describe('conversión de horas', () => {
  it.each([
    ['00:00', 0],
    ['13:00', 780],
    ['22:00', 1320],
    ['09:30', 570],
  ])('%s son %s minutos', (hhmm, min) => {
    expect(aMinutos(hhmm as string)).toBe(min);
    expect(deMinutos(min as number)).toBe(hhmm);
  });

  it.each([
    ['13:00', '1:00 p.m.'],
    ['22:00', '10:00 p.m.'],
    ['00:00', '12:00 a.m.'],
    ['12:00', '12:00 p.m.'],
    ['09:40', '9:40 a.m.'],
  ])('%s se muestra como %s', (h24, h12) => {
    expect(hora12(h24 as string)).toBe(h12);
  });
});

/* ------------------------------------------------------------------ */
describe('estado del negocio', () => {
  it('un martes a las 3 p.m. está ABIERTO', () => {
    const e = estadoEn(enCajica(2026, 2, 17, 15));
    expect(e.abierto).toBe(true);
    expect(e.cierraA).toBe('10:00 p.m.');
  });

  it('justo al abrir (1:00 p.m.) ya está abierto', () => {
    expect(estadoEn(enCajica(2026, 2, 17, 13, 0)).abierto).toBe(true);
  });

  it('un minuto antes de abrir sigue cerrado', () => {
    const e = estadoEn(enCajica(2026, 2, 17, 12, 59));
    expect(e.abierto).toBe(false);
    expect(e.proxima).toEqual({ etiqueta: 'hoy', hora: '1:00 p.m.' });
  });

  it('justo al cerrar (10:00 p.m.) YA está cerrado', () => {
    // El cierre es exclusivo: a las 22:00 en punto ya no se atiende.
    expect(estadoEn(enCajica(2026, 2, 17, 22, 0)).abierto).toBe(false);
  });

  it('tras cerrar, la próxima apertura es mañana', () => {
    const e = estadoEn(enCajica(2026, 2, 17, 23));
    expect(e.abierto).toBe(false);
    expect(e.proxima).toEqual({ etiqueta: 'mañana', hora: '1:00 p.m.' });
  });

  it('el domingo por la noche, la próxima NO es el lunes (cerrado) sino el martes', () => {
    const e = estadoEn(enCajica(2026, 2, 15, 23)); // domingo 15 feb
    expect(e.abierto).toBe(false);
    expect(e.proxima?.etiqueta).toMatch(/martes/i);
  });

  it('el lunes normal está cerrado todo el día', () => {
    for (const h of [8, 13, 18, 21]) {
      expect(estadoEn(enCajica(2026, 2, 16, h)).abierto).toBe(false);
    }
  });

  it('el lunes FESTIVO sí abre en su horario', () => {
    expect(estadoEn(enCajica(2026, 1, 12, 15)).abierto).toBe(true); // Reyes trasladado
    expect(estadoEn(enCajica(2026, 1, 12, 11)).abierto).toBe(false);
  });

  it('el estado NO depende de la zona del visitante', () => {
    // El mismo instante real, mirado desde cualquier reloj, da lo mismo:
    // 20:00 en Cajicá = 01:00 UTC del día siguiente.
    const instante = new Date(Date.UTC(2026, 1, 18, 1, 0));
    expect(estadoEn(instante).abierto).toBe(true);
  });

  it('siempre dice cuándo vuelve a abrir si está cerrado', () => {
    for (let d = 1; d <= 28; d++) {
      for (const h of [3, 11, 23]) {
        const e = estadoEn(enCajica(2026, 4, d, h));
        if (!e.abierto) expect(e.proxima).not.toBeNull();
      }
    }
  });
});

/* ------------------------------------------------------------------ */
describe('lectura de la hora local', () => {
  it('convierte a la hora de Cajicá, no a la del sistema', () => {
    const L = momentoLocal(new Date(Date.UTC(2026, 1, 17, 20, 30))); // 20:30 UTC
    expect(L.y).toBe(2026);
    expect(L.m).toBe(2);
    expect(L.d).toBe(17);
    expect(L.minutos).toBe(15 * 60 + 30); // 15:30 en Cajicá (UTC-5)
  });

  it('cruza correctamente el cambio de día', () => {
    // 02:00 UTC del 18 = 21:00 del 17 en Cajicá.
    const L = momentoLocal(new Date(Date.UTC(2026, 1, 18, 2, 0)));
    expect(L.d).toBe(17);
    expect(L.minutos).toBe(21 * 60);
  });
});
