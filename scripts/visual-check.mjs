/* 程序化视觉检查：布局指标 + 渲染文本抽查（不依赖人眼看截图） */
import { chromium } from 'playwright-core';

const url = 'file://' + encodeURI('/Users/wf/历史学习系统/index.html');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let issues = 0;

function check(name, cond, detail) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (detail ? ' — ' + detail : ''));
  if (!cond) issues++;
}

// —— 首页 ——
await page.goto(url);
await page.waitForSelector('.route-group');
{
  const m = await page.evaluate(() => ({
    innerW: window.innerWidth,
    bodyScrollW: document.body.scrollWidth,
    groups: document.querySelectorAll('.route-group').length,
    firstCardTitle: document.querySelector('.card-title')?.textContent,
    firstCardBox: (() => { const r = document.querySelector('.card')?.getBoundingClientRect(); return r ? { w: r.width, h: r.height } : null; })(),
  }));
  check('首页无横向溢出', m.bodyScrollW <= m.innerW, 'body ' + m.bodyScrollW + ' vs 视口 ' + m.innerW);
  check('12 个学习循环分组', m.groups === 12, String(m.groups));
  check('卡片尺寸正常', m.firstCardBox && m.firstCardBox.w > 200 && m.firstCardBox.h > 80, JSON.stringify(m.firstCardBox));
  check('卡片标题正常', m.firstCardTitle && m.firstCardTitle.includes('文明曙光'), m.firstCardTitle);
}

// —— 左侧全书目录 ——
{
  const m = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    return {
      nav: !!nav,
      groups: document.querySelectorAll('.sn-group').length,
      items: document.querySelectorAll('.sn-item').length,
      sticky: nav ? getComputedStyle(nav).position : null,
    };
  });
  check('左侧全书目录渲染（3 组 30 项）', m.nav && m.groups === 3 && m.items === 30, `组${m.groups} 项${m.items}`);
  check('目录栏随滚动固定', m.sticky === 'sticky', m.sticky);
  const allOpen = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.sn-group')];
    return groups.length === 3 && groups.every(g => g.classList.contains('open'));
  });
  check('目录三组默认全部展开', allOpen);
  const snBox = await page.evaluate(() => {
    const r = document.querySelector('.site-nav').getBoundingClientRect();
    const singleLine = [...document.querySelectorAll('.sn-item')].every(i => i.getBoundingClientRect().height < 30);
    return { left: Math.round(r.left), w: Math.round(r.width), singleLine };
  });
  check('目录贴靠左侧且加宽、条目单行显示', snBox.left < 40 && snBox.w >= 250 && snBox.singleLine, JSON.stringify(snBox));
}

// —— 单元页 ——
await page.goto(url + '#/unit/c01');
await page.waitForSelector('.lesson-row');
{
  const m = await page.evaluate(() => ({
    bodyScrollW: document.body.scrollWidth,
    overviewLen: document.querySelector('.overview')?.textContent.length,
    goalsGone: !document.querySelector('.goals'),
    quizGone: !document.querySelector('.unit-quiz-box'),
    figures: document.querySelectorAll('.figure').length,
    events: document.querySelectorAll('.event-row').length,
  }));
  check('单元页无横向溢出', m.bodyScrollW <= 1280);
  check('导读/人物/年表齐全', m.overviewLen > 200 && m.figures >= 4 && m.events >= 6,
    `导读${m.overviewLen}字 人物${m.figures} 事件${m.events}`);
  check('单元页已去掉学习目标与测验模块', m.goalsGone && m.quizGone);
  const sn = await page.evaluate(() => {
    const a = document.querySelector('.sn-item.active');
    const g = document.querySelector('.sn-group.cur');
    return a ? { href: a.getAttribute('href'), groupOpen: !!(g && g.classList.contains('open')) } : null;
  });
  check('目录高亮当前单元并展开所在组', sn && sn.href === '#/unit/c01' && sn.groupOpen, JSON.stringify(sn));
}

// —— 左侧目录跳转（组已默认展开，直接点击条目）——
await page.click('.sn-item[href="#/unit/w01"]');
await page.waitForSelector('.unit-page');
{
  const href = await page.evaluate(() => document.querySelector('.sn-item.active')?.getAttribute('href'));
  check('点击目录跳转到对应单元并高亮', href === '#/unit/w01', href);
}

// —— 课程页：确认正文渲染（无转义残留）——
await page.goto(url + '#/lesson/c01/0');
await page.waitForSelector('.lesson-body p');
{
  const m = await page.evaluate(() => ({
    bodyScrollW: document.body.scrollWidth,
    paras: document.querySelectorAll('.lesson-body p').length,
    h3s: document.querySelectorAll('.lesson-body h3').length,
    hasEscaped: document.body.textContent.includes('&amp;') || document.body.textContent.includes('&lt;'),
    firstPara: document.querySelector('.lesson-body p')?.textContent.slice(0, 60),
    kp: document.querySelectorAll('.keypoints li').length,
  }));
  check('课程页无横向溢出', m.bodyScrollW <= 1280);
  check('正文分段与小节标题渲染', m.paras >= 8 && m.h3s >= 3, `段落${m.paras} 小节${m.h3s}`);
  check('无 HTML 转义残留', !m.hasEscaped);
  check('本课要点渲染', m.kp >= 4, String(m.kp));
  console.log('  首段示例：' + m.firstPara);
}

// —— 课程页章节目录：存在、跳转、滚动高亮 ——
await page.goto(url + '#/lesson/c01/0');
await page.waitForSelector('.lesson-body p');
{
  const m = await page.evaluate(() => ({
    toc: !!document.querySelector('.lesson-toc'),
    items: document.querySelectorAll('.toc-item').length,
    heads: document.querySelectorAll('.lesson-body h3[id^="sec-"]').length,
    bodyScrollW: document.body.scrollWidth,
  }));
  check('课程页目录渲染（条目=小节数）', m.toc && m.items === m.heads && m.items >= 2, `条目${m.items} 小节${m.heads}`);
  const tocLens = await page.evaluate(() => [...document.querySelectorAll('.toc-item')].map(a => a.textContent.length));
  check('目录条目为纯标题（无正文混入）', tocLens.every(l => l < 40), JSON.stringify(tocLens));
  const h3Clean = await page.evaluate(() => [...document.querySelectorAll('.lesson-body h3')].every(h => !h.textContent.includes('\n')));
  check('小节标题不含正文', h3Clean);
  check('课程页无横向溢出', m.bodyScrollW <= 1280);
  await page.click('.toc-item[data-sec="1"]');
  await page.waitForFunction(() => {
    const el = document.getElementById('sec-1');
    if (!el) return false;
    const top = el.getBoundingClientRect().top;
    return top < 130 && top > 40 && document.querySelectorAll('.toc-item')[1].classList.contains('active');
  }, { timeout: 5000 });
  check('目录点击跳转到第 2 节并高亮', true);
}

// —— 时间轴：布局指标 ——
await page.goto(url + '#/timeline');
await page.waitForSelector('.tl-item');
{
  const m = await page.evaluate(() => {
    const canvas = document.querySelector('.tl-canvas');
    const inner = document.querySelector('.tl-inner');
    const items = [...document.querySelectorAll('.tl-item')];
    const lanes = [...document.querySelectorAll('.tl-lane-body')];
    return {
      bodyScrollW: document.body.scrollWidth,
      canvasW: canvas.clientWidth,
      innerW: inner.getBoundingClientRect().width,
      scrollable: canvas.scrollWidth > canvas.clientWidth,
      lanes: lanes.length,
      laneHeights: lanes.map(l => l.getBoundingClientRect().height),
      items: items.length,
      zeroSizeItems: items.filter(i => i.getBoundingClientRect().width < 5 || i.getBoundingClientRect().height < 5).length,
      labelSample: document.querySelector('.tl-label')?.textContent,
    };
  });
  check('时间轴页无横向溢出', m.bodyScrollW <= 1280);
  check('画布可横向滚动', m.scrollable, '内容宽 ' + Math.round(m.innerW) + ' vs 画布 ' + m.canvasW);
  check('三条轨道', m.lanes === 3, String(m.lanes));
  check('轨道高度正常', m.laneHeights.every(h => h > 30), JSON.stringify(m.laneHeights.map(Math.round)));
  check('所有事件标记有尺寸', m.zeroSizeItems === 0, m.items + ' 个标记');
  check('事件标签渲染', !!m.labelSample, m.labelSample);
  const dots = await page.locator('.tl-item.dot-only').count();
  check('密集事件折叠为圆点', dots > 0, dots + ' 个');
  await page.hover('.tl-canvas', { position: { x: 400, y: 120 } });
  await page.waitForSelector('#tlYearChip.show', { timeout: 3000 });
  const chipText = (await page.textContent('#tlYearChip')).trim();
  check('悬停显示年份指示', /^前?\d+$/.test(chipText), chipText);
  await page.mouse.move(4, 4); // 移开鼠标，收起准线
}

// —— 大纲单元页 ——
await page.goto(url + '#/unit/c03');
await page.waitForSelector('.outline-note');
{
  const m = await page.evaluate(() => ({
    note: document.querySelector('.outline-note')?.textContent,
    kps: document.querySelectorAll('.l-keypoints').length,
  }));
  check('大纲单元提示与要点渲染', m.kps >= 3, m.note);
}

// —— 本机 AI 提问浮窗（mock fetch 验证 UI，不依赖服务进程） ——
await page.goto(url + '#/lesson/c01/0');
await page.waitForSelector('.lesson-body');
{
  const fabVisible = await page.evaluate(() => {
    const f = document.getElementById('btnAsk');
    return !!f && !f.classList.contains('hidden');
  });
  check('提问浮窗按钮可见（file://）', fabVisible);
  await page.click('#btnAsk');
  check('点击展开提问面板', await page.locator('#askPanel.open').count() === 1);
  await page.evaluate(() => {
    window.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ answer: '**商鞅变法**是秦国的改革。\n第二行内容。' })
    });
  });
  await page.fill('#askInput', '商鞅变法是什么？');
  await page.click('#btnAskSend');
  await page.waitForSelector('.ask-msg.ai');
  const m = await page.evaluate(() => ({
    userMsg: [...document.querySelectorAll('.ask-msg.user')].some(x => x.textContent.includes('商鞅变法')),
    aiMsg: document.querySelector('.ask-msg.ai')?.textContent,
    bold: document.querySelectorAll('.ask-msg.ai b').length,
    br: document.querySelectorAll('.ask-msg.ai br').length,
  }));
  check('提问渲染用户消息与 AI 回答', m.userMsg && m.aiMsg && m.aiMsg.includes('秦国'), JSON.stringify(m.aiMsg));
  check('回答 **加粗** 与换行渲染', m.bold === 1 && m.br >= 1, `bold:${m.bold} br:${m.br}`);
  await page.evaluate(() => {
    window.fetch = () => Promise.reject(new Error('conn refused'));
  });
  await page.fill('#askInput', '再问一次');
  await page.click('#btnAskSend');
  await page.waitForFunction(() => document.getElementById('askBody').textContent.includes('未启动'), { timeout: 5000 });
  check('服务未启动时给出降级提示', true);
}

// —— 测验已移除：旧链接跳回单元页 ——
await page.goto(url + '#/quiz/c01');
await page.waitForSelector('.unit-page');
{
  const m = await page.evaluate(() => ({ hash: location.hash, quizBox: !!document.querySelector('.unit-quiz-box') }));
  check('测验链接自动跳回单元页', m.hash === '#/unit/c01' && !m.quizBox, m.hash);
}

// —— 「传说」徽标渲染路径（临时注入 legend 标记验证，不改内容） ——
await page.goto(url + '#/timeline');
await page.waitForSelector('.tl-item');
{
  const m = await page.evaluate(() => {
    const ev0 = HC.units['c01'].events[0];
    ev0.legend = true;
    const app = document.getElementById('app');
    app.innerHTML = '';
    HC.timeline.render(app);
    const badge = document.querySelector('.tl-leg');
    const item = badge ? badge.closest('.tl-item') : null;
    if (item) item.click();
    return { badge: !!badge, detailBadge: !!document.querySelector('.tl-detail-head .tl-leg') };
  });
  check('时间轴「传说」徽标渲染（标签 + 详情）', m.badge && m.detailBadge, JSON.stringify(m));
}
await page.goto(url + '#/unit/c01');
await page.waitForSelector('.lesson-row');
{
  const m = await page.evaluate(() => {
    HC.units['c01'].events[0].legend = true;
    HC.app.pageUnit(document.getElementById('app'), 'c01');
    return document.querySelectorAll('.ev-leg').length;
  });
  check('单元年表「传说」徽标渲染', m >= 1, m + ' 个');
}

// —— 专题页 ——
await page.goto(url + '#/topic/t01');
await page.waitForSelector('.topic-col');
{
  const m = await page.evaluate(() => ({
    cols: document.querySelectorAll('.topic-col').length,
    compare: document.querySelectorAll('.goals.compare li').length,
  }));
  check('专题页双栏对照渲染', m.cols === 2 && m.compare >= 3, `栏${m.cols} 要点${m.compare}`);
}

// —— 窄屏：目录收纳为抽屉 ——
await page.setViewportSize({ width: 800, height: 900 });
await page.goto(url);
await page.waitForSelector('.route-group');
{
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('.site-nav')).display === 'none');
  await page.click('#btnSiteNav');
  const shown = await page.evaluate(() => document.body.classList.contains('sn-open') && getComputedStyle(document.querySelector('.site-nav')).display === 'block');
  await page.click('#btnSiteNav');
  check('窄屏目录收纳为抽屉并可开合', hidden && shown);
}
await page.setViewportSize({ width: 1280, height: 900 });

await browser.close();
console.log(issues === 0 ? '\n视觉检查全部通过' : '\n发现 ' + issues + ' 个问题');
process.exit(issues > 0 ? 1 : 0);
