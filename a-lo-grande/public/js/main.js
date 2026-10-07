/* ==========================================================================
   A lo grande · Comportamiento del sitio

   Índice
   1. Configuración (lo único que se edita para cambiar datos)
   2. Utilidades
   3. Datos de contacto
   4. Navegación (menú móvil y sección activa)
   5. Botones "Consultar"
   6. Formularios
   7. Inicio
   ========================================================================== */

"use strict";


/* 1. CONFIGURACIÓN -------------------------------------------------------- */
/* Los campos vacíos no se muestran en el sitio. */

const SITE_CONFIG = Object.freeze({
  email: "contacto@alograndedistribuidora.com.ar",
  phone: "",       // ejemplo: "+54 9 2923 00 0000"
  whatsapp: "",    // solo dígitos con código de país, ejemplo: "5492923000000"
  instagram: "",   // usuario sin @, ejemplo: "alogrande"
  hours: "",       // ejemplo: "Lunes a viernes, de 8 a 17 h"
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
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
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

  show("email", email, (el) => { el.textContent = email; el.href = `mailto:${email}`; });
  show("phone", phone, (el) => { el.textContent = phone; el.href = `tel:${phone.replace(/[^\d+]/g, "")}`; });
  show("whatsapp", whatsapp, (el) => { el.href = `https://wa.me/${digitsOnly(whatsapp)}`; });
  show("instagram", instagram, (el) => { el.textContent = `@${instagram}`; el.href = `https://www.instagram.com/${instagram}`; });
  show("hours", hours, (el) => { el.textContent = hours; });

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

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
}

function initScrollSpy() {
  const links = $$(".nav__link");
  const setActive = (id) => {
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  setActive("inicio");
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); }),
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
      if (!message.value.trim()) message.value = `Consulta por: ${button.dataset.product}. `;
    });
  });
}


/* 6. FORMULARIOS ---------------------------------------------------------- */

function isFieldValid(field) {
  const value = field.value.trim();
  switch (field.name) {
    case "name":
    case "city": return value.length >= 2;
    case "phone": return digitsOnly(value).length >= MIN_PHONE_DIGITS;
    case "businessType": return value !== "";
    default: return true;
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
    website: data.get("website") || "",     // campo trampa anti-spam: debe llegar vacío
    t: Date.now() - openedAt,               // tiempo en pantalla, para descartar envíos instantáneos
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
      field.addEventListener("blur", () => { if (field.value.trim() !== "") revalidate(); });
      field.addEventListener("input", () => { if (field.getAttribute("aria-invalid") === "true") revalidate(); });
      field.addEventListener("change", () => { if (field.getAttribute("aria-invalid") === "true") revalidate(); });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.classList.remove("form-card__status--error");

      const invalid = required.filter((field) => !isFieldValid(field));
      required.forEach((field) => setFieldError(field, invalid.includes(field)));
      if (invalid.length) { invalid[0].focus(); return; }

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


/* 7. INICIO --------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const openedAt = Date.now();

  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  initContactInfo();
  initMobileMenu();
  initScrollSpy();
  initProductButtons();
  initForms(openedAt);
});
