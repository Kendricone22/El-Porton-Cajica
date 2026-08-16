/* =============================================================
 * FORMULARIO DE DESPACHO Y DETALLE DE LÍNEA — funciones puras
 * ============================================================= */

import { FORMULARIO_VACIO, type DatosFormulario, type ItemCarrito } from '@/types/carrito';

/**
 * El resumen de una línea tal y como se lee bajo su nombre en el
 * carrito. Mismo criterio y mismo orden que `itemDetails` en v1.
 */
export function detallesDe(it: ItemCarrito): string {
  const p: string[] = [];
  if (it.option && it.option !== 'Porción') p.push(it.option);
  if (it.proteins?.length) p.push(it.proteins.join(' + '));
  if (it.flavors?.length) p.push('Sabores: ' + it.flavors.join(', '));
  if (it.slice) p.push('Trozos: ' + it.slice);
  if (it.choices?.length) p.push(...it.choices);
  if (it.combo) p.push('Combo' + (it.drink ? ' · ' + it.drink : ''));
  if (it.adiciones?.length) p.push(it.adiciones.map((a) => '+ ' + a.name).join(', '));
  if (it.notes) p.push('Nota: ' + it.notes);
  return p.join(' · ');
}

/**
 * Formatea con puntos de miles mientras se escribe (50000 → 50.000).
 * Solo reordena dígitos: se quita todo lo que no sea número antes de
 * volver a formatear, así que nunca cambia el valor real.
 */
export function formatearMiles(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos).toLocaleString('es-CO') : '';
}

/** Campos obligatorios que faltan por rellenar. */
export function camposIncompletos(d: DatosFormulario): (keyof DatosFormulario)[] {
  const faltan: (keyof DatosFormulario)[] = [];
  if (!d.nombre.trim()) faltan.push('nombre');
  if (!d.telefono.trim()) faltan.push('telefono');
  if (!d.direccion.trim()) faltan.push('direccion');
  if (!d.pago) faltan.push('pago');
  return faltan;
}

/**
 * Lee los datos guardados. Como el carrito, es entrada no fiable:
 * puede venir de la versión vieja del sitio o estar a medias.
 *
 * ⚠️ El método de pago y el cambio NO se restauran a propósito, igual
 * que en v1: son decisiones de cada pedido, no datos de la persona.
 */
export function leerFormulario(crudo: string | null): DatosFormulario {
  if (!crudo) return { ...FORMULARIO_VACIO };
  try {
    const d = JSON.parse(crudo) as Record<string, unknown>;
    const t = (v: unknown) => (typeof v === 'string' ? v : '');
    return {
      nombre: t(d.nombre),
      telefono: t(d.telefono),
      direccion: t(d.direccion),
      pago: '',
      cambio: '',
    };
  } catch {
    return { ...FORMULARIO_VACIO };
  }
}
