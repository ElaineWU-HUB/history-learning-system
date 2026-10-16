/* ============================================================
 * 测验引擎：逐题作答、即时判分、答案解析、成绩记录
 * 用法：HC.quiz.start(containerElement, unitId)
 * ============================================================ */
(function () {
  window.HC = window.HC || {};
  var esc = HC.esc;

  HC.quiz = {
    start: function (container, unitId) {
      var unit = HC.getUnit(unitId);
      if (!unit || !unit.quiz || !unit.quiz.length) {
        container.innerHTML = '<p class="empty-note">本单元测验内容完善中，敬请期待。</p>';
        return;
      }
      var Q = unit.quiz;
      var idx = 0, answers = [], finished = false;

      function render() {
        if (finished) { renderResult(); return; }
        var q = Q[idx];
        var answered = answers[idx] !== undefined;
        var html =
          '<div class="quiz-box">' +
            '<div class="quiz-head">' +
              '<span class="quiz-counter">第 ' + (idx + 1) + ' / ' + Q.length + ' 题</span>' +
              '<span class="quiz-unit">' + esc(unit.title) + ' · 单元测验</span>' +
            '</div>' +
            '<div class="quiz-q">' + esc(q.q) + '</div>' +
            '<div class="quiz-options">' +
              q.options.map(function (opt, i) {
                var cls = 'quiz-option';
                if (answered) {
                  if (i === q.answer) cls += ' correct';
                  else if (i === answers[idx]) cls += ' wrong';
                  else cls += ' dim';
                }
                return '<button class="' + cls + '" data-opt="' + i + '"' + (answered ? ' disabled' : '') + '>' +
                  String.fromCharCode(65 + i) + '. ' + esc(opt) + '</button>';
              }).join('') +
            '</div>' +
            (answered ?
              '<div class="quiz-explain ' + (answers[idx] === q.answer ? 'ok' : 'no') + '">' +
                '<strong>' + (answers[idx] === q.answer ? '✓ 回答正确' : '✗ 回答错误') + '</strong>' +
                '<span>' + esc(q.explain) + '</span>' +
              '</div>' +
              '<div class="quiz-nav">' +
                '<button class="btn" id="quiz-prev"' + (idx === 0 ? ' disabled' : '') + '>上一题</button>' +
                (idx < Q.length - 1
                  ? '<button class="btn btn-primary" id="quiz-next">下一题</button>'
                  : '<button class="btn btn-primary" id="quiz-finish">查看成绩</button>') +
              '</div>'
            : '') +
          '</div>';
        container.innerHTML = html;

        var prev = container.querySelector('#quiz-prev');
        if (prev) prev.onclick = function () { idx--; render(); };
        var nxt = container.querySelector('#quiz-next');
        if (nxt) nxt.onclick = function () { idx++; render(); };
        var fin = container.querySelector('#quiz-finish');
        if (fin) fin.onclick = function () { finished = true; render(); };
      }

      container.onclick = function (ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest('.quiz-option') : null;
        if (!t || t.disabled) return;
        answers[idx] = parseInt(t.getAttribute('data-opt'), 10);
        render();
      };

      function renderResult() {
        var score = 0;
        answers.forEach(function (a, i) { if (a === Q[i].answer) score++; });
        HC.store.recordQuiz(unitId, score, Q.length);
        var pct = Math.round(score / Q.length * 100);
        var comment = pct === 100 ? '满分！本单元掌握得非常扎实。'
          : pct >= 80 ? '很好！继续保持这个节奏。'
          : pct >= 60 ? '基本掌握，建议回顾错题对应的小节。'
          : '建议回到课程中复习本单元要点，再挑战一次。';
        var best = HC.store.quizEntry(unitId).quizBest;
        var wrong = [];
        answers.forEach(function (a, i) { if (a !== Q[i].answer) wrong.push(i); });

        container.innerHTML =
          '<div class="quiz-result">' +
            '<div class="qr-score">' + score + '<span> / ' + Q.length + '</span></div>' +
            '<div class="qr-comment">' + comment + '</div>' +
            '<div class="qr-meta">最佳成绩：' + (best ? best.score + '/' + best.total : '—') +
              ' · 已作答 ' + HC.store.quizEntry(unitId).attempts + ' 次</div>' +
            (wrong.length ?
              '<h3 class="qr-h">错题回顾</h3>' +
              wrong.map(function (i) {
                return '<div class="qr-wrong">' +
                  '<div class="qr-wq">' + esc(Q[i].q) + '</div>' +
                  '<div class="qr-wa">正确答案：' + esc(Q[i].options[Q[i].answer]) + '</div>' +
                  '<div class="qr-we">' + esc(Q[i].explain) + '</div>' +
                '</div>';
              }).join('')
            : '<div class="qr-perfect">全部答对，没有错题！</div>') +
            '<div class="quiz-nav">' +
              '<a class="btn" href="#/unit/' + unitId + '">返回单元</a>' +
              '<button class="btn btn-primary" id="quiz-retry">再测一次</button>' +
            '</div>' +
          '</div>';
        container.querySelector('#quiz-retry').onclick = function () {
          idx = 0; answers = []; finished = false; render();
        };
        if (HC.app && HC.app.refreshHeader) HC.app.refreshHeader();
      }

      render();
    }
  };
})();
