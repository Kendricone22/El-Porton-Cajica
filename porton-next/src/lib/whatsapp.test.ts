import { describe, it, expect } from 'vitest';
import { construirMensaje, urlWhatsApp, PREFIJO, type LineaPedido } from '@/lib/whatsapp';
import type { DatosFormulario } from '@/types/carrito';

const datos: DatosFormulario = {
  nombre: 'Camilo',
  telefono: '3102383007',
  direccion: 'Calle 11 A Sur #10-75',
  pago: 'Efectivo',
  cambio: '50.000',
};

const linea = (o: Partial<LineaPedido> = {}): LineaPedido => ({
  id: 'h-sencilla',
  name: 'Sencilla',
  cat: 'hamburguesas',
  qty: 1,
  unitPrice: 13000,
  option: 'Koller',
  combo: false,
  drink: null,
  adiciones: [],
  proteins: [],
  flavors: [],
  slice: '',
  choices: [],
  notes: '',
  ...o,
});

const msg = (ls: LineaPedido[], d = datos) =>
  construirMensaje(ls, d, ls.reduce((s, l) => s + l.unitPrice * l.qty, 0));

/* ------------------------------------------------------------------ */
describe('estructura del mensaje', () => {
  it('la PRIMERA línea es la marca de rastreo', () => {
    // Es lo que distingue un pedido de la web de uno escrito a mano.
    expect(msg([linea()]).split('\n')[0]).toBe(PREFIJO);
  });

  it('lleva la cabecera y los divisores', () => {
    const m = msg([linea()]);
    expect(m).toContain('🔔 *¡NUEVO PEDIDO RECIBIDO!*');
    expect(m.split('━━━━━━━━━━━━━━━━━━').length - 1).toBe(2);
  });

  it('cierra con los datos de despacho', () => {
    const m = msg([linea()]);
    expect(m).toContain('📦 *DATOS DE DESPACHO*');
    expect(m).toContain('*Nombre:* Camilo');
    expect(m).toContain('*Teléfono:* 3102383007');
    expect(m).toContain('*Dirección:* Calle 11 A Sur #10-75');
  });
});

/* ------------------------------------------------------------------ */
describe('cada producto', () => {
  it('lleva cantidad, nombre y el total de la línea (no el unitario)', () => {
    expect(msg([linea({ qty: 3 })])).toContain('• (3)x Sencilla — $39.000');
  });

  it('muestra la variación', () => {
    expect(msg([linea({ option: 'Artesanal' })])).toContain('↳ Variación: Artesanal');
  });

  it('omite la opción "Porción" (es una etiqueta interna)', () => {
    const m = msg([linea({ option: 'Porción', cat: 'salchipapas' })]);
    expect(m).not.toContain('Porción');
  });

  it('junta proteínas con " + "', () => {
    const m = msg([linea({ cat: 'mazorcadas', option: 'Porción', proteins: ['Res', 'Pollo'] })]);
    expect(m).toContain('↳ Variación: Res + Pollo');
  });

  it('en hamburguesas y perros SIEMPRE dice si lleva combo', () => {
    expect(msg([linea({ combo: false })])).toContain('Combo: No');
    expect(msg([linea({ cat: 'perros', combo: false })])).toContain('Combo: No');
  });

  it('el combo lleva la bebida entre paréntesis', () => {
    expect(msg([linea({ combo: true, drink: 'Sprite' })])).toContain('Combo: Sí (Sprite)');
  });

  it('en el resto de categorías NO se menciona el combo', () => {
    expect(msg([linea({ cat: 'pizzas', option: 'Familiar' })])).not.toContain('Combo:');
  });

  it('separa variación y combo con " | "', () => {
    expect(msg([linea({ option: 'Koller', combo: true, drink: 'Quatro' })])).toContain(
      '↳ Variación: Koller | Combo: Sí (Quatro)',
    );
  });

  it('lista sabores, trozos, selectores, adiciones y nota', () => {
    const m = msg([
      linea({
        cat: 'pizzas',
        option: 'Familiar',
        flavors: ['Mitad Hawaiana', 'Cuarto Pollo'],
        slice: 'x12',
        choices: ['Sin jalapeño'],
        adiciones: [{ name: 'Champiñón Salteado', price: 6000 }],
        notes: 'bien cocida',
      }),
    ]);
    expect(m).toContain('↳ Sabores: Mitad Hawaiana, Cuarto Pollo');
    expect(m).toContain('↳ Trozos: x12');
    expect(m).toContain('↳ Sin jalapeño');
    expect(m).toContain('↳ Adiciones: Champiñón Salteado');
    expect(m).toContain('↳ Nota: bien cocida');
  });

  it('no imprime líneas vacías por campos ausentes', () => {
    const m = msg([linea()]);
    expect(m).not.toContain('↳ Sabores:');
    expect(m).not.toContain('↳ Trozos:');
    expect(m).not.toContain('↳ Adiciones:');
    expect(m).not.toContain('↳ Nota:');
  });

  it('varios productos salen todos', () => {
    const m = msg([linea(), linea({ id: 'p-clasico', name: 'Perro Clásico', cat: 'perros' })]);
    expect(m).toContain('Sencilla');
    expect(m).toContain('Perro Clásico');
  });
});

/* ------------------------------------------------------------------ */
describe('totales y pago', () => {
  it('subtotal y total a pagar coinciden (el domicilio lo pone el asesor)', () => {
    const m = msg([linea({ qty: 2 }), linea({ id: 'x', unitPrice: 20000 })]);
    expect(m).toContain('*Subtotal:* $46.000');
    expect(m).toContain('*Valor Domicilio:* Calculado por el asesor');
    expect(m).toContain('*💸 TOTAL A PAGAR:* $46.000');
  });

  it('en efectivo indica con cuánto paga', () => {
    expect(msg([linea()])).toContain('*Método de pago:* Efectivo (paga con 50.000)');
  });

  it('sin cambio no añade el paréntesis', () => {
    const m = msg([linea()], { ...datos, cambio: '' });
    expect(m).toContain('*Método de pago:* Efectivo');
    expect(m).not.toContain('(paga con');
  });

  it('con tarjeta no se menciona el cambio aunque venga relleno', () => {
    const m = msg([linea()], { ...datos, pago: 'Tarjeta / Transferencia' });
    expect(m).not.toContain('paga con');
  });
});

/* ------------------------------------------------------------------ */
describe('enlace de WhatsApp', () => {
  const tel = '573138214752';

  it('apunta al número del negocio', () => {
    expect(urlWhatsApp('hola', tel)).toContain(`phone=${tel}`);
  });

  it('codifica saltos de línea y caracteres especiales', () => {
    const u = urlWhatsApp('línea 1\nlínea 2 & más', tel);
    expect(u).toContain('%0A'); // salto de línea
    expect(u).toContain('%26'); // &
    expect(u).not.toContain('\n');
  });

  it('el mensaje completo sobrevive al ida y vuelta', () => {
    const m = msg([linea({ notes: 'sin cebolla & sin tomate' })]);
    const u = urlWhatsApp(m, tel);
    const recuperado = decodeURIComponent(u.split('&text=')[1]);
    expect(recuperado).toBe(m);
  });
});
