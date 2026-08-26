// Backup manual: exportar/importar JSON (todas las stores) y exportar logs a CSV.

import { exportAll, importAll } from '../db.js';
import { toast } from './ui.js';

function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function exportJSON() {
  const dump = await exportAll();
  download(`gym-jose-backup-${stamp()}.json`, JSON.stringify(dump, null, 2));
  toast('Backup JSON exportado', 'ok');
}

// CSV de los registros de entrenamiento (con nombre de máquina resuelto).
export async function exportLogsCSV(machinesById) {
  const dump = await exportAll();
  const logs = dump.data.workoutLogs || [];
  if (!logs.length) { toast('No hay registros que exportar', 'warn'); return; }

  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['fecha', 'maquina', 'peso_kg', 'series', 'reps_por_serie', 'rpe', 'origen_plan', 'notas'];
  const rows = logs
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((l) => [
      l.dateISO,
      machinesById.get(l.machineId)?.name || l.machineId,
      l.weightKg ?? '',
      l.setsDone ?? '',
      Array.isArray(l.repsPerSet) ? l.repsPerSet.join('|') : (l.repsPerSet ?? ''),
      l.rpe ?? '',
      l.planRef || '',
      l.notes || '',
    ].map(esc).join(';'));

  // BOM para que Excel abra bien los acentos.
  download(`gym-jose-logs-${stamp()}.csv`, '﻿' + [head.join(';'), ...rows].join('\n'), 'text/csv');
  toast('CSV de registros exportado', 'ok');
}

// Importa desde un File (input type=file). Devuelve true si se importó.
export function importJSONFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dump = JSON.parse(reader.result);
        if (dump.app && dump.app !== 'gym-jose') {
          throw new Error('Este backup no es de Gym José.');
        }
        await importAll(dump, { replace: true });
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}
