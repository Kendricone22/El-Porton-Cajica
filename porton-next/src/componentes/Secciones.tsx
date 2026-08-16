import { TESTIMONIOS } from '@/data/menu';
import type { Testimonio } from '@/types/menu';

/* =============================================================
 * SECCIONES DE CONTENIDO
 *
 * Todas son componentes de SERVIDOR: no tienen estado ni escuchan
 * eventos, solo pintan. Van juntas en un archivo porque son texto
 * fijo — separarlas en seis ficheros de veinte líneas solo añadiría
 * ruido.
 *
 * ⚠️ Los textos son VERBATIM del sitio v1. Es copy comercial escrito
 * por el cliente: no se reescribe ni se "mejora" durante una
 * migración.
 * ============================================================= */

/* ---------- encabezado reutilizable de sección ---------- */
export function EncabezadoCarta({
  eyebrow,
  titulo,
  sub,
  id,
}: {
  eyebrow: string;
  titulo: string;
  sub?: string;
  id?: string;
}) {
  return (
    <section id={id} className="carta-header reveal">
      <p className="carta-eyebrow">{eyebrow}</p>
      <h2 className="carta-title">{titulo}</h2>
      {sub && <p className="carta-sub">{sub}</p>}
    </section>
  );
}

/* ---------- cómo pedir (3 pasos) ---------- */
const PASOS = [
  {
    titulo: 'Elige tus platos',
    texto: 'Explora la carta por categorías y encuentra tu antojo con foto, descripción y precio.',
    icono: <path d="M3 6h18M3 12h18M3 18h18" />,
  },
  {
    titulo: 'Personalízalo a tu gusto',
    texto: 'Proteína, combo, adiciones, sabores de pizza… armas tu pedido exactamente como lo quieres.',
    icono: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
  {
    titulo: 'Recibe en tu puerta',
    texto: 'Tu pedido llega armado a WhatsApp: solo lo confirmas y nosotros nos encargamos del resto.',
    icono: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  },
];

export function ComoPedir() {
  return (
    <section className="como-pedir reveal" aria-label="Cómo pedir">
      <div className="como-pedir-grid">
        {PASOS.map((p, i) => (
          <div className="paso-card" key={p.titulo}>
            <span className="paso-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="paso-icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {p.icono}
              </svg>
            </span>
            <h3 className="paso-title">{p.titulo}</h3>
            <p className="paso-text">{p.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- testimonios ---------- */
export function Testimonios() {
  const data = TESTIMONIOS as Testimonio[];
  if (!data.length) return null;

  return (
    <section id="testimonios" className="testimonios reveal" aria-label="Lo que dicen nuestros clientes">
      <div className="carta-header" style={{ padding: '0 0 0.5rem' }}>
        <p className="carta-eyebrow">Clientes felices</p>
        <h2 className="carta-title">Ellos ya cayeron en el antojo</h2>
      </div>

      <a
        className="google-rating"
        href="https://www.google.com/search?q=El+Port%C3%B3n+Cajic%C3%A1"
        target="_blank"
        rel="noopener"
        aria-label="4.4 estrellas en Google con 236 reseñas"
      >
        <span className="google-rating-score">4.4</span>
        {/* Dos filas de 5 estrellas superpuestas, la de arriba recortada
            al 88% (4,4 de 5). Recortar un solo glifo ★ no funciona: las
            métricas de la fuente no lo parten por la mitad exacta. */}
        <span className="google-rating-stars" aria-hidden="true">
          <span className="stars-base">★★★★★</span>
          <span className="stars-fill" style={{ width: '88%' }}>
            ★★★★★
          </span>
        </span>
        <span className="google-rating-count">en Google · 236 reseñas</span>
      </a>

      <div className="testimonios-grid">
        {data.map((t) => (
          <article className="testimonio-card" key={t.name}>
            <div className="testimonio-stars" aria-label={`${t.stars} de 5 estrellas`}>
              {'★'.repeat(t.stars)}
              {'☆'.repeat(5 - t.stars)}
            </div>
            <p className="testimonio-text">{t.text}</p>
            <div className="testimonio-who">
              <span className="testimonio-avatar" aria-hidden="true">
                {t.name.trim().charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="testimonio-name">{t.name}</div>
                <div className="testimonio-src">{t.source ?? ''}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- nosotros ---------- */
export function Nosotros() {
  return (
    <section id="nosotros" className="about reveal">
      <p className="about-eyebrow">Nuestra historia</p>
      <h2 className="about-title">Más de 11 años forjando el verdadero sabor de Cajicá</h2>

      <div className="about-text">
        <p>
          Hace más de una década encendimos la plancha con una sola convicción: llevarle a Cajicá unas comidas
          rápidas como nunca antes las había probado. Lo que empezó como una obsesión por el buen sabor se
          convirtió, plato a plato, en un <strong>punto de referencia obligado</strong> para los paladares más
          exigentes de la región.
        </p>
        <p>
          Once años no se improvisan. Detrás de cada pedido hay un oficio perfeccionado con el tiempo:{' '}
          <strong>carnes de res maduradas</strong> en su punto, <strong>chorizo 100% de cerdo</strong>,{' '}
          <strong>panes artesanales mega suaves</strong> y nuestra legendaria{' '}
          <strong>salsa de ajo artesanal</strong> —esa que ya nos piden por su nombre—. Aquí no creemos en los
          atajos: creemos en los ingredientes premium y en hacer cada plato como si fuera el primero.
        </p>
        <p>
          Pero El Portón es mucho más que un restaurante. Somos las noches con amigos, el antojo que no te deja en
          paz y el plan que nunca falla. Somos la prueba de que la comida rápida, hecha con pasión e ingredientes de
          alta gama, deja de ser «rápida» para convertirse en una{' '}
          <strong>experiencia que se queda contigo</strong>.
        </p>
      </div>

      <div className="about-stats">
        {[
          { num: '+11', label: 'Años de tradición' },
          { num: '+45', label: 'Platos maestros' },
          { num: '100%', label: 'Artesanal' },
        ].map((s) => (
          <div className="about-stat" key={s.label}>
            <span className="about-stat-num">{s.num}</span>
            <span className="about-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- contacto ---------- */
const IconoUbicacion = (
  <>
    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>
);

export function Contacto() {
  return (
    <section id="contacto" className="contacto reveal">
      <p className="about-eyebrow">Visítanos</p>
      <h2 className="about-title">Tu lugar, tus reglas</h2>

      <div className="contacto-box">
        <div className="contacto-grid">
          <ItemInfo etiqueta="Nuestra casa" icono={IconoUbicacion}>
            Calle 11 A Sur #10-75 · Camino entrada Fagua, sector Canelón.
          </ItemInfo>

          <ItemInfo
            etiqueta="Horarios"
            icono={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            }
          >
            Martes a Domingo · 1:00 PM – 10:00 PM.
            <br />
            Lunes cerrado — abrimos solo en lunes festivos.
          </ItemInfo>

          <ItemInfo
            etiqueta="Domicilios"
            icono={
              <>
                <path d="M22 2 11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </>
            }
          >
            Pídelo por WhatsApp hasta las <strong style={{ color: '#fff' }}>9:40 PM</strong>.
          </ItemInfo>

          <ItemInfo
            etiqueta="Instagram"
            icono={
              <>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </>
            }
          >
            <a href="https://instagram.com/elportoncajica" target="_blank" rel="noopener">
              @elportoncajica
            </a>
          </ItemInfo>
        </div>

        <div className="contacto-actions">
          <a
            className="contacto-btn"
            href="https://maps.app.goo.gl/B1Yka6GRnqEvMZ6u6"
            target="_blank"
            rel="noopener"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {IconoUbicacion}
            </svg>
            Cómo llegar
          </a>
          <a
            className="contacto-btn contacto-btn--ghost"
            href="https://instagram.com/elportoncajica"
            target="_blank"
            rel="noopener"
          >
            Síguenos @elportoncajica
          </a>
        </div>
      </div>
    </section>
  );
}

function ItemInfo({
  etiqueta,
  icono,
  children,
}: {
  etiqueta: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="info-item">
      <svg
        className="info-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icono}
      </svg>
      <div className="info-text">
        <span className="info-label">{etiqueta}</span>
        <span className="info-value">{children}</span>
      </div>
    </div>
  );
}

/* ---------- pie ---------- */
export function PieDePagina() {
  // El año se calcula en el servidor, en cada regeneración. En v1 lo
  // rellena JavaScript, así que en el HTML quedaba fijo a 2026.
  const anio = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p className="site-footer-logo">El Portón Cajicá</p>
      <p className="site-footer-tag">Comidas Rápidas &amp; Pizzería Artesanal · Cajicá, Cundinamarca</p>
      <p className="site-footer-copy">
        © {anio} El Portón Cajicá. Hecho con 🔥 y mucho sabor.
        <br />
        Síguenos en{' '}
        <a href="https://instagram.com/elportoncajica" target="_blank" rel="noopener">
          @elportoncajica
        </a>
      </p>
    </footer>
  );
}
