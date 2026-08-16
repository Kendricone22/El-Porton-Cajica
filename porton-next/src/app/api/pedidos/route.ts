import { NextResponse } from 'next/server';
import { obtenerMenu } from '@/lib/menu-servidor';
import { validarPedido } from '@/lib/precio';
import { supabaseRest } from '@/lib/supabase';

/* =============================================================
 * POST /api/pedidos — la única puerta por la que entra un pedido.
 *
 * LA IDEA CENTRAL, que resuelve la tensión entre las dos cosas que no
 * pueden fallar:
 *
 *   VALIDAR el precio y GUARDAR el pedido son pasos independientes.
 *
 * La validación ocurre ANTES de tocar la base de datos y no depende de
 * que la escritura funcione. Por eso se pueden garantizar las dos cosas
 * a la vez:
 *
 *   · El precio SIEMPRE lo decide el servidor. Sin excepción.
 *   · Que la base de datos falle NUNCA impide que el cliente envíe su
 *     pedido: se devuelven igualmente los números correctos para que
 *     WhatsApp se abra con ellos, marcando `guardado: false`.
 *
 * Un pedido solo se rechaza cuando los datos están mal (producto que no
 * existe, adición que no aplica, cantidad imposible). Nunca por una
 * caída de infraestructura.
 * ============================================================= */

export const dynamic = 'force-dynamic';

const MAX_TEXTO = 200;
const MAX_NOTAS = 500;
const INTENTOS_INSERT = 3;

const limpiar = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Guardado = { id: string | null; error: string | null };

/**
 * Guarda el pedido con reintentos y espera creciente (300ms, 900ms).
 * Nunca lanza: devuelve el error para que quien llama decida.
 */
async function guardarPedido(fila: unknown): Promise<Guardado> {
  let ultimo = 'sin intentos';

  for (let intento = 1; intento <= INTENTOS_INSERT; intento++) {
    try {
      const res = await supabaseRest(
        '/rest/v1/orders',
        {
          method: 'POST',
          body: JSON.stringify(fila),
          headers: { Prefer: 'return=representation' },
        },
        'servidor',
      );

      if (res.ok) {
        const filas = (await res.json()) as { id: string }[];
        return { id: filas?.[0]?.id ?? null, error: null };
      }

      ultimo = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;

      // 4xx = la petición está mal formada; reintentar daría igual.
      // Solo se reintentan los fallos del servidor (5xx) y los de red.
      if (res.status < 500) break;
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
    }

    if (intento < INTENTOS_INSERT) await esperar(300 * intento ** 2);
  }

  return { id: null, error: ultimo };
}

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

  /* ---------- 3. el menú (nunca falla: tres capas de respaldo) ---------- */
  const { menu, origen, edadMs } = await obtenerMenu();

  /* ---------- 4. LA VALIDACIÓN ----------
     Esto es lógica pura: no toca la red, no puede caerse por una
     incidencia de infraestructura. Aquí sí se rechaza, porque un
     rechazo aquí significa que los datos del pedido están mal. */
  const r = validarPedido(cuerpo.items, menu);
  if (!r.ok) {
    return NextResponse.json({ ok: false, errores: r.errores }, { status: 422 });
  }

  if (r.avisos.length) {
    console.warn('[pedidos] precios del navegador distintos a los reales:', r.avisos.join(' | '));
  }
  if (origen !== 'supabase') {
    console.warn(
      `[pedidos] precio validado con el menú de "${origen}"` +
        (edadMs ? ` (${Math.round(edadMs / 1000)}s de antigüedad)` : '') +
        '. Si el dueño editó precios hace poco, podrían no estar aplicados.',
    );
  }

  /* ---------- 5. guardar ---------- */
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

  const guardado = await guardarPedido(fila);

  if (guardado.error) {
    // NO se bloquea el pedido. El cliente recibe los números correctos
    // (calculados por el servidor) y puede seguir a WhatsApp. Lo único
    // que se pierde es el registro, y queda en el log para recuperarlo.
    console.error('[pedidos] NO SE PUDO GUARDAR. Pedido completo:', JSON.stringify(fila));
    console.error('[pedidos] motivo:', guardado.error);
  }

  /* ---------- 6. respuesta ----------
     Se devuelve `fila.items`, que es EXACTAMENTE lo que se guardó: los
     precios recalculados por el servidor más los campos que no afectan
     al precio (sabores, proteínas, trozos, selectores, notas).
     Así el mensaje de WhatsApp se arma con esto y con nada del
     navegador — y además dice lo mismo que la base de datos, se haya
     podido guardar o no. */
  return NextResponse.json({
    ok: true,
    guardado: guardado.id !== null,
    pedidoId: guardado.id,
    subtotal: r.subtotal,
    items: fila.items,
    origenPrecio: origen,
    advertencia: guardado.error
      ? 'El pedido es válido y puede enviarse por WhatsApp, pero no se pudo registrar en la base de datos.'
      : null,
  });
}
