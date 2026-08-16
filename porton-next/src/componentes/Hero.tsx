import { HERO_PRODUCTS } from '@/data/menu';
import type { ProductoHero } from '@/types/menu';
import CarruselHero from './CarruselHero';
import EfectoScrollHero from './EfectoScrollHero';

/* =============================================================
 * HERO
 *
 * Componente de SERVIDOR: elige qué productos entran y deja que el
 * carrusel (cliente) gestione cuál se ve. Aunque el carrusel lleve
 * 'use client', también se pinta en el servidor, así que la primera
 * foto y el titular van dentro del HTML — que es lo que hace que el
 * hero cargue rápido y que Google y WhatsApp vean algo.
 * ============================================================= */

const productos = HERO_PRODUCTS as ProductoHero[];

export default function Hero() {
  // Solo entran los que ya tienen foto: un respaldo con emoji desentona
  // al lado de fotos reales. Cuando un producto reciba su `img` entra
  // solo en la rotación, sin tocar código.
  const conFoto = productos.filter((p) => p.img);

  return (
    <section id="inicio" className="hero">
      <CarruselHero productos={conFoto} />

      <div id="scroll-indicator" className="scroll-indicator" aria-hidden="true">
        <span>Desliza</span>
        <span className="scroll-mouse" />
        <span className="scroll-chevron" />
      </div>

      <EfectoScrollHero />
    </section>
  );
}
