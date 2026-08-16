/* =============================================================
 * MENSAJE DE WHATSAPP — función pura
 *
 * Arma el texto del pedido con EXACTAMENTE el mismo formato que el
 * sitio v1 (`buildMessage` en js/app.js). Es importante que no cambie:
 * quien atiende los pedidos lleva meses leyéndolo, y la primera línea
 * `[WEB-PORTON-CAJICA]` es la marca que distingue los pedidos de la
 * web de los que llegan escritos a mano.
 *
 * ⚠️ DIFERENCIA CLAVE CON v1: aquí las líneas vienen del SERVIDOR
 * (la respuesta de /api/pedidos), no del carrito del navegador. Así el
 * mensaje que le llega al restaurante lleva los precios verificados,
 * aunque alguien haya trasteado el carrito.
 * ============================================================= */

import type { DatosFormulario } from '@/types/carrito';

/** Una línea tal y como la devuelve el servidor. */
export type LineaPedido = {
  id: string;
  name: string;
  cat: string;
  qty: number;
  unitPrice: number;
  option: string;
  combo: boolean;
  drink: string | null;
  adiciones: { name: string; price: number }[];
  proteins?: string[];
  flavors?: string[];
  slice?: string;
  choices?: string[];
  notes?: string;
};

export const PREFIJO = '[WEB-PORTON-CAJICA]';
const DIVISOR = '━━━━━━━━━━━━━━━━━━';

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

export function construirMensaje(
  lineas: LineaPedido[],
  datos: DatosFormulario,
  subtotal: number,
): string {
  const L: string[] = [PREFIJO, '🔔 *¡NUEVO PEDIDO RECIBIDO!*', DIVISOR, ''];

  for (const it of lineas) {
    L.push(`• (${it.qty})x ${it.name} — ${fmt(it.unitPrice * it.qty)}`);

    const variacion: string[] = [];
    // "Porción" se omite: es una etiqueta interna, no aporta nada a
    // quien prepara el pedido. Mismo criterio que v1.
    if (it.option && it.option !== 'Porción') variacion.push(it.option);
    if (it.proteins?.length) variacion.push(it.proteins.join(' + '));

    let linea = variacion.length ? 'Variación: ' + variacion.join(' · ') : '';

    // El combo se indica SIEMPRE en hamburguesas y perros, incluso
    // cuando es "No": así quien prepara sabe que se preguntó.
    if (it.cat === 'hamburguesas' || it.cat === 'perros') {
      linea +=
        (linea ? ' | ' : '') +
        'Combo: ' +
        (it.combo ? 'Sí' + (it.drink ? ` (${it.drink})` : '') : 'No');
    }

    if (linea) L.push('  ↳ ' + linea);
    if (it.flavors?.length) L.push('  ↳ Sabores: ' + it.flavors.join(', '));
    if (it.slice) L.push('  ↳ Trozos: ' + it.slice);
    if (it.choices?.length) for (const c of it.choices) L.push('  ↳ ' + c);
    if (it.adiciones?.length) L.push('  ↳ Adiciones: ' + it.adiciones.map((a) => a.name).join(', '));
    if (it.notes) L.push('  ↳ Nota: ' + it.notes);
    L.push('');
  }

  L.push(DIVISOR);
  L.push(`*Subtotal:* ${fmt(subtotal)}`);
  L.push('*Valor Domicilio:* Calculado por el asesor');
  L.push(`*💸 TOTAL A PAGAR:* ${fmt(subtotal)}`);
  L.push('');

  L.push('📦 *DATOS DE DESPACHO*');
  L.push(`*Nombre:* ${datos.nombre}`);
  L.push(`*Teléfono:* ${datos.telefono}`);
  L.push(`*Dirección:* ${datos.direccion}`);

  let pago = `*Método de pago:* ${datos.pago}`;
  if (datos.pago === 'Efectivo' && datos.cambio) pago += ` (paga con ${datos.cambio})`;
  L.push(pago);

  return L.join('\n');
}

/** El enlace que abre WhatsApp con el mensaje ya escrito. */
export function urlWhatsApp(mensaje: string, telefono: string): string {
  return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
}
