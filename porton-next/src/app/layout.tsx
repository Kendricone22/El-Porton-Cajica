import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, Playfair_Display } from 'next/font/google';
import { ProveedorCarrito } from '@/estado/carrito';
import './globals.css';
import './estilos-v1.css';

/* =============================================================
 * FUENTES
 *
 * En el sitio v1 se cargan con un <link> a fonts.googleapis.com.
 * `next/font/google` las descarga EN EL BUILD y las sirve desde tu
 * propio dominio. Tres ventajas reales:
 *
 *   · Una petición externa menos en el camino crítico del primer
 *     pintado (el <link> de Google es render-blocking).
 *   · Sin salto de maquetación: Next calcula las métricas de la
 *     fuente y genera un respaldo del sistema con el mismo tamaño.
 *   · El navegador del cliente deja de hablar con Google.
 *
 * Cada una expone una variable CSS, y `estilos-v1.css` las usa
 * (se sustituyeron los 24 `font-family: 'Bebas Neue'…` literales).
 * ============================================================= */

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

const SITIO = 'https://el-porton-cajica.vercel.app';
const TITULO = 'El Portón Cajicá — Comidas Rápidas & Pizzería Artesanal';
const DESCRIPCION =
  'El Portón Cajicá: hamburguesas, perros, mazorcadas, salchipapas y pizzas artesanales. Pide fácil y rápido por WhatsApp.';

/* =============================================================
 * METADATOS
 *
 * Lo mismo que hoy hay a mano en el <head> de index.html, pero
 * declarado como datos. Next genera las etiquetas y así no se puede
 * olvidar cerrar una ni escribir mal un atributo.
 * ============================================================= */
export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/assets/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/assets/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: SITIO,
    siteName: 'El Portón Cajicá',
    title: TITULO,
    description: DESCRIPCION,
    images: [{ url: '/assets/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description:
      'Hamburguesas, perros, mazorcadas, salchipapas y pizzas artesanales. Pide fácil y rápido por WhatsApp.',
    images: ['/assets/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${bebas.variable} ${playfair.variable} ${inter.variable} antialiased`}
    >
      {/* El proveedor envuelve toda la aplicación: el carrito debe
          sobrevivir a la navegación entre páginas, así que va aquí y
          no dentro de una página concreta. */}
      <body>
        <ProveedorCarrito>{children}</ProveedorCarrito>
      </body>
    </html>
  );
}
