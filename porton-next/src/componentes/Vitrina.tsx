'use client';

/* =============================================================
 * VITRINA (#carta) — la carta destacada
 *
 * Filas alternando foto/texto. La última arranca difuminada (teaser)
 * y el botón "Ver toda la carta" la completa y añade el resto de
 * platos AQUÍ MISMO, sin navegar a otro sitio.
 *
 * En v1 esto se hace creando nodos con `document.createElement` y
 * reemplazando el teaser con `replaceWith`. Aquí solo hay un booleano:
 * `expandida`. React se encarga de qué filas existen y cuáles no.
 * ============================================================= */

import { useState } from 'react';
import { CARTA_DESTACADA, CARTA_DESTACADA_MAS } from '@/data/menu';
import type { ProductoVitrina } from '@/types/menu';

const destacados = CARTA_DESTACADA as ProductoVitrina[];
const extra = CARTA_DESTACADA_MAS as ProductoVitrina[];

const ruta = (p: string) => (p.startsWith('/') ? p : `/${p}`);

function Fila({
  p,
  indice,
  teaser,
}: {
  p: ProductoVitrina;
  indice: number;
  teaser: boolean;
}) {
  // Las impares llevan la foto al otro lado.
  const derecha = indice % 2 === 1;

  return (
    <div
      className={
        'carta-row' +
        (derecha ? ' carta-row--right' : '') +
        (teaser ? ' carta-row--teaser in-view' : ' reveal')
      }
    >
      <div className="carta-photo">
        <div className="carta-photo-card">
          <span className="carta-badge">{p.badge}</span>
          {p.img ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className="carta-photo-img"
              data-menu-id={p.menuId ?? ''}
              src={ruta(p.img)}
              alt={p.title}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="carta-photo-emoji">{p.emoji}</span>
          )}
        </div>
      </div>

      <div className="carta-text">
        <h3 className="carta-text-title">{p.title}</h3>
        <p className="carta-text-desc">{p.desc}</p>
        <div className="carta-text-actions">
          <span className="carta-price">{p.price}</span>
          {!teaser && (
            <a href="#menu-catalogo" className="carta-order-btn">
              Ordenar ahora <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Vitrina() {
  const [expandida, setExpandida] = useState(false);
  if (!destacados.length) return null;

  const ultima = destacados.length - 1;

  return (
    <section id="carta" className="carta">
      <div className="carta-rows">
        {destacados.map((p, i) => (
          <Fila key={p.title} p={p} indice={i} teaser={!expandida && i === ultima} />
        ))}
        {expandida &&
          extra.map((p, j) => (
            <Fila key={p.title} p={p} indice={destacados.length + j} teaser={false} />
          ))}
      </div>

      <div className="carta-actions">
        {!expandida && (
          <button
            type="button"
            className="ver-carta"
            aria-label="Ver toda la carta"
            onClick={() => setExpandida(true)}
          >
            <span>Ver toda la carta</span>
            <span className="ver-carta-arrows" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        )}
        <a href="#menu-catalogo" className="ver-carta ver-carta--armado" aria-label="Ir al armado del pedido">
          <span>Ir al armado</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
