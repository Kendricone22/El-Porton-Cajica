import { NextResponse } from 'next/server';
import { obtenerMenu } from '@/lib/menu-servidor';
import { validarPedido } from '@/lib/precio';
import { supabaseRest } from '@/lib/supabase';

/* =============================================================
 * POST /api/pedidos
 *
 * La ÚNICA puerta por la que debe entrar un pedido.
 *
 * Recibe lo que el cliente cree que pidió, lo revalida contra el menú
 * real, recalcula el total con precios del servidor y solo entonces lo
 * guarda. Devuelve el pedido ya validado para que el mensaje de
 * WhatsApp se arme con los números del servidor, no con los del
 * navegador.
 *
 * ⚠️ Este endpoint no sirve de nada mientras `anon` conserve el permiso
 * de INSERT sobre `orders` (ver db/revocar-insert-anon.sql). Ese SQL se
 * corre EL DÍA DEL CAMBIO, no antes: hoy es el permiso que usa el sitio
 * en vivo para registrar sus pedidos.
 * ============================================================= */

/** Nunca se cachea: cada pedido es único y se escribe en la base. */
export const dynamic = 'force-dynamic';

const MAX_TEXTO = 200;
const MAX_NOTAS = 500;

const limpiar = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export async function POST(req: Request) {
  /* ---------- 1. cuerpo ---------- */
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errores: ['El cuerpo no es JSON válido.'] }, { status: 400 });
  }

  /* ---------- 2. datos de despacho ---------- */
  const cliente = {
    customer_name: limpiar(cuerpo.nombre, MAX_TEXTO),
    customer_phone: limpiar(cuerpo.telefono, MAX_TEXTO),
    customer_address: limpiar(cuerpo.direccion, MAX_TEXTO),
    payment_method: limpiar(cuerpo.pago, MAX_TEXTO) || null,
    cash_change: limpiar(cuerpo.cambio, MAX_TEXTO) || null,
  };

  const faltan: string[] = [];
  if (!cliente.customer_name) faltan.push('nombre');
  if (!cliente.customer_phone) faltan.push('teléfono');
  if (!cliente.customer_address) faltan.push('dirección');
  if (faltan.length) {
    return NextResponse.json(
      { ok: false, errores: [`Faltan datos de despacho: ${faltan.join(', ')}.`] },
      { status: 400 },
    );
  }

  /* ---------- 3. el menú real ---------- */
  let menu;
  try {
    menu = await obtenerMenu();
  } catch (e) {
    // A propósito NO se cae al menú del código: cobrar con precios
    // posiblemente desactualizados es justo lo que hay que evitar.
    console.error('[pedidos] no se pudo leer el menú:', e);
    return NextResponse.json(
      { ok: false, errores: ['No se pudo verificar el menú en este momento. Intenta de nuevo en un minuto.'] },
      { status: 503 },
    );
  }

  /* ---------- 4. LA VALIDACIÓN ---------- */
  const r = validarPedido(cuerpo.items, menu);
  if (!r.ok) {
    return NextResponse.json({ ok: false, errores: r.errores }, { status: 422 });
  }

  // Si el navegador mandó precios distintos, queda registrado en el log
  // del servidor. Puede ser una caché vieja tras un cambio de precios…
  // o alguien trasteando.
  if (r.avisos.length) {
    console.warn('[pedidos] precios del navegador distintos a los reales:', r.avisos.join(' | '));
  }

  /* ---------- 5. guardar (aquí sí, con la clave de servidor) ---------- */
  // `validarPedido` recorre `items` en orden y solo devuelve ok:true
  // cuando TODAS pasaron, así que lineas[i] corresponde a items[i].
  const entrantes = cuerpo.items as Record<string, unknown>[];

  const fila = {
    ...cliente,
    subtotal: r.subtotal,
    items: r.lineas.map((l, i) => ({
      id: l.id,
      name: l.name,
      cat: l.cat,
      qty: l.qty,
      unitPrice: l.unitPrice,
      option: l.option,
      combo: l.combo,
      drink: l.drink,
      adiciones: l.adiciones,
      // Campos que no afectan al precio: se conservan tal cual para que
      // el panel y el mensaje de WhatsApp sigan mostrando lo mismo.
      proteins: entrantes[i]?.proteins ?? [],
      flavors: entrantes[i]?.flavors ?? [],
      slice: entrantes[i]?.slice ?? '',
      choices: entrantes[i]?.choices ?? [],
      notes: limpiar(entrantes[i]?.notes, MAX_NOTAS),
    })),
  };

  try {
    const res = await supabaseRest(
      '/rest/v1/orders',
      { method: 'POST', body: JSON.stringify(fila), headers: { Prefer: 'return=representation' } },
      'servidor',
    );

    if (!res.ok) {
      const detalle = await res.text();
      console.error('[pedidos] Supabase rechazó el insert:', res.status, detalle);
      return NextResponse.json(
        { ok: false, errores: ['No se pudo registrar el pedido.'] },
        { status: 502 },
      );
    }

    const [guardado] = (await res.json()) as { id: string }[];

    /* ---------- 6. respuesta ----------
       Se devuelven los números del SERVIDOR para que el mensaje de
       WhatsApp se arme con ellos y no con los del navegador. */
    return NextResponse.json({
      ok: true,
      pedidoId: guardado?.id ?? null,
      subtotal: r.subtotal,
      lineas: r.lineas,
    });
  } catch (e) {
    console.error('[pedidos] error inesperado al guardar:', e);
    return NextResponse.json({ ok: false, errores: ['No se pudo registrar el pedido.'] }, { status: 502 });
  }
}
