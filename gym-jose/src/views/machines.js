// Pestaña "Máquinas": catálogo Fitness Park, editable (crear/editar/eliminar).

import * as db from '../db.js';
import { state, refreshMachines } from '../store.js';
import { MACHINE_ZONES, MACHINE_SOURCES } from '../data/seed-machines.js';
import { el, clear, field, paintErrors, openModal, confirmDialog, toast } from '../lib/ui.js';
import { validateMachine } from '../lib/validate.js';

function zoneLabel(id) {
  return MACHINE_ZONES.find((z) => z.id === id)?.label || id;
}
function zoneEmoji(id) {
  return MACHINE_ZONES.find((z) => z.id === id)?.emoji || '🏋️';
}

function machineForm(existing, onSaved) {
  const m = existing || { name: '', zone: '', source: 'technogym-artis', club: '', notes: '', cardio: false };
  const fName = field('Nombre', 'name', { value: m.name, placeholder: 'Ej. Prensa de Piernas' });
  const fZone = field('Zona muscular', 'zone', {
    input: 'select', placeholder: 'Selecciona…', value: m.zone,
    options: MACHINE_ZONES.map((z) => ({ value: z.id, label: `${z.emoji} ${z.label}` })),
  });
  const fSource = field('Marca / origen', 'source', {
    input: 'select', value: m.source,
    options: MACHINE_SOURCES.map((s) => ({ value: s, label: s })),
  });
  const fClub = field('Club Fitness Park', 'club', { value: m.club, placeholder: 'Ej. FP Salamanca (opcional)' });
  const fNotes = field('Notas de ajuste', 'notes', { input: 'textarea', value: m.notes, placeholder: 'Altura de asiento, respaldo, pin…' });

  const cardioInput = el('input', { type: 'checkbox', name: 'cardio' });
  cardioInput.checked = !!m.cardio;
  const fCardio = el('label', { class: 'field field--check' }, [
    cardioInput, el('span', {}, 'Cardio (no pide peso al registrar)'),
  ]);

  const form = el('form', { class: 'form' }, [
    fName.wrap, fZone.wrap, fSource.wrap, fClub.wrap, fNotes.wrap, fCardio,
    el('div', { class: 'row-actions' }, [
      el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Guardar cambios' : 'Crear máquina'),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = {
      name: fName.input.value.trim(),
      zone: fZone.input.value,
      source: fSource.input.value,
      club: fClub.input.value.trim(),
      notes: fNotes.input.value.trim(),
      cardio: cardioInput.checked,
    };
    const { ok, errors } = validateMachine(input);
    paintErrors(form, errors);
    if (!ok) return;
    const record = existing ? { ...existing, ...input } : { id: db.uid('m'), ...input };
    await db.put('machines', record);
    await refreshMachines();
    toast(existing ? 'Máquina actualizada' : 'Máquina creada', 'ok');
    onSaved();
  });
  return form;
}

function machineCard(m, rerender) {
  const openEdit = () => {
    const api = openModal(m.name, machineForm(m, () => { api.close(); rerender(); }));
  };
  const onDelete = async () => {
    const yes = await confirmDialog(`¿Eliminar «${m.name}» del catálogo?`, { okLabel: 'Eliminar', danger: true });
    if (!yes) return;
    await db.del('machines', m.id);
    await refreshMachines();
    toast('Máquina eliminada', 'ok');
    rerender();
  };
  return el('div', { class: 'card-item', onClick: openEdit }, [
    el('span', { class: 'card-item__ico' }, zoneEmoji(m.zone)),
    el('div', { class: 'card-item__body' }, [
      el('div', { class: 'card-item__title' }, [m.name, m.cardio ? el('span', { class: 'chip chip--cardio' }, 'cardio') : null]),
      el('div', { class: 'card-item__meta' }, [zoneLabel(m.zone), ' · ', m.source, m.club ? ` · ${m.club}` : '']),
      m.notes ? el('div', { class: 'card-item__note' }, m.notes) : null,
    ]),
    el('button', {
      class: 'icon-btn', 'aria-label': 'Eliminar',
      onClick: (e) => { e.stopPropagation(); onDelete(); },
    }, '🗑'),
  ]);
}

export async function renderMachines(root) {
  await refreshMachines();
  clear(root);

  const list = el('div', { class: 'stack' });
  const rerender = () => renderMachines(root);

  const header = el('div', { class: 'view-head' }, [
    el('div', {}, [
      el('h1', {}, 'Máquinas'),
      el('p', { class: 'muted' }, `${state.machines.length} en el catálogo Fitness Park`),
    ]),
    el('button', {
      class: 'btn btn--primary btn--sm',
      onClick: () => { const api = openModal('Nueva máquina', machineForm(null, () => { api.close(); rerender(); })); },
    }, '＋ Añadir'),
  ]);

  // Agrupar por zona en el orden definido.
  for (const zone of MACHINE_ZONES) {
    const items = state.machines.filter((m) => m.zone === zone.id);
    if (!items.length) continue;
    list.append(el('div', { class: 'group-head' }, `${zone.emoji} ${zone.label}`));
    for (const m of items) list.append(machineCard(m, rerender));
  }

  root.append(header, list);
}
