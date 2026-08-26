// Plan de hipertrofia de 12 semanas, 3 mesociclos de 4 semanas.
// Contenido exacto del enunciado, mapeado a máquinas del catálogo Fitness Park.
//
// Modelo:
//   PLAN_12.mesocycles[] = { n, name, subtitle, weeks:[..], repRange, days:[..] }
//   day = { day, type:'workout'|'rest', name, focus, exercises:[..], note }
//   exercise = { machineId, label, sets, reps, restSec }
// La progresión semana a semana dentro de un mesociclo es por CARGA (mismo esquema
// de series/reps, subiendo kilos); se refleja en `weekNote`.

// Helper compacto: ejercicio del plan.
const ex = (machineId, sets, reps, restSec, label) => ({ machineId, sets, reps, restSec, label: label || null });

const REST = { day: 6, type: 'rest', name: 'Descanso / Cardio ligero', focus: 'Recuperación', exercises: [], note: 'Bici Artis Bike / Recline 20-30 min, intensidad baja. Día 7: descanso.' };

export const PLAN_12 = {
  id: 'plan12',
  name: 'Hipertrofia · 12 semanas',
  goal: 'Ganar masa muscular (100 → objetivo)',
  daysPerWeek: '5-6',
  weekNote: 'Sube la carga ~2,5-5 % respecto a la semana anterior manteniendo el rango de reps. Semana 4/8/12 = pico del mesociclo.',
  mesocycles: [
    // ================= MESOCICLO 1 — Adaptación (10-15 reps) =================
    {
      n: 1,
      name: 'Adaptación',
      subtitle: '10-15 reps · técnica y base',
      weeks: [1, 2, 3, 4],
      repRange: '10-15',
      days: [
        {
          day: 1, type: 'workout', name: 'Push A', focus: 'Pecho / Hombro / Tríceps',
          exercises: [
            ex('press-pecho', 3, '12-15', 90),
            ex('press-hombros', 3, '12-15', 90),
            ex('pec-deck', 3, '15', 60),
            ex('press-banca-pl', 2, '12', 90),
            ex('ext-triceps', 3, '15', 45),
          ],
        },
        {
          day: 2, type: 'workout', name: 'Pull A', focus: 'Espalda / Bíceps',
          exercises: [
            ex('jalon-vertical', 3, '12-15', 90, 'Jalón Vertical (dominadas asistidas)'),
            ex('jalon-barra', 3, '12-15', 90),
            ex('remo-pl', 3, '12', 90),
            ex('remo-post', 3, '15', 60),
            ex('curl-biceps', 3, '15', 45),
          ],
        },
        {
          day: 3, type: 'workout', name: 'Legs', focus: 'Piernas completo',
          exercises: [
            ex('prensa-piernas', 4, '12-15', 90),
            ex('sentadilla-smith', 3, '12', 120),
            ex('curl-isquios', 3, '15', 60),
            ex('ext-cuadriceps', 3, '15', 60),
            ex('multi-hip', 3, '15', 60, 'Multi Hip (glúteo)'),
            ex('gemelo-pie', 4, '15-20', 45),
          ],
        },
        {
          day: 4, type: 'workout', name: 'Push B', focus: 'Pecho / Hombro / Tríceps',
          note: 'Variante: Press Banca Plate-Loaded como principal.',
          exercises: [
            ex('press-banca-pl', 3, '12', 90),
            ex('press-hombros', 3, '12', 90),
            ex('press-pecho', 3, '12-15', 90),
            ex('pec-deck', 3, '15', 60),
            ex('ext-triceps', 3, '15', 45),
          ],
        },
        {
          day: 5, type: 'workout', name: 'Pull B', focus: 'Espalda / Bíceps',
          note: 'Jalón con Barra como principal; curl con barra libre Eleiko si hay.',
          exercises: [
            ex('jalon-barra', 3, '12', 90),
            ex('remo-pl', 3, '12', 90),
            ex('jalon-vertical', 3, '12-15', 90),
            ex('remo-post', 3, '15', 60),
            ex('curl-biceps', 3, '15', 45, 'Curl de Bíceps (barra libre Eleiko si hay)'),
          ],
        },
        REST,
      ],
    },

    // ================= MESOCICLO 2 — Volumen (8-12 reps) =================
    {
      n: 2,
      name: 'Volumen',
      subtitle: '8-12 reps · acumulación',
      weeks: [5, 6, 7, 8],
      repRange: '8-12',
      days: [
        {
          day: 1, type: 'workout', name: 'Push', focus: 'Pecho / Hombro / Tríceps',
          exercises: [
            ex('press-banca-pl', 4, '8-10', 120),
            ex('press-hombros', 3, '10-12', 90),
            ex('press-pecho', 3, '10-12', 90),
            ex('pec-deck', 3, '12-15', 60),
            ex('ext-triceps', 3, '12', 60),
          ],
        },
        {
          day: 2, type: 'workout', name: 'Pull', focus: 'Espalda / Bíceps',
          exercises: [
            ex('jalon-barra', 4, '8-10', 120),
            ex('remo-pl', 3, '10-12', 90),
            ex('jalon-vertical', 3, '10-12', 90),
            ex('remo-post', 3, '12-15', 60),
            ex('curl-biceps', 3, '12', 60),
          ],
        },
        {
          day: 3, type: 'workout', name: 'Legs', focus: 'Piernas completo',
          exercises: [
            ex('sentadilla-smith', 4, '8-10', 120, 'Sentadilla Guiada (Smith) o Barra Libre Eleiko'),
            ex('prensa-piernas', 4, '10-12', 90),
            ex('curl-isquios', 3, '12', 60),
            ex('ext-cuadriceps', 3, '12-15', 60),
            ex('multi-hip', 3, '15', 60),
            ex('gemelo-pie', 4, '15', 45),
          ],
        },
        {
          day: 4, type: 'workout', name: 'Push B', focus: 'Variante fuerza',
          exercises: [
            ex('press-banca-pl', 4, '6-8', 150),
            ex('press-hombros', 3, '8-10', 90),
            ex('press-pecho', 3, '10', 90),
            ex('ext-triceps', 3, '12', 60),
          ],
        },
        {
          day: 5, type: 'workout', name: 'Pull B', focus: 'Variante fuerza',
          exercises: [
            ex('remo-pl', 4, '6-8', 150),
            ex('jalon-barra', 3, '8-10', 90),
            ex('jalon-vertical', 3, '10', 90),
            ex('curl-biceps', 3, '12', 60),
          ],
        },
        REST,
      ],
    },

    // ================= MESOCICLO 3 — Intensificación (6-10 reps) =================
    {
      n: 3,
      name: 'Intensificación',
      subtitle: '6-10 reps · carga alta',
      weeks: [9, 10, 11, 12],
      repRange: '6-10',
      days: [
        {
          day: 1, type: 'workout', name: 'Push', focus: 'Pecho / Hombro / Tríceps',
          exercises: [
            ex('press-banca-pl', 5, '6-8', 150),
            ex('press-hombros', 4, '6-8', 120),
            ex('press-pecho', 3, '8-10', 90),
            ex('pec-deck', 3, '10-12', 60),
            ex('ext-triceps', 3, '10', 60),
          ],
        },
        {
          day: 2, type: 'workout', name: 'Pull', focus: 'Espalda / Bíceps',
          exercises: [
            ex('jalon-barra', 5, '6-8', 150),
            ex('remo-pl', 4, '6-8', 120),
            ex('jalon-vertical', 3, '8-10', 90),
            ex('remo-post', 3, '10-12', 60),
            ex('curl-biceps', 3, '10', 60),
          ],
        },
        {
          day: 3, type: 'workout', name: 'Legs', focus: 'Piernas completo',
          exercises: [
            ex('sentadilla-libre', 5, '6-8', 150, 'Sentadilla Barra Libre (Eleiko/Rogue) o Guiada'),
            ex('prensa-piernas', 4, '8-10', 120),
            ex('curl-isquios', 3, '10', 60),
            ex('ext-cuadriceps', 3, '10-12', 60),
            ex('multi-hip', 3, '12', 60),
            ex('gemelo-pie', 4, '12-15', 45),
          ],
        },
        {
          day: 4, type: 'workout', name: 'Push B', focus: 'Fuerza máxima',
          exercises: [
            ex('press-banca-pl', 5, '5-6', 180),
            ex('press-hombros', 3, '8', 120),
            ex('ext-triceps', 3, '10', 60),
          ],
        },
        {
          day: 5, type: 'workout', name: 'Pull B', focus: 'Fuerza máxima',
          exercises: [
            ex('remo-pl', 5, '5-6', 180),
            ex('jalon-barra', 3, '8', 120),
            ex('curl-biceps', 3, '10', 60),
          ],
        },
        REST,
      ],
    },
  ],
  finalNote: 'Tras la semana 12: semana de descarga (50 % del volumen, RPE ≤ 6) antes de reiniciar con cargas superiores.',
};

// Devuelve el mesociclo (y su índice) al que pertenece una semana 1-12.
export function mesocycleForWeek(week) {
  return PLAN_12.mesocycles.find((m) => m.weeks.includes(week)) || null;
}

// Total de sesiones de entrenamiento (excluye días de descanso) del plan completo.
export function totalPlanSessions() {
  return PLAN_12.mesocycles.reduce((acc, m) => {
    const workoutDays = m.days.filter((d) => d.type === 'workout').length;
    return acc + workoutDays * m.weeks.length;
  }, 0);
}
