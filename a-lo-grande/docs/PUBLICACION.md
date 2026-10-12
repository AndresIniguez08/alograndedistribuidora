# Guía de publicación

Nombres de menús y botones de Cloudflare, GitHub y Resend pueden cambiar. Si algo no coincide, buscá la opción equivalente.

## Antes de empezar

- Los dos dominios (`alograndedistribuidora.com.ar` y `.com`) registrados a nombre del cliente.
- Cuenta de Cloudflare creada por el cliente, con vos agregado como miembro.
- Casilla `contacto@alograndedistribuidora.com.ar` creada (Google Workspace).
- Repositorio del proyecto en GitHub.

## 1. Subir el proyecto a Git

```bash
git init
git add .
git commit -m "Sitio inicial"
git branch -M main
git remote add origin <https://github.com/AndresIniguez08/alograndedistribuidora.git>
git push -u origin main
```

## 2. Crear el proyecto en Cloudflare Pages

1. En la cuenta del cliente: **Workers & Pages → Create → Pages → Connect to Git**.
2. Elegí el repositorio. Si te pide autorizar GitHub, hacelo con la cuenta que tiene el repo.
3. Configuración de compilación:
   - Framework preset: **None**
   - Build command: _(vacío)_
   - Build output directory: **public**
4. **Save and Deploy**. Cloudflare detecta la carpeta `functions/` en la raíz y publica la función del formulario.

Alternativa sin Git, desde la terminal: `npm install` y después `npm run deploy` (te pide iniciar sesión en Cloudflare la primera vez).

## 3. Conectar el dominio

1. Agregá los dos dominios a Cloudflare (plan gratuito) y cambiá los servidores de nombres:
   - `.com`: desde el panel de DonWeb.
   - `.com.ar`: desde el panel de DonWeb si lo permite o desde NIC Argentina, con la Clave Fiscal del titular.
2. En el proyecto de Pages: **Custom domains → Set up a custom domain** y agregá `alograndedistribuidora.com.ar`.
3. Agregá también `www` y redirigilo al dominio sin `www` con una regla de redirección.
4. Creá una **regla de redirección** para que `alograndedistribuidora.com` (y su `www`) vayan a `https://alograndedistribuidora.com.ar` con código 301.
5. Esperá a que el certificado de seguridad quede activo.

## 4. Correo del dominio (Google Workspace)

1. En Workspace, verificá el dominio con el registro TXT que te indica y cargalo en el DNS de Cloudflare.
2. Cargá los registros MX de Google.
3. Activá la autenticación del correo: SPF, DKIM (se genera en la consola de administración de Workspace) y DMARC.

## 5. Envío del formulario con Resend

1. Creá una cuenta en Resend y agregá el dominio. Cargá en Cloudflare los registros DNS que te indique y esperá la verificación.
2. **Un dominio solo puede tener un registro SPF.** Si Resend te pide uno en el dominio raíz y ya cargaste el de Google, unificalos en un solo registro que incluya ambos.
3. Creá una API key con permiso de envío.
4. En el proyecto de Pages: **Settings → Variables and Secrets** (en Production y en Preview) y cargá:
   - `RESEND_API_KEY`: la clave, como secreto.
   - `CONTACT_TO`: `contacto@alograndedistribuidora.com.ar`
   - `CONTACT_FROM`: `A lo grande Mayorista <consultas@alograndedistribuidora.com.ar>`
5. Hacé un nuevo deploy para que tome las variables.
6. Revisá los límites del plan gratuito de Resend antes de depender de él.

## 6. Completar los datos del sitio

En `public/js/main.js`, bloque `SITE_CONFIG`: teléfono (solo si el cliente decide publicarlo), WhatsApp, Instagram y horario. Commit y push.

## 7. Prueba final

- Enviar los dos formularios desde el celular y desde la computadora, y confirmar que llegan los mails.
- Abrir el sitio en 390px y 1440px.
- Abrir `https://alograndedistribuidora.com.ar/robots.txt` y `/sitemap.xml`.
- Compartir el enlace en WhatsApp para ver la imagen de vista previa.

## 8. Google

1. **Search Console**: agregar la propiedad del dominio, verificarla con un registro TXT en Cloudflare y enviar `https://alograndedistribuidora.com.ar/sitemap.xml`.
2. **Google Business Profile**: crear la ficha como negocio con reparto, sin local, y completar la verificación.
3. Nadie puede garantizar posiciones. Medir las consultas recibidas mes a mes.

## Día a día

Cada cambio: editar, probar con `npm run dev`, `git commit` y `git push`. Cloudflare publica solo.
Si algo sale mal, en **Deployments** se puede volver a una versión anterior.

## Caché y nombres con hash

`public/_headers` define cuánto guarda cada archivo el navegador:

| Ruta | Cache-Control | Por qué |
| --- | --- | --- |
| `/assets/fonts/*` | `immutable`, 1 año | Las tipografías no cambian. |
| `/assets/img/*.webp` | `immutable`, 1 año | Los genera `npm run images` con hash en el nombre (`budin-pan-800.1582c871.webp`). |
| `/assets/img/mapa-zonas.*` | `immutable`, 1 año | Lo genera `scripts/generar-mapa.py` con hash en el nombre (`mapa-zonas.68244c89.svg`). |
| Resto de `/assets/*` | `max-age=3600, must-revalidate` | Nombre fijo (`og-image-1200x630.png`, logo PNG, íconos del manifest, SVG hechos a mano): a lo sumo una hora desactualizado. El logo en `.webp` cae en la regla immutable de arriba: si cambia, nombre nuevo (ver `docs/IMAGENES.md`, "Logo"). |
| `/assets/video/*` | `max-age=3600, must-revalidate` (regla de `/assets/*`) | Nombre con versión (`hero-camion-v1.webm`): si el video cambia, `-v2`. Ver `docs/IMAGENES.md`, "Video de la portada". |
| HTML | `max-age=0, must-revalidate` | Se revalida en cada visita. |
| `/css/styles.css`, `/js/main.js` | `max-age=14400` (4 h) en producción | No lo pone `_headers`: lo aplica Cloudflare (ajuste *Browser Cache TTL* de la zona). Por eso van con `?v=<hash>` en la URL; ver abajo. |

Con `immutable` el navegador no vuelve a pedir el archivo durante un año, ni con F5. Por eso **la regla es: si cambia
el contenido de un archivo immutable, tiene que cambiar su nombre**. Si no, quien ya visitó el sitio sigue viendo el viejo
mientras el HTML, el CSS y el JS ya son nuevos (así se desalineó el mapa de zonas en octubre de 2026).

- **Mapa de zonas**: al regenerarlo, subí la versión del nombre. `python scripts/generar-mapa.py` lo hace solo: escribe
  `mapa-zonas.<hash>.svg`, borra el anterior, actualiza el `src` en `index.html` e imprime el nombre nuevo.
- **Fotos**: `npm run images` hace lo mismo con cada `<nombre>-<ancho>.<hash>.webp`.
- **No edites a mano** un `.webp` ni el SVG del mapa conservando el nombre. Si hace falta, regeneralo con su script.
- **Tipografías**: si se reemplaza una, cambiale el nombre (por ejemplo `inter-400.v2.woff2`) y actualizá el `@font-face`.
- Un `.webp` nuevo que no salga de `npm run images` tiene que llevar hash o versión en el nombre igual.

Commiteá siempre el archivo nuevo **y** el borrado del viejo (`git add -A public/assets`).

### CSS y JS: `?v=<hash>` en la URL

El HTML se revalida en cada visita, pero `styles.css` y `main.js` pueden quedar **4 horas** en la caché del navegador
(lo fija Cloudflare, no `_headers`). Si el HTML nuevo llega con un CSS viejo, el sitio se rompe: en octubre de 2026 el logo
nuevo se vio deformado y gigante para quien ya había visitado el sitio, porque el CSS viejo no tenía sus reglas.

Por eso `index.html` pide `css/styles.css?v=<hash>` y `js/main.js?v=<hash>`, con un hash del contenido.
**Después de cualquier cambio en `styles.css` o `main.js`, y antes de commitear o publicar:**

```bash
npm run assets:version
```

Actualiza los `?v=` en `index.html` (no toca nada si los archivos no cambiaron). `npm run deploy` ya lo corre antes de subir.
Si Cloudflare Pages publica desde Git, configurá además como comando de build `node scripts/version-assets.mjs`
(Settings → Builds → Build command, con `public` como directorio de salida), así no depende de acordarse.

### Comprobar en producción qué archivo se sirve

```bash
# Qué nombre de mapa pide el HTML publicado
curl -s https://alograndedistribuidora.com.ar/ | grep -o 'assets/img/mapa-zonas[^"]*'
# Que ese archivo exista y tenga el caché esperado (200, image/svg+xml, immutable)
curl -sI https://alograndedistribuidora.com.ar/assets/img/mapa-zonas.<hash>.svg
```

Ojo: una ruta inexistente no da 404 sino `index.html` con 200 (no hay `404.html`). Si `Content-Type` es `text/html`,
el archivo no se subió.
