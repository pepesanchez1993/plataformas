// Helpers de UI sin framework: creación de nodos, toasts, modales y formato.

// Crea un elemento. children puede ser string, Node o array de ellos.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'html') node.innerHTML = v; // solo con contenido controlado, nunca input de usuario
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// --- Toast ---
export function toast(msg, kind = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = el('div', { id: 'toast-host' });
    document.body.append(host);
  }
  const t = el('div', { class: `toast toast--${kind}` }, msg);
  host.append(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => {
    t.classList.remove('is-in');
    setTimeout(() => t.remove(), 250);
  }, 2600);
}

// --- Modal genérico. content: Node. Devuelve API { close }. ---
export function openModal(title, content, { onClose } = {}) {
  const close = () => {
    overlay.classList.remove('is-in');
    setTimeout(() => overlay.remove(), 200);
    onClose?.();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const dialog = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'modal__head' }, [
      el('h2', {}, title),
      el('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onClick: close }, '✕'),
    ]),
    content,
  ]);
  const overlay = el('div', { class: 'overlay', onClick: (e) => { if (e.target === overlay) close(); } }, dialog);
  document.body.append(overlay);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => overlay.classList.add('is-in'));
  return { close };
}

// --- Confirmación (promesa) ---
export function confirmDialog(message, { okLabel = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const body = el('div', { class: 'confirm' }, [
      el('p', {}, message),
      el('div', { class: 'row-actions' }, [
        el('button', { class: 'btn btn--ghost', onClick: () => { api.close(); resolve(false); } }, 'Cancelar'),
        el('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, onClick: () => { api.close(); resolve(true); } }, okLabel),
      ]),
    ]);
    const api = openModal('Confirmar', body, { onClose: () => resolve(false) });
  });
}

// --- Formato ---
export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtWeight(kg) {
  if (kg == null || kg === '') return '—';
  return `${Number(kg).toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`;
}

// Valor datetime-local (YYYY-MM-DDTHH:mm) para "ahora" en hora local.
export function nowLocalInput() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function todayLocalInput() {
  return nowLocalInput().slice(0, 10);
}

// Campo etiquetado con hueco para mensaje de error. Devuelve { wrap, input }.
// opts.input: 'input' | 'textarea' | 'select'. opts.options para select: [{value,label}].
export function field(label, name, opts = {}) {
  const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
  let input;
  if (opts.input === 'textarea') {
    input = el('textarea', { id, name, rows: opts.rows || 2, placeholder: opts.placeholder || '' });
  } else if (opts.input === 'select') {
    input = el('select', { id, name });
    if (opts.placeholder) input.append(el('option', { value: '' }, opts.placeholder));
    for (const o of opts.options || []) input.append(el('option', { value: o.value }, o.label));
  } else {
    input = el('input', {
      id, name, type: opts.type || 'text', placeholder: opts.placeholder || '',
      inputmode: opts.inputmode, step: opts.step, min: opts.min, max: opts.max,
    });
  }
  if (opts.value != null) input.value = opts.value;
  const err = el('span', { class: 'field__err', 'data-err-for': name });
  const wrap = el('label', { class: 'field' }, [el('span', { class: 'field__label' }, label), input, err]);
  return { wrap, input, err };
}

// Pinta errores { campo: mensaje } dentro de un contenedor con campos field().
export function paintErrors(container, errors) {
  container.querySelectorAll('.field__err').forEach((s) => { s.textContent = ''; });
  container.querySelectorAll('.field.has-err').forEach((f) => f.classList.remove('has-err'));
  for (const [name, msg] of Object.entries(errors || {})) {
    const err = container.querySelector(`[data-err-for="${name}"]`);
    if (err) { err.textContent = msg; err.closest('.field')?.classList.add('has-err'); }
  }
}
