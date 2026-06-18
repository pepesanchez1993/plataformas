/* ── Grammar module ── */
const Grammar = {
  allExercises: [],
  session:      [],
  current:      0,
  answered:     false,
  score:        0,
  returnTo:     null,
};

async function initGrammar(options = {}) {
  if (Grammar.allExercises.length === 0) {
    Grammar.allExercises = await apiGet('/api/exercises/grammar');
  }

  if (options.ids) {
    Grammar.session = Grammar.allExercises.filter(e => options.ids.includes(e.id));
  } else {
    Grammar.session = [...Grammar.allExercises];
  }

  Grammar.current  = 0;
  Grammar.answered = false;
  Grammar.score    = 0;
  Grammar.returnTo = options.returnTo || null;

  // Header title stays, update the back button
  const header = document.querySelector('#section-grammar .section-header h1');
  if (header) header.textContent = Grammar.returnTo === 'daily' ? 'Grammar — Daily Task' : 'Grammar';

  showGrammarExercise();
}

function showGrammarExercise() {
  const ex    = Grammar.session[Grammar.current];
  const total = Grammar.session.length;
  const pct   = Math.round((Grammar.current / total) * 100);

  const barWrap = document.getElementById('grammar-progress-bar-wrap');
  barWrap.style.display = 'block';
  document.getElementById('grammar-progress-fill').style.width = pct + '%';
  document.getElementById('grammar-progress-label').textContent = `${Grammar.current + 1} / ${total}`;

  const container  = document.getElementById('grammar-content');
  Grammar.answered = false;

  const html = ex.type === 'multiple_choice' ? renderMC(ex) : renderFill(ex);

  container.innerHTML = `
    <div class="card grammar-card">
      ${Grammar.returnTo === 'daily'
        ? `<button class="btn btn-ghost" style="margin-bottom:16px" onclick="navigate('daily')">&#8592; Back to daily task</button>`
        : ''}
      <div class="exercise-meta">
        <span class="level-badge level-${ex.level}">${ex.level}</span>
        <span class="exercise-topic">${ex.topic}</span>
      </div>
      ${html}
      <div id="grammar-explanation"></div>
      <div class="btn-row" id="grammar-btn-row">
        <button class="btn btn-primary" id="grammar-check-btn" disabled>Check answer</button>
      </div>
    </div>`;

  if (ex.type === 'multiple_choice') {
    document.querySelectorAll('.mc-option').forEach((btn, i) => {
      btn.addEventListener('click', () => selectMCOption(i, ex));
    });
  } else {
    const input = document.getElementById('fill-input');
    input.addEventListener('input', () => {
      document.getElementById('grammar-check-btn').disabled = input.value.trim() === '';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !document.getElementById('grammar-check-btn').disabled) checkFill(ex);
    });
  }

  document.getElementById('grammar-check-btn').addEventListener('click', () => {
    if (Grammar.answered) return;
    if (ex.type === 'multiple_choice') {
      const sel = document.querySelector('.mc-option.selected');
      if (!sel) return;
      checkMC(parseInt(sel.dataset.index), ex);
    } else {
      checkFill(ex);
    }
  });
}

function renderMC(ex) {
  const opts = ex.options.map((opt, i) =>
    `<button class="mc-option" data-index="${i}">${String.fromCharCode(65 + i)}. ${opt}</button>`
  ).join('');
  return `<p class="exercise-question">${ex.question}</p><div class="mc-options">${opts}</div>`;
}

function renderFill(ex) {
  return `
    <div class="fill-blank-wrap">
      <span>${ex.before}</span>
      <input id="fill-input" class="fill-blank-input" type="text"
             placeholder="..." autocomplete="off" spellcheck="false">
      <span>${ex.after}</span>
    </div>
    <p class="hint-text">Hint: ${ex.hint}</p>`;
}

function selectMCOption(index) {
  if (Grammar.answered) return;
  document.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.mc-option')[index].classList.add('selected');
  document.getElementById('grammar-check-btn').disabled = false;
}

function checkMC(selectedIndex, ex) {
  if (Grammar.answered) return;
  Grammar.answered = true;

  const correct = selectedIndex === ex.answer;
  if (correct) Grammar.score++;

  document.querySelectorAll('.mc-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === ex.answer)                       btn.classList.add('correct');
    if (i === selectedIndex && !correct)        btn.classList.add('wrong');
  });

  showExplanation(correct, ex.explanation);
  saveProgress('grammar', ex.id, correct);
  showNextButton();
}

function checkFill(ex) {
  if (Grammar.answered) return;
  Grammar.answered = true;

  const input   = document.getElementById('fill-input');
  const value   = input.value.trim().toLowerCase();
  const correct = ex.alternatives.map(a => a.toLowerCase()).includes(value);

  if (correct) Grammar.score++;
  input.disabled = true;
  input.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) input.value = ex.answer;

  showExplanation(correct, ex.explanation);
  saveProgress('grammar', ex.id, correct);
  showNextButton();
}

function showExplanation(correct, text) {
  const el  = document.getElementById('grammar-explanation');
  const cls  = correct ? 'correct' : 'wrong';
  const icon = correct ? '&#10003;' : '&#10007;';
  el.innerHTML = `
    <div class="explanation-box ${cls}">
      <strong>${icon} ${correct ? 'Correct!' : 'Not quite.'}</strong> ${text}
    </div>`;
}

function showNextButton() {
  const row    = document.getElementById('grammar-btn-row');
  const isLast = Grammar.current === Grammar.session.length - 1;
  document.getElementById('grammar-check-btn').style.display = 'none';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = isLast ? 'See results' : 'Next exercise ›';
  nextBtn.addEventListener('click', () => {
    if (isLast) showGrammarScore();
    else { Grammar.current++; showGrammarExercise(); }
  });
  row.appendChild(nextBtn);
}

function showGrammarScore() {
  const total = Grammar.session.length;
  const score = Grammar.score;
  const pct   = Math.round((score / total) * 100);
  const msg   = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practising!';

  document.getElementById('grammar-progress-bar-wrap').style.display = 'none';
  document.getElementById('grammar-progress-label').textContent = '';

  const backBtn = Grammar.returnTo === 'daily'
    ? `<button class="btn btn-primary" onclick="onDailyModuleComplete('grammar')">Back to daily task &#10003;</button>`
    : `<button class="btn btn-primary" onclick="initGrammar()">Try again</button>
       <button class="btn btn-secondary" onclick="navigate('dashboard')">Dashboard</button>`;

  document.getElementById('grammar-content').innerHTML = `
    <div class="score-screen">
      <div class="score-circle">
        <span class="big-num">${score}/${total}</span>
        <span class="small-txt">${pct}%</span>
      </div>
      <h2>${msg}</h2>
      <p>You answered ${score} out of ${total} questions correctly.</p>
      <div class="btn-row" style="justify-content:center;gap:12px">${backBtn}</div>
    </div>`;
}
