import { visitPrice, guaranteePolicy } from "./config.js";
import {
  createPayment,
  simulationPaymentAdapter as adapter,
} from "./payments.js";
import { validLocation } from "./location.js";
import { canServe } from "./broker.js";
import { services } from "./data/services.js";
export { services };
export const labels = {
  pending: "Buscando profesional",
  claimed: "Visita y diagnóstico",
  quoted: "Cotización recibida",
  accepted: "Cotización aprobada",
  working: "En reparación",
  awaiting_confirmation: "Esperando tu confirmación",
  completed: "Servicio terminado",
  rejected: "Cotización rechazada",
  legacy_review: "Actualizar cotización anterior",
};
export const claimLabels = [
  "Revisión",
  "Contactando profesional",
  "Revisión técnica",
  "Resuelto",
];
const text = (v, max = 3000) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const clone = (v) => structuredClone(v);
export function validatePhotos(photos = []) {
  if (!Array.isArray(photos) || photos.length > 5)
    throw Error("Puedes adjuntar hasta 5 fotografías.");
  for (const p of photos) {
    if (
      !p?.id ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        p.dataURL,
      ) ||
      p.dataURL.length > 900000
    )
      throw Error("La fotografía no es válida o es demasiado grande.");
  }
  return clone(photos);
}
function event(job, kind, actor, now, detail = "") {
  job.events.push({
    id: crypto.randomUUID(),
    kind,
    actor: actor?.name || actor?.role || "Demostración",
    at: now,
    detail,
  });
}
function requireActor(job, actor, role) {
  if (role === "customer") {
    if (
      !["client", "admin"].includes(actor?.role) ||
      actor.id !== job.client?.id
    )
      throw Error("Este servicio pertenece a otro cliente.");
  } else if (actor?.role !== "pro" || actor.id !== job.professional?.id)
    throw Error("Este servicio pertenece a otro profesional.");
}
export function createJob(data, actor, now = Date.now()) {
  if (!["client", "admin"].includes(actor?.role) || !actor.id)
    throw Error("Registra tu cuenta antes de solicitar.");
  if (
    !validLocation(data) ||
    !text(data.problem) ||
    text(data.problem).length < 10 ||
    !services.some((s) => s.name === data.service)
  )
    throw Error("Completa el servicio, ubicación y descripción.");
  if (!data.visitApproved)
    throw Error("Confirma el precio de la visita antes de solicitar.");
  const visit = visitPrice(data, now);
  if (
    data.approvedVisitAmount != null &&
    data.approvedVisitAmount !== visit.amount
  )
    throw Error(
      "El precio de la visita cambió. Vuelve a revisar tu solicitud antes de confirmar.",
    );
  const job = {
    id: crypto.randomUUID(),
    created: now,
    client: { id: actor.id, name: actor.name, role: actor.role },
    service: data.service,
    category: services.find((s) => s.name === data.service).category,
    borough: data.borough,
    cp: data.cp,
    colony: data.colony,
    address: text(data.address, 250),
    problem: text(data.problem),
    photos: validatePhotos(data.photos),
    urgent: Boolean(data.urgent),
    buildingId: data.buildingId || null,
    visit: { ...visit, approvedAt: now },
    status: "pending",
    visitPayment: createPayment(visit.amount),
    professional: null,
    quote: null,
    quoteVersions: [],
    acceptance: null,
    payment: null,
    guarantee: null,
    rating: null,
    evidence: { before: [], during: [], after: [] },
    claims: [],
    events: [],
  };
  event(
    job,
    "Solicitud creada",
    actor,
    now,
    "Visita de diagnóstico aprobada: $" + job.visit.amount + " MXN.",
  );
  return job;
}
export function formalQuote(data, job, now = Date.now()) {
  const labor = Math.round(Number(data.labor) * 100) / 100,
    materials = Math.round(Number(data.materials) * 100) / 100;
  if (
    data.labor == null ||
    data.materials == null ||
    String(data.labor).trim() === "" ||
    String(data.materials).trim() === "" ||
    !Number.isFinite(labor) ||
    !Number.isFinite(materials) ||
    labor < 0 ||
    materials < 0 ||
    labor + materials <= 0 ||
    labor + materials > 1000000
  )
    throw Error("Revisa los importes de mano de obra y materiales.");
  if (
    job.visit?.treatment === "credited" &&
    labor + materials < job.visit.amount
  )
    throw Error("El total debe incluir la visita de diagnóstico ya aprobada.");
  for (const field of [
    "diagnosis",
    "includes",
    "excludes",
    "estimate",
    "warranty",
  ])
    if (!text(data[field]))
      throw Error(
        "Completa diagnóstico, alcances, exclusiones, tiempo y garantía.",
      );
  return {
    id: crypto.randomUUID(),
    number:
      "CH-" +
      job.id.slice(-6).toUpperCase() +
      "-" +
      (job.quoteVersions.length + 1),
    created: now,
    currency: "MXN",
    diagnosis: text(data.diagnosis),
    labor: Math.round(labor * 100) / 100,
    materials: Math.round(materials * 100) / 100,
    total: Math.round((labor + materials) * 100) / 100,
    includes: text(data.includes),
    excludes: text(data.excludes),
    estimate: text(data.estimate, 150),
    warranty: text(data.warranty, 300),
    notes: text(data.notes),
    photos: validatePhotos(data.photos),
    terms: "No se realizará ningún trabajo adicional sin tu aprobación.",
    simulated: true,
  };
}
export function repairPaymentAmount(job) {
  const treatment = job.visit.treatment;
  if (!["additional", "credited"].includes(treatment))
    throw Error("Falta definir si la visita se descuenta de la reparación.");
  return treatment === "credited"
    ? Math.max(0, job.acceptance.quote.total - job.visit.amount)
    : job.acceptance.quote.total;
}
export function transition(
  original,
  action,
  data = {},
  actor,
  now = Date.now(),
) {
  const job = clone(original);
  job.events ??= [];
  job.claims ??= [];
  job.quoteVersions ??= [];
  job.evidence ??= { before: [], during: [], after: [] };
  const expected = {
    pay_visit: ["pending", "claimed"],
    confirm_visit: ["rejected"],
    claim: ["pending"],
    quote: ["claimed", "quoted", "legacy_review"],
    accept: ["quoted"],
    reject: ["quoted"],
    pay: ["accepted"],
    start: ["accepted"],
    finish: ["working"],
    confirm: ["awaiting_confirmation"],
    rate: ["completed"],
    report: ["working", "awaiting_confirmation", "completed"],
    evidence: [
      "claimed",
      "quoted",
      "accepted",
      "working",
      "awaiting_confirmation",
    ],
    advance_claim: ["working", "awaiting_confirmation", "completed"],
  };
  if (!expected[action]?.includes(job.status))
    throw Error("Esta acción no está disponible en el estado actual.");
  if (action === "pay_visit") {
    requireActor(job, actor, "customer");
    job.visitPayment = adapter.protect(job.visitPayment, now);
  } else if (action === "confirm_visit") {
    requireActor(job, actor, "customer");
    if (job.visitPayment?.state !== "protected")
      throw Error("Primero protege el pago de la visita.");
    job.visitPayment = adapter.change(job.visitPayment, "awaiting", now);
    job.visitPayment = adapter.release(job.visitPayment, now);
    job.visitConfirmedAt = now;
  } else if (action === "claim") {
    if (actor?.role !== "pro" || !actor.id)
      throw Error("Registra tu perfil profesional.");
    if (!canServe(job, actor))
      throw Error(
        "Esta solicitud no coincide con tu especialidad y cobertura.",
      );
    if (job.visitPayment?.state !== "protected" && !job.visit?.legacy)
      throw Error("El cliente debe proteger el pago simulado de la visita.");
    job.professional = {
      id: actor.id,
      name: actor.name,
      service: actor.service,
      verification: clone(actor.verification || {}),
    };
    job.status = "claimed";
  } else if (action === "quote") {
    requireActor(job, actor, "pro");
    job.quote = formalQuote(data, job, now);
    job.quoteVersions.push(clone(job.quote));
    job.status = "quoted";
  } else if (action === "accept") {
    requireActor(job, actor, "customer");
    if (
      job.visitPayment?.state !== "protected" &&
      job.visitPayment?.state !== "released" &&
      !job.visit?.legacy
    )
      throw Error("Primero protege el pago de la visita.");
    job.acceptance = {
      quote: clone(job.quote),
      at: now,
      clientId: actor.id,
      terms: job.quote.terms,
    };
    job.status = "accepted";
    job.payment = createPayment(repairPaymentAmount(job));
  } else if (action === "reject") {
    requireActor(job, actor, "customer");
    job.status = "rejected";
    job.rejectedAt = now;
  } else if (action === "pay") {
    requireActor(job, actor, "customer");
    if (!job.acceptance) throw Error("Primero acepta la cotización.");
    job.payment = adapter.protect(job.payment, now);
  } else if (action === "start") {
    requireActor(job, actor, "pro");
    if (!job.acceptance || job.payment?.state !== "protected")
      throw Error(
        "El cliente debe aceptar la cotización y proteger el pago simulado.",
      );
    job.status = "working";
    job.payment = adapter.change(job.payment, "working", now);
  } else if (action === "finish") {
    requireActor(job, actor, "pro");
    if (job.claims.some((c) => c.status !== "Resuelto"))
      throw Error("Hay una reclamación abierta.");
    job.status = "awaiting_confirmation";
    job.finishedByProfessionalAt = now;
    job.payment = adapter.change(job.payment, "awaiting", now);
  } else if (action === "confirm") {
    requireActor(job, actor, "customer");
    if (job.claims.some((c) => c.status !== "Resuelto"))
      throw Error("Resuelve la reclamación antes de confirmar.");
    job.payment = adapter.release(job.payment, now);
    if (job.visitPayment?.state === "protected") {
      job.visitPayment = adapter.change(job.visitPayment, "awaiting", now);
      job.visitPayment = adapter.release(job.visitPayment, now);
    }
    job.status = "completed";
    job.confirmedAt = now;
    job.guarantee = {
      ...guaranteePolicy,
      startsAt: now,
      endsAt: now + guaranteePolicy.days * 86400000,
    };
  } else if (action === "rate") {
    requireActor(job, actor, "customer");
    const stars = Number(data.stars);
    if (job.rating || !Number.isInteger(stars) || stars < 1 || stars > 5)
      throw Error("Elige de 1 a 5 estrellas.");
    job.rating = { stars, comment: text(data.comment, 1000), at: now };
  } else if (action === "evidence") {
    requireActor(job, actor, "pro");
    if (!["before", "during", "after"].includes(data.stage))
      throw Error("Elige la etapa de evidencia.");
    const photos = validatePhotos(data.photos);
    if (!photos.length) throw Error("Adjunta al menos una fotografía.");
    job.evidence[data.stage] = validatePhotos([
      ...job.evidence[data.stage],
      ...photos.map((p) => ({ ...p, uploadedBy: actor.id, at: now })),
    ]);
  } else if (action === "report") {
    requireActor(job, actor, "customer");
    if (!text(data.description) || text(data.description).length < 10)
      throw Error("Describe el problema con al menos 10 caracteres.");
    if (job.claims.some((c) => c.status !== "Resuelto"))
      throw Error("Ya existe una reclamación abierta para este servicio.");
    const covered = Boolean(
      job.guarantee &&
      now >= job.guarantee.startsAt &&
      now <= job.guarantee.endsAt,
    );
    job.claims.push({
      id: crypto.randomUUID(),
      created: now,
      description: text(data.description),
      photos: validatePhotos(data.photos),
      status: "Revisión",
      covered,
      previousPaymentState: job.payment?.state || "legacy",
      events: [{ status: "Revisión", at: now }],
    });
    if (job.payment) job.payment = adapter.change(job.payment, "disputed", now);
  } else if (action === "advance_claim") {
    requireActor(job, actor, "customer");
    const claim = job.claims.find((c) => c.id === data.claimId);
    if (!claim || claim.status === "Resuelto")
      throw Error("Esta reclamación ya terminó.");
    claim.status = claimLabels[claimLabels.indexOf(claim.status) + 1];
    claim.events.push({ status: claim.status, at: now });
    if (claim.status === "Resuelto") {
      claim.resolution =
        "Resolución de demostración. No determina reembolsos ni indemnizaciones reales.";
      if (job.payment)
        job.payment = adapter.change(
          job.payment,
          claim.previousPaymentState,
          now,
        );
    }
  }
  event(
    job,
    {
      pay_visit: "Pago de visita protegido (simulado)",
      confirm_visit:
        "Cliente confirmó diagnóstico · pago de visita liberado (simulado)",
      claim: "Profesional asignado",
      quote: "Cotización formal enviada",
      accept: "Cotización aceptada",
      reject: "Cotización rechazada",
      pay: "Pago protegido (simulado)",
      start: "En reparación",
      finish: "Profesional reportó finalización",
      confirm: "Cliente confirmó · pago liberado (simulado)",
      rate: "Calificación registrada",
      report: "Reclamación abierta",
      advance_claim: "Reclamación avanzó (simulación)",
      evidence: "Evidencia adjunta",
    }[action],
    actor,
    now,
  );
  return job;
}
