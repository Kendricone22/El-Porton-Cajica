'use client';

/* =============================================================
 * LIGHTBOX: la foto en grande con la ficha del plato al lado
 *
 * Se abre al pulsar cualquier foto del catálogo o de la vitrina. La
 * ficha se arma buscando el `data-menu-id` de la foto dentro del MENÚ
 * —nunca por nombre ni por posición—, así que la descripción que se ve
 * es SIEMPRE la de ese plato y no la de otro parecido.
 *
 * ⚠️ El menú llega por prop desde el servidor: ya viene fusionado con
 * las ediciones del panel, así que la ficha muestra la descripción
 * actual y no la del código.
 * ============================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/data/menu';
import type { ProductoMenu } from '@/types/menu';
import { fichaDe, type Ficha } from '@/lib/ficha';

const SELECTOR_FOTOS = '.carta-photo-img, .cat-card-img';

type Abierto = { src: string; alt: string; ficha: Ficha | null };

export default function Lightbox({ menu }: { menu: ProductoMenu[] }) {
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);

  const cerrar = useCallback(() => {
    setAbierto(null);
    focoPrevio.current?.focus?.();
  }, []);

  /* Un solo escuchador en el documento, igual que v1: las tarjetas se
     crean y destruyen al filtrar, así que enganchar el evento a cada
     foto obligaría a re-enganchar en cada cambio de categoría. */
  useEffect(() => {
    const alPulsar = (e: MouseEvent) => {
      const img = (e.target as HTMLElement)?.closest?.(SELECTOR_FOTOS) as HTMLImageElement | null;
      if (!img) return;

      const src = img.currentSrc || img.src;
      if (!src) return;

      const id = img.dataset.menuId;
      const item = id ? menu.find((p) => p.id === id) : undefined;

      focoPrevio.current = document.activeElement as HTMLElement;
      setAbierto({
        src,
        alt: img.alt || '',
        ficha: item ? fichaDe(item, CATEGORIES) : null,
      });
    };

    document.addEventListener('click', alPulsar);
    return () => document.removeEventListener('click', alPulsar);
  }, [menu]);

  /* Escape cierra, y el fondo no se desplaza mientras está abierto. */
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    botonCerrar.current?.focus();
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [abierto, cerrar]);

  if (!abierto) return null;
  const f = abierto.ficha;

  return (
    <div
      id="lightbox"
      className="lightbox open"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-label={abierto.alt || 'Foto del plato'}
      onClick={(e) => e.target === e.currentTarget && cerrar()}
    >
      <button ref={botonCerrar} type="button" className="lightbox-close" aria-label="Cerrar" onClick={cerrar}>
        ✕
      </button>

      <div className="lightbox-panel">
        <div className="lightbox-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="lightbox-img" className="lightbox-img" src={abierto.src} alt={abierto.alt} />
        </div>

        {f && (
          <div id="lightbox-info" className="lightbox-info">
            {f.categoria && (
              <p className="lb-cat">
                {f.categoria.emoji} {f.categoria.label}
              </p>
            )}
            <h3 className="lb-title">{f.nombre}</h3>
            <p className="lb-label">Qué lleva</p>
            <p className="lb-desc">{f.descripcion}</p>
            {f.detalles.length > 0 && <p className="lb-detalles">{f.detalles.join(' ')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
