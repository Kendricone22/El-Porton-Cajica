'use client';

/* =============================================================
 * BANCO DE PRUEBAS DEL CARRITO — temporal
 *
 * Sirve para comprobar en un navegador real lo que las pruebas
 * unitarias no pueden ver: la hidratación desde localStorage, que no
 * haya error de hidratación de React y que el estado sobreviva a una
 * recarga.
 *
 * Desaparece cuando esté el carrito de verdad (FAB + cajón).
 * ============================================================= */

import { useCarrito } from '@/estado/carrito';
import { hashDe } from '@/lib/carrito';
import { MENU } from '@/data/menu';
import type { ItemCarrito } from '@/types/carrito';

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

function construir(indice: number, combo = false): ItemCarrito {
  const p = MENU[indice];
  const base = {
    id: p.id,
    name: p.name,
    cat: p.cat,
    emoji: p.emoji,
    img: p.img ?? null,
    option: p.options[0].label,
    combo,
    drink: combo ? 'Sprite' : null,
    proteins: [] as string[],
    flavors: [] as string[],
    slice: '',
    choices: [] as string[],
    adiciones: [] as { name: string; price: number }[],
    notes: '',
    unitPrice: p.options[0].price + (combo ? 9000 : 0),
    qty: 1,
  };
  return { ...base, hash: hashDe(base) };
}

export default function BancoDePruebasCarrito() {
  const { items, subtotal, unidades, hidratado, agregarItem, cambiarQty, quitar, vaciar } = useCarrito();

  return (
    <section
      id="banco-carrito"
      className="mt-16 rounded-xl p-6"
      style={{ border: '1px solid #27272a', background: '#111113' }}
    >
      <h2 className="font-display" style={{ fontSize: '1.8rem' }}>
        BANCO DE PRUEBAS DEL CARRITO
      </h2>
      <p style={{ color: '#71717a', fontSize: '.85rem' }}>
        Estado: <b data-testid="hidratado">{hidratado ? 'hidratado' : 'cargando'}</b> ·{' '}
        <b data-testid="unidades">{unidades}</b> unidades ·{' '}
        <b data-testid="subtotal">{fmt(subtotal)}</b>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-prueba" data-testid="add-0" onClick={() => agregarItem(construir(0))}>
          + {MENU[0].name}
        </button>
        <button className="btn-prueba" data-testid="add-0-combo" onClick={() => agregarItem(construir(0, true))}>
          + {MENU[0].name} en combo
        </button>
        <button className="btn-prueba" data-testid="add-1" onClick={() => agregarItem(construir(1))}>
          + {MENU[1].name}
        </button>
        <button className="btn-prueba" data-testid="vaciar" onClick={vaciar}>
          Vaciar
        </button>
      </div>

      <ul className="mt-5" data-testid="lineas" style={{ display: 'grid', gap: '.5rem' }}>
        {items.map((it) => (
          <li
            key={it.hash}
            className="flex items-center justify-between gap-4 rounded-lg px-3 py-2"
            style={{ background: '#18181b' }}
          >
            <span>
              {it.emoji} {it.name}
              {it.combo && ' (combo)'} — {fmt(it.unitPrice)}
            </span>
            <span className="flex items-center gap-2">
              <button className="btn-prueba" onClick={() => cambiarQty(it.hash, -1)}>
                −
              </button>
              <b style={{ minWidth: '1.5rem', textAlign: 'center' }}>{it.qty}</b>
              <button className="btn-prueba" onClick={() => cambiarQty(it.hash, 1)}>
                +
              </button>
              <button className="btn-prueba" onClick={() => quitar(it.hash)}>
                borrar
              </button>
            </span>
          </li>
        ))}
        {items.length === 0 && <li style={{ color: '#52525b' }}>Carrito vacío</li>}
      </ul>

      <style>{`
        .btn-prueba {
          background: #27272a; color: #fff; border: 1px solid #3f3f46;
          border-radius: 8px; padding: .35rem .75rem; font-size: .85rem; cursor: pointer;
        }
        .btn-prueba:hover { background: var(--rojo); border-color: var(--rojo); }
      `}</style>
    </section>
  );
}
