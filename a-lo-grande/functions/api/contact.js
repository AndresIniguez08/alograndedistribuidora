// Cloudflare Pages Function: recibe el formulario y lo envía por mail con Resend.
// Variables de entorno necesarias (Settings > Variables and Secrets en Cloudflare Pages):
//   RESEND_API_KEY  -> clave de API de Resend (como secreto)
//   CONTACT_TO      -> casilla que recibe las consultas, ej. contacto@alograndedistribuidora.com.ar
//   CONTACT_FROM    -> remitente verificado en Resend, ej. "A lo grande <consultas@alograndedistribuidora.com.ar>"

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const clean = (v, max) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  // Solo se aceptan envíos del propio sitio
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);

  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  // Anti-spam: campo trampa y envíos demasiado rápidos se descartan sin avisar
  if (data.website) return json({ ok: true });
  if (typeof data.t === "number" && data.t < 2500) return json({ ok: true });

  const name = clean(data.name, 120);
  const phone = clean(data.phone, 40);
  const city = clean(data.city, 120);
  const businessType = clean(data.businessType, 80);
  const source = clean(data.source, 40) || "web";
  const message = String(data.message ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, 2000);

  if (name.length < 2 || phone.replace(/\D/g, "").length < 8 || city.length < 2) {
    return json({ ok: false, error: "invalid" }, 422);
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ ok: false, error: "not_configured" }, 500);
  }

  const text = [
    "Nueva consulta desde el sitio (" + (source === "hero" ? "formulario de inicio" : "formulario de contacto") + ")",
    "",
    "Nombre: " + name,
    "Teléfono: " + phone,
    "Localidad: " + city,
    businessType ? "Tipo de negocio: " + businessType : null,
    message ? "\nMensaje:\n" + message : null,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        subject: "Nueva consulta web: " + name + " (" + city + ")",
        text,
      }),
    });
    if (!res.ok) return json({ ok: false, error: "send_failed" }, 502);
  } catch {
    return json({ ok: false, error: "send_failed" }, 502);
  }
  return json({ ok: true });
}
