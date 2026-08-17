'use client';

/* =============================================================
 * BOTÓN DE EXPORTAR VENTAS A CSV
 *
 * ⚠️ Se traen TODOS los pedidos, por páginas, en vez de exportar lo
 * que haya cargado la pestaña de Pedidos. v1 exporta `lastOrders`, que
 * es lo último que se pidió; con la paginación que añadimos eso serían
 * solo los 50 visibles, y el archivo saldría incompleto sin avisar.
 * ============================================================= */

import { useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { CATEGORIES } from '@/data/menu';
import { aCSV, descargarCSV, nombreArchivo, pedidosAFilas } from '@/lib/csv';
import type { Pedido } from '@/lib/pedidos-admin';

const POR_PAGINA = 1000;
/** Tope de seguridad: 50.000 pedidos son años de operación. */
const MAX_PAGINAS = 50;

const etiquetaCategoria = (clave: string) =>
  CATEGORIES.find((c) => c.key === clave)?.label ?? clave;

export default function ExportarCSV() {
  const sb = supabaseNavegador();
  const [estado, setEstado] = useState<'listo' | 'trabajando'>('listo');
  const [aviso, setAviso] = useState<string | null>(null);

  async function exportar() {
    setEstado('trabajando');
    setAviso(null);

    const todos: Pedido[] = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const desde = pagina * POR_PAGINA;
      const { data, error } = await sb
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(desde, desde + POR_PAGINA - 1);

      if (error) {
        setEstado('listo');
        setAviso('No se pudieron leer los pedidos: ' + error.message);
        return;
      }
      const lote = (data ?? []) as Pedido[];
      todos.push(...lote);
      if (lote.length < POR_PAGINA) break; // ya no hay más
    }

    const filas = pedidosAFilas(todos, etiquetaCategoria);
    setEstado('listo');

    // filas[0] es la cabecera: si no hay ninguna más, no hay nada que exportar.
    if (filas.length <= 1) {
      setAviso('No hay ventas para exportar todavía (o todos los pedidos están cancelados).');
      return;
    }

    descargarCSV(nombreArchivo(), aCSV(filas));
    setAviso(`Exportadas ${filas.length - 1} líneas de venta de ${todos.length} pedidos.`);
  }

  return (
    <>
      {/* Mismas clases que v1: `btn-primary mi-add`. */}
      <button
        type="button"
        className="btn-primary mi-add"
        onClick={() => void exportar()}
        disabled={estado === 'trabajando'}
      >
        {estado === 'trabajando' ? 'Preparando…' : '⬇️ Exportar CSV'}
      </button>
      {aviso && <p className="vt-sub">{aviso}</p>}
    </>
  );
}
