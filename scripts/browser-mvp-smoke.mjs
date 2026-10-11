// Run with the app already started. Playwright is an optional development tool.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.CHAMBAPP_PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.CHAMBAPP_TEST_URL || "http://localhost:3000";
const output = process.env.CHAMBAPP_TEST_ARTIFACTS || "/tmp/chambapp-mvp-tests";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHAMBAPP_BROWSER_PATH
    ? { executablePath: process.env.CHAMBAPP_BROWSER_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMfkAAAAASUVORK5CYII=",
  "base64",
);
const payload = { name: "evidencia.png", mimeType: "image/png", buffer: png };
const errors = [],
  external = [];
async function readState(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("chambapp-mvp", 1);
        r.onsuccess = () => {
          const db = r.result;
          const get = db
            .transaction("state")
            .objectStore("state")
            .get("current");
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
async function checkLayout(page, label) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Overflow: " + label,
  );
}
async function mode(page, name) {
  await page.locator(`[data-role="${name}"]`).click();
}
async function openJob(page, id, role = "client") {
  await mode(page, role);
  await page.locator('[data-nav="history"]').click();
  await page.locator(`[data-detail="${id}"]`).click();
}
async function attach(page, key) {
  await page.locator(`[data-upload="${key}"]`).setInputFiles(payload);
  await page.locator(`[data-preview="${key}"] img`).waitFor();
}
async function evidence(page, id, stage) {
  const f = page.locator("form[data-form=evidence]");
  await f.locator("[name=stage]").selectOption(stage);
  await attach(page, "evidence-" + id);
  await f
    .getByRole("button", { name: "Guardar evidencia", exact: true })
    .click();
  await page.waitForFunction(
    ({ id, stage }) =>
      !document.querySelector(`[data-preview="evidence-${id}"] img`),
    { id, stage },
  );
}
async function sendQuote(page, id) {
  const f = page.locator("form[data-form=quote]");
  for (const [key, value] of Object.entries({
    diagnosis: "Empaque desgastado y fuga confirmada",
    labor: "800",
    materials: "200",
    includes: "Diagnóstico, empaque, instalación y prueba",
    excludes: "Cambios de tubería no descritos",
    estimate: "2 horas",
    notes: "Cerrar suministro durante la reparación",
  }))
    await f.locator(`[name="${key}"]`).fill(value);
  await attach(page, "quote-" + id);
  await f
    .getByRole("button", { name: "Enviar cotización al cliente", exact: true })
    .click();
  await page.locator(".page-heading .status.quoted").waitFor();
}
async function finishContract(page, id, customer, withPhotos = false) {
  await openJob(page, id, customer);
  await page.locator("[data-action=accept]").click();
  await page.locator("[data-action=pay]").waitFor();
  assert.equal(
    (await readState(page)).jobs.find((j) => j.id === id).payment.amount,
    750,
  );
  await openJob(page, id, "pro");
  assert.equal(await page.locator("[data-action=start]").count(), 0);
  await openJob(page, id, customer);
  await page.locator("[data-action=pay]").click();
  await page
    .locator(".payment-panel h2")
    .filter({ hasText: "Pago protegido" })
    .waitFor();
  await openJob(page, id, "pro");
  await page.locator("[data-action=start]").click();
  await page.locator(".page-heading .status.working").waitFor();
  if (withPhotos) {
    await evidence(page, id, "during");
    await evidence(page, id, "after");
  }
  await page.locator("[data-action=finish]").click();
  await page.locator(".page-heading .status.awaiting_confirmation").waitFor();
  let j = (await readState(page)).jobs.find((j) => j.id === id);
  assert.equal(j.payment.state, "awaiting");
  assert.equal(j.guarantee, null);
  await openJob(page, id, customer);
  await page.locator("[data-action=confirm]").click();
  await page.locator(".page-heading .status.completed").waitFor();
  j = (await readState(page)).jobs.find((j) => j.id === id);
  assert.equal(j.payment.state, "released");
  assert.equal(j.visitPayment.state, "released");
  assert(j.guarantee);
  assert.equal(j.acceptance.quote.total, 1000);
  return j;
}
try {
  for (const [label, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      ...(label === "mobile" ? { isMobile: true, hasTouch: true } : {}),
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(label + ": " + e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith(base) && !r.url().startsWith("data:"))
        external.push(r.url());
    });
    await page.goto(base);
    await page.locator(".hero").waitFor();
    assert.match(await page.title(), /Chambapp/);
    await checkLayout(page, label + " home");
    await page.screenshot({
      path: output + "/" + label + "-home.png",
      fullPage: true,
    });
    payload.buffer = await page.screenshot();
    // Catalog searching, accents, and retained request while creating an account.
    await page.locator("[data-search]").fill("electricidad");
    assert(
      (await page.locator(".service b").allTextContents()).includes(
        "Electricidad",
      ),
    );
    assert((await page.locator(".service").count()) < 6);
    await page.locator("[data-search]").fill("");
    let f = page.locator("form[data-form=request]");
    await f.locator("[name=cp]").fill("06700");
    await f.locator("[name=colony]").selectOption("Roma Norte");
    await f.locator("[name=address]").fill("Domicilio de prueba 123");
    await f
      .locator("[name=problem]")
      .fill("Una fuga de agua debajo del fregadero de la cocina.");
    await f.locator("[name=urgent]").check();
    await page
      .locator('[data-upload="request"]')
      .setInputFiles({
        name: "archivo-danado.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("not-a-photo"),
      });
    await page
      .locator(".notice")
      .filter({ hasText: "No pudimos leer esta fotografía" })
      .waitFor();
    await attach(page, "request");
    await f
      .getByRole("button", {
        name: "Revisar solicitud y precio →",
        exact: true,
      })
      .click();
    await page.locator("form[data-form=register]").waitFor();
    f = page.locator("form[data-form=register]");
    await f.locator("[name=name]").fill("Patricio de prueba");
    await f.locator("[name=email]").fill("patricio@example.com");
    await f.locator("[name=phone]").fill("5512345678");
    await f
      .getByRole("button", {
        name: "Crear mi cuenta de demostración",
        exact: true,
      })
      .click();
    f = page.locator("form[data-form=request]");
    assert.equal(
      await f.locator("[name=problem]").inputValue(),
      "Una fuga de agua debajo del fregadero de la cocina.",
    );
    assert(await f.locator("[name=urgent]").isChecked());
    assert.equal(await f.locator("[name=cp]").inputValue(), "06700");
    await f
      .getByRole("button", {
        name: "Revisar solicitud y precio →",
        exact: true,
      })
      .click();
    await page.getByRole("heading", { name: "Sin sorpresas." }).waitFor();
    await checkLayout(page, label + " review");
    await page.locator("[data-confirm-request]").click();
    await page.locator("[data-action=pay_visit]").waitFor();
    const id = await page
      .locator("[data-action=pay_visit]")
      .getAttribute("data-id");
    await page.locator("[data-action=pay_visit]").click();
    await mode(page, "pro");
    await page.locator(`[data-detail="${id}"]`).click();
    await page.locator("[data-action=claim]").click();
    await page.locator("form[data-form=quote]").waitFor();
    assert.equal(await page.locator("[data-action=start]").count(), 0);
    await page
      .locator("form[data-form=quote] [name=diagnosis]")
      .fill("Borrador conservado al adjuntar evidencia");
    await evidence(page, id, "before");
    assert.equal(
      await page.locator("form[data-form=quote] [name=diagnosis]").inputValue(),
      "Borrador conservado al adjuntar evidencia",
    );
    await sendQuote(page, id);
    await sendQuote(page, id);
    assert.equal(
      (await readState(page)).jobs.find((j) => j.id === id).quoteVersions
        .length,
      2,
    );
    await checkLayout(page, label + " professional quote");
    await page.screenshot({
      path: output + "/" + label + "-professional.png",
      fullPage: true,
    });
    const completed = await finishContract(page, id, "client", true);
    assert.equal(completed.photos.length, 1);
    for (const stage of ["before", "during", "after"])
      assert.equal(completed.evidence[stage].length, 1);
    f = page.locator("form[data-form=rate]");
    await f.locator("[name=stars]").selectOption("5");
    await f.locator("[name=comment]").fill("Trabajo claro y buen trato.");
    await f
      .getByRole("button", { name: "Enviar calificación", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Tu calificación", exact: true })
      .waitFor();
    await page.locator(".photos a").first().click();
    await page.locator(".photo-dialog").waitFor();
    await page
      .getByRole("button", { name: "Cerrar fotografía", exact: true })
      .click();
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.locator(".report-form summary").click();
    f = page.locator("form[data-form=report]");
    await f
      .locator("[name=description]")
      .fill("Regresó una pequeña fuga y necesito revisión.");
    await attach(page, "report-" + id);
    await f
      .getByRole("button", { name: "Enviar reporte", exact: true })
      .click();
    await page
      .locator(".payment-panel h2")
      .filter({ hasText: "En disputa" })
      .waitFor();
    assert.equal(
      (await readState(page)).jobs.find((j) => j.id === id).claims[0].covered,
      true,
    );
    for (const status of [
      "Contactando profesional",
      "Revisión técnica",
      "Resuelto",
    ]) {
      await page.locator("[data-claim-next]").click();
      await page
        .locator(".claim .status")
        .filter({ hasText: status })
        .waitFor();
    }
    assert.equal(
      (await readState(page)).jobs.find((j) => j.id === id).payment.state,
      "released",
    );
    await checkLayout(page, label + " full history");
    await page.screenshot({
      path: output + "/" + label + "-completed-service.png",
      fullPage: true,
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-receipt]").click(),
    ]);
    assert.match(download.suggestedFilename(), /Chambapp-servicio/);
    await download.saveAs(output + "/" + label + "-receipt.txt");
    await page.reload();
    await page.locator(".hero").waitFor();
    await page.locator("[data-nav=history]").click();
    await page.locator(`[data-detail="${id}"]`).click();
    let saved = (await readState(page)).jobs.find((j) => j.id === id);
    assert.equal(saved.rating.stars, 5);
    assert.equal(saved.evidence.after.length, 1);
    assert.equal(saved.claims[0].status, "Resuelto");
    // Reject a second quote; repair never starts, only the diagnostic can be confirmed.
    await mode(page, "client");
    f = page.locator("form[data-form=request]");
    await f.locator("[name=cp]").fill("06700");
    await f.locator("[name=colony]").selectOption("Roma Norte");
    await f
      .locator("[name=problem]")
      .fill("Otra fuga de agua en un baño de prueba.");
    await f
      .getByRole("button", {
        name: "Revisar solicitud y precio →",
        exact: true,
      })
      .click();
    await page.locator("[data-confirm-request]").click();
    await page.locator("[data-action=pay_visit]").waitFor();
    const rejectedId = await page
      .locator("[data-action=pay_visit]")
      .getAttribute("data-id");
    await page.locator("[data-action=pay_visit]").click();
    await mode(page, "pro");
    await page.locator(`[data-detail="${rejectedId}"]`).click();
    await page.locator("[data-action=claim]").click();
    await sendQuote(page, rejectedId);
    await openJob(page, rejectedId, "client");
    await page.locator("[data-action=reject]").click();
    await page.locator("[data-action=confirm_visit]").click();
    saved = (await readState(page)).jobs.find((j) => j.id === rejectedId);
    assert.equal(saved.status, "rejected");
    assert.equal(saved.payment, null);
    assert.equal(saved.visitPayment.state, "released");
    // Register a professional, demonstrate verification and edit without losing their identity.
    await mode(page, "pro");
    await page.locator("[data-register]").click();
    f = page.locator("form[data-form=register]");
    for (const [key, value] of Object.entries({
      name: "Ana de prueba",
      email: "ana@example.com",
      phone: "5512345678",
      cp: "06700",
    }))
      await f.locator(`[name=${key}]`).fill(value);
    await f.locator("[name=service]").selectOption("Pintura");
    await f.locator("[name=colony]").selectOption("Roma Norte");
    await f
      .getByRole("button", {
        name: "Crear mi cuenta de demostración",
        exact: true,
      })
      .click();
    await page.locator("[data-verify]").click();
    await page.locator(".verified-badge").first().waitFor();
    await page.locator("[data-edit-pro]").click();
    f = page.locator("form[data-form=register]");
    assert.equal(await f.locator("[name=name]").inputValue(), "Ana de prueba");
    await f.locator("[name=service]").selectOption("Electricidad");
    await f
      .getByRole("button", { name: "Guardar mi perfil", exact: true })
      .click();
    await page.locator("[data-availability]").click();
    assert.equal(
      (await readState(page)).professionals.find(
        (p) => p.name === "Ana de prueba",
      ).available,
      false,
    );
    await page.locator("[data-account]").selectOption("pro-demo-1");
    // Condominium dashboard: building, favorite, expense receipt, demo invite, complete common-area service.
    await mode(page, "admin");
    await page.locator('[data-favorite="pro-demo-1"]').click();
    await page.locator("[data-invite]").first().click();
    assert.match(await page.locator(".notice").innerText(), /No se enviaron/);
    const [expenseDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-expense-receipt]").click(),
    ]);
    assert.match(expenseDownload.suggestedFilename(), /Chambapp-gasto/);
    await page.getByText("Registrar otro edificio", { exact: true }).click();
    f = page.locator("form[data-form=building]");
    await f.locator("[name=name]").fill("Torre de prueba");
    await f.locator("[name=units]").fill("20");
    await f.locator("[name=cp]").fill("06700");
    await f.locator("[name=colony]").selectOption("Roma Norte");
    await f
      .getByRole("button", {
        name: "Guardar edificio de demostración",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "Torre de prueba", exact: true })
      .waitFor();
    const building = (await readState(page)).buildings.find(
      (b) => b.name === "Torre de prueba",
    );
    await page.locator(`[data-building-service="${building.id}"]`).click();
    f = page.locator("form[data-form=request]");
    assert.equal(await f.locator("[name=cp]").inputValue(), "06700");
    await f
      .locator("[name=problem]")
      .fill("Fuga en las tuberías de las áreas comunes del edificio.");
    await f
      .getByRole("button", {
        name: "Revisar solicitud y precio →",
        exact: true,
      })
      .click();
    await page.locator("[data-confirm-request]").click();
    await page.locator("[data-action=pay_visit]").waitFor();
    const adminId = await page
      .locator("[data-action=pay_visit]")
      .getAttribute("data-id");
    await page.locator("[data-action=pay_visit]").click();
    await mode(page, "client");
    await page.locator("[data-nav=history]").click();
    assert.equal(await page.locator(`[data-detail="${adminId}"]`).count(), 0);
    await mode(page, "pro");
    await page.locator(`[data-detail="${adminId}"]`).click();
    await page.locator("[data-action=claim]").click();
    await sendQuote(page, adminId);
    await finishContract(page, adminId, "admin");
    saved = (await readState(page)).jobs.find((j) => j.id === adminId);
    assert.equal(saved.buildingId, building.id);
    assert.equal(saved.client.role, "admin");
    await mode(page, "admin");
    await checkLayout(page, label + " administrator");
    assert.match(await page.locator(".dashboard-stats").innerText(), /1,000/);
    await page.screenshot({
      path: output + "/" + label + "-admin.png",
      fullPage: true,
    });
    await page.locator("[data-register]").click();
    f = page.locator("form[data-form=register]");
    await f.locator("[name=name]").fill("Administración nueva");
    await f.locator("[name=email]").fill("admin@example.com");
    await f.locator("[name=phone]").fill("5512345678");
    await f
      .getByRole("button", {
        name: "Crear mi cuenta de demostración",
        exact: true,
      })
      .click();
    assert.equal(await page.locator(".building").count(), 0);
    assert.equal(await page.locator(`[data-detail="${adminId}"]`).count(), 0);
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(external.length, 0, "Unexpected external integration");
    console.log(
      label +
        ": client, professional, administrator, photos, quotes, payment, claims, history and layout PASS",
    );
    await context.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { passed: ["desktop", "mobile"], errors, external },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e);
  throw e;
} finally {
  await browser.close();
}
