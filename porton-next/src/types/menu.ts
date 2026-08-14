/* =============================================================
 * TIPOS DEL MENÚ — El Portón Cajicá
 *
 * IMPORTANTE: estos tipos NO están inventados. Se derivaron
 * analizando los 59 productos reales de js/data.js y contando
 * en cuántos aparece cada clave:
 *
 *   id, cat, combo, emoji, name, desc, options .... 59/59  -> obligatorias
 *   img ........................................... 24/59  -> opcional
 *   badge .......................................... 4/59  -> opcional
 *   choices, pizza, maxFlavors ..................... 3/59  -> opcional
 *   proteins, chooseProteins, slices ............... 2/59  -> opcional
 *
 * Si algún día el tipo y los datos dejan de coincidir,
 * TypeScript avisa al compilar en vez de fallar en producción.
 * ============================================================= */

/** Las 7 categorías del catálogo (campo `key` de CATEGORIES). */
export type CategoriaId =
  | 'hamburguesas'
  | 'perros'
  | 'mazorcadas'
  | 'salchipapas'
  | 'pizzas'
  | 'infantil'
  | 'bebidas';

/**
 * Una opción de precio del producto (tamaño, proteína, porción…).
 * Es la ÚNICA fuente del precio base: todo producto tiene al menos una
 * (verificado: mínimo 1, máximo 5, ninguno sin `options`).
 */
export type Opcion = {
  label: string;
  price: number;
};

/** Selector que NO altera el precio (ej. Jalapeño: Con / Sin). */
export type Choice = {
  title: string;
  options: string[];
};

export type ProductoMenu = {
  id: string;
  cat: CategoriaId;
  name: string;
  desc: string;
  /** Si admite el combo de +COMBO_PRICE (solo hamburguesas y perros). */
  combo: boolean;
  emoji: string;
  options: Opcion[];

  img?: string;
  badge?: string;

  /** Pizzas: activa el círculo de sabores. */
  pizza?: boolean;
  maxFlavors?: number;
  /** Trozos (x8 / x10 / x12…). No cambia el precio. */
  slices?: string[];

  /** Mazorcadas: proteínas elegibles. */
  proteins?: string[];
  chooseProteins?: number;

  choices?: Choice[];

  /**
   * OJO: esta clave NO existe en el menú del código — solo la añade
   * Supabase cuando el dueño marca un plato como agotado desde el panel.
   * Por eso es opcional y por eso la regla en todo el código es
   * `available !== false` (ausente = disponible).
   */
  available?: boolean;
};

/** Adición cobrable. `cats` limita a qué categorías aplica. */
export type Adicion = {
  name: string;
  price: number;
  cats: CategoriaId[];
};

export type Categoria = {
  key: CategoriaId;
  label: string;
  emoji: string;
};
