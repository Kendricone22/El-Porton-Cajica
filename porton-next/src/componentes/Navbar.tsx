'use client';

/* =============================================================
 * NAVBAR + MENÚ MÓVIL
 *
 * Es de cliente porque necesita dos cosas del navegador: saber si se
 * ha bajado (para reforzar el fondo) y abrir/cerrar el cajón móvil.
 *
 * Se conservan las mismas clases y el mismo marcado que v1 para que
 * `estilos-v1.css` aplique sin tocar nada, incluida la altura fija
 * `h-36` del contenedor y los puntos de corte de Tailwind.
 * ============================================================= */

import Image from 'next/image';
import { useEffect, useState } from 'react';

const ENLACES = [
  { href: '#inicio', texto: 'Inicio' },
  { href: '#menu-catalogo', texto: 'Menú' },
  { href: '#carta', texto: 'Catálogo' },
  { href: '#nosotros', texto: 'Nosotros' },
  { href: '#contacto', texto: 'Contacto' },
];

export default function Navbar() {
  const [bajado, setBajado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const alBajar = () => setBajado(window.scrollY > 20);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuAbierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAbierto]);

  return (
    <>
      <header id="navbar" className={`fixed top-0 inset-x-0 z-50 transition-all duration-300${bajado ? ' scrolled' : ''}`}>
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-36">
            <a href="#inicio" className="logo-link group shrink-0" aria-label="El Portón Cajicá — Inicio">
              {/* `unoptimized`: es un PNG con transparencia servido a un
                  tamaño fijo por CSS; pasarlo por el optimizador no
                  aporta nada y añade una petición distinta por ancho. */}
              <Image
                src="/assets/logo-final.png"
                alt="El Portón Cajicá"
                className="logo-img"
                width={720}
                height={287}
                priority
                unoptimized
              />
            </a>

            <div className="hidden lg:flex items-center gap-9">
              {ENLACES.map((e) => (
                <a key={e.href} href={e.href} className="nav-link">
                  {e.texto}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <a href="#menu-catalogo" className="cta-btn cta-btn--full">
                <span aria-hidden="true">🛒</span>
                <span>Ver el Menú / Armar Pedido</span>
              </a>
              <a href="#menu-catalogo" className="cta-btn cta-btn--compact" aria-label="Ver el menú y armar pedido">
                <span aria-hidden="true">🛒</span>
              </a>

              <button
                id="menu-toggle"
                type="button"
                className={`hamburger${menuAbierto ? ' open' : ''}`}
                aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={menuAbierto}
                aria-controls="mobile-drawer"
                onClick={() => setMenuAbierto((v) => !v)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <div
        id="mobile-overlay"
        className={`lg:hidden${menuAbierto ? ' open' : ''}`}
        onClick={() => setMenuAbierto(false)}
      />

      <aside
        id="mobile-drawer"
        className={`lg:hidden${menuAbierto ? ' open' : ''}`}
        aria-label="Menú de navegación móvil"
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-white/5">
          <span className="font-serif-vintage italic text-xl text-[#F5E9D6]">El Portón</span>
          <button
            id="menu-close"
            type="button"
            className="text-2xl text-zinc-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col px-6 py-8 gap-1">
          {ENLACES.map((e) => (
            <a key={e.href} href={e.href} className="drawer-link" onClick={() => setMenuAbierto(false)}>
              {e.texto}
            </a>
          ))}

          <a href="#menu-catalogo" className="cta-btn mt-6 justify-center" onClick={() => setMenuAbierto(false)}>
            <span aria-hidden="true">🛒</span>
            <span>Armar Pedido</span>
          </a>
        </nav>
      </aside>
    </>
  );
}
