// Punto de entrada: arranque, seed inicial, router de pestañas, backup y PWA.

import { ensureSeeded } from './store.js';
import { el, clear, openModal, toast, confirmDialog } from './lib/ui.js';
import { exportJSON, exportLogsCSV, importJSONFromFile } from './lib/export.js';
import { state } from './store.js';
import { renderRoutines } from './views/routines.js';
import { renderPlan } from './views/plan.js';
import { renderMachines } from './views/machines.js';
import { renderProgress } from './views/progress.js';
import { openPlateCalc } from './lib/plate-ui.js';

const TABS = [
  { id: 'log', label: 'Entreno', icon: '🏋️', render: renderRoutines },
  { id: 'plan', label: 'Plan 12', icon: '📅', render: renderPlan },
  { id: 'machines', label: 'Máquinas', icon: '⚙️', render: renderMachines },
  { id: 'progress', label: 'Progreso', icon: '📈', render: renderProgress },
];

let current = 'log';

function backupMenu() {
  const fileInput = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const yes = await confirmDialog('Importar sustituirá TODOS los datos actuales por los del backup. ¿Continuar?', { okLabel: 'Importar', danger: true });
    if (!yes) { fileInput.value = ''; return; }
    try {
      await importJSONFromFile(file);
      toast('Backup importado', 'ok');
      renderCurrent();
    } catch (err) {
      toast(`Error al importar: ${err.message}`, 'warn');
    }
    fileInput.value = '';
  });

  const body = el('div', { class: 'stack' }, [
    el('p', { class: 'muted small' }, 'Sin servidor: haz copias manuales para no perder datos entre dispositivos.'),
    el('button', { class: 'btn btn--primary btn--block', onClick: () => exportJSON() }, '⬇ Exportar backup (JSON)'),
    el('button', { class: 'btn btn--ghost btn--block', onClick: () => exportLogsCSV(state.machinesById) }, '⬇ Exportar registros (CSV)'),
    el('button', { class: 'btn btn--ghost btn--block', onClick: () => fileInput.click() }, '⬆ Importar backup (JSON)'),
    fileInput,
    el('button', { class: 'btn btn--ghost btn--block', onClick: () => openPlateCalc() }, '🧮 Calculadora de discos'),
  ]);
  openModal('Datos y herramientas', body);
}

function header() {
  return el('header', { class: 'app-header' }, [
    el('div', { class: 'app-header__brand' }, [
      el('span', { class: 'app-header__logo' }, '🏋️'),
      el('div', {}, [
        el('h1', { class: 'app-header__title' }, 'Gym José'),
        el('span', { class: 'app-header__sub' }, 'Fitness Park · offline'),
      ]),
    ]),
    el('button', { class: 'icon-btn icon-btn--lg', 'aria-label': 'Datos y herramientas', onClick: backupMenu }, '⋯'),
  ]);
}

function bottomNav() {
  return el('nav', { class: 'bottom-nav', 'aria-label': 'Navegación principal' },
    TABS.map((t) => el('button', {
      class: `nav-btn ${current === t.id ? 'is-active' : ''}`,
      'aria-current': current === t.id ? 'page' : null,
      onClick: () => { current = t.id; renderCurrent(); window.scrollTo(0, 0); },
    }, [el('span', { class: 'nav-btn__icon' }, t.icon), el('span', { class: 'nav-btn__label' }, t.label)])),
  );
}

function renderCurrent() {
  // Actualiza estado activo de la nav sin recrear toda la app.
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('is-active', TABS[i].id === current);
    b.setAttribute('aria-current', TABS[i].id === current ? 'page' : 'false');
  });
  const root = document.getElementById('view-root');
  const tab = TABS.find((t) => t.id === current);
  tab.render(root);
}

async function boot() {
  const app = document.getElementById('app');
  clear(app);
  try {
    await ensureSeeded();
  } catch (err) {
    app.append(el('div', { class: 'fatal' }, [
      el('h2', {}, 'No se pudo iniciar el almacenamiento'),
      el('p', {}, 'Tu navegador puede tener IndexedDB deshabilitado (modo privado estricto).'),
      el('p', { class: 'muted small' }, String(err?.message || err)),
    ]));
    return;
  }

  app.append(header());
  app.append(el('main', { id: 'view-root', class: 'view-root' }));
  app.append(bottomNav());
  renderCurrent();
}

// Registro del service worker (PWA / offline).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline igualmente para lo ya cacheado */ });
  });
}

boot();
