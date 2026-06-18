/* ── Daily Task ── */
const Daily = {
  session:  null,
  plan:     null,
  timerEl:  null,
  timerInt: null,
  elapsed:  0,
};

/* Grammar ids per level (rotate weekly so it's not always the same 3) */
const LEVEL_GRAMMAR = {
  A1: [[1, 5, 12], [1, 7, 12], [5, 7, 12], [1, 5, 7]],
  A2: [[1, 5, 12], [1, 7, 12], [5, 7, 12], [1, 5, 7]],
  B1: [[2, 3, 8],  [2, 3, 9],  [2, 8, 9],  [3, 8, 9]],
  B2: [[4, 6, 10], [4, 6, 11], [4, 10, 11],[6, 10, 11]],
  C1: [[4, 6, 11], [6, 10, 11],[4, 10, 11],[4, 6, 10]],
};
const LEVEL_READING   = { A1: 1, A2: 1, B1: 2, B2: 3, C1: 3 };
const LEVEL_LISTENING = { A1: 1, A2: 1, B1: 2, B2: 3, C1: 3 };

function weekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - year) / 86400000) + 1) / 7);
}

function buildPlan(level, date) {
  const week   = weekNumber(date);
  const rotate = LEVEL_GRAMMAR[level] || LEVEL_GRAMMAR['B1'];
  const grammarIds = rotate[week % rotate.length];
  return {
    grammarIds,
    readingId:   LEVEL_READING[level]   || 2,
    listeningId: LEVEL_LISTENING[level] || 2,
  };
}

async function initDaily() {
  const profile = await apiGet('/api/profile');
  if (!profile) { showAssessment(false); return; }

  const today   = todayStr();
  Daily.plan    = buildPlan(profile.level, today);

  const saved = await apiGet(`/api/daily/${today}`);
  Daily.session = saved || {
    date: today, grammarComplete: false,
    readingComplete: false, listeningComplete: false, completedAt: null
  };

  renderDailyHome(profile.level);
  startTimer();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function startTimer() {
  if (Daily.timerInt) clearInterval(Daily.timerInt);
  Daily.elapsed = 0;
  Daily.timerInt = setInterval(() => {
    Daily.elapsed++;
    const el = document.getElementById('daily-timer');
    if (el) el.textContent = formatTime(Daily.elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(Daily.timerInt);
  Daily.timerInt = null;
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderDailyHome(level) {
  const s   = Daily.session;
  const done = [s.grammarComplete, s.readingComplete, s.listeningComplete].filter(Boolean).length;
  const pct  = Math.round((done / 3) * 100);

  const allDone = s.grammarComplete && s.readingComplete && s.listeningComplete;

  document.getElementById('daily-content').innerHTML = `
    <header class="section-header">
      <div>
        <h1>Daily Task</h1>
        <p class="section-subtitle">${formatDateLong(todayStr())}</p>
      </div>
      <div class="daily-level-badge level-badge level-${level}">${level} &bull; ~30 min</div>
    </header>

    ${allDone ? completeBanner() : ''}

    <div class="daily-tasks">
      ${taskCard('grammar',   '&#9998;',  'Grammar',   '3 exercises', '~10 min', s.grammarComplete,   level)}
      ${taskCard('reading',   '&#128214;','Reading',   '1 text',      '~12 min', s.readingComplete,   level)}
      ${taskCard('listening', '&#127911;','Listening',  '1 exercise',  '~8 min',  s.listeningComplete, level)}
    </div>

    <div class="daily-footer">
      <div class="daily-progress-row">
        <span class="daily-progress-label">${done}/3 tasks done</span>
        <span class="daily-timer-label">&#9201; <span id="daily-timer">00:00</span></span>
      </div>
      <div class="progress-bar-track" style="margin-top:8px">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>`;

  // Wire up buttons
  if (!s.grammarComplete)   document.getElementById('btn-start-grammar')  ?.addEventListener('click', startDailyGrammar);
  if (!s.readingComplete)   document.getElementById('btn-start-reading')  ?.addEventListener('click', startDailyReading);
  if (!s.listeningComplete) document.getElementById('btn-start-listening')?.addEventListener('click', startDailyListening);
}

function taskCard(key, icon, title, meta1, meta2, done, level) {
  const btnId = `btn-start-${key}`;
  const btnLabel = done ? '' : `<button class="btn btn-primary task-btn" id="${btnId}">Start &rsaquo;</button>`;
  const doneEl   = done ? `<span class="task-done-badge">&#10003; Done</span>` : '';
  return `
    <div class="daily-task-card ${done ? 'task-done' : ''}">
      <div class="task-icon">${icon}</div>
      <div class="task-info">
        <div class="task-title">${title} ${doneEl}</div>
        <div class="task-meta">${meta1} &bull; ${meta2} &bull; <span class="level-badge level-${level}">${level}</span></div>
      </div>
      ${btnLabel}
    </div>`;
}

function completeBanner() {
  return `<div class="complete-banner">
    &#127775; Session complete! Come back tomorrow for the next task.
  </div>`;
}

function formatDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ── Start module in daily mode ── */
function startDailyGrammar() {
  stopTimer();
  navigate('grammar');
  initGrammar({ ids: Daily.plan.grammarIds, returnTo: 'daily' });
}

function startDailyReading() {
  stopTimer();
  navigate('reading');
  initReading({ id: Daily.plan.readingId, returnTo: 'daily' });
}

function startDailyListening() {
  stopTimer();
  navigate('listening');
  initListening({ id: Daily.plan.listeningId, returnTo: 'daily' });
}

/* ── Called from grammar/reading/listening on completion ── */
async function onDailyModuleComplete(module) {
  Daily.session[`${module}Complete`] = true;

  const allDone = Daily.session.grammarComplete &&
                  Daily.session.readingComplete  &&
                  Daily.session.listeningComplete;

  const update = {
    grammarComplete:   Daily.session.grammarComplete,
    readingComplete:   Daily.session.readingComplete,
    listeningComplete: Daily.session.listeningComplete,
    completedAt:       allDone ? new Date().toISOString() : null,
  };

  await apiPost(`/api/daily/${todayStr()}`, update);
  Daily.session = { ...Daily.session, ...update };

  navigate('daily');
  startTimer();

  const profile = await apiGet('/api/profile');
  renderDailyHome(profile.level);
}
