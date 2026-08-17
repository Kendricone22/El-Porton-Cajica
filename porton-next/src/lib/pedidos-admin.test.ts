import { describe, it, expect } from 'vitest';
import {
  ESTADOS,
  ETIQUETA_ESTADO,
  detallesDeLinea,
  dinero,
  enlaceWhatsApp,
  esEstadoValido,
  fechaCorta,
  type LineaPedidoGuardada,
} from '@/lib/pedidos-admin';

const linea = (o: Partial<LineaPedidoGuardada> = {}): LineaPedidoGuardada => ({
  name: 'Sencilla',
  qty: 1,
  ...o,
});

/* ------------------------------------------------------------------ */
describe('estados del pedido', () => {
  it('son los cuatro de v1, en orden', () => {
    expect(ESTADOS).toEqual(['nuevo', 'en_camino', 'entregado', 'cancelado']);
  });

  it('todos tienen etiqueta legible', () => {
    for (const e of ESTADOS) expect(ETIQUETA_ESTADO[e]).toBeTruthy();
  });

  it('reconoce los válidos y rechaza cualquier otro', () => {
    for (const e of ESTADOS) expect(esEstadoValido(e)).toBe(true);
    for (const e of ['', 'listo', 'NUEVO', 'entregada']) expect(esEstadoValido(e)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('detalle de la línea', () => {
  it('una línea simple no genera detalle', () => {
    expect(detallesDeLinea(linea())).toBe('');
  });

  it('omite la opción "Porción" (etiqueta interna)', () => {
    expect(detallesDeLinea(linea({ option: 'Porción' }))).toBe('');
    expect(detallesDeLinea(linea({ option: 'Koller' }))).toBe('Koller');
  });

  it('el combo indica la bebida', () => {
    expect(detallesDeLinea(linea({ combo: true, drink: 'Sprite' }))).toBe('Combo · Sprite');
    expect(detallesDeLinea(linea({ combo: true }))).toBe('Combo');
  });

  it('junta todo en el orden de v1', () => {
    const d = detallesDeLinea(
      linea({
        option: 'Koller',
        combo: true,
        drink: 'Quatro',
        proteins: ['Res', 'Pollo'],
        flavors: ['Mitad Hawaiana'],
        adiciones: [{ name: 'Tocineta', price: 6000 }],
        notes: 'sin cebolla',
      }),
    );
    expect(d).toBe('Koller · Combo · Quatro · Res+Pollo · Mitad Hawaiana · +Tocineta · Nota: sin cebolla');
  });

  it('sobrevive a campos ausentes', () => {
    expect(() => detallesDeLinea({ name: 'X', qty: 1 })).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
describe('enlace de WhatsApp', () => {
  it('añade el indicativo de Colombia', () => {
    expect(enlaceWhatsApp('3102383007')).toBe('https://wa.me/573102383007');
  });

  it('limpia espacios, guiones y paréntesis', () => {
    expect(enlaceWhatsApp('310 238-30 07')).toBe('https://wa.me/573102383007');
    expect(enlaceWhatsApp('(310) 238 3007')).toBe('https://wa.me/573102383007');
  });

  it('NO duplica el indicativo si ya venía puesto', () => {
    // v1 hace 'wa.me/57' + telefono siempre: con "573102383007" produciría
    // 5757… y el enlace no abriría.
    expect(enlaceWhatsApp('573102383007')).toBe('https://wa.me/573102383007');
    expect(enlaceWhatsApp('+57 310 238 3007')).toBe('https://wa.me/573102383007');
  });

  it('un teléfono vacío no genera enlace', () => {
    expect(enlaceWhatsApp('')).toBe('');
    expect(enlaceWhatsApp('sin numero')).toBe('');
  });
});

/* ------------------------------------------------------------------ */
describe('formatos', () => {
  it('el dinero lleva separador de miles colombiano', () => {
    expect(dinero(56000)).toBe('$56.000');
    expect(dinero(1240000)).toBe('$1.240.000');
  });

  it('un importe ausente se muestra como cero, no como NaN', () => {
    expect(dinero(null)).toBe('$0');
    expect(dinero(undefined)).toBe('$0');
  });

  it('la fecha corta no revienta con una fecha real', () => {
    const f = fechaCorta('2026-08-16T02:37:18+00:00');
    expect(typeof f).toBe('string');
    expect(f.length).toBeGreaterThan(5);
  });
});
