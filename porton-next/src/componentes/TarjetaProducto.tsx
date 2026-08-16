import Image from 'next/image';
import type { ProductoMenu } from '@/types/menu';
import { esPersonalizable, precioDesde, tieneVariosPrecios } from '@/lib/catalogo';

/* =============================================================
 * TARJETA DE PRODUCTO
 *
 * No lleva 'use client': es un componente de SERVIDOR. No tiene
 * estado ni escucha eventos — solo pinta. El único trozo interactivo
 * es el botón, y ese se recibe como prop desde el catálogo, que sí
 * es cliente.
 *
 * Las clases CSS son las mismas del sitio v1 (`cat-card`, …) para que
 * `estilos-v1.css` se aplique sin tocar nada.
 * ============================================================= */

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

export default function TarjetaProducto({
  producto,
  retraso,
  boton,
}: {
  producto: ProductoMenu;
  retraso?: string;
  /** El botón lo inyecta quien la usa, porque necesita interactividad. */
  boton?: React.ReactNode;
}) {
  const p = producto;

  return (
    <article className="cat-card cat-card--in" data-cat={p.cat} style={{ animationDelay: retraso }}>
      <div className="cat-card-media">
        {p.badge && <span className="cat-card-badge">{p.badge}</span>}
        {p.img ? (
          /* `fill` en vez de width/height fijos: las fotos de los platos
             son verticales (1100×1467) y el marco de la tarjeta es 5:4.
             Declarar unas medidas inventadas le daría a Next una relación
             de aspecto falsa para reservar el hueco. Con `fill` la imagen
             se estira al contenedor —que ya es `position: relative` en
             estilos-v1.css— y manda el `object-fit: cover` del CSS. */
          <Image
            className="cat-card-img"
            data-menu-id={p.id}
            src={p.img.startsWith('/') ? p.img : `/${p.img}`}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
          />
        ) : (
          <span className="cat-card-emoji">{p.emoji}</span>
        )}
      </div>

      <div className="cat-card-body">
        <h3 className="cat-card-title">{p.name}</h3>
        <p className="cat-card-desc">{p.desc}</p>
        <div className="cat-card-foot">
          <span className="cat-card-price">
            {tieneVariosPrecios(p) && <small>Desde</small>}
            {fmt(precioDesde(p))}
          </span>
          {boton}
        </div>
      </div>
    </article>
  );
}

/** Texto del botón, expuesto para que el catálogo no repita la regla. */
export const textoBoton = (p: ProductoMenu) => (esPersonalizable(p) ? 'Personalizar' : 'Agregar');
