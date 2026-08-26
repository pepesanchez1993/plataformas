// Procesa una imagen elegida por el usuario (cámara o galería) y devuelve un
// data URL JPEG reescalado, para guardarlo dentro del registro de la máquina.
// Se mantiene pequeño (miniatura) para no inflar IndexedDB ni las copias JSON.

const MAX_DIM = 720;      // lado mayor de la miniatura, en píxeles
const QUALITY = 0.72;     // calidad JPEG (0–1)

// Devuelve una promesa con el data URL, o rechaza con un Error legible.
export function fileToThumbDataURL(file, { maxDim = MAX_DIM, quality = QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('No se pudo procesar la imagen.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
