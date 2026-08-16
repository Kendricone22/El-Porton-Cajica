import Image from 'next/image';
import { MENU, CATEGORIES, BRAND } from '@/data/menu';

/* =============================================================
 * PÁGINA TEMPORAL DE COMPROBACIÓN
 *
 * No es la página final. Existe para verificar que la base de la
 * migración está bien montada antes de portar un solo componente:
 * fuentes auto-alojadas, hoja de estilos v1, variables de marca,
 * assets servidos y los datos del menú accesibles.
 *
 * La sustituirá la portada real (navbar → hero → carta → catálogo…).
 * ============================================================= */

export default function Comprobacion() {
  const marca = BRAND as { whatsapp?: string };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Image
        src="/assets/logo-final.png"
        alt="El Portón Cajicá"
        width={360}
        height={144}
        priority
        className="mb-10"
      />

      <h1 className="font-display" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
        BASE DE LA MIGRACIÓN
      </h1>

      <p className="font-serif-vintage" style={{ color: 'var(--crema)', fontSize: '1.35rem' }}>
        Playfair Display — la fuente de los rótulos
      </p>

      <p style={{ color: 'var(--gris)', marginTop: '0.5rem' }}>
        Inter — el texto corrido del sitio. Si las tres se ven distintas, next/font está
        sirviendo las fuentes desde tu propio dominio.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        {(['--negro', '--rojo', '--rojo-dark', '--gris', '--crema', '--oro'] as const).map((v) => (
          <div key={v} className="text-center">
            <div
              style={{
                background: `var(${v})`,
                width: 88,
                height: 56,
                borderRadius: 8,
                border: '1px solid #27272a',
              }}
            />
            <small style={{ color: '#71717a', fontSize: '.7rem' }}>{v}</small>
          </div>
        ))}
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        <Dato etiqueta="Productos en el menú" valor={String(MENU.length)} />
        <Dato etiqueta="Categorías" valor={String(CATEGORIES.length)} />
        <Dato etiqueta="Con foto" valor={String(MENU.filter((p) => p.img).length)} />
        <Dato etiqueta="WhatsApp" valor={marca.whatsapp ?? '—'} />
      </dl>

      <p className="mt-12" style={{ color: '#52525b', fontSize: '.85rem' }}>
        Endpoints activos: <code>/api/salud</code> · <code>/api/pedidos</code>
      </p>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt style={{ color: '#71717a', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {etiqueta}
      </dt>
      <dd className="font-display" style={{ color: 'var(--rojo)', fontSize: '2rem', lineHeight: 1.1 }}>
        {valor}
      </dd>
    </div>
  );
}
