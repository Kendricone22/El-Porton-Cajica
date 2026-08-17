'use client';

/* =============================================================
 * PESTAÑA DE PEDIDOS
 *
 * ⚠️ CAMBIO RESPECTO A v1: se piden POR PÁGINAS.
 *
 * v1 hace `select('*')` sin límite. La API de Supabase corta en 1000
 * filas, así que el panel descarga hasta 1000 pedidos completos —con
 * su JSON de productos— cada vez que se abre. Con ~20 pedidos al día
 * eso son varios megabytes a los dos meses, y desde el celular del
 * dueño se nota.
 *
 * Aquí se traen de 50 en 50 con "Ver más". Además se pide el total
 * exacto con `count`, que Postgres calcula sin devolver las filas.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import {
  ESTADOS,
  ETIQUETA_ESTADO,
  detallesDeLinea,
  dinero,
  enlaceWhatsApp,
  fechaCorta,
  type EstadoPedido,
  type Pedido,
} from '@/lib/pedidos-admin';

const POR_PAGINA = 50;

export default function Pedidos({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(
    async (desde: number) => {
      setError(null);
      if (desde === 0) setCargando(true);

      const { data, error: err, count } = await sb
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(desde, desde + POR_PAGINA - 1);

      setCargando(false);
      if (err) {
        setError('No se pudieron leer los pedidos: ' + err.message);
        return;
      }
      setTotal(count ?? null);
      setPedidos((prev) => (desde === 0 ? (data as Pedido[]) : [...prev, ...(data as Pedido[])]));
    },
    [sb],
  );

  useEffect(() => {
    void cargar(0);
  }, [cargar, recargarToken]);

  /** Cambia el estado. Se pinta primero y se revierte si falla. */
  async function cambiarEstado(id: string, nuevo: EstadoPedido) {
    const anterior = pedidos.find((p) => p.id === id)?.status;
    setGuardando(id);
    setPedidos((ps) => ps.map((p) => (p.id === id ? { ...p, status: nuevo } : p)));

    const { error: err } = await sb.from('orders').update({ status: nuevo }).eq('id', id);
    setGuardando(null);

    if (err) {
      // v1 deja el desplegable en el valor nuevo aunque falle, así que
      // el panel muestra un estado que la base no tiene.
      if (anterior) setPedidos((ps) => ps.map((p) => (p.id === id ? { ...p, status: anterior } : p)));
      setError('No se pudo actualizar el estado: ' + err.message);
    }
  }

  if (cargando) return <p className="loading">Cargando pedidos…</p>;
  if (error && !pedidos.length) return <p className="empty-state">{error}</p>;
  if (!pedidos.length) return <p className="empty-state">Aún no hay pedidos.</p>;

  const hayMas = total !== null && pedidos.length < total;

  return (
    <>
      {error && <p className="login-error">{error}</p>}

      {total !== null && (
        <p className="menu-count">
          Mostrando {pedidos.length} de {total} pedidos
        </p>
      )}

      <div id="orders-list">
        {pedidos.map((o) => (
          <article className="order-card" key={o.id}>
            <div className="order-head">
              <div>
                <div className="order-name">
                  {o.customer_name}{' '}
                  <span className={`badge-status st-${o.status}`}>
                    {ETIQUETA_ESTADO[o.status] ?? o.status}
                  </span>
                </div>
                <div className="order-when">{fechaCorta(o.created_at)}</div>
              </div>
              <div className="order-total">{dinero(o.subtotal)}</div>
            </div>

            <div className="order-meta">
              <span>
                📞{' '}
                {enlaceWhatsApp(o.customer_phone) ? (
                  <a href={enlaceWhatsApp(o.customer_phone)} target="_blank" rel="noopener">
                    {o.customer_phone}
                  </a>
                ) : (
                  o.customer_phone || '—'
                )}
              </span>
              <span>📍 {o.customer_address}</span>
              <span>
                💳 {o.payment_method || '—'}
                {o.cash_change ? ` (${o.cash_change})` : ''}
              </span>
            </div>

            <ul className="order-items">
              {(o.items ?? []).map((it, i) => {
                const detalle = detallesDeLinea(it);
                return (
                  <li key={i}>
                    • ({it.qty}x) {it.name}
                    {detalle && <span style={{ color: '#71717a' }}> — {detalle}</span>}
                  </li>
                );
              })}
            </ul>

            <div className="order-foot">
              <span>Estado:</span>
              <select
                value={o.status}
                disabled={guardando === o.id}
                onChange={(e) => void cambiarEstado(o.id, e.target.value as EstadoPedido)}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETA_ESTADO[s]}
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>

      {hayMas && (
        <button
          type="button"
          className="btn-ghost"
          style={{ margin: '1.2rem auto', display: 'block' }}
          onClick={() => void cargar(pedidos.length)}
        >
          Ver más pedidos
        </button>
      )}
    </>
  );
}
