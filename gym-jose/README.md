# Gym José 🏋️

App personal de seguimiento de gimnasio, pensada para el móvil. **PWA instalable y 100 % offline**
(funciona sin cobertura dentro del gym). Sin build, sin dependencias externas, sin CDN:
HTML + CSS + JavaScript (módulos ES) y almacenamiento local en **IndexedDB**.

## Qué incluye

- **Rutinas** — CRUD de rutinas y ejercicios, registro de entrenos, historial y gráficas de progresión.
- **Plan** — plan de hipertrofia de 12 semanas (3 mesociclos) con vista semana/día; marcar una sesión
  como completada la registra automáticamente en el historial.
- **Progreso**
  - *Resumen*: volumen semanal por grupo muscular y récords (PR).
  - *Gráficas*: evolución por ejercicio.
  - *Cuerpo*: edad, peso, altura, IMC y medidas corporales (cintura, pecho, cadera, brazo, muslo,
    cuello, % grasa) con evolución en el tiempo.
- **Máquinas** — catálogo editable de máquinas de Fitness Park agrupado por zona muscular.
- **Extras** — sets fantasma (ghost sets), detección automática de récords, temporizador de descanso
  con vibración, calculadora de discos, 1RM estimado (Epley/Brzycki) y copia de seguridad
  export/import en JSON y CSV.

## Uso en local

No necesita build. Al usar módulos ES hay que servirlo por HTTP (no vale abrir el `index.html`
con `file://`). Desde la carpeta `gym-jose/`:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000/> en el navegador.

## Despliegue

Este repo (`plataformas`) se publica con **GitHub Pages desde la raíz de `main`**. Desplegar =
hacer *push* a `main`. La app queda disponible en:

```
https://pepesanchez1993.github.io/plataformas/gym-jose/
```

## Datos y privacidad

Todo se guarda **en el propio dispositivo** (IndexedDB del navegador). No hay servidor ni cuenta.
Para no perder los datos al cambiar de móvil o limpiar el navegador, usa **Exportar copia** desde
la app y guárdala; luego **Importar** en el dispositivo nuevo.

## Estructura

```
gym-jose/
├── index.html              # shell de la app
├── manifest.webmanifest    # PWA (instalable)
├── sw.js                   # service worker (precache offline)
├── assets/css/styles.css   # estilos (paleta oscura cálida)
└── src/
    ├── app.js              # arranque y router de vistas
    ├── lib/                # db (IndexedDB), ui, validate, cálculo (1RM, discos…)
    ├── data/               # seed: catálogo de máquinas y plan de 12 semanas
    └── views/              # rutinas, plan, progreso, máquinas
```
