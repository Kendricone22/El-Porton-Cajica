/* =============================================================
 * EXPORTACIÓN A CSV
 *
 * ⚠️ EL FORMATO NO SE TOCA. Las columnas están elegidas para que el
 * archivo se pueda importar directamente en el otro proyecto del
 * usuario (Ventas Dashboard), cuyo importador reconoce las cabeceras
 * por subcadena: fecha / total / producto / categoria / pago.
 *
 * ⚠️ Y NO HAY COLUMNA DE CANTIDAD, a propósito: `Monto` ya es
 * cantidad × precio unitario. Si se añadiera "Cantidad", ese
 * importador la multiplicaría otra vez y todas las ventas saldrían
 * infladas.
 * ============================================================= */

import { ETIQUETA_ESTADO, type Pedido } from '@/lib/pedidos-admin';

export const CABECERAS = ['Fecha', 'Producto', 'Categoria', 'Monto', 'Pago', 'Cliente', 'Estado'] as const;

/**
 * Una fila por PRODUCTO, no por pedido: así el otro proyecto puede
 * desglosar por plato y por categoría.
 *
 * Los cancelados se excluyen, igual que en los indicadores del panel:
 * si contaran, el ingreso no cuadraría con lo que muestra el propio
 * panel.
 */
export function pedidosAFilas(
  pedidos: Pedido[],
  etiquetaCategoria: (clave: string) => string,
): (string | number)[][] {
  const filas: (string | number)[][] = [[...CABECERAS]];

  for (const o of pedidos) {
    if (o.status === 'cancelado') continue;
    // yyyy-mm-dd: sin ambigüedad entre formatos de fecha.
    const fecha = new Date(o.created_at).toISOString().slice(0, 10);

    for (const it of o.items ?? []) {
      filas.push([
        fecha,
        it.name || '',
        etiquetaCategoria(it.cat ?? '') || it.cat || '',
        Math.round((it.unitPrice || 0) * (it.qty || 1)),
        o.payment_method || '',
        o.customer_name || '',
        ETIQUETA_ESTADO[o.status] || o.status || '',
      ]);
    }
  }
  return filas;
}

/**
 * Convierte a texto CSV según RFC 4180: se entrecomilla la celda si
 * lleva coma, comillas, punto y coma o salto de línea, y las comillas
 * internas se duplican.
 *
 * Importa de verdad: una dirección como «Calle 11 A Sur #10-75, Fagua»
 * partiría la fila en dos columnas sin esto.
 */
export function aCSV(filas: (string | number)[][]): string {
  return filas
    .map((f) =>
      f
        .map((celda) => {
          const s = String(celda ?? '');
          return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}

/** Nombre con la fecha del día, para no sobrescribir descargas previas. */
export const nombreArchivo = (hoy = new Date()): string =>
  `el-porton-cajica-ventas-${hoy.toISOString().slice(0, 10)}.csv`;

/**
 * Dispara la descarga. El `﻿` del principio es la marca de orden
 * de bytes: sin ella, Excel abre el archivo en su codificación local y
 * las tildes y la ñ salen rotas.
 */
export function descargarCSV(nombre: string, texto: string): void {
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
