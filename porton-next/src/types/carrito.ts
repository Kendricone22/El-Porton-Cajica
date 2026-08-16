/* =============================================================
 * TIPOS DEL CARRITO
 *
 * La forma es la MISMA que la del sitio v1 (`cartState` en app.js), y
 * eso es deliberado: se guarda bajo la misma clave de localStorage
 * (`porton_cart`), así que un cliente que tuviera el carrito a medias
 * en la versión vieja lo conserva al pasar a la nueva. Si cambiáramos
 * la forma, esos carritos se perderían el día del cambio.
 * ============================================================= */

export const CLAVE_CARRITO = 'porton_cart';
export const CLAVE_FORMULARIO = 'porton_form';

export type AdicionElegida = {
  name: string;
  price: number;
};

export type ItemCarrito = {
  id: string;
  name: string;
  cat: string;
  emoji?: string;
  img?: string | null;

  /** Etiqueta de la opción elegida (no el precio). */
  option: string;
  combo: boolean;
  drink: string | null;

  proteins: string[];
  /** Sabores de pizza, ya con su porción ("Mitad X", "Cuarto Y"). */
  flavors: string[];
  /** Trozos ("x10"). No afecta al precio. */
  slice: string;
  choices: string[];
  adiciones: AdicionElegida[];
  notes: string;

  /**
   * Precio calculado en el navegador. Sirve para pintar el carrito.
   * NO es el que se cobra: el servidor lo recalcula en /api/pedidos.
   */
  unitPrice: number;
  qty: number;

  /** Identidad de la combinación. Dos líneas iguales se suman. */
  hash: string;
};

/** Datos de despacho que se recuerdan entre pedidos. */
export type DatosFormulario = {
  nombre: string;
  telefono: string;
  direccion: string;
  pago: string;
  cambio: string;
};

export const FORMULARIO_VACIO: DatosFormulario = {
  nombre: '',
  telefono: '',
  direccion: '',
  pago: '',
  cambio: '',
};
