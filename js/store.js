/* ============================================================
 * 学习进度存储：localStorage 封装
 * 键：hl.progress.v1
 * ============================================================ */
(function () {
  window.HC = window.HC || {};

  // HTML 转义（供全站复用）
  HC.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var KEY = 'hl.progress.v1';

  function defaults() {
    return { units: {}, lastVisited: null, trackMode: 'parallel', startedAt: new Date().toISOString() };
  }

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (!d || typeof d !== 'object' || !d.units) return defaults();
      if (d.trackMode !== 'china' && d.trackMode !== 'world') d.trackMode = 'parallel';
      return d;
    } catch (e) { return defaults(); }
  }

  var state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 存储异常时静默降级 */ }
  }

  function entry(id) {
    if (!state.units[id]) {
      state.units[id] = { lessonsDone: [], quizBest: null, quizLast: null, attempts: 0 };
    }
    return state.units[id];
  }

  HC.store = {
    state: state,

    // —— 课程完成状态 ——
    isLessonDone: function (unitId, lessonIdx) {
      return entry(unitId).lessonsDone.indexOf(lessonIdx) >= 0;
    },
    toggleLesson: function (unitId, lessonIdx) {
      var e = entry(unitId);
      var i = e.lessonsDone.indexOf(lessonIdx);
      if (i >= 0) e.lessonsDone.splice(i, 1); else e.lessonsDone.push(lessonIdx);
      save();
    },
    lessonDoneCount: function (unitId) {
      return entry(unitId).lessonsDone.length;
    },

    // —— 测验成绩 ——
    recordQuiz: function (unitId, score, total) {
      var e = entry(unitId);
      e.quizLast = { score: score, total: total, at: new Date().toISOString() };
      if (!e.quizBest || score > e.quizBest.score) e.quizBest = { score: score, total: total };
      e.attempts = (e.attempts || 0) + 1;
      save();
    },
    quizEntry: function (unitId) { return entry(unitId); },

    // —— 单元状态 ——
    unitStatus: function (unit) {
      if (unit.status === 'outline') return 'outline';
      var e = entry(unit.id);
      if (e.lessonsDone.length >= unit.lessons.length) return 'done';
      if (e.lessonsDone.length > 0) return 'doing';
      return 'new';
    },

    // —— 总进度（只统计完整成课的单元；测验已移除，进度 = 已读课程占比）——
    overallProgress: function () {
      var lessonsDone = 0, lessonsTotal = 0, sum = 0, total = 0;
      HC.curriculum.units.forEach(function (meta) {
        var u = HC.units[meta.id];
        if (!u || u.status !== 'complete') return;
        var e = entry(meta.id);
        var lp = u.lessons.length ? e.lessonsDone.length / u.lessons.length : 1;
        sum += lp;
        total += 1;
        lessonsDone += e.lessonsDone.length;
        lessonsTotal += u.lessons.length;
      });
      return {
        pct: total ? Math.round(sum / total * 100) : 0,
        lessonsDone: lessonsDone,
        lessonsTotal: lessonsTotal
      };
    },

    // —— 上次学习位置 ——
    lastVisited: {
      get: function () { return state.lastVisited; },
      set: function (unitId, lessonIdx) {
        state.lastVisited = { unit: unitId, lesson: (lessonIdx === undefined ? null : lessonIdx) };
        save();
      }
    },

    // —— 学习路线模式 ——
    trackMode: {
      get: function () { return state.trackMode || 'parallel'; },
      set: function (m) { state.trackMode = m; save(); }
    },

    // —— 备份与恢复 ——
    exportData: function () {
      return JSON.stringify({ app: 'history-learning', version: 1, exportedAt: new Date().toISOString(), progress: state }, null, 2);
    },
    importData: function (text) {
      var d = JSON.parse(text);
      if (!d || !d.progress || !d.progress.units) throw new Error('数据格式不正确');
      state.units = d.progress.units;
      state.lastVisited = d.progress.lastVisited || null;
      state.trackMode = (d.progress.trackMode === 'china' || d.progress.trackMode === 'world') ? d.progress.trackMode : 'parallel';
      save();
    },
    reset: function () {
      var fresh = defaults();
      fresh.startedAt = state.startedAt;
      state.units = fresh.units;
      state.lastVisited = fresh.lastVisited;
      state.trackMode = 'parallel';
      save();
    }
  };
})();
