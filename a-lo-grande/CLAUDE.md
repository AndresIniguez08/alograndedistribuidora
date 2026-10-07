# A lo grande · Guía para Claude Code

## Qué es
Sitio institucional estático de un distribuidor de huevos (base en Pigüé, clientes sobre todo en Neuquén).
Objetivo: captar consultas con un formulario simple y aparecer en Google.

## Estructura del front: tres archivos
- `public/index.html`: estructura y contenido. Sin estilos ni scripts en línea (solo el JSON-LD y el sprite de íconos SVG).
- `public/css/styles.css`: todos los estilos.
- `public/js/main.js`: todo el comportamiento. La configuración editable está en `SITE_CONFIG`, al inicio.
- `functions/api/contact.js`: función de Cloudflare Pages que recibe el formulario y lo envía por mail.

## Reglas de código
- HTML, CSS y JavaScript sin frameworks, sin librerías y sin paso de build. No agregar dependencias al front.
- CSS: colores, tamaños, espacios, radios y sombras salen de los tokens de `:root` (sección 2 del archivo).
  Si falta un valor, crear primero el token. Nombres BEM: `bloque__elemento--modificador`.
  Breakpoints actuales: 1000px y 560px. Mantenerlos o justificar el cambio.
- JavaScript: los ganchos son atributos `data-*`, no clases de estilo. Funciones chicas con prefijo `init`. Sin dependencias.
- HTML semántico: un solo `h1`, jerarquía `h2`/`h3`, `label` en cada campo, `aria-live` para estados, foco visible,
  contraste AA, respeto de `prefers-reduced-motion`.
- Texto visible en español rioplatense (vos). Nombres de código en inglés; comentarios en español.

## Reglas de contenido
- No inventar datos del negocio: años de experiencia, certificaciones, cifras, precios, presentaciones,
  direcciones, teléfonos ni horarios. Si falta un dato, queda oculto vía `SITE_CONFIG`.
- No publicar precios: es una decisión del cliente.
- No poner créditos ni menciones de quien desarrolló el sitio.
- Las cotizaciones y las ventas las atiende el cliente. El sitio solo capta y deriva consultas.

## Restricciones al aplicar mejoras visuales
- Mantener la paleta de marca: navy `#12182B`, cobalto `#2646C8`, ámbar `#F0B429`, hueso `#F3F0E9`.
  Cualquier cambio de color se hace en los tokens y con justificación.
- Mantener las tipografías Sora e Inter autoalojadas.
- Mantener el orden de secciones y la estructura del wireframe aprobado: inicio con formulario, productos, zonas, nosotros y contacto.
- Rendimiento: sin imágenes pesadas, sin librerías de animación. Las animaciones son CSS y respetan `prefers-reduced-motion`.
- No agregar carruseles, ventanas emergentes ni chatbots.

## Probar
`npm install` y `npm run dev` (sitio y función en http://localhost:8788). El formulario necesita `.dev.vars` (ver `.dev.vars.example`).

## Checklist antes de dar un cambio por terminado
- Sin errores en la consola del navegador.
- Menú móvil, validación del formulario, envío exitoso y envío con falla funcionando.
- 390px y 1440px de ancho sin scroll horizontal.
- Contraste y foco visibles; navegación completa con teclado.
