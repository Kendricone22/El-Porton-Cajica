import { describe, it, expect } from 'vitest';
import {
  REPULSION_PARTICULA,
  avanzarHumo,
  avanzarParticula,
  cantidadHumo,
  cantidadParticulas,
  crearHumo,
  crearParticula,
  dprEfectivo,
  esGamaBaja,
  hayQueRegenerar,
  type Particula,
  type Raton,
} from '@/lib/particulas';

const sinRaton: Raton = { x: -9999, y: -9999, activo: false };

const particula = (o: Partial<Particula> = {}): Particula => ({
  x: 100,
  y: 100,
  r: 2,
  vx: 0,
  vy: 0,
  roja: false,
  gris: 180,
  alpha: 0.5,
  ...o,
});

/* ------------------------------------------------------------------ */
describe('detección de equipos de gama baja', () => {
  it.each([
    ['4 núcleos', { hardwareConcurrency: 4 }, true],
    ['2 núcleos', { hardwareConcurrency: 2 }, true],
    ['8 núcleos', { hardwareConcurrency: 8 }, false],
    ['4 GB de RAM', { hardwareConcurrency: 8, deviceMemory: 4 }, true],
    ['8 GB de RAM', { hardwareConcurrency: 8, deviceMemory: 8 }, false],
  ])('%s → %s', (_, nav, esperado) => {
    expect(esGamaBaja(nav)).toBe(esperado);
  });

  it('si el navegador no informa de nada, NO se penaliza', () => {
    // Mejor de más que capar un equipo bueno por falta de información.
    expect(esGamaBaja({})).toBe(false);
  });

  it('deviceMemory ausente no cuenta como poca RAM', () => {
    expect(esGamaBaja({ hardwareConcurrency: 12 })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('cuántas partículas', () => {
  it('crecen con el ancho de la pantalla', () => {
    expect(cantidadParticulas(360, false)).toBeLessThan(cantidadParticulas(1280, false));
  });

  it('nunca bajan de 60 ni pasan de 120', () => {
    for (const w of [200, 320, 768, 1280, 1920, 3840]) {
      const n = cantidadParticulas(w, false);
      expect(n).toBeGreaterThanOrEqual(60);
      expect(n).toBeLessThanOrEqual(120);
    }
  });

  it('en gama baja son la mitad', () => {
    for (const w of [360, 768, 1280, 2560]) {
      expect(cantidadParticulas(w, true)).toBe(Math.round(cantidadParticulas(w, false) * 0.5));
    }
  });

  it('el humo también se reduce a la mitad', () => {
    expect(cantidadHumo(false)).toBe(16);
    expect(cantidadHumo(true)).toBe(8);
  });

  it('la resolución del lienzo se limita, más aún en gama baja', () => {
    expect(dprEfectivo(3, false)).toBe(2);
    expect(dprEfectivo(3, true)).toBe(1.5);
    expect(dprEfectivo(1, false)).toBe(1); // no se infla si la pantalla es 1x
    expect(dprEfectivo(0, false)).toBe(1); // valor ausente
  });
});

/* ------------------------------------------------------------------ */
describe('creación', () => {
  it('todas nacen dentro de la pantalla', () => {
    for (let i = 0; i < 300; i++) {
      const p = crearParticula(800, 600);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });

  it('TODAS suben: la velocidad vertical siempre es negativa', () => {
    // De esto depende que el fondo se sienta como humo subiendo.
    for (let i = 0; i < 300; i++) {
      expect(crearParticula(800, 600).vy).toBeLessThan(0);
      expect(crearHumo(800, 600).vy).toBeLessThan(0);
    }
  });

  it('alrededor del 18% son rojas', () => {
    const n = 4000;
    let rojas = 0;
    for (let i = 0; i < n; i++) if (crearParticula(800, 600).roja) rojas++;
    expect(rojas / n).toBeGreaterThan(0.13);
    expect(rojas / n).toBeLessThan(0.23);
  });

  it('las rojas se ven algo más que las grises', () => {
    // alpha 0.4–0.85 frente a 0.25–0.7.
    const rojas: number[] = [];
    const grises: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = crearParticula(800, 600);
      (p.roja ? rojas : grises).push(p.alpha);
    }
    const media = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(media(rojas)).toBeGreaterThan(media(grises));
  });

  it('el humo es mucho más grande que las partículas', () => {
    for (let i = 0; i < 100; i++) {
      expect(crearHumo(800, 600).r).toBeGreaterThan(crearParticula(800, 600).r * 10);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('movimiento', () => {
  it('avanza según su velocidad', () => {
    const p = particula({ x: 100, y: 100, vx: 2, vy: -3 });
    avanzarParticula(p, 800, 600, sinRaton);
    expect(p.x).toBe(102);
    expect(p.y).toBe(97);
  });

  it('al salir por arriba reaparece por abajo, en otra columna', () => {
    const p = particula({ x: 400, y: -5, r: 2, vy: -1 });
    avanzarParticula(p, 800, 600, sinRaton);
    expect(p.y).toBeGreaterThan(600);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(800);
  });

  it('al salir por la izquierda reaparece por la derecha, y al revés', () => {
    const izq = particula({ x: -10, r: 2 });
    avanzarParticula(izq, 800, 600, sinRaton);
    expect(izq.x).toBe(802);

    const der = particula({ x: 810, r: 2 });
    avanzarParticula(der, 800, 600, sinRaton);
    expect(der.x).toBe(-2);
  });

  it('ninguna se pierde: tras 5000 pasos siguen todas en pantalla', () => {
    const ps = Array.from({ length: 40 }, () => crearParticula(800, 600));
    for (let t = 0; t < 5000; t++) for (const p of ps) avanzarParticula(p, 800, 600, sinRaton);
    for (const p of ps) {
      expect(p.x).toBeGreaterThan(-p.r - 1);
      expect(p.x).toBeLessThan(800 + p.r + 1);
      expect(p.y).toBeLessThan(600 + p.r + 1);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('repulsión del cursor', () => {
  const raton: Raton = { x: 400, y: 300, activo: true };

  it('empuja EN DIRECCIÓN CONTRARIA al cursor', () => {
    const p = particula({ x: 450, y: 300 }); // a la derecha del cursor
    const antes = p.x;
    avanzarParticula(p, 800, 600, raton);
    expect(p.x).toBeGreaterThan(antes); // se aleja hacia la derecha

    const q = particula({ x: 350, y: 300 }); // a la izquierda
    const antesQ = q.x;
    avanzarParticula(q, 800, 600, raton);
    expect(q.x).toBeLessThan(antesQ); // se aleja hacia la izquierda
  });

  it('cuanto más cerca, más fuerte el empujón', () => {
    const cerca = particula({ x: 410, y: 300 });
    const lejos = particula({ x: 520, y: 300 });
    avanzarParticula(cerca, 800, 600, raton);
    avanzarParticula(lejos, 800, 600, raton);
    expect(cerca.x - 410).toBeGreaterThan(lejos.x - 520);
  });

  it('fuera del radio no se nota', () => {
    const p = particula({ x: 400 + REPULSION_PARTICULA.radio + 5, y: 300 });
    const antes = p.x;
    avanzarParticula(p, 800, 600, raton);
    expect(p.x).toBe(antes);
  });

  it('sin cursor activo no empuja nada', () => {
    const p = particula({ x: 405, y: 300 });
    avanzarParticula(p, 800, 600, sinRaton);
    expect(p.x).toBe(405);
  });

  it('el cursor justo encima no rompe nada (división por cero)', () => {
    const p = particula({ x: 400, y: 300 });
    expect(() => avanzarParticula(p, 800, 600, raton)).not.toThrow();
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('el humo tiene más radio pero menos fuerza que las partículas', () => {
    const h = { x: 400 + 200, y: 300, r: 100, vx: 0, vy: 0, gris: 120, alpha: 0.1 };
    const antes = h.x;
    avanzarHumo(h, 800, 600, raton);
    // A 200px una partícula ya no se enteraría (radio 150); el humo sí.
    expect(h.x).toBeGreaterThan(antes);
  });
});

/* ------------------------------------------------------------------ */
describe('cuándo regenerar al cambiar el tamaño', () => {
  it('un cambio real de ancho SÍ regenera', () => {
    expect(hayQueRegenerar(1280, 768)).toBe(true);
    expect(hayQueRegenerar(360, 768)).toBe(true);
  });

  it('la barra de direcciones del móvil NO regenera', () => {
    // Solo cambia el alto; el ancho se queda igual. Regenerar aquí se
    // vería como una explosión disparada hacia arriba.
    expect(hayQueRegenerar(390, 390)).toBe(false);
  });

  it('un temblor de pocos píxeles tampoco', () => {
    expect(hayQueRegenerar(1280, 1270)).toBe(false);
    expect(hayQueRegenerar(1280, 1241)).toBe(false);
  });

  it('pero 41 píxeles ya cuentan', () => {
    expect(hayQueRegenerar(1280, 1239)).toBe(true);
  });
});
