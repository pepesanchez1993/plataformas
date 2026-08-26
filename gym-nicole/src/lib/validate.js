// Validación de formularios. Devuelve { ok, errors } donde errors es
// un objeto { campo: mensaje } para pintar los mensajes junto a cada input.

// Valida un registro de entrenamiento antes de guardar.
export function validateWorkoutLog(input, { isCardio = false } = {}) {
  const errors = {};
  if (!input.machineId) errors.machineId = 'Selecciona un ejercicio o máquina.';
  if (!input.dateISO) errors.dateISO = 'Indica la fecha.';

  if (!isCardio) {
    const w = Number(input.weightKg);
    if (input.weightKg === '' || input.weightKg == null || Number.isNaN(w)) {
      errors.weightKg = 'Introduce el peso usado (kg).';
    } else if (w < 0) {
      errors.weightKg = 'El peso no puede ser negativo.';
    } else if (w > 1000) {
      errors.weightKg = 'Peso demasiado alto, revísalo.';
    }
  }

  const sets = Number(input.setsDone);
  if (input.setsDone !== '' && (Number.isNaN(sets) || sets < 0 || sets > 50)) {
    errors.setsDone = 'Número de series no válido.';
  }

  if (input.rpe !== '' && input.rpe != null) {
    const rpe = Number(input.rpe);
    if (Number.isNaN(rpe) || rpe < 1 || rpe > 10) errors.rpe = 'RPE debe estar entre 1 y 10.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

// Valida una máquina del catálogo.
export function validateMachine(input) {
  const errors = {};
  if (!input.name || !input.name.trim()) errors.name = 'El nombre es obligatorio.';
  if (!input.zone) errors.zone = 'Selecciona una zona.';
  return { ok: Object.keys(errors).length === 0, errors };
}

// Valida una rutina.
export function validateRoutine(input) {
  const errors = {};
  if (!input.name || !input.name.trim()) errors.name = 'Ponle un nombre a la rutina.';
  if (!input.exercises || input.exercises.length === 0) errors.exercises = 'Añade al menos un ejercicio.';
  return { ok: Object.keys(errors).length === 0, errors };
}

// Campos numéricos admitidos en una medición corporal, con su rango válido.
export const BODY_METRIC_RANGES = {
  weightKg: [1, 500],
  grasa: [1, 70],
  cintura: [30, 250],
  pecho: [40, 250],
  cadera: [40, 250],
  brazo: [10, 100],
  muslo: [20, 150],
  cuello: [20, 80],
};

// Valida una medición corporal (peso y/o medidas). Basta con un dato.
export function validateBodyMetric(input) {
  const errors = {};
  if (!input.dateISO) errors.dateISO = 'Indica la fecha.';

  let anyFilled = false;
  for (const [key, [min, max]] of Object.entries(BODY_METRIC_RANGES)) {
    const raw = input[key];
    if (raw === '' || raw == null) continue;
    anyFilled = true;
    const v = Number(raw);
    if (Number.isNaN(v) || v < min || v > max) errors[key] = `Valor fuera de rango (${min}–${max}).`;
  }
  if (!anyFilled) errors.weightKg = 'Introduce al menos un dato (peso o una medida).';

  return { ok: Object.keys(errors).length === 0, errors };
}

// Valida el perfil corporal (altura y fecha de nacimiento, ambos opcionales).
export function validateProfile(input) {
  const errors = {};
  if (input.alturaCm !== '' && input.alturaCm != null) {
    const h = Number(input.alturaCm);
    if (Number.isNaN(h) || h < 80 || h > 260) errors.alturaCm = 'Altura no válida (80–260 cm).';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
