// Métricas de entrenamiento: 1RM estimado, detección de PRs y volumen por grupo.

// --- 1RM estimado ---
// Epley:   1RM = peso · (1 + reps/30)
// Brzycki: 1RM = peso · 36 / (37 - reps)
export function est1RM(weightKg, reps, formula = 'epley') {
  const w = Number(weightKg), r = Number(reps);
  if (!w || !r || r < 1) return null;
  if (r === 1) return w;
  if (formula === 'brzycki') {
    if (r >= 37) return null;
    return w * 36 / (37 - r);
  }
  return w * (1 + r / 30);
}

// Reps máximas de una serie de un log (para 1RM y PR de fuerza).
export function topReps(log) {
  if (Array.isArray(log.repsPerSet) && log.repsPerSet.length) return Math.max(...log.repsPerSet);
  return null;
}

// 1RM estimado de un log (usa el peso y las reps de su mejor serie).
export function log1RM(log, formula = 'epley') {
  const reps = topReps(log) ?? (log.setsDone ? 1 : null);
  if (log.weightKg == null || reps == null) return null;
  return est1RM(log.weightKg, reps, formula);
}

// Volumen de un log = peso · series · reps medias (kg totales movidos).
export function logVolume(log) {
  if (log.weightKg == null) return 0;
  const reps = Array.isArray(log.repsPerSet) && log.repsPerSet.length
    ? log.repsPerSet.reduce((a, b) => a + b, 0)
    : (log.setsDone || 0) * (topReps(log) || 0);
  return log.weightKg * reps;
}

// Series efectivas de un log (para volumen por grupo muscular).
export function logSets(log) {
  if (Array.isArray(log.repsPerSet) && log.repsPerSet.length) return log.repsPerSet.length;
  return log.setsDone || 0;
}

// --- Detección de PRs ---
// Compara un log nuevo contra el histórico previo del mismo ejercicio.
// Devuelve array de tipos batidos: 'weight' | '1rm' | 'volume'.
export function detectPRs(newLog, previousLogs) {
  const prs = [];
  if (newLog.weightKg == null) return prs;
  const prev = previousLogs.filter((l) => l.machineId === newLog.machineId && l.id !== newLog.id && l.weightKg != null);

  const maxWeight = prev.reduce((m, l) => Math.max(m, l.weightKg), 0);
  if (newLog.weightKg > maxWeight) prs.push('weight');

  const new1 = log1RM(newLog);
  if (new1 != null) {
    const max1 = prev.reduce((m, l) => Math.max(m, log1RM(l) || 0), 0);
    if (new1 > max1 + 0.01) prs.push('1rm');
  }

  const newVol = logVolume(newLog);
  if (newVol > 0) {
    const maxVol = prev.reduce((m, l) => Math.max(m, logVolume(l)), 0);
    if (newVol > maxVol) prs.push('volume');
  }
  return prs;
}

// Último log (más reciente) de un ejercicio, para "ghost sets".
export function lastLogFor(machineId, logs) {
  return logs
    .filter((l) => l.machineId === machineId && l.weightKg != null)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0] || null;
}

// Objetivo de próxima sesión (doble progresión): sube reps hasta el tope del rango,
// luego sube peso y baja al mínimo del rango. `targetReps` como "8-10" o "12".
export function nextSessionTarget(lastLog, targetReps, stepKg = 2.5) {
  if (!lastLog || lastLog.weightKg == null) return null;
  const range = String(targetReps || '').match(/(\d+)\s*-\s*(\d+)/);
  const top = range ? Number(range[2]) : Number(String(targetReps).match(/\d+/)?.[0] || 0);
  const bottom = range ? Number(range[1]) : top;
  const done = topReps(lastLog) || 0;
  if (top && done >= top) {
    return { weightKg: +(lastLog.weightKg + stepKg).toFixed(1), reps: bottom, reason: 'Sube peso (llegaste al tope de reps)' };
  }
  return { weightKg: lastLog.weightKg, reps: Math.min((done || bottom) + 1, top || done + 1), reason: 'Añade 1 rep manteniendo el peso' };
}

// --- Volumen semanal por grupo muscular ---
// logs con machine.zone resuelta. windowDays: 7/14/30. Devuelve { zoneId: {sets, volume} }.
export function volumeByZone(logs, machinesById, windowDays = 7) {
  const since = Date.now() - windowDays * 86400000;
  const acc = {};
  for (const l of logs) {
    if (new Date(l.dateISO).getTime() < since) continue;
    const zone = machinesById.get(l.machineId)?.zone;
    if (!zone) continue;
    if (!acc[zone]) acc[zone] = { sets: 0, volume: 0 };
    acc[zone].sets += logSets(l);
    acc[zone].volume += logVolume(l);
  }
  return acc;
}

// --- Racha de días de entrenamiento consecutivos ---
export function currentStreak(logs) {
  if (!logs.length) return 0;
  const days = new Set(logs.map((l) => l.dateISO.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  // Si hoy no hay, la racha puede seguir viva si ayer entrenó.
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}
