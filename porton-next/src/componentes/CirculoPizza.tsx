'use client';

/* =============================================================
 * CÍRCULO DE SABORES DE LA PIZZA
 *
 * En v1 esto se construye concatenando SVG dentro de una cadena de
 * texto y luego se parchea el DOM a mano (`t.textContent = …`,
 * `classList.add('filled')`). Aquí el SVG se describe una vez y se
 * repinta solo cuando cambia el estado.
 *
 * La geometría (sectores, ángulos, rutas) vive en `@/lib/modal`, con
 * sus propias pruebas: se comprueba que los sectores sumen 360° y que
 * 0° esté arriba. Aquí solo se pinta.
 * ============================================================= */

import { centroEtiqueta, rangosPizza, rutaSector } from '@/lib/modal';

const CX = 100;
const CY = 100;
const R = 92;

export default function CirculoPizza({
  cantidad,
  sabores,
  onElegirPorcion,
  onCambiarCantidad,
}: {
  cantidad: number;
  sabores: (string | null)[];
  onElegirPorcion: (i: number) => void;
  onCambiarCantidad: () => void;
}) {
  const sectores = rangosPizza(cantidad);

  return (
    <div className="pizza-circle-wrap">
      <button type="button" className="pizza-change" onClick={onCambiarCantidad}>
        ↺ Cambiar cantidad
      </button>

      <svg viewBox="0 0 200 200" className="pizza-svg">
        {sectores.map(([a0, a1], i) =>
          cantidad === 1 ? (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={R}
              className={`pizza-region${sabores[i] ? ' filled' : ''}`}
              onClick={() => onElegirPorcion(i)}
            />
          ) : (
            <path
              key={i}
              d={rutaSector(CX, CY, R, a0, a1)}
              className={`pizza-region${sabores[i] ? ' filled' : ''}`}
              onClick={() => onElegirPorcion(i)}
            />
          ),
        )}

        {/* El contorno va por encima de los sectores, sin capturar clics. */}
        <circle cx={CX} cy={CY} r={R} className="pizza-outline" pointerEvents="none" />

        {sectores.map(([a0, a1], i) => {
          const [x, y] = centroEtiqueta(CX, CY, R, cantidad, a0, a1);
          const f = sabores[i];
          const texto = !f ? 'Elegir' : f.length > 12 ? f.slice(0, 11) + '…' : f;
          return (
            <text
              key={i}
              x={x.toFixed(0)}
              y={y.toFixed(0)}
              className="pizza-label"
              onClick={() => onElegirPorcion(i)}
            >
              {texto}
            </text>
          );
        })}
      </svg>

      <p className="pizza-hint">Toca cada porción para elegir su sabor</p>
    </div>
  );
}
