'use client';

/* =============================================================
 * PESTAÑA DE ANALÍTICA — indicadores y embudo
 *
 * ⚠️ EL EMBUDO DE v1 DA NÚMEROS FALSOS Y NO LO PARECE.
 *
 * v1 hace `sb.from('events').select('type, created_at')` sin orden y
 * sin límite, y cuenta los tipos en el navegador. La API de Supabase
 * corta en 1000 filas: sin `order`, devuelve mil filas CUALESQUIERA.
 * En cuanto la tabla pasa de mil eventos —tres por pedido, así que
 * llega rápido— el embudo se calcula sobre un trozo arbitrario.
 *
 * Aquí se le pide a Postgres que CUENTE, con `head: true`: no viaja ni
 * una fila, solo el número, y es exacto haya un millón de eventos.
 * Tres consultas diminutas en vez de una descarga de mil filas.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { dinero } from '@/lib/pedidos-admin';
import Ventas from './Ventas';
import Visitas from './Visitas';
import ExportarCSV from './ExportarCSV';

type Totales = {
  pedidos_totales: number;
  pedidos_hoy: number;
  ingreso: number;
  ticket: number;
};

const PASOS = [
  { tipo: 'add_to_cart', etiqueta: 'Agregó al carrito' },
  { tipo: 'checkout_opened', etiqueta: 'Abrió el carrito' },
  { tipo: 'order_sent', etiqueta: 'Envió el pedido' },
] as const;

export default function Analitica({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [totales, setTotales] = useState<Totales | null>(null);
  const [embudo, setEmbudo] = useState<number[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso(null);

    /* --- indicadores: los calcula Postgres, así que son exactos --- */
    const { data: t, error: errT } = await sb.rpc('ventas_totales');
    if (errT || !t?.[0]) {
      setTotales(null);
      setAviso(
        'Los indicadores exactos necesitan la función ventas_totales(). ' +
          'Si falta, corre db/analitica-setup.sql en Supabase.',
      );
    } else {
      setTotales(t[0] as Totales);
    }

    /* --- embudo: se cuenta en la base, no aquí --- */
    const conteos = await Promise.all(
      PASOS.map(async (p) => {
        const { count, error } = await sb
          .from('events')
          .select('type', { count: 'exact', head: true })
          .eq('type', p.tipo);
        return error ? 0 : (count ?? 0);
      }),
    );
    setEmbudo(conteos);
    setCargando(false);
  }, [sb]);

  useEffect(() => {
    void cargar();
  }, [cargar, recargarToken]);

  if (cargando) return <p className="loading">Cargando analítica…</p>;

  const maximo = Math.max(1, ...(embudo ?? [1]));

  return (
    <>
      {aviso && <p className="login-error">{aviso}</p>}

      <div className="kpis">
        {[
          ['Pedidos totales', totales ? String(totales.pedidos_totales) : '—'],
          ['Pedidos hoy', totales ? String(totales.pedidos_hoy) : '—'],
          ['Ingreso (sin cancelados)', totales ? dinero(totales.ingreso) : '—'],
          ['Ticket promedio', totales ? dinero(totales.ticket) : '—'],
        ].map(([etiqueta, valor]) => (
          <div className="kpi" key={etiqueta}>
            <div className="kpi-num">{valor}</div>
            <div className="kpi-label">{etiqueta}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">Embudo de conversión</h3>
      <div id="funnel">
        {PASOS.map((p, i) => {
          const v = embudo?.[i] ?? 0;
          return (
            <div className="funnel-row" key={p.tipo}>
              <span className="funnel-label">{p.etiqueta}</span>
              <div className="funnel-bar-wrap">
                <div className="funnel-bar" style={{ width: `${(v / maximo) * 100}%` }} />
              </div>
              <span className="funnel-val">{v}</span>
            </div>
          );
        })}
      </div>

      <Ventas recargarToken={recargarToken} />

      <Visitas recargarToken={recargarToken} />

      <div style={{ marginTop: '1.5rem' }}>
        <ExportarCSV />
      </div>
    </>
  );
}
