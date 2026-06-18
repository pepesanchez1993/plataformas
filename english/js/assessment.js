/* ── Placement test ── */
const Assessment = {
  questions: [],
  answers:   [],
  current:   0,
};

const LEVEL_INFO = {
  A1: {
    label: 'A1 — Beginner',
    desc:  'You can understand and use familiar everyday expressions and very basic phrases.',
    color: '#86efac', text: '#14532d'
  },
  A2: {
    label: 'A2 — Elementary',
    desc:  'You can understand sentences about topics of immediate relevance and communicate in simple tasks.',
    color: '#93c5fd', text: '#1e3a8a'
  },
  B1: {
    label: 'B1 — Intermediate',
    desc:  'You can deal with most situations while travelling and produce simple connected text on familiar topics.',
    color: '#fde047', text: '#713f12'
  },
  B2: {
    label: 'B2 — Upper Intermediate',
    desc:  'You can understand complex texts and interact with fluency with native speakers.',
    color: '#f97316', text: '#fff'
  },
  C1: {
    label: 'C1 — Advanced',
    desc:  'You can use language flexibly for social, academic and professional purposes.',
    color: '#a855f7', text: '#fff'
  },
};

async function showAssessment(isRetake) {
  if (Assessment.questions.length === 0) {
    Assessment.questions = await apiGet('/api/exercises/assessment');
  }
  Assessment.answers = [];
  Assessment.current = 0;

  const overlay = document.getElementById('assessment-overlay');
  overlay.classList.remove('hidden');

  if (isRetake) {
    renderAssessmentQuestion();
  } else {
    renderAssessmentWelcome();
  }
}

function renderAssessmentWelcome() {
  document.getElementById('assessment-container').innerHTML = `
    <div class="assess-card">
      <div class="assess-hero">&#127467;&#127479;</div>
      <h1 class="assess-title">Let's find your level</h1>
      <p class="assess-subtitle">
        20 quick grammar questions &mdash; about 8&ndash;10 minutes.<br>
        No feedback during the test. Answer honestly for the best result.
      </p>
      <div class="assess-levels">
        ${Object.entries(LEVEL_INFO).map(([k, v]) =>
          `<span class="assess-level-chip" style="background:${v.color};color:${v.text}">${k}</span>`
        ).join('')}
      </div>
      <button class="btn btn-primary assess-start-btn" onclick="renderAssessmentQuestion()">
        Start test &rsaquo;
      </button>
    </div>`;
}

function renderAssessmentQuestion() {
  const q     = Assessment.questions[Assessment.current];
  const total = Assessment.questions.length;
  const pct   = Math.round((Assessment.current / total) * 100);

  document.getElementById('assessment-container').innerHTML = `
    <div class="assess-card assess-card--question">
      <div class="assess-progress-wrap">
        <div class="assess-progress-track">
          <div class="assess-progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="assess-counter">${Assessment.current + 1} / ${total}</span>
      </div>

      <p class="assess-question">${q.question}</p>

      <div class="assess-options">
        ${q.options.map((opt, i) =>
          `<button class="assess-option" data-index="${i}" onclick="selectAssessOption(this, ${i})">
            <span class="assess-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span>${opt}</span>
          </button>`
        ).join('')}
      </div>

      <button class="btn btn-primary assess-next-btn" id="assess-next-btn" disabled
              onclick="advanceAssessment()">
        ${Assessment.current < total - 1 ? 'Next &rsaquo;' : 'See results'}
      </button>
    </div>`;
}

function selectAssessOption(btn, index) {
  document.querySelectorAll('.assess-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  Assessment.answers[Assessment.current] = index;
  document.getElementById('assess-next-btn').disabled = false;
}

function advanceAssessment() {
  if (Assessment.current < Assessment.questions.length - 1) {
    Assessment.current++;
    renderAssessmentQuestion();
  } else {
    finishAssessment();
  }
}

function finishAssessment() {
  let correct = 0;
  Assessment.questions.forEach((q, i) => {
    if (Assessment.answers[i] === q.answer) correct++;
  });

  const level = scoreToLevel(correct);
  renderAssessmentResult(level, correct);
}

function scoreToLevel(correct) {
  if (correct <= 4)  return 'A1';
  if (correct <= 8)  return 'A2';
  if (correct <= 12) return 'B1';
  if (correct <= 16) return 'B2';
  return 'C1';
}

function renderAssessmentResult(level, correct) {
  const info  = LEVEL_INFO[level];
  const total = Assessment.questions.length;
  const pct   = Math.round((correct / total) * 100);

  document.getElementById('assessment-container').innerHTML = `
    <div class="assess-card assess-card--result">
      <p class="assess-result-label">Your level is</p>
      <div class="assess-result-badge" style="background:${info.color};color:${info.text}">
        ${level}
      </div>
      <h2 class="assess-result-title">${info.label}</h2>
      <p class="assess-result-desc">${info.desc}</p>

      <div class="assess-score-row">
        <div class="assess-score-item">
          <div class="assess-score-num">${correct}/${total}</div>
          <div class="assess-score-lbl">Correct</div>
        </div>
        <div class="assess-score-item">
          <div class="assess-score-num">${pct}%</div>
          <div class="assess-score-lbl">Score</div>
        </div>
      </div>

      <button class="btn btn-primary assess-start-btn"
              onclick="confirmAssessmentLevel('${level}')">
        Start my ${level} daily practice &rsaquo;
      </button>
    </div>`;
}

async function confirmAssessmentLevel(level) {
  await apiPost('/api/profile', { level });
  document.getElementById('assessment-overlay').classList.add('hidden');
  updateSidebarLevel(level);
  navigate('daily');
}
