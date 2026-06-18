/* ── Listening module ── */
const Listening = {
  exercises: [],
  current:   null,
  speed:     1,
  returnTo:  null,
};

async function initListening(options = {}) {
  if (Listening.exercises.length === 0) {
    Listening.exercises = await apiGet('/api/exercises/listening');
  }
  Listening.returnTo = options.returnTo || null;

  if (options.id) {
    const ex = Listening.exercises.find(e => e.id === options.id);
    if (ex) { openListening(ex.id); return; }
  }
  showListeningList();
}

function showListeningList() {
  window.speechSynthesis.cancel();
  Listening.current = null;

  document.getElementById('listening-content').innerHTML = `
    <header class="section-header">
      <h1>Listening</h1>
      <p class="section-subtitle" style="align-self:center">Listen and complete the exercises using your browser's text-to-speech.</p>
    </header>
    <div class="listening-list">
      ${Listening.exercises.map(e => listeningCardHTML(e)).join('')}
    </div>`;

  Listening.exercises.forEach(e => {
    document.getElementById(`lc-${e.id}`).addEventListener('click', () => openListening(e.id));
  });
}

function listeningCardHTML(ex) {
  const typeLabel = ex.type === 'gap_fill' ? 'Gap fill' : 'Dictation';
  return `
    <div class="listening-card" id="lc-${ex.id}">
      <div style="font-size:32px">&#127911;</div>
      <div class="listening-card-info">
        <div class="listening-card-title">${ex.title}</div>
        <div class="listening-card-meta">
          <span class="level-badge level-${ex.level}">${ex.level}</span>
          <span class="type-badge">${typeLabel}</span>
        </div>
      </div>
      <span class="btn btn-primary" style="pointer-events:none">Start &rsaquo;</span>
    </div>`;
}

function openListening(id) {
  window.speechSynthesis.cancel();
  const ex = Listening.exercises.find(e => e.id === id);
  Listening.current = ex;
  Listening.speed   = 1;

  if (ex.type === 'gap_fill') renderGapFill(ex);
  else renderDictation(ex);
}

/* ── TTS ── */
function speak(text, rate) {
  window.speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = 'en-GB';
  u.rate   = rate || Listening.speed;

  const btn = document.getElementById('tts-play-btn');
  if (btn) { btn.textContent = '⏸ Stop'; btn.classList.add('playing'); }

  u.onend = u.onerror = () => {
    const b = document.getElementById('tts-play-btn');
    if (b) { b.textContent = '▶ Play'; b.classList.remove('playing'); }
  };

  window.speechSynthesis.speak(u);
}

function ttsToggle(text) {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    const btn = document.getElementById('tts-play-btn');
    if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('playing'); }
  } else {
    speak(text, Listening.speed);
  }
}

function ttsControlsHTML(text) {
  return `
    <div class="tts-controls">
      <button class="btn-play" id="tts-play-btn" onclick="ttsToggle('${escapeAttr(text)}')">&#9654; Play</button>
      <select class="speed-select" id="speed-select" onchange="Listening.speed=parseFloat(this.value)">
        <option value="0.7">Slow (0.7×)</option>
        <option value="1" selected>Normal (1×)</option>
        <option value="1.3">Fast (1.3×)</option>
      </select>
      <p>${Listening.current.instructions}</p>
    </div>`;
}

function backBtn() {
  return Listening.returnTo === 'daily'
    ? `<button class="btn btn-ghost" onclick="navigate('daily')">&#8592; Daily task</button>`
    : `<button class="btn btn-ghost" onclick="showListeningList()">&#8592; Back</button>`;
}

/* ── Gap fill ── */
function renderGapFill(ex) {
  let blankIdx = 0;
  const html = ex.display_text.replace(/\[BLANK\]/g, () => {
    const idx = blankIdx++;
    return `<input type="text" class="gap-input" data-index="${idx}" placeholder="..." autocomplete="off" spellcheck="false">`;
  });

  document.getElementById('listening-content').innerHTML = `
    <div class="reading-view-header">
      ${backBtn()}
      <h1>${ex.title}</h1>
      <span class="level-badge level-${ex.level}">${ex.level}</span>
    </div>
    ${ttsControlsHTML(ex.full_text)}
    <div class="gap-fill-text">${html}</div>
    <div class="btn-row">
      <button class="btn btn-primary" id="gap-submit-btn" onclick="checkGapFill()" disabled>Check answers</button>
    </div>
    <div id="gap-result"></div>`;

  document.querySelectorAll('.gap-input').forEach(input => {
    input.addEventListener('input', () => {
      const all = [...document.querySelectorAll('.gap-input')];
      document.getElementById('gap-submit-btn').disabled = all.some(i => i.value.trim() === '');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const inputs   = [...document.querySelectorAll('.gap-input')];
        const nextEmpty = inputs.find(i => i !== input && i.value.trim() === '');
        if (nextEmpty) nextEmpty.focus();
      }
    });
  });
}

function checkGapFill() {
  const ex = Listening.current;
  let correct = 0;
  const inputs = document.querySelectorAll('.gap-input');

  inputs.forEach((input, i) => {
    input.disabled = true;
    const val = input.value.trim().toLowerCase();
    if (val === ex.answers[i].toLowerCase()) {
      correct++;
      input.classList.add('correct');
    } else {
      input.classList.add('wrong');
      input.value = ex.answers[i];
    }
  });

  const total = ex.answers.length;
  const pct   = Math.round((correct / total) * 100);
  saveProgress('listening', ex.id, correct === total);

  document.getElementById('gap-submit-btn').style.display = 'none';

  const btnHTML = Listening.returnTo === 'daily'
    ? `<button class="btn btn-primary" onclick="onDailyModuleComplete('listening')">Back to daily task &#10003;</button>`
    : `<button class="btn btn-primary" onclick="openListening(${ex.id})">Try again</button>
       <button class="btn btn-secondary" onclick="showListeningList()">All exercises</button>`;

  document.getElementById('gap-result').innerHTML = `
    <div class="card" style="margin-top:20px;text-align:center">
      <div class="score-circle" style="margin:0 auto 16px">
        <span class="big-num">${correct}/${total}</span>
        <span class="small-txt">${pct}%</span>
      </div>
      <p style="color:var(--text-2);margin-bottom:16px">
        ${pct >= 80 ? '&#127897; Great listening!' : pct >= 60 ? '&#128077; Good job!' : '&#128266; Listen again and try once more.'}
      </p>
      <div class="btn-row" style="justify-content:center;gap:12px">${btnHTML}</div>
    </div>`;
}

/* ── Dictation ── */
function renderDictation(ex) {
  document.getElementById('listening-content').innerHTML = `
    <div class="reading-view-header">
      ${backBtn()}
      <h1>${ex.title}</h1>
      <span class="level-badge level-${ex.level}">${ex.level}</span>
    </div>
    ${ttsControlsHTML(ex.full_text)}
    <div class="instructions-box">&#9881; Type exactly what you hear. Punctuation is not checked.</div>
    <textarea class="dictation-area" id="dictation-input" placeholder="Start typing here after listening..."></textarea>
    <div class="btn-row">
      <button class="btn btn-primary" id="dictation-submit-btn" onclick="checkDictation()" disabled>Check</button>
      <button class="btn btn-secondary" onclick="revealTranscript()">Show transcript</button>
    </div>
    <div id="dictation-result"></div>`;

  document.getElementById('dictation-input').addEventListener('input', () => {
    const val = document.getElementById('dictation-input').value.trim();
    document.getElementById('dictation-submit-btn').disabled = val === '';
  });
}

function checkDictation() {
  const ex = Listening.current;
  document.getElementById('dictation-input').disabled = true;
  document.getElementById('dictation-submit-btn').style.display = 'none';

  const userText = document.getElementById('dictation-input').value;
  const userWords = cleanWords(userText);
  const origWords = cleanWords(ex.full_text);

  let correct = 0;
  const origRaw = ex.full_text.split(/\s+/);
  const diffHTML = origWords.map((word, i) => {
    if (userWords[i] === word) { correct++; return `<span class="diff-word ok">${origRaw[i] || word} </span>`; }
    return `<span class="diff-word miss">${origRaw[i] || word} </span>`;
  }).join('');

  const total = origWords.length;
  const pct   = Math.round((correct / total) * 100);
  saveProgress('listening', ex.id, pct >= 80);

  const btnHTML = Listening.returnTo === 'daily'
    ? `<button class="btn btn-primary" onclick="onDailyModuleComplete('listening')">Back to daily task &#10003;</button>`
    : `<button class="btn btn-primary" onclick="openListening(${ex.id})">Try again</button>
       <button class="btn btn-secondary" onclick="showListeningList()">All exercises</button>`;

  document.getElementById('dictation-result').innerHTML = `
    <div class="dictation-result">
      <h3>&#128196; Transcript comparison &nbsp;<strong style="color:var(--accent)">${pct}%</strong></h3>
      <div style="font-size:15px;line-height:1.9">${diffHTML}</div>
    </div>
    <div class="card" style="text-align:center">
      <div class="score-circle" style="margin:0 auto 16px">
        <span class="big-num">${correct}/${total}</span>
        <span class="small-txt">${pct}%</span>
      </div>
      <p style="color:var(--text-2);margin-bottom:16px">
        ${pct >= 90 ? '&#127775; Perfect dictation!' : pct >= 70 ? '&#128077; Very good!' : '&#128266; Keep practising!'}
      </p>
      <div class="btn-row" style="justify-content:center;gap:12px">${btnHTML}</div>
    </div>`;
}

function revealTranscript() {
  const ex = Listening.current;
  document.getElementById('dictation-input').value = ex.full_text;
  document.getElementById('dictation-input').disabled = true;
  document.getElementById('dictation-submit-btn').style.display = 'none';
  document.getElementById('dictation-result').innerHTML = `
    <div class="instructions-box" style="border-color:var(--success);color:var(--success)">
      &#128196; Transcript shown. Study it, then try again.
    </div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn btn-primary" onclick="openListening(${ex.id})">Try from scratch</button>
    </div>`;
}

function cleanWords(text) {
  return text.toLowerCase().replace(/[.,!?;:'"-]/g,'').trim().split(/\s+/);
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g,'&quot;');
}
