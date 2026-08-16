'use client';

/* =============================================================
 * ANIMACIÓN DE ENTRADA AL BAJAR
 *
 * Añade la clase `in-view` a todo lo que lleve `reveal` cuando entra
 * en el 85% inferior de la pantalla. El CSS de v1 hace el resto.
 *
 * ⚠️ POR QUÉ NO SE USA IntersectionObserver, que sería lo idiomático:
 * está documentado en este proyecto que en el entorno de vista previa
 * sus llamadas NO se disparan de forma fiable, así que una animación
 * basada en él es imposible de verificar aquí. El manejador de scroll
 * directo funciona en todas partes y cuesta lo mismo — `passive: true`
 * le dice al navegador que no vamos a bloquear el desplazamiento.
 *
 * Se comprueba también al montar, para lo que ya esté visible al
 * cargar sin haber movido la página.
 * ============================================================= */

import { useEffect } from 'react';

export default function RevelarAlScroll() {
  useEffect(() => {
    const revisar = () => {
      const alto = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>('.reveal:not(.in-view)')) {
        const r = el.getBoundingClientRect();
        if (r.top < alto * 0.85 && r.bottom > 0) el.classList.add('in-view');
      }
    };

    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    return () => {
      window.removeEventListener('scroll', revisar);
      window.removeEventListener('resize', revisar);
    };
  }, []);

  return null;
}
