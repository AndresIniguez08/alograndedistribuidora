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
git remote add origin <URL-del-repositorio>
git push -u origin main
```

## 2. Crear el proyecto en Cloudflare Pages
1. En la cuenta del cliente: **Workers & Pages → Create → Pages → Connect to Git**.
2. Elegí el repositorio. Si te pide autorizar GitHub, hacelo con la cuenta que tiene el repo.
3. Configuración de compilación:
   - Framework preset: **None**
   - Build command: *(vacío)*
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
   - `CONTACT_FROM`: `A lo grande <consultas@alograndedistribuidora.com.ar>`
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
