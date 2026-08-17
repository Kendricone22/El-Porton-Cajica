'use client';

/* =============================================================
 * PESTAÑA DE ANALÍTICA
 *
 * ⚠️ EL ORDEN Y LOS BLOQUES SON LOS DE v1, no una reorganización mía:
 *   barra con "Exportar CSV" → indicadores → Ventas → Visitas → Embudo
 * Quien usa el panel ya sabe dónde está cada cosa.
 *
 * El selector de periodo vive AQUÍ y no dentro de Ventas, porque en v1
 * es uno solo para todo el bloque: mueve la gráfica y los productos a
 * la vez, nunca cada uno por su lado.
 *
 * ⚠️ EL EMBUDO DE v1 DA NÚMEROS FALSOS Y NO LO PARECE.
 * Hace `select('type, created_at')` sin orden y sin límite, y cuenta en
 * el navegador. La API corta en 1000 filas y, sin `order`, devuelve mil
 * filas CUALESQUIERA. Aquí se le pide a Postgres que CUENTE con
 * `head: true`: no viaja ni una fila, solo el número, y es exacto.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { dinero } from '@/lib/pedidos-admin';
import type { Granularidad } from '@/lib/ventas';
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

const PERIODO_ETIQUETA: Record<Granularidad, string> = {
  dia: 'Diario',
  semana: 'Semanal',
  mes: 'Mensual',
};

export default function Analitica({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [totales, setTotales] = useState<Totales | null>(null);
  const [embudo, setEmbudo] = useState<number[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  const [gran, setGran] = useState<Granularidad>('dia');
  const [tabla, setTabla] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso(null);

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
      <div className="menu-toolbar">
        <span className="menu-count">Exporta las ventas para usarlas en otro dashboard</span>
        <ExportarCSV />
      </div>

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

      <div className="panel-box">
        <h3>Ventas</h3>
        <div className="vt-toolbar">
          <div className="vt-seg" role="group" aria-label="Periodo">
            {(['dia', 'semana', 'mes'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={gran === g ? 'active' : undefined}
                onClick={() => setGran(g)}
              >
                {PERIODO_ETIQUETA[g]}
              </button>
            ))}
          </div>
          <button type="button" className="vt-link" onClick={() => setTabla((v) => !v)}>
            {tabla ? 'Ocultar tabla' : 'Ver tabla'}
          </button>
        </div>
        <Ventas gran={gran} tabla={tabla} recargarToken={recargarToken} />
      </div>

      <div className="panel-box">
        <h3>Visitas a la página</h3>
        <Visitas recargarToken={recargarToken} />
      </div>

      <div className="panel-box">
        <h3>Embudo (acciones registradas)</h3>
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
      </div>
    </>
  );
}
