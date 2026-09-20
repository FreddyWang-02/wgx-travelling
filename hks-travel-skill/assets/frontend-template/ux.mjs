// Phase 3 — Product UX 架构的纯逻辑层。
// 这里只做数据到用户语言的映射与上下文组装，不触碰 DOM，便于自动化测试。
// TravelPack 1.2 的新字段全部按可选处理：1.1 数据不会因为缺少字段而报错。

export const PRODUCT_MODULES = [
  { id: "overview", label: "概览", icon: "layout-dashboard", kicker: "OVERVIEW" },
  { id: "itinerary", label: "行程", icon: "route", kicker: "ITINERARY" },
  { id: "prepare", label: "准备", icon: "list-checks", kicker: "PREPARE" },
  { id: "expenses", label: "记账", icon: "wallet-cards", kicker: "EXPENSES" },
  { id: "materials", label: "资料", icon: "folder-open", kicker: "MATERIALS" },
];

// 地图是「行程」内部视图，AI Copilot 是全局能力，两者都不是一级导航。
export const ITINERARY_VIEWS = [
  { id: "list", label: "行程" },
  { id: "map", label: "地图" },
];

export const TRIP_STATUS_LABELS = {
  planning: "正在规划",
  confirmed: "行程已确认",
  "in-progress": "旅行进行中",
  completed: "旅程完成",
};

export const REPLAN_TRIGGER_LABELS = {
  rain: "天气变化",
  tired: "体力调整",
  late_start: "出发时间变化",
  closure: "地点状态变化",
  add_place: "新增地点",
  remove_place: "删除地点",
  hotel_change: "住宿变化",
  user_request: "用户主动调整",
  other: "其他变化",
};

export const REPLAN_STATUS_LABELS = {
  proposed: "待确认",
  applied: "已应用",
  cancelled: "已取消",
};

export const CONSTRAINT_KIND_LABELS = {
  flight: "航班",
  stay: "住宿",
  reservation: "预约",
  event: "活动",
  must_visit: "必去地点",
  mobility: "行动限制",
  fixed_schedule: "固定安排",
  other: "其他安排",
};

export const CONSTRAINT_SOURCE_LABELS = {
  user: "用户指定",
  booking: "订单确认",
  material: "资料记录",
  external: "外部信息",
};

export const ALTERNATIVE_STATUS_LABELS = {
  available: "可选",
  selected: "已采用",
  rejected: "已排除",
  "needs-recheck": "建议复核",
};

export const DECISION_KIND_LABELS = {
  day_clustering: "同日安排",
  constraint_protection: "锁定安排",
  preference_tradeoff: "偏好权衡",
  weather_adaptation: "天气调整",
  transport_optimization: "交通优化",
  schedule_adjustment: "时间调整",
  other: "行程安排",
};

const PACE_LABELS = { relaxed: "轻松", balanced: "均衡", packed: "充实" };
const WALKING_LABELS = { low: "少走路", medium: "适量步行", high: "能走很多" };
const CROWD_LABELS = { low: "不喜欢拥挤", medium: "人群可接受", high: "不介意人多" };
const BUDGET_LABELS = { economy: "预算优先", balanced: "预算均衡", comfort: "舒适优先", premium: "高端体验" };

// interests 是开放词表，未知值原样展示，不做封闭枚举。
const INTEREST_LABELS = {
  food: "美食",
  photography: "拍照",
  coast: "海岸",
  shopping: "购物",
  cafes: "咖啡馆",
  culture: "文化",
  history: "历史",
  walking: "步行漫游",
  nature: "自然",
  art: "艺术",
  museum: "博物馆",
  architecture: "建筑",
  nightlife: "夜生活",
  hiking: "徒步",
  onsen: "温泉",
  market: "市集",
  temple: "寺庙",
};

// 一级导航固定 5 项；Copilot 快捷动作是全局能力，不进入导航。
export const COPILOT_QUICK_ACTIONS = [
  { id: "tired", mark: "😴", label: "今天太累了", action: "replan-day", text: "今天比较累，请减少步行和跨区移动。" },
  { id: "rain", mark: "🌧️", label: "下雨了", action: "replan-day", text: "下雨了，请把户外行程换成室内安排。" },
  { id: "late", mark: "🕙", label: "明天晚一点出发", action: "replan-day", text: "明天想晚一点出发，请把早间行程往后调整。" },
  { id: "food", mark: "🍜", label: "加一家餐厅", action: "add-place", text: "想在这一天加一家餐厅。" },
  { id: "photo", mark: "📷", label: "想找拍照地点", action: "add-place", text: "想找适合拍照的地点。" },
  { id: "budget", mark: "💰", label: "今天想少花一点", action: "replan-day", text: "今天想少花一点，请优先保留免费或低成本安排。" },
];

export const AGENT_BRIDGE_METHOD = "requestAgentUpdate";

export function tripStatusLabel(status) {
  return TRIP_STATUS_LABELS[status] || null;
}

export function moduleLabel(id) {
  return PRODUCT_MODULES.find((entry) => entry.id === id)?.label || null;
}

export function preferenceChips(preferences) {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return [];
  const chips = [];
  if (PACE_LABELS[preferences.pace]) chips.push({ key: "pace", label: PACE_LABELS[preferences.pace] });
  if (WALKING_LABELS[preferences.walkingTolerance]) chips.push({ key: "walkingTolerance", label: WALKING_LABELS[preferences.walkingTolerance] });
  if (CROWD_LABELS[preferences.crowdTolerance]) chips.push({ key: "crowdTolerance", label: CROWD_LABELS[preferences.crowdTolerance] });
  if (BUDGET_LABELS[preferences.budgetPreference]) chips.push({ key: "budgetPreference", label: BUDGET_LABELS[preferences.budgetPreference] });
  for (const interest of Array.isArray(preferences.interests) ? preferences.interests : []) {
    if (typeof interest !== "string" || !interest.trim()) continue;
    chips.push({ key: "interests", label: INTEREST_LABELS[interest.trim()] || interest.trim() });
  }
  return chips;
}

export function preferenceNoteList(preferences) {
  if (!preferences || !Array.isArray(preferences.notes)) return [];
  return preferences.notes.filter((note) => typeof note === "string" && note.trim());
}

export function activeConstraints(pack) {
  const list = Array.isArray(pack?.constraints) ? pack.constraints : [];
  return list.filter((constraint) => constraint && constraint.status === "active");
}

export function constraintHeading(constraint) {
  const kind = CONSTRAINT_KIND_LABELS[constraint?.kind] || "安排";
  const time = constraint?.startAt ? String(constraint.startAt).replace("T", " ") : "";
  return time ? `${kind} · ${time}` : kind;
}

export function constraintDetail(constraint) {
  return constraint?.description || "";
}

// 被 active constraint 引用的对象键集合，形如 "itineraryItem:item-palace"。
export function lockedRefKeys(pack) {
  const keys = new Set();
  for (const constraint of activeConstraints(pack)) {
    for (const ref of Array.isArray(constraint.relatedRefs) ? constraint.relatedRefs : []) {
      if (ref && typeof ref.type === "string" && typeof ref.id === "string") keys.add(`${ref.type}:${ref.id}`);
    }
  }
  return keys;
}

export function isItineraryItemLocked(pack, itemId) {
  if (!itemId) return false;
  const keys = lockedRefKeys(pack);
  if (keys.has(`itineraryItem:${itemId}`)) return true;
  // 约束直接引用地点时，访问该地点的行程节点同样视为锁定。
  const placeId = (Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : []).find((item) => item?.id === itemId)?.placeId;
  return Boolean(placeId && keys.has(`place:${placeId}`));
}

export function placeLockedBy(pack, placeId) {
  return activeConstraints(pack).filter((constraint) => (constraint.relatedRefs || []).some((ref) => ref?.type === "place" && ref.id === placeId));
}

// decisionLog 中与当前节点相关的可解释理由（只输出短理由）。
export function planningReasonsFor(pack, { itineraryItemId = null, dayId = null, placeId = null } = {}) {
  const wanted = new Set();
  if (itineraryItemId) wanted.add(`itineraryItem:${itineraryItemId}`);
  if (dayId) wanted.add(`day:${dayId}`);
  if (placeId) wanted.add(`place:${placeId}`);
  if (!wanted.size) return [];
  const log = Array.isArray(pack?.decisionLog) ? pack.decisionLog : [];
  return log.filter((entry) => (entry?.relatedRefs || []).some((ref) => wanted.has(`${ref?.type}:${ref?.id}`)));
}

export function reasonKindLabel(entry) {
  return DECISION_KIND_LABELS[entry?.kind] || "行程安排";
}

export function alternativesFor(pack, { itineraryItemId = null, placeId = null } = {}) {
  const list = Array.isArray(pack?.alternatives) ? pack.alternatives : [];
  return list.filter((alternative) => {
    const ref = alternative?.relatedRef;
    if (!ref) return false;
    if (itineraryItemId && ref.id === itineraryItemId) return true;
    if (placeId && ref.id === placeId) return true;
    return false;
  });
}

export function alternativeStatusLabel(status) {
  return ALTERNATIVE_STATUS_LABELS[status] || status || "可选";
}

// 入口按钮语义跟随相关备选的状态：
// 还有可选方案 → 「换一个」；只剩已采用的方案 → 「重新选择」。
export function swapEntryLabel(list) {
  const alternatives = Array.isArray(list) ? list : [];
  if (alternatives.some((entry) => entry?.status === "available")) return "换一个";
  if (alternatives.some((entry) => entry?.status === "selected")) return "重新选择";
  return "换一个";
}

export function replanSummaries(pack, dayLookup = () => null) {
  const list = Array.isArray(pack?.replanHistory) ? pack.replanHistory : [];
  return list.map((entry) => {
    const dayLabels = (Array.isArray(entry?.affectedDayIds) ? entry.affectedDayIds : [])
      .map((id) => dayLookup(id))
      .filter(Boolean);
    return {
      id: entry?.id || null,
      triggerLabel: REPLAN_TRIGGER_LABELS[entry?.trigger] || "行程调整",
      statusLabel: REPLAN_STATUS_LABELS[entry?.status] || "待确认",
      createdAt: entry?.createdAt || "",
      dayLabels,
      summary: entry?.summary || "",
    };
  });
}

// 分桶边界不变：仅用户展示文案从「出发前 1 天」改为更准确的「出发前一周内」。
export const TASK_PHASE_ORDER = ["出发前 30 天", "出发前 7 天", "出发前一周内", "旅行中", "旅行后", "待排期"];

const DAY_MS = 24 * 60 * 60 * 1000;
const toDate = (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null);
const dayDiff = (later, earlier) => Math.round((later.getTime() - earlier.getTime()) / DAY_MS);

export function taskPhase(dueDate, trip) {
  const due = toDate(dueDate);
  if (!due) return "待排期";
  const start = toDate(trip?.startDate);
  const end = toDate(trip?.endDate) || start;
  if (!start) return "待排期";
  if (due >= start && due <= end) return "旅行中";
  if (due > end) return "旅行后";
  const daysBefore = dayDiff(start, due);
  if (daysBefore >= 30) return "出发前 30 天";
  if (daysBefore >= 7) return "出发前 7 天";
  return "出发前一周内";
}

export function groupTasksByPhase(pack) {
  const tasks = Array.isArray(pack?.tasks) ? pack.tasks : [];
  const buckets = new Map(TASK_PHASE_ORDER.map((phase) => [phase, []]));
  for (const task of tasks) {
    const phase = taskPhase(task?.dueAt?.localDate, pack?.trip);
    buckets.get(phase).push(task);
  }
  for (const [, list] of buckets) {
    list.sort((a, b) => String(a?.dueAt?.localDate || "9999").localeCompare(String(b?.dueAt?.localDate || "9999")));
  }
  return TASK_PHASE_ORDER.filter((phase) => buckets.get(phase).length).map((phase) => ({ phase, tasks: buckets.get(phase) }));
}

export function sourceFreshness(source, today = null) {
  const freshness = source?.freshness || {};
  const validUntil = typeof freshness.validUntil === "string" ? freshness.validUntil : null;
  const expired = Boolean(validUntil && today && validUntil < today);
  if (freshness.status === "needs-recheck") return { label: "建议复核", tone: "warn" };
  if (freshness.status === "current") return expired ? { label: "已过期", tone: "danger" } : { label: "当前有效", tone: "ok" };
  return { label: "待复核", tone: "warn" };
}

export function recheckSnapshot(pack) {
  const meta = pack?.planningMeta;
  if (!meta || !Number.isInteger(meta.needsRecheckCount) || meta.needsRecheckCount < 0) return null;
  return {
    count: meta.needsRecheckCount,
    at: meta.lastPlannedAt || meta.generatedAt || "",
    // 契约规定该字段是规划快照值，不是实时派生值。
    text: `规划时有 ${meta.needsRecheckCount} 项信息待复核`,
    live: liveRecheckCount(pack),
  };
}

// 实时数量按当前数据重新计算，仅用于说明差异，不写回 TravelPack。
export function liveRecheckCount(pack) {
  const sources = (Array.isArray(pack?.sources) ? pack.sources : []).filter((source) => source?.freshness?.status === "needs-recheck").length;
  const alternatives = (Array.isArray(pack?.alternatives) ? pack.alternatives : []).filter((entry) => entry?.status === "needs-recheck").length;
  const tasks = (Array.isArray(pack?.tasks) ? pack.tasks : []).filter((task) => task?.kind === "recheck" && task?.status === "pending").length;
  return sources + alternatives + tasks;
}

function sortedDayItems(pack, dayId) {
  const items = Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : [];
  return items.filter((item) => item?.dayId === dayId).sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
}

export function itineraryItemContext(pack, itemId) {
  const item = (Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : []).find((entry) => entry?.id === itemId) || null;
  if (!item) return null;
  return {
    item,
    day: (Array.isArray(pack?.days) ? pack.days : []).find((day) => day?.id === item.dayId) || null,
    place: (Array.isArray(pack?.places) ? pack.places : []).find((place) => place?.id === item.placeId) || null,
  };
}

// 无法可靠判断「当前」时返回 estimated，界面显示「下一项计划」而不是伪造实时状态。
export function nextItineraryItem(pack, now = null) {
  const days = Array.isArray(pack?.days) ? pack.days : [];
  const items = Array.isArray(pack?.itineraryItems) ? pack.itineraryItems : [];
  if (!days.length || !items.length) return null;
  const build = (item, day, estimated) => ({ item, day, place: (pack.places || []).find((place) => place?.id === item.placeId) || null, estimated });
  const today = toDate(now?.date);
  if (today) {
    const sameDay = days.find((day) => day?.date === now.date);
    if (sameDay) {
      const remaining = sortedDayItems(pack, sameDay.id).find((item) => !item.endTime || item.endTime >= (now.time || "00:00"));
      if (remaining) return build(remaining, sameDay, !now.time);
      const later = days.filter((day) => day.date > now.date).sort((a, b) => a.date.localeCompare(b.date))[0];
      const nextItem = later ? sortedDayItems(pack, later.id)[0] : null;
      return nextItem ? build(nextItem, later, true) : null;
    }
    const upcoming = days.filter((day) => day.date > now.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (upcoming) {
      const nextItem = sortedDayItems(pack, upcoming.id)[0];
      if (nextItem) return build(nextItem, upcoming, true);
    }
    return null;
  }
  const firstDayWithItems = days.find((day) => sortedDayItems(pack, day.id).length);
  if (!firstDayWithItems) return null;
  return build(sortedDayItems(pack, firstDayWithItems.id)[0], firstDayWithItems, true);
}

export function upcomingTransport(pack) {
  const segments = Array.isArray(pack?.transportSegments) ? pack.transportSegments : [];
  const active = segments.filter((segment) => segment?.status !== "cancelled");
  return active.find((segment) => segment.purpose === "outbound") || active[0] || null;
}

export function currentStay(pack) {
  const stays = Array.isArray(pack?.stays) ? pack.stays : [];
  return stays.find((stay) => stay?.status !== "cancelled") || null;
}

export function hasAgentBridge(adapter = null) {
  const target = adapter || (typeof window !== "undefined" ? window.TRAVEL_HOST_ADAPTER : null);
  return typeof target?.[AGENT_BRIDGE_METHOD] === "function";
}

// 交给宿主的请求只带上下文，不带任何凭据；前端不保存模型 Key，也不直接调用模型接口。
export function buildAgentRequest({ action, pack, text = "", module = null, dayId = null, itineraryItemId = null } = {}) {
  return {
    action: action || "freeform",
    tripId: pack?.trip?.id || null,
    dayId: dayId || null,
    itineraryItemId: itineraryItemId || null,
    text: String(text || ""),
    context: {
      module: module || null,
      schemaVersion: pack?.schemaVersion || null,
      tripStatus: pack?.tripStatus || null,
      selectedDayId: dayId || null,
      selectedItineraryItemId: itineraryItemId || null,
    },
  };
}

export function contextSummary(pack, { module = null, dayId = null, itineraryItemId = null } = {}) {
  if (!pack) return "";
  const parts = [moduleLabel(module) || "当前页面"];
  const day = (pack.days || []).find((entry) => entry?.id === dayId);
  if (day) parts.push(`${day.title || "当日"}（${day.date}）`);
  const item = itineraryItemContext(pack, itineraryItemId);
  if (item?.place) parts.push(item.place.name);
  const status = tripStatusLabel(pack.tripStatus);
  if (status) parts.push(status);
  return parts.join(" · ");
}

const ACTION_TITLES = {
  "replan-day": "调整这一天",
  "add-place": "增加地点",
  "swap-item": "更换地点",
  ask: "询问行程",
  freeform: "调整请求",
};

// 无 Host Adapter 时的兜底：生成一段可复制、可交给 Skill Agent 的结构化请求。
export function formatAgentRequestText(request, { tripTitle = "", dayTitle = "", placeName = "" } = {}) {
  const lines = ["【AI Travel Copilot 调整请求】"];
  const title = tripTitle || request?.tripId;
  if (title) lines.push(`- 旅行：${title}`);
  if (dayTitle) lines.push(`- 日期：${dayTitle}`);
  else if (request?.dayId) lines.push(`- 日期：${request.dayId}`);
  if (placeName) lines.push(`- 当前节点：${placeName}`);
  lines.push(`- 诉求：${request?.text || ACTION_TITLES[request?.action] || "调整行程"}`);
  lines.push("");
  lines.push("请使用 AI Travel Copilot Skill 处理：");
  lines.push("1. 保留所有已锁定安排（constraints 中 status = active 的条目）。");
  lines.push("2. 只重规划最小受影响范围，其余日程保持不变。");
  lines.push("3. 输出完整 TravelPack，并把本次调整写入 replanHistory。");
  return lines.join("\n");
}

export function quickActionRequestText(action) {
  return action?.text || "";
}

export function swapRequestText(alternative, placeName = "") {
  const target = alternative?.title || "备选方案";
  const cleaned = String(alternative?.reason || "").trim().replace(/[。！？!?]+$/, "");
  const reason = cleaned ? `，理由：${cleaned}` : "";
  return placeName ? `请把「${placeName}」换成「${target}」${reason}。` : `请把这一段换成「${target}」${reason}。`;
}

// ── 渲染片段 ─────────────────────────────────────────────────────────────────
// 这些纯字符串构造函数由 app.mjs 直接使用，同时可在无 DOM 环境下测试。

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

export function lockedConstraintsMarkup(pack) {
  const constraints = activeConstraints(pack);
  if (!constraints.length) return "";
  return `<section class="list-section locked-section"><div class="field-heading"><h3>🔒 已锁定安排</h3><span>${constraints.length}</span></div><p>AI 调整行程时不会移动这些安排。</p>${
    constraints.map((constraint) => `<div class="locked-row"><span class="locked-mark" aria-hidden="true">🔒</span><div><h4>${escapeHtml(constraintHeading(constraint))}</h4><p>${escapeHtml(constraintDetail(constraint))}</p></div><span class="tag">${escapeHtml(CONSTRAINT_SOURCE_LABELS[constraint.source] || "已记录")}</span></div>`).join("")
  }</section>`;
}

export function planningReasonsMarkup(reasons, { label = "AI 安排理由", className = "stop-reason" } = {}) {
  if (!Array.isArray(reasons) || !reasons.length) return "";
  return `<div class="${escapeHtml(className)}"><span class="reason-mark" aria-hidden="true">✨</span><div><small>${escapeHtml(label)}</small>${
    reasons.map((entry) => `<p><span class="reason-tag">${escapeHtml(reasonKindLabel(entry))}</span>${escapeHtml(entry.reason)}</p>`).join("")
  }</div></div>`;
}

export function alternativesMarkup(list) {
  if (!Array.isArray(list) || !list.length) return `<p class="plain-note">这条行程暂时没有备选方案。</p>`;
  return list.map((alternative) => `<article class="alternative-option" data-alternative-id="${escapeHtml(alternative.id)}">
    <div><h4>${escapeHtml(alternative.title || "替代方案")}</h4><p>${escapeHtml(alternative.reason || "")}</p><span class="tag">${escapeHtml(alternativeStatusLabel(alternative.status))}${(alternative.sourceIds || []).length ? ` · ${alternative.sourceIds.length} 个来源` : ""}</span></div>
    <button class="text-button primary-action" type="button" data-swap-alternative="${escapeHtml(alternative.id)}">生成变更请求</button>
  </article>`).join("");
}

export function quickActionsMarkup(activeId = null) {
  return COPILOT_QUICK_ACTIONS.map((entry) => `<button class="quick-action ${activeId === entry.id ? "active" : ""}" type="button" data-copilot-quick="${escapeHtml(entry.id)}"><span class="quick-mark" aria-hidden="true">${entry.mark}</span><span>${escapeHtml(entry.label)}</span></button>`).join("");
}
