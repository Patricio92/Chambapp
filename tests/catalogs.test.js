import test from "node:test";
import assert from "node:assert/strict";
import { services, transition, createJob } from "../src/model.js";
import {
  boroughs,
  postalRecords,
  postalRecord,
  validLocation,
  nearbyJob,
  enrichLegacyLocation,
} from "../src/location.js";
test("el catálogo postal cubre las 16 alcaldías sin perder ceros iniciales", () => {
  assert.equal(boroughs.length, 16);
  assert.equal(postalRecords.length, 1394);
  assert.equal(
    new Set(postalRecords.map((r) => r.cp)).size,
    postalRecords.length,
  );
  assert.equal(postalRecord("01000").borough, "Álvaro Obregón");
  assert(postalRecord("06700").colonies.includes("Roma Norte"));
  for (const r of postalRecords) {
    assert.match(r.cp, /^\d{5}$/);
    assert(boroughs.includes(r.borough));
    assert(r.colonies.length > 0);
    for (const colony of r.colonies)
      assert(validLocation({ borough: r.borough, cp: r.cp, colony }));
  }
});
test("rechaza CP ajenos a CDMX y combinaciones inválidas", () => {
  assert.equal(postalRecord("99999"), undefined);
  assert.equal(postalRecord("20000"), undefined);
  assert(
    !validLocation({
      borough: "Iztapalapa",
      cp: "06700",
      colony: "Roma Norte",
    }),
  );
  assert(
    !validLocation({
      borough: "Cuauhtémoc",
      cp: "06700",
      colony: "Colonia inventada",
    }),
  );
  assert(
    !validLocation({
      borough: "Álvaro Obregón",
      cp: "1000",
      colony: "San Ángel",
    }),
  );
});
test("el profesional ve la misma especialidad en toda su alcaldía", () => {
  const p = {
    service: "Plomería",
    borough: "Cuauhtémoc",
    cp: "06700",
    colony: "Roma Norte",
  };
  const j = {
    status: "pending",
    service: "Plomería",
    borough: "Cuauhtémoc",
    cp: "06760",
    colony: "Roma Sur",
  };
  assert(nearbyJob(j, p));
  assert(!nearbyJob({ ...j, borough: "Iztapalapa" }, p));
  assert(!nearbyJob({ ...j, service: "Pintura" }, p));
  assert(!nearbyJob({ ...j, status: "quoted" }, p));
  assert(
    nearbyJob(
      { status: "pending", service: "Plomería", colony: "Roma Norte" },
      { service: "Plomería", colony: "Roma Norte" },
    ),
  );
});
test("preserva datos anteriores y solo completa ubicaciones sin ambigüedad", () => {
  const old = {
    id: "old",
    colony: "Roma Norte",
    status: "quoted",
    quote: { amount: 500 },
  };
  const next = enrichLegacyLocation(old);
  assert.equal(next.cp, "06700");
  assert.equal(next.borough, "Cuauhtémoc");
  assert.equal(next.quote.amount, 500);
  assert.equal(old.cp, undefined);
  const ambiguous = { colony: "Centro" };
  assert.equal(enrichLegacyLocation(ambiguous), ambiguous);
  const known = { colony: "Roma Norte", cp: "06700", borough: "Cuauhtémoc" };
  assert.equal(enrichLegacyLocation(known), known);
});
test("las 201 especialidades tienen categoría y completan el flujo aprobado", () => {
  assert.equal(services.length, 201);
  assert.equal(new Set(services.map((s) => s.name)).size, 201);
  assert.equal(new Set(services.map((s) => s.category)).size, 14);
  const client = { id: "c", name: "Cliente", role: "client" };
  for (const service of services) {
    assert(
      service.name && service.description && service.category && service.icon,
    );
    const pro = {
      id: "p",
      name: "Profesional",
      role: "pro",
      service: service.name,
      borough: "Cuauhtémoc",
    };
    let job = createJob(
      {
        service: service.name,
        borough: "Cuauhtémoc",
        cp: "06700",
        colony: "Roma Norte",
        problem: "Problema para probar este servicio",
        visitApproved: true,
      },
      client,
    );
    job = transition(job, "pay_visit", {}, client);
    job = transition(job, "claim", {}, pro);
    job = transition(
      job,
      "quote",
      {
        diagnosis: "Diagnóstico de prueba",
        labor: 600,
        materials: 0,
        includes: "Mano de obra",
        excludes: "Trabajo adicional",
        estimate: "2 horas",
        warranty: "7 días simulados",
      },
      pro,
    );
    job = transition(job, "accept", {}, client);
    job = transition(job, "pay", {}, client);
    job = transition(job, "start", {}, pro);
    job = transition(job, "finish", {}, pro);
    job = transition(job, "confirm", {}, client);
    assert.equal(job.service, service.name);
    assert.equal(job.status, "completed");
    assert.equal(job.payment.state, "released");
  }
});
