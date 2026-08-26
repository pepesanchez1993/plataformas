// Pestaña "Rutinas/Log": registro de entrenamiento + gestión de rutinas.
// Dos sub-vistas con control segmentado: Registro | Rutinas.

import * as db from '../db.js';
import { state, addLog, refreshMachines } from '../store.js';
import { MACHINE_ZONES } from '../data/seed-machines.js';
import { el, clear, field, paintErrors, openModal, confirmDialog, toast, fmtDateTime, nowLocalInput } from '../lib/ui.js';
import { validateWorkoutLog, validateRoutine } from '../lib/validate.js';
import { detectPRs, lastLogFor } from '../lib/metrics.js';
import { startRestTimer } from '../lib/timer.js';
import { openPlateCalc } from '../lib/plate-ui.js';

const PR_LABEL = { weight: '🏆 PR de peso', '1rm': '🏆 PR de 1RM', volume: '🏆 PR de volumen' };

let activeTab = 'registro';

// ---- Select de máquina agrupado por zona (reutilizable) ----
export function machineSelect(name, value) {
  const sel = el('select', { name });
  sel.append(el('option', { value: '' }, 'Selecciona ejercicio/máquina…'));
  for (const zone of MACHINE_ZONES) {
    const items = state.machines.filter((m) => m.zone === zone.id);
    if (!items.length) continue;
    const g = el('optgroup', { label: `${zone.emoji} ${zone.label}` });
    for (const m of items) g.append(el('option', { value: m.id }, m.name));
    sel.append(g);
  }
  if (value) sel.value = value;
  return sel;
}

// ---- Formulario de registro de entrenamiento ----
// allLogs: histórico completo (para ghost sets y detección de PRs).
function logForm(prefill, allLogs, onSaved) {
  const p = prefill || {};
  const fDate = field('Fecha y hora', 'dateISO', { type: 'datetime-local', value: p.dateLocal || nowLocalInput() });

  const machineWrap = el('label', { class: 'field' }, [el('span', { class: 'field__label' }, 'Ejercicio / máquina')]);
  const machineInput = machineSelect('machineId', p.machineId);
  const machineErr = el('span', { class: 'field__err', 'data-err-for': 'machineId' });
  machineWrap.append(machineInput, machineErr);

  const ghost = el('p', { class: 'ghost-hint', style: 'display:none' });

  const fWeight = field('Peso (kg)', 'weightKg', { type: 'number', inputmode: 'decimal', step: '0.5', min: '0', placeholder: 'Ej. 60', value: p.weightKg });
  const fSets = field('Series realizadas', 'setsDone', { type: 'number', inputmode: 'numeric', min: '0', placeholder: 'Ej. 4', value: p.setsDone });
  const fReps = field('Reps por serie', 'reps', { placeholder: 'Ej. 12,10,8 o 12', value: p.reps });
  const fRpe = field('RPE (1-10, opcional)', 'rpe', { type: 'number', inputmode: 'numeric', min: '1', max: '10', placeholder: 'Esfuerzo percibido', value: p.rpe });
  const fNotes = field('Notas', 'notes', { input: 'textarea', placeholder: 'Ej. molestia en hombro, buena sensación…', value: p.notes });

  const cardioHint = el('p', { class: 'muted small', style: 'display:none' }, 'Máquina de cardio: el peso es opcional.');

  // Accesos rápidos: temporizador + calculadora de discos.
  const restSecInput = el('input', { type: 'number', min: '10', step: '5', value: p.restSec || 90, class: 'rest-input', 'aria-label': 'Segundos de descanso' });
  const quick = el('div', { class: 'quick-tools' }, [
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => startRestTimer(Number(restSecInput.value) || 90) }, '⏱ Descanso'),
    restSecInput, el('span', { class: 'muted small' }, 's'),
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => openPlateCalc(Number(fWeight.input.value) || null) }, '🧮 Discos'),
  ]);

  const form = el('form', { class: 'form' }, [
    fDate.wrap, machineWrap, ghost, fWeight.wrap, cardioHint, fSets.wrap, fReps.wrap, quick, fRpe.wrap, fNotes.wrap,
    el('div', { class: 'row-actions' }, [
      el('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Guardar registro'),
    ]),
  ]);

  // Ghost sets: al elegir máquina, precargar peso/reps de la última vez (atenuado).
  const applyGhost = () => {
    const m = state.machinesById.get(machineInput.value);
    cardioHint.style.display = m?.cardio ? '' : 'none';
    if (!machineInput.value) { ghost.style.display = 'none'; return; }
    const last = lastLogFor(machineInput.value, allLogs);
    if (!last) { ghost.style.display = 'none'; return; }
    const repsStr = last.repsPerSet?.length ? last.repsPerSet.join(',') : '';
    ghost.style.display = '';
    ghost.textContent = `Última vez (${fmtDateTime(last.dateISO)}): ${last.weightKg} kg${repsStr ? ` · ${repsStr} reps` : ''}. Confírmalo o supéralo.`;
    // Precarga atenuada solo si el usuario no ha escrito aún.
    if (fWeight.input.value === '') { fWeight.input.value = last.weightKg; fWeight.input.classList.add('is-ghost'); }
    if (fReps.input.value === '' && repsStr) { fReps.input.value = repsStr; fReps.input.classList.add('is-ghost'); }
  };
  const unghost = (inp) => inp.addEventListener('focus', () => inp.classList.remove('is-ghost'));
  unghost(fWeight.input); unghost(fReps.input);
  machineInput.addEventListener('change', applyGhost);
  applyGhost();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const machine = state.machinesById.get(machineInput.value);
    const isCardio = !!machine?.cardio;
    const raw = {
      dateISO: fDate.input.value ? new Date(fDate.input.value).toISOString() : '',
      machineId: machineInput.value,
      weightKg: fWeight.input.value,
      setsDone: fSets.input.value,
      rpe: fRpe.input.value,
    };
    const { ok, errors } = validateWorkoutLog(raw, { isCardio });
    paintErrors(form, errors);
    if (!ok) { toast('Revisa los campos marcados', 'warn'); return; }

    const repsPerSet = fReps.input.value
      .split(/[,\s|]+/).map((s) => s.trim()).filter(Boolean)
      .map(Number).filter((n) => !Number.isNaN(n));

    const record = {
      dateISO: raw.dateISO,
      machineId: raw.machineId,
      routineId: p.routineId || null,
      planRef: null,
      weightKg: isCardio && raw.weightKg === '' ? null : Number(raw.weightKg),
      setsDone: raw.setsDone === '' ? null : Number(raw.setsDone),
      repsPerSet,
      rpe: raw.rpe === '' ? null : Number(raw.rpe),
      notes: fNotes.input.value.trim(),
    };
    // Detección automática de PRs contra el histórico previo.
    const prs = detectPRs(record, allLogs);
    record.prs = prs;
    await addLog(record);
    if (prs.length) toast(`¡Nuevo récord! ${prs.map((k) => PR_LABEL[k]).join(' · ')}`, 'ok');
    else toast('Registro guardado', 'ok');
    onSaved();
  });
  return form;
}

function logItem(log, rerender) {
  const machine = state.machinesById.get(log.machineId);
  const meta = [
    log.weightKg != null ? `${log.weightKg} kg` : (machine?.cardio ? 'cardio' : '—'),
    log.setsDone != null ? `${log.setsDone} series` : null,
    log.repsPerSet?.length ? `${log.repsPerSet.join('·')} reps` : null,
    log.rpe != null ? `RPE ${log.rpe}` : null,
  ].filter(Boolean).join(' · ');

  const onDelete = async (e) => {
    e.stopPropagation();
    const yes = await confirmDialog('¿Eliminar este registro?', { okLabel: 'Eliminar', danger: true });
    if (!yes) return;
    await db.del('workoutLogs', log.id);
    toast('Registro eliminado', 'ok');
    rerender();
  };

  const prChips = (log.prs || []).map((k) => el('span', { class: 'chip chip--pr' }, k === '1rm' ? '🏆 1RM' : k === 'volume' ? '🏆 Vol' : '🏆 Peso'));

  return el('div', { class: 'card-item' }, [
    el('div', { class: 'card-item__body' }, [
      el('div', { class: 'card-item__title' }, [machine?.name || log.machineId, log.planRef ? el('span', { class: 'chip' }, 'plan') : null, ...prChips]),
      el('div', { class: 'card-item__meta' }, meta || '—'),
      el('div', { class: 'card-item__note' }, fmtDateTime(log.dateISO)),
      log.notes ? el('div', { class: 'card-item__note' }, log.notes) : null,
    ]),
    el('button', { class: 'icon-btn', 'aria-label': 'Eliminar', onClick: onDelete }, '🗑'),
  ]);
}

async function renderRegistro(container, rerender) {
  const logs = (await db.getAll('workoutLogs')).sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const openLog = (prefill) => {
    const api = openModal('Registrar entrenamiento', logForm(prefill, logs, () => { api.close(); rerender(); }));
  };

  container.append(
    el('button', { class: 'btn btn--primary btn--block btn--lg', onClick: () => openLog() }, '＋ Registrar entrenamiento'),
  );

  if (!logs.length) {
    container.append(el('p', { class: 'empty' }, 'Aún no hay registros. Pulsa el botón para anotar tu primera serie.'));
    return;
  }
  container.append(el('div', { class: 'group-head' }, `Últimos registros (${logs.length})`));
  const list = el('div', { class: 'stack' });
  for (const log of logs.slice(0, 40)) list.append(logItem(log, rerender));
  container.append(list);
}

// ---- Editor de rutinas ----
function routineEditor(existing, onSaved) {
  const r = existing || { name: '', dayOfWeek: '', sessionNo: '', exercises: [] };
  const rows = r.exercises.map((x) => ({ ...x }));

  const fName = field('Nombre de la rutina', 'name', { value: r.name, placeholder: 'Ej. Push · Semana 3 - Día 1' });
  const fDay = field('Día / sesión', 'dayOfWeek', { value: r.dayOfWeek, placeholder: 'Ej. Lunes o Sesión 1 (opcional)' });

  const exWrap = el('div', { class: 'stack' });
  const exErr = el('span', { class: 'field__err', 'data-err-for': 'exercises' });

  const renderRows = () => {
    clear(exWrap);
    rows.forEach((row, i) => {
      const sel = machineSelect(`ex_${i}`, row.machineId);
      sel.addEventListener('change', () => { row.machineId = sel.value; });
      const sets = el('input', { type: 'number', min: '1', placeholder: 'Series', inputmode: 'numeric', value: row.targetSets ?? '' });
      sets.addEventListener('input', () => { row.targetSets = sets.value; });
      const reps = el('input', { type: 'text', placeholder: 'Reps', value: row.targetReps ?? '' });
      reps.addEventListener('input', () => { row.targetReps = reps.value; });
      const rm = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar', onClick: () => { rows.splice(i, 1); renderRows(); } }, '✕');
      exWrap.append(el('div', { class: 'ex-row' }, [sel, el('div', { class: 'ex-row__nums' }, [sets, reps]), rm]));
    });
  };
  renderRows();

  const addBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { rows.push({ machineId: '', targetSets: '', targetReps: '' }); renderRows(); } }, '＋ Añadir ejercicio');

  const form = el('form', { class: 'form' }, [
    fName.wrap, fDay.wrap,
    el('span', { class: 'field__label' }, 'Ejercicios'),
    exWrap, exErr, addBtn,
    el('div', { class: 'row-actions' }, [
      el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Guardar' : 'Crear rutina'),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const exercises = rows
      .filter((x) => x.machineId)
      .map((x, order) => ({ machineId: x.machineId, targetSets: x.targetSets === '' ? null : Number(x.targetSets), targetReps: x.targetReps || '', order }));
    const input = { name: fName.input.value.trim(), dayOfWeek: fDay.input.value.trim(), exercises };
    const { ok, errors } = validateRoutine(input);
    paintErrors(form, errors);
    if (!ok) return;
    const record = existing ? { ...existing, ...input } : { id: db.uid('r'), ...input };
    await db.put('routines', record);
    toast(existing ? 'Rutina actualizada' : 'Rutina creada', 'ok');
    onSaved();
  });
  return form;
}

function routineCard(r, rerender) {
  const openEdit = () => { const api = openModal(r.name, routineEditor(r, () => { api.close(); rerender(); })); };
  const openLogSession = () => {
    // Registrar rápido cada ejercicio de la rutina.
    const api = openModal(`Registrar · ${r.name}`, sessionLogList(r, () => { api.close(); rerender(); }));
  };
  const onDelete = async (e) => {
    e.stopPropagation();
    const yes = await confirmDialog(`¿Eliminar la rutina «${r.name}»?`, { okLabel: 'Eliminar', danger: true });
    if (!yes) return;
    await db.del('routines', r.id);
    toast('Rutina eliminada', 'ok');
    rerender();
  };
  return el('div', { class: 'card-item', onClick: openEdit }, [
    el('div', { class: 'card-item__body' }, [
      el('div', { class: 'card-item__title' }, r.name),
      el('div', { class: 'card-item__meta' }, [r.dayOfWeek ? `${r.dayOfWeek} · ` : '', `${r.exercises.length} ejercicios`]),
      el('div', { class: 'card-item__note' }, r.exercises.map((x) => state.machinesById.get(x.machineId)?.name || x.machineId).join(', ')),
    ]),
    el('div', { class: 'card-item__actions' }, [
      el('button', { class: 'btn btn--ghost btn--xs', onClick: (e) => { e.stopPropagation(); openLogSession(); } }, 'Registrar'),
      el('button', { class: 'icon-btn', 'aria-label': 'Eliminar', onClick: onDelete }, '🗑'),
    ]),
  ]);
}

// Lista para registrar rápidamente cada ejercicio de una rutina.
function sessionLogList(r, onDone) {
  const wrap = el('div', { class: 'stack' });
  wrap.append(el('p', { class: 'muted small' }, 'Introduce el peso de cada ejercicio y guarda la sesión completa.'));
  const inputs = r.exercises.map((x) => {
    const machine = state.machinesById.get(x.machineId);
    const w = el('input', { type: 'number', step: '0.5', min: '0', inputmode: 'decimal', placeholder: machine?.cardio ? 'cardio' : 'kg' });
    const reps = el('input', { type: 'text', placeholder: x.targetReps || 'reps' });
    wrap.append(el('div', { class: 'ex-row' }, [
      el('div', { class: 'ex-row__name' }, machine?.name || x.machineId),
      el('div', { class: 'ex-row__nums' }, [w, reps]),
    ]));
    return { x, machine, w, reps };
  });
  const save = el('button', { class: 'btn btn--primary btn--block' }, 'Guardar sesión');
  save.addEventListener('click', async () => {
    const dateISO = new Date().toISOString();
    let n = 0;
    for (const it of inputs) {
      const isCardio = !!it.machine?.cardio;
      if (!isCardio && it.w.value === '') continue; // sólo guarda los que tengan peso
      const repsPerSet = it.reps.value.split(/[,\s|]+/).map((s) => Number(s.trim())).filter((v) => !Number.isNaN(v) && v > 0);
      await addLog({
        dateISO, machineId: it.x.machineId, routineId: r.id, planRef: null,
        weightKg: isCardio && it.w.value === '' ? null : Number(it.w.value),
        setsDone: it.x.targetSets ?? null, repsPerSet, rpe: null,
        notes: `Rutina · ${r.name}`,
      });
      n++;
    }
    if (n === 0) { toast('Introduce al menos un peso', 'warn'); return; }
    toast(`${n} registros guardados`, 'ok');
    onDone();
  });
  wrap.append(save);
  return wrap;
}

async function renderRutinas(container, rerender) {
  const routines = (await db.getAll('routines')).sort((a, b) => a.name.localeCompare(b.name));
  container.append(
    el('button', { class: 'btn btn--primary btn--block', onClick: () => { const api = openModal('Nueva rutina', routineEditor(null, () => { api.close(); rerender(); })); } }, '＋ Nueva rutina'),
  );
  if (!routines.length) {
    container.append(el('p', { class: 'empty' }, 'No tienes rutinas todavía. Crea una o usa el Plan de 12 semanas.'));
    return;
  }
  const list = el('div', { class: 'stack' });
  for (const r of routines) list.append(routineCard(r, rerender));
  container.append(list);
}

export async function renderRoutines(root) {
  await refreshMachines();
  clear(root);
  const rerender = () => renderRoutines(root);

  root.append(el('div', { class: 'view-head' }, [el('h1', {}, 'Entrenamiento')]));

  const seg = el('div', { class: 'segmented' }, [
    el('button', { class: `seg ${activeTab === 'registro' ? 'is-active' : ''}`, onClick: () => { activeTab = 'registro'; rerender(); } }, 'Registro'),
    el('button', { class: `seg ${activeTab === 'rutinas' ? 'is-active' : ''}`, onClick: () => { activeTab = 'rutinas'; rerender(); } }, 'Rutinas'),
  ]);
  root.append(seg);

  const container = el('div', { class: 'view-body' });
  root.append(container);
  if (activeTab === 'registro') await renderRegistro(container, rerender);
  else await renderRutinas(container, rerender);
}
