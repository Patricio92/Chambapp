const clamp = (n) => Math.max(0, Math.min(1, n));
export function professionalMetrics(profile, jobs = []) {
  const own = jobs.filter((j) => j.professional?.id === profile.id),
    done = own.filter((j) => j.status === "completed"),
    ratings = done
      .map((j) => (typeof j.rating === "number" ? j.rating : j.rating?.stars))
      .filter(Boolean);
  const seed = profile.demoMetrics || {},
    completed = (seed.completed || 0) + done.length;
  const count = (seed.ratingCount || 0) + ratings.length;
  const average = count
    ? ((seed.average || 0) * (seed.ratingCount || 0) +
        ratings.reduce((a, b) => a + b, 0)) /
      count
    : 0;
  const quoted = own.filter((j) => j.quote),
    accepted = quoted.filter((j) => j.acceptance);
  return {
    completed,
    average,
    ratingCount: count,
    cancellations: seed.cancellations || 0,
    claims: (seed.claims || 0) + own.filter((j) => j.claims?.length).length,
    punctuality: seed.punctuality ?? 1,
    quoteAcceptance: quoted.length
      ? accepted.length / quoted.length
      : (seed.quoteAcceptance ?? 0.5),
  };
}
export function trustScore(profile, jobs = []) {
  const m = professionalMetrics(profile, jobs),
    volume = clamp(m.completed / 50),
    rating = m.ratingCount ? m.average / 5 : 0.6;
  const cancel = 1 - clamp(m.cancellations / Math.max(1, m.completed)),
    claims = 1 - clamp(m.claims / Math.max(1, m.completed));
  const score = Math.round(
    100 *
      (rating * 0.35 +
        volume * 0.15 +
        cancel * 0.15 +
        claims * 0.15 +
        clamp(m.punctuality) * 0.1 +
        clamp(m.quoteAcceptance) * 0.1),
  );
  return {
    ...m,
    score,
    label:
      m.completed === 0
        ? "Nuevo"
        : score >= 90
          ? "Excelente"
          : score >= 75
            ? "Muy bueno"
            : "En desarrollo",
    simulated: true,
  };
}
export const verificationNames = {
  identity: "Identidad verificada",
  phone: "Teléfono verificado",
  address: "Dirección verificada",
  references: "Referencias verificadas",
  training: "Capacitación",
};
export function verified(profile) {
  return ["identity", "phone", "address", "references"].every(
    (k) => profile.verification?.[k] === true,
  );
}
export function proTier(profile, jobs) {
  const m = trustScore(profile, jobs);
  return verified(profile) && m.score >= 90 && m.completed >= 20;
}
