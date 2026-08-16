import type { ProductoMenu } from '@/types/menu';
import { CATEGORIES } from '@/data/menu';

/* =============================================================
 * DATOS ESTRUCTURADOS (JSON-LD)
 *
 * Le dice a Google qué es este sitio: un restaurante, dónde está, a
 * qué hora abre, qué nota tiene y qué vende. Es lo que hace que
 * aparezca la ficha con horario y estrellas en los resultados.
 *
 * ⚠️ El menú se genera desde el MENÚ REAL ya fusionado con Supabase,
 * así que los precios que ve Google son los que el dueño tiene
 * puestos hoy. En v1 lo arma JavaScript después de cargar; los
 * rastreadores que no ejecutan JS no lo veían nunca.
 * ============================================================= */

const SITIO = 'https://el-porton-cajica.vercel.app';

export default function DatosEstructurados({ menu }: { menu: ProductoMenu[] }) {
  const restaurante = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITIO}/#restaurante`,
    name: 'El Portón Cajicá',
    description:
      'Comidas rápidas y pizzería artesanal en Cajicá: hamburguesas con carne de res madurada, perros calientes, mazorcadas, salchipapas y pizzas. Más de 11 años de tradición.',
    url: `${SITIO}/`,
    telephone: '+573138214752',
    image: `${SITIO}/assets/og-image.jpg`,
    logo: `${SITIO}/assets/logo-final.png`,
    priceRange: '$$',
    currenciesAccepted: 'COP',
    paymentAccepted: 'Efectivo, Tarjeta, Transferencia',
    servesCuisine: ['Comida rápida', 'Hamburguesas', 'Pizza', 'Colombiana'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Calle 11 A Sur #10-75, Camino entrada Fagua, sector Canelón',
      addressLocality: 'Cajicá',
      addressRegion: 'Cundinamarca',
      addressCountry: 'CO',
    },
    areaServed: { '@type': 'City', name: 'Cajicá' },
    hasMap: 'https://maps.app.goo.gl/B1Yka6GRnqEvMZ6u6',
    sameAs: ['https://instagram.com/elportoncajica', 'https://maps.app.goo.gl/B1Yka6GRnqEvMZ6u6'],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '13:00',
        closes: '22:00',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.4',
      reviewCount: '236',
      bestRating: '5',
      worstRating: '1',
    },
    acceptsReservations: 'False',
    hasMenu: { '@id': `${SITIO}/#menu` },
  };

  const disponibles = menu.filter((p) => p.available !== false);

  const carta = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${SITIO}/#menu`,
    name: 'Carta de El Portón Cajicá',
    inLanguage: 'es-CO',
    hasMenuSection: CATEGORIES.map((c) => ({
      '@type': 'MenuSection',
      name: c.label,
      hasMenuItem: disponibles
        .filter((p) => p.cat === c.key)
        .map((p) => ({
          '@type': 'MenuItem',
          name: p.name,
          description: p.desc,
          offers: p.options.map((o) => ({
            '@type': 'Offer',
            name: o.label,
            price: String(o.price),
            priceCurrency: 'COP',
          })),
        })),
    })).filter((s) => s.hasMenuItem.length > 0),
  };

  return (
    <>
      {/* `JSON.stringify` escapa lo que haga falta; no se interpola texto
          del menú a mano dentro de la etiqueta. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurante) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(carta) }} />
    </>
  );
}
