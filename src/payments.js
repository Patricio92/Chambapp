// Adapter boundary: real providers must verify server-side webhooks and ownership.
// The prototype never sends money, tokens or payment data to a provider.
export const paymentLabels = {
  pending: "Pago pendiente",
  protected: "Pago protegido",
  working: "Trabajo en proceso",
  awaiting: "Esperando confirmación",
  released: "Pago liberado",
  disputed: "En disputa",
  legacy: "Sin pago registrado",
};
export function createPayment(amount) {
  return {
    provider: "simulation",
    simulated: true,
    currency: "MXN",
    amount,
    state: "pending",
    events: [],
  };
}
export const simulationPaymentAdapter = {
  change(payment, state, now) {
    return {
      ...payment,
      state,
      events: [...payment.events, { state, at: now }],
      ...(state === "protected" ? { protectedAt: now } : {}),
      ...(state === "released" && payment.releasedAt == null
        ? { releasedAt: now }
        : {}),
    };
  },
  protect(payment, now) {
    if (payment.state !== "pending") throw Error("Este pago ya fue procesado.");
    return this.change(payment, "protected", now);
  },
  release(payment, now) {
    if (payment.state !== "awaiting")
      throw Error("El pago requiere confirmación del cliente.");
    return this.change(payment, "released", now);
  },
};
