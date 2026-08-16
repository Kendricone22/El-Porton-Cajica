'use client';

/* =============================================================
 * Desvanecido del texto del Hero al bajar, e indicador de scroll.
 *
 * Es lo ÚNICO del Hero que necesita ejecutarse en el navegador, así
 * que va aislado en su propio componente de cliente. El resto —la
 * foto, los titulares— se queda en el servidor y llega dentro del
 * HTML.
 *
 * Este es el patrón que hace valiosa la migración: no "toda la página
 * es cliente" ni "toda es servidor", sino islas de interactividad lo
 * más pequeñas posible.
 * ============================================================= */

import { useEffect } from 'react';

export default function EfectoScrollHero() {
  useEffect(() => {
    const contenido = document.getElementById('hero-content');
    const indicador = document.getElementById('scroll-indicator');
    if (!contenido) return;

    const actualizar = () => {
      const y = window.scrollY;
      contenido.style.opacity = String(Math.max(0, 1 - y / 500));
      if (indicador) {
        indicador.style.opacity = y > 200 ? '0' : '1';
        indicador.style.pointerEvents = y > 200 ? 'none' : 'auto';
      }
    };

    actualizar();
    window.addEventListener('scroll', actualizar, { passive: true });
    return () => window.removeEventListener('scroll', actualizar);
  }, []);

  return null;
}
