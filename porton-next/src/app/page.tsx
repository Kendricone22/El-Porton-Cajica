import Image from 'next/image';
import { CATEGORIES } from '@/data/menu';
import { obtenerMenu } from '@/lib/menu-servidor';
import Catalogo from '@/componentes/Catalogo';
import BancoDePruebasCarrito from './BancoDePruebasCarrito';

/* =============================================================
 * PORTADA — en construcción
 *
 * Es un COMPONENTE DE SERVIDOR (no lleva 'use client'), así que puede
 * hacer `await` directamente sobre la base de datos. Nada de useEffect
 * ni de estados de carga para traer el menú: cuando el HTML sale hacia
 * el navegador, los productos ya están dentro.
 *
 * ⚠️ ESTO ES UNA MEJORA REAL SOBRE v1, NO UN CAMBIO DE ESTILO:
 * hoy el catálogo lo construye el JavaScript después de cargar la
 * página, así que quien mire el código fuente —o Google, o WhatsApp al
 * generar la vista previa de un enlace— ve un hueco vacío. Aquí los 59
 * productos van en el HTML.
 *
 * Faltan por portar: navbar, hero, vitrina, cómo pedir, testimonios,
 * nosotros, contacto, pie, modal, carrito y lightbox.
 * ============================================================= */

export default async function Portada() {
  const { menu, origen, edadMs } = await obtenerMenu();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Image
        src="/assets/logo-final.png"
        alt="El Portón Cajicá"
        width={300}
        height={120}
        priority
      />

      <section id="menu-catalogo" className="carta-header" style={{ marginTop: '2rem' }}>
        <h2 className="carta-header-title font-display">CONOCE LA CARTA</h2>
        <p className="carta-header-sub">Cada plato, una historia</p>
      </section>

      <Catalogo menu={menu} categorias={CATEGORIES} />

      <BancoDePruebasCarrito />

      <p className="mt-12" style={{ color: '#52525b', fontSize: '.8rem' }}>
        menú servido desde <b>{origen}</b>
        {edadMs ? ` (${Math.round(edadMs / 1000)}s)` : ''} · {menu.length} productos ·{' '}
        <code>/api/salud</code> · <code>/api/pedidos</code>
      </p>
    </main>
  );
}
