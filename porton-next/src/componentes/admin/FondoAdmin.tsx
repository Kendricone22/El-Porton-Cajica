'use client';

/* =============================================================
 * FONDO ANIMADO DEL PANEL
 *
 * Una MALLA de puntos (no partículas sueltas como el sitio público)
 * que ondula como agua avanzando hacia la derecha, y que se aparta del
 * cursor dejando un círculo despejado.
 *
 * Igual que el fondo público, el dibujo se queda imperativo dentro de
 * un `useEffect`: dentro de un <canvas> no hay elementos que React
 * pueda gobernar. Lo que sí se añade es la limpieza de escuchadores,
 * que v1 no tiene.
 * ============================================================= */

import { useEffect, useRef } from 'react';
import { dprEfectivo, esGamaBaja } from '@/lib/particulas';

/* Constantes tal cual las dejó la versión 3 del fondo en v1. */
const DOT = 1.3; // radio de cada punto
const AMP = 11; // amplitud de la ola
const FLOW = 0.6; // velocidad del avance hacia la derecha
const SPX = 0.016;
const SPY = 0.02; // frecuencia espacial de la ola
const GRADX = 0.006;
const GRADY = 0.003; // frecuencia del degradado de color (fijo, no viaja)
const R = 130; // radio de repulsión del cursor
const PUSH = 56; // fuerza máxima de repulsión
const EASE = 0.1; // suavidad del retorno a la ola

type Punto = { hx: number; hy: number; x: number; y: number };

export default function FondoAdmin() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nav = navigator as Navigator & { deviceMemory?: number };
    const gamaBaja = esGamaBaja(nav);
    const dpr = dprEfectivo(window.devicePixelRatio, gamaBaja);
    const GAP = gamaBaja ? 24 : 16; // separación de la malla

    let W = 0;
    let H = 0;
    let pts: Punto[] = [];
    let raf: number | null = null;
    const raton = { x: -9999, y: -9999, activo: false };

    function construir() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(W / GAP) + 2;
      const rows = Math.ceil(H / GAP) + 2;
      pts = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hx = (c - 1) * GAP;
          const hy = (r - 1) * GAP;
          pts.push({ hx, hy, x: hx, y: hy });
        }
      }
    }

    function fotograma() {
      // En segundos, para que la velocidad no dependa de los FPS.
      const t = performance.now() / 1000;
      const flujo = t * FLOW;
      ctx!.clearRect(0, 0, W, H);

      for (const p of pts) {
        /* Ola que VIAJA hacia la derecha: se resta `flujo` a la fase
           espacial en x, así las crestas se desplazan en +x con el
           tiempo, como la superficie del agua. Los vecinos se mueven en
           conjunto, que es lo que lo hace parecer líquido y no ruido. */
        const wobY =
          Math.sin(p.hx * SPX - flujo) * AMP +
          Math.sin(p.hx * SPX * 0.5 + p.hy * SPY - flujo * 0.7) * (AMP * 0.5);
        const wobX = Math.cos(p.hy * SPY - flujo * 0.6) * (AMP * 0.5);

        let tx = p.hx + wobX;
        let ty = p.hy + wobY;

        if (raton.activo) {
          const dx = tx - raton.x;
          const dy = ty - raton.y;
          const d = Math.hypot(dx, dy);
          if (d < R && d > 0) {
            const f = (R - d) / R;
            const empuje = f * f * PUSH; // f² : el borde apenas se nota, el centro despeja
            tx += (dx / d) * empuje;
            ty += (dy / d) * empuje;
          }
        }

        // Retorno suave: al salir el cursor, vuelve a la ola sin saltos.
        p.x += (tx - p.x) * EASE;
        p.y += (ty - p.y) * EASE;

        /* Degradado de color ESPACIAL y fijo (sin término de tiempo): a lo
           ancho de la malla va de gris a rojo de marca y vuelta, en zonas
           amplias. El movimiento que se ve viene SOLO de la ola. */
        const g = 0.5 + 0.5 * Math.sin(p.hx * GRADX + p.hy * GRADY);
        const cr = Math.round(115 + (229 - 115) * g);
        const cg = Math.round(116 + (62 - 116) * g);
        const cb = Math.round(120 + (62 - 120) * g);

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${cr},${cg},${cb},0.5)`;
        ctx!.arc(p.x, p.y, DOT, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(fotograma);
    }

    const arrancar = () => {
      if (!raf) raf = requestAnimationFrame(fotograma);
    };
    const parar = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
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

    let temporizador: ReturnType<typeof setTimeout>;
    const alRedimensionar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(construir, 150);
    };
    const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());

    window.addEventListener('mousemove', alMover, { passive: true });
    window.addEventListener('mouseout', alSalir);
    window.addEventListener('resize', alRedimensionar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    construir();
    arrancar();

    return () => {
      parar();
      clearTimeout(temporizador);
      window.removeEventListener('mousemove', alMover);
      window.removeEventListener('mouseout', alSalir);
      window.removeEventListener('resize', alRedimensionar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, []);

  return <canvas id="admin-bg" ref={ref} aria-hidden="true" />;
}
