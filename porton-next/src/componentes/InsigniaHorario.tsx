'use client';

/* =============================================================
 * INSIGNIA "ABIERTO / CERRADO"
 *
 * Fija arriba a la izquierda, siempre visible. Dice si el negocio
 * está atendiendo AHORA con la hora real de Cajicá, y se refresca
 * sola cada minuto sin recargar.
 *
 * ⚠️ NO se pinta en el servidor a propósito. El HTML se genera una vez
 * y se cachea 30 segundos: si la insignia viniera dentro, un visitante
 * podría ver "Abierto" recién servido de la caché cuando el negocio ya
 * cerró. Depende del reloj, así que solo el navegador puede decirlo
 * bien. Por eso arranca oculta y aparece al montarse.
 * ============================================================= */

import { useEffect, useState } from 'react';
import { estadoEn, type EstadoNegocio } from '@/lib/horario';

export default function InsigniaHorario() {
  const [estado, setEstado] = useState<EstadoNegocio | null>(null);

  useEffect(() => {
    const refrescar = () => setEstado(estadoEn());
    refrescar();
    const id = setInterval(refrescar, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!estado) return null;

  return (
    <div
      id="estado-negocio"
      className={`estado-flotante ${estado.abierto ? 'estado-on' : 'estado-off'}`}
      role="status"
    >
      <i className="estado-dot" aria-hidden="true" />
      <b>{estado.abierto ? 'Abierto' : 'Cerrado'}</b>
      {estado.abierto
        ? estado.cierraA && <span>· cierra {estado.cierraA}</span>
        : estado.proxima && (
            <span>
              · abre {estado.proxima.etiqueta} {estado.proxima.hora}
            </span>
          )}
    </div>
  );
}
