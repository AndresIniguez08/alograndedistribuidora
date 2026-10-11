/* ==========================================================================
   A lo grande Mayorista · Comportamiento del sitio

   Índice
   1. Configuración (lo único que se edita para cambiar datos)
   2. Utilidades
   3. Datos de contacto
   4. Navegación (menú móvil y sección activa)
   5. Botones "Consultar"
   6. Formularios
   7. Recetas (carrusel y modal)
   8. Nosotros: capítulos (tabs)
   9. Zonas de reparto (mapa animado y tarjetas de provincia)
   10. Inicio
   ========================================================================== */

"use strict";

// Marca que hay JS: el CSS solo oculta lo que aparece al scroll si esta clase existe
document.documentElement.classList.add("has-js");

/* 1. CONFIGURACIÓN -------------------------------------------------------- */
/* Los campos vacíos no se muestran en el sitio. */

const SITE_CONFIG = Object.freeze({
  email: "contacto@alograndedistribuidora.com.ar",
  phone: "", // ejemplo: "+54 9 2923 00 0000"
  whatsapp: "", // solo dígitos con código de país, ejemplo: "5492923000000"
  instagram: "", // usuario sin @, ejemplo: "alogrande"
  hours: "", // ejemplo: "Lunes a viernes, de 8 a 17 h"
  formEndpoint: "/api/contact",
  formTimeoutMs: 12000,
});

const FIELD_MESSAGES = Object.freeze({
  name: "Escribí tu nombre.",
  phone: "Ingresá un teléfono válido, con código de área.",
  city: "Indicá la localidad de tu negocio.",
  businessType: "Elegí el tipo de negocio.",
});

const MIN_PHONE_DIGITS = 8;

/* 2. UTILIDADES ----------------------------------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));
const digitsOnly = (value) => value.replace(/\D/g, "");

// Lee un token de :root (los tiempos y tamaños de las animaciones salen de ahí)
const readToken = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Tiempo de un token ("0.5s" o "110ms") en milisegundos
const readTime = (name) => {
  const value = readToken(name);
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Aparición única al entrar en pantalla, para todo elemento con data-reveal
function initReveal() {
  const items = $$("[data-reveal]");
  if (items.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.15 },
  );
  items.forEach((item) => observer.observe(item));
}

/* 3. DATOS DE CONTACTO ---------------------------------------------------- */

function initContactInfo() {
  const { email, phone, whatsapp, instagram, hours } = SITE_CONFIG;

  const show = (key, value, fill) => {
    const item = $(`[data-contact="${key}"]`);
    if (!item) return;
    item.hidden = !value;
    if (value) fill($(".contact-list__value", item));
  };

  show("email", email, (el) => {
    el.textContent = email;
    el.href = `mailto:${email}`;
  });
  show("phone", phone, (el) => {
    el.textContent = phone;
    el.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  });
  show("whatsapp", whatsapp, (el) => {
    el.href = `https://wa.me/${digitsOnly(whatsapp)}`;
  });
  show("instagram", instagram, (el) => {
    el.textContent = `@${instagram}`;
    el.href = `https://www.instagram.com/${instagram}`;
  });
  show("hours", hours, (el) => {
    el.textContent = hours;
  });

  const footerSocial = $('[data-social="instagram"]');
  if (footerSocial && instagram) {
    footerSocial.href = `https://www.instagram.com/${instagram}`;
    footerSocial.hidden = false;
  }
}

/* 4. NAVEGACIÓN ----------------------------------------------------------- */

function initMobileMenu() {
  const nav = $("[data-nav]");
  const toggle = $("[data-nav-toggle]");
  if (!nav || !toggle) return;

  const icon = $("use", toggle);

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    icon.setAttribute("href", open ? "#i-close" : "#i-menu");
  };

  toggle.addEventListener("click", () =>
    setOpen(!nav.classList.contains("is-open")),
  );
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function initScrollSpy() {
  const links = $$(".nav__link");
  const setActive = (id) => {
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`)
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  setActive("inicio");
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      }),
    { rootMargin: "-45% 0px -50% 0px" },
  );
  links.forEach((link) => {
    const section = $(link.getAttribute("href"));
    if (section) observer.observe(section);
  });
}

/* 5. BOTONES "CONSULTAR" -------------------------------------------------- */
/* Al tocar "Consultar" en un producto, se precarga el mensaje del formulario. */

function initProductButtons() {
  const message = $("#contact-message");
  if (!message) return;

  $$("[data-product]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!message.value.trim())
        message.value = `Consulta por: ${button.dataset.product}. `;
    });
  });
}

/* 6. FORMULARIOS ---------------------------------------------------------- */

function isFieldValid(field) {
  const value = field.value.trim();
  switch (field.name) {
    case "name":
    case "city":
      return value.length >= 2;
    case "phone":
      return digitsOnly(value).length >= MIN_PHONE_DIGITS;
    case "businessType":
      return value !== "";
    default:
      return true;
  }
}

function setFieldError(field, hasError) {
  const error = $(`#${field.id}-error`);
  if (!error) return;
  error.hidden = !hasError;
  if (hasError) {
    error.textContent = FIELD_MESSAGES[field.name] || "Revisá este campo.";
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", error.id);
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
}

function buildPayload(form, openedAt) {
  const data = new FormData(form);
  return {
    source: form.dataset.form,
    name: data.get("name"),
    phone: data.get("phone"),
    city: data.get("city"),
    businessType: data.get("businessType") || "",
    message: data.get("message") || "",
    website: data.get("website") || "", // campo trampa anti-spam: debe llegar vacío
    t: Date.now() - openedAt, // tiempo en pantalla, para descartar envíos instantáneos
  };
}

async function sendForm(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SITE_CONFIG.formTimeoutMs);
  try {
    const response = await fetch(SITE_CONFIG.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function showSuccess(form) {
  form.innerHTML =
    '<div class="form-card__done" role="status">' +
    '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' +
    "<h3>¡Gracias!</h3>" +
    "<p>Recibimos tu consulta. Te vamos a contactar en horario de atención.</p>" +
    "</div>";
}

function initForms(openedAt) {
  $$("[data-form]").forEach((form) => {
    const submit = $('button[type="submit"]', form);
    const label = $("[data-submit-label]", form);
    const status = $("[data-form-status]", form);
    const required = $$("[required]", form);

    required.forEach((field) => {
      const revalidate = () => {
        const touched = field.value.trim() !== "";
        const flagged = field.getAttribute("aria-invalid") === "true";
        if (touched || flagged) setFieldError(field, !isFieldValid(field));
      };
      field.addEventListener("blur", () => {
        if (field.value.trim() !== "") revalidate();
      });
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") revalidate();
      });
      field.addEventListener("change", () => {
        if (field.getAttribute("aria-invalid") === "true") revalidate();
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.classList.remove("form-card__status--error");

      const invalid = required.filter((field) => !isFieldValid(field));
      required.forEach((field) =>
        setFieldError(field, invalid.includes(field)),
      );
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const originalLabel = label.textContent;
      submit.disabled = true;
      label.textContent = "Enviando…";

      try {
        await sendForm(buildPayload(form, openedAt));
        showSuccess(form);
      } catch {
        submit.disabled = false;
        label.textContent = originalLabel;
        status.classList.add("form-card__status--error");
        status.textContent = SITE_CONFIG.email
          ? `No pudimos enviar tu consulta. Probá de nuevo o escribinos a ${SITE_CONFIG.email}.`
          : "No pudimos enviar tu consulta. Probá de nuevo.";
      }
    });
  });
}

/* 7. RECETAS (carrusel y modal) ------------------------------------------ */

function initRecipesCarousel() {
  const root = $("[data-carousel]");
  if (!root) return;

  const track = $("[data-carousel-track]", root);
  const prevBtn = $("[data-carousel-prev]", root);
  const nextBtn = $("[data-carousel-next]", root);
  const autoplayBtn = $("[data-carousel-autoplay]", root);
  const autoplayIcon = $("[data-autoplay-icon]", root);
  const cards = $$(".recipe-card", track);
  if (!track || cards.length === 0) return;

  const step = () => {
    const item = cards[0].closest(".carousel__item");
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item.getBoundingClientRect().width + gap;
  };

  const updateButtons = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const overflowing = maxScroll > 1;

    if (prevBtn) {
      prevBtn.hidden = !overflowing;
      prevBtn.disabled = track.scrollLeft <= 1;
    }
    if (nextBtn) {
      nextBtn.hidden = !overflowing;
      nextBtn.disabled = track.scrollLeft >= maxScroll - 1;
    }
    if (autoplayBtn) autoplayBtn.hidden = !overflowing;
  };

  prevBtn?.addEventListener("click", () => {
    track.scrollBy({
      left: -step(),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });
  nextBtn?.addEventListener("click", () => {
    track.scrollBy({
      left: step(),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });

  track.addEventListener("scroll", updateButtons, { passive: true });
  window.addEventListener("resize", updateButtons);
  updateButtons();

  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const focusedIndex = cards.indexOf(document.activeElement);
    if (focusedIndex === -1) return;

    event.preventDefault();
    const nextIndex =
      event.key === "ArrowRight"
        ? Math.min(focusedIndex + 1, cards.length - 1)
        : Math.max(focusedIndex - 1, 0);

    cards[nextIndex].focus();
    cards[nextIndex].scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      inline: "nearest",
      block: "nearest",
    });
  });

  /* Avance automático: una tarjeta cada 4s, se pausa ante cualquier interacción
     y se reanuda unos segundos después de que termina (ver blockers más abajo). */
  const AUTOPLAY_INTERVAL = 2000;
  const RESUME_DELAY = 2000;
  let autoplayTimer = null;
  let resumeTimer = null;
  let userWantsAutoplay = !prefersReducedMotion();
  const blockers = new Set();

  const updateAutoplayButton = () => {
    if (!autoplayBtn) return;
    autoplayBtn.setAttribute("aria-pressed", String(!userWantsAutoplay));
    autoplayBtn.setAttribute(
      "aria-label",
      userWantsAutoplay
        ? "Pausar avance automático"
        : "Reanudar avance automático",
    );
    autoplayBtn.classList.toggle(
      "is-playing",
      userWantsAutoplay && blockers.size === 0,
    );
    if (autoplayIcon)
      autoplayIcon.setAttribute(
        "href",
        userWantsAutoplay ? "#i-pause" : "#i-play",
      );
  };

  const stopTimer = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const tick = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 1) return;
    const atEnd = track.scrollLeft >= maxScroll - 1;
    track.scrollTo({
      left: atEnd ? 0 : track.scrollLeft + step(),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const startTimer = () => {
    stopTimer();
    if (!userWantsAutoplay || blockers.size > 0) return;
    autoplayTimer = setInterval(tick, AUTOPLAY_INTERVAL);
  };

  const pause = (reason) => {
    blockers.add(reason);
    clearTimeout(resumeTimer);
    stopTimer();
    updateAutoplayButton();
  };

  const resume = (reason, delay = 0) => {
    blockers.delete(reason);
    clearTimeout(resumeTimer);
    if (blockers.size > 0) {
      updateAutoplayButton();
      return;
    }
    if (delay > 0) {
      resumeTimer = setTimeout(() => {
        if (blockers.size === 0) startTimer();
      }, delay);
    } else {
      startTimer();
    }
    updateAutoplayButton();
  };

  // Hover, foco y touch se escuchan en la pista (las tarjetas), no en los controles:
  // si no, el propio botón de play quedaría pausándose a sí mismo apenas se lo toca o enfoca.
  track.addEventListener("mouseenter", () => pause("hover"));
  track.addEventListener("mouseleave", () => resume("hover", RESUME_DELAY));
  track.addEventListener("focusin", () => pause("focus"));
  track.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!track.contains(document.activeElement))
        resume("focus", RESUME_DELAY);
    });
  });
  track.addEventListener("pointerdown", () => pause("touch"));
  window.addEventListener("pointerup", () => resume("touch", RESUME_DELAY));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause("hidden");
    else resume("hidden");
  });

  document.addEventListener("recipe-modal:open", () => pause("modal"));
  document.addEventListener("recipe-modal:close", () => resume("modal"));

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) resume("offscreen");
          else pause("offscreen");
        });
      },
      { threshold: 0.3 },
    );
    sectionObserver.observe(root.closest("section") || root);
  }

  autoplayBtn?.addEventListener("click", () => {
    userWantsAutoplay = !userWantsAutoplay;
    if (userWantsAutoplay) startTimer();
    else stopTimer();
    updateAutoplayButton();
  });

  updateAutoplayButton();
  startTimer();
}

const MODAL_MEDIA_SIZES = "(max-width: 700px) 100vw, 640px";

function initRecipeModal() {
  const dialog = $("[data-recipe-modal]");
  if (!dialog) return;

  const media = $("[data-recipe-media]", dialog);
  const content = $("[data-recipe-content]", dialog);
  const closeBtn = $("[data-recipe-close]", dialog);
  let lastTrigger = null;

  const applyMedia = (cardImg) => {
    if (!media || !cardImg) return;
    media.src = cardImg.getAttribute("src") || "";
    const srcset = cardImg.getAttribute("srcset");
    if (srcset) media.setAttribute("srcset", srcset);
    else media.removeAttribute("srcset");
    media.sizes = MODAL_MEDIA_SIZES;
    media.width = cardImg.getAttribute("width") || cardImg.naturalWidth;
    media.height = cardImg.getAttribute("height") || cardImg.naturalHeight;
    media.alt = cardImg.getAttribute("alt") || "";
  };

  const openRecipe = (id, trigger) => {
    const template = document.getElementById(`receta-${id}`);
    if (!template) return;

    const cardImg = $(".recipe-card__media img", trigger);
    applyMedia(cardImg);

    content.innerHTML = "";
    content.appendChild(template.content.cloneNode(true));

    const title = $(".recipe-modal__title", content);
    if (title) dialog.setAttribute("aria-labelledby", title.id);

    lastTrigger = trigger;
    document.body.style.overflow = "hidden";
    document.dispatchEvent(new CustomEvent("recipe-modal:open"));
    dialog.showModal();
  };

  $$("[data-recipe-open]").forEach((button) => {
    button.addEventListener("click", () =>
      openRecipe(button.dataset.recipeOpen, button),
    );
  });

  closeBtn?.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    document.body.style.overflow = "";
    content.innerHTML = "";
    if (media) {
      media.removeAttribute("src");
      media.removeAttribute("srcset");
    }
    document.dispatchEvent(new CustomEvent("recipe-modal:close"));
    lastTrigger?.focus();
    lastTrigger = null;
  });
}

/* 8. NOSOTROS: CAPÍTULOS (patrón WAI-ARIA tabs) --------------------------- */
/* Los 4 paneles están en el HTML (contenido indexable). Los inactivos quedan con
   inert y apilados en la misma celda del grid, así la altura no salta. */

function initChapters() {
  const root = $("[data-chapters]");
  if (!root) return;

  const tablist = $("[data-chapters-tablist]", root);
  const tabs = $$("[data-chapter-tab]", root);
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute("aria-controls")),
  );
  if (!tablist || panels.includes(null)) return;

  const horizontal = window.matchMedia("(max-width: 1000px)");
  const leaveTime = readTime("--chapter-duration");
  let current = Math.max(
    tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"),
    0,
  );

  const syncOrientation = () =>
    tablist.setAttribute(
      "aria-orientation",
      horizontal.matches ? "horizontal" : "vertical",
    );

  // En móvil la fila de pestañas tiene scroll propio: se acomoda sin mover la página
  const scrollTabIntoRow = (tab) => {
    if (!horizontal.matches) return;
    const padding = parseFloat(getComputedStyle(tablist).paddingLeft) || 0;
    tablist.scrollTo({
      left: tab.offsetLeft - padding,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const select = (index, moveFocus) => {
    if (index !== current) {
      const previous = panels[current];
      previous.classList.add("is-leaving");
      setTimeout(() => previous.classList.remove("is-leaving"), leaveTime);
      current = index;
    }
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.classList.toggle("is-active", i === index);
      panel.inert = i !== index;
    });
    if (moveFocus) tabs[index].focus();
    scrollTabIntoRow(tabs[index]);
  };

  tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));

  tablist.addEventListener("keydown", (event) => {
    const last = tabs.length - 1;
    const keys = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowDown: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowUp: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(keys[event.key], true);
  });

  horizontal.addEventListener("change", syncOrientation);
  syncOrientation();
  panels.forEach((panel, i) => {
    panel.inert = i !== current;
  });
  root.classList.add("is-ready");
}

/* 9. ZONAS DE REPARTO (mapa animado y tarjetas de provincia) -------------- */

const MAP_SIZE = Object.freeze({ width: 1600, height: 1000 }); // viewBox de mapa-zonas.svg
const SVG_NS = "http://www.w3.org/2000/svg";

/* Secuencia del mapa: desde Mercedes (carga) hasta cada base, y desde la base
   se reparte a las localidades de las provincias indicadas (por data-province). */
const MAP_SEQUENCE = Object.freeze([
  { from: "mercedes", to: "pigue", provinces: ["buenos-aires"] },
  {
    from: "mercedes",
    to: "neuquen",
    provinces: ["neuquen", "rio-negro", "chubut"],
  },
]);

/* Curvatura de las rutas: el punto de control se corre una fracción de la distancia
   entre los dos puntos. Se prueban en orden y gana la primera que no pasa cerca de
   ninguna etiqueta permanente (Pigüé, Neuquén, Mercedes). Las rutas desde Mercedes van
   hacia el sur; solo si ninguna fracción sirve se prueba el norte (pasa con Pigüé en
   escritorio, donde su etiqueta queda justo en el camino del arco sur). */
const MAP_ROUTE_BENDS = Object.freeze([0.18, 0.15, 0.12]);
// Reparto desde cada base: las curvas más marcadas sirven para salir por debajo de la
// etiqueta de la base (por ejemplo, de Neuquén hacia la cordillera)
const MAP_SPREAD_BENDS = Object.freeze([0.22, 0.15, 0.08, 0.35, 0.5, 0.65]);

function initProvinceCards() {
  const map = $("[data-coverage-map]");
  const cards = $$("[data-province-toggle]");
  if (!map || cards.length === 0) return;

  const points = $$("[data-province]", map);

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const turnOn = card.getAttribute("aria-pressed") !== "true";
      const province = turnOn ? card.dataset.provinceToggle : null;

      cards.forEach((other) =>
        other.setAttribute("aria-pressed", String(turnOn && other === card)),
      );
      map.classList.toggle("has-highlight", Boolean(province));
      points.forEach((point) =>
        point.classList.toggle(
          "is-highlighted",
          point.dataset.province === province,
        ),
      );
      // El mapa decide si puede mostrar los nombres de esa provincia (initCoverageMap)
      map.dispatchEvent(
        new CustomEvent("coverage-map:highlight", { detail: { province } }),
      );
    });
  });
}

/* Rectángulos en px de pantalla */
const rectsTouch = (a, b, gap = 0) =>
  a.left < b.right + gap &&
  a.right > b.left - gap &&
  a.top < b.bottom + gap &&
  a.bottom > b.top - gap;

// Orden en que se prueban los lados: preferido (data-label-pos), contrario,
// perpendiculares y, si nada entra, las diagonales
const TAG_DIAGONALS = ["top-right", "bottom-right", "top-left", "bottom-left"];
const TAG_SIDES = Object.freeze({
  top: ["top", "bottom", "right", "left", ...TAG_DIAGONALS],
  bottom: ["bottom", "top", "right", "left", ...TAG_DIAGONALS],
  left: ["left", "right", "top", "bottom", ...TAG_DIAGONALS],
  right: ["right", "left", "top", "bottom", ...TAG_DIAGONALS],
});

function initCoverageMap() {
  const map = $("[data-coverage-map]");
  const fx = $("[data-map-fx]", map || document);
  const replay = $("[data-map-replay]");
  if (!map || !fx) return;

  const points = new Map(
    $$("[data-place]", map).map((point) => [point.dataset.place, point]),
  );

  /* --- Nombres de localidad (píldoras) --------------------------------- */
  // El nombre sale solo de data-name. Pigüé, Neuquén y Mercedes no llevan píldora:
  // ya tienen su etiqueta permanente con el rol.
  const tagged = [...points.values()].filter(
    (point) => point.dataset.role === "localidad",
  );
  const tags = new Map(
    tagged.map((point) => {
      const tag = document.createElement("span");
      tag.className = "coverage-map__tag";
      tag.setAttribute("aria-hidden", "true");
      tag.textContent = point.dataset.name;
      point.setAttribute("aria-label", point.dataset.name);
      point.append(tag);
      return [point, tag];
    }),
  );
  const permanentLabels = $$(".coverage-map__label", map);
  const tagGap = () => parseFloat(readToken("--map-tag-margin")) || 6;
  const tagRiseOf = () => parseFloat(readToken("--map-tag-rise")) || 6;
  // Rectángulo que ocupa la píldora en toda su animación: entra desde abajo (rise)
  // y sale subiendo media rise
  const travelRect = (rect) => {
    const rise = tagRiseOf();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top - rise / 2,
      bottom: rect.bottom + rise,
    };
  };

  // Prueba los lados en orden (preferido, contrario, perpendiculares) y devuelve los que
  // entran en el mapa sin pisar etiquetas permanentes, con su rectángulo medido.
  const tagOptions = (point) => {
    const tag = tags.get(point);
    const box = map.getBoundingClientRect();
    const margin = tagGap();
    const avoid = permanentLabels.map((label) => label.getBoundingClientRect());
    if (replay && !replay.hidden) avoid.push(replay.getBoundingClientRect());
    const current = tag.dataset.side;

    tag.classList.add("is-measuring");
    const options = [];
    for (const side of TAG_SIDES[point.dataset.labelPos] || TAG_SIDES.top) {
      tag.dataset.side = side;
      tag.className = `coverage-map__tag coverage-map__tag--${side} is-measuring`;
      const rect = travelRect(tag.getBoundingClientRect());
      const inside =
        rect.left >= box.left + margin &&
        rect.right <= box.right - margin &&
        rect.top >= box.top + margin &&
        rect.bottom <= box.bottom - margin;
      if (inside && !avoid.some((other) => rectsTouch(rect, other, 2))) {
        options.push({ side, rect });
      }
    }
    if (current) setSide(point, current);
    tag.classList.remove("is-measuring");
    return options;
  };

  const setSide = (point, side) => {
    const tag = tags.get(point);
    tag.dataset.side = side;
    tag.className = `coverage-map__tag coverage-map__tag--${side}`;
  };

  // Ubicación para hover o foco: el primer lado que entra
  const placeForHover = (point) => {
    if (point.classList.contains("is-tagged")) return;
    const [best] = tagOptions(point);
    setSide(point, best ? best.side : point.dataset.labelPos || "top");
  };
  tags.forEach((_, point) => {
    placeForHover(point);
    point.addEventListener("pointerenter", () => placeForHover(point));
    point.addEventListener("focus", () => placeForHover(point));
  });

  // Provincia activa: se muestran sus nombres solo si ninguno se pisa con otro
  let activeProvince = null;
  const showProvinceTags = () => {
    tags.forEach((_, point) => point.classList.remove("is-tagged"));
    if (!activeProvince) return;
    const group = tagged.filter(
      (point) => point.dataset.province === activeProvince,
    );
    const placed = [];
    for (const point of group) {
      const option = tagOptions(point).find(
        ({ rect }) =>
          !placed.some((other) => rectsTouch(rect, other, tagGap())),
      );
      if (!option) return; // hay riesgo de superposición: solo hover y foco
      placed.push(option.rect);
      setSide(point, option.side);
    }
    group.forEach((point) => point.classList.add("is-tagged"));
  };
  map.addEventListener("coverage-map:highlight", (event) => {
    activeProvince = event.detail.province;
    showProvinceTags();
  });
  window.addEventListener("resize", showProvinceTags);

  /* --- Geometría de rutas ----------------------------------------------- */

  // Posición de cada punto en coordenadas del viewBox, a partir de --x / --y del CSS
  const positionOf = (place) => {
    const style = getComputedStyle(points.get(place));
    return {
      x: (parseFloat(style.getPropertyValue("--x")) / 100) * MAP_SIZE.width,
      y: (parseFloat(style.getPropertyValue("--y")) / 100) * MAP_SIZE.height,
    };
  };

  // Curva cuadrática en coordenadas del viewBox (las mismas de la imagen base y de los
  // puntos en %). El control se corre en perpendicular, bend = fracción de la distancia.
  // side = 1 arquea hacia el sur; -1, hacia el norte.
  const curve = (a, b, bend, side = 1) => {
    let nx = a.y - b.y;
    let ny = b.x - a.x;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return {
      a,
      b,
      c: {
        x: (a.x + b.x) / 2 + nx * bend * side,
        y: (a.y + b.y) / 2 + ny * bend * side,
      },
    };
  };
  const pathOf = ({ a, b, c }) => `M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;

  // Distancia mínima (en px de pantalla) entre una curva y las etiquetas permanentes
  const clearance = ({ a, b, c }) => {
    const box = map.getBoundingClientRect();
    const scale = MAP_SIZE.width / box.width; // px de pantalla -> unidades del viewBox
    const labels = $$(".coverage-map__label", map).map((label) => {
      const r = label.getBoundingClientRect();
      return {
        left: (r.left - box.left) * scale,
        right: (r.right - box.left) * scale,
        top: (r.top - box.top) * scale,
        bottom: (r.bottom - box.top) * scale,
      };
    });
    let min = Infinity;
    for (let i = 0; i <= 96; i++) {
      const t = i / 96;
      const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x;
      const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y;
      labels.forEach((r) => {
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        min = Math.min(min, Math.hypot(dx, dy) / scale);
      });
    }
    return min;
  };

  // Primera curva (por lado y fracción) que deja el margen libre; si ninguna, la que más se aleja
  const safeCurve = (a, b, bends, sides) => {
    const margin = parseFloat(readToken("--map-route-clearance")) || 8;
    let best = null;
    for (const side of sides) {
      for (const bend of bends) {
        const candidate = curve(a, b, bend, side);
        const free = clearance(candidate);
        if (free >= margin) return candidate;
        if (!best || free > best.free) best = { candidate, free };
      }
    }
    return best.candidate;
  };

  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) =>
      el.setAttribute(key, value),
    );
    return el;
  };

  // Capa de puntitos, estelas y ondas. Las rutas no se dibujan: solo se calcula su trazado.
  const layer = svgEl("g", {});
  fx.append(layer);

  // Animaciones creadas con WAAPI (no las de CSS, como la pulsación de provincia)
  const scriptedAnimations = () =>
    map
      .getAnimations({ subtree: true })
      .filter((anim) => anim.constructor === Animation);

  const showFinalState = () => {
    scriptedAnimations().forEach((anim) => anim.cancel());
    layer.replaceChildren();
    points.forEach((point) =>
      point.classList.remove("is-pending", "is-announcing"),
    );
    map.classList.remove("is-staged");
  };

  // Sin movimiento: no hay secuencia ni nombres automáticos; solo hover y foco
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    showFinalState();
    return;
  }

  const timing = {
    travel: readTime("--map-travel-duration"),
    spread: readTime("--map-spread-duration"),
    stagger: readTime("--map-spread-stagger"),
    ripple: readTime("--map-ripple-duration"),
    tagIn: readTime("--map-tag-in"),
    tagHold: readTime("--map-tag-hold"),
    tagOut: readTime("--map-tag-out"),
  };
  timing.tag = timing.tagIn + timing.tagHold + timing.tagOut;
  const tagEase = readToken("--map-tag-ease") || "ease-out";
  const tagRise = tagRiseOf();
  const trail = {
    dots: Math.round(parseFloat(readToken("--map-trail-dots")) || 6),
    gap: readTime("--map-trail-gap"),
    opacity: parseFloat(readToken("--map-trail-opacity")) || 0.5,
  };
  // Tamaños en px de pantalla, pasados a unidades del viewBox según el ancho actual
  const toUnits = (token) =>
    (parseFloat(readToken(token)) * MAP_SIZE.width) /
    map.getBoundingClientRect().width;

  // Toda animación pasa por acá: si la pestaña está oculta, arranca en pausa
  const animate = (el, keyframes, options) => {
    const anim = el.animate(keyframes, { fill: "both", ...options });
    if (document.hidden) anim.pause();
    return anim;
  };
  const done = (anim) =>
    anim.finished.then(
      () => true,
      () => false, // cancelada (por "Ver de nuevo")
    );

  // Punto que viaja por una curva (getPointAtLength), animando solo transform y opacity
  const travel = (d, { duration, delay = 0, size }) => {
    const path = svgEl("path", { d, fill: "none", visibility: "hidden" });
    layer.append(path);
    const length = path.getTotalLength();
    const steps = 36;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const { x, y } = path.getPointAtLength((length * i) / steps);
      return {
        transform: `translate(${x}px, ${y}px)`,
        opacity: i === 0 || i === steps ? 0 : 1,
      };
    });
    path.remove();

    const radius = toUnits(size) / 2;
    const easing = "cubic-bezier(0.45, 0, 0.25, 1)";

    // Estela: circulitos que siguen la misma trayectoria un poco más tarde,
    // cada uno más chico y más tenue; se van solos al terminar
    for (let k = trail.dots; k >= 1; k--) {
      const fade = 1 - k / (trail.dots + 1);
      const ghost = svgEl("circle", {
        class: "coverage-map__trail",
        r: radius * (0.35 + 0.5 * fade),
      });
      ghost.style.willChange = "transform, opacity";
      layer.append(ghost);
      const ghostFrames = frames.map((frame) => ({
        ...frame,
        opacity: frame.opacity * trail.opacity * fade,
      }));
      done(
        animate(ghost, ghostFrames, {
          duration,
          delay: delay + k * trail.gap,
          easing,
        }),
      ).then(() => ghost.remove());
    }

    const dot = svgEl("circle", { class: "coverage-map__traveler", r: radius });
    dot.style.willChange = "transform, opacity";
    layer.append(dot);
    const anim = animate(dot, frames, { duration, delay, easing });
    return done(anim).then((finished) => {
      dot.remove();
      return finished;
    });
  };

  // Onda que se expande desde un punto
  const ripple = (place, { size, duration, delay = 0 }) => {
    const { x, y } = positionOf(place);
    const ring = svgEl("circle", {
      class: "coverage-map__ripple",
      cx: x,
      cy: y,
      r: toUnits(size) / 2,
    });
    ring.style.willChange = "transform, opacity";
    layer.append(ring);
    const anim = animate(
      ring,
      [
        { transform: "scale(0.15)", opacity: 0.95 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { duration, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    return done(anim).then(() => ring.remove());
  };

  // Nombre que aparece al llegar el puntito: sube con fade, queda y se desvanece.
  // Sin fill: al terminar vuelve al estado de CSS (oculto, o visible si hay hover/foco).
  const announce = (point) => {
    const tag = tags.get(point);
    point.classList.add("is-announcing");
    const anim = animate(
      tag,
      [
        { opacity: 0, transform: `translateY(${tagRise}px)`, easing: tagEase },
        { opacity: 1, transform: "none", offset: timing.tagIn / timing.tag },
        {
          opacity: 1,
          transform: "none",
          offset: (timing.tagIn + timing.tagHold) / timing.tag,
          easing: "ease-in",
        },
        { opacity: 0, transform: `translateY(${-tagRise / 2}px)` },
      ],
      { duration: timing.tag, fill: "none" },
    );
    return done(anim).then(() => point.classList.remove("is-announcing"));
  };

  /* Escalonado de llegadas: cada nombre ocupa una ventana [llegada, llegada + tag].
     Si en el lado elegido se pisaría con otro nombre visible en ese momento, se prueba
     otro lado; si ninguno sirve, se corre la llegada (y la salida del puntito) justo
     hasta que el otro nombre terminó. Se calcula con las medidas del ancho actual. */
  const scheduleTags = (plan) => {
    const booked = [];
    const margin = tagGap();
    const clashAt = (rect, start) =>
      booked.find(
        (other) =>
          rectsTouch(rect, other.rect, margin) &&
          start < other.end &&
          other.start < start + timing.tag,
      );
    [...plan]
      .sort((a, b) => a.arrival - b.arrival)
      .forEach((item) => {
        const options = tagOptions(item.point);
        if (options.length === 0) {
          const rect = travelRect(tags.get(item.point).getBoundingClientRect());
          options.push({ side: item.point.dataset.labelPos, rect });
        }
        // Para cada lado posible, el primer momento libre; gana el que aparece antes
        let choice = null;
        let start = Infinity;
        options.forEach((option) => {
          let at = item.arrival;
          let clash = clashAt(option.rect, at);
          while (clash) {
            at = clash.end;
            clash = clashAt(option.rect, at);
          }
          if (at < start) {
            start = at;
            choice = option;
          }
        });
        item.delay += start - item.arrival;
        item.arrival = start;
        item.side = choice.side;
        booked.push({ rect: choice.rect, start, end: start + timing.tag });
      });
    return plan;
  };

  const light = (place) => points.get(place).classList.remove("is-pending");

  let runId = 0;

  const play = async () => {
    const id = ++runId;
    const alive = () => id === runId;

    showFinalState();
    map.classList.add("is-staged");
    points.forEach((point, place) =>
      point.classList.toggle("is-pending", place !== MAP_SEQUENCE[0].from),
    );
    const endings = []; // nombres y ondas: el estado final espera a que terminen

    for (const [index, step] of MAP_SEQUENCE.entries()) {
      const hub = positionOf(step.to);
      const pause = index === 0 ? 0 : timing.stagger * 3;

      // 1 y 3. Desde Mercedes hasta la base, por una curva hacia el sur que esquiva las etiquetas
      const route = safeCurve(
        positionOf(step.from),
        hub,
        MAP_ROUTE_BENDS,
        [1, -1],
      );
      const arrived = await travel(pathOf(route), {
        duration: timing.travel,
        delay: pause,
        size: "--map-fx-dot-size",
      });
      if (!arrived || !alive()) return;

      // La base solo hace su onda: su etiqueta permanente ya dice el rol
      light(step.to);
      ripple(step.to, { size: "--map-ripple-size", duration: timing.ripple });
      ripple(step.to, {
        size: "--map-ripple-size",
        duration: timing.ripple,
        delay: timing.stagger * 2,
      });

      // 2 y 4. Desde la base se desparraman puntitos a cada localidad, de la más cercana a la más lejana
      const plan = tagged
        .filter((point) => step.provinces.includes(point.dataset.province))
        .map((point) => {
          const place = point.dataset.place;
          const target = positionOf(place);
          return {
            point,
            place,
            target,
            distance: Math.hypot(target.x - hub.x, target.y - hub.y),
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .map((item, order) => {
          // Más lejos, más tiempo de viaje; el retraso combina orden y distancia
          const duration = Math.min(
            Math.max(
              timing.spread * (0.55 + item.distance / 500),
              timing.spread * 0.6,
            ),
            timing.spread * 1.8,
          );
          const delay =
            timing.ripple * 0.25 +
            order * timing.stagger +
            ((item.distance * 7) % timing.stagger);
          return { ...item, order, duration, delay, arrival: delay + duration };
        });
      scheduleTags(plan);

      await Promise.all(
        plan.map(({ point, place, target, order, duration, delay, side }) => {
          setSide(point, side);
          const arcSide = order % 2 ? 1 : -1;
          const spread = safeCurve(hub, target, MAP_SPREAD_BENDS, [
            arcSide,
            -arcSide,
          ]);
          return travel(pathOf(spread), {
            duration,
            delay,
            size: "--map-fx-spark-size",
          }).then((finished) => {
            if (!finished || !alive()) return;
            // Llegada: se enciende el punto, pulsa y aparece su nombre, todo a la vez
            light(place);
            endings.push(
              ripple(place, {
                size: "--map-pulse-size",
                duration: timing.ripple * 0.7,
              }),
              announce(point),
            );
          });
        }),
      );
      if (!alive()) return;
    }

    // 5. Estado final: cuando terminaron los últimos nombres, todo encendido y rutas tenues
    await Promise.all(endings);
    if (!alive()) return;
    showFinalState();
    if (replay) replay.hidden = false;
  };

  // Pestaña oculta: se pausa todo lo que está corriendo (puntitos, ondas y nombres)
  document.addEventListener("visibilitychange", () => {
    scriptedAnimations().forEach((anim) => {
      if (document.hidden && anim.playState === "running") anim.pause();
      else if (!document.hidden && anim.playState === "paused") anim.play();
    });
  });

  replay?.addEventListener("click", play);

  // Arranca apagado y se reproduce una sola vez, al entrar el mapa en pantalla
  map.classList.add("is-staged");
  points.forEach((point, place) =>
    point.classList.toggle("is-pending", place !== MAP_SEQUENCE[0].from),
  );
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      play();
    },
    { threshold: 0.4 },
  );
  observer.observe(map);
}

/* 10. INICIO -------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const openedAt = Date.now();

  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  initContactInfo();
  initMobileMenu();
  initScrollSpy();
  initProductButtons();
  initForms(openedAt);
  initRecipesCarousel();
  initRecipeModal();
  initReveal();
  initChapters();
  initProvinceCards();
  initCoverageMap();
});
