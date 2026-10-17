/* ============================================================
 * 应用主逻辑：hash 路由与页面渲染
 * 页面：首页 / 单元页 / 课程页 / 专题页 / 时间轴 / 设置（测验已按用户要求移除）
 * ============================================================ */
(function () {
  window.HC = window.HC || {};
  var esc = HC.esc;

  var STATUS_LABEL = { new: '未开始', doing: '进行中', done: '已完成', outline: '大纲' };

  // 左侧全书目录：各分组展开状态（默认全部展开，可手动收起）
  var snOpen = { china: true, world: true, topic: true };

  HC.app = {
    init: function () {
      window.addEventListener('hashchange', function () { HC.app.route(); });
      window.addEventListener('scroll', function () { HC.app.tocSpy(); }, { passive: true });
      // 左侧全书目录：分组展开收起 / 移动端点击条目后收起抽屉
      var toc = document.getElementById('siteToc');
      if (toc) toc.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest('.sn-gtitle') : null;
        if (btn) {
          snOpen[btn.getAttribute('data-group')] = !snOpen[btn.getAttribute('data-group')];
          renderSiteNav();
          return;
        }
        if (ev.target && ev.target.closest && ev.target.closest('a.sn-item')) {
          document.body.classList.remove('sn-open');
        }
      });
      var tgl = document.getElementById('btnSiteNav');
      if (tgl) tgl.onclick = function () { document.body.classList.toggle('sn-open'); };
      HC.ask.init();
      HC.app.route();
    },

    route: function () {
      var h = location.hash || '#/';
      var container = document.getElementById('app');
      if (!container) return;
      HC.app.refreshHeader();
      markNav(h);
      var m;
      if ((m = h.match(/^#\/unit\/([a-z]\d+)$/))) return HC.app.pageUnit(container, m[1]);
      if ((m = h.match(/^#\/lesson\/([a-z]\d+)\/(\d+)$/))) return HC.app.pageLesson(container, m[1], parseInt(m[2], 10));
      var qm;
      if ((qm = h.match(/^#\/quiz\/([a-z]\d+)$/))) {
        // 测验功能已移除（用户要求），旧链接一律跳回对应单元页
        location.replace('#/unit/' + qm[1]);
        return;
      }
      if ((m = h.match(/^#\/topic\/(t\d+)$/))) return HC.app.pageTopic(container, m[1]);
      if (h === '#/timeline') return HC.timeline.render(container);
      if (h === '#/settings') return HC.app.pageSettings(container);
      return HC.app.pageHome(container);
    },

    refreshHeader: function () {
      var el = document.getElementById('topProgress');
      if (el) el.textContent = HC.store.overallProgress().pct + '%';
      renderSiteNav(location.hash);
    },

    // 课程页左侧目录的滚动跟随（无目录页为空操作）
    tocSpy: function () {
      var toc = document.getElementById('lessonToc');
      if (!toc) return;
      var heads = document.querySelectorAll('.lesson-body h3[id^="sec-"]');
      var cur = 0;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].getBoundingClientRect().top <= 90) cur = i;
      }
      var items = toc.querySelectorAll('.toc-item');
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle('active', j === cur);
      }
    },

    // ================= 首页 =================
    pageHome: function (c) {
      var mode = HC.store.trackMode.get();
      var pro = HC.store.overallProgress();
      var last = HC.store.lastVisited.get();
      var cont;
      if (last && last.unit && HC.getUnit(last.unit)) {
        var lu = HC.getUnit(last.unit);
        var li = last.lesson !== null && last.lesson !== undefined ? last.lesson : 0;
        cont = '<a class="btn btn-primary btn-continue" href="#/lesson/' + last.unit + '/' + li + '">继续学习：' + esc(lu.title) +
          (last.lesson !== null && last.lesson !== undefined ? ' · 第 ' + (last.lesson + 1) + ' 课' : '') + ' →</a>';
      } else {
        cont = '<a class="btn btn-primary btn-continue" href="#/unit/c01">开始学习：' + esc(HC.getUnit('c01').title) + ' →</a>';
      }
      c.innerHTML =
        '<section class="home">' +
          '<div class="hero">' +
            '<h1>历史系统学习平台</h1>' +
            '<p class="hero-sub">中国史 × 世界史 · 24 个单元 · 6 个对照专题 · 系统化的历史学习方法</p>' +
            '<div class="progress-panel">' +
              '<div class="progress-bar"><div class="progress-fill" style="width:' + pro.pct + '%"></div></div>' +
              '<div class="progress-stats">总进度 <strong>' + pro.pct + '%</strong> · 课程 ' + pro.lessonsDone + '/' + pro.lessonsTotal + '</div>' +
            '</div>' +
            '<div class="hero-actions">' + cont + '<a class="btn" href="#/timeline">查看中外对照时间轴</a></div>' +
          '</div>' +
          '<div class="route-map">' + routeHtml(mode) + '</div>' +
        '</section>';
    },

    // ================= 单元页 =================
    pageUnit: function (c, id) {
      var unit = HC.getUnit(id);
      if (!unit) return notFound(c);
      HC.store.lastVisited.set(id, null);
      var st = HC.store.unitStatus(unit);
      var track = HC.getTrack(unit);
      var complete = unit.status === 'complete';

      var lessonsHtml;
      if (complete) {
        lessonsHtml = '<h2>课程</h2><div class="lessons">' + unit.lessons.map(function (l, i) {
          var done = HC.store.isLessonDone(id, i);
          return '<a class="lesson-row' + (done ? ' done' : '') + '" href="#/lesson/' + id + '/' + i + '">' +
            '<span class="l-check">' + (done ? '✓' : (i + 1)) + '</span>' +
            '<span class="l-title">' + esc(l.title) + '</span>' +
            '<span class="l-arrow">→</span></a>';
        }).join('') + '</div>';
      } else {
        lessonsHtml =
          '<div class="outline-note">📖 本单元为「大纲」状态：以下为课程框架与要点提纲，完整课程内容将逐步补充。</div>' +
          '<h2>课程框架</h2><div class="lessons">' + unit.lessons.map(function (l) {
            return '<div class="lesson-row outline"><span class="l-check">◇</span><span class="l-title">' + esc(l.title) + '</span></div>' +
              (l.keyPoints && l.keyPoints.length
                ? '<ul class="l-keypoints">' + l.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>'
                : '');
          }).join('') + '</div>';
      }

      var figuresHtml = unit.figures && unit.figures.length
        ? '<h2>关键人物</h2><div class="figures">' + unit.figures.map(function (f) {
            return '<div class="figure"><div class="f-name">' + esc(f.name) + '</div>' +
              '<div class="f-years">' + esc(f.years || '') + '</div>' +
              '<div class="f-blurb">' + esc(f.blurb || '') + '</div></div>';
          }).join('') + '</div>'
        : '';

      var eventsHtml = unit.events && unit.events.length
        ? '<h2>大事年表</h2><div class="events">' + unit.events.map(function (ev) {
            return '<div class="event-row"><span class="ev-year">' + esc(ev.year) + '</span>' +
              '<div class="ev-body"><div class="ev-title">' + esc(ev.title) + legendBadge(ev) + '</div>' +
              '<div class="ev-blurb">' + esc(ev.blurb || '') + '</div></div></div>';
          }).join('') + '</div><p class="events-more"><a href="#/timeline">在时间轴上查看全部事件 →</a></p>'
        : '';

      var paired = pairedWith(id);
      var pairedHtml = paired.length
        ? '<div class="paired">同组学习循环：' + paired.map(function (pid) {
            var t = pid.charAt(0) === 't' ? HC.getTopic(pid) : HC.getUnit(pid);
            if (!t) return '';
            return '<a href="#/' + (pid.charAt(0) === 't' ? 'topic/' : 'unit/') + pid + '">' + esc(t.title) + '</a>';
          }).join(' · ') + '</div>'
        : '';

      var extraHtml = unit.extra
        ? '<div class="extra-box"><h3>📚 延伸阅读</h3><p>' + esc(unit.extra) + '</p></div>'
        : '';

      c.innerHTML =
        '<section class="unit-page">' +
          breadcrumb([['#/', '首页'], [null, track.name + ' · ' + unit.title]]) +
          '<header class="page-head">' +
            '<h1>' + esc(unit.title) + '</h1>' +
            '<p class="page-meta"><span class="tag tag-' + unit.track + '">' + track.name + '</span>' +
            '<span class="st-badge st-' + st + '">' + STATUS_LABEL[st] + '</span> · ' + esc(unit.period) + '</p>' +
          '</header>' +
          '<div class="overview">' + esc(unit.overview) + '</div>' +
          lessonsHtml +
          figuresHtml +
          eventsHtml +
          pairedHtml +
          extraHtml +
        '</section>';
    },

    // ================= 课程页 =================
    pageLesson: function (c, id, idx) {
      var unit = HC.getUnit(id);
      if (!unit) return notFound(c);
      var lesson = unit.lessons[idx];
      if (!lesson) return notFound(c);
      HC.store.lastVisited.set(id, idx);
      var done = HC.store.isLessonDone(id, idx);
      var track = HC.getTrack(unit);
      var bodyHtml = lesson.body
        ? renderBody(lesson.body)
        : '<div class="outline-note">📖 本课内容完善中，以下为要点提纲。</div>';
      var kpHtml = lesson.keyPoints && lesson.keyPoints.length
        ? '<div class="keypoints"><h3>本课要点</h3><ul>' + lesson.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var prevHtml = idx > 0
        ? '<a class="btn" href="#/lesson/' + id + '/' + (idx - 1) + '">← 上一课</a>'
        : '<a class="btn" href="#/unit/' + id + '">← 返回单元</a>';
      var nextHtml = idx < unit.lessons.length - 1
        ? '<a class="btn btn-primary" href="#/lesson/' + id + '/' + (idx + 1) + '">下一课 →</a>'
        : '<a class="btn btn-primary" href="#/unit/' + id + '">完成本单元 →</a>';
      var toggleHtml = '<button class="btn ' + (done ? 'btn-done' : 'btn-primary') + '" id="btnToggleLesson">' +
        (done ? '✓ 已完成本课（点击取消）' : '标记完成本课') + '</button>';

      c.innerHTML =
        '<section class="lesson-page">' +
          breadcrumb([['#/', '首页'], ['#/unit/' + id, unit.title], [null, lesson.title]]) +
          '<header class="page-head">' +
            '<h1>' + esc(lesson.title) + '</h1>' +
            '<p class="page-meta"><span class="tag tag-' + unit.track + '">' + track.name + '</span> · ' + esc(unit.period) + '</p>' +
          '</header>' +
          '<div class="lesson-wrap">' +
            tocHtml(lesson.body) +
            '<div class="lesson-main">' +
              '<div class="lesson-body">' + bodyHtml + '</div>' +
              kpHtml +
              '<div class="lesson-nav">' + prevHtml + toggleHtml + nextHtml + '</div>' +
              '<p class="lesson-progress-note">本单元课程进度：' + HC.store.lessonDoneCount(id) + ' / ' + unit.lessons.length + ' 课</p>' +
            '</div>' +
          '</div>' +
        '</section>';

      c.querySelector('#btnToggleLesson').onclick = function () {
        HC.store.toggleLesson(id, idx);
        HC.app.route();
      };

      // 目录点击 → 平滑滚动到对应小节
      var toc = c.querySelector('#lessonToc');
      if (toc) {
        toc.onclick = function (ev) {
          var a = ev.target && ev.target.closest ? ev.target.closest('.toc-item') : null;
          if (!a) return;
          ev.preventDefault();
          var el = document.getElementById('sec-' + a.getAttribute('data-sec'));
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        HC.app.tocSpy();
      }
    },

    // ================= 对照专题页 =================
    pageTopic: function (c, id) {
      var t = HC.getTopic(id);
      if (!t) return notFound(c);
      var paired = pairedWith(id);
      var pairedHtml = paired.length
        ? '<div class="paired">本专题配合单元：' + paired.map(function (pid) {
            var u = HC.getUnit(pid);
            if (!u) return '';
            return '<a href="#/unit/' + pid + '">' + esc(u.title) + '</a>';
          }).join(' · ') + '</div>'
        : '';
      var eventsHtml = t.events && t.events.length
        ? '<h2>关键节点</h2><div class="events">' + t.events.map(function (ev) {
            return '<div class="event-row"><span class="ev-year">' + esc(ev.year) + '</span>' +
              '<div class="ev-body"><div class="ev-title">' + esc(ev.title) + legendBadge(ev) + '</div>' +
              '<div class="ev-blurb">' + esc(ev.blurb || '') + '</div></div></div>';
          }).join('') + '</div><p class="events-more"><a href="#/timeline">在时间轴上查看全部事件 →</a></p>'
        : '';

      c.innerHTML =
        '<section class="topic-page">' +
          breadcrumb([['#/', '首页'], [null, t.title]]) +
          '<header class="page-head">' +
            '<h1>' + esc(t.title) + '</h1>' +
            '<p class="page-meta"><span class="tag tag-topic">对照专题</span> · ' + esc(t.period) + '</p>' +
          '</header>' +
          '<div class="overview">' + esc(t.intro) + '</div>' +
          '<div class="topic-cols">' +
            '<div class="topic-col china"><h3>🇨🇳 中国侧</h3><p>' + esc(t.china) + '</p></div>' +
            '<div class="topic-col world"><h3>🌍 世界侧</h3><p>' + esc(t.world) + '</p></div>' +
          '</div>' +
          '<h2>对照要点</h2><ul class="goals compare">' + t.compare.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
          pairedHtml +
          eventsHtml +
        '</section>';
    },

    // ================= 设置页 =================
    pageSettings: function (c) {
      var mode = HC.store.trackMode.get();
      c.innerHTML =
        '<section class="settings-page">' +
          breadcrumb([['#/', '首页'], [null, '设置']]) +
          '<h1>设置</h1>' +
          '<h2>学习路线模式</h2>' +
          '<div class="setting-group">' +
            modeRadio('parallel', '并进对照（推荐）', '中国史与世界史按时代配对推进，每学完一组对照一次', mode) +
            modeRadio('china', '中国史先行', '先学完中国史 12 单元，再学世界史', mode) +
            modeRadio('world', '世界史先行', '先学完世界史 12 单元，再学中国史', mode) +
          '</div>' +
          '<h2>进度备份</h2>' +
          '<div class="setting-group">' +
            '<p class="setting-desc">学习进度保存在本机浏览器中（localStorage）。建议定期导出备份，换浏览器或清理数据后可导入恢复。</p>' +
            '<div class="setting-actions">' +
              '<button class="btn btn-primary" id="btnExport">导出进度 JSON</button>' +
              '<label class="btn">导入进度<input type="file" id="fileImport" accept=".json" style="display:none"></label>' +
              '<button class="btn btn-danger" id="btnReset">重置全部进度</button>' +
            '</div>' +
          '</div>' +
          '<h2>关于</h2>' +
          '<div class="setting-group">' +
            '<p>历史系统学习平台 v' + HC.curriculum.version + '。双主线（中国史/世界史）+ 对照专题的学习体系，课程与中外对照时间轴两大模块。数据全部保存在本机，无需联网。</p>' +
          '</div>' +
        '</section>';

      var radios = c.querySelectorAll('input[name="trackMode"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].onchange = function () {
          HC.store.trackMode.set(this.value);
          // 切回首页，让用户立即看到新路线的排列
          if (location.hash !== '#/') location.hash = '#/';
          else HC.app.route();
        };
      }
      c.querySelector('#btnExport').onclick = function () {
        var blob = new Blob([HC.store.exportData()], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '历史学习进度-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      c.querySelector('#fileImport').onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            HC.store.importData(String(reader.result));
            alert('导入成功，即将刷新。');
            location.reload();
          } catch (err) {
            alert('导入失败：' + err.message);
          }
        };
        reader.readAsText(f);
      };
      c.querySelector('#btnReset').onclick = function () {
        if (confirm('确定要清除全部学习进度吗？此操作不可恢复（建议先导出备份）。')) {
          HC.store.reset();
          HC.app.route();
        }
      };
    }
  };

  // ================= 组件函数 =================

  function markNav(h) {
    var key = 'home';
    if (h === '#/timeline') key = 'timeline';
    else if (h === '#/settings') key = 'settings';
    var links = document.querySelectorAll('.topnav a[data-route]');
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute('data-route') === key;
      links[i].classList.toggle('active', on);
    }
  }

  // 左侧全书目录：中国史 / 世界史 / 对照专题三组，当前所在组自动展开
  function renderSiteNav(h) {
    var nav = document.getElementById('siteToc');
    if (!nav) return;
    h = h || location.hash || '#/';
    var m, curId = null;
    if ((m = h.match(/^#\/(?:unit|lesson|quiz)\/([a-z]\d+)/))) curId = m[1];
    else if ((m = h.match(/^#\/topic\/(t\d+)/))) curId = m[1];
    var curGroup = null;
    if (curId) {
      var curUnit = HC.getUnit(curId);
      curGroup = curId.charAt(0) === 't' ? 'topic' : (curUnit && curUnit.track);
    }
    if (curGroup) snOpen[curGroup] = true;

    function unitItem(u, i) {
      var st = HC.store.unitStatus(u);
      var mark = st === 'done' ? '<span class="sn-tick">✓</span>'
        : st === 'doing' ? '<span class="sn-half">◐</span>'
        : u.status === 'outline' ? '<span class="sn-tag">纲</span>' : '';
      return '<a class="sn-item' + (u.id === curId ? ' active' : '') + '" href="#/unit/' + u.id + '">' +
        '<span class="sn-num">' + (i + 1) + '</span><span class="sn-name">' + esc(u.title) + '</span>' + mark + '</a>';
    }
    function topicItem(t, i) {
      return '<a class="sn-item' + (t.id === curId ? ' active' : '') + '" href="#/topic/' + t.id + '">' +
        '<span class="sn-num">' + (i + 1) + '</span><span class="sn-name">' + esc(t.title) + '</span></a>';
    }
    function groupHtml(key, label, itemsHtml, count) {
      return '<div class="sn-group ' + key + (snOpen[key] ? ' open' : '') + (key === curGroup ? ' cur' : '') + '">' +
        '<button class="sn-gtitle" data-group="' + key + '"><span class="sn-arrow">▸</span>' + label +
        '<span class="sn-count">' + count + '</span></button>' +
        '<div class="sn-items">' + itemsHtml + '</div></div>';
    }

    var china = HC.curriculum.units.filter(function (x) { return x.track === 'china'; })
      .map(function (x, i) { return unitItem(HC.units[x.id], i); }).join('');
    var world = HC.curriculum.units.filter(function (x) { return x.track === 'world'; })
      .map(function (x, i) { return unitItem(HC.units[x.id], i); }).join('');
    var topics = HC.curriculum.topics.map(function (x, i) { return topicItem(HC.topics[x.id], i); }).join('');

    nav.innerHTML =
      groupHtml('china', '中国史', china, 12) +
      groupHtml('world', '世界史', world, 12) +
      groupHtml('topic', '对照专题', topics, 6);
  }

  function legendBadge(ev) {
    return ev.legend ? '<span class="ev-leg">传说</span>' : '';
  }

  function breadcrumb(items) {
    var parts = items.map(function (it) {
      if (it[0] === null) return '<span class="bc-current">' + esc(it[1]) + '</span>';
      return '<a href="' + it[0] + '">' + esc(it[1]) + '</a>';
    });
    return '<nav class="breadcrumb">' + parts.join(' <span class="bc-sep">/</span> ') + '</nav>';
  }

  function unitCard(u) {
    if (!u) return '';
    var st = HC.store.unitStatus(u);
    var track = HC.getTrack(u);
    var meta;
    if (u.status === 'complete') {
      meta = '课程 ' + HC.store.lessonDoneCount(u.id) + '/' + u.lessons.length;
    } else {
      meta = '内容完善中 · 框架已就绪';
    }
    return '<a class="card unit-card card-' + u.track + ' st-' + st + '" href="#/unit/' + u.id + '">' +
      '<div class="card-top"><span class="tag tag-' + u.track + '">' + track.name + '</span><span class="st-badge st-' + st + '">' + STATUS_LABEL[st] + '</span></div>' +
      '<div class="card-title">' + esc(u.title) + '</div>' +
      '<div class="card-period">' + esc(u.period) + '</div>' +
      '<div class="card-meta">' + meta + '</div>' +
    '</a>';
  }

  function topicCard(t) {
    if (!t) return '';
    return '<a class="card topic-card card-topic" href="#/topic/' + t.id + '">' +
      '<div class="card-top"><span class="tag tag-topic">对照专题</span><span class="card-period">' + esc(t.period) + '</span></div>' +
      '<div class="card-title">' + esc(t.title) + '</div>' +
      '<div class="card-meta">' + esc(String(t.intro).slice(0, 60)) + '…</div>' +
    '</a>';
  }

  function routeHtml(mode) {
    if (mode === 'parallel') {
      var groups = HC.curriculum.pairings.map(function (g, gi) {
        var cards = g.map(function (id) {
          return id.charAt(0) === 't' ? topicCard(HC.getTopic(id)) : unitCard(HC.getUnit(id));
        }).join('');
        return '<div class="route-group"><div class="rg-label">第 ' + (gi + 1) + ' 学习循环</div><div class="rg-cards">' + cards + '</div></div>';
      });
      return '<h2>学习路线图（并进对照）</h2>' + groups.join('');
    }
    var secs = '';
    [['china', '中国史（12 单元）'], ['world', '世界史（12 单元）']].forEach(function (p) {
      var cards = HC.curriculum.units.filter(function (m) { return m.track === p[0]; })
        .map(function (m) { return unitCard(HC.units[m.id]); }).join('');
      secs += '<h3 class="route-sec-title">' + p[1] + '</h3><div class="rg-cards">' + cards + '</div>';
    });
    var tcards = HC.curriculum.topics.map(function (m) { return topicCard(HC.topics[m.id]); }).join('');
    secs += '<h3 class="route-sec-title">对照专题（6 个）</h3><div class="rg-cards">' + tcards + '</div>';
    return '<h2>学习路线图（' + (mode === 'china' ? '中国史先行' : '世界史先行') + '）</h2>' + secs;
  }

  function pairedWith(id) {
    for (var i = 0; i < HC.curriculum.pairings.length; i++) {
      var g = HC.curriculum.pairings[i];
      if (g.indexOf(id) >= 0) return g.filter(function (x) { return x !== id; });
    }
    return [];
  }

  function renderBody(body) {
    var secIdx = 0;
    return body.split('\n\n').map(function (p) {
      if (p.indexOf('## ') === 0) {
        // 块格式为 '## 标题\n第一段正文'：标题与首段分开渲染，正文不能吞进 h3
        var nl = p.indexOf('\n');
        var head = nl >= 0 ? p.slice(3, nl) : p.slice(3);
        var rest = nl >= 0 ? p.slice(nl + 1).trim() : '';
        return '<h3 id="sec-' + (secIdx++) + '">' + esc(head) + '</h3>' +
          (rest ? '<p>' + esc(rest).replace(/\n/g, '<br>') + '</p>' : '');
      }
      return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  // 章节目录：提取正文的 ## 小节标题（少于 2 节时不显示）
  function tocHtml(body) {
    if (!body) return '';
    var secs = body.split('\n\n').filter(function (p) { return p.indexOf('## ') === 0; }).map(function (p) {
      var nl = p.indexOf('\n');
      return p.slice(3, nl >= 0 ? nl : p.length);
    });
    if (secs.length < 2) return '';
    return '<nav class="lesson-toc" id="lessonToc"><div class="toc-title">本课目录</div>' +
      secs.map(function (s, i) {
        return '<a class="toc-item" data-sec="' + i + '" href="javascript:void(0)">' + esc(s) + '</a>';
      }).join('') +
      '</nav>';
  }

  function modeRadio(val, label, desc, cur) {
    return '<label class="mode-radio' + (val === cur ? ' active' : '') + '">' +
      '<input type="radio" name="trackMode" value="' + val + '"' + (val === cur ? ' checked' : '') + '>' +
      '<strong>' + label + '</strong><span>' + desc + '</span></label>';
  }

  function notFound(c) {
    c.innerHTML = '<section class="notfound"><h1>页面不存在</h1><p>链接可能已失效。</p><a class="btn" href="#/">返回首页</a></section>';
  }

  /* ============================================================
   * 本机 AI 提问浮窗：页面里直接问，答案来自本机提问服务
   * （ask-server，launchd 按需启动；仅 file:// 本机打开时显示）
   * ============================================================ */
  HC.ask = {
    ASK_URL: 'http://127.0.0.1:3457/ask',

    init: function () {
      if (location.protocol !== 'file:') return; // 线上分享版不显示（无本机服务）
      var fab = document.getElementById('btnAsk');
      var panel = document.getElementById('askPanel');
      if (!fab || !panel) return;
      fab.classList.remove('hidden');
      fab.onclick = function () {
        var open = !panel.classList.contains('open');
        panel.classList.toggle('open', open);
        if (open) setTimeout(function () { document.getElementById('askInput').focus(); }, 60);
      };
      document.getElementById('btnAskClose').onclick = function () { panel.classList.remove('open'); };
      document.getElementById('btnAskSend').onclick = function () { HC.ask.send(); };
      document.getElementById('askInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') HC.ask.send();
      });
    },

    // 收集当前页面上下文，让回答衔接阅读位置
    contextOf: function () {
      var h = location.hash || '';
      var m;
      if ((m = h.match(/^#\/lesson\/([a-z]\d+)\/(\d+)$/))) {
        var u = HC.getUnit(m[1]);
        var ls = u && u.lessons && u.lessons[parseInt(m[2], 10)];
        if (!u || !ls) return '';
        var kp = ls.keyPoints && ls.keyPoints.length ? '本课要点：' + ls.keyPoints.join('；') : '';
        return '用户正在阅读：' + HC.getTrack(u).name + ' ' + m[1] + '《' + u.title + '》' +
          '第' + (parseInt(m[2], 10) + 1) + '课《' + ls.title + '》。' + kp;
      }
      if ((m = h.match(/^#\/unit\/([a-z]\d+)$/))) {
        var uu = HC.getUnit(m[1]);
        return '用户正在浏览：单元页 ' + m[1] + '《' + uu.title + '》（时期：' + uu.period + '）。';
      }
      if ((m = h.match(/^#\/topic\/(t\d+)$/))) {
        var t = HC.getTopic(m[1]);
        return t ? '用户正在浏览：中外对照专题《' + t.title + '》。' : '';
      }
      return '';
    },

    send: function () {
      var input = document.getElementById('askInput');
      var q = input.value.trim();
      if (!q) return;
      var self = this;
      this.addMsg('user', q);
      input.value = '';
      var waiting = this.addMsg('sys', '正在思考……', 'thinking');
      fetch(this.ASK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: this.contextOf() })
      }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        return r.json();
      }).then(function (d) {
        waiting.remove();
        if (d.answer) self.addMsg('ai', d.answer);
        else self.addMsg('sys', '没有收到回答：' + (d.error || '未知错误'));
      }).catch(function () {
        waiting.remove();
        self.addMsg('sys', '提问服务未启动。这是本机功能：请确认当前是通过 file:// 打开的本地页面。');
      });
    },

    // 简单 markdown-lite：**加粗** + 换行（内容来自本机服务，可信）
    addMsg: function (who, text, cls) {
      var body = document.getElementById('askBody');
      var div = document.createElement('div');
      div.className = 'ask-msg ' + who + (cls ? ' ' + cls : '');
      if (who === 'ai') {
        div.innerHTML = esc(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
      } else {
        div.textContent = text;
      }
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }
  };
})();
