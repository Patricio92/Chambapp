export const activeStatuses = [
  "claimed",
  "quoted",
  "accepted",
  "working",
  "awaiting_confirmation",
  "legacy_review",
];
export function isBusy(profile, jobs) {
  return jobs.some(
    (j) =>
      j.professional?.id === profile.id && activeStatuses.includes(j.status),
  );
}
export function canServe(request, profile, jobs = []) {
  return Boolean(
    profile &&
    profile.available !== false &&
    request.service === profile.service &&
    (profile.allBoroughs ||
      !request.borough ||
      profile.borough === request.borough) &&
    !isBusy(profile, jobs),
  );
}
export function rankedProfessionals(request, profiles, jobs = []) {
  return profiles.filter((p) => canServe(request, p, jobs));
}
