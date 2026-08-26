// Gráfico de líneas SVG ligero y sin dependencias (funciona offline, se adapta al tema).
// points: [{ x: <ms epoch>, y: <número>, label? }]. Devuelve un nodo SVG.

import { el } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  return node;
}

export function lineChart(points, { width = 320, height = 180, unit = 'kg' } = {}) {
  const wrap = el('div', { class: 'chart' });
  const valid = points.filter((p) => p.y != null && !Number.isNaN(Number(p.y)));
  if (valid.length < 2) {
    wrap.append(el('p', { class: 'muted small' }, 'Necesitas al menos 2 registros para ver la progresión.'));
    return wrap;
  }

  const padL = 34, padR = 10, padT = 12, padB = 22;
  const xs = valid.map((p) => p.x);
  const ys = valid.map((p) => Number(p.y));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const sx = (x) => padL + ((x - minX) / spanX) * (width - padL - padR);
  const sy = (y) => height - padB - ((y - minY) / spanY) * (height - padT - padB);

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart__svg', role: 'img', 'aria-label': 'Progresión de peso' });

  // Rejilla + etiquetas Y (min, medio, max)
  [minY, (minY + maxY) / 2, maxY].forEach((yv) => {
    const y = sy(yv);
    svg.append(svgEl('line', { x1: padL, y1: y, x2: width - padR, y2: y, class: 'chart__grid' }));
    const t = svgEl('text', { x: 4, y: y + 3, class: 'chart__axis' });
    t.textContent = Math.round(yv);
    svg.append(t);
  });

  // Línea
  const d = valid.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(Number(p.y)).toFixed(1)}`).join(' ');
  svg.append(svgEl('path', { d, class: 'chart__line', fill: 'none' }));

  // Puntos + tooltip nativo
  valid.forEach((p) => {
    const c = svgEl('circle', { cx: sx(p.x), cy: sy(Number(p.y)), r: 3.5, class: 'chart__dot' });
    const title = svgEl('title');
    const dateStr = new Date(p.x).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    title.textContent = `${dateStr}: ${p.y} ${unit}`;
    c.append(title);
    svg.append(c);
  });

  // Etiquetas X (primera y última fecha)
  [valid[0], valid[valid.length - 1]].forEach((p, i) => {
    const t = svgEl('text', { x: i ? width - padR : padL, y: height - 6, class: 'chart__axis', 'text-anchor': i ? 'end' : 'start' });
    t.textContent = new Date(p.x).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    svg.append(t);
  });

  wrap.append(svg);
  return wrap;
}
