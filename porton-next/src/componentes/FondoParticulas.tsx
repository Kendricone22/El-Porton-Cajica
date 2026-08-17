'use client';

/* =============================================================
 * FONDO ANIMADO: partículas y humo
 *
 * Dentro de un <canvas> no hay elementos, hay píxeles: React no aporta
 * nada aquí. Este componente se queda con lo único que no se puede
 * separar —pintar— y toda la física vive en `@/lib/particulas`, que se
 * prueba sin dibujar nada.
 *
 * Hacía falta separarlo por un motivo práctico además del ordinario:
 * `requestAnimationFrame` NO se ejecuta en pestañas de segundo plano,
 * así que la animación es imposible de verificar mirando el lienzo en
 * el entorno de pruebas.
 *
 * Y hay algo que v1 no tiene: LIMPIEZA. Allí los escuchadores de
 * scroll, resize, mousemove y visibilitychange se registran para
 * siempre. En una sola página da igual; en una aplicación con
 * navegación se acumularían uno por visita.
 * ============================================================= */

import { useEffect, useRef } from 'react';
import {
  avanzarHumo,
  avanzarParticula,
  cantidadHumo,
  cantidadParticulas,
  crearHumo,
  crearParticula,
  dprEfectivo,
  esGamaBaja,
  hayQueRegenerar,
  type Humo,
  type Particula,
  type Raton,
} from '@/lib/particulas';

export default function FondoParticulas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const corte = document.getElementById('nosotros'); // desde aquí, sin partículas
    const nav = navigator as Navigator & { deviceMemory?: number };
    const gamaBaja = esGamaBaja(nav);
    const dpr = dprEfectivo(window.devicePixelRatio, gamaBaja);

    let W = 0;
    let H = 0;
    let raf: number | null = null;
    let anchoPrevio = 0;
    let particulas: Particula[] = [];
    let humo: Humo[] = [];
    const raton: Raton = { x: -9999, y: -9999, activo: false };

    function medir() {
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function poblar() {
      particulas = Array.from({ length: cantidadParticulas(W, gamaBaja) }, () => crearParticula(W, H));
      humo = Array.from({ length: cantidadHumo(gamaBaja) }, () => crearHumo(W, H));
    }

    function paso() {
      ctx!.clearRect(0, 0, W, H);

      // Humo primero: queda detrás de las partículas.
      for (const s of humo) {
        avanzarHumo(s, W, H, raton);
        const g = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(${s.gris},${s.gris},${s.gris},${s.alpha})`);
        g.addColorStop(1, `rgba(${s.gris},${s.gris},${s.gris},0)`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      for (const p of particulas) {
        avanzarParticula(p, W, H, raton);
        ctx!.beginPath();
        ctx!.fillStyle = p.roja
          ? `rgba(229,62,62,${p.alpha})`
          : `rgba(${p.gris},${p.gris},${p.gris},${p.alpha})`;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(paso);
    }

    const arrancar = () => {
      if (!raf) raf = requestAnimationFrame(paso);
    };
    const parar = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    function rehacer() {
      const regenerar = hayQueRegenerar(window.innerWidth, anchoPrevio) || !particulas.length;
      medir();
      if (regenerar) {
        anchoPrevio = W;
        poblar();
      }
    }

    /* Corre solo mientras haya fondo visible (antes de Nosotros) y la
       pestaña esté a la vista. Aquí la guarda de `document.hidden` SÍ es
       correcta: llama a parar() directamente y no pasa por el estado de
       React, así que no puede quedarse trabada. */
    const hayFondoVisible = () => !corte || corte.getBoundingClientRect().top > 0;
    const sincronizar = () => {
      if (hayFondoVisible() && !document.hidden) arrancar();
      else parar();
    };

    const alMover = (e: MouseEvent) => {
      raton.x = e.clientX;
      raton.y = e.clientY;
      raton.activo = true;
    };
    const alSalir = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        raton.activo = false;
        raton.x = -9999;
        raton.y = -9999;
      }
    };

    window.addEventListener('mousemove', alMover, { passive: true });
    window.addEventListener('mouseout', alSalir);
    window.addEventListener('resize', rehacer);
    window.addEventListener('scroll', sincronizar, { passive: true });
    window.addEventListener('resize', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);

    rehacer();
    sincronizar();

    return () => {
      parar();
      window.removeEventListener('mousemove', alMover);
      window.removeEventListener('mouseout', alSalir);
      window.removeEventListener('resize', rehacer);
      window.removeEventListener('scroll', sincronizar);
      window.removeEventListener('resize', sincronizar);
      document.removeEventListener('visibilitychange', sincronizar);
    };
  }, []);

  return (
    <div id="page-bg" aria-hidden="true">
      <div className="page-bg-texture" />
      <canvas id="page-particles" ref={ref} />
    </div>
  );
}
