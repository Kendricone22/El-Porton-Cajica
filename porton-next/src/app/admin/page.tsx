'use client';

/* =============================================================
 * PANEL ADMINISTRATIVO
 *
 * Todo el panel es de cliente, y aquí sí es lo correcto: está detrás
 * de un inicio de sesión, no lo indexa nadie y es interacción de
 * principio a fin. Es justo lo contrario de la página pública.
 *
 * ⚠️ Lo que llega al navegador SIN sesión es un formulario y nada más:
 * los datos se piden después de autenticarse, y quien los protege son
 * las políticas RLS de la base — no el hecho de esconder la pantalla.
 * ============================================================= */

import { useState } from 'react';
import { useSesionAdmin } from '@/estado/sesion-admin';
import { Login, RetoMFA } from '@/componentes/admin/Acceso';
import Pedidos from '@/componentes/admin/Pedidos';
import Analitica from '@/componentes/admin/Analitica';
import FondoAdmin from '@/componentes/admin/FondoAdmin';

export default function PanelAdmin() {
  const { estado, correo, factorId, error, revisar, salir } = useSesionAdmin();
  const [pestana, setPestana] = useState<'pedidos' | 'analitica' | 'menu'>('pedidos');
  /* Cambiar este número hace que las pestañas vuelvan a pedir sus datos.
     Es más simple que pasar una función de recarga a cada una. */
  const [recargarToken, setRecargar] = useState(0);

  /* El fondo va en TODAS las pantallas, incluida la de acceso: en v1 el
     canvas está fuera de las vistas y se ve siempre. */
  if (estado === 'cargando') {
    return (
      <>
        <FondoAdmin />
        <div id="login-view" className="admin-login">
          <p className="loading">Cargando…</p>
        </div>
      </>
    );
  }

  if (estado === 'fuera') {
    return (
      <>
        <FondoAdmin />
        <Login alEntrar={revisar} avisoPrevio={error} />
      </>
    );
  }

  if (estado === 'mfa' && factorId) {
    return (
      <>
        <FondoAdmin />
        <RetoMFA factorId={factorId} alVerificar={revisar} alCancelar={salir} />
      </>
    );
  }

  /* `id="dash-view"`: mismo motivo que en las pantallas de acceso — el
     CSS lo usa para elevar el contenido por encima del lienzo del fondo. */
  return (
    <div id="dash-view">
      <FondoAdmin />

      <header className="admin-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo-final.png" alt="El Portón" />
        <span className="spacer" />
        <button type="button" className="btn-ghost" onClick={() => setRecargar((n) => n + 1)}>
          ↻ Actualizar
        </button>
        <button type="button" className="btn-ghost" onClick={() => void salir()}>
          Salir
        </button>
      </header>

      <div className="admin-wrap">
        <nav className="tabs">
          <button
            type="button"
            className={`tab${pestana === 'pedidos' ? ' active' : ''}`}
            onClick={() => setPestana('pedidos')}
          >
            📦 Pedidos
          </button>
          <button
            type="button"
            className={`tab${pestana === 'analitica' ? ' active' : ''}`}
            onClick={() => setPestana('analitica')}
          >
            📊 Analítica
          </button>
          <button
            type="button"
            className={`tab${pestana === 'menu' ? ' active' : ''}`}
            onClick={() => setPestana('menu')}
          >
            🍔 Menú
          </button>
        </nav>

        {pestana === 'pedidos' && <Pedidos recargarToken={recargarToken} />}
        {pestana === 'analitica' && <Analitica recargarToken={recargarToken} />}

        {pestana === 'menu' && (
          <p className="loading" style={{ marginTop: '2rem' }}>
            Sesión iniciada como <b>{correo}</b>. El editor de menú se porta a continuación.
          </p>
        )}
      </div>
    </div>
  );
}
