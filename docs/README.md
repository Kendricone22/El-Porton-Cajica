# Documentos pendientes de publicar

## `legal.html`

Términos y Condiciones + Política de Tratamiento de Datos (Ley 1581 de 2012 /
Decreto 1377 de 2013). Está terminado salvo **3 campos que faltan por parte del
cliente**, marcados como `[COMPLETAR]` (6 apariciones en total):

1. Razón social / nombre del responsable
2. NIT o documento
3. Correo para asuntos de datos (PQR)

**Por eso está aquí y no en la raíz:** `.vercelignore` excluye esta carpeta, así
que el archivo queda respaldado en git pero no sale publicado con los
marcadores a la vista.

### Qué hay que hacer cuando lleguen los 3 datos

1. Rellenar los 6 `[COMPLETAR]`.
2. Mover `legal.html` a la raíz del repo (o convertirlo en una ruta cuando el
   proyecto esté en Next).
3. Quitar `docs/` del `.vercelignore`.
4. **Cambiar el checkbox de consentimiento de `index.html`**: hoy el repo usa
   una versión con el texto autocontenido y **sin enlaces**, justo porque
   `legal.html` no está en vivo. La carpeta de trabajo
   `el-porton-cajica-web/` tiene la otra variante, la que enlaza a
   `legal.html#datos` y `legal.html#terminos` (`id="cart-consent-check"`).
   Esa es la que debe quedar una vez la página exista.

⚠️ El orden importa: si se despliega el checkbox con enlaces antes que
`legal.html`, los clientes ven un 404 en el punto exacto donde tienen que
aceptar para poder enviar el pedido.
