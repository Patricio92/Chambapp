import { postalRecords } from "./data/postal.js";
export { postalRecords };
export const boroughs = [...new Set(postalRecords.map((r) => r.borough))].sort(
  (a, b) => a.localeCompare(b, "es"),
);
const byCP = new Map(postalRecords.map((r) => [r.cp, r]));
export const postalRecord = (cp) => byCP.get(String(cp).trim());
export const postalCodes = (borough) =>
  postalRecords.filter((r) => !borough || r.borough === borough);
export function validLocation({ borough, cp, colony }) {
  const record = postalRecord(cp);
  return Boolean(
    record && record.borough === borough && record.colonies.includes(colony),
  );
}
export function nearbyJob(job, profile) {
  if (
    job.status !== "pending" ||
    job.service !== profile.service ||
    profile.available === false
  )
    return false;
  if (job.borough && profile.borough) return job.borough === profile.borough;
  return job.colony === profile.colony;
}
// Only enrich legacy data when the colony identifies one exact postal record.
export function enrichLegacyLocation(item) {
  if (!item || item.cp || !item.colony) return item;
  // Generic names from the original demo are not exact postal settlements.
  if (
    [
      "Centro",
      "Polanco",
      "Coyoacán",
      "Del Valle",
      "Narvarte",
      "Otra colonia",
    ].includes(item.colony)
  )
    return item;
  const matches = postalRecords.filter((r) => r.colonies.includes(item.colony));
  return matches.length === 1
    ? { ...item, borough: matches[0].borough, cp: matches[0].cp }
    : item;
}
