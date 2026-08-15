import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MENU } from '@/data/menu';

/* =============================================================
 * PRUEBAS DE RESILIENCIA DEL MENÚ
 *
 * Aquí se simula que Supabase falla, para comprobar que el pedido
 * NUNCA se queda sin menú con el que validar. Se sustituye el módulo
 * de acceso a Supabase por uno controlado: así se puede provocar
 * cualquier fallo sin depender de la red ni tocar producción.
 * ============================================================= */

const ctrl = vi.hoisted(() => ({
  responder: null as null | (() => Promise<Response>),
  llamadas: 0,
}));

vi.mock('@/lib/supabase', () => ({
  TIMEOUT_MS: 4000,
  supabaseRest: async () => {
    ctrl.llamadas++;
    if (!ctrl.responder) throw new Error('sin respuesta configurada');
    return ctrl.responder();
  },
}));

/** Recarga el módulo para que la caché en memoria empiece vacía. */
async function cargarLimpio() {
  vi.resetModules();
  return import('@/lib/menu-servidor');
}

const ok = (filas: unknown[]) => async () =>
  new Response(JSON.stringify(filas), { status: 200, headers: { 'Content-Type': 'application/json' } });
const caido = () => async () => {
  throw new Error('ECONNREFUSED (simulado)');
};
const error500 = () => async () => new Response('boom', { status: 500 });

beforeEach(() => {
  ctrl.llamadas = 0;
  ctrl.responder = null;
});

/* ------------------------------------------------------------------ */
describe('capa 1 · Supabase responde', () => {
  it('usa Supabase y lo marca como origen', async () => {
    ctrl.responder = ok([]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.origen).toBe('supabase');
  });

  it('una tabla vacía NO es un error: vale el menú del código', async () => {
    ctrl.responder = ok([]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.length).toBe(MENU.length);
  });
});

/* ------------------------------------------------------------------ */
describe('capa 2 · memoria del proceso', () => {
  it('si Supabase cae DESPUÉS de una lectura buena, sirve la copia en memoria', async () => {
    const { obtenerMenu } = await cargarLimpio();

    ctrl.responder = ok([
      { data: { ...MENU[0], options: [{ label: 'Editada', price: 12345 }] }, available: true },
    ]);
    const bueno = await obtenerMenu();
    expect(bueno.origen).toBe('supabase');

    ctrl.responder = caido();
    const respaldo = await obtenerMenu();

    expect(respaldo.origen).toBe('memoria');
    expect(respaldo.edadMs).not.toBeNull();
    // Y conserva el precio editado, no vuelve al del código.
    expect(respaldo.menu.find((p) => p.id === MENU[0].id)?.options[0].price).toBe(12345);
  });
});

/* ------------------------------------------------------------------ */
describe('capa 3 · el menú del código', () => {
  it('si Supabase nunca respondió, cae al menú del código y NO lanza', async () => {
    ctrl.responder = caido();
    const { obtenerMenu } = await cargarLimpio();

    const r = await obtenerMenu();
    expect(r.origen).toBe('codigo');
    expect(r.menu.length).toBe(MENU.length);
  });

  it('lo mismo con un error 500', async () => {
    ctrl.responder = error500();
    const { obtenerMenu } = await cargarLimpio();
    expect((await obtenerMenu()).origen).toBe('codigo');
  });

  it('lo mismo si la respuesta no es una lista', async () => {
    ctrl.responder = async () => new Response('{"error":"nope"}', { status: 200 });
    const { obtenerMenu } = await cargarLimpio();
    expect((await obtenerMenu()).origen).toBe('codigo');
  });

  it('reintenta una vez antes de rendirse', async () => {
    ctrl.responder = caido();
    const { obtenerMenu } = await cargarLimpio();
    await obtenerMenu();
    expect(ctrl.llamadas).toBe(2);
  });

  it('el reintento sirve si el primer intento falló por un fallo pasajero', async () => {
    let n = 0;
    ctrl.responder = async () => {
      n++;
      if (n === 1) throw new Error('fallo pasajero');
      return new Response('[]', { status: 200 });
    };
    const { obtenerMenu } = await cargarLimpio();
    expect((await obtenerMenu()).origen).toBe('supabase');
  });
});

/* ------------------------------------------------------------------ */
describe('reglas de fusión (deben coincidir con initMenuSync)', () => {
  const base = MENU[0];

  it('un precio editado en el panel gana al del código', async () => {
    ctrl.responder = ok([{ data: { id: base.id, options: [{ label: 'X', price: 99000 }] }, available: true }]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.find((p) => p.id === base.id)?.options[0].price).toBe(99000);
  });

  it('un `null` del panel NO borra un valor que solo está en el código', async () => {
    const conFoto = MENU.find((p) => p.img)!;
    ctrl.responder = ok([{ data: { id: conFoto.id, img: null }, available: true }]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.find((p) => p.id === conFoto.id)?.img).toBe(conFoto.img);
  });

  it('un plato agotado en el panel llega marcado como agotado', async () => {
    ctrl.responder = ok([{ data: { id: base.id }, available: false }]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.find((p) => p.id === base.id)?.available).toBe(false);
  });

  it('un plato creado en el panel aparece además de los del código', async () => {
    ctrl.responder = ok([
      { data: { id: 'nuevo-del-panel', cat: 'hamburguesas', name: 'Nueva', desc: '', combo: false, emoji: '🍔', options: [{ label: 'U', price: 20000 }] }, available: true },
    ]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.length).toBe(MENU.length + 1);
    expect(r.menu.find((p) => p.id === 'nuevo-del-panel')).toBeTruthy();
  });

  it('un plato que está en el código pero no en el panel se conserva', async () => {
    ctrl.responder = ok([{ data: { id: base.id }, available: true }]);
    const { obtenerMenu } = await cargarLimpio();
    const r = await obtenerMenu();
    expect(r.menu.length).toBe(MENU.length);
  });
});
