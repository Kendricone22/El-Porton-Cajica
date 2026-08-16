'use client';

/* =============================================================
 * MODAL DE PERSONALIZACIÓN
 *
 * El componente más grande del sitio: opciones de precio, proteínas,
 * el círculo de sabores, trozos, selectores sin coste, combo con
 * bebida, adiciones, notas y el upselling al añadir.
 *
 * En v1 todo esto es una cadena de HTML que se vuelve a generar
 * entera (`bodyEl.innerHTML = buildBody()`) y luego se parchea a mano
 * leyendo el DOM (`querySelector('input:checked').dataset.price`).
 * El DOM es a la vez la interfaz Y el sitio donde vive el estado.
 *
 * Aquí hay UNA fuente de verdad —el objeto `seleccion`— y la interfaz
 * es su reflejo. El precio no se lee del DOM: se calcula con
 * `precioDe(item, seleccion)`, la misma función que comprueban las
 * pruebas contra el servidor.
 * ============================================================= */

import { useEffect, useMemo, useState } from 'react';
import { COMBO_DRINKS, COMBO_PRICE, PIZZA_FLAVORS } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';
import {
  adicionesDe,
  aItemCarrito,
  ofreceCombo,
  precioDe,
  queFalta,
  seleccionInicial,
  type Seleccion,
} from '@/lib/modal';
import { useCarrito } from '@/estado/carrito';
import CirculoPizza from './CirculoPizza';

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

export default function ModalProducto({
  item,
  onCerrar,
}: {
  item: ProductoMenu | null;
  onCerrar: () => void;
}) {
  const { agregarItem } = useCarrito();
  const [sel, setSel] = useState<Seleccion>(() => (item ? seleccionInicial(item) : seleccionInicial({} as ProductoMenu)));
  const [porcionAbierta, setPorcionAbierta] = useState<number | null>(null);
  const [ofreciendoCombo, setOfreciendoCombo] = useState(false);
  const [intentoAgregar, setIntentoAgregar] = useState(false);
  const [adicionesAbiertas, setAdicionesAbiertas] = useState(false);

  /* Cada producto abre con su selección limpia. */
  useEffect(() => {
    if (!item) return;
    setSel(seleccionInicial(item));
    setPorcionAbierta(null);
    setOfreciendoCombo(false);
    setIntentoAgregar(false);
    setAdicionesAbiertas(false);
  }, [item]);

  /* Escape cierra: primero el upsell, luego el picker, luego el modal. */
  useEffect(() => {
    if (!item) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ofreciendoCombo) setOfreciendoCombo(false);
      else if (porcionAbierta !== null) setPorcionAbierta(null);
      else onCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [item, ofreciendoCombo, porcionAbierta, onCerrar]);

  /* Bloquea el desplazamiento del fondo mientras está abierto. */
  useEffect(() => {
    if (!item) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [item]);

  const adiciones = useMemo(() => (item ? adicionesDe(item.cat) : []), [item]);
  const total = item ? precioDe(item, sel) : 0;
  const falta = item ? queFalta(item, sel) : [];

  if (!item) return null;

  const cambiar = (parcial: Partial<Seleccion>) => setSel((s) => ({ ...s, ...parcial }));

  function agregarAlCarrito() {
    if (!item) return;
    agregarItem(aItemCarrito(item, sel));
    onCerrar();
  }

  function pulsarAgregar() {
    if (!item) return;
    setIntentoAgregar(true);
    if (falta.length) return;
    if (ofreceCombo(item, sel)) {
      setOfreciendoCombo(true);
      return;
    }
    agregarAlCarrito();
  }

  /** Alterna una proteína respetando el máximo del plato. */
  function alternarProteina(nombre: string) {
    const max = item!.chooseProteins ?? 1;
    setSel((s) => {
      if (max === 1) return { ...s, proteinas: [nombre] };
      if (s.proteinas.includes(nombre)) {
        return { ...s, proteinas: s.proteinas.filter((p) => p !== nombre) };
      }
      // Al llegar al máximo no se añaden más, igual que en v1.
      if (s.proteinas.length >= max) return s;
      return { ...s, proteinas: [...s.proteinas, nombre] };
    });
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div id="modal" className="modal" role="dialog" aria-modal="true" aria-label={item.name}>
        <header className="modal-head">
          <div>
            <h2 className="modal-title">{item.name}</h2>
            <p className="modal-desc">{item.desc}</p>
          </div>
          <button type="button" className="modal-close" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* ---- opciones de precio ---- */}
          {item.options.length > 1 && (
            <Seccion titulo="Elige una opción">
              {item.options.map((o, i) => (
                <Tarjeta key={o.label} activa={sel.opcion === i} onClick={() => cambiar({ opcion: i })}>
                  <span className="opt-card-label">{o.label}</span>
                  <span className="opt-card-price">{fmt(o.price)}</span>
                </Tarjeta>
              ))}
            </Seccion>
          )}

          {/* ---- proteínas ---- */}
          {item.proteins && (
            <Seccion
              titulo={(item.chooseProteins ?? 1) > 1 ? `Elige ${item.chooseProteins} proteínas` : 'Elige la proteína'}
              clase="proteins-group"
            >
              {item.proteins.map((p) => (
                <Tarjeta key={p} activa={sel.proteinas.includes(p)} onClick={() => alternarProteina(p)}>
                  <span className="opt-card-label">{p}</span>
                </Tarjeta>
              ))}
            </Seccion>
          )}

          {/* ---- pizza ---- */}
          {item.pizza && (
            <div className="modal-section">
              <h3 className="modal-section-title">🍕 Arma tu pizza</h3>
              <div id="pizza-ui">
                {sel.pizzaCantidad === 0 ? (
                  <>
                    <p className="modal-section-sub">¿Cuántos sabores quieres?</p>
                    <div className="pizza-counts">
                      {Array.from({ length: item.maxFlavors ?? 1 }, (_, k) => k + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="pizza-count-btn"
                          onClick={() => cambiar({ pizzaCantidad: n, pizzaSabores: new Array(n).fill(null) })}
                        >
                          {n} sabor{n > 1 ? 'es' : ''}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <CirculoPizza
                    cantidad={sel.pizzaCantidad}
                    sabores={sel.pizzaSabores}
                    onElegirPorcion={setPorcionAbierta}
                    onCambiarCantidad={() => cambiar({ pizzaCantidad: 0, pizzaSabores: [] })}
                  />
                )}
              </div>
            </div>
          )}

          {/* ---- trozos ---- */}
          {item.slices && (
            <Seccion titulo="🍴 ¿En cuántos trozos?">
              {item.slices.map((s, i) => (
                <Tarjeta key={s} activa={sel.trozo === i} onClick={() => cambiar({ trozo: i })}>
                  <span className="opt-card-label">{s}</span>
                </Tarjeta>
              ))}
            </Seccion>
          )}

          {/* ---- selectores sin coste ---- */}
          {(item.choices ?? []).map((ch, ci) => (
            <Seccion key={ch.title} titulo={ch.title}>
              {ch.options.map((o, i) => (
                <Tarjeta
                  key={o}
                  activa={sel.elecciones[ci] === i}
                  onClick={() =>
                    cambiar({ elecciones: sel.elecciones.map((v, k) => (k === ci ? i : v)) })
                  }
                >
                  <span className="opt-card-label">{o}</span>
                </Tarjeta>
              ))}
            </Seccion>
          ))}

          {/* ---- combo ---- */}
          {item.combo && (
            <div className="modal-section">
              <button
                type="button"
                className={`combo-card${sel.combo ? ' is-selected' : ''}`}
                onClick={() => cambiar({ combo: !sel.combo, bebida: sel.combo ? null : sel.bebida })}
              >
                <span className="combo-main">
                  <span className="combo-title">¡Hazlo Combo! 🍟🥤</span>
                  <span className="combo-sub">Papas a la francesa + bebida</span>
                </span>
                <span className="combo-price">+{fmt(COMBO_PRICE)}</span>
              </button>

              {sel.combo && (
                <div id="combo-drinks" className="combo-drinks">
                  <p className="modal-section-sub">Elige tu bebida (400ml)</p>
                  <div className="opt-grid">
                    {COMBO_DRINKS.map((d, i) => (
                      <Tarjeta key={d} activa={sel.bebida === i} onClick={() => cambiar({ bebida: i })}>
                        <span className="opt-card-label">{d}</span>
                      </Tarjeta>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- adiciones ---- */}
          {adiciones.length > 0 && (
            <div className="modal-section">
              <button
                type="button"
                className="adiciones-toggle"
                aria-expanded={adicionesAbiertas}
                onClick={() => setAdicionesAbiertas((v) => !v)}
              >
                <span className="modal-section-title" style={{ marginBottom: 0 }}>
                  ➕ Adiciones premium
                </span>
                <svg
                  className={`adiciones-arrow${adicionesAbiertas ? ' open' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {adicionesAbiertas && (
                <div className="adiciones-body">
                  <div className="opt-grid">
                    {adiciones.map((a) => (
                      <Tarjeta
                        key={a.name}
                        activa={sel.adiciones.includes(a.name)}
                        onClick={() =>
                          cambiar({
                            adiciones: sel.adiciones.includes(a.name)
                              ? sel.adiciones.filter((n) => n !== a.name)
                              : [...sel.adiciones, a.name],
                          })
                        }
                      >
                        <span className="opt-card-label">{a.name}</span>
                        <span className="opt-card-price">+{fmt(a.price)}</span>
                      </Tarjeta>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- notas ---- */}
          <div className="modal-section">
            <h3 className="modal-section-title">📝 Notas especiales</h3>
            <textarea
              id="modal-notes"
              className="modal-notes"
              rows={2}
              placeholder="Instrucciones especiales..."
              value={sel.notas}
              onChange={(e) => cambiar({ notas: e.target.value })}
            />
          </div>
        </div>

        <footer className="modal-foot">
          {/* Lo que falta solo se enseña tras intentar añadir: avisar antes
              de que el cliente haya hecho nada es regañarle por adelantado. */}
          {intentoAgregar && falta.length > 0 && (
            <ul className="modal-falta" role="alert">
              {falta.map((f) => (
                <li key={f}>⚠️ {f}</li>
              ))}
            </ul>
          )}
          {/* El total va DENTRO del botón, como en v1: `.modal-add` es un
              flex con space-between y espera dos hijos. */}
          <button type="button" id="modal-add" className="modal-add" onClick={pulsarAgregar}>
            <span>Agregar al Pedido</span>
            <span id="modal-total" className="modal-total">
              {fmt(total)}
            </span>
          </button>
        </footer>

        {/* ---- elegir sabor de una porción ---- */}
        {porcionAbierta !== null && (
          <div className="flavor-picker" onClick={(e) => e.target === e.currentTarget && setPorcionAbierta(null)}>
            <div className="flavor-picker-box">
              <p className="flavor-picker-title">Sabor para la porción {porcionAbierta + 1}</p>
              <div className="flavor-list">
                {PIZZA_FLAVORS.map((f: string) => (
                  <button
                    key={f}
                    type="button"
                    className="flavor-opt"
                    onClick={() => {
                      cambiar({
                        pizzaSabores: sel.pizzaSabores.map((v, k) => (k === porcionAbierta ? f : v)),
                      });
                      setPorcionAbierta(null);
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button type="button" className="flavor-cancel" onClick={() => setPorcionAbierta(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ---- upselling ---- */}
        {ofreciendoCombo && (
          <div id="upsell" className="upsell open">
            {/* Textos y clases idénticos a los de v1 (index.html), para que
                `estilos-v1.css` los reconozca sin tocar nada. */}
            <div className="upsell-box">
              <p className="upsell-title">🔥 ¡No te quedes sin papas!</p>
              <p className="upsell-text">
                Hazlo Combo por solo <strong>{fmt(COMBO_PRICE)}</strong> más (papas a la francesa + bebida).
              </p>
              <div className="upsell-actions">
                <button
                  type="button"
                  id="upsell-yes"
                  className="upsell-yes"
                  onClick={() => {
                    // Se activa el combo y se vuelve al modal para que elija
                    // bebida. En v1 aquí el pedido podía salir SIN bebida.
                    cambiar({ combo: true });
                    setOfreciendoCombo(false);
                    setIntentoAgregar(true);
                  }}
                >
                  Sí, hacerlo combo
                </button>
                <button type="button" id="upsell-no" className="upsell-no" onClick={agregarAlCarrito}>
                  No, gracias
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- piezas pequeñas ---------- */

function Seccion({
  titulo,
  clase = '',
  children,
}: {
  titulo: string;
  clase?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`modal-section ${clase}`}>
      <h3 className="modal-section-title">{titulo}</h3>
      <div className="opt-grid">{children}</div>
    </div>
  );
}

/**
 * En v1 esto es un <label> con un <input> escondido, y el estado
 * "seleccionado" se sincroniza a mano con una clase porque no se podía
 * confiar en `:has(:checked)`. Aquí es un botón y la clase sale del
 * estado directamente: no hay nada que sincronizar.
 */
function Tarjeta({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`opt-card${activa ? ' is-selected' : ''}`} aria-pressed={activa} onClick={onClick}>
      {children}
    </button>
  );
}
