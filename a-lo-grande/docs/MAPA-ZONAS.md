# Mapa de zonas de reparto

El mapa de la sección "Zonas de reparto" se arma con dos capas:
- **La geografía** es una imagen liviana (`public/assets/img/mapa-zonas.<hash>.svg`, unos 24 KB, 8 KB con gzip) con las provincias. No trae rutas dibujadas.
  El único lugar que la referencia es el `src` de `.coverage-map__base` en `index.html`.
- **Los puntos y sus nombres** son HTML encima de la imagen. Así usan las tipografías del sitio y se editan sin tocar la imagen.
- **La animación** (`initCoverageMap` en `public/js/main.js`) usa una capa SVG con el mismo viewBox (1600 × 1000).
  Imagen base (`object-fit: fill`), capa SVG (`preserveAspectRatio="none"`) y puntos en % viven en el mismo contenedor
  16:10, así que comparten el sistema de coordenadas en cualquier ancho y nada se recorta. En móvil el marco pierde su
  padding interno para ganar ancho.
  Las rutas se calculan desde las `--x`/`--y` de cada punto (no repiten coordenadas) y no se dibujan: solo guían el
  movimiento. Son curvas cuyo punto de control se corre una fracción de la distancia entre los dos puntos
  (`MAP_ROUTE_BENDS`, hacia el sur; `MAP_SPREAD_BENDS` para el reparto). Antes de cada viaje se mide, en el ancho actual,
  que la curva pase a 8 px o más (`--map-route-clearance`) de las etiquetas permanentes; si ninguna fracción hacia el sur
  sirve, se prueba el norte (pasa con Mercedes → Pigüé en escritorio). Cada puntito deja una estela corta que se desvanece
  (`--map-trail-*`). La secuencia:
  1. Desde Mercedes viaja un punto hasta Pigüé, que hace una onda; de ahí se reparte a las localidades de Buenos Aires.
  2. Desde Mercedes viaja otro punto hasta Neuquén, que hace una onda; de ahí se reparte a las de Neuquén, Río Negro y Chubut.
  3. Al final quedan todos los puntos encendidos. No queda ninguna línea: el ámbar es solo para puntitos, estelas y ondas.
  Se reproduce una vez al entrar en pantalla, se repite con "Ver de nuevo", se pausa si la pestaña se oculta
  y con `prefers-reduced-motion` muestra directamente el estado final. Los tiempos y tamaños son tokens `--map-*` de `:root`.
- **Las tarjetas de provincia** (`initProvinceCards`) resaltan en el mapa los puntos de esa provincia.
- **Los nombres de localidad**: cuando llega cada puntito aparece una píldora con el nombre (sale de `data-name`, el único lugar
  donde está escrito), queda un momento y se va. Pigüé, Neuquén y Mercedes no llevan píldora: tienen su etiqueta permanente.
  También aparece con hover o foco (cada localidad tiene `tabindex="0"` y `aria-label`; la píldora es `aria-hidden`), y al activar
  una tarjeta de provincia si todos sus nombres entran sin pisarse.

### Cómo se evita que los nombres se pisen
1. Cada localidad tiene un lado preferido en `data-label-pos` (`top`, `bottom`, `left`, `right`). `main.js` mide la píldora en el
   ancho actual y, si se sale del mapa o pisa una etiqueta permanente, prueba el lado contrario, los perpendiculares y las diagonales.
2. Antes de cada reparto se calcula cuándo llega cada puntito. Si dos nombres se tocarían en el mismo momento, se elige otro lado
   o se corre la salida de ese puntito justo lo necesario, así nombre y llegada siguen sincronizados.
   En móvil (mapa de ~340 px) los nombres cercanos se encadenan más: la secuencia dura unos 18 s; en escritorio, unos 12 s.

Para lectores de pantalla el mapa es una imagen (`role="img"` con `aria-label`); la versión navegable son las tarjetas de provincia.

No usa Google Maps ni librerías externas: no hay claves, no hay costos y no se envían datos de los visitantes a terceros.

Si se agrega o se quita una localidad, se cambia en el mapa, en las tarjetas de provincia (`.province-card`) y en el capítulo "Dónde estamos" de Nosotros.

## Recorte y proyección
- Proyección Mercator, lienzo de 1600 × 1000 (la misma relación 16:10 que `.coverage-map`).
- Longitud: de -79,15 a -51,95. Latitud: de -33,40 a -46,38 (centro en -40,2).
- Entra todo desde Mercedes (arriba a la derecha) hasta Comodoro Rivadavia (abajo), y desde Villa La Angostura (oeste) hasta Punta Alta (este).

Las posiciones en % salen de la misma función de proyección que dibuja el SVG, así que los puntos quedan alineados por construcción.

## Puntos actuales

Con etiqueta visible:

| Localidad | Rol (`data-role`) | Clases |
| --- | --- | --- |
| Pigüé | Sede principal (punto ámbar) | `coverage-map__point--base coverage-map__point--pigue` |
| Neuquén | Depósito | `coverage-map__point--neuquen coverage-map__point--left` |
| Mercedes | Punto de carga | `coverage-map__point--mercedes` |

Sin etiqueta (punto chico, `coverage-map__point--minor`, `data-role="localidad"`):

- Buenos Aires: Bahía Blanca, Punta Alta, Bolívar, Trenque Lauquen, Carhué.
- Neuquén: San Martín de los Andes, Villa La Angostura.
- Río Negro: Cipolletti, Allen, Villa Regina, Choele Choel, Río Colorado, Viedma, Bariloche.
- Chubut: Comodoro Rivadavia.

Neuquén, Cipolletti y Allen están a pocos kilómetros entre sí, así que en el mapa se ven casi juntas. Es lo esperable a esta escala.
Las etiquetas quedan donde no tapan otros puntos: Neuquén a la izquierda (a la derecha están Cipolletti y Allen), Pigüé y Mercedes a la derecha.

Las coordenadas se contrastaron con Natural Earth (lugares poblados): las localidades que figuran ahí coinciden a menos de 4 km, que en el mapa es menos de un píxel.

## Agregar o mover una zona
1. Editar `POINTS` en `scripts/generar-mapa.py` (latitud, longitud). Si la zona nueva queda fuera del recorte,
   ajustar también `LON_MIN`, `LON_MAX` y `LAT_CENTER`. El script avisa si un punto queda muy cerca del borde.
2. Correr el script (necesita Python 3 y `pip install shapely`):
   ```bash
   python scripts/generar-mapa.py
   ```
   La primera vez descarga datos de Natural Earth (dominio público, unos 50 MB) a `.cache/`, que no se sube a Git.
3. El script regenera el SVG e imprime el bloque de CSS con la posición de cada punto. Reemplazar con él las reglas
   `.coverage-map__point--…` de posición en `public/css/styles.css`.

   **Regla: al regenerar el mapa, subí la versión del nombre.** El SVG se sirve como `immutable` por un año, así que si
   cambia con el mismo nombre los visitantes siguen viendo el recorte viejo con los puntos nuevos encima (desalineados).
   El script lo resuelve solo: escribe `mapa-zonas.<hash>.svg` (hash del contenido), borra el anterior, actualiza el `src`
   en `index.html` e imprime el nombre nuevo. No renombrar ni editar el SVG a mano. Al commitear, incluir el archivo nuevo
   y el borrado del viejo (`git add -A public/assets/img public/index.html`). Ver `docs/PUBLICACION.md`, "Caché y nombres con hash".
4. En `public/index.html`, dentro de `.coverage-map__points`:
   - Localidad sin etiqueta: `<li class="coverage-map__point coverage-map__point--minor coverage-map__point--slug" data-place="slug" data-province="rio-negro" data-role="localidad"></li>`,
     antes de los puntos con etiqueta (así estos quedan por encima). Con `data-province` y `data-role="localidad"` entra sola en la animación y en las tarjetas.
   - Localidad con etiqueta: igual, con `data-role` `sede`, `deposito` o `carga` y su `<span class="coverage-map__label">`.
   - Toda localidad lleva `data-name` (nombre exacto, como en la lista) y, si no tiene etiqueta permanente, `data-label-pos`, `role="img"` y `tabindex="0"`.
     Si el nombre queda cortado contra el borde derecho o tapa otro punto, sumar `coverage-map__point--left`.
5. Actualizar la tarjeta de provincia y el capítulo "Dónde estamos", y revisar 390 px y 1440 px.
6. Si cambia el orden de la secuencia (por ejemplo, otra base), se edita `MAP_SEQUENCE` en `public/js/main.js`.

Con muchas localidades conviene no sumar etiquetas: en 390 px el mapa mide unos 354 × 221 px y se saturan enseguida.
