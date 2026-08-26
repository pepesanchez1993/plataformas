// Catálogo de máquinas Fitness Park (editable por el usuario dentro de la app).
// Basado en el equipamiento real: Technogym Artis/Selection, Hammer Strength (placas),
// peso libre Eleiko/Rogue, y complementos gym80/Watson.
//
// Campos: id, name, zone, source, club, notes, cardio.
//  - zone:   piernas | pecho | espalda | hombros | brazos | peso-libre | cardio
//  - source: technogym-artis | hammer-strength | eleiko-rogue | gym80 | watson | otro
//  - club:   sede de Fitness Park (por si el usuario entrena en varias); editable.
//  - notes:  ajustes personales (altura de asiento, respaldo, pin, etc.).
//  - cardio: true → no pide peso al registrar.

export const MACHINE_ZONES = [
  { id: 'piernas', label: 'Piernas', emoji: '🦵' },
  { id: 'pecho', label: 'Pecho', emoji: '🫁' },
  { id: 'espalda', label: 'Espalda', emoji: '🔙' },
  { id: 'hombros', label: 'Hombros', emoji: '💪' },
  { id: 'brazos', label: 'Brazos', emoji: '🦾' },
  { id: 'peso-libre', label: 'Peso libre / Hammer', emoji: '🏋️' },
  { id: 'cardio', label: 'Cardio', emoji: '🚴' },
];

export const MACHINE_SOURCES = [
  'technogym-artis',
  'hammer-strength',
  'eleiko-rogue',
  'gym80',
  'watson',
  'otro',
];

export const SEED_MACHINES = [
  // ---- Piernas ----
  { id: 'prensa-piernas', name: 'Prensa de Piernas', zone: 'piernas', source: 'technogym-artis' },
  { id: 'ext-cuadriceps', name: 'Extensión de Cuádriceps', zone: 'piernas', source: 'technogym-artis' },
  { id: 'curl-isquios', name: 'Curl de Isquios (sentado)', zone: 'piernas', source: 'technogym-artis' },
  { id: 'sentadilla-smith', name: 'Sentadilla Guiada (Smith)', zone: 'piernas', source: 'technogym-artis' },
  { id: 'abductores', name: 'Máquina de Abductores', zone: 'piernas', source: 'technogym-artis' },
  { id: 'multi-hip', name: 'Multi Hip (glúteo/cadera)', zone: 'piernas', source: 'technogym-artis' },
  { id: 'gemelo-pie', name: 'Gemelo de Pie', zone: 'piernas', source: 'gym80', notes: 'Alternativa: en Smith con step.' },

  // ---- Pecho ----
  { id: 'press-pecho', name: 'Press de Pecho', zone: 'pecho', source: 'technogym-artis' },
  { id: 'pec-deck', name: 'Aperturas de Pecho (Pec Deck)', zone: 'pecho', source: 'technogym-artis' },

  // ---- Espalda ----
  { id: 'jalon-barra', name: 'Jalón con Barra (Lat Machine)', zone: 'espalda', source: 'technogym-artis' },
  { id: 'jalon-vertical', name: 'Jalón Vertical (Vertical Traction)', zone: 'espalda', source: 'technogym-artis' },
  { id: 'remo-post', name: 'Remo y Hombro Posterior', zone: 'espalda', source: 'technogym-artis' },

  // ---- Hombros ----
  { id: 'press-hombros', name: 'Press de Hombros', zone: 'hombros', source: 'technogym-artis' },

  // ---- Brazos ----
  { id: 'curl-biceps', name: 'Curl de Bíceps', zone: 'brazos', source: 'technogym-artis' },
  { id: 'ext-triceps', name: 'Extensión de Tríceps', zone: 'brazos', source: 'technogym-artis' },

  // ---- Peso libre / Hammer Strength ----
  { id: 'press-banca-pl', name: 'Press Banca Plate-Loaded', zone: 'peso-libre', source: 'hammer-strength' },
  { id: 'remo-pl', name: 'Remo Plate-Loaded', zone: 'peso-libre', source: 'hammer-strength' },
  { id: 'press-militar-pl', name: 'Press Militar Plate-Loaded', zone: 'peso-libre', source: 'hammer-strength' },
  { id: 'sentadilla-hack', name: 'Sentadilla Hack', zone: 'peso-libre', source: 'hammer-strength' },
  { id: 'sentadilla-libre', name: 'Sentadilla Barra Libre', zone: 'peso-libre', source: 'eleiko-rogue', notes: 'Barra y discos Eleiko/Rogue.' },
  { id: 'peso-muerto', name: 'Peso Muerto (barra libre)', zone: 'peso-libre', source: 'eleiko-rogue', notes: 'Barra y discos Eleiko/Rogue.' },
  { id: 'press-banca-libre', name: 'Press Banca Libre', zone: 'peso-libre', source: 'eleiko-rogue', notes: 'Barra y discos Eleiko/Rogue.' },

  // ---- Cardio (sin registro de peso) ----
  { id: 'artis-bike', name: 'Bicicleta Artis Bike', zone: 'cardio', source: 'technogym-artis', cardio: true },
  { id: 'artis-recline', name: 'Bicicleta Reclinada Artis Recline', zone: 'cardio', source: 'technogym-artis', cardio: true },
  { id: 'artis-climb', name: 'Escaleras Artis Climb', zone: 'cardio', source: 'technogym-artis', cardio: true },
].map((m) => ({ club: '', notes: '', cardio: false, ...m }));
