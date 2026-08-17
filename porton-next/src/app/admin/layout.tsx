import type { Metadata } from 'next';
import './estilos-admin.css';

/* =============================================================
 * LAYOUT DEL PANEL
 *
 * La hoja de estilos se importa AQUÍ, no en el layout raíz: así solo
 * se descarga cuando alguien entra a /admin. Un cliente que solo mira
 * la carta no paga esos 213 renglones de CSS.
 * ============================================================= */

export const metadata: Metadata = {
  title: 'Panel · El Portón Cajicá',
  /* Que ningún buscador lo indexe ni lo siga. El panel de v1 depende
     solo de robots.txt, que es una petición que se puede ignorar; esta
     etiqueta es una instrucción directa en la propia página. */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/* `LayoutProps<'/admin'>` en vez de escribir `{ children }` a mano:
   Next 16 genera tipos por ruta y comprueba que cada layout declare la
   suya. Con el tipo escrito a mano no cuadra y falla la compilación. */
export default function LayoutAdmin({ children }: LayoutProps<'/admin'>) {
  return children;
}
