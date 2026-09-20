// Phase 4A · Sunny Travel Storybook 首页的纯逻辑层。
// 与 ux.mjs 同一约定：只做「数据 → 用户语言 / markup」，不触碰 DOM，因此可以直接单测。
// 首页是独立视觉系统，体量足够大，单独成模块；app.mjs 只负责取资产与绑定事件。
//
// 核心原则：首页结构固定（Hero / 今日旅程 / 为什么 / 已锁定 / 旅行状态 / 别错过），
// 随目的地变化的只有「目的地主题层」——不换 UI，只换主题。

import {
  CONSTRAINT_SOURCE_LABELS,
  activeConstraints,
  constraintDetail,
  constraintHeading,
  currentStay,
  isItineraryItemLocked,
  planningReasonsFor,
  placeLockedBy,
  reasonKindLabel,
  tripStatusLabel,
  upcomingTransport,
} from "../../ux.mjs";

export const STORYBOOK_STYLE_ID = "storybook";

// 首页航线是固定构图（不是数据驱动的地理路线）；SVG 与 CSS offset-path 共用同一条。
export const STORYBOOK_ROUTE_PATH = "M28 172C96 168 112 118 176 112S262 96 300 66S366 44 392 38";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

const THEME_DEFS = {
  coast: {
    scene: "coast",
    label: "海岸",
    sub: "海风、慢走，把日子过得亮一点。",
    keywords: ["海", "岛", "湾", "滩", "冲绳", "济州", "济洲", "三亚", "厦门", "青岛", "大连", "舟山", "珠海", "巴厘", "圣托里尼", "马尔代夫", "长滩", "濑户内", "夏威夷", "普吉", "coast", "island", "beach", "seaside", "bali", "jeju", "santorini", "okinawa", "hawaii", "phuket", "maldives", "bay"],
    collage: ["海风很轻", "Sea you soon", "Good coffee, better days"],
    ambient: ["sun", "cloud", "waves"],
  },
  city: {
    scene: "city",
    label: "城市",
    sub: "城市亮起来了，先去吃点好的。",
    keywords: ["东京", "香港", "澳门", "台北", "上海", "北京", "广州", "深圳", "成都", "首尔", "新加坡", "曼谷", "吉隆坡", "纽约", "巴黎", "伦敦", "米兰", "大阪", "名古屋", "城市", "都市", "市区", "tokyo", "hong kong", "hongkong", "seoul", "singapore", "bangkok", "new york", "newyork", "paris", "london", "milan", "osaka", "city", "urban", "downtown", "metropolis"],
    collage: ["城市亮起来了", "City lights", "Late night snack"],
    ambient: ["cloud", "airplane", "compass"],
  },
  mountain: {
    scene: "mountain",
    label: "山野",
    sub: "山里空气很轻，路慢慢走。",
    keywords: ["瑞士", "云南", "四川", "西藏", "青海", "新疆", "甘南", "阿尔卑斯", "雪山", "高原", "因特拉肯", "少女峰", "采尔马特", "稻城", "香格里拉", "山", "switzerland", "alps", "interlaken", "zermatt", "jungfrau", "yunnan", "tibet", "mountain", "alpine", "lake"],
    collage: ["山在云里", "Take the scenic route", "Fresh air"],
    ambient: ["cloud", "sun", "tent"],
  },
  nature: {
    scene: "nature",
    label: "自然",
    sub: "阳光落在草上，什么都不用赶。",
    keywords: ["森林", "秋天", "秋日", "赏枫", "红叶", "北海道", "花海", "草原", "田园", "花园", "公园", "牧场", "薰衣草", "富良野", "富士", "湖", "温泉", "hokkaido", "furano", "fuji", "forest", "autumn", "fall foliage", "garden", "meadow", "flower", "countryside", "nature", "park"],
    collage: ["阳光正好", "Slow days", "Flower field"],
    ambient: ["sun", "flower", "cloud"],
  },
  heritage: {
    scene: "heritage",
    label: "人文",
    sub: "旧的屋檐下，藏着新的故事。",
    keywords: ["故宫", "古城", "古镇", "寺庙", "神社", "塔", "京都", "奈良", "西安", "洛阳", "平遥", "丽江", "大理", "徽州", "长城", "博物馆", "文化", "老城", "胡同", "巷", "kyoto", "nara", "xian", "temple", "shrine", "palace", "old town", "oldtown", "heritage", "history", "museum", "forbidden city"],
    collage: ["旧巷子", "Old town stories", "Lantern night"],
    ambient: ["flower", "cloud", "camera"],
  },
  default: {
    scene: "nature",
    label: "远行",
    sub: "世界很大，我们慢慢看。",
    keywords: [],
    collage: ["今天天气很好", "Good view, good mood", "Keep exploring"],
    ambient: ["sun", "cloud", "airplane"],
  },
};

// 只有判断不出目的地时才参考偏好。
const INTEREST_THEME_HINTS = {
  coast: "coast",
  nature: "mountain",
  hiking: "mountain",
  culture: "heritage",
  history: "heritage",
  architecture: "heritage",
  museum: "heritage",
  temple: "heritage",
  art: "heritage",
  shopping: "city",
  nightlife: "city",
  market: "city",
  food: "city",
  cafes: "city",
  photography: "nature",
  walking: "nature",
  onsen: "nature",
};

export const DESTINATION_THEME_IDS = Object.keys(THEME_DEFS);

export function themeSubtitle(themeId) {
  return THEME_DEFS[themeId]?.sub || THEME_DEFS.default.sub;
}

export function themeCollageCaptions(themeId) {
  return THEME_DEFS[themeId]?.collage || THEME_DEFS.default.collage;
}

export function themeAmbient(themeId) {
  return THEME_DEFS[themeId]?.ambient || THEME_DEFS.default.ambient;
}

export function themeSceneId(themeId) {
  return THEME_DEFS[themeId]?.scene || "nature";
}

export function themeLabel(themeId) {
  return THEME_DEFS[themeId]?.label || THEME_DEFS.default.label;
}

// 目的地的确定性高于偏好：能判断出目的地就按目的地，判断不出来才看 interests。
export function destinationTheme(trip, preferences = null) {
  const haystack = [trip?.destination, trip?.destinationCode, trip?.title, trip?.subtitle]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  for (const [id, def] of Object.entries(THEME_DEFS)) {
    if (!def.keywords.length) continue;
    if (def.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return id;
  }
  const rawInterests = Array.isArray(preferences?.interests) ? preferences.interests : [];
  const implied = rawInterests
    .filter((interest) => typeof interest === "string")
    .map((interest) => INTEREST_THEME_HINTS[interest.trim().toLowerCase()])
    .filter((themeId) => Boolean(THEME_DEFS[themeId]));
  if (implied.length) return implied[0];
  return "default";
}

function shortCode(name, fallback = "TRIP") {
  const text = String(name || "").trim();
  if (!text) return fallback;
  if (/^[\x20-\x7f]+$/.test(text)) return text.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  return text.slice(0, 4);
}

function dayItems(pack, dayId) {
  const items = Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : [];
  return items.filter((item) => item?.dayId === dayId).sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
}

// 焦点日：今天在行程内就是今天，否则取最近的未来日，最后回退到第一个有安排的日子。
export function homeFocusDay(pack, now = null) {
  const days = (Array.isArray(pack?.days) ? pack.days : []).filter((day) => day?.date);
  if (!days.length) return null;
  const sorted = [...days].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const today = typeof now?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now.date) ? now.date : null;
  if (today) {
    const same = sorted.find((day) => day.date === today);
    if (same) return same;
    const upcoming = sorted.find((day) => day.date > today);
    if (upcoming) return upcoming;
    return sorted[sorted.length - 1];
  }
  return sorted.find((day) => dayItems(pack, day.id).length) || sorted[0];
}

export function homeDayRelation(day, now = null) {
  if (!day?.date) return "upcoming";
  const today = typeof now?.date === "string" ? now.date : null;
  if (!today) return "upcoming";
  if (day.date === today) return "today";
  return day.date > today ? "upcoming" : "past";
}

export function homeJourney(pack, dayId = null, now = null) {
  const day = dayId
    ? (Array.isArray(pack?.days) ? pack.days : []).find((entry) => entry?.id === dayId) || null
    : homeFocusDay(pack, now);
  if (!day) return null;
  const stops = dayItems(pack, day.id).map((item, index) => {
    const place = (Array.isArray(pack?.places) ? pack.places : []).find((entry) => entry?.id === item.placeId) || null;
    const lockedBy = place?.id ? placeLockedBy(pack, place.id) : [];
    return {
      id: item.id,
      index: index + 1,
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      title: place?.name || item.title || "行程节点",
      note: item.notes || "",
      kind: item.kind || "activity",
      locked: isItineraryItemLocked(pack, item.id),
      lockedLabel: lockedBy.length ? constraintHeading(lockedBy[0]) : "",
    };
  });
  return { day, relation: homeDayRelation(day, now), stops };
}

const WHY_SUMMARY = {
  day_clustering: "今天几个地点集中在同一区域，可以减少跨区移动。",
  constraint_protection: "已经订好的安排保持不动，其余围着它们排。",
  preference_tradeoff: "按你的偏好做了取舍，节奏更贴近你。",
  weather_adaptation: "根据天气把户外段换成了更稳妥的选择。",
  transport_optimization: "换乘更顺，路上少折腾。",
  schedule_adjustment: "时间上更从容一点，不用赶。",
  other: "为了让今天更顺，做了这些安排。",
};

export function homeReasons(pack, dayId) {
  let scope = "day";
  let entries = planningReasonsFor(pack, { dayId });
  if (!entries.length) {
    const collected = [];
    const seen = new Set();
    for (const item of dayItems(pack, dayId)) {
      for (const reason of planningReasonsFor(pack, { itineraryItemId: item.id })) {
        if (!reason?.id || seen.has(reason.id)) continue;
        seen.add(reason.id);
        collected.push(reason);
      }
    }
    entries = collected;
  }
  // 焦点日当天没有记录时，退回全趟旅行的安排理由；
  // 只有整份数据都没有 decisionLog 才不显示这一块。
  if (!entries.length) {
    scope = "trip";
    const seen = new Set();
    entries = (Array.isArray(pack?.decisionLog) ? pack.decisionLog : []).filter((entry) => {
      if (!entry?.id || seen.has(entry.id) || !entry.reason) return false;
      seen.add(entry.id);
      return true;
    });
  }
  const list = entries.slice(0, 4).map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    label: reasonKindLabel(entry),
    reason: entry.reason || "",
    summary: WHY_SUMMARY[entry.kind] || WHY_SUMMARY.other,
  }));
  return { list, summary: list[0]?.summary || "", scope };
}

export function homeLockedGroups(pack) {
  return activeConstraints(pack).map((constraint) => ({
    id: constraint.id,
    heading: constraintHeading(constraint),
    detail: constraintDetail(constraint),
    source: CONSTRAINT_SOURCE_LABELS[constraint.source] || "已记录",
    kind: constraint.kind || "other",
  }));
}

// 复核信号来自三类数据，和 Phase 3 的 liveRecheckCount 口径一致，但只输出用户语言。
export function homeRecheckItems(pack) {
  const items = [];
  for (const source of Array.isArray(pack?.sources) ? pack.sources : []) {
    if (source?.freshness?.status === "needs-recheck") items.push(source.title || "信息来源");
  }
  for (const alternative of Array.isArray(pack?.alternatives) ? pack.alternatives : []) {
    if (alternative?.status === "needs-recheck") items.push(alternative.title || "备选方案");
  }
  for (const task of Array.isArray(pack?.tasks) ? pack.tasks : []) {
    if (task?.kind === "recheck" && task?.status === "pending") items.push(task.title || "待复核事项");
  }
  return items;
}

// 旅行状态一律用用户语言表达，不出现契约字段名。
export function homeTravelStatus(pack) {
  const rows = [];
  const stay = currentStay(pack);
  if (stay) {
    const place = (Array.isArray(pack?.places) ? pack.places : []).find((entry) => entry?.id === stay.placeId) || null;
    rows.push({
      tone: "ok",
      badge: "已确认",
      title: place?.name || "住宿",
      detail: `${stay.checkIn || "—"} 入住 · ${stay.checkOut || "—"} 退房`,
      mark: "🏨",
    });
  }
  const tasks = Array.isArray(pack?.tasks) ? pack.tasks : [];
  for (const task of tasks.filter((entry) => entry?.kind === "reservation").slice(0, 2)) {
    rows.push({
      tone: task.status === "done" ? "ok" : "info",
      badge: task.status === "done" ? "已预约" : "待完成",
      title: task.title || "预约",
      detail: task.dueAt?.localDate ? `截止 ${task.dueAt.localDate}` : "按计划完成即可",
      mark: "🎟️",
    });
  }
  const recheck = homeRecheckItems(pack);
  if (recheck.length) {
    rows.push({
      tone: "warn",
      badge: "建议复核",
      title: `${recheck.length} 项信息建议临行复核`,
      detail: `例如「${recheck[0]}」`,
      mark: "🌤️",
    });
  }
  return rows.slice(0, 4);
}

export function homeRouteCopy(pack) {
  const segment = upcomingTransport(pack);
  const trip = pack?.trip || {};
  const fromName = segment?.from?.name || "";
  const toName = segment?.to?.name || trip.destination || "目的地";
  const toCode = segment?.to?.code || trip.destinationCode || "";
  return {
    fromLabel: shortCode(segment?.from?.code || fromName, "HOME"),
    toLabel: shortCode(toCode || toName, "TRIP"),
    fromName: fromName || "出发地",
    toName: toName || "目的地",
    mode: segment?.mode || "",
    service: segment?.serviceNumber || "",
  };
}

export function homeInspiration(pack) {
  const places = Array.isArray(pack?.places) ? pack.places : [];
  if (!places.length) return [];
  const mustVisit = new Set();
  for (const constraint of activeConstraints(pack)) {
    if (constraint.kind !== "must_visit") continue;
    for (const ref of Array.isArray(constraint.relatedRefs) ? constraint.relatedRefs : []) {
      if (ref?.type === "place" && typeof ref.id === "string") mustVisit.add(ref.id);
    }
  }
  const usedIds = new Set((Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : []).map((item) => item?.placeId).filter(Boolean));
  const score = (place) => (mustVisit.has(place.id) ? 2 : 0) + (usedIds.has(place.id) ? 0 : 1) + ((place.links || []).length ? 1 : 0);
  return [...places]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .map((place, index) => ({
      id: place.id,
      name: place.name || "地点",
      note: homeInspirationNote(place),
      crop: ["a", "b", "c"][index % 3],
    }));
}

// 地址过长时用一句更口语的兜底文案，不让卡片变成地址栏。
function homeInspirationNote(place) {
  if ((place.links || []).length) return "有官方链接，出发前可以再看一眼。";
  const address = String(place.address || "").trim();
  if (address && address.length <= 18) return address;
  return "先记下来，路过就去看看。";
}

export function homeHeroCopy(pack, themeId) {
  const trip = pack?.trip || {};
  const days = Array.isArray(pack?.days) ? pack.days : [];
  const companions = Array.isArray(pack?.companions) ? pack.companions : [];
  const destination = trip.destination || trip.title || "旅行";
  const shortDate = (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5).replace("-", ".") : "");
  const startDate = trip.startDate || "";
  const endDate = trip.endDate || "";
  return {
    destination,
    destinationCode: trip.destinationCode || shortCode(destination),
    title: trip.title || destination,
    subtitle: themeSubtitle(themeId),
    themeLabel: themeLabel(themeId),
    dateRange: startDate && endDate ? `${shortDate(startDate)} — ${shortDate(endDate)}` : "",
    nights: days.length ? `${days.length} 天` : "",
    companions: companions.length,
    stops: Array.isArray(pack?.itineraryItems) ? pack.itineraryItems.length : 0,
    statusLabel: tripStatusLabel(pack?.tripStatus),
  };
}

// ── markup ───────────────────────────────────────────────────────────────────

function sceneMarkup(assets, themeId, className) {
  const svg = assets?.scenes?.[themeSceneId(themeId)];
  // 资产加载失败时不阻塞排版：退化成主题色面，版式完全不变。
  if (!svg) return `<span class="${className} sb-scene-missing" aria-hidden="true"></span>`;
  return `<span class="${className}" aria-hidden="true">${svg}</span>`;
}

function doodleMarkup(assets, name, className) {
  const svg = assets?.doodles?.[name];
  return svg ? `<span class="${className}" aria-hidden="true">${svg}</span>` : "";
}

function companionMarkup(assets, which, className = "") {
  const svg = assets?.mascots?.[which];
  return svg ? `<span class="sb-mascot sb-mascot-${which}${className ? ` ${className}` : ""}" aria-hidden="true">${svg}</span>` : "";
}

export function storybookHeroMarkup(pack, { assets = {}, mode = "read" } = {}) {
  const themeId = destinationTheme(pack?.trip, pack?.preferences);
  const hero = homeHeroCopy(pack, themeId);
  const route = homeRouteCopy(pack);
  const captions = themeCollageCaptions(themeId);
  const recheckCount = homeRecheckItems(pack).length;
  const lockedCount = homeLockedGroups(pack).length;

  const pills = [
    hero.statusLabel ? `<span class="sb-pill sb-pill-status">${escapeHtml(hero.statusLabel)}</span>` : "",
    lockedCount ? `<span class="sb-pill sb-pill-locked">🔒 已锁定 ${lockedCount} 项</span>` : "",
    recheckCount ? `<span class="sb-pill sb-pill-warn">🌤️ ${escapeHtml(`${recheckCount} 项待复核`)}</span>` : "",
    hero.nights ? `<span class="sb-pill sb-pill-plain">${escapeHtml(`${hero.nights} · ${hero.companions} 位同行`)}</span>` : "",
  ].filter(Boolean).join("");

  const ambient = themeAmbient(themeId)
    .map((name) => doodleMarkup(assets, name, `sb-ambient sb-ambient-${name}`))
    .join("");

  return `<section class="sb-hero" data-theme="${escapeHtml(themeId)}">
    ${sceneMarkup(assets, themeId, "sb-hero-scene")}
    <span class="sb-hero-veil" aria-hidden="true"></span>
    <span class="sb-hero-grain" aria-hidden="true"></span>
    ${ambient}
    <div class="sb-hero-grid">
      <div class="sb-hero-inner">
        <header class="sb-hero-head">
          <p class="sb-eyebrow"><b>${escapeHtml(hero.destinationCode)}</b> · ${escapeHtml(hero.dateRange || hero.themeLabel)}</p>
          <h1 class="sb-destination">${escapeHtml(hero.destination)}</h1>
          <span class="sb-title-swash" aria-hidden="true"><svg viewBox="0 0 300 24" preserveAspectRatio="none"><path d="M6 14C52 4 104 2 156 6c40 3 82 2 138-6" stroke-width="5"/><path d="M16 22c56-8 116-10 176-6 30 2 58 0 96-5" stroke-width="3.2" opacity=".5"/></svg></span>
          <p class="sb-hero-sub">${escapeHtml(hero.subtitle)}</p>
          <p class="sb-hero-meta">${escapeHtml(hero.title)}${hero.dateRange ? ` · ${escapeHtml(hero.dateRange)}` : ""} · ${escapeHtml(`${hero.stops} 个行程节点`)}</p>
        ${route.fromName ? `<p class="sb-hero-transport"><span aria-hidden="true">✈</span>${escapeHtml(route.fromName)} → ${escapeHtml(route.toName)}${route.service ? ` · ${escapeHtml(route.service)}` : ""}</p>` : ""}
        </header>
        <div class="sb-hero-actions">
          <button class="sb-cta sb-cta-primary" type="button" data-home-action="start-day">
            <span>开始今天的旅程</span>
            <svg class="sb-cta-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5.6 15.4 10 11 14.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="sb-cta sb-cta-secondary" type="button" data-home-action="ask-ai">
            <span class="sb-cta-mark" aria-hidden="true">✨</span><span>问问旅行 AI</span>
          </button>
        </div>
        <div class="sb-hero-pills">${pills}</div>
      </div>

      <div class="sb-hero-visual">
        <div class="sb-route">
          <svg class="sb-route-svg" viewBox="0 0 420 200" aria-hidden="true">
            <path class="sb-route-line" d="${STORYBOOK_ROUTE_PATH}" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="9 8"/>
            <g class="sb-route-pin sb-route-pin-from"><circle cx="28" cy="172" r="6.5"/></g>
            <g class="sb-route-pin sb-route-pin-to"><circle class="sb-route-halo" cx="392" cy="38" r="14" fill="none"/><circle cx="392" cy="38" r="7.5"/></g>
            <g class="sb-route-plane"><path d="M15 0-12-9.5-3.6 0-12 9.5z" fill="currentColor"/></g>
          </svg>
          <span class="sb-route-label sb-route-label-from">${escapeHtml(route.fromLabel)}</span>
          <span class="sb-route-label sb-route-label-to">${escapeHtml(route.toLabel)}</span>
        </div>

        <div class="sb-postmark" aria-hidden="true">
          <b>${escapeHtml(hero.destinationCode)}</b>
          <i>${escapeHtml(hero.dateRange || "")}</i>
          <em>${escapeHtml(hero.nights ? `${hero.nights} TRIP` : "TRIP")}</em>
        </div>

        <div class="sb-collage">
          <figure class="sb-postcard sb-postcard-1">
            <span class="sb-tape" aria-hidden="true"></span>
            ${sceneMarkup(assets, themeId, "sb-postcard-scene sb-crop-a")}
            <figcaption class="sb-postcard-cap">${escapeHtml(captions[0])}</figcaption>
          </figure>
          <figure class="sb-postcard sb-postcard-2">
            ${sceneMarkup(assets, themeId, "sb-postcard-scene sb-crop-b")}
            <figcaption class="sb-postcard-cap">${escapeHtml(captions[1])}</figcaption>
          </figure>
          <figure class="sb-postcard sb-postcard-3">
            <span class="sb-tape" aria-hidden="true"></span>
            ${sceneMarkup(assets, themeId, "sb-postcard-scene sb-crop-c")}
            <figcaption class="sb-postcard-cap">${escapeHtml(captions[2])}</figcaption>
          </figure>
        </div>

        <div class="sb-companions" aria-hidden="true">
          ${companionMarkup(assets, "cat")}
          ${companionMarkup(assets, "puppy")}
        </div>
      </div>
    </div>
    ${mode === "edit" ? `<div class="sb-hero-edit"><button class="text-button" type="button" data-open-editor="trip" data-default-day="${escapeHtml(homeFocusDay(pack)?.id || "")}"><i data-lucide="pencil"></i> 编辑旅程信息</button></div>` : ""}
  </section>`;
}

export function storybookJourneyMarkup(pack, { now = null, dayId = null } = {}) {
  const journey = homeJourney(pack, dayId, now);
  const head = (title, sub) => `<header class="sb-section-head"><span class="sb-section-kicker">TODAY'S JOURNEY</span><h2>${escapeHtml(title)}</h2><p class="sb-section-sub">${escapeHtml(sub)}</p></header>`;
  if (!journey) {
    return `<section class="sb-section sb-journey">${head("今天的旅程", "这份行程还没有可以展示的日程。")}</section>`;
  }
  const title = journey.relation === "today" ? "今天的旅程" : journey.relation === "past" ? "这一天的旅程" : "接下来的一天";
  const days = Array.isArray(pack?.days) ? pack.days : [];
  const chips = days.length > 1
    ? `<div class="sb-day-chips" role="tablist">${days.map((day, index) => {
      const active = day.id === journey.day.id;
      return `<button class="sb-day-chip${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" data-home-day="${escapeHtml(day.id)}"><b>Day ${index + 1}</b><small>${escapeHtml(String(day.date || "").slice(5).replace("-", "."))}</small></button>`;
    }).join("")}</div>`
    : "";

  const stops = journey.stops.length
    ? journey.stops.map((stop) => `<li class="sb-stop${stop.locked ? " is-locked" : ""}">
        <span class="sb-stop-time"><b>${escapeHtml(stop.startTime || "—")}</b><small>${escapeHtml(stop.endTime || "")}</small></span>
        <span class="sb-stop-dot" aria-hidden="true">${stop.index}</span>
        <span class="sb-stop-body">
          <b class="sb-stop-title">${escapeHtml(stop.title)}</b>
          ${stop.note ? `<small class="sb-stop-note">${escapeHtml(stop.note)}</small>` : ""}
          ${stop.locked ? `<span class="sb-stop-lock">🔒 ${escapeHtml(stop.lockedLabel || "已锁定")}</span>` : ""}
        </span>
      </li>`).join("")
    : `<li class="sb-stop sb-stop-empty">这一天还没有安排，可以问问旅行 AI 帮你补上。</li>`;

  return `<section class="sb-section sb-journey">
    ${head(title, `${journey.day.title || "当日安排"} · ${journey.day.date || ""}${journey.stops.length ? ` · ${journey.stops.length} 站` : ""}`)}
    ${chips}
    <ol class="sb-route-list">${stops}</ol>
  </section>`;
}

export function storybookWhyMarkup(pack, { now = null, dayId = null } = {}) {
  const journey = homeJourney(pack, dayId, now);
  if (!journey) return "";
  const { list, summary, scope } = homeReasons(pack, journey.day.id);
  if (!list.length) return "";
  const opening = scope === "trip" ? "这一趟的安排思路：" : "";
  return `<section class="sb-section sb-why">
    <header class="sb-section-head">
      <span class="sb-section-kicker">WHY THIS ROUTE</span>
      <h2><span class="sb-why-mark" aria-hidden="true">✨</span>为什么这样安排？</h2>
      ${summary ? `<p class="sb-section-sub">${escapeHtml(opening + summary)}</p>` : ""}
    </header>
    <div class="sb-why-list">
      ${list.map((entry) => `<div class="sb-why-row"><span class="sb-why-tag">${escapeHtml(entry.label)}</span><p>${escapeHtml(entry.reason)}</p></div>`).join("")}
    </div>
  </section>`;
}

export function storybookLockedMarkup(pack) {
  const rows = homeLockedGroups(pack);
  if (!rows.length) return "";
  return `<section class="sb-section sb-locked">
    <header class="sb-section-head">
      <span class="sb-section-kicker">LOCKED PLANS</span>
      <h2><span aria-hidden="true">🔒</span> 已锁定安排</h2>
      <p class="sb-section-sub">AI 调整行程时不会移动这些安排。</p>
    </header>
    <div class="sb-lock-list">
      ${rows.map((row) => `<article class="sb-lock-row">
        <span class="sb-lock-mark" aria-hidden="true">🔒</span>
        <div class="sb-lock-body"><b>${escapeHtml(row.heading)}</b><p>${escapeHtml(row.detail)}</p></div>
        <span class="sb-lock-source">${escapeHtml(row.source)}</span>
      </article>`).join("")}
    </div>
  </section>`;
}

export function storybookStatusMarkup(pack, { assets = {} } = {}) {
  const rows = homeTravelStatus(pack);
  if (!rows.length) return "";
  return `<section class="sb-section sb-status">
    <header class="sb-section-head">
      <span class="sb-section-kicker">TRAVEL STATUS</span>
      <h2>旅行状态</h2>
      <p class="sb-section-sub">出发前确认这几件事就够了。</p>
    </header>
    <div class="sb-status-list">
      ${rows.map((row) => `<article class="sb-status-row" data-tone="${escapeHtml(row.tone)}">
        <span class="sb-status-mark" aria-hidden="true">${escapeHtml(row.mark)}</span>
        <div class="sb-status-body"><b>${escapeHtml(row.title)}</b><p>${escapeHtml(row.detail)}</p></div>
        <span class="sb-status-badge">${escapeHtml(row.badge)}</span>
      </article>`).join("")}
    </div>
    ${companionMarkup(assets, "puppy", "sb-status-puppy")}
  </section>`;
}

export function storybookInspirationMarkup(pack, { assets = {} } = {}) {
  const items = homeInspiration(pack);
  if (!items.length) return "";
  const themeId = destinationTheme(pack?.trip, pack?.preferences);
  return `<section class="sb-section sb-inspiration">
    <header class="sb-section-head">
      <span class="sb-section-kicker">DON'T MISS</span>
      <h2>别错过</h2>
      <p class="sb-section-sub">路过的时候，记得抬头看一眼。</p>
    </header>
    <div class="sb-inspire-grid">
      ${items.map((item) => `<article class="sb-inspire-card">
        ${sceneMarkup(assets, themeId, `sb-inspire-scene sb-crop-${escapeHtml(item.crop)}`)}
        <div class="sb-inspire-body"><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.note)}</p></div>
      </article>`).join("")}
    </div>
  </section>`;
}

export function storybookHomeMarkup(pack, { assets = {}, now = null, mode = "read", dayId = null } = {}) {
  const themeId = destinationTheme(pack?.trip, pack?.preferences);
  // 主栏放「今天怎么走」，侧栏放「为什么 / 锁了什么 / 状态」，灵感区收尾。
  return `<div class="sb-home" data-theme="${escapeHtml(themeId)}">
    ${storybookHeroMarkup(pack, { assets, mode })}
    <div class="sb-body">
      <div class="sb-col sb-col-main">${storybookJourneyMarkup(pack, { now, dayId })}${storybookWhyMarkup(pack, { now, dayId })}</div>
      <div class="sb-col sb-col-side">${storybookLockedMarkup(pack)}${storybookStatusMarkup(pack, { assets })}</div>
    </div>
    ${storybookInspirationMarkup(pack, { assets })}
  </div>`;
}
