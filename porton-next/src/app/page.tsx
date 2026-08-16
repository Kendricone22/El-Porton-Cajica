import { CATEGORIES } from '@/data/menu';
import { obtenerMenu } from '@/lib/menu-servidor';
import Navbar from '@/componentes/Navbar';
import Hero from '@/componentes/Hero';
import Vitrina from '@/componentes/Vitrina';
import Tienda from '@/componentes/Tienda';
import RevelarAlScroll from '@/componentes/RevelarAlScroll';
import {
  ComoPedir,
  Contacto,
  EncabezadoCarta,
  Nosotros,
  PieDePagina,
  Testimonios,
} from '@/componentes/Secciones';

/* =============================================================
 * PORTADA
 *
 * Componente de SERVIDOR: hace `await` sobre el menú directamente,
 * sin useEffect ni estados de carga. Cuando el HTML sale hacia el
 * navegador, los productos ya van dentro.
 *
 * El orden de las secciones es el que fijó el cliente y no se toca:
 *   Hero → "Cada plato, una historia" → vitrina → cómo pedir →
 *   "Lo que nos hace únicos" → catálogo → testimonios → nosotros →
 *   contacto → pie.
 *
 * `.page-dark` envuelve nosotros/contacto: es un fondo negro opaco que
 * tapa el lienzo de partículas de ahí hacia abajo.
 *
 * Falta por portar: lightbox con ficha, partículas, insignia de
 * horario y JSON-LD.
 * ============================================================= */

export default async function Portada() {
  const { menu } = await obtenerMenu();

  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <EncabezadoCarta
          eyebrow="Conoce la carta"
          titulo="Cada plato, una historia"
          sub="Ingredientes seleccionados, sazón real, hecho con orgullo colombiano."
        />

        <Vitrina />

        <ComoPedir />

        <EncabezadoCarta
          id="menu-catalogo"
          eyebrow="Nuestra carta"
          titulo="Lo que nos hace únicos"
          sub="Ingredientes artesanales, sazón colombiana auténtica. Cada plato es una experiencia."
        />

        <Tienda menu={menu} categorias={CATEGORIES} />

        <Testimonios />

        <div className="page-dark">
          <Nosotros />
          <Contacto />
        </div>
      </main>

      <PieDePagina />

      <RevelarAlScroll />
    </>
  );
}
