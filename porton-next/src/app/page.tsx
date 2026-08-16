import { CATEGORIES } from '@/data/menu';
import { obtenerMenu } from '@/lib/menu-servidor';
import Navbar from '@/componentes/Navbar';
import Hero from '@/componentes/Hero';
import Tienda from '@/componentes/Tienda';

/* =============================================================
 * PORTADA — en construcción
 *
 * Componente de SERVIDOR: hace `await` sobre el menú directamente,
 * sin useEffect ni estados de carga. Cuando el HTML sale hacia el
 * navegador, los productos ya van dentro.
 *
 * Portado hasta ahora: navbar, hero, catálogo, modal y carrito.
 * Falta: vitrina (#carta), cómo pedir, testimonios, nosotros,
 * contacto, pie, lightbox, partículas, insignia de horario y JSON-LD.
 * ============================================================= */

export default async function Portada() {
  const { menu, origen, edadMs } = await obtenerMenu();

  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <section id="menu-catalogo" className="carta-header">
          <h2 className="carta-header-title font-display">CONOCE LA CARTA</h2>
          <p className="carta-header-sub">Cada plato, una historia</p>
        </section>

        <Tienda menu={menu} categorias={CATEGORIES} />
      </main>

      <p style={{ color: '#52525b', fontSize: '.8rem', padding: '3rem 1.5rem 1.5rem', textAlign: 'center' }}>
        menú servido desde <b>{origen}</b>
        {edadMs ? ` (${Math.round(edadMs / 1000)}s)` : ''} · {menu.length} productos
      </p>
    </>
  );
}
