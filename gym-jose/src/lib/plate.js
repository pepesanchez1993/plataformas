// Calculadora de discos para máquinas plate-loaded (Hammer Strength) y barra libre.
// Fitness Park usa mucho equipamiento plate-loaded, por eso es útil.

// Discos habituales en kg (Eleiko/Rogue y placas de gimnasio). Editable en el modal.
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

// Barras / puntos de partida habituales.
export const BAR_PRESETS = [
  { id: 'olimpica-20', label: 'Barra olímpica 20 kg', base: 20, perSide: true },
  { id: 'olimpica-15', label: 'Barra 15 kg (mujer)', base: 15, perSide: true },
  { id: 'ez-7', label: 'Barra Z / EZ 7 kg', base: 7, perSide: true },
  { id: 'plate-loaded', label: 'Máquina plate-loaded (sin barra)', base: 0, perSide: true },
  { id: 'total', label: 'Peso total (sin lados)', base: 0, perSide: false },
];

// Calcula qué discos poner. Para barras/máquinas simétricas reparte por lado.
// Devuelve { perSide: [discos por lado], totalUsed, remainder, base }.
export function computePlates(target, { base = 20, perSide = true, plates = DEFAULT_PLATES } = {}) {
  const t = Number(target);
  if (!t || Number.isNaN(t) || t < base) {
    return { perSide: [], totalUsed: base, remainder: 0, base, error: t < base ? `El objetivo es menor que la base (${base} kg).` : 'Objetivo no válido.' };
  }
  const loadable = t - base;
  const sorted = [...plates].sort((a, b) => b - a);

  if (!perSide) {
    // Reparto simple sobre el total.
    let rem = loadable;
    const used = [];
    for (const p of sorted) while (rem >= p - 1e-9) { used.push(p); rem = +(rem - p).toFixed(3); }
    return { perSide: used, totalUsed: +(base + (loadable - rem)).toFixed(2), remainder: +rem.toFixed(2), base, symmetric: false };
  }

  let perSideKg = loadable / 2;
  const side = [];
  for (const p of sorted) while (perSideKg >= p - 1e-9) { side.push(p); perSideKg = +(perSideKg - p).toFixed(3); }
  const remainder = +(perSideKg * 2).toFixed(2);
  const totalUsed = +(t - remainder).toFixed(2);
  return { perSide: side, totalUsed, remainder, base, symmetric: true };
}
