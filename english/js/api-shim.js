/*
 * api-shim.js — backend estático para GitHub Pages.
 * Replica server.js + database.js en el navegador usando localStorage.
 * Intercepta window.fetch para las rutas /api/* (sin tocar el resto del front).
 * El progreso se guarda POR DISPOSITIVO (no se sincroniza entre móvil y PC).
 */
(function () {
  'use strict';

  var KEY = 'english-platform-db';
  var origFetch = window.fetch.bind(window);

  function base() { return { progress: [], userProfile: null, dailySessions: [] }; }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : base();
    } catch (e) { return base(); }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* ── Progress ── */
  function saveProgress(module, exerciseId, correct) {
    var data = load();
    data.progress.push({
      module: module,
      exercise_id: exerciseId,
      correct: correct ? 1 : 0,
      completed_at: new Date().toISOString()
    });
    save(data);
  }

  function getStreak(progress) {
    var days = Object.keys(progress.reduce(function (acc, p) {
      acc[p.completed_at.split('T')[0]] = true; return acc;
    }, {})).sort().reverse();
    if (days.length === 0) return 0;
    var streak = 0;
    for (var i = 0; i < days.length; i++) {
      var expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (days[i] === expected.toISOString().split('T')[0]) streak++;
      else break;
    }
    return streak;
  }

  function getStats() {
    var progress = load().progress;
    var total = progress.length;
    var correct = progress.filter(function (p) { return p.correct; }).length;

    var modMap = {};
    progress.forEach(function (p) {
      if (!modMap[p.module]) modMap[p.module] = { total: 0, correct: 0 };
      modMap[p.module].total++;
      if (p.correct) modMap[p.module].correct++;
    });
    var byModule = Object.keys(modMap).map(function (module) {
      var v = modMap[module];
      return {
        module: module,
        total: v.total,
        correct_count: v.correct,
        accuracy: Math.round((v.correct / v.total) * 100)
      };
    });

    var recent = progress.slice().reverse().slice(0, 15);

    return {
      total: total,
      correct: correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      byModule: byModule,
      recent: recent,
      streak: getStreak(progress)
    };
  }

  function getModuleHistory(module) {
    return load().progress.filter(function (p) { return p.module === module; })
      .reverse().slice(0, 50);
  }

  /* ── User profile ── */
  function getUserProfile() { return load().userProfile || null; }

  function saveUserProfile(level) {
    var data = load();
    data.userProfile = { level: level, assessedAt: new Date().toISOString() };
    save(data);
  }

  /* ── Daily sessions ── */
  function getTodaySession(date) {
    var sessions = load().dailySessions || [];
    return sessions.filter(function (s) { return s.date === date; })[0] || null;
  }

  function createOrUpdateSession(date, updates) {
    var data = load();
    if (!data.dailySessions) data.dailySessions = [];
    var idx = -1;
    for (var i = 0; i < data.dailySessions.length; i++) {
      if (data.dailySessions[i].date === date) { idx = i; break; }
    }
    if (idx >= 0) {
      data.dailySessions[idx] = Object.assign({}, data.dailySessions[idx], updates);
    } else {
      data.dailySessions.push(Object.assign({
        date: date,
        grammarComplete: false,
        readingComplete: false,
        listeningComplete: false,
        completedAt: null,
        startedAt: new Date().toISOString()
      }, updates));
    }
    save(data);
    return data.dailySessions.filter(function (s) { return s.date === date; })[0];
  }

  /* ── Exercises (servidos desde el JSON estático bundleado) ── */
  var exercisesCache = null;
  function getExercises() {
    if (exercisesCache) return Promise.resolve(exercisesCache);
    return origFetch('data/exercises.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { exercisesCache = d; return d; });
  }

  /* ── Helpers de respuesta ── */
  function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /* ── Router ── */
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path;
    try { path = new URL(url, location.href).pathname; } catch (e) { path = String(url); }

    var idx = path.indexOf('/api/');
    if (idx === -1) return origFetch(input, init);

    var route = path.slice(idx);
    var method = ((init && init.method) ||
                  (typeof input === 'object' && input && input.method) || 'GET').toUpperCase();
    var body = {};
    if (init && init.body) { try { body = JSON.parse(init.body); } catch (e) { body = {}; } }

    var m;

    if ((m = route.match(/^\/api\/exercises\/(.+)$/)) && method === 'GET') {
      var key = decodeURIComponent(m[1]);
      return getExercises().then(function (ex) {
        if (!ex[key]) return jsonResponse({ error: 'Module not found' }, 404);
        return jsonResponse(ex[key]);
      });
    }
    if (route === '/api/progress' && method === 'POST') {
      saveProgress(body.module, body.exerciseId, body.correct);
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    if (route === '/api/stats' && method === 'GET') {
      return Promise.resolve(jsonResponse(getStats()));
    }
    if ((m = route.match(/^\/api\/history\/(.+)$/)) && method === 'GET') {
      return Promise.resolve(jsonResponse(getModuleHistory(decodeURIComponent(m[1]))));
    }
    if (route === '/api/profile' && method === 'GET') {
      return Promise.resolve(jsonResponse(getUserProfile()));
    }
    if (route === '/api/profile' && method === 'POST') {
      saveUserProfile(body.level);
      return Promise.resolve(jsonResponse({ ok: true, level: body.level }));
    }
    if ((m = route.match(/^\/api\/daily\/(.+)$/)) && method === 'GET') {
      return Promise.resolve(jsonResponse(getTodaySession(decodeURIComponent(m[1]))));
    }
    if ((m = route.match(/^\/api\/daily\/(.+)$/)) && method === 'POST') {
      return Promise.resolve(jsonResponse(createOrUpdateSession(decodeURIComponent(m[1]), body)));
    }

    return Promise.resolve(jsonResponse({ error: 'Not found' }, 404));
  };
})();
