// @ts-check
/**
 * 悬停图鉴 (Hover Almanac) v1.1
 * 鼠标停在植物 / 僵尸上，按住 Shift（可在设置里改键）就地弹出图鉴。
 *
 * 交互约定：
 *  - 按住触发键才会显示；一旦显示就「锁定」这个对象，鼠标可以移动到图鉴上。
 *  - 图鉴内容是 DOM 浮层，可以拿鼠标滚轮上下滚动（长简介会滚）。
 *  - 只有松开触发键（或对象消失、窗口失焦）才关闭。
 */

const MOD_TAG = '[悬停图鉴]';
const STYLE_ID = 'gp-hover-almanac-style';
const CARD_ID = 'gp-hover-almanac-card';
const RING_ID = 'gp-hover-almanac-ring';
const DEBUG_ID = 'gp-hover-almanac-debug';

const ENTITY_KINDS = ['plant', 'zombie'];
const INDEX_REFRESH_MS = 120;
const CARD_REFRESH_MS = 900;
const RETARGET_MS = 380;

const TRIGGER_OPTIONS = [
  { label: 'Shift', value: 'shift' },
  { label: 'Ctrl', value: 'control' },
  { label: 'Alt', value: 'alt' },
];

const PROJECTION_OPTIONS = [
  { label: '自动', value: 'auto' },
  { label: '相机投影', value: 'camera' },
  { label: '画布视图', value: 'view' },
];

const DEFAULT_SETTINGS = {
  enabled: true,
  trigger: 'shift',
  language: 'auto',
  projection: 'auto',
  offsetX: 0,
  offsetY: 0,
  showChat: true,
  showDebug: false,
  scale: 1,
};

/** 包内附带的图鉴数据（游戏内数据接口取不到时兜底） */
const BUNDLED_DATA_PATH = 'data/almanac.json';
let bundledData = null;
let bundledLoading = null;

/* ------------------------------------------------------------ 文案 */

const TEXT = {
  zh: {
    plant: '植物',
    zombie: '僵尸',
    position: '第 {row} 行 · 第 {col} 列',
    healthShort: '生命 {value}',
    healthLabel: '当前生命',
    sectionIntro: '简介',
    sectionSpecial: '特殊',
    noEntry: '该对象没有图鉴条目，仅显示运行数据。',
    footer: '滚轮翻看 · 松开 {key} 关闭',
    unknown: '未知对象',
    seconds: '{value} 秒',
    panelTitle: '悬停图鉴',
    panelDesc: '把鼠标移到植物或僵尸上，按住触发键即可就地查看图鉴。',
    optEnabled: '启用悬停图鉴',
    optTrigger: '触发按键',
    optLanguage: '图鉴语言',
    langAuto: '跟随游戏语言',
    langZh: '中文',
    langEn: 'English',
    optChat: '显示个性台词',
    optScale: '面板缩放',
    optProjection: '坐标投影方式（定位不准时切换）',
    optOffsetX: '投影水平偏移（像素）',
    optOffsetY: '投影垂直偏移（像素）',
    optDebug: '显示调试信息',
    projAuto: '自动',
    projCamera: '相机投影',
    projView: '画布视图',
    actionRecalibrate: '重新校准投影',
    actionDump: '导出当前悬停对象数据',
    controlStatus: '当前投影方式',
    controlGroup: '诊断',
    statusValue: '{label} · 实体 {count}',
    toastLoaded: '悬停图鉴已启用：鼠标指到植物/僵尸上按住 {key}',
    toastProjection: '投影: {label}',
    toastWarning: '悬停图鉴：坐标定位置信度偏低，若悬停没反应请到模组设置切换投影方式',
    toastDumped: '诊断数据已写入模组存储',
    toastDumpFailed: '写入诊断失败，详见日志',
    elements: {
      SUNCOST: '阳光消耗',
      RECHARGE: '冷却时间',
      DAMAGE: '伤害',
      AREA: '作用范围',
      FAMILY: '所属家族',
      TOUGHNESS: '韧性',
      RANGE: '攻击范围',
      PLANTFOOD: '叶绿素',
      SPECIAL: '特殊效果',
      GROWTIME: '生长时间',
      SUNPRODUCTION: '阳光产量',
      ARMINGTIME: '布防时间',
      DURATION: '持续时间',
      SPEED: '速度',
    },
    props: {
      SunCost: '阳光消耗',
      Cooldown: '冷却时间',
      Toughness: '生命值',
      Damage: '伤害',
      Family: '家族',
      WalkSPS: '移动速度',
      EatDPS: '啃食伤害/秒',
      WavePointCost: '波次点数',
    },
  },
  en: {
    plant: 'Plant',
    zombie: 'Zombie',
    position: 'Row {row} · Column {col}',
    healthShort: 'HP {value}',
    healthLabel: 'Current health',
    sectionIntro: 'Description',
    sectionSpecial: 'Special',
    noEntry: 'No almanac entry for this object; showing runtime data only.',
    footer: 'Scroll to read · release {key} to close',
    unknown: 'Unknown',
    seconds: '{value} s',
    panelTitle: 'Hover Almanac',
    panelDesc: 'Hover a plant or zombie and hold the trigger key to read its almanac.',
    optEnabled: 'Enable hover almanac',
    optTrigger: 'Trigger key',
    optLanguage: 'Almanac language',
    langAuto: 'Follow game language',
    langZh: '中文',
    langEn: 'English',
    optChat: 'Show personality quotes',
    optScale: 'Panel scale',
    optProjection: 'Coordinate projection (switch if misplaced)',
    optOffsetX: 'Horizontal offset (px)',
    optOffsetY: 'Vertical offset (px)',
    optDebug: 'Show debug info',
    projAuto: 'Auto',
    projCamera: 'Camera',
    projView: 'Canvas view',
    actionRecalibrate: 'Recalibrate projection',
    actionDump: 'Export hovered entity data',
    controlStatus: 'Projection',
    controlGroup: 'Diagnostics',
    statusValue: '{label} · entities {count}',
    toastLoaded: 'Hover Almanac enabled: hold {key} while pointing at a plant or zombie',
    toastProjection: 'Projection: {label}',
    toastWarning: 'Hover Almanac: projection confidence is low. Switch the projection mode in mod settings if hovering does nothing.',
    toastDumped: 'Diagnostics written to mod storage',
    toastDumpFailed: 'Failed to write diagnostics, see log',
    elements: {
      SUNCOST: 'Sun cost',
      RECHARGE: 'Recharge',
      DAMAGE: 'Damage',
      AREA: 'Area',
      FAMILY: 'Family',
      TOUGHNESS: 'Toughness',
      RANGE: 'Range',
      PLANTFOOD: 'Plant Food',
      SPECIAL: 'Special',
      GROWTIME: 'Grow time',
      SUNPRODUCTION: 'Sun production',
      ARMINGTIME: 'Arm time',
      DURATION: 'Duration',
      SPEED: 'Speed',
    },
    props: {
      SunCost: 'Sun cost',
      Cooldown: 'Recharge',
      Toughness: 'Health',
      Damage: 'Damage',
      Family: 'Family',
      WalkSPS: 'Speed',
      EatDPS: 'Eating DPS',
      WavePointCost: 'Wave points',
    },
  },
};

const SUPPORTED_LANGS = ['zh', 'en'];

/** 图鉴元素没有 VALUE / SORT 时，用数值属性补上 */
const ELEMENT_PROP_KEYS = {
  SUNCOST: 'SunCost',
  RECHARGE: 'Cooldown',
  TOUGHNESS: 'Toughness',
  FAMILY: 'Family',
  DAMAGE: 'Damage',
  GROWTIME: 'GrowTime',
  SUNPRODUCTION: 'SunProduction',
};

const TIME_ELEMENTS = new Set(['RECHARGE', 'GROWTIME', 'ARMINGTIME', 'DURATION']);

/** 额外展示的数值属性（按顺序，已被要素用掉的不再重复） */
const EXTRA_PLANT_PROPS = ['SunCost', 'Cooldown', 'Toughness', 'Damage', 'Family'];
const EXTRA_ZOMBIE_PROPS = ['Toughness', 'WalkSPS', 'EatDPS', 'WavePointCost'];

/* ------------------------------------------------------------ 状态 */

let ctx = null;
let cc = null;
let engine = null;

let styleEl = null;
let cardEl = null;
let ringEl = null;
let debugEl = null;

let rafId = 0;
let disposed = false;
let enabled = true;
let triggerKey = 'shift';
let languageMode = 'auto';
let projectionMode = 'auto';
let offsetX = 0;
let offsetY = 0;
let showChat = true;
let showDebug = false;
let panelScale = 1;

let lang = 'zh';

let pointers = { x: -1, y: -1, inside: false };
let keys = { shift: false, control: false, alt: false };
let moveShift = false;
let moveControl = false;
let moveAlt = false;

let index = [];
let indexAt = 0;
let indexError = null;

/** 当前锁定的对象 id（按下触发键后第一次指到谁就是谁，直到松手） */
let activeId = null;
let activePoint = null;
let activeKey = '';
let overCard = false;
let retargetAt = 0;
let lastBuildAt = 0;
let lastRaw = null;

let projectors = [];
let projector = null;
let calibrateAt = 0;
let warnedProjection = false;
let projDiagnostics = { label: '未校准', score: 0, samples: 0, cameras: 0, candidates: [] };

/* ------------------------------------------------------------ 工具 */

function log(level, message) {
  const line = `${MOD_TAG} ${message}`;
  try {
    const target = ctx && ctx.log && ctx.log[level];
    if (typeof target === 'function') {
      target.call(ctx.log, line);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  try {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line);
  } catch (_) {
    /* ignore */
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function tpl(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (all, key) => (vars[key] === undefined ? all : String(vars[key])));
}

function table() {
  return TEXT[lang] || TEXT.zh;
}

function t(key, vars) {
  const dict = table();
  const value = dict[key];
  if (typeof value === 'string') return tpl(value, vars);
  const fallback = TEXT.zh[key];
  if (typeof fallback === 'string') return tpl(fallback, vars);
  return String(key);
}

/* ------------------------------------------------------------ 语言 */

/** 取游戏当前语言，只保留主语言（zh-CN → zh），不认识的语言按中文处理 */
function resolveLang() {
  if (languageMode === 'zh' || languageMode === 'en') return languageMode;
  let raw = '';
  try {
    const api = ctx && ctx.localization;
    if (api && typeof api.getCurrentLanguage === 'function') raw = api.getCurrentLanguage();
  } catch (_) {
    raw = '';
  }
  if (raw && typeof raw === 'object') {
    raw = raw.code || raw.id || raw.language || raw.name || '';
  }
  const text = String(raw || '').toLowerCase();
  for (const code of SUPPORTED_LANGS) {
    if (text === code || text.startsWith(`${code}-`) || text.startsWith(`${code}_`)) return code;
  }
  if (text.includes('english')) return 'en';
  if (text.includes('chinese') || text.includes('zh')) return 'zh';
  return 'zh';
}

/** 多语言字段取词：先精确语言，其次中文，最后英文 */
function pickText(value, code) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return formatNumber(value);
  if (Array.isArray(value)) {
    return value.map((item) => pickText(item, code)).filter(Boolean).join(' / ');
  }
  if (typeof value === 'object') {
    const direct = value[code];
    if (typeof direct === 'string' && direct) return direct;
    if (typeof value.zh === 'string' && value.zh) return value.zh;
    if (typeof value.en === 'string' && value.en) return value.en;
    for (const key of Object.keys(value)) {
      const item = value[key];
      if (typeof item === 'string' && item) return item;
    }
  }
  return '';
}

function objdata(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.objdata && typeof value.objdata === 'object') return value.objdata;
  return value;
}

/* -------------------------------------------------------- 坐标与投影 */

function getGeom() {
  try {
    let canvas = null;
    try {
      if (cc && cc.game && cc.game.canvas) canvas = cc.game.canvas;
    } catch (_) {
      canvas = null;
    }
    if (!canvas && typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      // 拿不到引擎时退化为页面里的 canvas
      canvas = document.querySelector('canvas');
    }
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    const pixelRatioX = canvas.width / rect.width;
    const pixelRatioY = canvas.height / rect.height;
    if (!Number.isFinite(pixelRatioX) || !Number.isFinite(pixelRatioY)) return null;

    let viewport = null;
    let scaleX = 1;
    let scaleY = 1;
    try {
      if (cc && cc.view) {
        viewport = cc.view.getViewportRect();
        scaleX = cc.view.getScaleX();
        scaleY = cc.view.getScaleY();
      }
    } catch (_) {
      viewport = null;
    }
    if (!viewport) viewport = { x: 0, y: 0, width: rect.width, height: rect.height };
    return { canvas, rect, pixelRatioX, pixelRatioY, viewport, scaleX, scaleY };
  } catch (_) {
    return null;
  }
}

function findCameras() {
  const found = [];
  try {
    if (!cc || !cc.director || !cc.director.getScene) return found;
    const scene = cc.director.getScene();
    if (!scene) return found;
    const walk = (node) => {
      if (!node) return;
      const comps = node.components || node._components || [];
      for (const comp of comps) {
        if (comp && comp.__classname__ === 'cc.Camera' && comp.enabledInHierarchy !== false) {
          found.push(comp);
        }
      }
      const children = node.children || [];
      for (const child of children) walk(child);
    };
    walk(scene);
  } catch (_) {
    /* ignore */
  }
  return found;
}

function buildProjectors() {
  const list = [];
  const cameras = findCameras();
  for (let i = 0; i < cameras.length; i += 1) {
    list.push({ kind: 'camera', camera: cameras[i], label: `camera#${i}` });
  }
  list.push({ kind: 'view', label: 'view' });
  projDiagnostics.cameras = cameras.length;
  return list;
}

function projectWith(proj, position, geom) {
  if (!position) return null;
  const px = Number(position.x);
  const py = Number(position.y);
  const pz = Number(position.z) || 0;
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  try {
    if (proj.kind === 'camera' && proj.camera && cc && cc.Vec3
      && typeof proj.camera.worldToScreen === 'function') {
      const out = proj.camera.worldToScreen(new cc.Vec3(px, py, pz));
      if (!out || !Number.isFinite(out.x) || !Number.isFinite(out.y)) return null;
      // worldToScreen 输出画布像素坐标，原点在左下角
      const x = geom.rect.left + out.x / geom.pixelRatioX;
      const y = geom.rect.top + geom.rect.height - out.y / geom.pixelRatioY;
      return { x, y };
    }
    if (proj.kind === 'view' && geom.viewport) {
      const x = geom.rect.left + (geom.viewport.x + px * geom.scaleX) / geom.pixelRatioX;
      const y = geom.rect.top + geom.rect.height
        - (geom.viewport.y + py * geom.scaleY) / geom.pixelRatioY;
      return { x, y };
    }
  } catch (_) {
    return null;
  }
  return null;
}

/** 投影 + 用户微调偏移 */
function projectPoint(proj, position, geom) {
  const point = projectWith(proj, position, geom);
  if (!point) return null;
  const x = point.x + offsetX;
  const y = point.y + offsetY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function insideCanvas(point, geom, slack) {
  const pad = slack || 0;
  return point.x >= geom.rect.left - pad
    && point.x <= geom.rect.right + pad
    && point.y >= geom.rect.top - pad
    && point.y <= geom.rect.bottom + pad;
}

/** 皮尔逊相关系数，用来自检「行/列应该和屏幕方向一致」 */
function correlation(pairs) {
  const n = pairs.length;
  if (n < 3) return 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i += 1) {
    sumA += pairs[i][0];
    sumB += pairs[i][1];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0;
  let devA = 0;
  let devB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = pairs[i][0] - meanA;
    const db = pairs[i][1] - meanB;
    num += da * db;
    devA += da * da;
    devB += db * db;
  }
  if (devA <= 1e-9 || devB <= 1e-9) return 0;
  return num / Math.sqrt(devA * devB);
}

/**
 * 选一个能把实体坐标合理铺到画面里的投影方式。
 * 判据：行列与屏幕方向的相关系数（最强）+ 落在画面内的比例 + 分布范围。
 */
function calibrate(force) {
  const now = Date.now();
  if (!force && projector && now - calibrateAt < 1500) return projector;
  calibrateAt = now;

  const geom = getGeom();
  if (!geom || !index.length) {
    projectors = buildProjectors();
    projector = projectors.length ? projectors[projectors.length - 1] : null;
    projDiagnostics = {
      label: projector ? projector.label : '无',
      score: 0,
      samples: 0,
      cameras: projDiagnostics.cameras,
      candidates: [],
    };
    return projector;
  }

  projectors = buildProjectors();
  const samples = index.filter((item) => item.position);
  const gridSamples = samples.filter((item) => Number.isInteger(item.laneIndex) && Number.isInteger(item.columnIndex));
  const step = Math.max(1, Math.floor(samples.length / 48));
  const candidates = [];
  let best = null;
  let bestScore = -1;

  for (const proj of projectors) {
    let hits = 0;
    let total = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < samples.length; i += step) {
      const point = projectPoint(proj, samples[i].position, geom);
      total += 1;
      if (!point) continue;
      if (insideCanvas(point, geom, 16)) hits += 1;
      if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    if (!total) continue;

    const byCol = [];
    const byLane = [];
    for (const item of gridSamples) {
      const point = projectPoint(proj, item.position, geom);
      if (!point) continue;
      byCol.push([item.columnIndex, point.x]);
      byLane.push([item.laneIndex, point.y]);
    }
    const gridX = Math.abs(correlation(byCol));
    const gridY = Math.abs(correlation(byLane));
    const grid = gridSamples.length >= 4 ? (gridX + gridY) / 2 : 0;

    const ratio = hits / total;
    const spreadX = Number.isFinite(minX) ? (maxX - minX) / geom.rect.width : 0;
    const spreadY = Number.isFinite(minY) ? (maxY - minY) / geom.rect.height : 0;
    // 只命中一两个点（分布过窄）说明投影是错的
    const spread = Math.min(1, Math.max(spreadX, spreadY));
    const score = grid * 0.55 + ratio * 0.3 + spread * 0.15;

    candidates.push({
      label: proj.label,
      kind: proj.kind,
      grid: Math.round(grid * 100) / 100,
      hit: Math.round(ratio * 100) / 100,
      spread: Math.round(spread * 100) / 100,
      score: Math.round(score * 100) / 100,
    });

    const allowed = projectionMode === 'camera' ? proj.kind === 'camera'
      : projectionMode === 'view' ? proj.kind === 'view'
        : true;
    if (allowed && score > bestScore) {
      bestScore = score;
      best = proj;
    }
  }

  if (!best) {
    // 手动指定的投影方式没有可用相机时退回兜底投影
    projectors = buildProjectors();
    best = projectors.find((item) => (projectionMode === 'view'
      ? item.kind === 'view'
      : item.kind === 'camera')) || projectors[projectors.length - 1] || null;
    bestScore = 0;
  }

  projector = best || projectors[projectors.length - 1] || null;
  projDiagnostics = {
    label: projector ? projector.label : '无',
    score: Math.round(bestScore * 100) / 100,
    samples: samples.length,
    cameras: projDiagnostics.cameras,
    candidates,
  };

  // 置信度太低时提醒一次，避免「按了没反应又不知道原因」
  if (samples.length >= 6) {
    if (bestScore < 0.45 && !warnedProjection) {
      warnedProjection = true;
      log('warn', `投影置信度偏低 (${projDiagnostics.score})，可切换投影方式或微调偏移`);
      try {
        ctx.ui.toast(t('toastWarning'), 'warning');
      } catch (_) {
        /* ignore */
      }
    } else if (bestScore > 0.7) {
      warnedProjection = false;
    }
  }

  return projector;
}

function hoverRadius(geom) {
  const base = geom ? geom.rect.width * 0.055 : 90;
  return clamp(base, 52, 140) * panelScale;
}

/* ------------------------------------------------------------ 实体索引 */

function snapshotOf(handle) {
  if (!handle) return null;
  try {
    if (typeof handle.snapshot === 'function') return handle.snapshot();
    return handle;
  } catch (_) {
    return null;
  }
}

function refreshIndex(force) {
  const now = Date.now();
  if (!force && now - indexAt < INDEX_REFRESH_MS) return;
  indexAt = now;
  if (!ctx || !ctx.entities || typeof ctx.entities.list !== 'function') {
    index = [];
    indexError = 'entities API 不可用';
    return;
  }

  const collected = [];
  try {
    let handles = [];
    try {
      handles = ctx.entities.list({ kinds: ENTITY_KINDS, alive: true });
    } catch (_) {
      handles = [];
      for (const kind of ENTITY_KINDS) {
        try {
          handles = handles.concat(ctx.entities.list({ kind, alive: true }) || []);
        } catch (_) {
          /* ignore */
        }
      }
    }
    for (const handle of handles) {
      const snap = snapshotOf(handle);
      if (!snap || !snap.position) continue;
      if (snap.alive === false) continue;
      collected.push({
        id: String(snap.id || snap.nodeName || ''),
        kind: String(snap.kind || ''),
        codename: snap.codename || null,
        className: snap.className || '',
        laneIndex: snap.laneIndex,
        columnIndex: snap.columnIndex,
        position: snap.position,
        health: snap.health || null,
        handle,
      });
    }
    index = collected;
    indexError = null;
  } catch (error) {
    index = [];
    indexError = String(error && error.message ? error.message : error);
  }
}

function findEntity(id) {
  if (!id) return null;
  for (const item of index) {
    if (item.id === id) return item;
  }
  return null;
}

/* ------------------------------------------------------------ 悬停判定 */

function pickHover() {
  if (!index.length) return null;
  const geom = getGeom();
  if (!geom || !projector) return null;
  if (!pointers.inside) return null;

  const radius = hoverRadius(geom);
  let best = null;
  for (const snap of index) {
    const point = projectPoint(projector, snap.position, geom);
    if (!point || !insideCanvas(point, geom, 4)) continue;
    let dist = Math.hypot(point.x - pointers.x, point.y - pointers.y);
    if (activeId && activeId === snap.id) dist -= 16; // 滞回，避免边界抖动
    if (dist > radius) continue;
    if (!best || dist < best.dist) best = { snap, dist, point };
  }
  return best;
}

/* ------------------------------------------------------------ 图鉴数据 */

function featureName(kind, codename, code) {
  if (!codename) return '';
  try {
    const domain = kind === 'zombie' ? ctx.zombies : ctx.plants;
    if (domain && typeof domain.getFeature === 'function') {
      const feature = objdata(domain.getFeature(codename));
      if (feature) {
        const name = pickText(feature.NAME, code);
        if (name) return name;
      }
      const entry = findEntry(domain, codename);
      if (entry) {
        const name2 = pickText(entry.name || entry.label, code);
        if (name2) return name2;
      }
    }
  } catch (_) {
    /* ignore */
  }
  return '';
}

function findEntry(domain, codename) {
  if (!domain || typeof domain.listAlmanacEntries !== 'function') return null;
  try {
    const entries = domain.listAlmanacEntries();
    if (!Array.isArray(entries)) return null;
    const lower = String(codename).toLowerCase();
    return entries.find((item) => {
      if (!item) return false;
      if (String(item.id || '').toLowerCase() === lower) return true;
      if (item.aliases && item.aliases.some((alias) => String(alias).toLowerCase() === lower)) return true;
      return false;
    }) || null;
  } catch (_) {
    return null;
  }
}

function getAlmanac(kind, codename) {
  if (!codename) return null;
  const domain = kind === 'zombie' ? ctx.zombies : ctx.plants;
  if (!domain) return null;
  try {
    if (typeof domain.getAlmanac === 'function') {
      const direct = domain.getAlmanac(codename);
      if (direct) return objdata(direct);
    }
  } catch (_) {
    /* ignore */
  }
  try {
    const entry = findEntry(domain, codename);
    if (entry && typeof domain.getAlmanac === 'function') {
      const viaId = domain.getAlmanac(entry.id);
      if (viaId) return objdata(viaId);
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

function getProps(kind, codename) {
  if (!codename) return null;
  const domain = kind === 'zombie' ? ctx.zombies : ctx.plants;
  if (!domain || typeof domain.getProps !== 'function') return null;
  try {
    return objdata(domain.getProps(codename));
  } catch (_) {
    return null;
  }
}

/* -------------------------------------------------------- 内置图鉴数据 */

/** 读包内的 data/almanac.json（从游戏数据导出的兜底图鉴） */
function loadBundledData() {
  if (bundledData) return Promise.resolve(bundledData);
  if (bundledLoading) return bundledLoading;
  bundledLoading = (async () => {
    try {
      const filesApi = ctx && ctx.files;
      if (!filesApi) return null;
      const own = typeof filesApi.own === 'function' ? filesApi.own() : filesApi;
      let text = null;
      if (own && typeof own.readText === 'function') {
        text = await own.readText(BUNDLED_DATA_PATH);
      }
      if ((text === null || text === undefined) && own) {
        const reader = own.readBytes || own.read;
        if (typeof reader === 'function') {
          const bytes = await reader.call(own, BUNDLED_DATA_PATH);
          if (bytes) {
            const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            text = new TextDecoder('utf-8').decode(view);
          }
        }
      }
      if (typeof text === 'string' && text) {
        const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
        if (parsed && typeof parsed === 'object') {
          bundledData = parsed;
          log('info', `内置图鉴数据已载入：植物 ${Object.keys(parsed.plants || {}).length} / 僵尸 ${Object.keys(parsed.zombies || {}).length}`);
        }
      }
    } catch (error) {
      log('warn', `内置图鉴数据读取失败: ${String(error)}`);
    }
    return bundledData;
  })();
  return bundledLoading;
}

function bundledEntry(kind, codename) {
  if (!bundledData || !codename) return null;
  const tableData = kind === 'zombie' ? bundledData.zombies : bundledData.plants;
  if (!tableData) return null;
  const key = String(codename).toLowerCase();
  if (tableData[key]) return tableData[key];
  // 变体/皮肤后缀：取最长前缀匹配
  let bestKey = null;
  for (const candidate of Object.keys(tableData)) {
    if (key === candidate) return tableData[candidate];
    if (key.startsWith(candidate) || candidate.startsWith(key)) {
      if (!bestKey || candidate.length > bestKey.length) bestKey = candidate;
    }
  }
  return bestKey ? tableData[bestKey] : null;
}

/** 把内置数据结构转成图鉴字段形状 */
function bundledAlmanac(entry) {
  if (!entry) return null;
  return {
    NAME: entry.name,
    BriefIntroduction: entry.BriefIntroduction,
    Introduction: entry.Introduction,
    Chat: entry.Chat,
    Elements: entry.elements,
    Special: entry.special,
  };
}

/* ------------------------------------------------------------ 卡片内容 */

function buildCard(snap, code) {
  const kind = snap.kind === 'zombie' ? 'zombie' : 'plant';
  const codename = snap.codename || '';
  const packed = bundledEntry(kind, codename);
  const liveAlmanac = getAlmanac(kind, codename);
  const almanac = liveAlmanac || bundledAlmanac(packed) || {};
  const liveProps = getProps(kind, codename);
  const props = liveProps || (packed && packed.props) || {};

  const dict = TEXT[code] || TEXT.zh;
  const elementLabels = dict.elements || {};
  const propLabels = dict.props || {};

  const name = pickText(almanac.NAME, code) || featureName(kind, codename, code)
    || codename || snap.className || t('unknown');
  const brief = pickText(almanac.BriefIntroduction, code);
  const intro = pickText(almanac.Introduction, code);
  const chat = pickText(almanac.Chat, code);

  const elements = Array.isArray(almanac.Elements) ? almanac.Elements : [];
  const rows = [];
  const usedProps = new Set();
  for (const element of elements) {
    if (!element || !element.TYPE) continue;
    const type = String(element.TYPE);
    const label = elementLabels[type] || type;
    let text = '';
    if (element.SORT) text = pickText(element.SORT, code);
    else if (element.TEXT) text = pickText(element.TEXT, code);
    else if (typeof element.VALUE === 'number') {
      text = TIME_ELEMENTS.has(type)
        ? t('seconds', { value: formatNumber(element.VALUE) })
        : formatNumber(element.VALUE);
    } else {
      const propKey = ELEMENT_PROP_KEYS[type];
      const raw = propKey ? props[propKey] : undefined;
      if (typeof raw === 'number') {
        text = TIME_ELEMENTS.has(type) ? t('seconds', { value: formatNumber(raw) }) : formatNumber(raw);
        if (propKey) usedProps.add(propKey);
      } else if (typeof raw === 'string') {
        text = raw;
        if (propKey) usedProps.add(propKey);
      }
    }
    const progress = typeof element.PROGRESS === 'number' ? clamp(element.PROGRESS, 0, 1) : null;
    rows.push({ label, text, progress });
  }

  const extraKeys = kind === 'zombie' ? EXTRA_ZOMBIE_PROPS : EXTRA_PLANT_PROPS;
  const extraRows = [];
  for (const key of extraKeys) {
    if (usedProps.has(key)) continue;
    const value = props[key];
    const label = propLabels[key] || key;
    if (typeof value === 'number') {
      extraRows.push([label, TIME_ELEMENTS.has(key) ? t('seconds', { value: formatNumber(value) }) : formatNumber(value)]);
    } else if (typeof value === 'string' && value) {
      extraRows.push([label, value]);
    }
  }

  const specials = [];
  if (Array.isArray(almanac.Special)) {
    for (const item of almanac.Special) {
      if (!item) continue;
      const specialName = pickText(item.NAME, code);
      const specialDesc = pickText(item.DESCRIPTION, code);
      const line = [specialName, specialDesc].filter(Boolean).join(code === 'zh' ? '：' : ': ');
      if (line) specials.push(line);
    }
  }

  const health = snap.health;
  const healthText = health && typeof health.current === 'number'
    ? (typeof health.max === 'number' && health.max > 0
      ? `${formatNumber(health.current)} / ${formatNumber(health.max)}`
      : formatNumber(health.current))
    : '';

  const positionText = Number.isInteger(snap.laneIndex) && Number.isInteger(snap.columnIndex)
    ? t('position', { row: snap.laneIndex + 1, col: snap.columnIndex + 1 })
    : '';

  const kindText = kind === 'zombie' ? t('zombie') : t('plant');
  const kindClass = kind === 'zombie' ? 'ha-zombie' : 'ha-plant';

  const elementHtml = rows.map((row) => {
    if (row.progress !== null) {
      const pct = Math.round(row.progress * 100);
      return `<div class="ha-el ha-el-bar">
        <span class="ha-el-label">${escapeHtml(row.label)}</span>
        <span class="ha-bar"><i style="width:${pct}%"></i></span>
        <span class="ha-el-value">${escapeHtml(row.text || `${pct}%`)}</span>
      </div>`;
    }
    return `<div class="ha-el">
      <span class="ha-el-label">${escapeHtml(row.label)}</span>
      <span class="ha-el-value">${escapeHtml(row.text || '—')}</span>
    </div>`;
  }).join('');

  const extraHtml = extraRows.length
    ? `<div class="ha-props">${extraRows.map(([label, value]) => (
      `<span class="ha-prop"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`
    )).join('')}</div>`
    : '';

  const specialHtml = specials.length
    ? `<div class="ha-section"><h4>${escapeHtml(t('sectionSpecial'))}</h4><p>${specials.map((line) => escapeHtml(line)).join('<br>')}</p></div>`
    : '';

  const chatHtml = showChat && chat ? `<div class="ha-quote">${escapeHtml(chat)}</div>` : '';

  const healthHtml = healthText
    ? `<div class="ha-health"><span>${escapeHtml(t('healthLabel'))}</span><b>${escapeHtml(healthText)}</b></div>`
    : '';

  const metaBits = [positionText];
  if (healthText) metaBits.push(t('healthShort', { value: healthText }));
  const metaText = metaBits.filter(Boolean).join(' · ');

  const html = `
    <div class="ha-inner">
      <div class="ha-head ${kindClass}">
        <div class="ha-kind">${escapeHtml(kindText)}${codename ? ` · ${escapeHtml(codename)}` : ''}</div>
        <div class="ha-title">${escapeHtml(name)}</div>
        <div class="ha-sub">${escapeHtml(metaText)}</div>
      </div>
      <div class="ha-body">
        ${brief ? `<div class="ha-brief">${escapeHtml(brief)}</div>` : ''}
        ${elementHtml ? `<div class="ha-elements">${elementHtml}</div>` : ''}
        ${extraHtml}
        ${intro ? `<div class="ha-section"><h4>${escapeHtml(t('sectionIntro'))}</h4><p>${escapeHtml(intro)}</p></div>` : ''}
        ${specialHtml}
        ${healthHtml}
        ${chatHtml}
        ${!elementHtml && !intro && !brief && !chatHtml
          ? `<div class="ha-section"><p class="ha-muted">${escapeHtml(t('noEntry'))}</p></div>`
          : ''}
      </div>
      <div class="ha-foot">${escapeHtml(t('footer', { key: triggerLabel() }))}</div>
    </div>`;

  const raw = {
    kind,
    codename,
    className: snap.className,
    laneIndex: snap.laneIndex,
    columnIndex: snap.columnIndex,
    position: snap.position,
    health,
    name,
    lang: code,
    dataSource: liveAlmanac ? 'live' : (packed ? 'pack' : 'none'),
    bundledVersion: bundledData ? bundledData.source : null,
    project: projDiagnostics,
    almanac,
    props,
  };

  return { html, raw, key: cardKey(snap, code) };
}

function triggerLabel() {
  const option = TRIGGER_OPTIONS.find((item) => item.value === triggerKey);
  return option ? option.label : 'Shift';
}

/* ---------------------------------------------------------------- 样式 */

function ensureStyle() {
  if (styleEl || !document || !document.head) return;
  styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
#${RING_ID} {
  position: fixed;
  z-index: 2147482000;
  width: 0; height: 0;
  pointer-events: none;
  display: none;
}
#${RING_ID}::after {
  content: '';
  position: absolute;
  left: -26px; top: -26px;
  width: 52px; height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(150, 224, 94, .85);
  box-shadow: 0 0 12px rgba(120, 220, 70, .55);
  opacity: .9;
  animation: ha-ring-pulse 1.4s ease-in-out infinite;
}
@keyframes ha-ring-pulse {
  0%, 100% { transform: scale(.92); opacity: .55; }
  50% { transform: scale(1.06); opacity: .95; }
}
#${CARD_ID} {
  position: fixed;
  z-index: 2147482100;
  display: none;
  pointer-events: none;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
  color: #eef4e6;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, .55));
}
#${CARD_ID}.ha-visible { display: block; }
#${CARD_ID} .ha-inner {
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 340px;
  max-height: 74vh;
  border-radius: 12px;
  border: 1px solid rgba(150, 224, 94, .55);
  background: linear-gradient(160deg, rgba(30, 44, 26, .97), rgba(14, 22, 12, .97));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .05), inset 0 0 40px rgba(120, 220, 70, .07);
  cursor: default;
}
#${CARD_ID} .ha-head {
  flex: 0 0 auto;
  padding: 10px 14px 9px;
  border-bottom: 1px solid rgba(150, 224, 94, .28);
  background: linear-gradient(180deg, rgba(96, 160, 54, .42), rgba(96, 160, 54, .10));
  border-radius: 11px 11px 0 0;
}
#${CARD_ID} .ha-head.ha-zombie {
  background: linear-gradient(180deg, rgba(150, 74, 74, .45), rgba(120, 50, 50, .12));
}
#${CARD_ID} .ha-kind {
  font-size: 11px;
  letter-spacing: .06em;
  opacity: .78;
  text-transform: uppercase;
}
#${CARD_ID} .ha-title {
  margin-top: 2px;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .5);
}
#${CARD_ID} .ha-sub {
  margin-top: 3px;
  font-size: 11.5px;
  opacity: .72;
}
#${CARD_ID} .ha-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 14px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(150, 224, 94, .6) rgba(255, 255, 255, .06);
}
#${CARD_ID} .ha-body::-webkit-scrollbar { width: 8px; }
#${CARD_ID} .ha-body::-webkit-scrollbar-track { background: rgba(255, 255, 255, .05); border-radius: 4px; }
#${CARD_ID} .ha-body::-webkit-scrollbar-thumb {
  background: rgba(150, 224, 94, .55);
  border-radius: 4px;
}
#${CARD_ID} .ha-body::-webkit-scrollbar-thumb:hover { background: rgba(150, 224, 94, .8); }
#${CARD_ID} .ha-brief {
  font-size: 13px;
  line-height: 1.45;
  color: #d8f0b8;
  margin-bottom: 8px;
}
#${CARD_ID} .ha-elements {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  margin-bottom: 8px;
}
#${CARD_ID} .ha-el {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .055);
}
#${CARD_ID} .ha-el-bar { grid-column: span 2; }
#${CARD_ID} .ha-el-label { opacity: .72; white-space: nowrap; }
#${CARD_ID} .ha-el-value { font-weight: 700; color: #f3ffe6; white-space: nowrap; }
#${CARD_ID} .ha-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .14);
  overflow: hidden;
}
#${CARD_ID} .ha-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #9ade5a, #e8c65a);
}
#${CARD_ID} .ha-props {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
  margin-bottom: 8px;
  font-size: 11.5px;
  opacity: .9;
}
#${CARD_ID} .ha-prop b { font-weight: 600; opacity: .65; margin-right: 4px; }
#${CARD_ID} .ha-section { margin-bottom: 7px; }
#${CARD_ID} .ha-section h4 {
  margin: 0 0 2px;
  font-size: 11px;
  letter-spacing: .08em;
  color: #a6d97a;
  font-weight: 700;
}
#${CARD_ID} .ha-section p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgba(238, 244, 230, .92);
}
#${CARD_ID} .ha-muted { opacity: .6; }
#${CARD_ID} .ha-health {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .055);
  margin-bottom: 7px;
}
#${CARD_ID} .ha-health span { opacity: .7; }
#${CARD_ID} .ha-quote {
  font-size: 11.5px;
  line-height: 1.5;
  font-style: italic;
  color: rgba(232, 214, 160, .92);
  border-left: 2px solid rgba(232, 198, 90, .5);
  padding-left: 8px;
  white-space: pre-wrap;
}
#${CARD_ID} .ha-foot {
  flex: 0 0 auto;
  padding: 5px 14px 7px;
  font-size: 10.5px;
  opacity: .5;
  text-align: right;
  border-top: 1px solid rgba(255, 255, 255, .06);
}
#${DEBUG_ID} {
  position: fixed;
  left: 12px; bottom: 12px;
  z-index: 2147482200;
  display: none;
  max-width: 460px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(8, 12, 8, .85);
  border: 1px solid rgba(150, 224, 94, .4);
  color: #d7f2bd;
  font: 11px/1.5 Consolas, "Courier New", monospace;
  white-space: pre-wrap;
  pointer-events: none;
}
#${DEBUG_ID}.ha-visible { display: block; }
`;
  document.head.appendChild(styleEl);
}

function ensureNodes() {
  if (!document || !document.body) return;
  if (!ringEl) {
    ringEl = document.createElement('div');
    ringEl.id = RING_ID;
    document.body.appendChild(ringEl);
  }
  if (!cardEl) {
    cardEl = document.createElement('div');
    cardEl.id = CARD_ID;
    // 卡片是交互区域：滚轮翻看、拦截点击，避免误操作游戏场景
    const stop = (event) => {
      event.stopPropagation();
    };
    cardEl.addEventListener('wheel', stop, { passive: true });
    cardEl.addEventListener('pointerdown', stop, true);
    cardEl.addEventListener('mousedown', stop, true);
    cardEl.addEventListener('mouseup', stop, true);
    cardEl.addEventListener('click', stop, true);
    cardEl.addEventListener('dblclick', stop, true);
    cardEl.addEventListener('contextmenu', stop, true);
    document.body.appendChild(cardEl);
  }
  if (!debugEl) {
    debugEl = document.createElement('div');
    debugEl.id = DEBUG_ID;
    document.body.appendChild(debugEl);
  }
}

/** 卡片可交互区域（未显示时返回 null） */
function cardRect() {
  if (!cardEl || !cardEl.classList.contains('ha-visible')) return null;
  const inner = cardEl.firstElementChild;
  if (!inner || typeof inner.getBoundingClientRect !== 'function') return null;
  const box = inner.getBoundingClientRect();
  if (!box || !box.width || !box.height) return null;
  return box;
}

function pointInCard(x, y, pad) {
  const box = cardRect();
  if (!box) return false;
  const margin = pad || 0;
  return x >= box.left - margin && x <= box.right + margin
    && y >= box.top - margin && y <= box.bottom + margin;
}

function hideCard() {
  if (cardEl) {
    const body = cardEl.querySelector ? cardEl.querySelector('.ha-body') : null;
    cardEl.classList.remove('ha-visible');
    if (body && body.scrollTop) body.scrollTop = 0;
  }
  if (ringEl) ringEl.style.display = 'none';
  activeId = null;
  activePoint = null;
  activeKey = '';
  overCard = false;
  retargetAt = 0;
}

function placeCard(point) {
  if (!cardEl) return;
  const inner = cardEl.firstElementChild;
  if (!inner) return;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const box = inner.getBoundingClientRect();
  const margin = 14;
  let left = point.x + 26;
  let top = point.y - box.height / 2;
  if (left + box.width > viewportW - margin) left = point.x - box.width - 26;
  if (left < margin) left = margin;
  top = clamp(top, margin, Math.max(margin, viewportH - box.height - margin));
  cardEl.style.left = `${Math.round(left)}px`;
  cardEl.style.top = `${Math.round(top)}px`;
}

function scrollState() {
  const body = cardEl && cardEl.querySelector ? cardEl.querySelector('.ha-body') : null;
  return body ? { body, top: body.scrollTop } : null;
}

function cardKey(snap, code) {
  const kind = snap.kind === 'zombie' ? 'zombie' : 'plant';
  return `${kind}:${snap.codename || ''}:${snap.id}:${code}`;
}

function cardVisible() {
  return Boolean(cardEl && cardEl.classList.contains('ha-visible'));
}

function showCard(snap, code, options) {
  if (!cardEl || !document || !document.body) return;
  const opts = options || {};
  const now = Date.now();
  const key = cardKey(snap, code);
  const changed = key !== activeKey;
  const shouldBuild = changed || (opts.allowRefresh && now - lastBuildAt > CARD_REFRESH_MS);

  if (shouldBuild) {
    const built = buildCard(snap, code);
    const saved = changed ? null : scrollState();
    cardEl.innerHTML = built.html;
    cardEl.style.transform = `scale(${panelScale})`;
    cardEl.style.transformOrigin = 'top left';
    lastBuildAt = now;
    lastRaw = built.raw;
    activeKey = key;
    if (saved && saved.body) {
      // 重建 HTML 后恢复滚动位置，避免正在翻看时跳回顶部
      const body = cardEl.querySelector ? cardEl.querySelector('.ha-body') : null;
      if (body) body.scrollTop = saved.top;
    }
  }

  cardEl.classList.add('ha-visible');
  if (ringEl && snap.position && projector) {
    const geom = getGeom();
    const point = geom ? projectPoint(projector, snap.position, geom) : null;
    if (point) {
      ringEl.style.display = 'block';
      ringEl.style.left = `${Math.round(point.x)}px`;
      ringEl.style.top = `${Math.round(point.y)}px`;
    }
  }
  if (!opts.freezeLayout) placeCard(activePoint || { x: pointers.x, y: pointers.y });
}

/* ---------------------------------------------------------------- 调试 */

function updateDebug() {
  if (!debugEl) return;
  if (!showDebug) {
    debugEl.classList.remove('ha-visible');
    return;
  }
  debugEl.classList.add('ha-visible');
  const geom = getGeom();
  const candidates = (projDiagnostics.candidates || [])
    .map((item) => `${item.label} g${item.grid} h${item.hit} s${item.spread}=${item.score}`)
    .join(' | ');
  const lines = [
    `开关: ${enabled ? '开' : '关'}  触发键: ${triggerLabel()}  按住: ${triggerHeld() ? '是' : '否'}  模式: ${projectionMode}`,
    `鼠标: ${Math.round(pointers.x)}, ${Math.round(pointers.y)}  在画面内: ${pointers.inside ? '是' : '否'}  在卡片上: ${overCard ? '是' : '否'}`,
    `实体: ${index.length}  投影: ${projDiagnostics.label} (score ${projDiagnostics.score}, 相机 ${projDiagnostics.cameras}, 样本 ${projDiagnostics.samples})`,
    `候选: ${candidates || '无'}`,
    `画布: ${geom ? `${Math.round(geom.rect.width)}x${Math.round(geom.rect.height)} @ ${geom.rect.left.toFixed(0)},${geom.rect.top.toFixed(0)} dpr ${geom.pixelRatioX.toFixed(2)}` : '无'}`,
    `锁定: ${activeId || '无'}${overCard ? ' (可滚轮)' : ''}`,
    lastRaw ? `数据: ${lastRaw.dataSource} · ${lastRaw.lang}${lastRaw.bundledVersion ? ` (包内置 ${lastRaw.bundledVersion})` : ''}` : '',
    indexError ? `索引错误: ${indexError}` : '',
  ].filter(Boolean);
  debugEl.textContent = lines.join('\n');
}

/* ---------------------------------------------------------------- 输入 */

function triggerHeld() {
  if (triggerKey === 'shift') return keys.shift || moveShift;
  if (triggerKey === 'control') return keys.control || moveControl;
  if (triggerKey === 'alt') return keys.alt || moveAlt;
  return false;
}

function markKey(event, down) {
  const key = String(event.key || '');
  const code = String(event.code || '');
  let matched = false;
  if (key === 'Shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
    keys.shift = down;
    if (!down) moveShift = false;
    matched = true;
  }
  if (key === 'Control' || code === 'ControlLeft' || code === 'ControlRight') {
    keys.control = down;
    if (!down) moveControl = false;
    matched = true;
  }
  if (key === 'Alt' || code === 'AltLeft' || code === 'AltRight') {
    keys.alt = down;
    if (!down) moveAlt = false;
    matched = true;
  }
  return matched;
}

function onKeyDown(event) {
  if (!enabled) return;
  const before = triggerHeld();
  markKey(event, true);
  // 长按会重复触发 keydown，只在刚按下的那一次做重建
  if (!before && triggerHeld()) {
    moveShift = false;
    refreshIndex(true);
    calibrate(true);
  }
}

function onKeyUp(event) {
  markKey(event, false);
  // 松开触发键才关闭图鉴
  if (!triggerHeld()) hideCard();
}

function onMove(event) {
  pointers.x = event.clientX;
  pointers.y = event.clientY;
  pointers.inside = true;
  // 失焦再回来时 keydown 可能丢了，用移动事件上的修饰键状态兜底
  moveShift = Boolean(event.shiftKey);
  moveControl = Boolean(event.ctrlKey);
  moveAlt = Boolean(event.altKey);
}

function onLeave(event) {
  // mouseout 会在元素之间冒泡，只有 relatedTarget 为空才是真的离开窗口
  if (event && event.relatedTarget) return;
  pointers.inside = false;
  hideCard();
}

function onBlur() {
  keys.shift = false;
  keys.control = false;
  keys.alt = false;
  moveShift = false;
  moveControl = false;
  moveAlt = false;
  pointers.inside = false;
  hideCard();
}

function onVisibility() {
  if (document.hidden) onBlur();
}

function installListeners() {
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('mouseout', onLeave, true);
  window.addEventListener('blur', onBlur, true);
  document.addEventListener('visibilitychange', onVisibility, true);
}

function removeListeners() {
  try {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('mouseout', onLeave, true);
    window.removeEventListener('blur', onBlur, true);
    document.removeEventListener('visibilitychange', onVisibility, true);
  } catch (_) {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- 主循环 */

function tick() {
  if (disposed) return;
  rafId = window.requestAnimationFrame(tick);

  if (!enabled) {
    if (cardVisible() || activeId) hideCard();
    updateDebug();
    return;
  }

  if (!triggerHeld()) {
    if (cardVisible() || activeId) hideCard();
    updateDebug();
    return;
  }

  lang = resolveLang();
  refreshIndex(false);
  calibrate(false);

  overCard = pointers.inside && pointInCard(pointers.x, pointers.y, 2);

  // 已锁定：只有松开触发键 / 对象消失 / 失焦才会关闭
  if (activeId) {
    const snap = findEntity(activeId);
    if (!snap) {
      log('info', '锁定的对象已消失，关闭图鉴');
      hideCard();
      updateDebug();
      return;
    }

    if (!overCard) {
      const geom = getGeom();
      const point = geom && projector ? projectPoint(projector, snap.position, geom) : null;
      if (point) activePoint = point;

      // 鼠标停到别的对象上足够久才换目标，避免顺路扫过时乱跳
      const hit = pickHover();
      if (hit && hit.snap.id !== activeId) {
        if (!retargetAt) retargetAt = Date.now();
        else if (Date.now() - retargetAt >= RETARGET_MS) {
          activeId = hit.snap.id;
          activePoint = hit.point;
          activeKey = '';
          retargetAt = 0;
        }
      } else {
        retargetAt = 0;
      }
    } else {
      retargetAt = 0;
    }

    const current = findEntity(activeId) || snap;
    showCard(current, lang, { allowRefresh: !overCard, freezeLayout: overCard });
    updateDebug();
    return;
  }

  // 还没锁定：指到谁就锁定谁
  const hit = pickHover();
  if (!hit) {
    updateDebug();
    return;
  }
  activeId = hit.snap.id;
  activePoint = hit.point;
  activeKey = '';
  lastBuildAt = 0;
  showCard(hit.snap, lang, { allowRefresh: true });
  updateDebug();
}

/* ------------------------------------------------------------ 设置与面板 */

async function readSettings() {
  try {
    enabled = (await ctx.settings.get('enabled')) !== false;
  } catch (_) {
    enabled = DEFAULT_SETTINGS.enabled;
  }
  try {
    const value = String(await ctx.settings.get('trigger') || DEFAULT_SETTINGS.trigger);
    triggerKey = TRIGGER_OPTIONS.some((item) => item.value === value) ? value : 'shift';
  } catch (_) {
    triggerKey = DEFAULT_SETTINGS.trigger;
  }
  try {
    const value = String(await ctx.settings.get('language') || DEFAULT_SETTINGS.language);
    languageMode = ['auto', 'zh', 'en'].includes(value) ? value : 'auto';
  } catch (_) {
    languageMode = DEFAULT_SETTINGS.language;
  }
  try {
    const value = String(await ctx.settings.get('projection') || DEFAULT_SETTINGS.projection);
    projectionMode = PROJECTION_OPTIONS.some((item) => item.value === value) ? value : 'auto';
  } catch (_) {
    projectionMode = DEFAULT_SETTINGS.projection;
  }
  try {
    const value = Number(await ctx.settings.get('offsetX'));
    offsetX = Number.isFinite(value) ? clamp(value, -600, 600) : 0;
  } catch (_) {
    offsetX = 0;
  }
  try {
    const value = Number(await ctx.settings.get('offsetY'));
    offsetY = Number.isFinite(value) ? clamp(value, -600, 600) : 0;
  } catch (_) {
    offsetY = 0;
  }
  try {
    showChat = (await ctx.settings.get('showChat')) !== false;
  } catch (_) {
    showChat = DEFAULT_SETTINGS.showChat;
  }
  try {
    showDebug = (await ctx.settings.get('showDebug')) === true;
  } catch (_) {
    showDebug = DEFAULT_SETTINGS.showDebug;
  }
  try {
    const scale = Number(await ctx.settings.get('scale'));
    panelScale = Number.isFinite(scale) ? clamp(scale, 0.75, 1.6) : DEFAULT_SETTINGS.scale;
  } catch (_) {
    panelScale = DEFAULT_SETTINGS.scale;
  }
}

async function defineSettings() {
  await ctx.settings.defineSchema({
    title: t('panelTitle'),
    description: t('panelDesc'),
    fields: [
      { key: 'enabled', type: 'toggle', label: t('optEnabled'), default: DEFAULT_SETTINGS.enabled },
      {
        key: 'trigger',
        type: 'select',
        label: t('optTrigger'),
        options: TRIGGER_OPTIONS,
        default: DEFAULT_SETTINGS.trigger,
      },
      { key: 'showChat', type: 'toggle', label: t('optChat'), default: DEFAULT_SETTINGS.showChat },
      {
        key: 'language',
        type: 'select',
        label: t('optLanguage'),
        options: [
          { label: t('langAuto'), value: 'auto' },
          { label: t('langZh'), value: 'zh' },
          { label: t('langEn'), value: 'en' },
        ],
        default: DEFAULT_SETTINGS.language,
      },
      { key: 'scale', type: 'slider', label: t('optScale'), min: 0.75, max: 1.6, step: 0.05, default: DEFAULT_SETTINGS.scale },
      {
        key: 'projection',
        type: 'select',
        label: t('optProjection'),
        options: [
          { label: t('projAuto'), value: 'auto' },
          { label: t('projCamera'), value: 'camera' },
          { label: t('projView'), value: 'view' },
        ],
        default: DEFAULT_SETTINGS.projection,
      },
      { key: 'offsetX', type: 'number', label: t('optOffsetX'), min: -600, max: 600, step: 1, default: 0 },
      { key: 'offsetY', type: 'number', label: t('optOffsetY'), min: -600, max: 600, step: 1, default: 0 },
      { key: 'showDebug', type: 'toggle', label: t('optDebug'), default: DEFAULT_SETTINGS.showDebug },
    ],
  });
}

function safeCall(fn) {
  try {
    return fn();
  } catch (_) {
    return null;
  }
}

async function dumpDiagnostics() {
  const payload = {
    at: new Date().toISOString(),
    lang,
    platform: safeCall(() => ctx.compat.getPlatformVersion()),
    gameState: safeCall(() => ctx.game.getState()),
    project: projDiagnostics,
    canvas: (() => {
      const geom = getGeom();
      return geom ? {
        width: geom.rect.width,
        height: geom.rect.height,
        left: geom.rect.left,
        top: geom.rect.top,
        pixelRatioX: geom.pixelRatioX,
        viewport: geom.viewport,
        scaleX: geom.scaleX,
        scaleY: geom.scaleY,
      } : null;
    })(),
    pointer: pointers,
    entityCount: index.length,
    indexError,
    projectors: projectors.map((item) => item.label),
    activeId,
    activePoint,
    raw: lastRaw,
  };
  try {
    const handle = await ctx.storage.open({
      scope: 'global',
      version: 1,
      defaults: { dump: null },
      validate: (value) => Boolean(value) && typeof value === 'object',
    });
    await handle.update((value) => ({ ...(value || {}), dump: payload }));
    ctx.ui.toast(t('toastDumped'), 'success');
    log('info', 'diagnostics stored');
  } catch (error) {
    log('warn', `存储诊断失败: ${String(error)}`);
    ctx.ui.toast(t('toastDumpFailed'), 'warning');
  }
  log('info', JSON.stringify(payload));
}

function defineControls() {
  try {
    ctx.controls.definePanel({
      title: t('panelTitle'),
      groups: [
        {
          title: t('controlGroup'),
          items: [
            {
              type: 'readonly',
              key: 'status',
              label: t('controlStatus'),
              getValue: () => t('statusValue', { label: projDiagnostics.label, count: index.length }),
            },
            {
              type: 'action',
              key: 'recalibrate',
              label: t('actionRecalibrate'),
              onClick: () => {
                refreshIndex(true);
                calibrate(true);
                ctx.ui.toast(t('toastProjection', { label: projDiagnostics.label }), 'info');
              },
            },
            {
              type: 'action',
              key: 'dump',
              label: t('actionDump'),
              onClick: () => dumpDiagnostics(),
            },
          ],
        },
      ],
    });
  } catch (error) {
    log('warn', `控制面板注册失败: ${String(error)}`);
  }
}

/* ------------------------------------------------------------ 生命周期 */

function cleanup() {
  if (disposed) return;
  disposed = true;
  if (rafId) {
    try {
      window.cancelAnimationFrame(rafId);
    } catch (_) {
      /* ignore */
    }
    rafId = 0;
  }
  removeListeners();
  for (const node of [cardEl, ringEl, debugEl, styleEl]) {
    try {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } catch (_) {
      /* ignore */
    }
  }
  cardEl = null;
  ringEl = null;
  debugEl = null;
  styleEl = null;
  activeId = null;
  activePoint = null;
  index = [];
}

export default {
  async setup(modCtx) {
    ctx = modCtx;
    lang = resolveLang();

    try {
      const unsafe = ctx.unsafe || {};
      engine = unsafe.engine || null;
      if (engine && typeof engine.getCc === 'function') cc = engine.getCc();
    } catch (error) {
      log('warn', `引擎访问失败: ${String(error)}`);
    }
    if (!cc) {
      try {
        // 兜底：有的版本把 cc 直接挂在全局
        cc = globalThis.cc || null;
      } catch (_) {
        cc = null;
      }
    }
    if (!cc) log('warn', '未能取得 cc，投影会退化为 view 模式');

    try {
      await defineSettings();
      await readSettings();
    } catch (error) {
      log('warn', `设置初始化失败: ${String(error)}`);
    }

    if (document && document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    ensureStyle();
    ensureNodes();
    installListeners();
    defineControls();
    loadBundledData();

    ctx.settings.onChange(async () => {
      await readSettings();
      calibrateAt = 0;
      hideCard();
    });
    ctx.settings.onApply(async () => {
      await readSettings();
      calibrateAt = 0;
      hideCard();
    });

    try {
      ctx.runtime.onDispose(() => cleanup());
    } catch (_) {
      /* ignore */
    }

    rafId = window.requestAnimationFrame(tick);
    log('info', `已加载 v${ctx.meta ? ctx.meta.version : '1.1.0'}，按住 ${triggerLabel()} 悬停查看图鉴`);
    ctx.ui.toast(t('toastLoaded', { key: triggerLabel() }), 'success');

    return () => cleanup();
  },

  dispose() {
    cleanup();
  },
};
