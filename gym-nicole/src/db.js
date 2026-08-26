// Capa de persistencia sobre IndexedDB (sin dependencias externas).
// El histórico de logs puede crecer mucho, por eso IndexedDB y no localStorage.
//
// Object stores:
//   machines      keyPath id            → catálogo Fitness Park (editable)
//   routines      keyPath id            → rutinas del usuario
//   workoutLogs   keyPath id, idx date  → registros de entrenamiento
//   bodyMetrics   keyPath id, idx date  → peso corporal / medidas
//   meta          keyPath key           → planProgress, settings, flag de seed

const DB_NAME = 'gym-nicole';
const DB_VERSION = 1;
export const STORES = ['machines', 'routines', 'workoutLogs', 'bodyMetrics', 'meta'];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('machines')) db.createObjectStore('machines', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('routines')) db.createObjectStore('routines', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('workoutLogs')) {
        const s = db.createObjectStore('workoutLogs', { keyPath: 'id' });
        s.createIndex('byDate', 'dateISO');
        s.createIndex('byMachine', 'machineId');
      }
      if (!db.objectStoreNames.contains('bodyMetrics')) {
        const s = db.createObjectStore('bodyMetrics', { keyPath: 'id' });
        s.createIndex('byDate', 'dateISO');
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      void e;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB'));
  });
  return _dbPromise;
}

function tx(store, mode) {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- CRUD genérico ----
export async function getAll(store) {
  return reqToPromise((await tx(store, 'readonly')).getAll());
}

export async function get(store, key) {
  return reqToPromise((await tx(store, 'readonly')).get(key));
}

export async function put(store, value) {
  const os = await tx(store, 'readwrite');
  await reqToPromise(os.put(value));
  return value;
}

export async function del(store, key) {
  const os = await tx(store, 'readwrite');
  return reqToPromise(os.delete(key));
}

export async function clear(store) {
  const os = await tx(store, 'readwrite');
  return reqToPromise(os.clear());
}

export async function bulkPut(store, values) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    values.forEach((v) => os.put(v));
    t.oncomplete = () => resolve(values.length);
    t.onerror = () => reject(t.error);
  });
}

// ---- Consultas por índice ----
export async function getByIndex(store, indexName, value) {
  const os = await tx(store, 'readonly');
  return reqToPromise(os.index(indexName).getAll(value));
}

// ---- meta helpers ----
export async function getMeta(key, fallback = null) {
  const row = await get('meta', key);
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  return put('meta', { key, value });
}

// ---- Export / import (backup completo) ----
export async function exportAll() {
  const dump = { app: 'gym-nicole', version: DB_VERSION, exportedAt: new Date().toISOString(), data: {} };
  for (const store of STORES) dump.data[store] = await getAll(store);
  return dump;
}

export async function importAll(dump, { replace = true } = {}) {
  if (!dump || typeof dump !== 'object' || !dump.data) {
    throw new Error('Backup no válido: falta el campo "data".');
  }
  for (const store of STORES) {
    const rows = dump.data[store];
    if (!Array.isArray(rows)) continue;
    if (replace) await clear(store);
    if (rows.length) await bulkPut(store, rows);
  }
  return true;
}

// ID único sin dependencias (crypto si existe, si no timestamp+random).
export function uid(prefix = '') {
  const rnd = (crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);
  return prefix ? `${prefix}_${rnd}` : rnd;
}
