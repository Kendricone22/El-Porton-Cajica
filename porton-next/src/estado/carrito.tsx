'use client';

/* =============================================================
 * EL CARRITO, EN REACT
 *
 * En el sitio v1 el carrito es una variable global (`cartState`) y
 * cada trozo de interfaz que la necesita la lee directamente y se
 * repinta a mano llamando a `renderCart()`. Funciona, pero cualquiera
 * puede modificarla desde cualquier sitio y hay que acordarse de
 * repintar.
 *
 * Aquí el carrito vive en un Context: un único sitio del que cuelga
 * el estado, y React repinta solo lo que dependa de él. Los
 * componentes no lo modifican directamente — piden una acción.
 *
 * ⚠️ LA TRAMPA DE NEXT: el servidor pinta el HTML antes de que exista
 * el navegador, así que allí NO hay localStorage. Si el estado inicial
 * se leyera de localStorage, el HTML del servidor (carrito vacío) y el
 * primer pintado del navegador (carrito con 3 cosas) no coincidirían,
 * y React lanzaría un error de hidratación.
 *
 * Por eso se arranca SIEMPRE vacío y se carga el guardado en un
 * `useEffect`, que solo corre en el navegador. `hidratado` avisa de
 * cuándo ya es fiable, para no enseñar "carrito vacío" un instante a
 * quien sí tiene cosas.
 * ============================================================= */

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CLAVE_CARRITO, type ItemCarrito } from '@/types/carrito';
import { agregar, cambiarCantidad, contar, eliminar, leerCarrito, subtotal } from '@/lib/carrito';

type Accion =
  | { tipo: 'hidratar'; items: ItemCarrito[] }
  | { tipo: 'agregar'; item: ItemCarrito }
  | { tipo: 'cantidad'; hash: string; delta: number }
  | { tipo: 'eliminar'; hash: string }
  | { tipo: 'vaciar' };

/**
 * El reductor es una función pura: (estado, acción) → estado nuevo.
 * Toda la lógica de verdad vive en `@/lib/carrito`, que se prueba por
 * separado; esto solo enruta.
 */
function reductor(items: ItemCarrito[], a: Accion): ItemCarrito[] {
  switch (a.tipo) {
    case 'hidratar':
      return a.items;
    case 'agregar':
      return agregar(items, a.item);
    case 'cantidad':
      return cambiarCantidad(items, a.hash, a.delta);
    case 'eliminar':
      return eliminar(items, a.hash);
    case 'vaciar':
      return [];
  }
}

type ValorCarrito = {
  items: ItemCarrito[];
  subtotal: number;
  unidades: number;
  /** false hasta que se ha leído localStorage. Evita parpadeos. */
  hidratado: boolean;
  agregarItem: (item: ItemCarrito) => void;
  cambiarQty: (hash: string, delta: number) => void;
  quitar: (hash: string) => void;
  vaciar: () => void;
};

const Ctx = createContext<ValorCarrito | null>(null);

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, despachar] = useReducer(reductor, []);
  const [hidratado, setHidratado] = useState(false);

  /* --- 1. Cargar lo guardado (solo en el navegador) --- */
  useEffect(() => {
    try {
      despachar({ tipo: 'hidratar', items: leerCarrito(localStorage.getItem(CLAVE_CARRITO)) });
    } catch {
      // Modo incógnito o almacenamiento bloqueado: se sigue con el
      // carrito vacío en memoria. Preferible a no poder pedir.
    }
    setHidratado(true);
  }, []);

  /* --- 2. Guardar en cada cambio ---
     Se espera a estar hidratado: sin esa guarda, el primer render
     (vacío) sobrescribiría el carrito guardado antes de leerlo. */
  const yaGuardo = useRef(false);
  useEffect(() => {
    if (!hidratado) return;
    // Evita reescribir en el mismo tick en que se hidrató.
    if (!yaGuardo.current) {
      yaGuardo.current = true;
      return;
    }
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
    } catch {
      /* almacenamiento lleno o bloqueado: no es motivo para romper nada */
    }
  }, [items, hidratado]);

  /* --- 3. Sincronía entre pestañas ---
     Si el cliente tiene el sitio abierto dos veces y añade algo en
     una, la otra se entera. El evento `storage` solo lo reciben las
     OTRAS pestañas, nunca la que escribió. */
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key !== CLAVE_CARRITO) return;
      despachar({ tipo: 'hidratar', items: leerCarrito(e.newValue) });
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, []);

  const valor = useMemo<ValorCarrito>(
    () => ({
      items,
      subtotal: subtotal(items),
      unidades: contar(items),
      hidratado,
      agregarItem: (item) => despachar({ tipo: 'agregar', item }),
      cambiarQty: (hash, delta) => despachar({ tipo: 'cantidad', hash, delta }),
      quitar: (hash) => despachar({ tipo: 'eliminar', hash }),
      vaciar: () => despachar({ tipo: 'vaciar' }),
    }),
    [items, hidratado],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/**
 * Acceso al carrito desde cualquier componente.
 * Lanza si se usa fuera del proveedor: es un error de programación y
 * es mucho mejor verlo al instante que depurar por qué el carrito
 * "no hace nada".
 */
export function useCarrito(): ValorCarrito {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCarrito() se usó fuera de <ProveedorCarrito>.');
  return v;
}
