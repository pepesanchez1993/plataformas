/* ── Global helpers ── */
async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function saveProgress(module, exerciseId, correct) {
  await apiPost('/api/progress', { module, exerciseId, correct });
}

/* ── Navigation ── */
function navigate(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.add('active');

  const btn = document.querySelector(`.nav-btn[data-section="${section}"]`);
  if (btn) btn.classList.add('active');

  if (section === 'dashboard') loadDashboard();
  else if (section === 'daily')     initDaily();
  else if (section === 'grammar')   { /* initGrammar called from caller */ }
  else if (section === 'reading')   { /* initReading called from caller */ }
  else if (section === 'listening') { /* initListening called from caller */ }
}

function updateSidebarLevel(level) {
  const el = document.getElementById('sidebar-level');
  el.style.display = 'flex';
  el.innerHTML = `<span class="level-badge level-${level}" style="margin:0 auto">${level}</span>`;
  document.getElementById('retake-btn').style.display = 'flex';
}

/* ── Dashboard ── */
async function loadDashboard() {
  try {
    const stats = await apiGet('/api/stats');
    document.getElementById('sidebar-streak').textContent = stats.streak;

    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const badgeEl = document.getElementById('header-streak-badge');
    if (stats.streak > 0) {
      badgeEl.innerHTML = `
        <span style="font-size:22px">&#128293;</span>
        <span style="font-weight:700;font-size:18px;color:#f59e0b">${stats.streak}</span>
        <span style="font-size:13px;color:var(--text-2)">day streak</span>`;
      badgeEl.style.cssText = 'display:flex;align-items:center;gap:6px;';
    }

    document.getElementById('stat-total').textContent    = stats.total;
    document.getElementById('stat-correct').textContent  = stats.correct;
    document.getElementById('stat-accuracy').textContent = stats.total > 0 ? `${stats.accuracy}%` : '—';

    const modMap = {};
    (stats.byModule || []).forEach(m => { modMap[m.module] = m; });
    ['grammar','reading','listening'].forEach(mod => {
      const el = document.getElementById(`mod-${mod}`);
      el.textContent = modMap[mod] ? `${modMap[mod].accuracy}%` : 'Start';
    });

    const activityEl = document.getElementById('activity-list');
    if (stats.recent && stats.recent.length > 0) {
      activityEl.innerHTML = stats.recent.map(item => {
        const label  = item.module.charAt(0).toUpperCase() + item.module.slice(1);
        const time   = new Date(item.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dotCls = item.correct ? 'correct' : 'wrong';
        const result = item.correct ? '&#10003; Correct' : '&#10007; Wrong';
        return `<div class="activity-item">
          <span class="activity-dot ${dotCls}"></span>
          <span><strong>${label}</strong> &mdash; ${result}</span>
          <span class="activity-time">${time}</span>
        </div>`;
      }).join('');
    } else {
      activityEl.innerHTML = '<p class="empty-state">No activity yet. Start a daily task to track your progress.</p>';
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Wire nav buttons
  document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      navigate(sec);
      if (sec === 'grammar')   initGrammar();
      else if (sec === 'reading')   initReading();
      else if (sec === 'listening') initListening();
    });
  });

  // Wire module cards on dashboard
  document.querySelectorAll('.module-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => {
      const sec = card.dataset.goto;
      navigate(sec);
      if (sec === 'grammar')   initGrammar();
      else if (sec === 'reading')   initReading();
      else if (sec === 'listening') initListening();
    });
  });

  // Check for saved profile
  const profile = await apiGet('/api/profile');
  if (profile) {
    updateSidebarLevel(profile.level);
    navigate('daily');   // start at daily task if level is known
  } else {
    showAssessment(false); // first-time: run the test
  }

  loadDashboard();
});
