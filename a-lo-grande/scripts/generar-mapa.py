"""Genera public/assets/img/mapa-zonas.<hash>.svg y la posición en % de cada punto del mapa.

Uso (Python 3 y `pip install shapely`):
    python scripts/generar-mapa.py

El nombre lleva un hash del contenido (cache busting: /assets/img/mapa-zonas.* se sirve como immutable).
El script borra el SVG anterior y actualiza la referencia en index.html.
La primera vez descarga datos de Natural Earth (dominio público) a .cache/, que no se sube a Git.
Ver docs/MAPA-ZONAS.md.
"""

import hashlib
import json
import math
import re
import sys
import urllib.request
from pathlib import Path

from shapely import clip_by_rect, transform, unary_union
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUT_DIR = ROOT / "public" / "assets" / "img"
OUT_PREFIX = "mapa-zonas"
# Archivos donde se reescribe la referencia al SVG (con o sin hash)
REF_FILES = [ROOT / "public" / "index.html", ROOT / "public" / "css" / "styles.css"]
REF_PATTERN = re.compile(r"assets/img/mapa-zonas(?:\.[0-9a-f]{8})?\.svg")

NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
NE_COUNTRIES = "ne_10m_admin_0_countries.geojson"
NE_PROVINCES = "ne_10m_admin_1_states_provinces.geojson"

# Tamaño del SVG: misma relación 16:10 que .coverage-map en styles.css
WIDTH = 1600
HEIGHT = 1000

# Recorte (proyección Mercator). El ancho en grados sale de LON_MIN/LON_MAX;
# el alto lo fija la relación 16:10, centrado en LAT_CENTER.
LON_MIN = -79.15
LON_MAX = -51.95
LAT_CENTER = -40.2

# Margen mínimo (en % del mapa) entre cada punto y el borde. Si un punto queda más cerca, el script avisa.
EDGE_MARGIN = 3.0

# Localidades: slug (para la clase CSS coverage-map__point--slug) -> (latitud, longitud)
POINTS = {
    # Buenos Aires
    "mercedes": (-34.6515, -59.4307),
    "pigue": (-37.6060, -62.4045),
    "bahia-blanca": (-38.7183, -62.2663),
    "punta-alta": (-38.8775, -62.0756),
    "bolivar": (-36.2297, -61.1136),
    "trenque-lauquen": (-35.9706, -62.7336),
    "carhue": (-37.1786, -62.7581),
    # Neuquén
    "neuquen": (-38.9516, -68.0591),
    "san-martin-de-los-andes": (-40.1572, -71.3533),
    "villa-la-angostura": (-40.7631, -71.6466),
    # Río Negro
    "cipolletti": (-38.9339, -67.9903),
    "allen": (-38.9776, -67.8274),
    "villa-regina": (-39.0956, -67.0838),
    "choele-choel": (-39.2894, -65.6603),
    "rio-colorado": (-38.9906, -64.0955),
    "viedma": (-40.8135, -62.9967),
    "bariloche": (-41.1335, -71.3103),
    # Chubut
    "comodoro-rivadavia": (-45.8641, -67.4966),
}

# Rutas punteadas fijas en el SVG: (desde, hasta, curvatura relativa al largo).
# Vacío a propósito: las rutas las dibuja la animación de main.js (initCoverageMap).
ROUTES = []

# Estilos (mismos colores que la versión anterior)
OCEAN = "#1C2338"
NEIGHBOR = {"fill": "#283048", "stroke": "#66739A", "stroke-width": "1.2"}
PROVINCE = {"fill": "#36405C", "stroke": "#4B5776", "stroke-width": "0.9"}
OUTLINE = {"stroke": "#7683A8", "stroke-width": "1.6"}
ROUTE = {"stroke": "#F0B429", "stroke-width": "2.4", "stroke-dasharray": "2 9"}

CLIP_PAD = 30  # px fuera del lienzo, para que los bordes de recorte no se vean
SIMPLIFY = 1.5  # tolerancia en px


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


SCALE = WIDTH / math.radians(LON_MAX - LON_MIN)  # px por radián
MERC_CENTER = merc(LAT_CENTER)


def project(lon, lat):
    x = math.radians(lon - LON_MIN) * SCALE
    y = HEIGHT / 2 - (merc(lat) - MERC_CENTER) * SCALE
    return x, y


def lat_at(y):
    m = MERC_CENTER + (HEIGHT / 2 - y) / SCALE
    return math.degrees(2 * math.atan(math.exp(m)) - math.pi / 2)


def project_coords(coords):
    for row in coords:
        row[0], row[1] = project(row[0], row[1])
    return coords


def load(name):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if not path.exists():
        print(f"Descargando {name}...")
        urllib.request.urlretrieve(NE_BASE + name, path)
    return json.loads(path.read_text(encoding="utf-8"))["features"]


def prepare(geom):
    """Recorta al lienzo, proyecta y simplifica. Devuelve None si queda vacío."""
    # Primer recorte en grados (holgado), para no proyectar latitudes lejanas como la Antártida
    lon_pad = (LON_MAX - LON_MIN) * CLIP_PAD / WIDTH * 2
    geom = clip_by_rect(geom, LON_MIN - lon_pad, lat_at(HEIGHT + 2 * CLIP_PAD),
                        LON_MAX + lon_pad, lat_at(-2 * CLIP_PAD))
    if geom.is_empty:
        return None
    geom = transform(geom, project_coords)
    geom = clip_by_rect(geom, -CLIP_PAD, -CLIP_PAD, WIDTH + CLIP_PAD, HEIGHT + CLIP_PAD)
    if geom.is_empty:
        return None
    geom = geom.simplify(SIMPLIFY, preserve_topology=True)
    return None if geom.is_empty else geom


def rings(geom):
    polys = getattr(geom, "geoms", [geom])
    for poly in polys:
        if poly.geom_type != "Polygon":
            continue
        yield poly.exterior.coords
        for interior in poly.interiors:
            yield interior.coords


def path_data(geom, close=True):
    parts = []
    for ring in rings(geom):
        pts = list(ring)
        if close:
            pts = pts[:-1]
        if len(pts) < 2:
            continue
        cmds = "L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        parts.append("M" + cmds + ("Z" if close else ""))
    return "".join(parts)


def attrs(style):
    return " ".join(f'{k}="{v}"' for k, v in style.items())


def route_path(a, b, bend):
    (x1, y1), (x2, y2) = project(*POINTS[a][::-1]), project(*POINTS[b][::-1])
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    # Normal hacia arriba (y negativa), para que ambas curvas se arqueen hacia el norte
    # (la normal ya mide lo mismo que el tramo, así que bend es proporción del largo)
    nx, ny = dy, -dx
    if ny > 0:
        nx, ny = -nx, -ny
    cx, cy = mx + nx * bend, my + ny * bend
    return f"M{x1:.1f} {y1:.1f} Q{cx:.1f} {cy:.1f} {x2:.1f} {y2:.1f}"


def write_hashed_svg(svg):
    """Escribe el SVG con un hash del contenido en el nombre y borra las versiones anteriores."""
    data = svg.encode("utf-8")  # siempre LF: es lo que se commitea y se publica
    out_svg = OUT_DIR / f"{OUT_PREFIX}.{hashlib.sha256(data).hexdigest()[:8]}.svg"
    for old in OUT_DIR.glob(f"{OUT_PREFIX}*.svg"):
        if old != out_svg:
            old.unlink()
    out_svg.write_bytes(data)
    return out_svg


def update_refs(name):
    """Apunta las referencias al SVG nuevo. Lee y escribe bytes para respetar los finales de línea."""
    found = False
    for path in REF_FILES:
        text = path.read_bytes().decode("utf-8")
        found = found or bool(REF_PATTERN.search(text))
        updated = REF_PATTERN.sub(f"assets/img/{name}", text)
        if updated != text:
            path.write_bytes(updated.encode("utf-8"))
    return found


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    countries = load(NE_COUNTRIES)
    provinces = load(NE_PROVINCES)

    neighbors, outline = [], None
    for feature in countries:
        name = feature["properties"]["ADMIN"]
        geom = prepare(shape(feature["geometry"]))
        if geom is None:
            continue
        if name == "Argentina":
            outline = geom
        else:
            neighbors.append(geom)

    argentine = []
    for feature in provinces:
        if feature["properties"].get("admin") != "Argentina":
            continue
        geom = prepare(shape(feature["geometry"]))
        if geom is not None:
            argentine.append(geom)

    if outline is None:
        outline = unary_union(argentine)

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">',
        f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{OCEAN}"/>',
        f'<g {attrs(NEIGHBOR)} stroke-linejoin="round">'
        + "".join(f'<path d="{path_data(g)}"/>' for g in neighbors)
        + "</g>",
        f'<g {attrs(PROVINCE)} stroke-linejoin="round">'
        + "".join(f'<path d="{path_data(g)}"/>' for g in argentine)
        + "</g>",
        f'<path d="{path_data(outline)}" fill="none" {attrs(OUTLINE)} stroke-linejoin="round"/>',
    ]
    if ROUTES:
        lines.append(
            f'<path d="{" ".join(route_path(*r) for r in ROUTES)}" fill="none" {attrs(ROUTE)} stroke-linecap="round"/>'
        )
    lines.append("</svg>")
    out_svg = write_hashed_svg("\n".join(lines) + "\n")
    size_kb = out_svg.stat().st_size / 1024
    print(f"SVG: {out_svg.relative_to(ROOT).as_posix()} ({size_kb:.1f} KB)")
    print(f"Nombre nuevo: {out_svg.name}")
    if update_refs(out_svg.name):
        print("Referencias actualizadas (index.html / styles.css)")
    else:
        print("Atención: no se encontró ninguna referencia a assets/img/mapa-zonas*.svg para actualizar")
    print(f"Recorte: lon {LON_MIN} a {LON_MAX}, lat {lat_at(0):.2f} a {lat_at(HEIGHT):.2f}\n")

    print("/* Posiciones para styles.css (salen de scripts/generar-mapa.py) */")
    warnings = []
    for slug, (lat, lon) in POINTS.items():
        x, y = project(lon, lat)
        px, py = x / WIDTH * 100, y / HEIGHT * 100
        print(f".coverage-map__point--{slug} {{\n  --x: {px:.2f}%;\n  --y: {py:.2f}%;\n}}")
        if min(px, py, 100 - px, 100 - py) < EDGE_MARGIN:
            warnings.append(slug)
    if warnings:
        print("\nAtención: puntos muy cerca del borde: " + ", ".join(warnings))


if __name__ == "__main__":
    main()
