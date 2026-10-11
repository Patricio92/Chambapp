import test from "node:test";
import assert from "node:assert/strict";
import {
  createJob,
  transition,
  formalQuote,
  validatePhotos,
} from "../src/model.js";
import { pricing, visitPrice } from "../src/config.js";
import { migrateLegacy, newState } from "../src/storage.js";
import { trustScore, verified, proTier } from "../src/trust.js";
const client = { id: "c", name: "Cliente", role: "client" },
  pro = {
    id: "p",
    name: "Profesional",
    role: "pro",
    service: "Plomería",
    borough: "Cuauhtémoc",
  },
  admin = { id: "a", name: "Administración", role: "admin" };
const input = {
  service: "Plomería",
  borough: "Cuauhtémoc",
  cp: "06700",
  colony: "Roma Norte",
  problem: "Hay una fuga debajo de la cocina.",
  visitApproved: true,
  urgent: true,
};
const quote = {
  diagnosis: "Empaque dañado",
  labor: 800,
  materials: 200,
  includes: "Diagnóstico, sustitución y prueba",
  excludes: "Modificación de tuberías",
  estimate: "2 horas",
  warranty: "7 días mano de obra · demo",
  notes: "Cerrar suministro",
};
const photo = {
  id: "img-1",
  name: "fuga.jpg",
  dataURL: "data:image/jpeg;base64,YWJj",
};
const fresh = (customer = client) => createJob(input, customer, 1000);
function quoted(customer = client) {
  let j = transition(fresh(customer), "pay_visit", {}, customer, 2000);
  j = transition(j, "claim", {}, pro, 3000);
  return transition(j, "quote", quote, pro, 4000);
}
function working(customer = client) {
  let j = transition(quoted(customer), "accept", {}, customer, 5000);
  j = transition(j, "pay", {}, customer, 6000);
  return transition(j, "start", {}, pro, 7000);
}
function completed(customer = client) {
  return transition(
    transition(working(customer), "finish", {}, pro, 8000),
    "confirm",
    {},
    customer,
    9000,
  );
}
test("exige cuenta, ubicación, precio aprobado y servicio del catálogo", () => {
  for (const data of [
    { ...input, cp: "99999" },
    { ...input, service: "Inventado" },
    { ...input, visitApproved: false },
    { ...input, problem: "Corto" },
  ])
    assert.throws(() => createJob(data, client));
  assert.throws(() => createJob(input, pro));
  assert.throws(() => createJob(input));
  const j = fresh();
  assert.equal(j.visit.amount, 250);
  assert.equal(j.visit.treatment, "credited");
  assert.equal(j.category, "Hogar y mantenimiento");
  assert.equal(j.urgent, true);
  assert.equal(j.visitPayment.state, "pending");
});
test("diagnóstico aprobado se descuenta, aceptación queda independiente de la cotización editable", () => {
  const source = quoted();
  const j = transition(source, "accept", {}, client, 5000);
  assert.equal(j.payment.amount, 750);
  assert.equal(j.acceptance.quote.total, 1000);
  assert.equal(j.acceptance.clientId, client.id);
  assert.equal(j.acceptance.at, 5000);
  assert.equal(source.status, "quoted");
  source.quote.labor = 1;
  source.quote.total = 1;
  assert.equal(j.acceptance.quote.total, 1000);
  j.quote.total = 2;
  assert.equal(j.acceptance.quote.total, 1000);
  assert.equal(j.quoteVersions[0].total, 1000);
  assert.throws(() => transition(j, "quote", quote, pro));
});
test("no comienza ni termina ni libera pago sin aprobación, protección y confirmación del cliente", () => {
  const pending = fresh();
  assert.throws(() => transition(pending, "claim", {}, pro));
  assert.throws(() => transition(pending, "accept", {}, client));
  const q = quoted();
  assert.throws(() => transition(q, "start", {}, pro));
  let j = transition(q, "accept", {}, client);
  assert.throws(() => transition(j, "start", {}, pro));
  assert.throws(() => transition(j, "finish", {}, pro));
  j = transition(j, "pay", {}, client);
  assert.throws(() => transition(j, "pay", {}, client));
  j = transition(j, "start", {}, pro);
  assert.equal(j.payment.state, "working");
  j = transition(j, "finish", {}, pro);
  assert.equal(j.status, "awaiting_confirmation");
  assert.equal(j.payment.state, "awaiting");
  assert.equal(j.visitPayment.state, "protected");
  assert.equal(j.guarantee, null);
  assert.throws(() => transition(j, "confirm", {}, pro));
  j = transition(j, "confirm", {}, client, 9000);
  assert.equal(j.status, "completed");
  assert.equal(j.payment.state, "released");
  assert.equal(j.visitPayment.state, "released");
  assert.equal(j.guarantee.endsAt - 9000, 7 * 86400000);
  assert.throws(() => transition(j, "confirm", {}, client));
});
test("solo la cuenta propietaria puede cotizar, pagar, aprobar, terminar y calificar", () => {
  assert.throws(() =>
    transition(quoted(), "quote", quote, { ...pro, id: "other" }),
  );
  assert.throws(() =>
    transition(quoted(), "accept", {}, { ...client, id: "other" }),
  );
  assert.throws(() => transition(quoted(), "accept", {}, admin));
  assert.throws(() => transition(working(), "finish", {}, client));
  assert.throws(() => transition(fresh(), "pay_visit", {}, pro));
  const j = transition(
    completed(),
    "rate",
    { stars: 5, comment: "Buen servicio" },
    client,
    10000,
  );
  assert.equal(j.rating.stars, 5);
  assert.throws(() => transition(j, "rate", { stars: 4 }, client));
  assert.throws(() => transition(completed(), "rate", { stars: 6 }, client));
});
test("la cotización requiere alcances, exclusiones, garantía e importes válidos", () => {
  for (const data of [
    { ...quote, excludes: "" },
    { ...quote, diagnosis: "" },
    { ...quote, estimate: "" },
    { ...quote, warranty: "" },
    { ...quote, labor: -1 },
    { ...quote, labor: "abc" },
    { ...quote, labor: 1, materials: 1 },
    { ...quote, materials: Infinity },
    { ...quote, labor: 1000001 },
  ])
    assert.throws(() => formalQuote(data, fresh()));
  const q = formalQuote(
    { ...quote, labor: "800.10", materials: "200.20" },
    fresh(),
  );
  assert.equal(q.total, 1000.3);
  assert.equal(
    q.terms,
    "No se realizará ningún trabajo adicional sin tu aprobación.",
  );
  let j = quoted();
  j = transition(j, "quote", { ...quote, labor: 900 }, pro);
  assert.equal(j.quoteVersions.length, 2);
  assert.equal(j.quoteVersions[0].total, 1000);
  assert.equal(j.quote.total, 1100);
});
test("rechazar impide comenzar y libera solo el diagnóstico cuando el cliente lo confirma", () => {
  let j = transition(quoted(), "reject", {}, client);
  assert.equal(j.payment, null);
  assert.equal(j.visitPayment.state, "protected");
  assert.throws(() => transition(j, "start", {}, pro));
  assert.throws(() => transition(j, "confirm_visit", {}, pro));
  j = transition(j, "confirm_visit", {}, client);
  assert.equal(j.visitPayment.state, "released");
  assert.equal(j.visitPayment.amount, 250);
  assert.equal(j.status, "rejected");
  assert.throws(() => transition(j, "confirm_visit", {}, client));
});
test("disputa bloquea término y liberación; revisión preserva estado previo y no inventa reembolso", () => {
  let j = transition(
    working(),
    "report",
    { description: "La fuga sigue sin estar resuelta.", photos: [photo] },
    client,
    7500,
  );
  assert.equal(j.payment.state, "disputed");
  assert.throws(() => transition(j, "finish", {}, pro));
  assert.throws(() =>
    transition(j, "report", { description: "Un segundo reporte" }, client),
  );
  const id = j.claims[0].id;
  for (const status of [
    "Contactando profesional",
    "Revisión técnica",
    "Resuelto",
  ]) {
    j = transition(j, "advance_claim", { claimId: id }, client);
    assert.equal(j.claims[0].status, status);
  }
  assert.equal(j.payment.state, "working");
  assert.match(j.claims[0].resolution, /No determina reembolsos/);
  assert.equal(j.claims[0].photos.length, 1);
  j = transition(j, "finish", {}, pro);
  j = transition(
    j,
    "report",
    { description: "Aún queda un desperfecto pendiente" },
    client,
  );
  assert.throws(() => transition(j, "confirm", {}, client));
  let done = completed();
  done = transition(
    done,
    "report",
    { description: "Volvió a aparecer la fuga", photos: [photo] },
    client,
    9001,
  );
  assert.equal(done.claims[0].covered, true);
  assert.equal(done.payment.releasedAt, 9000);
  for (let n = 0; n < 3; n++)
    done = transition(
      done,
      "advance_claim",
      { claimId: done.claims[0].id },
      client,
      11000 + n,
    );
  assert.equal(done.payment.state, "released");
  assert.equal(done.payment.releasedAt, 9000);
  const late = transition(
    completed(),
    "report",
    { description: "Un problema posterior a la garantía" },
    client,
    9000 + 7 * 86400000 + 1,
  );
  assert.equal(late.claims[0].covered, false);
});
test("las fotos quedan ligadas al servicio y no se sobrescribe la fecha de evidencias previas", () => {
  const job = createJob({ ...input, photos: [photo] }, client);
  photo.name = "otra.jpg";
  assert.equal(job.photos[0].name, "fuga.jpg");
  photo.name = "fuga.jpg";
  let j = transition(
    working(),
    "evidence",
    { stage: "before", photos: [photo] },
    pro,
    1234,
  );
  j = transition(
    j,
    "evidence",
    { stage: "before", photos: [{ ...photo, id: "2" }] },
    pro,
    2345,
  );
  assert.equal(j.evidence.before[0].at, 1234);
  assert.equal(j.evidence.before[1].at, 2345);
  assert.equal(j.evidence.before[0].uploadedBy, "p");
  for (const photos of [
    Array(6).fill(photo),
    [{ ...photo, dataURL: "data:image/svg+xml;base64,YQ==" }],
    [{ ...photo, dataURL: photo.dataURL + "a".repeat(900000) }],
  ])
    assert.throws(() => validatePhotos(photos));
  assert.throws(() =>
    transition(j, "evidence", { stage: "after", photos: [] }, pro),
  );
  assert.throws(() =>
    transition(j, "evidence", { stage: "during", photos: [photo] }, client),
  );
});
test("administrador recorre el mismo contrato sin acceso a servicios de otros clientes", () => {
  const j = completed(admin);
  assert.equal(j.client.role, "admin");
  assert.equal(j.payment.state, "released");
  assert.throws(() => transition(j, "rate", { stars: 5 }, client));
  assert.equal(transition(j, "rate", { stars: 5 }, admin).rating.stars, 5);
});
test("tarifa futura se toma por servicio, urgencia, zona y hora; cada solicitud conserva su precio", () => {
  const saved = [...pricing.rules];
  try {
    const previous = fresh();
    pricing.rules.push({
      service: "Plomería",
      urgent: true,
      borough: "Cuauhtémoc",
      hour: 23,
      amount: 350,
    });
    assert.equal(visitPrice({ ...input, hour: 23 }).amount, 350);
    assert.equal(visitPrice({ ...input, hour: 12 }).amount, 250);
    assert.equal(previous.visit.amount, 250);
  } finally {
    pricing.rules = saved;
  }
});
test("historial anterior se conserva sin inventar aceptación, pagos ni garantía, y puede continuar", () => {
  const old = {
    profile: pro,
    jobs: [
      {
        ...input,
        id: "old",
        status: "working",
        professional: pro,
        quote: { amount: 600, detail: "Cotización anterior" },
      },
      { ...input, id: "closed", status: "completed", rating: 5 },
    ],
  };
  const state = migrateLegacy(old);
  assert.deepEqual(state.legacyBackup, old);
  let j = state.jobs[0];
  assert.equal(j.status, "legacy_review");
  assert.equal(j.legacyQuote.amount, 600);
  assert.equal(j.acceptance, null);
  assert.equal(j.payment, null);
  assert.equal(j.guarantee, null);
  assert.equal(state.jobs[1].rating.stars, 5);
  j = transition(j, "quote", quote, pro);
  const legacyClient = { ...client, id: "legacy-client" };
  j = transition(j, "accept", {}, legacyClient);
  assert.equal(j.payment.amount, 1000);
  j = transition(j, "pay", {}, legacyClient);
  j = transition(j, "start", {}, pro);
  j = transition(j, "finish", {}, pro);
  j = transition(j, "confirm", {}, legacyClient);
  assert.equal(j.status, "completed");
  assert.equal(j.visitPayment, null);
});
test("score e insignias distinguen nuevas cuentas, ejemplos y calidad provisional", () => {
  const demo = newState().professionals[0];
  assert(verified(demo));
  assert(proTier(demo, []));
  assert.equal(trustScore({ id: "new" }, []).label, "Nuevo");
  const before = trustScore(demo, []).score;
  const worse = trustScore(
    {
      ...demo,
      demoMetrics: {
        ...demo.demoMetrics,
        average: 2,
        cancellations: 20,
        claims: 20,
        punctuality: 0.3,
        quoteAcceptance: 0.2,
      },
    },
    [],
  ).score;
  assert(worse < before);
  assert(!verified({ ...demo, verification: { identity: true } }));
  assert(
    !proTier(
      { ...demo, demoMetrics: { ...demo.demoMetrics, completed: 1 } },
      [],
    ),
  );
});

test("no asigna una especialidad incompatible y los renglones de precio suman el total", () => {
  const pending = transition(fresh(), "pay_visit", {}, client);
  assert.throws(() =>
    transition(pending, "claim", {}, { ...pro, service: "Electricidad" }),
  );
  assert.throws(() =>
    transition(pending, "claim", {}, { ...pro, available: false }),
  );
  assert.throws(() =>
    transition(pending, "claim", {}, { ...pro, borough: "Iztapalapa" }),
  );
  const q = formalQuote(
    { ...quote, labor: 800.105, materials: 200.105 },
    fresh(),
  );
  assert.equal(q.total, Math.round((q.labor + q.materials) * 100) / 100);
});

test("no registra una visita con un precio distinto del que el cliente revisó", () => {
  assert.throws(() =>
    createJob({ ...input, approvedVisitAmount: 100 }, client),
  );
  assert.equal(
    createJob({ ...input, approvedVisitAmount: 250 }, client).visit.amount,
    250,
  );
});

test("rechaza fotos con contenido fuera de base64 e importes vacíos", () => {
  assert.throws(() =>
    validatePhotos([
      { ...photo, dataURL: 'data:image/jpeg;base64,YQ==" onerror="alert(1)' },
    ]),
  );
  assert.throws(() => formalQuote({ ...quote, labor: "" }, fresh()));
  assert.throws(() => formalQuote({ ...quote, materials: null }, fresh()));
});
