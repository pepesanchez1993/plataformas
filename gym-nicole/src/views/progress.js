// Pestaña "Progreso": dashboard, volumen por grupo muscular, historial por
// ejercicio con gráfico (peso y 1RM estimado) y registro de peso corporal.

import * as db from '../db.js';
import { state, refreshMachines } from '../store.js';
import { MACHINE_ZONES } from '../data/seed-machines.js';
import { el, clear, field, paintErrors, openModal, confirmDialog, toast, fmtDate, todayLocalInput } from '../lib/ui.js';
import { validateBodyMetric, validateProfile } from '../lib/validate.js';
import { lineChart } from '../lib/chart.js';
import { machineSelect } from './routines.js';
import { log1RM, logVolume, volumeByZone, currentStreak, detectPRs } from '../lib/metrics.js';

let tab = 'resumen';
let selMachine = '';
let volWindow = 7;
let bodyMetricKey = 'weightKg';

// Campos corporales que se pueden registrar en el tiempo.
const BODY_FIELDS = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', step: '0.1', placeholder: 'Ej. 92.5' },
  { key: 'grasa', label: '% grasa', unit: '%', step: '0.1', placeholder: 'Ej. 22' },
  { key: 'cintura', label: 'Cintura', unit: 'cm', step: '0.5', placeholder: 'Ej. 90' },
  { key: 'pecho', label: 'Pecho', unit: 'cm', step: '0.5', placeholder: 'Ej. 105' },
  { key: 'cadera', label: 'Cadera', unit: 'cm', step: '0.5', placeholder: 'Ej. 100' },
  { key: 'brazo', label: 'Brazo', unit: 'cm', step: '0.5', placeholder: 'Ej. 38' },
  { key: 'muslo', label: 'Muslo', unit: 'cm', step: '0.5', placeholder: 'Ej. 58' },
  { key: 'cuello', label: 'Cuello', unit: 'cm', step: '0.5', placeholder: 'Ej. 40' },
];

function fieldUnit(f, v) { return f.unit === '%' ? `${v}%` : `${v} ${f.unit}`; }

function calcAge(nacimiento) {
  if (!nacimiento) return null;
  const b = new Date(nacimiento);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function calcIMC(weightKg, alturaCm) {
  if (!weightKg || !alturaCm) return null;
  const h = alturaCm / 100;
  return weightKg / (h * h);
}

function imcCategoria(v) {
  if (v == null) return '';
  if (v < 18.5) return 'bajo peso';
  if (v < 25) return 'normal';
  if (v < 30) return 'sobrepeso';
  return 'obesidad';
}

function zoneLabel(id) { return MACHINE_ZONES.find((z) => z.id === id)?.label || id; }
function zoneEmoji(id) { return MACHINE_ZONES.find((z) => z.id === id)?.emoji || '🏋️'; }

// ---- Resumen / dashboard ----
function statCard(value, label, accent) {
  return el('div', { class: `stat ${accent ? `stat--${accent}` : ''}` }, [
    el('div', { class: 'stat__value' }, value),
    el('div', { class: 'stat__label' }, label),
  ]);
}

async function renderResumen(container) {
  const logs = await db.getAll('workoutLogs');
  const weighted = logs.filter((l) => l.weightKg != null);
  const totalVolume = weighted.reduce((a, l) => a + logVolume(l), 0);
  const streak = currentStreak(logs);
  const sessions = new Set(logs.map((l) => l.dateISO.slice(0, 10))).size;

  // PRs recientes: recorre en orden cronológico recalculando (para logs antiguos sin prs guardados).
  const chrono = [...logs].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const seen = [];
  const recentPRs = [];
  for (const l of chrono) {
    const prs = l.prs || detectPRs(l, seen);
    if (prs.length) recentPRs.push({ log: l, prs });
    seen.push(l);
  }
  recentPRs.reverse();

  container.append(el('div', { class: 'stat-grid' }, [
    statCard(String(sessions), 'Días entrenados', 'gold'),
    statCard(`${streak}🔥`, 'Racha actual', 'green'),
    statCard(`${Math.round(totalVolume).toLocaleString('es-ES')}`, 'Volumen total (kg)', null),
    statCard(String(recentPRs.length), 'PRs conseguidos', 'gold'),
  ]));

  // Volumen semanal por grupo muscular.
  container.append(el('div', { class: 'group-head' }, 'Volumen por grupo muscular'));
  const winSeg = el('div', { class: 'segmented segmented--sm' }, [7, 14, 30].map((d) =>
    el('button', { class: `seg ${volWindow === d ? 'is-active' : ''}`, onClick: () => { volWindow = d; renderProgress(document.getElementById('view-root')); } }, `${d} días`),
  ));
  container.append(winSeg);

  const byZone = volumeByZone(logs, state.machinesById, volWindow);
  const maxSets = Math.max(1, ...Object.values(byZone).map((v) => v.sets));
  const volList = el('div', { class: 'stack' });
  const zonesWithData = MACHINE_ZONES.filter((z) => z.id !== 'cardio');
  for (const z of zonesWithData) {
    const v = byZone[z.id] || { sets: 0, volume: 0 };
    volList.append(el('div', { class: 'vol-row' }, [
      el('div', { class: 'vol-row__head' }, [
        el('span', {}, `${z.emoji} ${z.label}`),
        el('span', { class: 'muted small' }, `${v.sets} series · ${Math.round(v.volume).toLocaleString('es-ES')} kg`),
      ]),
      el('div', { class: 'vol-bar' }, [el('div', { class: 'vol-bar__fill', style: `width:${(v.sets / maxSets) * 100}%` })]),
    ]));
  }
  container.append(volList);

  if (recentPRs.length) {
    container.append(el('div', { class: 'group-head' }, 'PRs recientes'));
    const list = el('div', { class: 'stack' });
    for (const { log, prs } of recentPRs.slice(0, 8)) {
      list.append(el('div', { class: 'card-item' }, [
        el('div', { class: 'card-item__body' }, [
          el('div', { class: 'card-item__title' }, state.machinesById.get(log.machineId)?.name || log.machineId),
          el('div', { class: 'card-item__meta' }, `${log.weightKg} kg · ${fmtDate(log.dateISO)}`),
        ]),
        el('div', { class: 'card-item__actions' }, prs.map((k) => el('span', { class: 'chip chip--pr' }, k === '1rm' ? '1RM' : k === 'volume' ? 'Vol' : 'Peso'))),
      ]));
    }
    container.append(list);
  }
}

// ---- Historial por ejercicio ----
async function renderPorEjercicio(container) {
  const wrap = el('label', { class: 'field' }, [el('span', { class: 'field__label' }, 'Elige un ejercicio')]);
  const sel = machineSelect('machine', selMachine);
  sel.addEventListener('change', () => { selMachine = sel.value; renderProgress(document.getElementById('view-root')); });
  wrap.append(sel);
  container.append(wrap);

  if (!selMachine) { container.append(el('p', { class: 'empty' }, 'Selecciona un ejercicio para ver su progresión.')); return; }

  const logs = (await db.getByIndex('workoutLogs', 'byMachine', selMachine))
    .filter((l) => l.weightKg != null)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (!logs.length) { container.append(el('p', { class: 'empty' }, 'Sin registros con peso para este ejercicio todavía.')); return; }

  const maxW = Math.max(...logs.map((l) => l.weightKg));
  const best1 = Math.max(...logs.map((l) => log1RM(l) || 0));
  container.append(el('div', { class: 'stat-grid stat-grid--2' }, [
    statCard(`${maxW} kg`, 'Mejor peso', 'gold'),
    statCard(best1 ? `${Math.round(best1)} kg` : '—', '1RM estimado', 'green'),
  ]));

  // Gráfico de peso.
  container.append(el('div', { class: 'group-head' }, 'Progresión de peso'));
  container.append(lineChart(logs.map((l) => ({ x: new Date(l.dateISO).getTime(), y: l.weightKg })), { unit: 'kg' }));

  // Gráfico de 1RM estimado.
  const with1 = logs.map((l) => ({ x: new Date(l.dateISO).getTime(), y: log1RM(l) })).filter((p) => p.y != null);
  if (with1.length >= 2) {
    container.append(el('div', { class: 'group-head' }, '1RM estimado (Epley)'));
    container.append(lineChart(with1.map((p) => ({ x: p.x, y: Math.round(p.y) })), { unit: 'kg' }));
  }

  // Listado cronológico.
  container.append(el('div', { class: 'group-head' }, `Historial (${logs.length})`));
  const list = el('div', { class: 'stack' });
  for (const l of [...logs].reverse()) {
    const reps = l.repsPerSet?.length ? ` · ${l.repsPerSet.join('·')} reps` : '';
    list.append(el('div', { class: 'card-item' }, [
      el('div', { class: 'card-item__body' }, [
        el('div', { class: 'card-item__title' }, `${l.weightKg} kg${reps}`),
        el('div', { class: 'card-item__meta' }, [fmtDate(l.dateISO), l.rpe != null ? ` · RPE ${l.rpe}` : '', l.setsDone ? ` · ${l.setsDone} series` : '']),
      ]),
    ]));
  }
  container.append(list);
}

// ---- Cuerpo: perfil (edad/altura), peso y medidas corporales ----
const rerenderBody = () => renderProgress(document.getElementById('view-root'));

function profileForm(profile, onSaved) {
  const fAltura = field('Altura (cm)', 'alturaCm', { type: 'number', inputmode: 'decimal', step: '0.5', placeholder: 'Ej. 178', value: profile.alturaCm ?? '' });
  const fNac = field('Fecha de nacimiento', 'nacimiento', { type: 'date', value: profile.nacimiento || '' });
  const fSexo = field('Sexo (opcional)', 'sexo', {
    input: 'select',
    value: profile.sexo || '',
    options: [{ value: '', label: '—' }, { value: 'h', label: 'Hombre' }, { value: 'm', label: 'Mujer' }],
  });
  const form = el('form', { class: 'form' }, [
    fAltura.wrap, fNac.wrap, fSexo.wrap,
    el('p', { class: 'muted small' }, 'La altura permite calcular el IMC; la fecha de nacimiento calcula la edad automáticamente.'),
    el('div', { class: 'row-actions' }, [el('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Guardar perfil')]),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = { alturaCm: fAltura.input.value };
    const { ok, errors } = validateProfile(input);
    paintErrors(form, errors);
    if (!ok) return;
    await db.setMeta('profile', {
      alturaCm: fAltura.input.value === '' ? null : Number(fAltura.input.value),
      nacimiento: fNac.input.value || null,
      sexo: fSexo.input.value || null,
    });
    toast('Perfil guardado', 'ok');
    onSaved();
  });
  return form;
}

function bodyForm(onSaved) {
  const fDate = field('Fecha', 'dateISO', { type: 'date', value: todayLocalInput() });
  const controls = BODY_FIELDS.map((f) => ({ f, ctl: field(`${f.label} (${f.unit})`, f.key, { type: 'number', inputmode: 'decimal', step: f.step, placeholder: f.placeholder }) }));
  const grid = el('div', { class: 'body-grid' }, controls.map((c) => c.ctl.wrap));
  const fNotes = field('Notas', 'notes', { input: 'textarea', placeholder: 'Sensaciones, contexto…' });

  const form = el('form', { class: 'form' }, [
    fDate.wrap,
    el('p', { class: 'muted small' }, 'Rellena lo que quieras: basta con el peso, o añade las medidas que midas ese día.'),
    grid, fNotes.wrap,
    el('div', { class: 'row-actions' }, [el('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Guardar')]),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = { dateISO: fDate.input.value ? new Date(fDate.input.value).toISOString() : '' };
    for (const c of controls) input[c.f.key] = c.ctl.input.value;
    const { ok, errors } = validateBodyMetric(input);
    paintErrors(form, errors);
    if (!ok) return;
    const record = { id: db.uid('bm'), dateISO: input.dateISO, notes: fNotes.input.value.trim() };
    for (const c of controls) { const v = c.ctl.input.value; record[c.f.key] = v === '' ? null : Number(v); }
    await db.put('bodyMetrics', record);
    toast('Datos corporales guardados', 'ok');
    onSaved();
  });
  return form;
}

async function renderCuerpo(container) {
  const profile = (await db.getMeta('profile', {})) || {};
  const metrics = (await db.getAll('bodyMetrics')).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latest = metrics[metrics.length - 1];
  const first = metrics[0];
  const age = calcAge(profile.nacimiento);

  // Tarjeta de perfil (altura + edad).
  container.append(el('div', { class: 'card' }, [
    el('div', { class: 'card__head' }, [
      el('div', {}, [
        el('div', { class: 'card__title' }, 'Perfil'),
        el('div', { class: 'card__meta' }, [
          profile.alturaCm ? `Altura ${profile.alturaCm} cm` : 'Altura sin definir',
          age != null ? ` · ${age} años` : '',
        ].join('')),
      ]),
      el('button', { class: 'btn btn--ghost btn--sm', onClick: () => { const api = openModal('Editar perfil', profileForm(profile, () => { api.close(); rerenderBody(); })); } }, 'Editar'),
    ]),
  ]));

  // Instantánea actual + IMC + variación de peso.
  if (latest) {
    const bmi = calcIMC(latest.weightKg, profile.alturaCm);
    const delta = (latest.weightKg != null && first?.weightKg != null && first !== latest) ? latest.weightKg - first.weightKg : null;
    container.append(el('div', { class: 'stat-grid' }, [
      statCard(latest.weightKg != null ? `${latest.weightKg} kg` : '—', 'Peso actual', 'gold'),
      bmi != null ? statCard(bmi.toFixed(1), `IMC · ${imcCategoria(bmi)}`, 'green') : null,
      delta != null ? statCard(`${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`, 'Desde el inicio', delta <= 0 ? 'green' : null) : null,
      latest.grasa != null ? statCard(`${latest.grasa}%`, 'Grasa corporal', null) : null,
      latest.cintura != null ? statCard(`${latest.cintura} cm`, 'Cintura', null) : null,
    ].filter(Boolean)));
  }

  container.append(el('button', { class: 'btn btn--primary btn--block', onClick: () => { const api = openModal('Registrar datos corporales', bodyForm(() => { api.close(); rerenderBody(); })); } }, '＋ Añadir medición'));

  if (!metrics.length) { container.append(el('p', { class: 'empty' }, 'Aún no has registrado datos corporales. Añade tu primera medición.')); return; }

  // Selector de métrica + gráfica de evolución.
  const available = BODY_FIELDS.filter((f) => metrics.some((m) => m[f.key] != null));
  if (!available.some((f) => f.key === bodyMetricKey)) bodyMetricKey = available[0]?.key || 'weightKg';
  const curF = BODY_FIELDS.find((f) => f.key === bodyMetricKey) || BODY_FIELDS[0];

  container.append(el('div', { class: 'group-head' }, 'Evolución'));
  const sel = el('select', { 'aria-label': 'Métrica a mostrar' }, available.map((f) => el('option', { value: f.key }, `${f.label} (${f.unit})`)));
  sel.value = bodyMetricKey;
  sel.addEventListener('change', () => { bodyMetricKey = sel.value; rerenderBody(); });
  container.append(sel);

  const pts = metrics.filter((m) => m[bodyMetricKey] != null).map((m) => ({ x: new Date(m.dateISO).getTime(), y: m[bodyMetricKey] }));
  if (pts.length >= 2) container.append(lineChart(pts, { unit: curF.unit }));
  else container.append(el('p', { class: 'muted small' }, 'Necesitas al menos 2 mediciones de esta métrica para dibujar la gráfica.'));

  // Historial.
  container.append(el('div', { class: 'group-head' }, `Historial (${metrics.length})`));
  const list = el('div', { class: 'stack' });
  for (const m of [...metrics].reverse()) {
    const extras = BODY_FIELDS.filter((f) => f.key !== 'weightKg' && m[f.key] != null).map((f) => `${f.label} ${fieldUnit(f, m[f.key])}`);
    const onDelete = async () => {
      const yes = await confirmDialog('¿Eliminar esta medición?', { okLabel: 'Eliminar', danger: true });
      if (!yes) return;
      await db.del('bodyMetrics', m.id); toast('Eliminado', 'ok'); rerenderBody();
    };
    list.append(el('div', { class: 'card-item' }, [
      el('div', { class: 'card-item__body' }, [
        el('div', { class: 'card-item__title' }, m.weightKg != null ? `${m.weightKg} kg` : 'Medición'),
        el('div', { class: 'card-item__meta' }, fmtDate(m.dateISO)),
        extras.length ? el('div', { class: 'card-item__note' }, extras.join(' · ')) : null,
        m.notes ? el('div', { class: 'card-item__note' }, m.notes) : null,
      ]),
      el('button', { class: 'icon-btn', 'aria-label': 'Eliminar', onClick: onDelete }, '🗑'),
    ]));
  }
  container.append(list);
}

export async function renderProgress(root) {
  await refreshMachines();
  clear(root);
  const rerender = () => renderProgress(root);

  root.append(el('div', { class: 'view-head' }, [el('h1', {}, 'Progreso')]));

  const seg = el('div', { class: 'segmented' }, [
    ['resumen', 'Resumen'], ['ejercicio', 'Por ejercicio'], ['cuerpo', 'Cuerpo'],
  ].map(([id, label]) => el('button', { class: `seg ${tab === id ? 'is-active' : ''}`, onClick: () => { tab = id; rerender(); } }, label)));
  root.append(seg);

  const container = el('div', { class: 'view-body' });
  root.append(container);
  if (tab === 'resumen') await renderResumen(container);
  else if (tab === 'ejercicio') await renderPorEjercicio(container);
  else await renderCuerpo(container);
}
