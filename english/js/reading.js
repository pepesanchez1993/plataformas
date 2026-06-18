/* ── Reading module ── */
const Reading = {
  texts:    [],
  current:  null,
  answers:  {},
  returnTo: null,
};

async function initReading(options = {}) {
  if (Reading.texts.length === 0) {
    Reading.texts = await apiGet('/api/exercises/readings');
  }
  Reading.returnTo = options.returnTo || null;

  if (options.id) {
    const text = Reading.texts.find(t => t.id === options.id);
    if (text) { openReading(text.id); return; }
  }
  showReadingList();
}

function showReadingList() {
  Reading.current = null;
  Reading.answers = {};

  document.getElementById('reading-content').innerHTML = `
    <header class="section-header">
      <h1>Reading</h1>
      <p class="section-subtitle" style="align-self:center">Choose a text to read and answer comprehension questions.</p>
    </header>
    <div class="reading-list">
      ${Reading.texts.map(t => readingCardHTML(t)).join('')}
    </div>`;

  Reading.texts.forEach(t => {
    document.getElementById(`rc-${t.id}`).addEventListener('click', () => openReading(t.id));
  });
}

function readingCardHTML(t) {
  return `
    <div class="reading-card" id="rc-${t.id}">
      <div style="font-size:32px">&#128214;</div>
      <div class="reading-card-info">
        <div class="reading-card-title">${t.title}</div>
        <div class="reading-card-meta">
          <span class="level-badge level-${t.level}">${t.level}</span>
          <span class="read-time">&#128337; ${t.readTime}</span>
          <span>${t.questions.length} questions</span>
        </div>
      </div>
      <span class="btn btn-primary" style="pointer-events:none">Read &rsaquo;</span>
    </div>`;
}

function openReading(id) {
  const text = Reading.texts.find(t => t.id === id);
  Reading.current = text;
  Reading.answers = {};

  const backBtn = Reading.returnTo === 'daily'
    ? `<button class="btn btn-ghost" onclick="navigate('daily')">&#8592; Daily task</button>`
    : `<button class="btn btn-ghost" onclick="showReadingList()">&#8592; Back</button>`;

  document.getElementById('reading-content').innerHTML = `
    <div class="reading-view-header">
      ${backBtn}
      <h1>${text.title}</h1>
      <span class="level-badge level-${text.level}">${text.level}</span>
    </div>
    <div class="reading-passage">${renderPassage(text.text, text.vocabulary)}</div>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:10px;">
      &#128161; Words highlighted in yellow have definitions — hover to see them.
    </p>
    <div class="vocab-legend">${renderVocabLegend(text.vocabulary)}</div>
    <div class="questions-section">
      <h2>Comprehension Questions</h2>
      ${renderQuestions(text.questions)}
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-primary" id="reading-submit-btn" disabled>Submit answers</button>
      </div>
      <div id="reading-result"></div>
    </div>`;

  document.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => selectQOption(btn));
  });
  document.getElementById('reading-submit-btn').addEventListener('click', checkReadingAnswers);
}

function renderPassage(text, vocabulary) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let result = escaped;
  vocabulary.forEach(v => {
    const re = new RegExp(`\\b(${escapeRe(v.word)})\\b`, 'gi');
    result = result.replace(re, match =>
      `<span class="vocab-word">${match}<span class="vocab-tooltip">${v.definition}</span></span>`
    );
  });
  return result;
}

function renderVocabLegend(vocabulary) {
  return vocabulary.map(v =>
    `<span class="vocab-tag" title="${v.definition}">${v.word}</span>`
  ).join('');
}

function renderQuestions(questions) {
  return questions.map((q, qi) => {
    const opts = q.options.map((opt, oi) =>
      `<button class="q-option" data-qi="${qi}" data-oi="${oi}">${opt}</button>`
    ).join('');
    return `
      <div class="question-block">
        <p class="question-text">${qi + 1}. ${q.question}</p>
        <div class="q-options">${opts}</div>
      </div>`;
  }).join('');
}

function selectQOption(btn) {
  const qi = btn.dataset.qi;
  document.querySelectorAll(`.q-option[data-qi="${qi}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  Reading.answers[qi] = parseInt(btn.dataset.oi);

  const total    = Reading.current.questions.length;
  const answered = Object.keys(Reading.answers).length;
  document.getElementById('reading-submit-btn').disabled = answered < total;
}

function checkReadingAnswers() {
  const questions = Reading.current.questions;
  let correct = 0;

  document.querySelectorAll('.q-option').forEach(btn => {
    btn.disabled = true;
    const qi = parseInt(btn.dataset.qi);
    const oi = parseInt(btn.dataset.oi);
    if (oi === questions[qi].answer)     btn.classList.add('correct');
    else if (btn.classList.contains('selected')) btn.classList.add('wrong');
  });

  questions.forEach((q, qi) => { if (Reading.answers[qi] === q.answer) correct++; });

  const total = questions.length;
  const pct   = Math.round((correct / total) * 100);
  saveProgress('reading', Reading.current.id, correct === total);

  document.getElementById('reading-submit-btn').style.display = 'none';

  const backBtn = Reading.returnTo === 'daily'
    ? `<button class="btn btn-primary" onclick="onDailyModuleComplete('reading')">Back to daily task &#10003;</button>`
    : `<button class="btn btn-primary" onclick="openReading(${Reading.current.id})">Try again</button>
       <button class="btn btn-secondary" onclick="showReadingList()">All texts</button>`;

  document.getElementById('reading-result').innerHTML = `
    <div class="card" style="margin-top:20px;text-align:center">
      <div class="score-circle" style="margin:0 auto 16px">
        <span class="big-num">${correct}/${total}</span>
        <span class="small-txt">${pct}%</span>
      </div>
      <p style="color:var(--text-2);margin-bottom:16px">
        ${pct >= 80 ? '&#127775; Excellent reading comprehension!' : pct >= 60 ? '&#128077; Good job!' : '&#128218; Have another read and try again.'}
      </p>
      <div class="btn-row" style="justify-content:center;gap:12px">${backBtn}</div>
    </div>`;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
