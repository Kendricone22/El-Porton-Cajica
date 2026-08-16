'use client';

/* =============================================================
 * CARRUSEL DEL HERO
 *
 * Avanza solo cada 5s y se puede navegar a mano (flechas, puntos,
 * deslizar con el dedo), como las historias de Instagram.
 *
 * ⚠️ LO IMPORTANTE, Y NO SE VE: las 7 diapositivas están en el HTML,
 * pero SOLO LA PRIMERA se descarga de inmediato. Las otras seis van en
 * carga diferida. Si todas fueran urgentes, la foto que el cliente
 * está mirando competiría por el ancho de banda con seis que no ve, y
 * el hero tardaría MÁS que antes de tener carrusel.
 *
 * El texto (titular, descripción, precio) es UN SOLO bloque que cambia
 * de contenido: siete <h1> en la misma página sería incorrecto.
 * ============================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductoHero } from '@/types/menu';

/** Cada cuánto avanza solo. */
const INTERVALO_MS = 5000;
/** Deslizamiento mínimo para que cuente como gesto. */
const UMBRAL_DESLIZAR = 40;

const ruta = (p: string) => (p.startsWith('/') ? p : `/${p}`);

export default function CarruselHero({ productos }: { productos: ProductoHero[] }) {
  const [activo, setActivo] = useState(0);
  const total = productos.length;
  const inicioTactil = useRef<number | null>(null);

  const ir = useCallback((i: number) => setActivo(((i % total) + total) % total), [total]);
  const siguiente = useCallback(() => ir(activo + 1), [ir, activo]);
  const anterior = useCallback(() => ir(activo - 1), [ir, activo]);

  /* --- Avance automático ---
     El temporizador depende de `activo`, así que cualquier navegación
     manual lo REINICIA: si acabas de pasar de foto a mano, tienes los
     5s completos para verla y no medio segundo.

     ⚠️ Es un `setTimeout` ENCADENADO (uno que al cumplirse programa el
     siguiente), no un `setInterval`. La diferencia importa: con
     `setInterval`, una pestaña en segundo plano acumularía avances y
     al volver saltarían todos de golpe. Aquí solo existe un
     temporizador a la vez, así que no hay nada que acumular — y el
     navegador ya ralentiza por su cuenta lo que corre de fondo.

     Por eso NO hay guarda de `document.hidden`. La hubo, y estaba mal:
     el manejador que la levantaba hacía `setActivo(i => i)`, y React
     se salta el repintado cuando el valor no cambia, así que el efecto
     no volvía a correr y el carrusel se quedaba congelado para siempre
     en cualquier pestaña que se abriera de fondo. */
  useEffect(() => {
    if (total < 2) return;
    const t = setTimeout(siguiente, INTERVALO_MS);
    return () => clearTimeout(t);
  }, [activo, siguiente, total]);

  if (!total) return null;
  const p = productos[activo];

  return (
    <>
      <div
        className="hero-media"
        role="group"
        aria-roledescription="carrusel"
        aria-label="Productos destacados"
        onTouchStart={(e) => {
          inicioTactil.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (inicioTactil.current === null) return;
          const dx = e.changedTouches[0].clientX - inicioTactil.current;
          if (Math.abs(dx) > UMBRAL_DESLIZAR) (dx < 0 ? siguiente : anterior)();
          inicioTactil.current = null;
        }}
      >
        {productos.map((prod, i) => (
          <div
            key={prod.title}
            className={`hero-slide${i === activo ? ' is-active' : ''}`}
            aria-hidden={i !== activo}
          >
            <picture>
              {prod.imgTall && (
                <source media="(max-width: 900px) and (orientation: portrait)" srcSet={ruta(prod.imgTall)} />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="hero-photo"
                src={ruta(prod.img!)}
                srcSet={prod.img4k ? `${ruta(prod.img!)} 1920w, ${ruta(prod.img4k)} 3840w` : undefined}
                sizes={prod.img4k ? '(max-width: 900px) 460vw, 160vw' : undefined}
                style={prod.posMobile ? ({ '--hero-pos-x': prod.posMobile } as React.CSSProperties) : undefined}
                alt={i === activo ? prod.title : ''}
                /* SOLO la primera es urgente. Las demás llegan mientras
                   el cliente mira esta. */
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'low'}
                decoding={i === 0 ? 'sync' : 'async'}
              />
            </picture>
          </div>
        ))}
      </div>

      <div className="hero-scrim" aria-hidden="true" />

      {/* `key` fuerza a React a rehacer el bloque al cambiar de producto,
          así la animación de entrada del texto se reinicia sola. */}
      <div id="hero-content" className="hero-content" key={activo}>
        <p className="hero-tagline">{p.tagline}</p>
        <h1 className="hero-title">{p.title}</h1>
        <p className="hero-desc">{p.desc}</p>
        <div className="hero-actions">
          <span className="hero-price-badge">{p.price}</span>
          <a href="#menu-catalogo" className="hero-order-btn">
            <span>Ordenar Ahora</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {total > 1 && (
        <>
          <button type="button" className="hero-flecha hero-flecha--izq" onClick={anterior} aria-label="Producto anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" className="hero-flecha hero-flecha--der" onClick={siguiente} aria-label="Producto siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="hero-puntos" role="tablist" aria-label="Ir a un producto">
            {productos.map((prod, i) => (
              <button
                key={prod.title}
                type="button"
                role="tab"
                aria-selected={i === activo}
                aria-label={prod.title}
                className={`hero-punto${i === activo ? ' is-active' : ''}`}
                onClick={() => ir(i)}
              >
                {/* La barra que se llena en 5s: el cliente ve cuánto
                    queda para que pase sola. */}
                <span className="hero-punto-barra" />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
