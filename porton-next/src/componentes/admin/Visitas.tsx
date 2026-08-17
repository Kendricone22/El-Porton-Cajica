'use client';

/* =============================================================
 * VISITAS
 *
 * ⚠️ Los conteos los hace Postgres (funciones `visitas_*`), no el
 * navegador, y hay un motivo que va más allá del tope de 1000 filas:
 * las PERSONAS ÚNICAS no se pueden sumar por día. Quien entra el lunes
 * y el martes es una persona, no dos — sumar los totales diarios daría
 * un número inflado.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';

type Resumen = { periodo: string; personas: number; visitas: number; vistas: number };
type DiaVisitas = { dia: string; personas: number; visitas: number };
type Recurrencia = { tramo: string; personas: number };

const etiquetaDia = (iso: string) => {
  const p = String(iso).split('-');
  return `${p[2]}/${p[1]}`;
};

const ESTILO_H4: React.CSSProperties = {
  fontSize: '.72rem',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: '#a1a1aa',
};

export default function Visitas({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [resumen, setResumen] = useState<Record<string, Resumen>>({});
  const [serie, setSerie] = useState<DiaVisitas[]>([]);
  const [recurrencia, setRecurrencia] = useState<Recurrencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [falta, setFalta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFalta(false);
    setError(null);

    const [rResumen, rSerie, rRec] = await Promise.all([
      sb.rpc('visitas_resumen'),
      sb.rpc('visitas_serie', { dias: 30 }),
      sb.rpc('visitas_recurrencia', { dias: 30 }),
    ]);

    setCargando(false);

    if (rResumen.error) {
      const noExiste = /does not exist|schema cache|could not find/i.test(rResumen.error.message ?? '');
      if (noExiste) setFalta(true);
      else setError('No se pudieron leer las visitas: ' + rResumen.error.message);
      return;
    }

    const porPeriodo: Record<string, Resumen> = {};
    for (const r of (rResumen.data ?? []) as Resumen[]) porPeriodo[r.periodo] = r;
    setResumen(porPeriodo);

    setSerie(
      rSerie.error
        ? []
        : ((rSerie.data ?? []) as DiaVisitas[]).map((d) => ({
            dia: d.dia,
            personas: Number(d.personas) || 0,
            visitas: Number(d.visitas) || 0,
          })),
    );
    setRecurrencia(
      rRec.error
        ? []
        : ((rRec.data ?? []) as Recurrencia[]).map((r) => ({
            tramo: r.tramo,
            personas: Number(r.personas) || 0,
          })),
    );
  }, [sb]);

  useEffect(() => {
    void cargar();
  }, [cargar, recargarToken]);

  if (cargando) return <p className="loading">Cargando visitas…</p>;

  if (falta) {
    return (
      <div className="vis-aviso">
        📋 Falta activar el registro de visitas. Corre <code>db/visitas-setup.sql</code> en Supabase →
        SQL Editor y vuelve a entrar.
      </div>
    );
  }
  if (error) return <div className="vis-aviso">{error}</div>;

  const maxPersonas = Math.max(1, ...serie.map((d) => d.personas));
  const totalRecurrencia = recurrencia.reduce((s, r) => s + r.personas, 0);

  return (
    <>
      <div className="vis-cards">
        {(
          [
            ['Hoy', 'hoy'],
            ['Últimos 7 días', 'semana'],
            ['Últimos 30 días', 'mes'],
          ] as const
        ).map(([titulo, clave]) => {
          const r = resumen[clave] ?? { personas: 0, visitas: 0, vistas: 0 };
          return (
            <div className="vis-card" key={clave}>
              <h4>{titulo}</h4>
              <div className="vis-row is-main">
                <span>Personas</span>
                <b>{r.personas || 0}</b>
              </div>
              <div className="vis-row">
                <span>Visitas</span>
                <b>{r.visitas || 0}</b>
              </div>
              <div className="vis-row">
                <span>Vistas de página</span>
                <b>{r.vistas || 0}</b>
              </div>
            </div>
          );
        })}
      </div>

      {serie.length > 0 && (
        <>
          <h4 style={ESTILO_H4}>Personas por día (30 días)</h4>
          <div className="chart">
            {serie.map((d) => (
              <div
                className="chart-col"
                key={d.dia}
                title={`${etiquetaDia(d.dia)}: ${d.personas} personas, ${d.visitas} visitas`}
              >
                {/* Los días sin visitas dejan una marca mínima en vez de
                    desaparecer: así se ve que ese día existió. */}
                <div
                  className={`chart-bar${d.personas ? '' : ' is-cero'}`}
                  style={{
                    height: d.personas ? `${Math.max(4, (d.personas / maxPersonas) * 100)}%` : '2%',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="chart-axis">
            <span>{etiquetaDia(serie[0].dia)}</span>
            <span>{etiquetaDia(serie[serie.length - 1].dia)}</span>
          </div>
        </>
      )}

      {totalRecurrencia > 0 && (
        <>
          <h4 style={{ ...ESTILO_H4, marginTop: '1.2rem' }}>Cuántas veces volvieron (30 días)</h4>
          {recurrencia.map((r) => (
            <div className="funnel-row" key={r.tramo}>
              <span className="funnel-label">{r.tramo}</span>
              <div className="funnel-bar-wrap">
                <div className="funnel-bar" style={{ width: `${(r.personas / totalRecurrencia) * 100}%` }} />
              </div>
              <span className="funnel-val">{r.personas}</span>
            </div>
          ))}
        </>
      )}

      {/* Esta nota no es decorativa: explica qué significa cada número y
          deja claro que no se guarda ningún dato personal. */}
      <p className="vis-nota">
        <b>Personas</b> = navegadores distintos, no seres humanos: el mismo cliente en celular y
        computador cuenta 2, y si limpia el navegador vuelve a contar como nuevo. <b>Visitas</b> =
        sesiones, se cortan a los 30 min de inactividad. <b>Vistas</b> = cargas de página. No se guarda
        IP ni ningún dato personal.
      </p>
    </>
  );
}
