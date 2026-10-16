/* ============================================================
 * 内容校验：检查全部课程/专题文件与 curriculum 总纲的一致性
 * 运行：node scripts/validate-content.mjs
 * 供内容扩充后自查使用（不依赖浏览器）
 * ============================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = decodeURIComponent(new URL('..', import.meta.url).pathname);
const sandbox = vm.createContext({});
sandbox.window = sandbox; // 浏览器语义：window 即全局对象

function load(file) {
  vm.runInContext(readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

load('content/curriculum.js');
const china = readdirSync(path.join(root, 'content/china')).filter(f => f.endsWith('.js')).sort();
const world = readdirSync(path.join(root, 'content/world')).filter(f => f.endsWith('.js')).sort();
const topics = readdirSync(path.join(root, 'content/topics')).filter(f => f.endsWith('.js')).sort();
china.forEach(f => load('content/china/' + f));
world.forEach(f => load('content/world/' + f));
topics.forEach(f => load('content/topics/' + f));

const HC = sandbox.window.HC;
const errors = [];

// —— 单元 ——
const ids = HC.curriculum.units.map(u => u.id);
ids.forEach(id => { if (!HC.units[id]) errors.push('缺少内容文件: ' + id); });
Object.keys(HC.units).forEach(id => {
  const u = HC.units[id];
  if (!ids.includes(id)) { errors.push('curriculum 未登记: ' + id); return; }
  const meta = HC.curriculum.units.find(m => m.id === id);
  if (u.track !== meta.track || u.order !== meta.order || u.title !== meta.title || u.period !== meta.period) {
    errors.push(id + ' 元数据与 curriculum 不一致');
  }
  if (!u.overview || u.overview.length < 100) errors.push(id + ' overview 缺失或过短');
  if (!u.goals || u.goals.length < 3) errors.push(id + ' goals 不足 3 条');
  if (!u.lessons || u.lessons.length < 3) errors.push(id + ' lessons 不足 3 课');
  if (!u.extra) errors.push(id + ' 缺少 extra');
  if (u.status === 'complete') {
    u.lessons.forEach((l, i) => {
      if (!l.body || l.body.length < 500) errors.push(id + ' 第' + (i + 1) + '课 body 缺失或过短');
    });
    if (!u.quiz || u.quiz.length < 10) errors.push(id + ' 测验题不足 10 题');
    (u.quiz || []).forEach((q, i) => {
      if (!q.options || q.options.length !== 4) errors.push(id + ' 第' + (i + 1) + '题选项数≠4');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(id + ' 第' + (i + 1) + '题 answer 越界');
      if (!q.explain) errors.push(id + ' 第' + (i + 1) + '题缺 explain');
    });
  } else {
    u.lessons.forEach((l, i) => {
      if (!l.keyPoints || l.keyPoints.length < 3) errors.push(id + ' 第' + (i + 1) + '课 keyPoints 不足 3 条');
    });
  }
  (u.events || []).forEach((ev, i) => {
    const y = String(ev.year || '');
    if (!/\d/.test(y)) errors.push(id + ' 事件 ' + (i + 1) + ' year 缺少数字: ' + y);
    if (!ev.title) errors.push(id + ' 事件 ' + (i + 1) + ' 缺 title');
  });
});

// —— 专题 ——
const tids = HC.curriculum.topics.map(t => t.id);
tids.forEach(id => { if (!HC.topics[id]) errors.push('缺少专题文件: ' + id); });
Object.keys(HC.topics).forEach(id => {
  const t = HC.topics[id];
  if (!tids.includes(id)) { errors.push('curriculum 未登记专题: ' + id); return; }
  if (!t.intro || t.intro.length < 100) errors.push(id + ' intro 过短');
  if (!t.china || !t.world) errors.push(id + ' 缺少对照内容');
  if (!t.compare || t.compare.length < 3) errors.push(id + ' compare 不足 3 条');
});

// —— 学习循环完整性 ——
const inPairs = new Set();
HC.curriculum.pairings.forEach(g => g.forEach(x => inPairs.add(x)));
ids.concat(tids).forEach(id => { if (!inPairs.has(id)) errors.push('未出现在学习循环 pairings 中: ' + id); });

if (errors.length) {
  console.log('发现 ' + errors.length + ' 个问题：');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('内容校验通过：' + ids.length + ' 个单元 + ' + tids.length + ' 个专题，schema 全部合规');
