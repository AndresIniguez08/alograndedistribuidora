/* ==========================================================================
   A lo grande · Comportamiento del sitio

   Índice
   1. Configuración (lo único que se edita para cambiar datos)
   2. Utilidades
   3. Datos de contacto
   4. Navegación (menú móvil y sección activa)
   5. Botones "Consultar"
   6. Formularios
   7. Recetas (carrusel, modal y aparición al scroll)
   8. Inicio
   ========================================================================== */

"use strict";

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

/* 7. RECETAS (carrusel, modal y aparición al scroll) ---------------------- */

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const RESUME_DELAY = 3000;
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

function initRecipeReveal() {
  const cards = $$(".recipe-card");
  if (cards.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
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
    { threshold: 0.2 },
  );
  cards.forEach((card) => observer.observe(card));
}

/* 8. INICIO --------------------------------------------------------------- */

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
  initRecipeReveal();
});
