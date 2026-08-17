'use client';

/* =============================================================
 * PANTALLAS DE ACCESO: inicio de sesión y segundo factor
 *
 * Mismo marcado y mismas clases que admin.html, para que la hoja de
 * estilos extraída aplique sin tocar nada.
 * ============================================================= */

import Image from 'next/image';
import { useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';

/* ---------------------------------------------------------------- */
export function Login({ alEntrar, avisoPrevio }: { alEntrar: () => Promise<void>; avisoPrevio?: string | null }) {
  const sb = supabaseNavegador();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const { error: err } = await sb.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (err) {
      setEnviando(false);
      // No se distingue "correo no existe" de "contraseña incorrecta":
      // decirlo permitiría averiguar qué correos son administradores.
      setError('No pudimos entrar. Revisa el correo y la contraseña.');
      return;
    }

    await alEntrar();
    setEnviando(false);
  }

  /* El `id` NO es decorativo: `estilos-admin.css` usa
     `#login-view, #mfa-view, #dash-view { position:relative; z-index:1 }`
     para elevar el contenido por encima del lienzo del fondo, que es
     `position:fixed; z-index:0`. Sin el id, el fondo taparía el
     formulario. */
  return (
    <div id="login-view" className="admin-login">
      <form className="login-card" onSubmit={entrar}>
        <Image src="/assets/logo-final.png" alt="El Portón" className="login-logo" width={360} height={144} unoptimized />
        <h1 className="login-title">Panel Administrativo</h1>
        <p className="login-sub">Acceso solo para el equipo</p>

        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>

        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="login-error">{error ?? avisoPrevio ?? ''}</p>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function RetoMFA({
  factorId,
  alVerificar,
  alCancelar,
}: {
  factorId: string;
  alVerificar: () => Promise<void>;
  alCancelar: () => Promise<void>;
}) {
  const sb = supabaseNavegador();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(codigo.trim())) {
      setError('Ingresa los 6 dígitos.');
      return;
    }

    setEnviando(true);
    const { error: err } = await sb.auth.mfa.challengeAndVerify({ factorId, code: codigo.trim() });
    setEnviando(false);

    if (err) {
      setError('Código incorrecto, intenta de nuevo.');
      setCodigo('');
      return;
    }
    await alVerificar();
  }

  return (
    <div id="mfa-view" className="admin-login">
      <form className="login-card" onSubmit={verificar}>
        <Image src="/assets/logo-final.png" alt="El Portón" className="login-logo" width={360} height={144} unoptimized />
        <h1 className="login-title">Verificación en dos pasos</h1>
        <p className="login-sub">Ingresa el código de tu app de autenticación</p>

        <label className="field">
          <span>Código (6 dígitos)</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Verificar'}
        </button>

        <p className="login-error">{error ?? ''}</p>

        <p className="login-sub" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={alCancelar}
            style={{ color: '#a1a1aa', background: 'none', border: 0, cursor: 'pointer' }}
          >
            ← Volver a iniciar sesión
          </button>
        </p>
      </form>
    </div>
  );
}
