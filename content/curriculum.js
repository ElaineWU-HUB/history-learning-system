/* ============================================================
 * 课程体系总纲：单元元数据、专题、建议学习路线
 * 数据来源：HC.units（各单元文件注册）、HC.topics（专题文件注册）
 * ============================================================ */
(function () {
  window.HC = window.HC || {};
  HC.units = HC.units || {};
  HC.topics = HC.topics || {};

  HC.curriculum = {
    version: '1.0.0',
    tracks: {
      china: { id: 'china', name: '中国史', desc: '从远古到当代的中华文明脉络' },
      world: { id: 'world', name: '世界史', desc: '从文明曙光到当代世界的全球进程' }
    },
    // 单元清单（完整内容在 content/china、content/world 下）
    units: [
      { id: 'c01', track: 'china', order: 1,  title: '文明曙光：远古与夏商周',                 period: '约前200万年–前771' },
      { id: 'c02', track: 'china', order: 2,  title: '争霸与变革：春秋战国',                   period: '前770–前221' },
      { id: 'c03', track: 'china', order: 3,  title: '大一统：秦与西汉',                       period: '前221–公元9' },
      { id: 'c04', track: 'china', order: 4,  title: '分裂与融合：东汉与三国两晋南北朝',       period: '25–589' },
      { id: 'c05', track: 'china', order: 5,  title: '盛世与开放：隋唐',                       period: '581–907' },
      { id: 'c06', track: 'china', order: 6,  title: '多政权并立：五代十国与辽宋夏金',         period: '907–1279' },
      { id: 'c07', track: 'china', order: 7,  title: '草原帝国：元',                           period: '1206–1368' },
      { id: 'c08', track: 'china', order: 8,  title: '专制顶峰与转型萌芽：明',                 period: '1368–1644' },
      { id: 'c09', track: 'china', order: 9,  title: '盛世与危机前夜：清前期',                 period: '1644–1840' },
      { id: 'c10', track: 'china', order: 10, title: '三千年未有之变局：晚清',                 period: '1840–1912' },
      { id: 'c11', track: 'china', order: 11, title: '共和与战争：中华民国',                   period: '1912–1949' },
      { id: 'c12', track: 'china', order: 12, title: '新中国与当代',                           period: '1949–今' },
      { id: 'w01', track: 'world', order: 1,  title: '文明的曙光：两河、埃及与印度河',         period: '约前3500–前1000' },
      { id: 'w02', track: 'world', order: 2,  title: '古典时代：希腊与波斯',                   period: '前8–前4世纪' },
      { id: 'w03', track: 'world', order: 3,  title: '从共和国到帝国：罗马',                   period: '前8世纪–476' },
      { id: 'w04', track: 'world', order: 4,  title: '中古早期：封建欧洲、拜占庭与伊斯兰世界', period: '476–1000' },
      { id: 'w05', track: 'world', order: 5,  title: '中古盛期：十字军、蒙古与全球的连接',     period: '1000–1350' },
      { id: 'w06', track: 'world', order: 6,  title: '文艺复兴与大航海',                       period: '1350–1600' },
      { id: 'w07', track: 'world', order: 7,  title: '宗教改革与绝对主义时代',                 period: '1500–1648' },
      { id: 'w08', track: 'world', order: 8,  title: '科学革命与启蒙运动',                     period: '1600–1789' },
      { id: 'w09', track: 'world', order: 9,  title: '工业革命与资本主义世界体系',             period: '1760–1870' },
      { id: 'w10', track: 'world', order: 10, title: '民族主义与殖民扩张的世纪',               period: '1870–1914' },
      { id: 'w11', track: 'world', order: 11, title: '两次世界大战',                           period: '1914–1945' },
      { id: 'w12', track: 'world', order: 12, title: '冷战、全球化与当代世界',                 period: '1945–今' }
    ],
    // 中外对照专题（完整内容在 content/topics 下）
    topics: [
      { id: 't01', order: 1, title: '轴心时代：诸子百家与希腊先哲', period: '约前600–前300' },
      { id: 't02', order: 2, title: '丝路两端：汉与罗马',           period: '约前200–200' },
      { id: 't03', order: 3, title: '蒙古帝国与世界的连接',         period: '约1200–1350' },
      { id: 't04', order: 4, title: '大航海时代下的明朝与世界',     period: '约1400–1600' },
      { id: 't05', order: 5, title: '大分流：工业革命为何在欧洲',   period: '约1600–1850' },
      { id: 't06', order: 6, title: '近代化的两条道路',             period: '约1840–1912' }
    ],
    // 并进对照路线：每个数组是一次「学习循环」（中国单元 ↔ 世界单元 ↔ 专题）
    pairings: [
      ['c01', 'w01'],
      ['c02', 'w02', 't01'],
      ['c03', 'w03', 't02'],
      ['c04', 'w04'],
      ['c05', 'w05'],
      ['c06', 'w06', 't03'],
      ['c07', 'w07'],
      ['c08', 'w08', 't04'],
      ['c09', 'w09', 't05'],
      ['c10', 'w10', 't06'],
      ['c11', 'w11'],
      ['c12', 'w12']
    ]
  };

  // —— 查询辅助 ——
  HC.getUnit = function (id) { return HC.units[id] || null; };
  HC.getTopic = function (id) { return HC.topics[id] || null; };
  HC.getTrack = function (unit) { return HC.curriculum.tracks[unit.track]; };

  // 学习路线：根据路线模式返回有序的学习项列表（{type:'unit'|'topic', id}）
  HC.getRoute = function (mode) {
    var items = [];
    if (mode === 'china') {
      HC.curriculum.units.filter(function (u) { return u.track === 'china'; })
        .forEach(function (u) { items.push({ type: 'unit', id: u.id }); });
      HC.curriculum.units.filter(function (u) { return u.track === 'world'; })
        .forEach(function (u) { items.push({ type: 'unit', id: u.id }); });
      HC.curriculum.topics.forEach(function (t) { items.push({ type: 'topic', id: t.id }); });
    } else if (mode === 'world') {
      HC.curriculum.units.filter(function (u) { return u.track === 'world'; })
        .forEach(function (u) { items.push({ type: 'unit', id: u.id }); });
      HC.curriculum.units.filter(function (u) { return u.track === 'china'; })
        .forEach(function (u) { items.push({ type: 'unit', id: u.id }); });
      HC.curriculum.topics.forEach(function (t) { items.push({ type: 'topic', id: t.id }); });
    } else { // parallel（默认）
      HC.curriculum.pairings.forEach(function (group) {
        group.forEach(function (id) {
          if (id.charAt(0) === 't') items.push({ type: 'topic', id: id });
          else items.push({ type: 'unit', id: id });
        });
      });
    }
    return items;
  };
})();
