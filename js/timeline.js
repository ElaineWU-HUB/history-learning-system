/* ============================================================
 * 中外对照时间轴：三轨（中国史 / 世界史 / 对照专题）、
 * 缩放（滚轮 + 按钮）、按单元过滤、点击查看详情
 * 用法：HC.timeline.render(containerElement)
 * ============================================================ */
(function () {
  window.HC = window.HC || {};
  var esc = HC.esc;

  var ZOOM_MIN = 0.25, ZOOM_MAX = 40;

  function parseYear(s) {
    s = String(s).trim();
    var neg = s.indexOf('前') >= 0;
    var m = s.match(/(\d+)/);
    if (!m) return null;
    var y = parseInt(m[1], 10);
    return neg ? -y : y;
  }

  function niceStep(raw) {
    var steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (var i = 0; i < steps.length; i++) if (steps[i] >= raw) return steps[i];
    return 100000;
  }

  function fmtYear(y) {
    return y < 0 ? '前' + (-y) : String(y);
  }

  function labelWidth(title, rawYear) {
    var chars = String(title).length + String(rawYear).length * 0.6;
    return Math.min(Math.max(chars * 13 + 20, 44), 260);
  }

  HC.timeline = {
    render: function (container) {
      // —— 收集全部事件 ——
      var allEvents = [];
      HC.curriculum.units.forEach(function (meta) {
        var u = HC.units[meta.id];
        if (!u || !u.events) return;
        u.events.forEach(function (ev) {
          allEvents.push({
            year: parseYear(ev.year), rawYear: ev.year, title: ev.title,
            blurb: ev.blurb || '', detail: ev.detail || '',
            sourceId: u.id, sourceTitle: u.title, track: u.track,
            legend: ev.legend === true
          });
        });
      });
      HC.curriculum.topics.forEach(function (meta) {
        var t = HC.topics[meta.id];
        if (!t || !t.events) return;
        t.events.forEach(function (ev) {
          allEvents.push({
            year: parseYear(ev.year), rawYear: ev.year, title: ev.title,
            blurb: ev.blurb || '', detail: ev.detail || '',
            sourceId: t.id, sourceTitle: t.title, track: 'topic',
            legend: ev.legend === true
          });
        });
      });
      allEvents = allEvents.filter(function (e) { return e.year !== null; });

      var state = { filter: 'all', zoom: 1, center: null, selected: null };

      // —— 页面骨架 ——
      container.innerHTML =
        '<div class="tl">' +
          '<div class="tl-toolbar">' +
            '<select id="tlFilter"><option value="all">全部事件（' + allEvents.length + '）</option>' + optgroupHtml('china') + optgroupHtml('world') + optgroupHtml('topic') + '</select>' +
            '<button class="btn" id="tlOut" title="缩小">−</button>' +
            '<button class="btn" id="tlIn" title="放大">＋</button>' +
            '<button class="btn" id="tlFit">复位</button>' +
            '<span class="tl-yearchip" id="tlYearChip"></span>' +
            '<span class="tl-hint">滚轮或按钮缩放 · 悬停看年份 · 点击事件查看详情</span>' +
          '</div>' +
          '<div class="tl-rod"></div>' +
          '<div class="tl-canvas" id="tlCanvas"></div>' +
          '<div class="tl-rod"></div>' +
          '<div class="tl-detail" id="tlDetail"></div>' +
        '</div>';

      var canvasEl = container.querySelector('#tlCanvas');
      var detailEl = container.querySelector('#tlDetail');

      function optgroupHtml(track) {
        var label = track === 'china' ? '中国史' : track === 'world' ? '世界史' : '对照专题';
        var opts = '';
        HC.curriculum.units.forEach(function (meta) {
          var u = HC.units[meta.id];
          if (u && u.track === track && u.events && u.events.length) {
            opts += '<option value="' + meta.id + '">' + esc(u.title) + '</option>';
          }
        });
        if (track === 'topic') {
          HC.curriculum.topics.forEach(function (meta) {
            var t = HC.topics[meta.id];
            if (t && t.events && t.events.length) {
              opts += '<option value="' + meta.id + '">' + esc(t.title) + '</option>';
            }
          });
        }
        return opts ? '<optgroup label="' + label + '">' + opts + '</optgroup>' : '';
      }

      function filtered() {
        return state.filter === 'all' ? allEvents : allEvents.filter(function (e) { return e.sourceId === state.filter; });
      }

      function geom(evs) {
        var w = canvasEl.clientWidth - 32;
        if (!w || w < 300) w = 900;
        var years = evs.map(function (e) { return e.year; });
        var min = Math.min.apply(null, years);
        var max = Math.max.apply(null, years);
        if (max - min < 500) { var mid = (min + max) / 2; min = mid - 250; max = mid + 250; }
        return { w: w, min: min, max: max, span: max - min, pxPerYear: w / (max - min) * state.zoom, pad: 60 };
      }

      var MAX_LABEL_ROWS = 3; // 每条轨道最多 3 行标签，更密集的事件折叠为圆点（放大后展开）

      function draw() {
        var evs = filtered();
        if (!evs.length) {
          canvasEl.innerHTML = '<div class="tl-empty">该范围暂无事件</div>';
          detailEl.innerHTML = '';
          return;
        }
        var g = geom(evs);
        if (state.center === null || state.center < g.min || state.center > g.max) state.center = (g.min + g.max) / 2;
        var innerW = Math.round(g.span * g.pxPerYear) + g.pad * 2;

        function x(y) { return g.pad + (y - g.min) * g.pxPerYear; }

        // 刻度：网格线（三条轨道共享一层）+ 年代标签
        var step = niceStep(140 / g.pxPerYear);
        var labelEvery = Math.max(1, Math.round(220 / (step * g.pxPerYear)));
        var gridLines = '';
        var axisLabels = '';
        for (var i = Math.ceil(g.min / step); i * step <= g.max + 1e-6; i++) {
          var y = i * step;
          var gx = x(y);
          gridLines += '<div class="tl-grid" style="left:' + gx + 'px"></div>';
          if (i % labelEvery === 0) {
            axisLabels += '<div class="tl-grid-label" style="left:' + (gx + 4) + 'px">' + fmtYear(y) + '</div>';
          }
        }
        if (g.min < 0 && g.max > 0) {
          gridLines += '<div class="tl-now" style="left:' + x(0) + 'px"></div>';
          axisLabels += '<div class="tl-grid-label tl-now-label" style="left:' + (x(0) + 4) + 'px">公元</div>';
        }

        // 三条轨道
        var lanes = [
          { key: 'china', label: '中国史' },
          { key: 'world', label: '世界史' },
          { key: 'topic', label: '对照专题' }
        ];
        var bodyHtml = '';
        lanes.forEach(function (lane) {
          var laneEvs = evs.filter(function (e) { return e.track === lane.key; }).sort(function (a, b) { return a.year - b.year; });
          if (!laneEvs.length) return;
          // 贪心分行，避免标签重叠；超过行数上限的折叠为圆点
          var rows = [];
          laneEvs.forEach(function (e) {
            var lx = x(e.year);
            var lw = labelWidth(e.title, e.rawYear) + (e.legend ? 30 : 0);
            var r = 0;
            while (rows[r] !== undefined && rows[r] > lx - 6) r++;
            rows[r] = lx + lw;
            e._row = r;
          });
          var rowsUsed = Math.min(rows.length, MAX_LABEL_ROWS);
          var folded = laneEvs.filter(function (e) { return e._row >= MAX_LABEL_ROWS; });
          var dotStrip = folded.length ? 20 : 0;
          var laneH = rowsUsed * 36 + 22 + dotStrip;
          var bands = '';
          for (var b = 1; b < rowsUsed; b += 2) {
            bands += '<div class="tl-rowband" style="top:' + (b * 36) + 'px; height:36px"></div>';
          }
          bodyHtml +=
            '<div class="tl-lane tl-' + lane.key + '">' +
              '<div class="tl-lane-head"><span class="tl-lane-tag">' + lane.label + '</span><span class="tl-lane-count">' + laneEvs.length + ' 个事件' + (folded.length ? '（' + folded.length + ' 个折叠为圆点，放大可展开）' : '') + '</span></div>' +
              '<div class="tl-lane-body" style="height:' + laneH + 'px">' +
                bands +
                laneEvs.map(function (e) {
                  var foldedItem = e._row >= MAX_LABEL_ROWS;
                  if (foldedItem) {
                    return '<div class="tl-item it-' + lane.key + ' dot-only' + (state.selected === e ? ' selected' : '') + '" data-ei="' + evs.indexOf(e) + '" title="' + esc(e.title) + ' · ' + esc(e.rawYear) + '" style="left:' + x(e.year) + 'px; top:' + (rowsUsed * 36 + 4) + 'px; width:12px; height:12px">' +
                      '<span class="tl-dot"></span>' +
                    '</div>';
                  }
                  var lw = labelWidth(e.title, e.rawYear) + (e.legend ? 30 : 0);
                  return '<div class="tl-item it-' + lane.key + (state.selected === e ? ' selected' : '') + '" data-ei="' + evs.indexOf(e) + '" style="left:' + x(e.year) + 'px; top:' + (e._row * 36) + 'px; width:' + lw + 'px; height:34px">' +
                    '<span class="tl-dot"></span>' +
                    '<span class="tl-label">' + esc(e.title) + (e.legend ? '<span class="tl-leg">传说</span>' : '') + '<small>' + esc(e.rawYear) + '</small></span>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>';
        });

        canvasEl.innerHTML =
          '<div class="tl-inner" style="width:' + innerW + 'px">' +
            '<div class="tl-grid-layer">' + gridLines + '</div>' +
            '<div class="tl-cross" id="tlCross"></div>' +
            '<div class="tl-axis">' + axisLabels + '</div>' +
            bodyHtml +
          '</div>';
        canvasEl.scrollLeft = Math.max(0, x(state.center) - canvasEl.clientWidth / 2);
        showDetail(state.selected);
      }

      function showDetail(e) {
        if (!e) {
          detailEl.innerHTML = '<div class="tl-detail-empty">点击上方任意事件查看详情</div>';
          return;
        }
        var link = e.sourceId.charAt(0) === 't' ? '#/topic/' + e.sourceId : '#/unit/' + e.sourceId;
        detailEl.innerHTML =
          '<div class="tl-detail-head">' +
            '<span class="tl-year-badge">' + esc(e.rawYear) + '</span>' +
            (e.legend ? '<span class="tl-leg">传说</span>' : '') +
            '<h3>' + esc(e.title) + '</h3>' +
            '<a class="tl-src" href="' + link + '">' + esc(e.sourceTitle) + ' ↗</a>' +
          '</div>' +
          '<p class="tl-detail-blurb">' + esc(e.blurb) + '</p>' +
          (e.detail ? '<p class="tl-detail-text">' + esc(e.detail) + '</p>' : '');
        if (detailEl.scrollIntoView) detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // —— 交互 ——
      container.querySelector('#tlFilter').onchange = function () {
        state.filter = this.value; state.center = null; state.selected = null; draw();
      };
      container.querySelector('#tlIn').onclick = function () { state.zoom = Math.min(ZOOM_MAX, state.zoom * 1.5); draw(); };
      container.querySelector('#tlOut').onclick = function () { state.zoom = Math.max(ZOOM_MIN, state.zoom / 1.5); draw(); };
      container.querySelector('#tlFit').onclick = function () { state.zoom = 1; state.center = null; draw(); };

      // 悬停：十字准线 + 顶部年份指示（三轨对照阅读）
      canvasEl.addEventListener('mousemove', function (ev) {
        var cross = canvasEl.querySelector('#tlCross');
        var chip = container.querySelector('#tlYearChip');
        if (!cross || !chip) return;
        var g = geom(filtered());
        var rect = canvasEl.getBoundingClientRect();
        var cx = canvasEl.scrollLeft + (ev.clientX - rect.left);
        var year = Math.max(g.min, Math.min(g.max, g.min + (cx - g.pad) / g.pxPerYear));
        cross.style.left = (g.pad + (year - g.min) * g.pxPerYear) + 'px';
        cross.classList.add('show');
        chip.textContent = fmtYear(Math.round(year));
        chip.classList.add('show');
      });
      canvasEl.addEventListener('mouseleave', function () {
        var cross = canvasEl.querySelector('#tlCross');
        var chip = container.querySelector('#tlYearChip');
        if (cross) cross.classList.remove('show');
        if (chip) chip.classList.remove('show');
      });

      canvasEl.addEventListener('wheel', function (ev) {
        ev.preventDefault();
        var g = geom(filtered());
        var rect = canvasEl.getBoundingClientRect();
        var centerX = canvasEl.scrollLeft + (ev.clientX - rect.left);
        state.center = g.min + (centerX - g.pad) / g.pxPerYear;
        state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom * (ev.deltaY < 0 ? 1.25 : 0.8)));
        draw();
      }, { passive: false });

      canvasEl.onclick = function (ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest('.tl-item') : null;
        if (!t) return;
        state.selected = filtered()[parseInt(t.getAttribute('data-ei'), 10)];
        draw();
      };

      // 窗口尺寸变化时重绘（保留缩放与选中状态）
      HC.timeline._active = { canvasEl: canvasEl, draw: draw };
      if (!HC.timeline._rsBound) {
        window.addEventListener('resize', function () {
          if (HC.timeline._active && document.body.contains(HC.timeline._active.canvasEl)) HC.timeline._active.draw();
        });
        HC.timeline._rsBound = true;
      }

      draw();
    }
  };
})();
