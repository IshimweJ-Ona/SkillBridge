import { createSeedDb, type MockDb } from "./fixtures";

const STORAGE_KEY = "skillbridge.mockDb.v1";

// In-memory fallback keeps the mock API callable during SSR (client
// components are rendered once on the server before hydration); it never
// persists there, only in the browser via localStorage.
let memoryDb: MockDb | null = null;

export function getDb(): MockDb {
  if (typeof window === "undefined") {
    memoryDb ??= createSeedDb();
    return memoryDb;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw) as MockDb;
  } catch {
    const seeded = createSeedDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveDb(db: MockDb) {
  if (typeof window === "undefined") {
    memoryDb = db;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDb() {
  const seeded = createSeedDb();
  saveDb(seeded);
  return seeded;
}

export function mockLatency(min = 250, max = 550) {
  const ms = Math.random() * (max - min) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
