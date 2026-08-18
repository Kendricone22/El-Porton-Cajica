# Cambio a producción: de la versión v1 a la versión Next

Guía paso a paso para publicar `porton-next/` sin dejar el sitio caído
en ningún momento.

**Regla que gobierna todo el plan:** primero se abre la puerta nueva,
se comprueba que funciona con tráfico real, y **solo entonces** se
cierra la vieja. Nunca al revés.

---

## Antes de empezar

- [ ] `npm test` en `porton-next/` → todo en verde
- [ ] `npm run build` → sin errores
- [ ] Tener a mano la clave `SUPABASE_SERVICE_ROLE_KEY` (Supabase →
      Settings → API Keys → `service_role`). **No pasa por chat: se
      pega directamente en Vercel.**

Durante los pasos 1 a 5 **el sitio actual sigue funcionando igual**.
El primer paso que afecta a los clientes es el 6.

---

## 1. Crear el proyecto en Vercel

En vercel.com → **Add New → Project** → importar el mismo repositorio
`El-Porton-Cajica`.

En la pantalla de configuración, lo único que hay que cambiar:

| Campo | Valor |
|---|---|
| **Root Directory** | `porton-next` |
| Framework Preset | Next.js *(lo detecta solo)* |
| Project Name | por ejemplo `el-porton-cajica-next` |

> ⚠️ **Root Directory es el campo crítico.** Sin él, Vercel intentaría
> desplegar la raíz del repositorio —el sitio v1— y no la versión nueva.

El proyecto viejo se queda **como está**, sirviendo el dominio actual.
Los dos conviven: mismo repositorio, distinta carpeta raíz.

---

## 2. Variables de entorno

En el proyecto **nuevo** → Settings → Environment Variables, añadir las
tres (marcar Production, Preview y Development):

| Nombre | Valor | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wwdfxhtecrdmeswbnqqd.supabase.co` | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la misma que ya está en `js/config.js` | no |
| `SUPABASE_SERVICE_ROLE_KEY` | la de Supabase → API Keys | **sí** |

> Las dos primeras ya son públicas hoy (viajan en el JavaScript del
> sitio). La tercera **no puede salir nunca al navegador**: no lleva el
> prefijo `NEXT_PUBLIC_`, así que Next la mantiene solo en el servidor.

Después de añadirlas hay que **volver a desplegar** (Deployments → … →
Redeploy): las variables no se aplican a despliegues ya hechos.

---

## 3. Probar en la URL de Vercel

Vercel da una dirección tipo `el-porton-cajica-next.vercel.app`. Ahí,
sin tocar el dominio real:

- [ ] La portada carga con el hero, el carrusel y las fotos
- [ ] El catálogo muestra los 59 productos y los filtros funcionan
- [ ] El modal abre, calcula precios y deja añadir al carrito
- [ ] `/api/salud` responde con los conteos del menú
- [ ] `/admin` pide contraseña y **no** enseña ningún dato antes
- [ ] Dentro del panel: Pedidos, Analítica y Menú cargan

---

## 4. Pedido de prueba de punta a punta

En la URL de Vercel, hacer **un pedido real** (con un nombre
reconocible tipo `PRUEBA CAMBIO`) y comprobar:

- [ ] WhatsApp se abre con el mensaje bien formado
- [ ] El pedido aparece en el panel con el importe correcto
- [ ] El importe coincide con lo que decía la pantalla

> Este paso es el que de verdad valida la migración: si el pedido llega
> y el precio cuadra, el circuito completo funciona.

---

## 5. Revisar en el celular

- [ ] El hero se ve completo (usa la foto vertical)
- [ ] El carrusel pasa deslizando con el dedo
- [ ] El carrito y el formulario se usan cómodos
- [ ] El panel se lee bien

---

## 6. Cambiar el dominio  ⬅️ *el punto de no retorno*

En el proyecto **viejo** → Settings → Domains → quitar
`el-porton-cajica.vercel.app`.
En el proyecto **nuevo** → Settings → Domains → añadirlo.

A partir de aquí, los clientes ven la versión nueva.

**Para volver atrás:** deshacer justo esto — quitar el dominio del
nuevo y devolvérselo al viejo. El sitio v1 sigue intacto en la raíz del
repositorio, así que la vuelta es cuestión de minutos.

---

## 7. Otro pedido de prueba, ya en el dominio real

- [ ] Repetir el paso 4 sobre `el-porton-cajica.vercel.app`
- [ ] Confirmar que llega al panel

---

## 8. Cerrar la puerta vieja

**Solo si el paso 7 salió bien.**

Correr `db/revocar-insert-anon.sql` en Supabase → SQL Editor.

Eso le quita a `anon` el permiso de crear pedidos, de modo que la única
forma de registrar uno pase a ser el endpoint que valida los precios.

> ⚠️ **Antes de este paso, el hueco sigue abierto**: cualquiera puede
> insertar un pedido con el precio que quiera usando la clave pública.
> Y si se corre **antes** del paso 7, se dejan de registrar pedidos
> **en silencio** — el cliente ve todo normal y el panel se queda vacío.

---

## 9. Limpieza

- [ ] Borrar los pedidos de prueba desde Supabase → Table Editor
- [ ] Borrar la carpeta `assets/` de la raíz del repositorio (ya no la
      usa nadie; las fotos viven en `porton-next/public/assets`)
- [ ] Borrar `index.html`, `admin.html`, `js/`, `css/`, `robots.txt` y
      `sitemap.xml` de la raíz — **pero solo tras unos días de rodaje**,
      porque son la vuelta atrás del paso 6
- [ ] Regenerar `SUPABASE_SERVICE_ROLE_KEY` en Supabase (la actual pasó
      por el historial de una conversación)

---

## Lo que queda pendiente después del cambio

- **`legal.html`**: sigue con 3 campos `[COMPLETAR]` (razón social, NIT,
  correo PQR). Cuando lleguen, ver `docs/README.md` — hay que publicarla
  **y** cambiar el checkbox de consentimiento a la vez.
- **Rediseño de la web** y **ampliación del panel**: son proyectos
  aparte, no parte de esta migración.
