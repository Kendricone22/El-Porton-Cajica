'use client';

/* =============================================================
 * MODAL DE SEGURIDAD — activar / desactivar la verificación en dos
 * pasos (TOTP: Google Authenticator, Authy, 1Password…).
 *
 * Es OPCIONAL y está apagado por defecto: mientras nadie lo active, el
 * inicio de sesión funciona exactamente igual que siempre.
 *
 * ⚠️ NO HAY CÓDIGOS DE RECUPERACIÓN. Si se pierde el teléfono con la
 * app, la única salida es desactivarlo desde el panel de Supabase
 * (Authentication → Users). Es una limitación conocida, heredada de
 * v1, y por eso el aviso está bien visible antes de activarlo.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';

type Estado = 'cargando' | 'activado' | 'apagado' | 'error';

export default function ModalSeguridad({ alCerrar }: { alCerrar: () => void }) {
  const sb = supabaseNavegador();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [factorVerificado, setFactorVerificado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* --- alta en curso --- */
  const [factorNuevo, setFactorNuevo] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const revisar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    setFactorNuevo(null);
    setQr(null);
    setCodigo('');
    setErrorCodigo(null);

    const { data, error: err } = await sb.auth.mfa.listFactors();
    if (err) {
      setError(err.message);
      setEstado('error');
      return;
    }
    const verificados = (data.totp ?? []).filter((f) => f.status === 'verified');
    setFactorVerificado(verificados[0]?.id ?? null);
    setEstado(verificados.length ? 'activado' : 'apagado');
  }, [sb]);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  async function empezarAlta() {
    setTrabajando(true);
    setErrorCodigo(null);

    const { data, error: err } = await sb.auth.mfa.enroll({ factorType: 'totp' });
    setTrabajando(false);

    if (err) {
      setError(err.message);
      setEstado('error');
      return;
    }
    setFactorNuevo(data.id);
    setQr(data.totp.qr_code);
  }

  async function confirmar() {
    if (!factorNuevo) return;
    if (!/^\d{6}$/.test(codigo.trim())) {
      setErrorCodigo('Ingresa los 6 dígitos.');
      return;
    }
    setTrabajando(true);
    const { error: err } = await sb.auth.mfa.challengeAndVerify({ factorId: factorNuevo, code: codigo.trim() });
    setTrabajando(false);

    if (err) {
      setErrorCodigo('Código incorrecto, intenta de nuevo.');
      setCodigo('');
      return;
    }
    await revisar();
  }

  async function desactivar() {
    if (!factorVerificado) return;
    if (!confirm('¿Desactivar la verificación en dos pasos?')) return;

    setTrabajando(true);
    const { error: err } = await sb.auth.mfa.unenroll({ factorId: factorVerificado });
    setTrabajando(false);

    if (err) {
      setError('No se pudo desactivar: ' + err.message);
      setEstado('error');
      return;
    }
    await revisar();
  }

  return (
    <div className="mm-overlay open" onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="mm-card" style={{ maxWidth: '26rem' }}>
        <header className="mm-head">
          <h2>Verificación en dos pasos</h2>
          <button type="button" className="mm-close" aria-label="Cerrar" onClick={alCerrar}>
            ✕
          </button>
        </header>

        <div className="mm-body">
          {estado === 'cargando' && <p className="loading">Cargando…</p>}

          {estado === 'error' && <p className="empty-state">Error: {error}</p>}

          {estado === 'activado' && (
            <>
              <p style={{ color: '#86efac', fontWeight: 600, marginBottom: '1rem' }}>
                ✓ Verificación en dos pasos ACTIVADA
              </p>
              <p className="login-sub" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                Si pierdes acceso a tu app de códigos, tendrás que desactivarla desde el panel de Supabase
                (Authentication → Users) — guarda bien tu app de autenticación.
              </p>
              <button type="button" className="btn-ghost" onClick={() => void desactivar()} disabled={trabajando}>
                {trabajando ? 'Desactivando…' : 'Desactivar 2FA'}
              </button>
            </>
          )}

          {estado === 'apagado' && (
            <>
              <p className="login-sub" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                Agrega un segundo paso al iniciar sesión usando una app como Google Authenticator o Authy.
                Es opcional, pero recomendado.
              </p>

              {!qr && (
                <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => void empezarAlta()} disabled={trabajando}>
                  {trabajando ? 'Generando código…' : 'Activar 2FA'}
                </button>
              )}

              {qr && (
                <div>
                  {/* El QR llega como SVG desde Supabase Auth, que es nuestro
                      propio servidor de sesiones. Va sobre fondo blanco a
                      propósito: sobre negro muchas cámaras no lo leen. */}
                  <div
                    style={{ background: '#fff', padding: '1rem', borderRadius: '.6rem', marginBottom: '1rem', maxWidth: '12rem' }}
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <p className="login-sub" style={{ textAlign: 'left', marginBottom: '.6rem' }}>
                    Escanéalo con tu app y escribe el código de 6 dígitos:
                  </p>
                  <label className="field">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      autoFocus
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && void confirmar()}
                    />
                  </label>
                  <button type="button" className="btn-primary" onClick={() => void confirmar()} disabled={trabajando}>
                    {trabajando ? 'Comprobando…' : 'Confirmar'}
                  </button>
                  {errorCodigo && <p className="login-error">{errorCodigo}</p>}

                  {/* Aviso que v1 no da hasta DESPUÉS de activarlo. */}
                  <p className="login-sub" style={{ textAlign: 'left', marginTop: '1rem' }}>
                    ⚠️ No hay códigos de recuperación: si pierdes el teléfono, la única forma de volver a
                    entrar será desactivarlo desde el panel de Supabase.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
