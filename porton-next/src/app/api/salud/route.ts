import { NextResponse } from 'next/server';
import { MENU, ADICIONES, CATEGORIES, COMBO_PRICE, COMBO_DRINKS } from '@/data/menu';

/**
 * Ruta de diagnóstico: GET /api/salud
 *
 * Sirve para comprobar de un vistazo que el menú del código carga bien.
 * Importar `@/data/menu` dispara las validaciones de ese módulo, así que
 * si esta ruta responde 200, significa que los 59 productos pasaron:
 * categorías existentes, todos con opciones y todos los precios válidos.
 *
 * No expone nada sensible: solo conteos y datos que ya son públicos.
 */
export async function GET() {
  const porCategoria = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, MENU.filter((p) => p.cat === c.key).length]),
  );

  return NextResponse.json({
    ok: true,
    productos: MENU.length,
    categorias: CATEGORIES.length,
    adiciones: ADICIONES.length,
    comboPrice: COMBO_PRICE,
    bebidasDeCombo: COMBO_DRINKS.length,
    conFoto: MENU.filter((p) => p.img).length,
    porCategoria,
  });
}
