/* ============================================================
 * 浏览器端到端验证（Playwright + 系统 Chrome，无需下载浏览器）
 * 运行：cd scripts && npm install && node verify.mjs
 * 覆盖：首页渲染 / 课程完成与进度持久化 / 测验判分与记录 /
 *       时间轴交互与过滤 / 进度导出 / 路线模式切换 / JS 报错监控
 * ============================================================ */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = 'file://' + encodeURI('/Users/wf/历史学习系统/index.html');
const shotsDir = decodeURIComponent(new URL('./shots/', import.meta.url).pathname);
mkdirSync(shotsDir, { recursive: true });

let pass = 0, fail = 0;
function ok(name) { pass++; console.log('  ✓ ' + name); }
function bad(name, err) { fail++; console.error('  ✗ ' + name + (err && err.message ? ' — ' + err.message : '')); }
async function shot(page, name) { await page.screenshot({ path: shotsDir + name }); }

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });

try {
  // ---------- 1. 首页 ----------
  console.log('1. 首页');
  await page.goto(url);
  await page.waitForSelector('.route-group', { timeout: 10000 });
  const unitCards = await page.locator('.card.unit-card').count();
  const topicCards = await page.locator('.card.topic-card').count();
  unitCards === 24 ? ok('渲染 24 个单元卡片') : bad('单元卡片数 = ' + unitCards);
  topicCards === 6 ? ok('渲染 6 个专题卡片') : bad('专题卡片数 = ' + topicCards);
  (await page.textContent('#topProgress')).trim() === '0%' ? ok('初始总进度 0%') : bad('初始进度异常');
  await shot(page, '01-home.png');

  // ---------- 2. 课程完成与进度持久化 ----------
  console.log('2. 课程与进度');
  await page.goto(url + '#/unit/c01');
  await page.waitForSelector('.lesson-row');
  (await page.locator('a.lesson-row').count()) === 3 ? ok('c01 单元页显示 3 课') : bad('c01 课程数异常');
  await shot(page, '02-unit.png');

  for (let i = 0; i < 3; i++) {
    await page.goto(url + '#/lesson/c01/' + i);
    await page.waitForSelector('.lesson-body p');
    await page.click('#btnToggleLesson');
    await page.waitForSelector('#btnToggleLesson.btn-done');
  }
  ok('c01 三课均已标记完成');
  await shot(page, '03-lesson-done.png');

  // 回到单元页确认 3 课均为完成态，再刷新验证 localStorage 持久化
  await page.goto(url + '#/unit/c01');
  await page.waitForSelector('a.lesson-row.done');
  await page.reload();
  await page.waitForSelector('a.lesson-row.done');
  const doneRows = await page.locator('a.lesson-row.done').count();
  doneRows === 3 ? ok('刷新后进度持久化（3/3 课）') : bad('刷新后已完成课程数 = ' + doneRows);
  console.log('  当前总进度：' + (await page.textContent('#topProgress')).trim());

  // ---------- 3. 测验已移除：旧链接跳回单元页 ----------
  console.log('3. 测验已移除');
  await page.goto(url + '#/quiz/c01');
  await page.waitForSelector('.unit-page');
  (await page.evaluate(() => location.hash)) === '#/unit/c01' ? ok('测验链接跳回对应单元页') : bad('测验链接未重定向');
  await page.goto(url + '#/unit/c01');
  await page.waitForSelector('.unit-page');
  (await page.locator('.unit-quiz-box').count()) === 0 ? ok('单元页无测验模块') : bad('单元页仍显示测验模块');

  // ---------- 4. 时间轴 ----------
  console.log('4. 时间轴');
  await page.goto(url + '#/timeline');
  await page.waitForSelector('.tl-item');
  const tlItems = await page.locator('.tl-item').count();
  tlItems > 30 ? ok('时间轴渲染事件标记（' + tlItems + ' 个）') : bad('时间轴标记数 = ' + tlItems);
  await page.locator('.tl-item').first().click();
  await page.waitForSelector('.tl-detail-head h3');
  const dt = (await page.textContent('.tl-detail-head h3')).trim();
  dt.length > 0 ? ok('点击事件显示详情：' + dt) : bad('事件详情为空');
  await page.selectOption('#tlFilter', 'c01');
  const filteredItems = await page.locator('.tl-item').count();
  (filteredItems > 0 && filteredItems < tlItems) ? ok('按单元过滤生效（' + filteredItems + ' 个事件）') : bad('过滤后事件数 = ' + filteredItems);
  await page.selectOption('#tlFilter', 'all');
  await page.click('#tlIn');
  await shot(page, '05-timeline.png');

  // ---------- 5. 设置：导出与路线模式 ----------
  console.log('5. 设置');
  await page.goto(url + '#/settings');
  await page.waitForSelector('#btnExport');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  ok('进度导出文件已下载：' + download.suggestedFilename());
  // 注意：选择模式后会立即跳回首页，故用 click 而非 check（check 会回验选中态，元素已被卸载）
  await page.click('input[name="trackMode"][value="china"]');
  await page.waitForSelector('.route-sec-title');
  (await page.textContent('.route-sec-title')).includes('中国史') ? ok('切换「中国史先行」路线生效') : bad('路线切换异常');
  await page.goto(url + '#/settings');
  await page.waitForSelector('input[name="trackMode"][value="china"]');
  (await page.isChecked('input[name="trackMode"][value="china"]')) ? ok('「中国史先行」选择已持久化') : bad('路线模式未保存');
  await page.click('input[name="trackMode"][value="parallel"]');

  // ---------- 6. JS 错误 ----------
  jsErrors.length === 0 ? ok('全程无 JS 错误') : bad('JS 错误：' + jsErrors.slice(0, 3).join(' | '));
} catch (e) {
  bad('流程中断', e);
  await shot(page, '99-error.png');
} finally {
  await browser.close();
}

console.log('\n结果：' + pass + ' 项通过，' + fail + ' 项失败');
process.exit(fail > 0 ? 1 : 0);
