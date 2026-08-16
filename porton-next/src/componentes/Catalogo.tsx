'use client';

/* =============================================================
 * CATÁLOGO CON FILTROS
 *
 * Equivale a `initCatalogo` de js/app.js, pero con una diferencia de
 * fondo en CÓMO filtra:
 *
 *   v1  → pinta las 59 tarjetas y esconde las que no tocan con
 *         `style.display = 'none'`. El DOM siempre tiene 59.
 *   aquí→ solo existen en el DOM las de la categoría activa.
 *
 * En React no hay que "esconder": se describe qué debe haber y él se
 * encarga del resto. Menos nodos y sin estados intermedios raros.
 *
 * ⚠️ 'use client' NO significa "no se renderiza en el servidor". Este
 * componente también se pinta en el servidor para el HTML inicial —
 * la marca solo dice que ADEMÁS se hidrata en el navegador. Por eso el
 * catálogo sí aparece en el HTML que ven Google y las redes sociales,
 * cosa que hoy no pasa: en v1 las tarjetas las crea el JavaScript
 * después de cargar.
 * ============================================================= */

import { useMemo, useState } from 'react';
import type { Categoria, CategoriaId, ProductoMenu } from '@/types/menu';
import { CAT_DESC } from '@/data/menu';
import {
  LIMITE_VISIBLES,
  categoriasConProductos,
  productosDe,
  retrasoCascada,
} from '@/lib/catalogo';
import TarjetaProducto, { textoBoton } from './TarjetaProducto';

type DescripcionCat = { emoji: string; title: string; text: string };

export default function Catalogo({
  menu,
  categorias,
  onPersonalizar,
}: {
  menu: ProductoMenu[];
  categorias: Categoria[];
  /** Lo conectará el modal en el siguiente tramo. */
  onPersonalizar?: (id: string) => void;
}) {
  const pestanas = useMemo(() => categoriasConProductos(menu, categorias), [menu, categorias]);
  const [catActiva, setCatActiva] = useState(() => pestanas[0]?.key ?? categorias[0].key);
  const [expandido, setExpandido] = useState(false);

  const visiblesTotales = useMemo(() => productosDe(menu, catActiva), [menu, catActiva]);
  const hayMas = visiblesTotales.length > LIMITE_VISIBLES;
  const mostrados = expandido ? visiblesTotales : visiblesTotales.slice(0, LIMITE_VISIBLES);

  const descripcion = (CAT_DESC as Record<string, DescripcionCat[] | undefined>)[catActiva];

  /** Al cambiar de categoría se vuelve a colapsar, como en v1. */
  function elegirCategoria(key: CategoriaId) {
    setCatActiva(key);
    setExpandido(false);
  }

  return (
    <section className="catalogo">
      <div className="catalogo-filtros-wrap">
        <div id="catalogo-filtros" className="catalogo-filtros" role="tablist">
          {pestanas.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={c.key === catActiva}
              className={`filtro-tab${c.key === catActiva ? ' is-active' : ''}`}
              onClick={(e) => {
                elegirCategoria(c.key);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {descripcion?.length ? (
        <div id="catalogo-desc" className="catalogo-desc">
          {descripcion.map((d) => (
            <div className="catdesc-item" key={d.title}>
              <span className="catdesc-emoji">{d.emoji}</span>
              <div className="catdesc-text">
                <h4 className="catdesc-title">{d.title}</h4>
                <p className="catdesc-p">{d.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="catalogo-grid-wrap">
        {/* `key` con la categoría fuerza a React a crear tarjetas nuevas al
            cambiar de pestaña, y así la animación de entrada se reinicia.
            En v1 esto se hacía provocando un reflow a mano (void offsetWidth). */}
        <div id="catalogo-grid" className="catalogo-grid" key={catActiva}>
          {mostrados.map((p, i) => (
            <TarjetaProducto
              key={p.id}
              producto={p}
              retraso={retrasoCascada(i)}
              boton={
                <button
                  type="button"
                  className="cat-card-btn"
                  data-id={p.id}
                  onClick={() => onPersonalizar?.(p.id)}
                >
                  {textoBoton(p)}
                </button>
              }
            />
          ))}
        </div>

        {hayMas && !expandido && <div id="catalogo-fade" className="catalogo-fade" aria-hidden="true" />}
      </div>

      {hayMas && (
        <div id="catalogo-more" className="catalogo-more">
          <button
            type="button"
            id="catalogo-more-btn"
            className={`ver-carta${expandido ? ' is-expanded' : ''}`}
            onClick={() => setExpandido((v) => !v)}
          >
            <span className="more-label">{expandido ? 'Mostrar menos' : 'Mostrar más'}</span>
          </button>
        </div>
      )}
    </section>
  );
}
