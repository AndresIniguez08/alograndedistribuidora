# Mejora visual con Taste Skill

Taste Skill es una skill de Claude Code que corrige el aspecto genérico de las interfaces generadas con IA.
Se instala dentro del proyecto, en `.claude/skills`. Usá una sola skill de gusto por proyecto: varias juntas dan indicaciones que se contradicen.

## Instalación
Desde la terminal del proyecto (verificá el comando vigente en el repositorio `leonxlnx/taste-skill`):

```bash
npx skills add leonxlnx/taste-skill --skill design-taste-frontend --agent claude-code
```

La skill trae tres parámetros: variación del diseño, intensidad de movimiento y densidad visual.
Este sitio es institucional y de captación: conviene variación media, movimiento bajo y densidad media a baja.
Ajustá esos valores según lo que indique el archivo `SKILL.md` instalado.

## Cómo usarla sin romper el proyecto
La skill tiende a decidir sin preguntar. Por eso las restricciones van por delante: están en `CLAUDE.md`
y el prompt de abajo las repite. Un sistema de diseño marca los límites y la skill trabaja dentro de ellos.
Los tokens de `styles.css` son ese sistema.

## Prompt para pegar en Claude Code
```
Leé CLAUDE.md y los tres archivos de public/ (index.html, css/styles.css, js/main.js).
Aplicá la skill design-taste-frontend para que el sitio se vea premium y distinto de lo genérico,
sin cambiar la estructura de secciones ni el contenido.

Restricciones: las de CLAUDE.md. En particular, no agregar librerías ni frameworks, mantener la paleta
de marca (cambios de color solo vía tokens y con justificación), mantener Sora e Inter, y no inventar
datos del negocio.

Dials: variación media, movimiento bajo (solo CSS, respetando prefers-reduced-motion), densidad media-baja.

Trabajá en pasos:
1. Auditoría: qué se ve genérico y por qué, sección por sección.
2. Propuesta: los cambios de mayor impacto, priorizados, antes de tocar código.
3. Implementación: mayormente en css/styles.css; en index.html solo el marcado mínimo necesario.
4. Verificación: consola sin errores, 390px y 1440px sin scroll horizontal, contraste y foco, menú móvil y formularios funcionando.

Mostrame los cambios agrupados por sección y explicá cada decisión en una línea.
```

## Qué mirar en la revisión
- Que no aparezcan datos inventados: cifras, años, certificaciones.
- Que el formulario siga arriba en el inicio y en contacto.
- Que los colores nuevos estén en los tokens y no sueltos en los componentes.
- Que el peso de la página no suba de forma notable.
