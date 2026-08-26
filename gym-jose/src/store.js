// Estado compartido y lógica de dominio por encima de db.js.
// Mantiene un mapa de máquinas en memoria y coordina el seed inicial,
// el progreso del plan de 12 semanas y la creación de logs.

import * as db from './db.js';
import { SEED_MACHINES } from './data/seed-machines.js';
import { PLAN_12, mesocycleForWeek } from './data/seed-plan12.js';

const SEED_FLAG = 'seeded_v1';

export const state = {
  machines: [],
  machinesById: new Map(),
};

// Refresca el catálogo en memoria desde IndexedDB.
export async function refreshMachines() {
  state.machines = (await db.getAll('machines')).sort((a, b) => a.name.localeCompare(b.name));
  state.machinesById = new Map(state.machines.map((m) => [m.id, m]));
  return state.machines;
}

export function machineName(id) {
  return state.machinesById.get(id)?.name || id;
}

// Siembra el catálogo y el progreso del plan la primera vez.
export async function ensureSeeded() {
  const done = await db.getMeta(SEED_FLAG, false);
  if (!done) {
    await db.bulkPut('machines', SEED_MACHINES);
    await db.setMeta('planProgress', { currentWeek: 1, completed: {} });
    await db.setMeta(SEED_FLAG, true);
  }
  await refreshMachines();
}

// ---- Progreso del plan de 12 semanas ----
export async function getPlanProgress() {
  return db.getMeta('planProgress', { currentWeek: 1, completed: {} });
}

export async function setPlanProgress(progress) {
  return db.setMeta('planProgress', progress);
}

export function sessionKey(week, day) {
  return `w${week}d${day}`;
}

export function planStatus(progress) {
  const completedKeys = Object.keys(progress.completed || {}).filter((k) => progress.completed[k]);
  const meso = mesocycleForWeek(progress.currentWeek) || PLAN_12.mesocycles[0];
  // Total de sesiones de entrenamiento del plan.
  const total = PLAN_12.mesocycles.reduce(
    (acc, m) => acc + m.days.filter((d) => d.type === 'workout').length * m.weeks.length,
    0,
  );
  return {
    currentWeek: progress.currentWeek,
    mesocycle: meso,
    completedCount: completedKeys.length,
    total,
    percent: total ? Math.round((completedKeys.length / total) * 100) : 0,
  };
}

// ---- Logs ----
export async function addLog(log) {
  const record = { id: db.uid('log'), createdAt: new Date().toISOString(), ...log };
  await db.put('workoutLogs', record);
  return record;
}

// Genera automáticamente los logs de una sesión del plan (sección 2 → sección 1).
// Crea un log por ejercicio con planRef, sin peso (el usuario lo edita luego si quiere).
export async function logPlanSession(week, day, session) {
  const planRef = `plan12:${sessionKey(week, day)}`;
  const dateISO = new Date().toISOString();
  const created = [];
  for (const exercise of session.exercises) {
    const machine = state.machinesById.get(exercise.machineId);
    const record = {
      id: db.uid('log'),
      createdAt: dateISO,
      dateISO,
      machineId: exercise.machineId,
      routineId: null,
      planRef,
      weightKg: null,
      setsDone: typeof exercise.sets === 'number' ? exercise.sets : null,
      repsPerSet: [],
      targetReps: exercise.reps,
      rpe: null,
      notes: `Plan 12 sem · ${session.name}${machine?.cardio ? ' (cardio)' : ''}`,
    };
    await db.put('workoutLogs', record);
    created.push(record);
  }
  return created;
}

// Elimina los logs asociados a una sesión del plan (al desmarcarla).
export async function removePlanSessionLogs(week, day) {
  const planRef = `plan12:${sessionKey(week, day)}`;
  const logs = await db.getAll('workoutLogs');
  for (const l of logs) if (l.planRef === planRef) await db.del('workoutLogs', l.id);
}

export { PLAN_12 };
