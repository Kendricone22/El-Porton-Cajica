import { describe, it, expect } from 'vitest';
import { CABECERAS, aCSV, nombreArchivo, pedidosAFilas } from '@/lib/csv';
import type { Pedido } from '@/lib/pedidos-admin';

const etiqueta = (k: string) => ({ hamburguesas: 'Hamburguesas', pizzas: 'Pizzas & Lasañas' })[k] ?? k;

const pedido = (o: Partial<Pedido> = {}): Pedido => ({
  id: 'x',
  created_at: '2026-08-16T02:37:18+00:00',
  customer_name: 'Camilo',
  customer_phone: '3102383007',
  customer_address: 'Calle 11 A Sur #10-75, Fagua',
  payment_method: 'Efectivo',
  cash_change: null,
  subtotal: 42000,
  status: 'entregado',
  items: [{ name: 'Sencilla', cat: 'hamburguesas', qty: 2, unitPrice: 13000 }],
  ...o,
});

/* ------------------------------------------------------------------ */
describe('columnas', () => {
  it('son exactamente las que espera el otro proyecto', () => {
    expect(CABECERAS).toEqual(['Fecha', 'Producto', 'Categoria', 'Monto', 'Pago', 'Cliente', 'Estado']);
  });

  it('NO existe columna de cantidad', () => {
    // `Monto` ya es cantidad × precio; una columna "Cantidad" haría que
    // el importador del otro proyecto multiplicara dos veces.
    expect((CABECERAS as readonly string[]).some((c) => /cantidad|qty/i.test(c))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
describe('filas', () => {
  it('una fila por PRODUCTO, no por pedido', () => {
    const p = pedido({
      items: [
        { name: 'Sencilla', cat: 'hamburguesas', qty: 1, unitPrice: 13000 },
        { name: 'Pizza Familiar', cat: 'pizzas', qty: 1, unitPrice: 69000 },
      ],
    });
    expect(pedidosAFilas([p], etiqueta)).toHaveLength(3); // cabecera + 2
  });

  it('el monto es cantidad por precio unitario', () => {
    const [, fila] = pedidosAFilas([pedido()], etiqueta);
    expect(fila[3]).toBe(26000); // 2 × 13.000
  });

  it('la categoría sale con su nombre legible', () => {
    const [, fila] = pedidosAFilas([pedido()], etiqueta);
    expect(fila[2]).toBe('Hamburguesas');
  });

  it('si la categoría no se reconoce, se deja la clave cruda', () => {
    const p = pedido({ items: [{ name: 'X', cat: 'inventada', qty: 1, unitPrice: 100 }] });
    expect(pedidosAFilas([p], etiqueta)[1][2]).toBe('inventada');
  });

  it('la fecha va en yyyy-mm-dd, sin ambigüedad', () => {
    expect(pedidosAFilas([pedido()], etiqueta)[1][0]).toBe('2026-08-16');
  });

  it('los pedidos CANCELADOS se excluyen', () => {
    const filas = pedidosAFilas([pedido({ status: 'cancelado' }), pedido()], etiqueta);
    expect(filas).toHaveLength(2); // cabecera + solo el no cancelado
  });

  it('un pedido sin productos no aporta filas', () => {
    expect(pedidosAFilas([pedido({ items: [] })], etiqueta)).toHaveLength(1);
  });

  it('sobrevive a campos ausentes sin generar NaN ni undefined', () => {
    const p = pedido({ payment_method: null, items: [{ name: 'X', qty: 1 }] });
    const fila = pedidosAFilas([p], etiqueta)[1];
    expect(fila.every((c) => c !== undefined && !Number.isNaN(c))).toBe(true);
    expect(fila[3]).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
describe('escapado del CSV', () => {
  it('entrecomilla las celdas con coma', () => {
    // Sin esto, «Calle 11 A Sur #10-75, Fagua» partiría la fila en dos.
    expect(aCSV([['a', 'Calle 11, Fagua']])).toBe('a,"Calle 11, Fagua"');
  });

  it('duplica las comillas internas', () => {
    expect(aCSV([['dijo "hola"']])).toBe('"dijo ""hola"""');
  });

  it('entrecomilla saltos de línea y punto y coma', () => {
    expect(aCSV([['linea1\nlinea2']])).toContain('"linea1\nlinea2"');
    expect(aCSV([['a;b']])).toBe('"a;b"');
  });

  it('lo normal NO se entrecomilla', () => {
    expect(aCSV([['Sencilla', 26000, 'Efectivo']])).toBe('Sencilla,26000,Efectivo');
  });

  it('las filas se separan con CRLF, como manda el formato', () => {
    expect(aCSV([['a'], ['b']])).toBe('a\r\nb');
  });

  it('una dirección real de un cliente sobrevive el ida y vuelta', () => {
    const csv = aCSV(pedidosAFilas([pedido()], etiqueta));
    const lineas = csv.split('\r\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[1].split(',')).toHaveLength(7); // la coma de la dirección no rompe columnas
  });
});

/* ------------------------------------------------------------------ */
describe('nombre del archivo', () => {
  it('lleva la fecha del día', () => {
    expect(nombreArchivo(new Date('2026-08-16T10:00:00Z'))).toBe('el-porton-cajica-ventas-2026-08-16.csv');
  });
});
