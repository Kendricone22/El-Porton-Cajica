import { HERO_PRODUCTS } from '@/data/menu';
import type { ProductoHero } from '@/types/menu';
import EfectoScrollHero from './EfectoScrollHero';

/* =============================================================
 * HERO
 *
 * Componente de SERVIDOR a propósito. La foto del Hero es el
 * elemento más grande de la pantalla —lo que Google mide como LCP— y
 * en v1 la inyecta JavaScript: el navegador no puede ni empezar a
 * descargarla hasta haber cargado y ejecutado app.js.
 *
 * Aquí va dentro del HTML, así que el navegador la pide de inmediato.
 * A cambio, el producto rota cada vez que la página se regenera (30s)
 * en lugar de en cada recarga.
 *
 * NO se usa next/image: las tres variantes (panorámica, 4K y vertical)
 * ya están optimizadas a mano y el recorte depende de la orientación,
 * cosa que se resuelve con <picture> y no con el optimizador.
 * ============================================================= */

const productos = HERO_PRODUCTS as ProductoHero[];

/** Ruta absoluta: en data.js van como "assets/…" (relativas a v1). */
const ruta = (p: string) => (p.startsWith('/') ? p : `/${p}`);

export default function Hero() {
  // Solo rotan los que ya tienen foto: un respaldo con emoji desentona
  // al lado de una foto real. En cuanto un producto reciba su `img`
  // entra solo, sin tocar código.
  const conFoto = productos.filter((p) => p.img || p.video);
  const pool = conFoto.length ? conFoto : productos;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return (
    <section id="inicio" className="hero">
      <div
        id="hero-media"
        className={`hero-media${!pick.img && !pick.video ? ' hero-media--fallback' : ''}`}
        role="img"
        aria-label={pick.title}
      >
        {pick.video ? (
          <>
            <video
              className="hero-photo"
              autoPlay
              muted
              loop
              playsInline
              poster={pick.img ? ruta(pick.img) : undefined}
              src={ruta(pick.video)}
            />
            <span className="hero-video-pill">Video en loop</span>
          </>
        ) : pick.img ? (
          <picture>
            {/* Móvil EN VERTICAL: foto compuesta donde el plato entra
                completo. La condición de orientación importa — sin ella,
                un móvil en horizontal cargaría la vertical. */}
            {pick.imgTall && (
              <source
                media="(max-width: 900px) and (orientation: portrait)"
                srcSet={ruta(pick.imgTall)}
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hero-photo"
              src={ruta(pick.img)}
              srcSet={pick.img4k ? `${ruta(pick.img)} 1920w, ${ruta(pick.img4k)} 3840w` : undefined}
              /* Los vw van muy por encima de 100 a propósito: con
                 object-fit cover, una foto 21:9 dentro de una pantalla
                 vertical se amplía ~4,7× el ancho del viewport. Con
                 sizes="100vw" el navegador pediría la pequeña y se
                 seguiría viendo borrosa. */
              sizes={pick.img4k ? '(max-width: 900px) 460vw, 160vw' : undefined}
              style={pick.posMobile ? ({ '--hero-pos-x': pick.posMobile } as React.CSSProperties) : undefined}
              alt={pick.title}
              fetchPriority="high"
            />
          </picture>
        ) : (
          <span className="hero-media-emoji" aria-hidden="true">
            {pick.emoji}
          </span>
        )}
      </div>

      <div className="hero-scrim" aria-hidden="true" />

      <div id="hero-content" className="hero-content">
        <p className="hero-tagline">{pick.tagline}</p>
        <h1 className="hero-title">{pick.title}</h1>
        <p className="hero-desc">{pick.desc}</p>
        <div className="hero-actions">
          <span className="hero-price-badge">{pick.price}</span>
          <a href="#menu-catalogo" className="hero-order-btn">
            <span>Ordenar Ahora</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div id="scroll-indicator" className="scroll-indicator" aria-hidden="true">
        <span>Desliza</span>
        <span className="scroll-mouse" />
        <span className="scroll-chevron" />
      </div>

      <EfectoScrollHero />
    </section>
  );
}
