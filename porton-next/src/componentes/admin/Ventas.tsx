'use client';

/* =============================================================
 * VENTANA DE VENTAS
 *
 * Dos lecturas del MISMO periodo: cuánto entró (área en el tiempo) y
 * qué se vendió (barras). Un solo selector arriba mueve las dos a la
 * vez — nunca un filtro por gráfico, que obliga a comparar cosas que
 * no son comparables.
 *
 * Los totales los calcula Postgres, así que no dependen del tope de
 * 1000 filas de la API.
 *
 * La gráfica se dibuja al ANCHO REAL del contenedor, no con un
 * viewBox que se estira: así el texto de los ejes mide lo mismo en el
 * celular que en el escritorio, en vez de encogerse hasta ser
 * ilegible. Por eso se redibuja al cambiar el tamaño.
 * ============================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { dinero } from '@/lib/pedidos-admin';
import {
  MARCO_POR_DEFECTO,
  PERIODOS,
  TITULO,
  UNIDAD,
  coordX,
  coordY,
  escalaY,
  etiquetaEje,
  formatoCorto,
  indiceMasCercano,
  llevaEtiqueta,
  marcasY,
  pasoEtiquetasX,
  rutaArea,
  rutaLinea,
  type FilaTop,
  type Granularidad,
  type Marco,
  type PuntoSerie,
} from '@/lib/ventas';

export default function Ventas({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [gran, setGran] = useState<Granularidad>('dia');
  const [serie, setSerie] = useState<PuntoSerie[]>([]);
  const [top, setTop] = useState<FilaTop[]>([]);
  const [tabla, setTabla] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [falta, setFalta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cajaRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(600);
  const [encima, setEncima] = useState<number | null>(null);

  /* --- datos --- */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setFalta(false);

    const n = PERIODOS[gran];
    const [rSerie, rTop] = await Promise.all([
      sb.rpc('ventas_serie', { p_gran: gran, p_periodos: n }),
      sb.rpc('ventas_top', { p_gran: gran, p_periodos: n, p_limite: 8 }),
    ]);

    setCargando(false);

    if (rSerie.error) {
      const noExiste = /does not exist|schema cache|could not find/i.test(rSerie.error.message ?? '');
      if (noExiste) setFalta(true);
      else setError('No se pudieron leer las ventas: ' + rSerie.error.message);
      return;
    }

    setSerie(
      ((rSerie.data ?? []) as PuntoSerie[]).map((d) => ({
        inicio: d.inicio,
        ingreso: Number(d.ingreso) || 0,
        pedidos: Number(d.pedidos) || 0,
      })),
    );
    setTop(
      rTop.error
        ? []
        : ((rTop.data ?? []) as FilaTop[]).map((t) => ({
            producto: t.producto,
            categoria: t.categoria,
            unidades: Number(t.unidades) || 0,
            ingreso: Number(t.ingreso) || 0,
          })),
    );
  }, [sb, gran]);

  useEffect(() => {
    void cargar();
  }, [cargar, recargarToken]);

  /* --- ancho real, para que los ejes no se encojan --- */
  useEffect(() => {
    const medir = () => setAncho(Math.max(260, cajaRef.current?.clientWidth || 320));
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [cargando]);

  if (cargando) return <p className="loading">Cargando ventas…</p>;

  if (falta) {
    return (
      <div className="vis-aviso">
        📋 Falta activar los gráficos de ventas. Corre <code>db/analitica-setup.sql</code> en Supabase →
        SQL Editor y vuelve a entrar.
      </div>
    );
  }
  if (error) return <div className="vis-aviso">{error}</div>;

  const totalPeriodo = serie.reduce((s, d) => s + d.ingreso, 0);
  const pedidosPeriodo = serie.reduce((s, d) => s + d.pedidos, 0);

  const marco: Marco = { ancho, ...MARCO_POR_DEFECTO };
  const valores = serie.map((d) => d.ingreso);
  const esc = escalaY(Math.max(0, ...valores));
  const suelo = marco.padT + (marco.alto - marco.padT - marco.padB);
  const paso = pasoEtiquetasX(serie.length);
  const maxUnidades = Math.max(1, ...top.map((t) => t.unidades));

  return (
    <section className="vt">
      <div className="vt-head">
        <h3 className="section-title">Ventas</h3>
        <div className="vt-periodos">
          {(['dia', 'semana', 'mes'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`vt-periodo${gran === g ? ' is-on' : ''}`}
              onClick={() => setGran(g)}
            >
              {g === 'dia' ? 'Diario' : g === 'semana' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setTabla((v) => !v)}>
            {tabla ? 'Ocultar tabla' : 'Ver tabla'}
          </button>
        </div>
      </div>

      <div className="vt-grid-cols">
        <div>
          <div className="vt-h4">Ingreso · {TITULO[gran]}</div>
          <div className="vt-total">{dinero(totalPeriodo)}</div>
          <div className="vt-sub">
            {pedidosPeriodo} pedido{pedidosPeriodo === 1 ? '' : 's'} · sin contar cancelados
          </div>

          <div className="vt-plot is-listo" ref={cajaRef}>
            {!serie.length ? (
              <p className="vt-vacio">Sin ventas en este periodo.</p>
            ) : (
              <>
                <svg
                  width={ancho}
                  height={marco.alto}
                  role="img"
                  aria-label={`Ingreso por ${UNIDAD[gran]}`}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setEncima(indiceMasCercano(e.clientX - r.left, serie.length, marco));
                  }}
                  onMouseLeave={() => setEncima(null)}
                  onTouchMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setEncima(indiceMasCercano(e.touches[0].clientX - r.left, serie.length, marco));
                  }}
                  onTouchEnd={() => setEncima(null)}
                >
                  <defs>
                    <linearGradient id="vtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E53E3E" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#E53E3E" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {marcasY(esc).map((v) => {
                    const yy = coordY(v, esc.tope, marco);
                    return (
                      <g key={v}>
                        <line className="vt-gridline" x1={marco.padL} y1={yy} x2={ancho - marco.padR} y2={yy} />
                        <text className="vt-axis" x={marco.padL - 8} y={yy + 3} textAnchor="end">
                          {formatoCorto(v)}
                        </text>
                      </g>
                    );
                  })}

                  {serie.map((d, i) =>
                    llevaEtiqueta(i, serie.length, paso) ? (
                      <text
                        key={d.inicio}
                        className="vt-axis"
                        x={coordX(i, serie.length, marco)}
                        y={marco.alto - 8}
                        textAnchor="middle"
                      >
                        {etiquetaEje(d.inicio, gran)}
                      </text>
                    ) : null,
                  )}

                  <path className="vt-area" d={rutaArea(valores, esc.tope, marco)} fill="url(#vtGrad)" />
                  <path className="vt-line" d={rutaLinea(valores, esc.tope, marco)} />

                  {encima !== null && (
                    <>
                      <line
                        className="vt-cross"
                        x1={coordX(encima, serie.length, marco)}
                        y1={marco.padT}
                        x2={coordX(encima, serie.length, marco)}
                        y2={suelo}
                      />
                      <circle
                        className="vt-dot"
                        cx={coordX(encima, serie.length, marco)}
                        cy={coordY(serie[encima].ingreso, esc.tope, marco)}
                        r={4.5}
                      />
                    </>
                  )}

                  {/* Solo se rotula el ÚLTIMO punto: un número sobre cada
                      punto es ruido y tapa la propia línea. */}
                  <circle
                    className="vt-dot"
                    cx={coordX(serie.length - 1, serie.length, marco)}
                    cy={coordY(valores[valores.length - 1], esc.tope, marco)}
                    r={4.5}
                  />
                  {valores[valores.length - 1] > 0 && (
                    <text
                      className="vt-endlabel"
                      x={coordX(serie.length - 1, serie.length, marco) - 6}
                      y={coordY(valores[valores.length - 1], esc.tope, marco) - 10}
                      textAnchor="end"
                    >
                      {dinero(valores[valores.length - 1])}
                    </text>
                  )}
                </svg>

                {encima !== null && (
                  <div
                    className="vt-tip is-on"
                    style={{ left: coordX(encima, serie.length, marco), top: marco.padT }}
                  >
                    <b>{etiquetaEje(serie[encima].inicio, gran)}</b>
                    <br />
                    {dinero(serie[encima].ingreso)}
                    <br />
                    <small>
                      {serie[encima].pedidos} pedido{serie[encima].pedidos === 1 ? '' : 's'}
                    </small>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <div className="vt-h4">Productos más pedidos</div>
          <div className="vt-sub">{TITULO[gran]} · por unidades vendidas</div>

          {!top.length ? (
            <p className="vt-vacio">Sin datos en este periodo.</p>
          ) : (
            <div>
              {top.map((t) => (
                <div className="vt-bar-row" key={t.producto}>
                  <span className="vt-bar-label">{t.producto}</span>
                  <div className="vt-bar-wrap">
                    {/* Todas del MISMO rojo a propósito: pintar cada barra
                        de un tono distinto codificaría el tamaño dos veces. */}
                    <div className="vt-bar" style={{ width: `${(t.unidades / maxUnidades) * 100}%` }} />
                  </div>
                  <span className="vt-bar-val">{t.unidades}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* La tabla existe para que ningún valor dependa de pasar el ratón:
          desde el celular no hay ratón. */}
      {tabla && (
        <div className="vt-tabla-wrap">
          <table className="vt-tabla">
            <thead>
              <tr>
                <th>{UNIDAD[gran] === 'día' ? 'Día' : UNIDAD[gran] === 'semana' ? 'Semana' : 'Mes'}</th>
                <th>Ingreso</th>
                <th>Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((d) => (
                <tr key={d.inicio}>
                  <td>{etiquetaEje(d.inicio, gran)}</td>
                  <td>{dinero(d.ingreso)}</td>
                  <td>{d.pedidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
