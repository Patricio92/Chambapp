import { enrichLegacyLocation } from "./location.js";
const DB = "chambapp-mvp",
  STORE = "state";
export const newState = () => ({
  version: 2,
  jobs: [],
  clients: [],
  professionals: demoProfessionals(),
  admins: [
    {
      id: "admin-demo",
      name: "Administración Alameda",
      email: "administracion@example.com",
      role: "admin",
      demo: true,
    },
  ],
  buildings: [
    {
      id: "building-demo-1",
      adminId: "admin-demo",
      name: "Condominio Alameda · demo",
      borough: "Cuauhtémoc",
      cp: "06000",
      colony: "Centro (Área 1)",
      address: "Domicilio de demostración",
      units: 24,
    },
    {
      id: "building-demo-2",
      adminId: "admin-demo",
      name: "Condominio Jardín · demo",
      borough: "Benito Juárez",
      cp: "03100",
      colony: "Del Valle Centro",
      address: "Domicilio de demostración",
      units: 12,
    },
  ],
  favorites: [],
  demoExpenses: [
    {
      id: "expense-demo-1",
      buildingId: "building-demo-1",
      description: "Mantenimiento de áreas comunes · demo",
      amount: 1800,
      at: Date.now() - 5 * 86400000,
    },
  ],
  active: { client: null, pro: "pro-demo-1", admin: "admin-demo" },
});
export function demoProfessionals() {
  return [
    {
      id: "pro-demo-1",
      name: "Mariana Soto",
      service: "Plomería",
      borough: "Cuauhtémoc",
      cp: "06700",
      colony: "Roma Norte",
      available: true,
      allBoroughs: true,
      role: "pro",
      demo: true,
      verification: {
        identity: true,
        phone: true,
        address: true,
        references: true,
        training: true,
      },
      demoMetrics: {
        completed: 48,
        average: 4.9,
        ratingCount: 45,
        cancellations: 1,
        claims: 1,
        punctuality: 0.96,
        quoteAcceptance: 0.9,
      },
    },
    {
      id: "pro-demo-2",
      name: "Luis Herrera",
      service: "Electricidad",
      borough: "Benito Juárez",
      cp: "03100",
      colony: "Del Valle Centro",
      available: true,
      allBoroughs: true,
      role: "pro",
      demo: true,
      verification: {
        identity: true,
        phone: true,
        address: true,
        references: true,
        training: true,
      },
      demoMetrics: {
        completed: 27,
        average: 4.8,
        ratingCount: 25,
        cancellations: 1,
        claims: 0,
        punctuality: 0.94,
        quoteAcceptance: 0.88,
      },
    },
  ];
}
export function migrateLegacy(old) {
  const state = newState();
  if (!old || !Array.isArray(old.jobs)) return state;
  state.legacyBackup = structuredClone(old);
  const profiles = old.professionals || (old.profile ? [old.profile] : []);
  for (const p of profiles) {
    if (!state.professionals.some((x) => x.id === p.id))
      state.professionals.push({
        ...enrichLegacyLocation(p),
        role: "pro",
        verification: {},
        legacy: true,
      });
  }
  if (old.profile) state.active.pro = old.profile.id;
  state.jobs = old.jobs.map((j) => {
    const data = enrichLegacyLocation(j);
    const completed = j.status === "completed";
    return {
      ...data,
      legacy: true,
      client: j.client || {
        id: "legacy-client",
        name: "Cliente de la versión anterior",
        role: "client",
      },
      status: [
        "claimed",
        "quoted",
        "accepted",
        "traveling",
        "working",
      ].includes(j.status)
        ? "legacy_review"
        : j.status,
      legacyQuote: j.quote || null,
      quote: null,
      quoteVersions: [],
      acceptance: null,
      payment: null,
      visit: {
        amount: 0,
        simulated: true,
        treatment: "credited",
        legacy: true,
      },
      visitPayment: null,
      evidence: { before: [], during: [], after: [] },
      photos: [],
      claims: [],
      events: [
        {
          id: crypto.randomUUID(),
          kind: "Historial importado sin inventar pagos o aceptaciones",
          actor: "Chambapp",
          at: Date.now(),
        },
      ],
      guarantee: null,
      rating:
        typeof j.rating === "number"
          ? { stars: j.rating, comment: "Calificación anterior" }
          : j.rating || null,
      ...(completed ? { status: "completed" } : {}),
    };
  });
  return state;
}
let connection;
function db() {
  return (connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        Error(
          "No se pudo abrir el almacenamiento local. Permite los datos del sitio.",
        ),
      );
  }));
}
export async function loadState() {
  const database = await db();
  const value = await new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE)
      .objectStore(STORE)
      .get("current");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (value) return value;
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem("chambapp-demo-v1"));
  } catch {}
  const state = legacy ? migrateLegacy(legacy) : newState();
  await saveState(state);
  return state;
}
export async function saveState(state) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        Error(
          "No se pudieron guardar los datos. Revisa el espacio disponible.",
        ),
      );
    tx.onabort = () =>
      reject(Error("No se guardaron los cambios. Inténtalo de nuevo."));
  });
}
