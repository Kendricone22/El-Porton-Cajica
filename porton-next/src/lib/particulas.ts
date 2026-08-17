/* =============================================================
 * FÍSICA DEL FONDO ANIMADO — funciones puras
 *
 * El dibujo en el <canvas> tiene que quedarse imperativo, pero el
 * MOVIMIENTO no: cuántas partículas hay, cómo avanzan, cuándo
 * reaparecen por el otro lado y cómo huyen del cursor son reglas que
 * se pueden calcular y comprobar sin pintar un solo píxel.
 *
 * Y hacía falta separarlo: `requestAnimationFrame` no se ejecuta en
 * pestañas de segundo plano, así que la animación es imposible de
 * verificar mirando el lienzo en el entorno de pruebas. Con la física
 * aparte, se comprueba de forma determinista.
 * ============================================================= */

export type Particula = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  roja: boolean;
  gris: number;
  alpha: number;
};

export type Humo = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  gris: number;
  alpha: number;
};

export type Raton = { x: number; y: number; activo: boolean };

/** Radio de influencia del cursor y fuerza del empujón. */
export const REPULSION_PARTICULA = { radio: 150, fuerza: 6 };
export const REPULSION_HUMO = { radio: 260, fuerza: 2.2 };

const azar = (min: number, max: number) => Math.random() * (max - min) + min;

/* -------------------------------------------------------------
 * Cuántas
 * ----------------------------------------------------------- */

/**
 * Gama baja: pocos núcleos o poca RAM. `deviceMemory` no existe en
 * todos los navegadores; si falta, NO penaliza (mejor de más que
 * capar un equipo bueno por falta de información).
 */
export function esGamaBaja(nav: { hardwareConcurrency?: number; deviceMemory?: number }): boolean {
  const nucleos = nav.hardwareConcurrency;
  const ram = nav.deviceMemory;
  return (nucleos !== undefined && nucleos > 0 && nucleos <= 4) || (ram !== undefined && ram <= 4);
}

/** Densidad proporcional al ancho, con suelo y techo. */
export function cantidadParticulas(ancho: number, gamaBaja: boolean): number {
  const base = Math.round(Math.min(120, Math.max(60, ancho / 14)));
  return gamaBaja ? Math.round(base * 0.5) : base;
}

export const cantidadHumo = (gamaBaja: boolean): number => (gamaBaja ? 8 : 16);

/** Resolución del lienzo: se limita para no reventar equipos flojos. */
export const dprEfectivo = (dprPantalla: number, gamaBaja: boolean): number =>
  Math.min(dprPantalla || 1, gamaBaja ? 1.5 : 2);

/* -------------------------------------------------------------
 * Creación
 * ----------------------------------------------------------- */

export function crearParticula(W: number, H: number): Particula {
  const roja = Math.random() < 0.18; // ~18% en rojo de marca
  return {
    x: azar(0, W),
    y: azar(0, H),
    r: azar(0.8, 2.6),
    vx: azar(-0.15, 0.15),
    // Siempre negativa: todo sube, como el humo.
    vy: azar(-0.45, -0.08),
    roja,
    gris: Math.floor(azar(130, 220)),
    alpha: roja ? azar(0.4, 0.85) : azar(0.25, 0.7),
  };
}

export function crearHumo(W: number, H: number): Humo {
  return {
    x: azar(0, W),
    y: azar(0, H),
    r: azar(60, 140),
    vx: azar(-0.18, 0.18),
    vy: azar(-0.5, -0.14),
    gris: Math.floor(azar(95, 175)),
    alpha: azar(0.05, 0.12),
  };
}

/* -------------------------------------------------------------
 * Movimiento
 * ----------------------------------------------------------- */

/** Empuja un punto lejos del cursor. Modifica el objeto que recibe. */
function repeler(
  o: { x: number; y: number },
  raton: Raton,
  radio: number,
  fuerza: number,
): void {
  if (!raton.activo) return;
  const dx = o.x - raton.x;
  const dy = o.y - raton.y;
  const d = Math.hypot(dx, dy);
  if (d >= radio || d === 0) return;
  // Cuanto más cerca, más fuerte.
  const f = ((radio - d) / radio) * fuerza;
  o.x += (dx / d) * f;
  o.y += (dy / d) * f;
}

/**
 * Reaparición por el lado contrario. Al salir por arriba vuelve por
 * abajo EN OTRA COLUMNA, para que no se vea una fila repitiéndose.
 */
function envolver(o: { x: number; y: number; r: number }, W: number, H: number): void {
  if (o.y + o.r < 0) {
    o.y = H + o.r;
    o.x = azar(0, W);
  }
  if (o.x < -o.r) o.x = W + o.r;
  else if (o.x > W + o.r) o.x = -o.r;
}

export function avanzarParticula(p: Particula, W: number, H: number, raton: Raton): void {
  p.x += p.vx;
  p.y += p.vy;
  repeler(p, raton, REPULSION_PARTICULA.radio, REPULSION_PARTICULA.fuerza);
  envolver(p, W, H);
}

export function avanzarHumo(s: Humo, W: number, H: number, raton: Raton): void {
  s.x += s.vx;
  s.y += s.vy;
  repeler(s, raton, REPULSION_HUMO.radio, REPULSION_HUMO.fuerza);
  envolver(s, W, H);
}

/**
 * ¿Hay que regenerar todo al cambiar el tamaño?
 *
 * ⚠️ Solo si cambió el ANCHO de verdad. En móvil, al desplazarse la
 * barra de direcciones se colapsa y expande, y eso dispara 'resize' en
 * cadena cambiando SOLO el alto. Regenerar en cada uno se ve como una
 * explosión disparada hacia arriba, porque la velocidad vertical de
 * todas las partículas es negativa.
 */
export const hayQueRegenerar = (anchoNuevo: number, anchoPrevio: number): boolean =>
  Math.abs(anchoNuevo - anchoPrevio) > 40;
