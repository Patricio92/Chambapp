import { pricing, visitPrice } from "./config.js";
import {
  services,
  labels,
  createJob,
  transition,
  claimLabels,
} from "./model.js";
import { paymentLabels } from "./payments.js";
import {
  boroughs,
  postalRecord,
  postalCodes,
  validLocation,
} from "./location.js";
import { loadState, saveState } from "./storage.js";
import { canServe, isBusy } from "./broker.js";
import { trustScore, verified, proTier, verificationNames } from "./trust.js";
import { readPhotos } from "./photos.js";

const app = document.querySelector("#app");
let state,
  role = "client",
  page = "home",
  selected = "Plomería",
  notice = "",
  detailId = null,
  requestReview = null,
  registering = false,
  editingPro = false,
  busy = false;
let search = "",
  category = "",
  allServices = false;
const drafts = {},
  uploads = {};
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n || 0,
  );
const date = (n) =>
  n
    ? new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Mexico_City",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(n)
    : "Sin fecha registrada";
const norm = (v) =>
  String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const categories = [...new Set(services.map((s) => s.category))];
const actor = () =>
  state[
    role === "pro" ? "professionals" : role === "admin" ? "admins" : "clients"
  ].find((a) => a.id === state.active[role]);
const opt = (v, current, label = v) =>
  `<option value="${esc(v)}" ${String(v) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
const field = (name, label, value = "", type = "text", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const textarea = (name, label, value = "", extra = "") =>
  `<label>${label}<textarea name="${name}" ${extra}>${esc(value)}</textarea></label>`;
const action = (name, label, id, cls = "") =>
  `<button type="button" class="${cls}" data-action="${name}" data-id="${id}">${label}</button>`;
function preserve() {
  for (const form of app.querySelectorAll("form[data-form]")) {
    const key = form.dataset.draft || form.dataset.form;
    const data = Object.fromEntries(new FormData(form));
    for (const checkbox of form.querySelectorAll(
      'input[type="checkbox"][name]',
    ))
      data[checkbox.name] = checkbox.checked;
    drafts[key] = { ...drafts[key], ...data };
  }
}
function photos(list = [], caption = "Fotografías") {
  return list.length
    ? `<div class="photos" aria-label="${esc(caption)}">${list.map((p) => `<figure><a href="${p.dataURL}" data-view-photo aria-label="Ver fotografía completa"><img src="${p.dataURL}" alt="${esc(p.name || caption)}" loading="lazy"></a><figcaption>${esc(p.name || caption)}</figcaption></figure>`).join("")}</div>`
    : '<p class="hint">Sin fotografías adjuntas.</p>';
}
function upload(key, label = "Fotografías (opcional)") {
  return `<label class="upload-label">${label}<input type="file" data-upload="${key}" accept="image/jpeg,image/png,image/webp" multiple><small>Hasta 5 fotos JPG, PNG o WebP. Se guardan en este navegador.</small></label><div data-preview="${key}">${photos(uploads[key] || [])}${uploads[key]?.length ? `<button type="button" class="text-button" data-clear-photos="${key}">Quitar fotografías seleccionadas</button>` : ""}</div>`;
}
function serviceOptions(value) {
  return categories
    .map(
      (c) =>
        `<optgroup label="${esc(c)}">${services
          .filter((s) => s.category === c)
          .map((s) => opt(s.name, value))
          .join("")}</optgroup>`,
    )
    .join("");
}
function locationFields(value = {}, prefix = "request") {
  const record = postalRecord(value.cp);
  return `<div class="location-fields"><label>Alcaldía<select name="borough" required><option value="">Elige tu alcaldía</option>${boroughs.map((b) => opt(b, value.borough)).join("")}</select></label><label>Código postal<input name="cp" value="${esc(value.cp)}" list="${prefix}-codes" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="Ej. 06700" required><datalist id="${prefix}-codes">${postalCodes(
    value.borough,
  )
    .map(
      (r) => `<option value="${r.cp}">${esc(r.colonies.join(", "))}</option>`,
    )
    .join(
      "",
    )}</datalist></label><p class="hint location-help" role="status">${record ? "Selecciona tu colonia." : "Escribe tu código postal para encontrar tu colonia."}</p><label>Colonia o asentamiento<select name="colony" required ${record ? "" : "disabled"}><option value="">Elige tu colonia</option>${(record?.colonies || []).map((c) => opt(c, value.colony)).join("")}</select></label><small class="hint">Catálogo postal histórico SEPOMEX · abril de 2016.</small></div>`;
}
function trustProfile(profile, compact = false) {
  if (!profile) return "";
  const metric = trustScore(profile, state.jobs),
    v = verified(profile),
    tier = proTier(profile, state.jobs);
  return `<div class="professional-trust"><div class="profile-line"><span class="avatar">${esc(profile.name.charAt(0))}</span><div><b>${esc(profile.name)}</b><small>${esc(profile.service)} · perfil de demostración</small></div></div><div class="badges">${v ? '<span class="verified-badge">✓ Profesional Verificado Chambapp <small>Simulado</small></span>' : '<span class="badge">Verificación pendiente · demo</span>'}${tier ? '<span class="pro-badge">Chambapp Pro · demo</span>' : ""}</div><div class="score"><b>${metric.label} ${metric.score}/100</b><span>Chambapp Score · provisional</span></div>${
    compact
      ? ""
      : `<div class="verification-grid">${Object.entries(verificationNames)
          .map(
            ([key, name]) =>
              `<span>${profile.verification?.[key] ? "✓" : "○"} ${name} <small>${profile.verification?.[key] ? "Simulado" : "Pendiente"}</small></span>`,
          )
          .join(
            "",
          )}</div><div class="profile-stats"><div><b>${metric.completed}</b><span>Servicios realizados</span></div><div><b>${metric.ratingCount ? metric.average.toFixed(1) + "/5" : "Sin reseñas"}</b><span>Calificación promedio</span></div><div><b>${Math.round(metric.punctuality * 100)}%</b><span>Puntualidad · demo</span></div></div><p class="hint">El score considera calificación, servicios terminados, cancelaciones, reclamaciones, puntualidad y cotizaciones aceptadas. El historial de ejemplo y las verificaciones no son comprobaciones reales.</p>`
  }</div>`;
}
function empty(title, description) {
  return `<div class="empty"><span>⌂</span><h3>${title}</h3><p>${description}</p></div>`;
}
function accountBar() {
  const group =
    state[
      role === "pro" ? "professionals" : role === "admin" ? "admins" : "clients"
    ];
  return `<div class="account-bar">${group.length ? `<label>Cuenta de demostración<select data-account>${group.map((a) => opt(a.id, state.active[role], a.name)).join("")}</select></label>` : "<p>Primero crea tu cuenta de cliente.</p>"}<button class="secondary" type="button" data-register>${role === "pro" ? "Registrar profesional" : "Crear cuenta"}</button></div>`;
}
function registration() {
  const d = drafts.register || (editingPro ? actor() : {}) || {};
  return `<section class="page-heading"><span class="eyebrow">BIENVENIDO A CHAMBAPP</span><h1>${editingPro ? "Tu perfil profesional" : "Tu confianza empieza aquí"}<em>.</em></h1><p>Registro local para recorrer la experiencia. No se verificará tu identidad ni se enviarán mensajes.</p></section><form data-form="register" class="panel registration">${field("name", "Tu nombre", d.name, "text", 'required maxlength="80"')}${field("email", "Correo electrónico", d.email, "email", 'required maxlength="150" autocomplete="email"')}${field("phone", "Teléfono", d.phone, "tel", 'required pattern="[0-9 +()-]{10,20}" maxlength="20"')}${role === "pro" ? `<label>Especialidad<select name="service">${serviceOptions(d.service || selected)}</select></label>${locationFields(d, "profile")}<label class="checkbox"><input type="checkbox" name="allBoroughs" ${d.allBoroughs ? "checked" : ""}> Ofrecer servicios en todas las alcaldías (demo)</label>` : ""}<button>${editingPro ? "Guardar mi perfil" : "Crear mi cuenta de demostración"}</button><button type="button" class="secondary" data-cancel-register>Volver</button></form>`;
}
function cards() {
  const filtered = services.filter(
    (s) =>
      (!category || s.category === category) &&
      norm(s.name + " " + s.description).includes(norm(search)),
  );
  const shown =
    allServices || search || category ? filtered : filtered.slice(0, 6);
  return `<p class="hint" role="status">${filtered.length} servicios disponibles</p><div class="services">${shown.map((s) => `<button class="service ${selected === s.name ? "selected" : ""}" data-service="${esc(s.name)}" aria-pressed="${selected === s.name}"><span class="service-icon">${s.icon}</span><span><b>${esc(s.name)}</b><small>${esc(s.description)}</small></span><span class="select-circle">${selected === s.name ? "✓" : "→"}</span></button>`).join("") || "<p>No encontramos ese servicio. Prueba otra palabra.</p>"}</div>${!allServices && !search && !category ? `<button class="secondary catalog-more" data-show-services>Ver los ${services.length} servicios</button>` : ""}`;
}
function home() {
  const d = drafts.request || {};
  return `<section class="hero"><div><span class="eyebrow">SERVICIOS PARA TU HOGAR · CIUDAD DE MÉXICO</span><h1>Una mano, justo<br><em>cuando la necesitas.</em></h1><p class="hero-promise">Profesionales verificados.<br>Precio aprobado. Trabajo protegido.</p><a class="button" href="#request">Solicitar un servicio →</a><p class="hint">Verificaciones, pagos y garantías simulados en este MVP.</p></div><div class="confidence-card"><span class="shield-icon">✓</span><h2>Tu hogar merece confianza.</h2><p>Servicios para tu hogar con profesionales verificados, precio aprobado, pago protegido y garantía.</p><ul><li>✓ Tú apruebas el precio antes de reparar</li><li>✓ El pago se libera cuando tú confirmas</li><li>✓ Evidencia y respaldo en tu historial</li></ul><span class="demo-chip">Experiencia de demostración</span></div></section><section class="trust-strip"><div><b>Profesionales verificados</b><span>Indicadores y Chambapp Score · demo</span></div><div><b>Pago Protegido Chambapp</b><span>Sin cobros reales</span></div><div><b>Garantía Chambapp</b><span>7 días de mano de obra · simulados</span></div></section><section class="service-section"><div class="section-heading"><div><span class="eyebrow">ELIGE LO QUE NECESITAS</span><h2>¿Cómo podemos ayudarte?</h2></div></div><div class="catalog-controls"><label>Buscar servicio<input type="search" data-search value="${esc(search)}" placeholder="Ej. plomería, electricidad, pintura"></label><label>Categoría<select data-category><option value="">Todas las categorías</option>${categories.map((c) => opt(c, category)).join("")}</select></label></div><div id="service-results">${cards()}</div></section><section id="request" class="request-section"><div><span class="eyebrow">CLARIDAD DESDE EL PRIMER PASO</span><h2>Cuéntanos qué sucede.<br>Tú mantienes el control.</h2><div class="visit-price"><small>Visita de diagnóstico</small><strong>${money(pricing.diagnosticBase)} MXN</strong><p>La reparación se cotiza por separado. Tú decides si continuar.</p><p>Si aceptas, ${money(pricing.diagnosticBase)} se descuenta del total de la reparación.</p></div><div class="assurance"><b>No se realizará ningún trabajo adicional sin tu aprobación.</b></div><h3>Protección Chambapp</h3><p class="hint">Concepto futuro de protección contra daños accidentales. No existe un seguro real en este prototipo.</p>${!actor() ? "<button data-register>Crear mi cuenta de cliente</button>" : ""}</div><form data-form="request" class="panel"><h3>Solicitar un servicio</h3><label>Servicio<select name="service">${serviceOptions(d.service || selected)}</select></label>${locationFields(d)}${field("address", "Domicilio o referencia (opcional)", d.address, "text", 'maxlength="250" placeholder="Usa una dirección de prueba"')}${textarea("problem", "Describe el problema", d.problem, 'required minlength="10" maxlength="3000" placeholder="¿Qué sucede y desde cuándo?"')}${upload("request", "Fotografías del problema (opcional)")}<label class="checkbox urgent-option"><input type="checkbox" name="urgent" ${d.urgent ? "checked" : ""}> Necesito atención urgente</label><p class="hint">La urgencia no cambia la tarifa base en esta demostración. Las tarifas futuras se mostrarán antes de confirmar.</p><button>Revisar solicitud y precio →</button></form></section>`;
}
function reviewRequest() {
  const r = requestReview;
  const amount = r.visitQuote.amount;
  return `<section class="page-heading"><span class="eyebrow">ANTES DE CONFIRMAR</span><h1>Sin sorpresas<em>.</em></h1><p>Revisa tu solicitud y el precio de la visita.</p></section><div class="detail-layout"><section class="panel"><h2>${esc(r.service)}</h2><p>${esc(r.problem)}</p><p>${esc(r.colony)} · ${esc(r.borough)} · CP ${esc(r.cp)}</p>${r.address ? `<p>${esc(r.address)}</p>` : ""}${r.urgent ? '<span class="urgent-badge">Atención urgente</span>' : ""}${photos(r.photos)}</section><section class="panel"><div class="visit-price"><small>Visita de diagnóstico</small><strong>${money(amount)} MXN</strong></div><p>La reparación se cotiza por separado. Tú decides si continuar.</p><p>${money(amount)} se descuenta del total si aceptas la reparación.</p><p class="hint">Confirmar registra la visita; el pago se simula en el siguiente paso. No se cobra dinero real.</p><button data-confirm-request>Confirmar visita de ${money(amount)} MXN</button><button class="secondary" data-edit-request>Editar solicitud</button></section></div>`;
}
function summary(j) {
  return `<article class="job"><div class="job-top"><span class="service-tag">${esc(j.service)}</span><span class="status ${j.status}">${labels[j.status] || esc(j.status)}</span></div>${j.urgent ? '<span class="urgent-badge">Atención urgente</span>' : ""}<h3>${esc(j.colony)}</h3><p>${esc(j.problem)}</p><small>${date(j.created)} · ${esc(j.borough)}</small><p class="hint">${esc(j.professional?.name || "Buscando un profesional compatible")}${j.payment ? " · " + paymentLabels[j.payment.state] : ""}</p><button class="secondary" data-detail="${j.id}">Ver servicio e historial →</button></article>`;
}
function myJobs() {
  const a = actor();
  if (!a) return [];
  if (role === "pro")
    return state.jobs.filter((j) => j.professional?.id === a.id);
  return state.jobs.filter((j) => j.client?.id === a.id);
}
function history() {
  const list = myJobs();
  return `<section class="page-heading"><span class="eyebrow">TU HISTORIAL CHAMBAPP</span><h1>Mis servicios<em>.</em></h1><p>Precio, evidencia, pago y garantía, en un mismo lugar.</p></section>${accountBar()}<div class="jobs">${list.length ? [...list].reverse().map(summary).join("") : empty("Tu historial empieza con la primera solicitud", "Solicita un servicio para recorrer la experiencia de Chambapp.")}</div>`;
}
function professional() {
  const a = actor();
  if (!a) return registration();
  const mine = myJobs(),
    available = state.jobs
      .filter(
        (j) =>
          j.status === "pending" &&
          (j.visitPayment?.state === "protected" || j.visit?.legacy) &&
          canServe(j, a, state.jobs),
      )
      .sort(
        (x, y) => Number(y.urgent) - Number(x.urgent) || x.created - y.created,
      );
  return `<section class="page-heading"><span class="eyebrow">ESPACIO DEL PROFESIONAL</span><h1>Hola, ${esc(a.name.split(" ")[0])}<em>.</em></h1><p>Tu trabajo habla por ti. La evidencia y el precio claro construyen confianza.</p></section>${accountBar()}<div class="detail-layout"><section class="panel">${trustProfile(a)}<div class="actions"><button class="secondary" data-edit-pro>Editar mi perfil</button><button class="secondary" data-verify>Simular verificaciones</button><button class="secondary" data-availability>${a.available === false ? "Activarme" : "Pausar solicitudes"}</button></div></section><section class="panel"><h2>Trabajo protegido, paso a paso</h2><ol class="steps"><li>Diagnostica y presenta una cotización formal</li><li>Espera la aprobación y el pago simulado del cliente</li><li>Documenta el antes, durante y después</li><li>El cliente confirma y libera el pago</li></ol><p class="hint">${isBusy(a, state.jobs) ? "Tienes un trabajo activo. Termínalo antes de aceptar otro." : "Disponible para nuevas solicitudes."}</p></section></div><h2 class="spaced">Solicitudes para ti <span class="count">${available.length}</span></h2><p class="hint">Coinciden con tu especialidad y cobertura de demostración. Las urgentes aparecen primero. No hay mapas reales.</p><div class="jobs">${available.length ? available.map(summary).join("") : empty("Sin solicitudes compatibles por ahora", "El cliente debe confirmar la visita y proteger su pago simulado. Puedes crear una solicitud para probarlo.")}</div><h2 class="spaced">Mis trabajos</h2><div class="jobs">${mine.length ? [...mine].reverse().map(summary).join("") : empty("Aquí verás tus trabajos", "Acepta una solicitud compatible para empezar.")}</div>`;
}
function quoteView(q, accepted = false) {
  if (!q) return "";
  return `<section class="panel quote-panel"><div class="section-heading"><div><span class="eyebrow">${accepted ? "REGISTRO DE COTIZACIÓN ACEPTADA" : "COTIZACIÓN FORMAL CHAMBAPP"}</span><h2>${esc(q.number)}</h2></div><span class="badge">${accepted ? "Aceptada" : "Por revisar"}</span></div><dl class="quote-fields"><div><dt>Diagnóstico</dt><dd>${esc(q.diagnosis)}</dd></div><div><dt>Incluye</dt><dd>${esc(q.includes)}</dd></div><div><dt>No incluye</dt><dd>${esc(q.excludes)}</dd></div><div><dt>Tiempo estimado</dt><dd>${esc(q.estimate)}</dd></div><div><dt>Garantía ofrecida</dt><dd>${esc(q.warranty)}</dd></div><div><dt>Notas</dt><dd>${esc(q.notes || "Sin notas adicionales")}</dd></div></dl><div class="price-lines"><p><span>Mano de obra (incluye diagnóstico)</span><b>${money(q.labor)}</b></p><p><span>Materiales</span><b>${money(q.materials)}</b></p><p class="total"><span>Total de reparación</span><b>${money(q.total)} MXN</b></p></div><div class="assurance">No se realizará ningún trabajo adicional sin tu aprobación.</div>${photos(q.photos, "Fotos de la cotización")}</section>`;
}
function quoteForm(j) {
  const d = drafts["quote-" + j.id] || {};
  return `<form class="panel" data-form="quote" data-id="${j.id}" data-draft="quote-${j.id}"><h2>Enviar cotización formal</h2>${textarea("diagnosis", "Diagnóstico", d.diagnosis, 'required maxlength="3000"')}${field("labor", "Mano de obra (MXN; incluye diagnóstico)", d.labor, "number", 'required min="0" max="1000000" step="0.01"')}${field("materials", "Materiales (MXN)", d.materials ?? 0, "number", 'required min="0" max="1000000" step="0.01"')}<div class="quote-total" role="status">Total: <b data-quote-total>${money(Number(d.labor || 0) + Number(d.materials || 0))}</b></div><p class="hint">${j.visit?.legacy ? "Este servicio anterior no tiene un cobro de visita registrado. El total aprobado será el saldo a proteger." : `El total incluye ${money(j.visit.amount)} de diagnóstico. Se descontará del saldo que paga el cliente.`}</p>${textarea("includes", "Qué incluye", d.includes, 'required maxlength="3000"')}${textarea("excludes", "Qué no incluye", d.excludes, 'required maxlength="3000"')}${field("estimate", "Tiempo estimado", d.estimate, "text", 'required maxlength="150" placeholder="Ej. 2 horas"')}${field("warranty", "Garantía ofrecida", d.warranty || "7 días sobre mano de obra · simulada", "text", 'required maxlength="300"')}${textarea("notes", "Notas (opcional)", d.notes, 'maxlength="3000"')}${upload("quote-" + j.id)}<div class="assurance">No se realizará ningún trabajo adicional sin tu aprobación.</div><button>Enviar cotización al cliente</button></form>`;
}
function paymentPanel(j, owner) {
  const p = j.payment;
  return `<section class="panel payment-panel"><span class="eyebrow">PAGO PROTEGIDO CHAMBAPP · SIMULACIÓN</span><h2>${p ? paymentLabels[p.state] : "Pago de diagnóstico"}</h2><p>El profesional no recibe el pago de la reparación hasta que tú confirmes que terminó.</p><ol class="payment-steps"><li>Cliente paga</li><li>Chambapp protege</li><li>Profesional trabaja</li><li>Cliente confirma</li><li>Pago liberado</li></ol><div class="price-lines"><p><span>Visita aprobada</span><b>${money(j.visit?.amount)} MXN</b></p><p><span>Pago de visita</span><b>${j.visitPayment ? paymentLabels[j.visitPayment.state] : "Sin registro anterior"}</b></p>${j.acceptance ? `<p><span>Total aprobado de reparación</span><b>${money(j.acceptance.quote.total)}</b></p><p><span>Diagnóstico descontado</span><b>− ${money(j.visit.amount)}</b></p><p class="total"><span>Saldo de reparación</span><b>${money(p?.amount)} MXN</b></p>` : ""}</div>${owner && j.visitPayment?.state === "pending" ? action("pay_visit", `Simular pago protegido de visita · ${money(j.visit.amount)}`, j.id) : ""}${owner && j.status === "accepted" && p?.state === "pending" ? action("pay", "Simular Pago Protegido del saldo", j.id) : ""}${owner && j.status === "rejected" && j.visitPayment?.state === "protected" ? action("confirm_visit", `Confirmar diagnóstico y liberar ${money(j.visit.amount)} simulados`, j.id) : ""}${p?.state === "disputed" && p.releasedAt ? '<p class="hint">El pago ya se había liberado. Abrir esta reclamación no revierte ese movimiento.</p>' : ""}<p class="hint">No se mueve dinero real ni se solicita información bancaria.</p></section>`;
}
function evidence(j, pro) {
  return `<section class="panel"><h2>Evidencia del servicio</h2>${[
    ["before", "Antes"],
    ["during", "Durante"],
    ["after", "Después"],
  ]
    .map(
      ([stage, label]) =>
        `<h3>${label}</h3>${photos(j.evidence?.[stage] || [], label)}`,
    )
    .join(
      "",
    )}${pro && ["claimed", "quoted", "accepted", "working", "awaiting_confirmation"].includes(j.status) ? `<form data-form="evidence" data-id="${j.id}" data-draft="evidence-${j.id}"><label>Etapa<select name="stage">${opt("before", drafts["evidence-" + j.id]?.stage, "Antes")}${opt("during", drafts["evidence-" + j.id]?.stage, "Durante")}${opt("after", drafts["evidence-" + j.id]?.stage, "Después")}</select></label>${upload("evidence-" + j.id, "Adjuntar evidencia")}<button>Guardar evidencia</button></form>` : ""}</section>`;
}
function guarantee(j) {
  return `<section class="panel"><span class="eyebrow">GARANTÍA CHAMBAPP · SIMULADA</span><h2>${j.guarantee ? "Servicio protegido por Garantía Chambapp." : j.legacy ? "Garantía sin registro anterior" : "Respaldo después de tu confirmación"}</h2><p>Garantía estándar simulada de 7 días sobre mano de obra. Las condiciones definitivas podrán variar por categoría.</p>${j.guarantee ? `<p><b>${Date.now() <= j.guarantee.endsAt ? "Periodo de garantía activo" : "Periodo de garantía terminado"}</b></p><p class="hint">Del ${date(j.guarantee.startsAt)} al ${date(j.guarantee.endsAt)}.</p>` : j.legacy ? '<p class="hint">El historial anterior no tiene una garantía registrada. No se le asigna cobertura retroactiva.</p>' : '<p class="hint">El periodo comienza cuando el cliente confirma que el servicio terminó.</p>'}<hr><h3>Protección Chambapp</h3><p class="hint">Función futura/demostrativa para daños accidentales. No es un seguro real y no hay aseguradora conectada.</p></section>`;
}
function claims(j, owner) {
  return `<section class="panel" id="claims"><h2>Ayuda y reclamaciones</h2>${(j.claims || []).map((c) => `<article class="claim"><span class="status">${esc(c.status)}</span><p>${esc(c.description)}</p><p class="hint">${c.covered ? "Registrada durante el periodo de garantía simulada." : "Sin cobertura de garantía confirmada; se registra para revisión."}</p>${photos(c.photos, "Fotos de la reclamación")}<ol class="claim-progress">${claimLabels.map((s) => `<li class="${claimLabels.indexOf(s) <= claimLabels.indexOf(c.status) ? "reached" : ""}">${s}</li>`).join("")}</ol>${c.events?.length ? `<ol class="timeline">${c.events.map((e) => `<li><b>${esc(e.status)}</b><small>${date(e.at)}</small></li>`).join("")}</ol>` : ""}${c.resolution ? `<p class="hint">${esc(c.resolution)}</p>` : ""}${owner && c.status !== "Resuelto" ? `<button class="secondary" data-claim-next="${c.id}" data-id="${j.id}">Simular siguiente paso de revisión</button><p class="hint">Control de demostración, no resolución de soporte real.</p>` : ""}</article>`).join("") || '<p class="hint">No hay reclamaciones registradas.</p>'}${owner && ["working", "awaiting_confirmation", "completed"].includes(j.status) && !j.claims.some((c) => c.status !== "Resuelto") ? `<details class="report-form"><summary>Reportar problema con este servicio</summary><form data-form="report" data-id="${j.id}" data-draft="report-${j.id}">${textarea("description", "¿Qué sucedió?", drafts["report-" + j.id]?.description, 'required minlength="10" maxlength="3000"')}${upload("report-" + j.id, "Fotografías del problema")}<button>Enviar reporte</button></form></details>` : ""}</section>`;
}
function detail() {
  const j = state.jobs.find((j) => j.id === detailId);
  if (!j) return empty("No encontramos el servicio", "Vuelve a tu historial.");
  const a = actor(),
    owner = ["client", "admin"].includes(role) && a?.id === j.client.id,
    pro = role === "pro" && a?.id === j.professional?.id;
  const profile = state.professionals.find((p) => p.id === j.professional?.id);
  return `<button class="text-button" data-nav="${role === "pro" ? "home" : "history"}">← Volver a mis servicios</button><section class="page-heading"><span class="eyebrow">SERVICIO ${esc(j.id.slice(-6).toUpperCase())}</span><h1>${esc(j.service)}<em>.</em></h1><span class="status ${j.status}">${labels[j.status] || esc(j.status)}</span>${j.urgent ? '<span class="urgent-badge">Atención urgente</span>' : ""}</section><div class="detail-layout"><div class="detail-main"><section class="panel"><h2>Tu solicitud</h2><p>${esc(j.problem)}</p><dl class="quote-fields"><div><dt>Cliente</dt><dd>${esc(j.client.name)}</dd></div><div><dt>Fecha</dt><dd>${date(j.created)}</dd></div><div><dt>Categoría</dt><dd>${esc(j.category || services.find((s) => s.name === j.service)?.category)}</dd></div><div><dt>Ubicación</dt><dd>${esc(j.address || "Sin domicilio exacto")} · ${esc(j.colony)} · ${esc(j.borough)} · CP ${esc(j.cp)}</dd></div></dl>${photos(j.photos)}${role === "pro" && j.status === "pending" && (j.visitPayment?.state === "protected" || j.visit?.legacy) && canServe(j, a, state.jobs) ? action("claim", "Aceptar visita y diagnosticar", j.id) : ""}${owner && j.visitPayment?.state === "pending" ? '<p class="hint">Protege el pago simulado de la visita para que el profesional pueda aceptar.</p>' : ""}</section>${profile ? `<section class="panel">${trustProfile(profile)}</section>` : ""}${j.quote ? quoteView(j.acceptance?.quote || j.quote, Boolean(j.acceptance)) : ""}${
    j.quoteVersions?.length > 1
      ? `<details class="panel"><summary>Versiones anteriores de la cotización</summary>${j.quoteVersions
          .slice(0, -1)
          .map((q) => quoteView(q))
          .join("")}</details>`
      : ""
  }${j.acceptance ? `<p class="hint">Aceptada por ${esc(j.client.name)} el ${date(j.acceptance.at)}. Este registro conserva los alcances y el precio aprobados.</p>` : ""}${j.legacyQuote ? `<section class="panel"><h3>Cotización de la versión anterior</h3><p>${esc(j.legacyQuote.detail)}</p><b>${money(j.legacyQuote.amount)}</b><p class="hint">Se conserva como historial. No sustituye una cotización formal ni un registro de aceptación.</p></section>` : ""}${pro && ["claimed", "quoted", "legacy_review"].includes(j.status) ? quoteForm(j) : ""}${owner && j.status === "quoted" ? `<section class="panel"><h3>Tú decides si continuar</h3><div class="assurance">No se realizará ningún trabajo adicional sin tu aprobación.</div><div class="actions">${action("accept", "Aceptar cotización", j.id)}${action("reject", "Rechazar cotización", j.id, "secondary")}</div></section>` : ""}${pro && j.status === "accepted" ? `<section class="panel"><h3>Aprobación antes de trabajar</h3><p>${j.payment?.state === "protected" ? "El cliente aprobó la cotización y protegió el pago simulado." : "Espera a que el cliente proteja el pago simulado del saldo."}</p>${j.payment?.state === "protected" ? action("start", "Comenzar · En reparación", j.id) : ""}<div class="assurance">No se realizará ningún trabajo adicional sin tu aprobación.</div></section>` : ""}${pro && j.status === "working" ? `<section class="panel"><h3>¿Terminaste el trabajo?</h3><p>El cliente debe revisarlo y confirmar para liberar el pago.</p>${action("finish", "Informar que terminé el servicio", j.id)}</section>` : ""}${owner && j.status === "awaiting_confirmation" ? `<section class="panel confirmation"><h2>Revisa el trabajo antes de confirmar</h2><p>Tu confirmación libera el pago simulado al profesional e inicia los 7 días de garantía.</p>${!j.claims.some((c) => c.status !== "Resuelto") ? action("confirm", "Confirmar servicio terminado y liberar pago", j.id) : '<p class="hint">Hay una reclamación abierta. El pago permanece en disputa.</p>'}</section>` : ""}${evidence(j, pro)}${claims(j, owner)}${owner && j.status === "completed" && !j.rating ? `<form class="panel" data-form="rate" data-id="${j.id}"><h2>Califica al profesional</h2><label>Tu calificación<select name="stars" required><option value="">Elige una calificación</option>${[5, 4, 3, 2, 1].map((n) => opt(n, "", "★".repeat(n) + " · " + n + "/5")).join("")}</select></label>${textarea("comment", "Comentario (opcional)", "", 'maxlength="1000"')}<button>Enviar calificación</button></form>` : ""}${j.rating ? `<section class="panel"><h3>Tu calificación</h3><div class="rating">${"★".repeat(j.rating.stars || j.rating)} · ${j.rating.stars || j.rating}/5</div><p>${esc(j.rating.comment)}</p></section>` : ""}</div><aside>${paymentPanel(j, owner)}${guarantee(j)}<section class="panel"><h2>Historial completo</h2><ol class="timeline">${(j.events || []).map((e) => `<li><b>${esc(e.kind)}</b><small>${date(e.at)} · ${esc(e.actor)}</small>${e.detail ? `<p>${esc(e.detail)}</p>` : ""}</li>`).join("")}</ol><button class="secondary" data-receipt="${j.id}">Descargar comprobante de demostración</button><p class="hint">No es factura SAT ni comprobante de pago real.</p></section></aside></div>`;
}
function admin() {
  const a = actor();
  if (!a) return registration();
  const buildings = state.buildings.filter((b) => b.adminId === a.id),
    jobs = myJobs(),
    paid = jobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.acceptance?.quote.total || 0), 0),
    expenses = state.demoExpenses.filter((e) =>
      buildings.some((b) => b.id === e.buildingId),
    );
  return `<section class="page-heading"><span class="eyebrow">ADMINISTRADORES DE CONDOMINIOS</span><h1>Tu comunidad,<br><em>en buenas manos.</em></h1><p>Servicios para áreas comunes, historial y gastos bajo control. Dashboard de demostración.</p></section>${accountBar()}<div class="dashboard-stats"><div><span>Edificios</span><b>${buildings.length}</b></div><div><span>Servicios solicitados</span><b>${jobs.length}</b></div><div><span>Pagos liberados · simulados</span><b>${money(paid)}</b></div></div><div class="jobs">${buildings.map((b) => `<article class="panel building"><span class="eyebrow">EDIFICIO ${b.id.includes("demo") ? "DE DEMOSTRACIÓN" : ""}</span><h2>${esc(b.name)}</h2><p>${esc(b.colony)} · ${esc(b.borough)}</p><p class="hint">${b.units} viviendas registradas en la demo</p><button data-building-service="${b.id}">Solicitar servicio para áreas comunes</button><button class="secondary" data-invite="${b.id}">Simular invitación a residentes</button></article>`).join("")}</div><details class="panel spaced"><summary>Registrar otro edificio</summary><form data-form="building">${field("name", "Nombre del edificio", drafts.building?.name, "text", 'required maxlength="100"')}${field("units", "Número de viviendas", drafts.building?.units || 1, "number", 'required min="1" max="10000"')}${locationFields(drafts.building || {}, "building")}<button>Guardar edificio de demostración</button></form></details><section class="panel spaced"><h2>Gastos y comprobantes</h2><div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Importe</th><th>Comprobante</th></tr></thead><tbody>${expenses.map((e) => `<tr><td>${esc(e.description)}</td><td>${money(e.amount)}</td><td><button class="text-button" data-expense-receipt="${e.id}">Descargar demo</button></td></tr>`).join("")}${jobs
    .filter((j) => j.acceptance)
    .map(
      (j) =>
        `<tr><td>${esc(j.service)} · ${labels[j.status]}</td><td>${money(j.acceptance.quote.total)}</td><td><button class="text-button" data-receipt="${j.id}">Descargar demo</button></td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><p class="hint">Los gastos de ejemplo y los pagos son simulados. Los comprobantes no son CFDI.</p></section><section class="panel spaced"><h2>Profesionales favoritos</h2><div class="favorite-grid">${state.professionals.map((p) => `<article>${trustProfile(p, true)}<button class="secondary" data-favorite="${p.id}">${state.favorites.includes(a.id + ":" + p.id) ? "★ Favorito · quitar" : "☆ Agregar favorito"}</button></article>`).join("")}</div></section><h2 class="spaced">Historial de áreas comunes</h2><div class="jobs">${jobs.length ? [...jobs].reverse().map(summary).join("") : empty("Tu primer servicio para el condominio", "Selecciona un edificio para solicitar ayuda en sus áreas comunes.")}</div>`;
}
function adminRequest() {
  const b = state.buildings.find((b) => b.id === drafts.request?.buildingId);
  if (!b) return admin();
  return `<section class="page-heading"><span class="eyebrow">ÁREAS COMUNES</span><h1>Servicio para tu edificio<em>.</em></h1><p>${esc(b.name)} · ${esc(b.colony)}</p></section>${home().slice(home().indexOf('<section id="request"'))}`;
}
function render() {
  app.innerHTML = `<header><a class="logo" href="#" data-nav="home"><span class="logo-icon">⌂</span>Chambapp<span class="logo-dot">.</span></a><nav aria-label="Navegación">${role === "client" ? '<button class="nav-link" data-nav="home">Solicitar servicio</button>' : ""}<button class="nav-link" data-nav="history">Mis servicios</button>${role === "admin" ? '<button class="nav-link" data-nav="home">Mi condominio</button>' : ""}</nav><div class="role-switch" aria-label="Tipo de cuenta">${[
    ["client", "Cliente"],
    ["pro", "Profesional"],
    ["admin", "Administrador"],
  ]
    .map(
      ([r, label]) =>
        `<button data-role="${r}" aria-pressed="${role === r}" class="${role === r ? "active" : ""}">${label}</button>`,
    )
    .join(
      "",
    )}</div></header><div class="demo-banner"><span class="demo-dot"></span> MVP de demostración · verificaciones, pagos, garantía y protección simulados · sin mapas reales</div><main>${notice ? `<div class="notice" role="status"><span>${esc(notice)}</span><button class="text-button" data-dismiss aria-label="Cerrar aviso">×</button></div>` : ""}${registering ? registration() : page === "detail" ? detail() : page === "review" ? reviewRequest() : page === "history" ? history() : page === "admin-request" ? adminRequest() : role === "pro" ? professional() : role === "admin" ? admin() : home()}</main><footer><a class="logo" href="#" data-nav="home">Chambapp<span class="logo-dot">.</span></a><span>Una mano, justo cuando la necesitas.</span><small>Ciudad de México · MVP demostrativo</small></footer>`;
}
function syncLocation(form, changed) {
  const borough = form.elements.borough,
    cp = form.elements.cp,
    colony = form.elements.colony;
  if (changed === "borough") {
    cp.value = "";
    colony.value = "";
  }
  const record = postalRecord(cp.value),
    old = colony.value;
  if (record) {
    borough.value = record.borough;
    colony.disabled = false;
    colony.innerHTML =
      '<option value="">Elige tu colonia</option>' +
      record.colonies.map((c) => opt(c, old)).join("");
    if (record.colonies.length === 1) colony.value = record.colonies[0];
  } else {
    colony.disabled = true;
    colony.innerHTML =
      '<option value="">Primero escribe tu código postal</option>';
  }
  form.querySelector("datalist").innerHTML = postalCodes(borough.value)
    .map(
      (r) => `<option value="${r.cp}">${esc(r.colonies.join(", "))}</option>`,
    )
    .join("");
  form.querySelector(".location-help").textContent = record
    ? "Selecciona tu colonia."
    : cp.value.length === 5
      ? "No encontramos ese código en el catálogo de CDMX."
      : "Escribe tu código postal.";
  cp.setCustomValidity(
    cp.value.length === 5 && !record
      ? "Elige un código postal del catálogo de CDMX."
      : "",
  );
  preserve();
}
async function commit(mutator) {
  if (busy) throw Error("Espera a que termine la operación actual.");
  busy = true;
  const previous = structuredClone(state);
  try {
    await mutator();
    await saveState(state);
  } catch (e) {
    state = previous;
    throw e;
  } finally {
    busy = false;
  }
}
function download(text, name) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function receipt(j) {
  return [
    "Chambapp · Comprobante de demostración",
    "NO ES FACTURA SAT NI PAGO REAL",
    "Servicio: " + j.service,
    "Fecha: " + date(j.created),
    "Cliente: " + j.client.name,
    "Profesional: " + (j.professional?.name || "Sin asignar"),
    "Ubicación: " + j.colony + ", " + j.borough + ", CP " + j.cp,
    "Visita: " + money(j.visit.amount),
    "Total reparación: " + money(j.acceptance?.quote.total || j.quote?.total),
    "Saldo reparación: " + money(j.payment?.amount),
    "Estado: " + labels[j.status],
    "Pago simulado: " +
      (j.payment ? paymentLabels[j.payment.state] : "Sin registro"),
    "Cotización aceptada: " + (j.acceptance?.quote.number || "No"),
    "Garantía simulada: " +
      (j.guarantee ? "7 días de mano de obra" : "Sin registro"),
    ...(j.events || []).map((e) => date(e.at) + " · " + e.kind),
  ].join("\n");
}
app.addEventListener("input", (e) => {
  if (e.target.hasAttribute("data-search")) {
    search = e.target.value;
    document.querySelector("#service-results").innerHTML = cards();
  }
  if (e.target.name === "cp") syncLocation(e.target.form, "cp");
  if (["labor", "materials"].includes(e.target.name)) {
    const f = e.target.form;
    f.querySelector("[data-quote-total]").textContent = money(
      Number(f.elements.labor.value || 0) +
        Number(f.elements.materials.value || 0),
    );
  }
  preserve();
});
app.addEventListener("change", async (e) => {
  if (busy) {
    preserve();
    notice = "Espera a que termine la operación actual.";
    render();
    return;
  }
  try {
    if (e.target.hasAttribute("data-upload")) {
      if (busy) throw Error("Espera a que termine la operación actual.");
      busy = true;
      const key = e.target.dataset.upload;
      uploads[key] = await readPhotos(e.target.files);
      notice = "";
      app.querySelector(".notice")?.remove();
      app.querySelector(`[data-preview="${key}"]`).innerHTML =
        photos(uploads[key]) +
        (uploads[key].length
          ? `<button type="button" class="text-button" data-clear-photos="${key}">Quitar fotografías seleccionadas</button>`
          : "");
      busy = false;
    }
    if (e.target.name === "borough") syncLocation(e.target.form, "borough");
    if (e.target.hasAttribute("data-category")) {
      category = e.target.value;
      document.querySelector("#service-results").innerHTML = cards();
    }
    if (e.target.hasAttribute("data-account")) {
      await commit(() => {
        state.active[role] = e.target.value;
      });
      detailId = null;
      page = "home";
      render();
    }
    preserve();
  } catch (err) {
    busy = false;
    notice = err.message;
    render();
  }
});
app.addEventListener("click", async (e) => {
  const b = e.target.closest("button,a");
  if (!b) return;
  try {
    if (b.hasAttribute("data-view-photo")) {
      e.preventDefault();
      const dialog = document.createElement("dialog");
      dialog.className = "photo-dialog";
      const img = document.createElement("img");
      img.src = b.querySelector("img").src;
      img.alt = b.querySelector("img").alt;
      const close = document.createElement("button");
      close.textContent = "Cerrar fotografía";
      close.onclick = () => dialog.close();
      dialog.append(close, img);
      dialog.addEventListener("close", () => dialog.remove());
      document.body.append(dialog);
      dialog.showModal();
      return;
    }
    if (busy) throw Error("Espera a que termine la operación actual.");
    if (b.dataset.role) {
      preserve();
      detailId = null;
      requestReview = null;
      role = b.dataset.role;
      page = "home";
      registering = false;
      editingPro = false;
      notice = "";
      render();
      return;
    }
    if (b.dataset.nav) {
      e.preventDefault();
      page = b.dataset.nav;
      registering = false;
      notice = "";
      render();
      return;
    }
    if (b.hasAttribute("data-dismiss")) {
      notice = "";
      render();
      return;
    }
    if (b.hasAttribute("data-register")) {
      preserve();
      registering = true;
      editingPro = false;
      delete drafts.register;
      render();
      return;
    }
    if (b.hasAttribute("data-cancel-register")) {
      registering = false;
      editingPro = false;
      delete drafts.register;
      render();
      return;
    }
    if (b.dataset.service) {
      selected = b.dataset.service;
      drafts.request = { ...drafts.request, service: selected };
      document.querySelector("[name=service]").value = selected;
      document.querySelector("#service-results").innerHTML = cards();
      return;
    }
    if (b.hasAttribute("data-show-services")) {
      allServices = true;
      document.querySelector("#service-results").innerHTML = cards();
      return;
    }
    if (b.dataset.clearPhotos) {
      preserve();
      delete uploads[b.dataset.clearPhotos];
      render();
      return;
    }
    if (b.dataset.detail) {
      detailId = b.dataset.detail;
      page = "detail";
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (b.hasAttribute("data-edit-request")) {
      page = role === "admin" ? "admin-request" : "home";
      render();
      return;
    }
    if (b.hasAttribute("data-confirm-request")) {
      await commit(() => {
        state.jobs.push(
          createJob(
            {
              ...requestReview,
              visitApproved: true,
              approvedVisitAmount: requestReview.visitQuote.amount,
            },
            actor(),
          ),
        );
      });
      requestReview = null;
      delete drafts.request;
      uploads.request = [];
      detailId = state.jobs.at(-1).id;
      page = "detail";
      notice = `Visita confirmada por ${money(state.jobs.at(-1).visit.amount)} MXN. Ahora puedes simular su pago protegido.`;
      render();
      return;
    }
    if (b.dataset.action) {
      const index = state.jobs.findIndex((j) => j.id === b.dataset.id);
      if (index < 0) throw Error("Servicio no encontrado.");
      if (
        b.dataset.action === "claim" &&
        !canServe(state.jobs[index], actor(), state.jobs)
      )
        throw Error(
          "Esta solicitud no coincide con tu disponibilidad y cobertura.",
        );
      await commit(() => {
        state.jobs[index] = transition(
          state.jobs[index],
          b.dataset.action,
          {},
          actor(),
        );
      });
      notice = "Cambio registrado en el historial de Chambapp.";
      render();
      return;
    }
    if (b.dataset.claimNext) {
      const index = state.jobs.findIndex((j) => j.id === b.dataset.id);
      await commit(() => {
        state.jobs[index] = transition(
          state.jobs[index],
          "advance_claim",
          { claimId: b.dataset.claimNext },
          actor(),
        );
      });
      notice = "Revisión de reclamación avanzada en la demostración.";
      render();
      return;
    }
    if (b.hasAttribute("data-edit-pro")) {
      registering = true;
      editingPro = true;
      drafts.register = { ...actor() };
      render();
      return;
    }
    if (b.hasAttribute("data-verify")) {
      await commit(() => {
        actor().verification = Object.fromEntries(
          Object.keys(verificationNames).map((k) => [k, true]),
        );
        actor().verificationSimulated = true;
      });
      notice =
        "Indicadores simulados activados. No se realizó una verificación real.";
      render();
      return;
    }
    if (b.hasAttribute("data-availability")) {
      await commit(() => {
        actor().available = actor().available === false;
      });
      render();
      return;
    }
    if (b.dataset.buildingService) {
      const building = state.buildings.find(
        (x) => x.id === b.dataset.buildingService && x.adminId === actor()?.id,
      );
      if (!building) throw Error("Edificio no disponible para esta cuenta.");
      drafts.request = {
        ...building,
        buildingId: building.id,
        service: selected,
        problem: "",
      };
      page = "admin-request";
      render();
      return;
    }
    if (b.dataset.favorite) {
      const id = actor().id + ":" + b.dataset.favorite;
      await commit(() => {
        state.favorites = state.favorites.includes(id)
          ? state.favorites.filter((x) => x !== id)
          : [...state.favorites, id];
      });
      render();
      return;
    }
    if (b.dataset.invite) {
      notice =
        "Invitación de demostración preparada. No se enviaron correos, WhatsApp ni mensajes reales.";
      render();
      return;
    }
    if (b.dataset.receipt) {
      const j = state.jobs.find((j) => j.id === b.dataset.receipt);
      download(receipt(j), "Chambapp-servicio-" + j.id.slice(-6) + ".txt");
      return;
    }
    if (b.dataset.expenseReceipt) {
      const expense = state.demoExpenses.find(
        (x) => x.id === b.dataset.expenseReceipt,
      );
      download(
        "Chambapp · Gasto de demostración\nNO ES CFDI NI PAGO REAL\n" +
          expense.description +
          "\n" +
          money(expense.amount),
        "Chambapp-gasto-demo.txt",
      );
    }
  } catch (err) {
    notice = err.message;
    render();
  }
});
app.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target,
    data = Object.fromEntries(new FormData(form));
  preserve();
  try {
    if (busy)
      throw Error("Espera a que terminen de procesarse las fotografías.");
    if (form.dataset.form === "register") {
      if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim())
        throw Error("Completa nombre, correo y teléfono.");
      if (role === "pro" && !validLocation(data))
        throw Error("Elige una ubicación válida.");
      await commit(() => {
        const group =
          state[
            role === "pro"
              ? "professionals"
              : role === "admin"
                ? "admins"
                : "clients"
          ];
        const current = editingPro ? actor() : null;
        const account = {
          ...current,
          id: current?.id || crypto.randomUUID(),
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          role,
          ...(role === "pro"
            ? {
                service: data.service,
                borough: data.borough,
                cp: data.cp,
                colony: data.colony,
                allBoroughs: Boolean(form.elements.allBoroughs.checked),
                available: current?.available ?? true,
                verification: current?.verification || {},
              }
            : {}),
        };
        const index = group.findIndex((a) => a.id === account.id);
        if (index < 0) group.push(account);
        else group[index] = account;
        state.active[role] = account.id;
        if (role === "client")
          for (const j of state.jobs.filter(
            (j) => j.client?.id === "legacy-client",
          ))
            j.client = { id: account.id, name: account.name, role: "client" };
      });
      registering = false;
      editingPro = false;
      delete drafts.register;
      notice = "Tu cuenta de demostración está lista.";
      render();
      return;
    }
    if (form.dataset.form === "request") {
      if (!actor()) {
        registering = true;
        notice =
          "Crea primero tu cuenta. Conservamos los datos de tu solicitud.";
        render();
        return;
      }
      if (!validLocation(data) || data.problem.trim().length < 10)
        throw Error("Completa colonia y descripción del problema.");
      const service = services.find((s) => s.name === data.service);
      if (!service) throw Error("Elige un servicio del catálogo.");
      requestReview = {
        ...data,
        category: service.category,
        visitQuote: visitPrice({
          ...data,
          urgent: form.elements.urgent.checked,
        }),
        buildingId: drafts.request?.buildingId || null,
        urgent: form.elements.urgent.checked,
        photos: uploads.request || [],
      };
      page = "review";
      render();
      return;
    }
    if (form.dataset.form === "building") {
      if (!validLocation(data))
        throw Error("Elige una ubicación válida para el edificio.");
      await commit(() => {
        state.buildings.push({
          id: crypto.randomUUID(),
          adminId: actor().id,
          name: data.name.trim(),
          units: Number(data.units),
          borough: data.borough,
          cp: data.cp,
          colony: data.colony,
        });
      });
      delete drafts.building;
      notice = "Edificio de demostración registrado.";
      render();
      return;
    }
    const index = state.jobs.findIndex((j) => j.id === form.dataset.id);
    if (index < 0) throw Error("No encontramos el servicio.");
    const kind = form.dataset.form;
    await commit(() => {
      const payload = {
        ...data,
        ...(["quote", "report"].includes(kind)
          ? { photos: uploads[kind + "-" + form.dataset.id] || [] }
          : {}),
      };
      if (kind === "evidence")
        payload.photos = uploads["evidence-" + form.dataset.id] || [];
      state.jobs[index] = transition(state.jobs[index], kind, payload, actor());
    });
    delete drafts[form.dataset.draft || kind];
    delete uploads[kind + "-" + form.dataset.id];
    notice =
      kind === "quote"
        ? "Cotización formal enviada. Espera la aprobación del cliente."
        : kind === "report"
          ? "Reporte registrado. Puedes seguir la revisión desde aquí."
          : "Información guardada en el historial.";
    render();
  } catch (err) {
    notice = err.message;
    render();
  }
});
try {
  state = await loadState();
  render();
} catch (err) {
  app.innerHTML = `<main><h1>Chambapp</h1><p>${esc(err.message)}</p><p>Permite el almacenamiento del sitio y vuelve a cargar la página.</p></main>`;
}
