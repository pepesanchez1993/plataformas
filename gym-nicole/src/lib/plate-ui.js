// Modal de la calculadora de discos.

import { el, clear, openModal, field } from './ui.js';
import { computePlates, BAR_PRESETS, DEFAULT_PLATES } from './plate.js';

export function openPlateCalc(initialTarget = null) {
  const fTarget = field('Peso objetivo (kg)', 'target', { type: 'number', inputmode: 'decimal', step: '0.5', min: '0', placeholder: 'Ej. 100', value: initialTarget ?? '' });
  const fBar = field('Barra / base', 'bar', {
    input: 'select',
    options: BAR_PRESETS.map((b) => ({ value: b.id, label: b.label })),
  });
  const result = el('div', { class: 'plate-result' });

  const render = () => {
    const preset = BAR_PRESETS.find((b) => b.id === fBar.input.value) || BAR_PRESETS[0];
    const out = computePlates(fTarget.input.value, { base: preset.base, perSide: preset.perSide, plates: DEFAULT_PLATES });
    clear(result);
    if (out.error) { result.append(el('p', { class: 'muted' }, out.error)); return; }

    if (out.perSide.length === 0) {
      result.append(el('p', { class: 'muted' }, `Solo la base (${out.base} kg), sin discos.`));
    } else {
      const label = out.symmetric ? 'Discos por lado' : 'Discos (total)';
      result.append(el('div', { class: 'plate-label' }, label));
      result.append(el('div', { class: 'plate-disks' }, out.perSide.map((p) => el('span', { class: 'disk' }, `${p}`))));
      result.append(el('div', { class: 'plate-sum' }, out.symmetric
        ? `${out.base} kg barra + ${out.perSide.reduce((a, b) => a + b, 0)} kg × 2 lados = ${out.totalUsed} kg`
        : `Total cargado: ${out.totalUsed} kg`));
    }
    if (out.remainder > 0) result.append(el('p', { class: 'muted small' }, `No se puede afinar ${out.remainder} kg con los discos disponibles.`));
  };

  fTarget.input.addEventListener('input', render);
  fBar.input.addEventListener('change', render);

  const body = el('div', { class: 'stack' }, [
    el('p', { class: 'muted small' }, 'Para máquinas plate-loaded (Hammer Strength) y barra libre (Eleiko/Rogue).'),
    fTarget.wrap, fBar.wrap, result,
  ]);
  render();
  openModal('Calculadora de discos', body);
}
