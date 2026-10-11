import test from "node:test";
import assert from "node:assert/strict";
import { isBusy, canServe, rankedProfessionals } from "../src/broker.js";
const p = {
  id: "p",
  service: "Plomería",
  borough: "Cuauhtémoc",
  available: true,
};
const request = {
  status: "pending",
  service: "Plomería",
  borough: "Cuauhtémoc",
};
test("cobertura de demostración respeta especialidad, alcaldía y disponibilidad", () => {
  assert(canServe(request, p));
  assert(!canServe({ ...request, service: "Electricidad" }, p));
  assert(!canServe({ ...request, borough: "Iztapalapa" }, p));
  assert(
    canServe(
      { ...request, borough: "Iztapalapa" },
      { ...p, allBoroughs: true },
    ),
  );
  assert(!canServe(request, { ...p, available: false }));
  assert.deepEqual(
    rankedProfessionals(request, [p, { ...p, id: "q", service: "Pintura" }]),
    [p],
  );
});
test("un profesional espera a la confirmación del cliente antes de aceptar otro servicio", () => {
  for (const status of [
    "claimed",
    "quoted",
    "accepted",
    "working",
    "awaiting_confirmation",
    "legacy_review",
  ]) {
    const jobs = [{ status, professional: p }];
    assert(isBusy(p, jobs));
    assert(!canServe(request, p, jobs));
  }
  for (const status of ["completed", "rejected"])
    assert(!isBusy(p, [{ status, professional: p }]));
});
