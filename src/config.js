export const brand = {
  name: "Chambapp",
  tagline: "Una mano, justo cuando la necesitas.",
  promise: "Profesionales verificados. Precio aprobado. Trabajo protegido.",
};
export const pricing = {
  version: "demo-1",
  currency: "MXN",
  diagnosticBase: 250,
  diagnosticTreatment: "credited",
  rules: [],
};
export function visitPrice(
  { service, urgent, borough, hour } = {},
  now = Date.now(),
) {
  hour ??= Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  const rule = pricing.rules.find(
    (r) =>
      (!r.service || r.service === service) &&
      (r.urgent == null || r.urgent === urgent) &&
      (!r.borough || r.borough === borough) &&
      (r.hour == null || r.hour === hour),
  );
  return {
    amount: rule?.amount ?? pricing.diagnosticBase,
    currency: pricing.currency,
    version: pricing.version,
    treatment: pricing.diagnosticTreatment,
    simulated: true,
  };
}
export const guaranteePolicy = {
  days: 7,
  scope: "Mano de obra",
  simulated: true,
  version: "demo-1",
};
