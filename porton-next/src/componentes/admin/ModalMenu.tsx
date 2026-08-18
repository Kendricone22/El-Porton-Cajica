'use client';

/* =============================================================
 * MODAL DE CREAR / EDITAR PRODUCTO
 *
 * Marcado copiado de admin.html: mismas clases (`mm-*`) e ids donde el
 * CSS los usa.
 *
 * ⚠️ AL EDITAR SE CONSERVA EL RESTO DEL OBJETO. Un plato guardado puede
 * traer `combo`, `pizza`, `maxFlavors`, `proteins`, `slices`, `choices`
 * o `badge`, y este formulario solo edita nombre, descripción,
 * categoría, emoji, foto, precios y disponibilidad. Si se guardara solo
 * lo del formulario, una pizza perdería su círculo de sabores y una
 * mazorcada sus proteínas — sin aviso.
 * ============================================================= */

import { useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { CATEGORIES } from '@/data/menu';
import type { CategoriaId } from '@/types/menu';
import {
  idDisponible,
  limpiarOpciones,
  problemaConLaFoto,
  queFaltaEnProducto,
  rutaFoto,
  type FilaMenu,
  type OpcionEditable,
} from '@/lib/menu-admin';

export default function ModalMenu({
  fila,
  idsUsados,
  alCerrar,
  alGuardar,
}: {
  /** null = producto nuevo. */
  fila: FilaMenu | null;
  idsUsados: string[];
  alCerrar: () => void;
  alGuardar: (fila: FilaMenu, esNuevo: boolean) => void;
}) {
  const sb = supabaseNavegador();
  const d = fila?.data ?? {};

  const [nombre, setNombre] = useState(d.name ?? '');
  const [desc, setDesc] = useState(d.desc ?? '');
  /* `CategoriaId`, no `string`: si fuera texto libre se podría guardar
     una categoría que no existe y el plato desaparecería de la carta
     sin dar ningún error. */
  const [cat, setCat] = useState<CategoriaId>((fila?.cat as CategoriaId) ?? CATEGORIES[0].key);
  const [emoji, setEmoji] = useState(d.emoji ?? '');
  const [foto, setFoto] = useState<string | null>(d.img ?? null);
  const [opciones, setOpciones] = useState<OpcionEditable[]>(
    d.options?.length ? d.options.map((o) => ({ label: o.label, price: o.price })) : [{ label: 'Porción', price: 0 }],
  );
  const [disponible, setDisponible] = useState(fila ? fila.available : true);

  const [pistaFoto, setPistaFoto] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  async function subirFoto(archivo: File) {
    const problema = problemaConLaFoto(archivo.type, archivo.size);
    if (problema) {
      setPistaFoto(problema);
      return;
    }
    setPistaFoto('Subiendo…');

    const ruta = rutaFoto(fila?.id ?? null, archivo.name);
    const { error } = await sb.storage
      .from('menu-photos')
      .upload(ruta, archivo, { upsert: true, cacheControl: '3600' });

    if (error) {
      const faltaBucket = /not found|bucket/i.test(error.message ?? '');
      setPistaFoto(
        'No se pudo subir: ' + error.message + (faltaBucket ? ' (¿ya corriste db/storage-setup.sql en Supabase?)' : ''),
      );
      return;
    }

    const { data: pub } = sb.storage.from('menu-photos').getPublicUrl(ruta);
    setFoto(pub.publicUrl);
    setPistaFoto('✓ Foto lista');
  }

  async function guardar() {
    const falta = queFaltaEnProducto(nombre, opciones);
    setErrores(falta);
    if (falta.length) return;

    const opts = limpiarOpciones(opciones);
    setGuardando(true);

    if (fila) {
      // Object.assign sobre lo guardado: conserva combo, pizza, proteins…
      const nuevaData = { ...fila.data, name: nombre.trim(), desc: desc.trim(), emoji: emoji.trim(), cat, options: opts, available: disponible, img: foto };
      const { error } = await sb
        .from('menu_items')
        .update({ cat, available: disponible, data: nuevaData, updated_at: new Date().toISOString() })
        .eq('id', fila.id);
      setGuardando(false);
      if (error) {
        setErrores(['No se pudo guardar: ' + error.message]);
        return;
      }
      alGuardar({ ...fila, cat, available: disponible, data: nuevaData }, false);
    } else {
      const id = idDisponible(nombre, idsUsados);
      const data = {
        id,
        cat,
        combo: false,
        emoji: emoji.trim(),
        name: nombre.trim(),
        desc: desc.trim(),
        options: opts,
        available: disponible,
        img: foto,
      };
      const sort_order = 1000 + idsUsados.length;
      const { error } = await sb.from('menu_items').insert({ id, cat, sort_order, available: disponible, data });
      setGuardando(false);
      if (error) {
        setErrores(['No se pudo crear: ' + error.message]);
        return;
      }
      alGuardar({ id, cat, sort_order, available: disponible, data } as FilaMenu, true);
    }
  }

  return (
    <div className="mm-overlay open" onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="mm-card">
        <header className="mm-head">
          <h2>{fila ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" className="mm-close" aria-label="Cerrar" onClick={alCerrar}>
            ✕
          </button>
        </header>

        <div className="mm-body">
          <label className="field">
            <span>Nombre</span>
            <input type="text" placeholder="Ej. Hamburguesa Clásica" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>

          <label className="field">
            <span>Descripción</span>
            <textarea rows={2} placeholder="Ingredientes…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>

          <div className="mm-row2">
            <label className="field">
              <span>Categoría</span>
              <select value={cat} onChange={(e) => setCat(e.target.value as CategoriaId)}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Emoji</span>
              <input type="text" maxLength={4} placeholder="🍔" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            </label>
          </div>

          <div className="field">
            <span>Foto del producto</span>
            <div className="mm-photo-row">
              <div className="mm-photo-preview">
                {foto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={foto} alt="" />
                ) : (
                  <span>Sin foto (se usa el emoji)</span>
                )}
              </div>
              <div className="mm-photo-actions">
                <input
                  type="file"
                  accept="image/*"
                  id="mm-photo-input"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirFoto(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => document.getElementById('mm-photo-input')?.click()}
                >
                  📷 Cambiar foto
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setFoto(null);
                    setPistaFoto('');
                  }}
                >
                  Quitar foto
                </button>
              </div>
            </div>
            <p className="mm-photo-hint">{pistaFoto}</p>
          </div>

          <div className="field">
            <span>Precios / opciones</span>
            <div id="mm-opts">
              {opciones.map((o, i) => (
                <div className="mm-opt-row" key={i}>
                  <input
                    className="mm-opt-label"
                    placeholder="Nombre (ej. Koller)"
                    value={o.label}
                    onChange={(e) =>
                      setOpciones((os) => os.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <input
                    className="mm-opt-price"
                    type="number"
                    min={0}
                    step={500}
                    placeholder="Precio"
                    value={o.price}
                    onChange={(e) =>
                      setOpciones((os) =>
                        os.map((x, k) => (k === i ? { ...x, price: Number(e.target.value) || 0 } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="mi-btn mm-opt-del"
                    aria-label="Quitar opción"
                    onClick={() => setOpciones((os) => os.filter((_, k) => k !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: '.5rem' }}
              onClick={() => setOpciones((os) => [...os, { label: '', price: 0 }])}
            >
              ➕ Agregar opción
            </button>
          </div>

          <label className="mm-toggle">
            <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} />
            <span>Disponible (desmarca para dejarlo agotado)</span>
          </label>

          {errores.length > 0 && (
            <ul className="modal-falta" role="alert">
              {errores.map((e) => (
                <li key={e}>⚠️ {e}</li>
              ))}
            </ul>
          )}
        </div>

        <footer className="mm-foot">
          <button type="button" className="btn-ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
