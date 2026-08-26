// Pestaña "Plan 12 semanas": ver plan por semana/día, marcar sesión completada
// (genera automáticamente los logs en la sección de Registro).

import {
  PLAN_12, getPlanProgress, setPlanProgress, planStatus, sessionKey,
  logPlanSession, removePlanSessionLogs, machineName, refreshMachines,
} from '../store.js';
import { mesocycleForWeek } from '../data/seed-plan12.js';
import { el, clear, toast, confirmDialog } from '../lib/ui.js';

let viewWeek = null; // semana visualizada (independiente de la "actual" del progreso)

function exerciseRow(exercise) {
  const label = exercise.label || machineName(exercise.machineId);
  return el('div', { class: 'plan-ex' }, [
    el('span', { class: 'plan-ex__name' }, label),
    el('span', { class: 'plan-ex__scheme' }, `${exercise.sets} × ${exercise.reps}`),
    el('span', { class: 'plan-ex__rest' }, `${exercise.restSec}s`),
  ]);
}

function dayCard(week, day, progress, rerender) {
  const key = sessionKey(week, day.day);
  const done = !!progress.completed?.[key];

  if (day.type === 'rest') {
    return el('div', { class: 'plan-day plan-day--rest' }, [
      el('div', { class: 'plan-day__head' }, [
        el('span', { class: 'plan-day__title' }, `Día ${day.day} · ${day.name}`),
      ]),
      day.note ? el('p', { class: 'muted small' }, day.note) : null,
    ]);
  }

  const toggle = async () => {
    const next = { ...progress, completed: { ...progress.completed } };
    if (done) {
      const yes = await confirmDialog('¿Desmarcar la sesión? Se borrarán los registros que generó.', { okLabel: 'Desmarcar' });
      if (!yes) return;
      delete next.completed[key];
      await removePlanSessionLogs(week, day.day);
      toast('Sesión desmarcada', 'ok');
    } else {
      next.completed[key] = true;
      await logPlanSession(week, day.day, day);
      toast(`Sesión completada · ${day.exercises.length} registros creados`, 'ok');
    }
    await setPlanProgress(next);
    rerender();
  };

  return el('div', { class: `plan-day ${done ? 'is-done' : ''}` }, [
    el('div', { class: 'plan-day__head' }, [
      el('div', {}, [
        el('span', { class: 'plan-day__title' }, `Día ${day.day} · ${day.name}`),
        el('span', { class: 'plan-day__focus' }, day.focus),
      ]),
      el('button', { class: `check-btn ${done ? 'is-done' : ''}`, 'aria-pressed': done ? 'true' : 'false', onClick: toggle }, done ? '✓ Hecha' : 'Marcar'),
    ]),
    day.note ? el('p', { class: 'plan-day__note' }, day.note) : null,
    el('div', { class: 'plan-ex-list' }, day.exercises.map(exerciseRow)),
  ]);
}

function weekNav(current, onPick) {
  const nav = el('div', { class: 'week-nav' });
  for (let w = 1; w <= 12; w++) {
    const meso = mesocycleForWeek(w);
    nav.append(el('button', {
      class: `week-pill ${w === current ? 'is-active' : ''} meso-${meso.n}`,
      onClick: () => onPick(w),
    }, String(w)));
  }
  return nav;
}

export async function renderPlan(root) {
  await refreshMachines();
  const progress = await getPlanProgress();
  const status = planStatus(progress);
  if (viewWeek == null) viewWeek = status.currentWeek;

  clear(root);
  const rerender = () => renderPlan(root);

  const meso = mesocycleForWeek(viewWeek);
  const dayTemplates = meso.days;
  const weekDoneCount = dayTemplates.filter((d) => d.type === 'workout' && progress.completed?.[sessionKey(viewWeek, d.day)]).length;
  const weekWorkouts = dayTemplates.filter((d) => d.type === 'workout').length;

  // Cabecera con indicador global.
  root.append(el('div', { class: 'view-head' }, [el('h1', {}, 'Plan 12 semanas')]));

  const banner = el('div', { class: `plan-banner meso-bg-${meso.n}` }, [
    el('div', { class: 'plan-banner__top' }, [
      el('span', { class: 'plan-banner__meso' }, `Mesociclo ${meso.n}: ${meso.name}`),
      el('span', { class: 'plan-banner__pct' }, `${status.percent}%`),
    ]),
    el('div', { class: 'plan-banner__week' }, `Semana ${viewWeek} de 12`),
    el('div', { class: 'plan-banner__sub' }, `${meso.subtitle} · ${status.completedCount}/${status.total} sesiones completadas`),
    el('div', { class: 'progress-bar' }, [el('div', { class: 'progress-bar__fill', style: `width:${status.percent}%` })]),
  ]);
  root.append(banner);

  // Fijar como semana actual.
  if (viewWeek !== status.currentWeek) {
    root.append(el('button', { class: 'btn btn--ghost btn--sm', onClick: async () => { await setPlanProgress({ ...progress, currentWeek: viewWeek }); toast(`Semana ${viewWeek} marcada como actual`, 'ok'); rerender(); } }, `Marcar semana ${viewWeek} como actual`));
  }

  root.append(weekNav(viewWeek, (w) => { viewWeek = w; rerender(); }));

  root.append(el('div', { class: 'group-head' }, `Semana ${viewWeek} · ${weekDoneCount}/${weekWorkouts} sesiones`));
  root.append(el('p', { class: 'muted small' }, PLAN_12.weekNote));

  const list = el('div', { class: 'stack' });
  for (const day of dayTemplates) list.append(dayCard(viewWeek, day, progress, rerender));
  root.append(list);

  root.append(el('p', { class: 'muted small plan-final' }, PLAN_12.finalNote));
}
