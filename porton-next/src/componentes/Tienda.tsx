'use client';

/* =============================================================
 * TIENDA — une el catálogo con el modal
 *
 * Hace falta porque la portada es un componente de SERVIDOR y no
 * puede guardar estado: alguien tiene que recordar qué producto está
 * abierto. Este envoltorio es lo mínimo que tiene que ser de cliente.
 *
 * En v1 esta unión es una variable global: el catálogo llama a
 * `window.openProductModal(id)`, que el modal deja colgada del objeto
 * `window`. Funciona, pero nada dice que exista ni qué recibe. Aquí es
 * una prop, y si cambia la forma, TypeScript avisa.
 * ============================================================= */

import { useState } from 'react';
import type { Categoria, ProductoMenu } from '@/types/menu';
import Carrito from './Carrito';
import Catalogo from './Catalogo';
import ModalProducto from './ModalProducto';

export default function Tienda({
  menu,
  categorias,
}: {
  menu: ProductoMenu[];
  categorias: Categoria[];
}) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const abierto = abiertoId ? (menu.find((p) => p.id === abiertoId) ?? null) : null;

  return (
    <>
      <Catalogo menu={menu} categorias={categorias} onPersonalizar={setAbiertoId} />
      <ModalProducto item={abierto} onCerrar={() => setAbiertoId(null)} />
      <Carrito />
    </>
  );
}
