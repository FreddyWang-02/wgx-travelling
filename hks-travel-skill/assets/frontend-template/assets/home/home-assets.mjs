// Phase 4A · 首页生产资产运行时。
//
// 资产以独立 SVG 文件形式存放（assets/mascots、assets/homepage、assets/illustrations），
// 运行时按需取回并内联到 DOM。内联而不是 <img>，原因只有一个：
// 只有在同一文档里，CSS 才能对角色分部件（眼睛 / 尾巴 / 身体）做动效，
// 并让 prefers-reduced-motion 统一接管。
//
// 全部为同源静态文件，不请求任何外部域名；未接入网络时整页退化为「主题色 + 版式」。

const SCENE_IDS = ["coast", "city", "mountain", "nature", "heritage"];

const DOODLE_FILES = {
  sun: "sun.svg",
  cloud: "cloud.svg",
  airplane: "airplane.svg",
  "dashed-route": "dashed-route.svg",
  "map-pin": "map-pin.svg",
  waves: "waves.svg",
  compass: "compass.svg",
  camera: "camera.svg",
  suitcase: "suitcase.svg",
  flower: "flower.svg",
  tent: "tent.svg",
  coffee: "coffee.svg",
};

const MASCOT_FILES = {
  puppy: "travel-puppy.svg",
  cat: "travel-cat.svg",
};

export const HOME_ASSET_MANIFEST = {
  scenes: SCENE_IDS.map((id) => `../homepage/scene-${id}.svg`),
  mascots: Object.values(MASCOT_FILES).map((file) => `../mascots/${file}`),
  doodles: Object.values(DOODLE_FILES).map((file) => `../illustrations/${file}`),
};

export function homeAssetPaths() {
  return [...HOME_ASSET_MANIFEST.scenes, ...HOME_ASSET_MANIFEST.mascots, ...HOME_ASSET_MANIFEST.doodles];
}

async function fetchSvg(relativePath) {
  try {
    const response = await fetch(new URL(relativePath, import.meta.url));
    if (!response.ok) return null;
    const text = await response.text();
    // 只接受真正的 svg 根节点，避免把错误页或占位文本塞进 DOM。
    return text.includes("<svg") ? text.replace(/<\?xml[\s\S]*?\?>/g, "").trim() : null;
  } catch {
    return null;
  }
}

let cached = null;

// 单例：首页反复重绘（切换 Day、切 Tab）不会重复请求资产。
export async function loadHomeAssets() {
  if (cached) return cached;
  const [sceneTexts, mascotTexts, doodleTexts] = await Promise.all([
    Promise.all(SCENE_IDS.map((id) => fetchSvg(`../homepage/scene-${id}.svg`))),
    Promise.all(Object.values(MASCOT_FILES).map((file) => fetchSvg(`../mascots/${file}`))),
    Promise.all(Object.values(DOODLE_FILES).map((file) => fetchSvg(`../illustrations/${file}`))),
  ]);

  const scenes = {};
  SCENE_IDS.forEach((id, index) => {
    if (sceneTexts[index]) scenes[id] = sceneTexts[index];
  });
  const mascots = {};
  Object.keys(MASCOT_FILES).forEach((key, index) => {
    if (mascotTexts[index]) mascots[key] = mascotTexts[index];
  });
  const doodles = {};
  Object.keys(DOODLE_FILES).forEach((key, index) => {
    if (doodleTexts[index]) doodles[key] = doodleTexts[index];
  });

  cached = { scenes, mascots, doodles, ready: Object.keys(scenes).length > 0 };
  return cached;
}

export function resetHomeAssetsCache() {
  cached = null;
}
