'use client';

/* =============================================================
 * VISITAS
 *
 * ⚠️ Los conteos los hace Postgres (funciones `visitas_*`), no el
 * navegador, y hay un motivo que no es solo el tope de 1000 filas:
 * las PERSONAS ÚNICAS no se pueden sumar por día. Quien entra el lunes
 * y el martes es una persona, no dos — sumar los totales diarios daría
 * un número inflado.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';

type Resumen = { periodo: string; personas: number; visitas: number; vistas: number };
type DiaVisitas = { dia: string; personas: number };

const etiquetaDia = (iso: string) => {
  const p = String(iso).split('-');
  return `${p[2]}/${p[1]}`;
};

export default function Visitas({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [resumen, setResumen] = useState<Record<string, Resumen>>({});
  const [serie, setSerie] = useState<DiaVisitas[]>([]);
  const [cargando, setCargando] = useState(true);
  const [falta, setFalta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFalta(false);
    setError(null);

    const [rResumen, rSerie] = await Promise.all([
      sb.rpc('visitas_resumen'),
      sb.rpc('visitas_serie', { dias: 30 }),
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

  const maximo = Math.max(1, ...serie.map((d) => d.personas));

  return (
    <section>
      <h3 className="section-title">Visitas</h3>

      <div className="vis-cards">
        {[
          ['Hoy', 'hoy'],
          ['Últimos 7 días', 'semana'],
          ['Últimos 30 días', 'mes'],
        ].map(([titulo, clave]) => {
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
          <h4
            style={{
              fontSize: '.72rem',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: '#a1a1aa',
              marginTop: '1.2rem',
            }}
          >
            Personas por día (30 días)
          </h4>
          <div className="vis-serie">
            {serie.map((d) => (
              <div className="vis-col" key={d.dia} title={`${etiquetaDia(d.dia)}: ${d.personas}`}>
                <div className="vis-col-bar" style={{ height: `${(d.personas / maximo) * 100}%` }} />
                <span className="vis-col-label">{etiquetaDia(d.dia)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
