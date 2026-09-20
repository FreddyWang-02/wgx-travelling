import {
  buildLedger,
  formatMoney,
  suggestSettlements,
  validateTravelPack,
} from "./protocol.mjs";
import {
  connectionSummary,
  deleteRecord,
  dueDateFromAdvance,
  equalAllocations,
  gcj02ToWgs84,
  layoutSchematicPoints,
  makeId,
  mergeAgentDocument,
  moveItineraryItem,
  parseAmount,
  reorderTransport,
  tasksToIcs,
} from "./maintenance.mjs";
import {
  buildAttachmentManifest,
  parseTravelPack,
  serializeTravelPack,
} from "./transfer.mjs";
import {
  AGENT_BRIDGE_METHOD,
  COPILOT_QUICK_ACTIONS,
  ITINERARY_VIEWS,
  activeConstraints,
  alternativesFor,
  alternativesMarkup,
  buildAgentRequest,
  contextSummary,
  currentStay,
  formatAgentRequestText,
  groupTasksByPhase,
  hasAgentBridge,
  isItineraryItemLocked,
  itineraryItemContext,
  liveRecheckCount,
  lockedConstraintsMarkup,
  nextItineraryItem,
  planningReasonsFor,
  planningReasonsMarkup,
  preferenceChips,
  preferenceNoteList,
  quickActionRequestText,
  quickActionsMarkup,
  recheckSnapshot,
  replanSummaries,
  sourceFreshness,
  swapEntryLabel,
  swapRequestText,
  tripStatusLabel,
  upcomingTransport,
} from "./ux.mjs";
// Phase 4A · Sunny Travel Storybook 首页：纯逻辑在 assets/home/home-ux.mjs，
// 资产取回在 assets/home/home-assets.mjs，app.mjs 只负责把这二者接到 DOM 上。
import {
  STORYBOOK_STYLE_ID,
  homeFocusDay,
  storybookHomeMarkup,
} from "./assets/home/home-ux.mjs";
import { loadHomeAssets } from "./assets/home/home-assets.mjs";

const state = {
  pack: null,
  revision: null,
  mode: "read",
  tab: "overview",
  itineraryView: "list",
  purpose: "outbound",
  segmentId: null,
  dayId: "all",
  materialKind: "all",
  currency: "CNY",
  expensePanel: "ledger",
  map: null,
  mapFallbackTimer: null,
  endpoint: null,
  saving: false,
  pendingAttachment: null,
  attachmentsEnabled: false,
  placeSearchEnabled: false,
  accessLinksEnabled: false,
  maintenanceSection: "trip",
  maintenanceEditor: null,
  placeResults: [],
  agentCandidate: null,
  dragItemId: null,
  touchDropTarget: null,
  dragPointerId: null,
  dragStartPoint: null,
  dragActivated: false,
  placeSearchQuery: "",
  mapMode: localStorage.getItem("travel-wallet-map-mode") === "basemap" ? "basemap" : "schematic",
  // List 与 Map 共用同一个选中状态，避免两套焦点互相不同步。
  selectedItineraryItemId: null,
  copilotAction: null,
  copilotText: "",
  copilotSource: null,
  // Phase 4A：首页焦点日与已内联的生产资产（场景 / 角色 / 涂鸦）。
  homeDayId: null,
  homeAssets: null,
  homeAssetsRequest: null,
};

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);
const icon = (name) => `<i data-lucide="${name}"></i>`;
const hostAdapter = window.TRAVEL_HOST_ADAPTER || null;
const mapAdapter = window.TRAVEL_MAP_ADAPTER || null;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function cloudFetch(resource, options = {}) {
  if (!hostAdapter) return fetch(resource, options);
  const url = String(resource);
  const method = String(options.method || "GET").toUpperCase();
  try {
    if (url.includes("/places-search")) {
      const query = new URL(url).searchParams;
      const payload = await hostAdapter.searchPlaces?.({ query: query.get("query") || "", region: query.get("region") || "" });
      return payload ? jsonResponse(payload) : jsonResponse({ error: "place_search_unavailable" }, 503);
    }
    if (url.includes("/attachments/") && method === "PUT") {
      const assetId = decodeURIComponent(url.split("/attachments/")[1]);
      const payload = await hostAdapter.uploadAttachment?.({
        assetId,
        file: options.body,
        fileName: decodeURIComponent(options.headers?.["x-file-name"] || "attachment"),
        contentType: options.headers?.["content-type"] || "application/octet-stream",
      });
      return payload ? jsonResponse(payload) : jsonResponse({ error: "attachment_storage_unavailable" }, 503);
    }
    if (url.endsWith("/access-links") && method === "POST") {
      const payload = await hostAdapter.rotateAccessLinks?.();
      return payload ? jsonResponse(payload) : jsonResponse({ error: "access_links_unavailable" }, 503);
    }
    if (method === "PUT") {
      const payload = await hostAdapter.save({
        document: JSON.parse(options.body),
        expectedVersion: state.revision,
      });
      return jsonResponse({ ...payload, revision: payload.revision ?? payload.version });
    }
    const payload = await hostAdapter.load();
    const normalized = payload?.document ? payload : { document: payload };
    return jsonResponse({
      ...normalized,
      revision: normalized.revision ?? normalized.version,
      capabilities: { ...(hostAdapter.capabilities || {}), ...(normalized.capabilities || {}) },
    });
  } catch (error) {
    const code = error?.code || "host_adapter_error";
    return jsonResponse({ error: code, message: error?.message || "宿主云服务调用失败" }, code === "revision_conflict" ? 412 : 500);
  }
}

function attachmentUrl(assetId) {
  return hostAdapter?.getAttachmentUrl?.(assetId)
    || `${state.endpoint}/attachments/${encodeURIComponent(assetId)}`;
}

const labels = {
  outbound: "去程",
  intermediate: "途中交通",
  return: "返程",
  flight: "航班",
  train: "火车／高铁",
  bus: "巴士",
  car: "汽车",
  ferry: "轮渡",
  other: "其他交通",
  planned: "待预订",
  booked: "已预订",
  cancelled: "已取消",
  replaced: "已替换",
  pending: "待完成",
  done: "已完成",
  reservation: "景点预约",
  booking: "交通订票",
  recheck: "信息复查",
  general: "出行待办",
  packing: "携带物品",
  place: "地点",
  ticket: "票据文件",
  guide: "攻略",
  link: "链接",
  visit: "游览",
  meal: "用餐",
  shopping: "购物",
  activity: "活动",
  transport: "交通",
  stay: "住宿",
};

const styleLabels = {
  storybook: "晴日手账",
  aviation: "航空票夹",
  natural: "自然手账",
  minimal: "极简导览",
  collage: "拼贴裁纸",
  print: "印刷风",
  urban: "都市设计",
};
// Phase 4A 起，新旅行的默认视觉方向是 Sunny Travel Storybook 首页；
// 数据里已记录 appearance.styleId 的旅行仍然按记录走。
const DEFAULT_STYLE = STORYBOOK_STYLE_ID;

function refreshIcons() {
  window.lucide?.createIcons({ attrs: { "aria-hidden": "true" } });
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value, options = {}) {
  if (!value) return "日期待定";
  const date = new Date(`${value}T12:00:00+08:00`);
  return new Intl.DateTimeFormat("zh-CN", options.weekday ? {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  } : {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekdayLabel(value) {
  if (!value) return "待定";
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${value}T12:00:00+08:00`));
}

function pointDate(point) {
  return point?.localDate ? formatDate(point.localDate, { weekday: true }) : "日期待定";
}

// 本机时区的今天与当前时间，用于「下一项」和来源时效推导。
function localNow() {
  const now = new Date();
  const shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return { date: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16) };
}

function personName(id) {
  return state.pack.companions.find((person) => person.id === id)?.name || id;
}

function heading(kicker, title, subtitle, actions = "") {
  return `<header class="section-heading${actions ? " has-actions" : ""}" id="moduleTitle" tabindex="-1">
    <div>
      <span class="section-kicker">${esc(kicker)}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(subtitle)}</p>
    </div>
    ${actions ? `<div class="heading-actions">${actions}</div>` : `<span class="read-note">${icon(state.mode === "edit" ? "pencil" : "eye")} ${state.mode === "edit" ? (hostAdapter ? "宿主权限 · 可更新数据" : "编辑链接 · 可更新数据") : "当前为只读视图"}</span>`}
  </header>`;
}

function renderState(title, message, symbol = "map-pinned") {
  $("#tripHeader").hidden = true;
  $("#moduleNav").hidden = true;
  const fab = $("#copilotFab");
  if (fab) fab.hidden = true;
  $("#app").innerHTML = `<section class="state-view">${icon(symbol)}<h1>${esc(title)}</h1><p>${esc(message)}</p></section>`;
  refreshIcons();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove("show"), 2400);
}

function renderShell() {
  const { trip } = state.pack;
  $("#tripHeader").hidden = false;
  $("#moduleNav").hidden = false;
  $("#tripTitle").textContent = trip.title;
  $("#tripMeta").textContent = `${formatDate(trip.startDate)} — ${formatDate(trip.endDate)} · ${trip.subtitle || trip.destination || "旅行"}`;
  $("#tripCode").textContent = trip.destinationCode || (trip.destination || "TRIP").slice(0, 3).toUpperCase();
  $("#tripHeader").dataset.code = trip.destinationCode || (trip.destination || "TRIP").slice(0, 3).toUpperCase();
  $("#tripNote").textContent = trip.note || "";
  $("#accessBadge").textContent = state.mode === "edit"
    ? (hostAdapter ? "可编辑" : "编辑链接")
    : state.mode === "demo"
      ? (document.body.dataset.deliveryMode === "ui-review" ? "UI 样式预览" : "静态只读预览")
      : "只读分享";
  $("#exportButton").hidden = false;
  $("#manifestButton").hidden = state.mode !== "edit";
  $("#linksButton").hidden = state.mode !== "edit" || !state.accessLinksEnabled;
  $("#tripButton").hidden = state.mode !== "edit";
  $("#agentButton").hidden = state.mode !== "edit";
  $("#dataButton").hidden = state.mode !== "edit";
  $("#saveState").hidden = state.mode !== "edit";
  const schemaKicker = $("#dataDialogKicker");
  if (schemaKicker) schemaKicker.textContent = `TRAVELPACK ${state.pack.schemaVersion || ""}`.trim();
  const fab = $("#copilotFab");
  if (fab) fab.hidden = false;
  document.title = `${trip.title}｜旅行票夹`;
  document.body.dataset.viewTab = state.tab;
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.tab));
}

// ── 概览 Overview ────────────────────────────────────────────────────────────
// 概览继承原「出行」模块的全部交通与住宿能力（票面、分段、编辑、票据、附件）。

function overviewStatusStrip() {
  const status = tripStatusLabel(state.pack.tripStatus);
  const recheck = recheckSnapshot(state.pack);
  const live = recheck ? liveRecheckCount(state.pack) : 0;
  const locked = activeConstraints(state.pack).length;
  const cells = [
    status ? `<div class="status-cell"><small>旅行状态</small><strong>${esc(status)}</strong></div>` : "",
    locked ? `<div class="status-cell"><small>已锁定安排</small><strong>${locked} 项</strong></div>` : "",
    recheck ? `<div class="status-cell"><small>待复核信息</small><strong>${recheck.count} 项</strong></div>` : "",
  ].filter(Boolean).join("");
  if (!cells) return "";
  return `<div class="overview-status">${cells}${recheck && live !== recheck.count
    ? `<p class="plain-note">${esc(recheck.text)}；按当前资料重算为 ${live} 项。</p>`
    : ""}</div>`;
}

function overviewNextItem() {
  const next = nextItineraryItem(state.pack, localNow());
  if (!next) return `<section class="detail-sheet overview-next"><div class="detail-block"><h3>${icon("calendar-clock")} 下一项计划</h3><p class="plain-note">这份行程还没有可以推断的后续节点。</p></div></section>`;
  const title = next.estimated ? "下一项计划" : "接下来";
  return `<section class="detail-sheet overview-next"><div class="detail-block">
    <h3>${icon("calendar-clock")} ${title}</h3>
    <p class="overview-next-main"><b>${esc(next.place?.name || next.item.title || "行程节点")}</b><span>${esc(next.item.startTime || "—")}–${esc(next.item.endTime || "—")}</span></p>
    <p class="plain-note">${esc(next.day?.title || "")}${next.day ? ` · ${esc(next.day.date)}` : ""}${next.item.notes ? `<br>${esc(next.item.notes)}` : ""}</p>
    ${next.estimated ? `<p class="plain-note">暂未接入实时时间，这里按行程顺序显示下一项。</p>` : ""}
    <div class="overview-next-actions">${state.mode === "edit" ? `<button class="text-button" data-open-editor="itinerary" data-record-id="${esc(next.item.id)}">${icon("pencil")} 编辑这一项</button>` : ""}<button class="text-button" data-tab="itinerary">${icon("route")} 打开行程</button></div>
  </div></section>`;
}

function overviewLockedSection() {
  return lockedConstraintsMarkup(state.pack);
}

function overviewPreferences() {
  const chips = preferenceChips(state.pack.preferences);
  const notes = preferenceNoteList(state.pack.preferences);
  if (!chips.length && !notes.length) return "";
  return `<section class="list-section preference-section"><div class="field-heading"><h3>你的旅行偏好</h3><span>${chips.length}</span></div>
    <div class="preference-chips">${chips.map((chip) => `<span class="preference-chip">${esc(chip.label)}</span>`).join("")}</div>
    ${notes.length ? `<ul class="preference-notes">${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}
    ${state.mode === "edit" ? `<button class="text-button" data-open-editor="trip">${icon("pencil")} 编辑偏好</button>` : ""}
  </section>`;
}

function overviewReplanSection() {
  const entries = replanSummaries(state.pack, (id) => state.pack.days.find((day) => day.id === id)?.title || "");
  if (!entries.length) return "";
  return `<section class="list-section replan-section"><div class="field-heading"><h3>AI 最近调整</h3><span>${entries.length}</span></div>
    ${entries.map((entry) => `<div class="replan-row"><div><h4>${esc(entry.triggerLabel)}<span class="replan-status">${esc(entry.statusLabel)}</span></h4><p>${esc(entry.summary)}</p><small>${esc(entry.dayLabels.filter(Boolean).join("、") || "全程")}${entry.createdAt ? ` · ${esc(String(entry.createdAt).replace("T", " "))}` : ""}</small></div></div>`).join("")}
  </section>`;
}

function overviewTransportSection() {
  const segment = upcomingTransport(state.pack);
  const stay = currentStay(state.pack);
  const stayPlace = stay ? state.pack.places.find((place) => place.id === stay.placeId) : null;
  const rows = [
    segment ? `<div class="list-row"><div><h4>${esc(labels[segment.purpose] || "交通")} · ${esc(segment.from?.name || "出发地")} → ${esc(segment.to?.name || "目的地")}</h4><p>${esc(pointDate(segment.departure))} · ${esc(segment.departure?.localTime || "—")} · ${esc(segment.serviceNumber || labels[segment.mode] || "交通")}<br>${esc(labels[segment.status] || segment.status || "")}</p></div><span class="tag">${esc(labels[segment.mode] || "交通")}</span></div>` : "",
    stay ? `<div class="list-row"><div><h4>${esc(stayPlace?.name || "住宿")}</h4><p>${esc(stay.checkIn)} 入住 · ${esc(stay.checkOut)} 退房<br>${esc(labels[stay.status] || stay.status || "")}</p></div>${state.mode === "edit" ? `<div class="row-actions"><button class="row-edit" data-open-editor="stay" data-record-id="${esc(stay.id)}" aria-label="编辑住宿">${icon("pencil")}</button></div>` : `<span class="tag">住宿</span>`}</div>` : "",
  ].filter(Boolean).join("");
  if (!rows) return "";
  return `<section class="list-section overview-transport"><div class="field-heading"><h3>交通与住宿</h3><span>摘要</span></div>${rows}</section>`;
}

function overviewView() {
  return isStorybookHome() ? storybookHomeView() : classicOverviewView();
}

function activeStyleId() {
  return document.documentElement.dataset.style || DEFAULT_STYLE;
}

function isStorybookHome() {
  return activeStyleId() === STORYBOOK_STYLE_ID;
}

// 首页生产资产只取一次；失败时不阻塞渲染，版式退化为主题色面。
async function ensureHomeAssets() {
  if (state.homeAssets || !isStorybookHome()) return state.homeAssets;
  if (!state.homeAssetsRequest) {
    state.homeAssetsRequest = loadHomeAssets()
      .then((assets) => {
        state.homeAssets = assets;
        return assets;
      })
      .catch(() => null);
  }
  return state.homeAssetsRequest;
}

// Sunny Travel Storybook 首页：Hero 明信片 + 今日旅程 + 为什么 + 已锁定 + 状态 + 别错过，
// 末尾接上 Phase 3 的出行票据能力，概览对「出行」模块的继承没有中断。
function storybookHomeView() {
  const markup = storybookHomeMarkup(state.pack, {
    assets: state.homeAssets || {},
    now: localNow(),
    mode: state.mode,
    dayId: state.homeDayId,
  });
  return `<section class="view sb-view">${markup}<section class="sb-tickets">${transportPanelSection()}</section></section>`;
}

// 滚动揭示：默认可见，只有观察器真的挂上之后才进入「待揭示」状态。
let homeRevealObserver = null;

function setupHomeReveal() {
  homeRevealObserver?.disconnect();
  homeRevealObserver = null;
  const home = document.querySelector(".sb-home");
  if (!home) return;
  const targets = [...new Set(home.querySelectorAll(".sb-section, .sb-inspiration"))];
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  home.classList.add("sb-motion-ready");
  homeRevealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      homeRevealObserver?.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  targets.forEach((element) => homeRevealObserver.observe(element));
}

// Phase 3 的概览版式原样保留：storybook 之外的六套 style 仍然走这一支。
function classicOverviewView() {
  const { trip } = state.pack;
  const companions = state.pack.companions || [];
  return `<section class="view overview-view">
    ${heading("OVERVIEW", "概览", "先把这趟旅行最重要的部分放在一起，再往下进入各个模块。", state.mode === "edit" ? `<button class="text-button primary-action" data-open-editor="transport">${icon("plus")} <span class="desktop-add-label">新增出行</span><span class="compact-label">新增</span></button>` : "")}
    <section class="overview-hero">
      <div>
        <h3>${esc(trip.title)}</h3>
        <p>${esc(formatDate(trip.startDate))} — ${esc(formatDate(trip.endDate))} · ${esc(trip.destination || trip.subtitle || "旅行")}</p>
      </div>
      <div class="overview-hero-meta">
        <span><b>${state.pack.days.length}</b>天</span>
        <span><b>${companions.length}</b>位同行</span>
        <span><b>${state.pack.itineraryItems.length}</b>个节点</span>
      </div>
    </section>
    ${overviewStatusStrip()}
    <div class="overview-grid">
      <div class="overview-main">
        ${overviewNextItem()}
        ${overviewLockedSection()}
        ${overviewTransportSection()}
      </div>
      <div class="overview-side">
        ${overviewPreferences()}
        ${overviewReplanSection()}
      </div>
    </div>
    ${transportPanelSection()}
  </section>`;
}

// 原「出行」模块的完整能力（分段、票面、时间、票据、附件、编辑）在这里原样保留。
function transportPanelSection() {
  const segments = state.pack.transportSegments.filter((segment) => segment.purpose === state.purpose);
  if (!segments.some((segment) => segment.id === state.segmentId)) state.segmentId = segments[0]?.id || null;
  const current = segments.find((segment) => segment.id === state.segmentId);
  const currentIndex = state.pack.transportSegments.findIndex((segment) => segment.id === state.segmentId);
  const next = currentIndex >= 0 ? state.pack.transportSegments[currentIndex + 1] : null;

  return `<section class="overview-travel">
    <div class="field-heading overview-section-title"><h3>${icon("tickets-plane")} 出行票据与途中交通</h3><span>${state.pack.transportSegments.length} 段</span></div>
    <div class="tabs">
      ${["outbound", "intermediate", "return"].map((purpose) => `<button class="tab-chip ${purpose === state.purpose ? "active" : ""}" data-purpose="${purpose}">${labels[purpose]}</button>`).join("")}
    </div>
    <div class="route-summary"><div><strong>${current ? `${esc(current.from.name)} → ${esc(current.to.name)}` : "这一段旅程，慢慢补齐"}</strong>${current ? `<small>${esc(pointDate(current.departure))} · ${esc(current.serviceNumber || labels[current.mode] || "交通")}</small>` : `<small>还没有安排，可以先记下出发地、目的地与计划日期。</small>`}</div><span>${current ? esc(labels[current.status] || current.status) : "待安排"}</span></div>
    <div class="tabs segment-tabs">
      ${segments.map((segment, index) => `<button class="tab-chip ${segment.id === state.segmentId ? "active" : ""}" data-segment="${esc(segment.id)}"><b>${index + 1}</b> · ${esc(segment.from.name)} → ${esc(segment.to.name)}</button>`).join("") || `<span class="plain-note">这一阶段还没有交通安排。</span>`}
    </div>
    ${current ? ticket(current, next) : `<section class="travel-empty">${icon("luggage")}<h3>这段旅程，慢慢补齐</h3><p>还没订票也可以先记下出发地、目的地与计划日期。</p>${state.mode === "edit" ? `<button class="text-button primary-action" data-open-editor="transport">添加${esc(labels[state.purpose] || "交通")}</button>` : ""}</section>`}
  </section>`;
}

function ticket(segment, next) {
  const vehicleIcon = segment.mode === "flight" ? "plane" : segment.mode === "train" ? "train-front" : "bus-front";
  const gateLabel = segment.mode === "flight" ? "登机口" : "检票口";
  const bookingUrl = safeUrl(segment.bookingUrl);
  const primaryMaterial = (segment.materialIds || []).map((id) => state.pack.materials.find((item) => item.id === id)).find(Boolean);
  const materialUrl = primaryMaterial ? safeUrl(primaryMaterial.url) : null;
  return `<div class="travel-grid">
    <article class="ticket boarding-pass">
      <header class="boarding-head">
        <div><b>${icon(vehicleIcon)} ${esc(labels[segment.purpose] || "出行")}${segment.mode === "flight" ? "登机牌" : "乘车票"}</b><p>${esc(segment.operator || "运营方待补充")}</p></div>
        <div><span class="status">${esc(labels[segment.status] || segment.status || "状态待确认")}</span><p>${esc(segment.serviceNumber || "班次待补充")}</p></div>
      </header>
      <div class="boarding-route">
        <div class="air-rail">
          <div class="air-endpoint">
            <span class="airport-code">${esc(segment.from.code || "出发")}</span>
            <h3>${esc(segment.from.name)}</h3>
            <div class="route-time">${esc(segment.departure?.localTime || "—")}</div>
            <div class="route-date">${esc(pointDate(segment.departure))}</div>
          </div>
          <div class="air-duration">${icon(vehicleIcon)} ${esc(segment.serviceNumber || "班次待补充")}</div>
          <div class="air-endpoint">
            <span class="airport-code">${esc(segment.to.code || "抵达")}</span>
            <h3>${esc(segment.to.name)}</h3>
            <div class="route-time">${esc(segment.arrival?.localTime || "—")}</div>
            <div class="route-date">${esc(pointDate(segment.arrival))}</div>
          </div>
        </div>
        <div class="gate-display"><span>${gateLabel}</span><strong>${esc(segment.gate || "—")}</strong><small>${segment.gate ? "出发当天请再核对" : "等待补充信息"}</small></div>
      </div>
      <div class="pass-perforation"></div>
      <div class="boarding-fields">
        <div><span class="field-label">航站楼／候车区</span><strong>${esc(segment.terminal || "—")}</strong></div>
        <div><span class="field-label">车厢／座位</span><strong>${esc(segment.seat || "—")}</strong></div>
        <div><span class="field-label">舱位／席别</span><strong>${esc(segment.cabin || "—")}</strong></div>
        <div><span class="field-label">票据类型</span><strong>${esc(segment.fareType || "—")}</strong></div>
      </div>
      <div class="boarding-actions">
        ${materialUrl ? `<a class="ticket-primary-action" href="${esc(materialUrl)}" target="_blank" rel="noopener noreferrer">${icon("file-text")} 查看原票</a>` : `<span class="ticket-primary-action is-disabled">${icon("file-text")} 暂无票据原件</span>`}
        <div class="ticket-link-row">${bookingUrl ? `<a href="${esc(bookingUrl)}" target="_blank" rel="noopener noreferrer">${icon("external-link")} 订单链接</a>` : `<span>${icon("external-link")} 订单链接待补充</span>`}${state.mode === "edit" ? state.attachmentsEnabled ? `<button data-open-attachments="true">${icon("paperclip")} 添加附件</button>` : `<button type="button" disabled title="当前部署未启用附件存储">${icon("paperclip")} 附件未启用</button>` : ""}</div>
        ${state.mode === "edit" ? `<div class="record-actions-inline"><button class="record-edit" data-open-editor="transport" data-record-id="${esc(segment.id)}">${icon("pencil")} 编辑信息</button><button class="record-delete" data-delete-kind="transport" data-record-id="${esc(segment.id)}">${icon("trash-2")} 清空</button></div>` : ""}
      </div>
    </article>
    <aside class="side-stack">
      <section class="detail-sheet timing-sheet"><div class="detail-block"><h3>${icon("clock-3")} 出发前 ${state.mode === "edit" ? `<button data-open-editor="transport" data-record-id="${esc(segment.id)}">补充时间</button>` : ""}</h3>${(segment.milestones || []).map((item) => `<div class="timeline-row"><time>${esc(item.time || "—")}</time><span><b>${esc(item.label)}</b><small>${esc(segment.departure?.localDate || "日期待补充")}</small></span></div>`).join("") || `<p class="plain-note">值机、检票与建议到达时间待补充。</p>`}<p class="sheet-footnote">${icon("info")} 登机、检票及运行信息以实际通知为准。</p></div></section>
      ${next ? `<section class="detail-sheet"><div class="detail-block"><h3>${icon("shuffle")} 中转换乘</h3><p class="plain-note">${esc(segment.to.name)} → ${esc(next.from?.name || next.to.name)}<br><strong>${esc(transferText(segment, next))}</strong></p></div></section>` : ""}
      <section class="detail-sheet"><div class="detail-block"><h3>${icon("notebook-tabs")} 这一路的备注 ${state.mode === "edit" ? `<button data-open-editor="transport" data-record-id="${esc(segment.id)}">编辑</button>` : ""}</h3><p class="plain-note">${esc(segment.notes || "暂无备注")}</p></div></section>
      <section class="detail-sheet"><div class="detail-block"><h3>${icon("shield-check")} 复查与准备</h3><p class="plain-note">出发前核对证件、票据和最新登机口信息。</p>${state.mode === "edit" ? `<button class="text-button" data-open-editor="task">${icon("list-checks")} 添加复查待办</button>` : ""}</div></section>
    </aside>
  </div>`;
}

function transferText(current, next) {
  return connectionSummary(current, next)?.text || "衔接时间待补充";
}

function recordLinks(...collections) {
  const seen = new Set();
  return collections.flat().map((link) => ({ ...link, safe: safeUrl(link?.url) })).filter((link) => {
    if (!link.safe || seen.has(link.safe)) return false;
    seen.add(link.safe);
    return true;
  });
}

function itineraryStopCard(item) {
  const place = state.pack.places.find((entry) => entry.id === item.placeId);
  const links = recordLinks(item.links || [], place?.links || []);
  const hasDetails = Boolean(place?.address || place?.notes || item.notes || links.length);
  const locked = isItineraryItemLocked(state.pack, item.id);
  // 当日已在上方展示的理由不再重复贴到卡片上；全程视图没有当日区，卡片补上所属日期的理由。
  const shownAtDayLevel = new Set((state.dayId === "all" ? [] : planningReasonsFor(state.pack, { dayId: state.dayId })).map((entry) => entry.id));
  const reasons = planningReasonsFor(state.pack, { itineraryItemId: item.id, dayId: item.dayId, placeId: item.placeId }).filter((entry) => !shownAtDayLevel.has(entry.id));
  const swaps = alternativesFor(state.pack, { itineraryItemId: item.id, placeId: item.placeId });
  const hasExtras = locked || reasons.length || swaps.length;
  return `<article class="route-stop ${state.selectedItineraryItemId === item.id ? "is-selected" : ""}" data-map-item="${esc(item.id)}" data-drag-item="${esc(item.id)}">
    <span class="stop-index">${item.displayOrder || item.order + 1}</span>
    <div class="stop-card">
      <header class="stop-card-top">
        ${state.mode === "edit" ? `<button class="drag-handle" type="button" data-touch-drag="${esc(item.id)}" aria-label="按住拖动行程" title="按住并拖动排序">${icon("grip-vertical")}</button>` : ""}
        <span class="stop-clock">${icon("clock-3")} <b>${esc(item.startTime || "—")}</b><small>${item.endTime ? `–${esc(item.endTime)}` : ""}</small></span>
        ${locked ? `<span class="lock-mark" role="img" aria-label="已锁定安排" title="已锁定安排，AI 调整时不会自动移动。">🔒</span>` : ""}
        <span class="tag">${esc(labels[item.kind] || item.kind)}</span>
        ${state.mode === "edit" ? `<div class="stop-menu"><button data-open-editor="itinerary" data-record-id="${esc(item.id)}" aria-label="编辑">${icon("pencil")}</button><button class="danger" data-delete-kind="itinerary" data-record-id="${esc(item.id)}" aria-label="删除">${icon("trash-2")}</button></div>` : ""}
      </header>
      <div class="stop-card-body">
        <span class="stop-visual">${icon(item.kind === "meal" ? "utensils" : item.kind === "shopping" ? "shopping-bag" : "map-pin")}</span>
        <div class="stop-main"><h3>${esc(place?.name || item.title || "自由活动")}</h3><p>${esc(item.notes || place?.notes || "行程说明待补充")}</p></div>
      </div>
      ${hasExtras ? `<div class="stop-extras">
        ${locked ? `<p class="stop-lock">🔒 已锁定安排，AI 调整时不会自动移动。</p>` : ""}
        ${planningReasonsMarkup(reasons)}
        ${swaps.length ? `<button class="text-button stop-swap" data-open-alternatives="${esc(item.id)}">${icon("shuffle")} ${esc(swapEntryLabel(swaps))} <span class="swap-count">${swaps.length}</span></button>` : ""}
      </div>` : ""}
      ${hasDetails ? `<details class="place-details"><summary>查看地点详情与攻略</summary><div class="place-detail-body">${place?.address ? `<p>${icon("map-pin")} ${esc(place.address)}</p>` : ""}${links.length ? `<div class="place-links">${links.map((link) => `<a href="${esc(link.safe)}" target="_blank" rel="noopener noreferrer">${esc(link.title || "攻略链接")} ${icon("arrow-up-right")}</a>`).join("")}</div>` : ""}</div></details>` : ""}
    </div>
  </article>`;
}

function itineraryViewSwitcher() {
  return `<div class="view-switcher" role="tablist" aria-label="行程视图">${ITINERARY_VIEWS.map((view) => `<button class="view-switch ${state.itineraryView === view.id ? "active" : ""}" role="tab" aria-selected="${state.itineraryView === view.id}" data-itinerary-view="${view.id}">${esc(view.label)}</button>`).join("")}</div>`;
}

function itineraryView() {
  const days = state.pack.days;
  if (state.dayId !== "all" && !days.some((day) => day.id === state.dayId)) state.dayId = days[0]?.id || "all";
  const visibleDays = state.dayId === "all" ? days : days.filter((day) => day.id === state.dayId);
  const items = visibleDays.flatMap((day) => state.pack.itineraryItems.filter((item) => item.dayId === day.id).sort((a, b) => a.order - b.order).map((item) => ({ ...item, day }))).map((item, index) => ({ ...item, displayOrder: index + 1 }));
  const stays = state.pack.stays.filter((stay) => visibleDays.some((day) => stay.checkIn <= day.date && stay.checkOut >= day.date));
  const alternatives = state.pack.places.filter((place) => place.alternative);
  const selectedDay = days.find((day) => day.id === state.dayId);
  const dayTheme = selectedDay?.title || "全程总览";
  const dayReasons = selectedDay ? planningReasonsFor(state.pack, { dayId: selectedDay.id }) : [];

  return `<section class="view" data-view="${esc(state.itineraryView)}">
    ${heading("ITINERARY", "行程", "地图顺序与行程节点保持一致，路线为游览顺序示意。")}
    ${state.mode === "edit" ? `<div class="module-actions"><button class="text-button primary-action" data-open-editor="itinerary">${icon("plus")} 添加行程</button><button class="text-button" data-open-editor="place" data-default-day="${state.dayId === "all" ? "" : esc(state.dayId)}">添加地点</button><button class="text-button" data-open-editor="stay">添加住宿</button></div>` : ""}
    <div class="day-strip">
      <button class="day-button ${state.dayId === "all" ? "active" : ""}" data-day="all"><b class="day-date">全程</b><small>${days.length} 天</small></button>
      ${days.map((day) => `<button class="day-button ${state.dayId === day.id ? "active" : ""}" data-day="${esc(day.id)}" data-drop-day="${esc(day.id)}"><b class="day-date">${esc(day.date.slice(5).replace("-", "/"))}</b><small>${esc(weekdayLabel(day.date))}</small></button>`).join("")}
    </div>
    <div class="day-context"><div><small>${selectedDay ? "当日主题" : "行程主题"}</small><h3>${esc(dayTheme)}</h3></div>
      ${selectedDay ? `<button class="text-button ai-day-button" data-copilot-action="replan-day" data-copilot-day="${esc(selectedDay.id)}"><span aria-hidden="true">✨</span> 调整这一天</button>` : ""}
    </div>
    ${planningReasonsMarkup(dayReasons, { className: "day-reasons" })}
    ${itineraryViewSwitcher()}
    <div class="itinerary-grid">
      <div class="itinerary-col-list">
        <p class="drag-instruction">${icon("grip-vertical")} 拖动把手调整顺序，列表与地图会同步更新</p>
        <div class="route-list" data-drop-list="true">
          ${items.map(itineraryStopCard).join("") || `<p class="plain-note">当前日期没有行程节点。</p>`}
        </div>
        ${stays.length ? `<section class="list-section stay-section"><h3>住宿</h3>${stays.map((stay) => { const place = state.pack.places.find((entry) => entry.id === stay.placeId); const links = recordLinks(stay.links || [], place?.links || []); return `<div class="list-row"><div><h4>${esc(place?.name || "住宿")}</h4><p>${esc(stay.checkIn)} 入住 · ${esc(stay.checkOut)} 退房<br>${esc(stay.notes || "")}</p>${links.length ? `<div class="place-links">${links.map((link) => `<a href="${esc(link.safe)}" target="_blank" rel="noopener noreferrer">${esc(link.title || "住宿链接")} ${icon("arrow-up-right")}</a>`).join("")}</div>` : ""}</div>${state.mode === "edit" ? `<div class="row-actions"><button class="row-edit" data-open-editor="stay" data-record-id="${esc(stay.id)}" aria-label="编辑住宿">${icon("pencil")}</button><button class="row-delete" data-delete-kind="stay" data-record-id="${esc(stay.id)}" aria-label="删除住宿">${icon("trash-2")}</button></div>` : `<span class="tag">${esc(labels[stay.status] || stay.status)}</span>`}</div>`; }).join("")}</section>` : ""}
        ${alternatives.length ? `<section class="list-section alternative-section"><div class="field-heading"><h3>备选地点</h3><span>${alternatives.length}</span></div><p>地点已带地图位置，可按当天节奏加入路线。</p>${alternatives.map((place) => { const links = recordLinks(place.links || []); return `<div class="alternative-card"><span class="material-icon">${icon("map-pin")}</span><div><h4>${esc(place.name)}</h4><p>${esc(place.notes || place.address || "")}</p>${links[0] ? `<a href="${esc(links[0].safe)}" target="_blank" rel="noopener noreferrer">查看资料 ${icon("arrow-up-right")}</a>` : ""}</div>${state.mode === "edit" ? `<button class="text-button primary-action" data-open-editor="place" data-record-id="${esc(place.id)}">加入当天</button>` : ""}</div>`; }).join("")}</section>` : ""}
      </div>
      <section class="map-panel"><div class="map-head"><h3>路线地图</h3><div class="map-tools"><button class="${state.mapMode === "schematic" ? "active" : ""}" data-map-mode="schematic">绘制地图</button><button class="${state.mapMode === "basemap" ? "active" : ""}" data-map-mode="basemap" title="切换到支持缩放和平移的网页地图">可缩放地图</button><span>${items.length} 个节点</span></div></div><div id="routeMap"></div><div id="mapDetail"></div><p class="map-status" id="mapStatus">路线示意 · 点击标记查看地点信息。</p></section>
    </div>
  </section>`;
}

function mapPayload() {
  const days = state.dayId === "all" ? state.pack.days : state.pack.days.filter((day) => day.id === state.dayId);
  return {
    selectedDayId: state.dayId,
    days: days.map((day) => ({
      id: day.id,
      date: day.date,
      title: day.title,
      stops: state.pack.itineraryItems
        .filter((item) => item.dayId === day.id)
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const place = state.pack.places.find((entry) => entry.id === item.placeId);
          return { id: item.id, order: item.order, name: place?.name || item.title || "行程节点", location: place?.location || null };
        }),
    })),
  };
}

function mountMap() {
  window.clearTimeout(state.mapFallbackTimer);
  state.mapFallbackTimer = null;
  if (state.map) state.map.remove();
  state.map = null;
  const host = $("#routeMap");
  if (!host) return;
  if (state.mapMode === "schematic") {
    mountSchematicMap(host, "绘制地图按行程顺序联动，点击标记可查看地点详情。");
    return;
  }
  if (mapAdapter?.mount) {
    host.className = "";
    $("#mapStatus").textContent = `${mapAdapter.provider || "宿主"}地图 · 路线和标注随行程顺序联动。`;
    const adapterSession = { cancelled: false, controller: null };
    state.map = {
      remove() {
        adapterSession.cancelled = true;
        adapterSession.controller?.remove?.();
        mapAdapter.destroy?.(host);
      },
    };
    Promise.resolve(mapAdapter.mount({ element: host, ...mapPayload() })).then((controller) => {
      if (adapterSession.cancelled) controller?.remove?.();
      else adapterSession.controller = controller;
    }).catch(() => {
      if (adapterSession.cancelled) return;
      state.map = null;
      mountOpenStreetMap(host, "宿主地图暂时不可用，已启用 OpenStreetMap 保底底图。");
    });
    return;
  }
  mountOpenStreetMap(host, "未接入宿主地图，已启用 OpenStreetMap 保底底图。");
}

function mountOpenStreetMap(host, fallbackNotice = "") {
  if (!window.L) {
    mountSchematicMap(host, "网页底图不可用，已切换为绘图式路线图。");
    return;
  }
  host.className = "";
  const visibleDays = state.dayId === "all" ? state.pack.days : state.pack.days.filter((day) => day.id === state.dayId);
  const bounds = [];
  let missing = 0;
  state.map = window.L.map(host, { zoomControl: true, scrollWheelZoom: true });
  const tiles = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(state.map);
  $("#mapStatus").textContent = `${fallbackNotice} 路线虚线表示游览顺序，实际道路与耗时请另行确认。`;
  let tileFallbackMounted = false;
  const useFallback = (message) => {
    if (tileFallbackMounted) return;
    tileFallbackMounted = true;
    window.clearTimeout(state.mapFallbackTimer);
    mountSchematicMap(host, message);
  };
  tiles.once("tileload", () => {
    window.clearTimeout(state.mapFallbackTimer);
    state.mapFallbackTimer = null;
  });
  tiles.on("tileerror", () => useFallback("底图暂时无法加载，已切换为绘图式路线图。"));
  state.mapFallbackTimer = window.setTimeout(() => useFallback("地图加载超时，已切换为绘图式路线图。"), 2600);
  let displayOrder = 0;
  visibleDays.forEach((day, dayIndex) => {
    let previous = null;
    const items = state.pack.itineraryItems.filter((item) => item.dayId === day.id).sort((a, b) => a.order - b.order);
    items.forEach((item) => {
      displayOrder += 1;
      const place = state.pack.places.find((entry) => entry.id === item.placeId);
      const location = place?.location;
      if (!location || location.coordinateSystem !== "WGS84") {
        missing += 1;
        previous = null;
        return;
      }
      const point = [location.latitude, location.longitude];
      bounds.push(point);
      const marker = window.L.marker(point, {
        icon: window.L.divIcon({ className: "route-pin", html: `<span>${displayOrder}</span>`, iconSize: [44, 44], iconAnchor: [22, 22] }),
      }).addTo(state.map);
      marker.bindTooltip(`${day.date} · ${place.name}`);
      marker.on("click", () => {
        state.selectedItineraryItemId = item.id;
        renderMapDetail();
        document.querySelectorAll(".route-stop").forEach((stop) => stop.classList.toggle("is-selected", stop.dataset.mapItem === item.id));
      });
      if (previous) window.L.polyline([previous, point], { color: dayIndex % 2 ? "#8a58c7" : "#1766e3", weight: 3, dashArray: "5 8" }).addTo(state.map);
      previous = point;
    });
  });
  if (bounds.length) state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  else {
    mountSchematicMap(host, "当前地点缺少可核验坐标，已按行程顺序绘制路线图。");
    return;
  }
  if (missing) $("#mapStatus").textContent += ` ${missing} 个节点缺少可绘制坐标。`;
  window.setTimeout(() => state.map?.invalidateSize(), 30);
}

function mountSchematicMap(host, message) {
  window.clearTimeout(state.mapFallbackTimer);
  state.mapFallbackTimer = null;
  if (state.map) state.map.remove();
  state.map = null;
  host.className = "schematic-map illustrated-map";
  const dayIds = state.dayId === "all" ? state.pack.days.map((day) => day.id) : [state.dayId];
  const items = state.pack.itineraryItems.filter((item) => dayIds.includes(item.dayId)).sort((a, b) => {
    const dayDelta = dayIds.indexOf(a.dayId) - dayIds.indexOf(b.dayId);
    return dayDelta || a.order - b.order;
  });
  const points = layoutSchematicPoints(items, state.pack.places);
  if (!state.selectedItineraryItemId || !items.some((item) => item.id === state.selectedItineraryItemId)) state.selectedItineraryItemId = items[0]?.id || null;
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  host.innerHTML = points.length ? `<div class="map-city-canvas" aria-label="绘制路线地图">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="map-grid-line" d="M0 18H100M0 42H100M0 68H100M16 0V100M42 0V100M70 0V100"/><polyline class="schematic-path" points="${polyline}"/></svg>
    ${points.map(({ item, x, y }, index) => { const place = state.pack.places.find((entry) => entry.id === item.placeId); return `<button class="map-marker ${item.id === state.selectedItineraryItemId ? "active" : ""}" style="--x:${x}%;--y:${y}%" data-select-map-item="${esc(item.id)}" aria-label="查看${esc(place?.name || "地点")}"><b>${index + 1}</b><span>${esc(place?.name || "行程地点")}</span></button>`; }).join("")}
    <span class="map-north">N<br>▲</span>
  </div>` : `<p class="schematic-empty">当前日期没有可绘制的行程节点。</p>`;
  renderMapDetail();
  const status = $("#mapStatus");
  if (status) status.textContent = `${message} 此图表示节点顺序，不代表真实道路、距离或耗时。`;
}

// List 与 Map 共用同一个选中状态：任一侧变化都同步另一侧。
function selectItineraryItem(itemId) {
  if (!itemId || state.selectedItineraryItemId === itemId) return;
  state.selectedItineraryItemId = itemId;
  document.querySelectorAll(".map-marker").forEach((marker) => marker.classList.toggle("active", marker.dataset.selectMapItem === itemId));
  document.querySelectorAll(".route-stop").forEach((stop) => stop.classList.toggle("is-selected", stop.dataset.mapItem === itemId));
  renderMapDetail();
}

function renderMapDetail() {
  const host = $("#mapDetail");
  if (!host) return;
  const item = state.pack.itineraryItems.find((entry) => entry.id === state.selectedItineraryItemId);
  if (!item) return void (host.innerHTML = "");
  const place = state.pack.places.find((entry) => entry.id === item.placeId);
  const links = recordLinks(item.links || [], place?.links || []);
  host.innerHTML = `<article class="map-detail-card"><span class="map-detail-visual">${icon("map-pin")}</span><div><h4>${esc(place?.name || "行程地点")}</h4><p>${esc(place?.address || labels[item.kind] || "地点信息待补充")}</p><small>${esc(item.startTime || "—")}–${esc(item.endTime || "—")} · 约 ${esc(durationLabel(item.startTime, item.endTime))}</small></div><button data-open-map-item="${esc(item.id)}">查看详情 ${icon("arrow-up-right")}</button>${links[0] ? `<a href="${esc(links[0].safe)}" target="_blank" rel="noopener noreferrer">攻略链接</a>` : ""}</article>`;
  refreshIcons();
}

function durationLabel(start, end) {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - sh * 60 - sm;
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  return `${hours ? `${hours} 小时` : ""}${hours && minutes % 60 ? " " : ""}${minutes % 60 ? `${minutes % 60} 分钟` : ""}`;
}

function prepareView() {
  const tasks = state.pack.tasks;
  const completed = tasks.filter((task) => task.status === "done").length;
  const pending = tasks.filter((task) => task.status === "pending").length;
  const nextTask = tasks.filter((task) => task.status === "pending" && task.dueAt?.localDate).sort((a, b) => a.dueAt.localDate.localeCompare(b.dueAt.localDate))[0];
  const taskRow = (task) => `<div class="list-row task-row ${task.status === "done" ? "is-done" : ""}">${state.mode === "edit" ? `<input class="task-check" type="checkbox" data-toggle-task="${esc(task.id)}" aria-label="切换${esc(task.title)}状态" ${task.status === "done" ? "checked" : ""}>` : `<span class="task-check ${task.status === "done" ? "done" : ""}">${task.status === "done" ? icon("check") : ""}</span>`}<div class="task-main"><h4>${esc(task.title)}</h4><p>${esc(task.notes || labels[task.kind] || "")}</p><span class="tag">${esc(labels[task.kind] || task.kind)}</span></div>${task.dueAt?.localDate ? `<time class="task-due">${esc(formatDate(task.dueAt.localDate, { weekday: true }))}<br>${esc(task.dueAt.localTime || "")}</time>` : ""}${state.mode === "edit" ? `<div class="row-actions"><button data-calendar-task="${esc(task.id)}" aria-label="添加到手机日历">${icon("calendar-plus")}</button><button class="row-edit" data-open-editor="task" data-record-id="${esc(task.id)}" aria-label="编辑待办">${icon("pencil")}</button><button class="row-delete" data-delete-kind="task" data-record-id="${esc(task.id)}" aria-label="删除待办">${icon("trash-2")}</button></div>` : ""}</div>`;
  // 按出发前的时间阶段组织事项；阶段由 dueAt 与旅行日期推导，不新增 TravelPack 字段。
  const groups = groupTasksByPhase({ ...state.pack, tasks: tasks.filter((task) => task.kind !== "packing") });
  const packing = tasks.filter((task) => task.kind === "packing");
  return `<section class="view">
    ${heading("PREPARE", "准备", "按出发前的时间阶段整理事项，出发前逐项确认。")}
    ${state.mode === "edit" ? `<div class="module-actions"><button class="text-button primary-action" data-open-editor="task">${icon("plus")} 新增待办</button><button class="text-button" data-export-ics="true">${icon("calendar-plus")} 导出日历文件</button></div>` : ""}
    <div class="summary-band">
      <div class="summary-cell"><small>待完成</small><strong>${pending}</strong></div>
      <div class="summary-cell"><small>已完成</small><strong>${completed}</strong></div>
      <div class="summary-cell"><small>下一项</small><strong>${esc(nextTask?.dueAt?.localDate?.slice(5) || "—")}</strong></div>
    </div>
    <div class="prepare-phases">
      ${groups.map((group) => `<section class="list-section phase-section"><div class="field-heading"><h3>${esc(group.phase)}</h3><span>${group.tasks.length}</span></div>${group.tasks.map(taskRow).join("")}</section>`).join("") || `<section class="list-section"><p class="plain-note">暂无待办事项。</p></section>`}
    </div>
    <section class="list-section"><div class="field-heading"><h3>行李里，别忘了</h3><span>${packing.length}</span></div>${packing.map(taskRow).join("") || `<p class="plain-note">暂无携带物品。</p>`}</section>
  </section>`;
}

function expensesView() {
  const currencies = [...new Set(state.pack.expenses.map((expense) => expense.currency))];
  if (!currencies.includes(state.currency)) state.currency = currencies[0] || "CNY";
  const expenses = state.pack.expenses.filter((expense) => expense.currency === state.currency).sort((a, b) => b.date.localeCompare(a.date));
  const total = expenses.reduce((sum, expense) => sum + expense.amountMinor, 0);
  const ledger = buildLedger(state.pack, state.currency);
  const settlements = suggestSettlements(ledger);
  const totalReceivable = ledger.reduce((sum, row) => sum + row.receivable, 0);
  const totalPayable = ledger.reduce((sum, row) => sum + row.payable, 0);
  const allocationSummary = (expense) => expense.allocations
    .map((allocation) => `${personName(allocation.personId)} ${formatMoney(allocation.amountMinor, expense.currency)}`)
    .join("、");
  return `<section class="view">
    ${heading("EXPENSES", "同行记账", "按参与人核对个人应摊、实际支付和最终结算建议。")}
    ${state.mode === "edit" ? `<div class="module-actions"><button class="text-button primary-action" data-open-editor="expense">${icon("plus")} 记一笔</button></div>` : ""}
    <div class="tabs">${currencies.map((currency) => `<button class="tab-chip ${currency === state.currency ? "active" : ""}" data-currency="${currency}">${currency}</button>`).join("")}</div>
    <div class="summary-band">
      <div class="summary-cell"><small>已花</small><strong>${expenses.length ? esc(formatMoney(total, state.currency)) : "—"}</strong></div>
      <div class="summary-cell"><small>应收合计</small><strong>${ledger.length ? esc(formatMoney(totalReceivable, state.currency)) : "—"}</strong></div>
      <div class="summary-cell"><small>应付合计</small><strong>${ledger.length ? esc(formatMoney(totalPayable, state.currency)) : "—"}</strong></div>
    </div>
    <div class="expense-grid">
      <div>
        <section class="list-section"><div class="field-heading"><h3>每日费用</h3><span>${expenses.length} 笔 · ${state.pack.companions.length} 人</span></div>${expenses.map((expense) => `<div class="list-row"><div><h4>${esc(expense.title)}</h4><p>${esc(expense.date)} · ${esc(personName(expense.payerId))} 实际支付 · ${esc(expense.category || "其他")}<br>分摊：${esc(allocationSummary(expense))}${expense.notes ? ` · ${esc(expense.notes)}` : ""}</p></div><strong>${esc(formatMoney(expense.amountMinor, expense.currency))}</strong>${state.mode === "edit" ? `<div class="row-actions"><button class="row-edit" data-open-editor="expense" data-record-id="${esc(expense.id)}" aria-label="编辑账单">${icon("pencil")}</button><button class="row-delete" data-delete-kind="expense" data-record-id="${esc(expense.id)}" aria-label="删除账单">${icon("trash-2")}</button></div>` : ""}</div>`).join("") || `<p class="plain-note">还没有账单。</p>`}</section>
      </div>
      <aside class="side-stack">
        <nav class="expense-subtabs" aria-label="记账结果视图">
          <button class="${state.expensePanel === "ledger" ? "active" : ""}" data-expense-panel="ledger" aria-pressed="${state.expensePanel === "ledger"}">个人汇总</button>
          <button class="${state.expensePanel === "settlements" ? "active" : ""}" data-expense-panel="settlements" aria-pressed="${state.expensePanel === "settlements"}">结算建议</button>
        </nav>
        ${state.expensePanel === "ledger" ? `<section data-expense-view="ledger"><p class="plain-note ledger-formula">净额 = 实际支付 − 个人应摊；正数为应收，负数为应付。</p><div class="ledger">${ledger.map((row) => `<div class="list-row"><div class="person"><span class="avatar">${esc(state.pack.companions.find((person) => person.id === row.id)?.avatar || row.name.slice(0, 1))}</span><div><h4>${esc(row.name)}</h4><p>个人应摊 ${esc(formatMoney(row.spent, state.currency))}<br>实际支付 ${esc(formatMoney(row.paid, state.currency))}</p></div></div><strong class="balance ${row.balance > 0 ? "positive" : row.balance < 0 ? "negative" : ""}">${row.balance > 0 ? "应收" : row.balance < 0 ? "应付" : "已结清"}<br>${esc(formatMoney(Math.abs(row.balance), state.currency))}</strong></div>`).join("")}</div></section>` : `<section class="detail-sheet" data-expense-view="settlements"><div class="detail-block">${settlements.map((payment) => `<div class="list-row"><span>${esc(personName(payment.fromPersonId))} <b class="settlement-arrow">→</b> ${esc(personName(payment.toPersonId))}</span><strong>${esc(formatMoney(payment.amountMinor, state.currency))}</strong></div>`).join("") || `<p class="plain-note">当前无需结算。</p>`}<p class="plain-note settlement-note">全部账单先按净额互相抵销，并优先匹配金额最大的应付与应收，减少不必要的转账。总应收与总应付均为 ${esc(formatMoney(totalReceivable, state.currency))}，转账前请共同确认。</p></div></section>`}
      </aside>
    </div>
  </section>`;
}

function materialsView() {
  const kinds = ["all", "place", "ticket", "guide", "link"];
  const visible = state.pack.materials.filter((material) => state.materialKind === "all" || material.kind === state.materialKind);
  const materialIcon = { place: "map-pin", ticket: "ticket", guide: "book-open-text", link: "link" };
  return `<section class="view">
    ${heading("MATERIALS", "旅行资料", "地点、票据、攻略与链接按类型集中保存。")}
    ${state.mode === "edit" ? `<div class="module-actions"><button class="text-button primary-action" data-open-editor="material">${icon("plus")} 新增资料</button>${state.attachmentsEnabled ? `<button class="text-button" data-open-attachments="true">${icon("paperclip")} 上传附件</button>` : `<button class="text-button" type="button" disabled title="当前部署未启用附件存储">${icon("paperclip")} 附件未启用</button>`}</div>` : ""}
    <div class="tabs material-filter">${kinds.map((kind) => `<button class="tab-chip ${kind === state.materialKind ? "active" : ""}" data-material-kind="${kind}">${kind === "all" ? "全部" : labels[kind]}</button>`).join("")}</div>
    <div class="material-list">
      ${visible.map((material) => {
        const url = safeUrl(material.url);
        const assets = (material.assetIds || []).map((id) => state.pack.assets.find((asset) => asset.id === id)).filter(Boolean);
        const attachmentLinks = assets.length ? `<div class="attachment-links">${assets.map((asset) => `<a href="${esc(attachmentUrl(asset.id))}" target="_blank" rel="noopener">${icon("paperclip")} ${esc(asset.name || asset.id)}</a>`).join("")}</div>` : "";
        const access = material.sensitive ? `<span class="private-label">${icon("lock-keyhole")} ${assets.length ? `${assets.length} 个私密附件` : "原件已隐藏"}</span>` : url ? `<a class="open-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">查看资料 ${icon("arrow-up-right")}</a>` : `<span class="private-label">待补充内容</span>`;
        const actions = state.mode === "edit" ? `<div class="row-actions"><button class="row-edit" data-open-editor="material" data-record-id="${esc(material.id)}" aria-label="编辑资料">${icon("pencil")}</button><button class="row-delete" data-delete-kind="material" data-record-id="${esc(material.id)}" aria-label="删除资料">${icon("trash-2")}</button></div>` : access;
        return `<article class="material-row"><span class="material-icon">${icon(materialIcon[material.kind] || "file")}</span><div><h3>${esc(material.title)}</h3><p>${esc(material.description || "")}</p><span class="tag">${esc(labels[material.kind] || material.kind)}</span>${attachmentLinks}</div>${actions}</article>`;
      }).join("") || `<p class="plain-note">这一分类暂无资料。</p>`}
    </div>
    <section class="source-list list-section"><div class="field-heading"><h3>来源记录</h3><span>${state.pack.sources.length}</span></div><p>动态信息显示核验状态和有效期，临行前按状态复核。</p>${state.pack.sources.map((source) => { const url = safeUrl(source.url); const freshness = source.freshness || {}; const state_ = sourceFreshness(source, localNow().date); return `<div class="list-row"><div><h4>${esc(source.title)} <span class="freshness-badge ${esc(state_.tone)}">${esc(state_.label)}</span></h4><p>${esc(source.platform)} · 核验于 ${esc(freshness.checkedAt || source.retrievedAt)}${freshness.publishedAt ? ` · 发布于 ${esc(freshness.publishedAt)}` : ""}${freshness.validUntil ? ` · 有效至 ${esc(freshness.validUntil)}` : ""}<br>${esc(source.note || "")}</p></div>${url ? `<a class="open-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">打开 ${icon("arrow-up-right")}</a>` : ""}</div>`; }).join("") || `<p class="plain-note">还没有来源记录。</p>`}</section>
  </section>`;
}

const views = {
  overview: overviewView,
  itinerary: itineraryView,
  prepare: prepareView,
  expenses: expensesView,
  materials: materialsView,
};

function render() {
  window.clearTimeout(state.mapFallbackTimer);
  state.mapFallbackTimer = null;
  if (state.map) {
    state.map.remove();
    state.map = null;
  }
  renderShell();
  $("#app").innerHTML = views[state.tab] ? views[state.tab]() : overviewView();
  refreshIcons();
  setupHomeReveal();
  if (state.tab === "itinerary") {
    mountMap();
    requestAnimationFrame(() => document.querySelector(".day-button.active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }));
  }
  $("#app").focus({ preventScroll: true });
}

async function ensureEditReady() {
  if (state.mode !== "edit" || !hostAdapter?.prepareEdit) return true;
  try {
    await hostAdapter.prepareEdit();
    return true;
  } catch (error) {
    if (error?.code !== "auth_cancelled") toast(error?.message || "请先完成登录，再继续编辑");
    return false;
  }
}

// ── AI Copilot（全局能力，不是一级模块）─────────────────────────────────────────
// 前端不保存模型 Key、不硬编码模型接口：有宿主桥接时交给宿主，没有时给出可复制的 Skill 请求。

function copilotDayLabel(dayId) {
  const day = state.pack.days.find((entry) => entry.id === dayId);
  return day ? `${day.title}（${day.date}）` : "";
}

function copilotDraft() {
  const dayId = state.copilotSource?.dayId ?? (state.dayId === "all" ? null : state.dayId);
  const itineraryItemId = state.copilotSource?.itineraryItemId ?? state.selectedItineraryItemId ?? null;
  const quick = COPILOT_QUICK_ACTIONS.find((entry) => entry.id === state.copilotAction) || null;
  const typed = String(state.copilotText || "").trim();
  const text = typed || quickActionRequestText(quick);
  const request = buildAgentRequest({
    action: quick?.action || "freeform",
    pack: state.pack,
    text,
    module: state.tab,
    dayId,
    itineraryItemId,
  });
  const context = itineraryItemContext(state.pack, itineraryItemId);
  return { request, quick, text, dayId, itineraryItemId, dayLabel: copilotDayLabel(dayId), placeName: context?.place?.name || "" };
}

function renderCopilot() {
  if (!state.pack) return;
  const bridged = hasAgentBridge(hostAdapter);
  const draft = copilotDraft();
  $("#copilotContext").textContent = `${contextSummary(state.pack, { module: state.tab, dayId: draft.dayId, itineraryItemId: draft.itineraryItemId })} · 打开时已带上当前页面上下文。`;
  $("#copilotQuick").innerHTML = quickActionsMarkup(state.copilotAction);
  const textarea = $("#copilotText");
  if (document.activeElement !== textarea) textarea.value = state.copilotText;
  const box = $("#copilotRequest");
  const hasRequest = Boolean(draft.text);
  box.hidden = !hasRequest;
  if (!hasRequest) return;
  $("#copilotRequestTitle").textContent = draft.quick ? draft.quick.label : "调整请求";
  $("#copilotMode").textContent = bridged ? "交给当前 Agent" : "复制给 Skill Agent";
  $("#copilotRequestText").value = formatAgentRequestText(draft.request, {
    tripTitle: state.pack.trip.title,
    dayTitle: draft.dayLabel,
    placeName: draft.placeName,
  });
  $("#copilotSend").hidden = !bridged;
  $("#copilotHint").textContent = bridged
    ? "提交后由当前宿主的 Agent 处理；网页本身不会直接改写旅行数据。"
    : "网页不会自动重规划。请把这段请求交给安装了 AI Travel Copilot Skill 的 Agent。";
  refreshIcons();
}

function openCopilot({ action = null, text = "", source = null } = {}) {
  state.copilotAction = action;
  state.copilotText = text;
  state.copilotSource = source;
  renderCopilot();
  const dialog = $("#copilotDialog");
  if (!dialog.open) dialog.showModal();
}

async function copyCopilotRequest() {
  const field = $("#copilotRequestText");
  if (!field.value) return;
  try {
    await navigator.clipboard.writeText(field.value);
    toast("调整请求已复制");
  } catch {
    field.focus();
    field.select();
    toast("请手动复制选中的请求");
  }
}

async function sendCopilotRequest() {
  if (!hasAgentBridge(hostAdapter)) return;
  const draft = copilotDraft();
  const button = $("#copilotSend");
  button.disabled = true;
  try {
    const result = await hostAdapter[AGENT_BRIDGE_METHOD](draft.request);
    toast(result?.message || "调整请求已交给当前 Agent");
  } catch (error) {
    toast(error?.message || "宿主暂时无法处理，可复制请求交给 Agent");
  } finally {
    button.disabled = false;
  }
}

function openAlternatives(itemId) {
  const context = itineraryItemContext(state.pack, itemId);
  if (!context) return;
  state.selectedItineraryItemId = itemId;
  const list = alternativesFor(state.pack, { itineraryItemId: itemId, placeId: context.item.placeId });
  $("#alternativesNote").textContent = `当前：${context.place?.name || "行程节点"}。选择替代方案会先生成一条变更请求，网页不会直接改写整份旅行数据。`;
  $("#alternativesBody").innerHTML = alternativesMarkup(list);
  $("#alternativesDialog").showModal();
  refreshIcons();
}

function requestSwap(alternativeId) {
  const alternative = (state.pack.alternatives || []).find((entry) => entry.id === alternativeId);
  if (!alternative) return;
  const itemId = state.selectedItineraryItemId;
  const context = itineraryItemContext(state.pack, itemId);
  const text = swapRequestText(alternative, context?.place?.name || "");
  $("#alternativesDialog").close();
  openCopilot({ text, source: { dayId: context?.item?.dayId || null, itineraryItemId: itemId } });
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || !state.pack) return;
  // 注意：dataset 解构名不得与模块级函数同名，否则会在处理器作用域内遮蔽函数（如 openAlternatives）。
  const { tab, purpose, segment, day, currency, expensePanel, materialKind, openAttachments, attachmentMaterialId, openEditor, openSection, recordId, shiftItem, direction, exportIcs, deleteKind, defaultDay, mapMode, selectMapItem, openMapItem, calendarTask, itineraryView: itineraryViewMode, openAlternatives: alternativesForItem, copilotDay, copilotQuick, swapAlternative, homeAction, homeDay } = button.dataset;
  if (openEditor) {
    if (!await ensureEditReady()) return;
    const section = { trip: "trip", itinerary: "itinerary", place: "places", stay: "places", transport: "transport", task: "tasks", expense: "expenses", material: "materials" }[openEditor];
    openMaintenance(section, { kind: openEditor, id: recordId || null, seed: defaultDay ? { dayId: defaultDay } : undefined });
  } else if (openSection) {
    if (!await ensureEditReady()) return;
    openMaintenance(openSection);
  } else if (shiftItem) {
    const item = state.pack.itineraryItems.find((entry) => entry.id === shiftItem);
    const ordered = state.pack.itineraryItems.filter((entry) => entry.dayId === item?.dayId).sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((entry) => entry.id === shiftItem);
    const target = index + Number(direction);
    if (target >= 0 && target < ordered.length) {
      const beforeId = Number(direction) < 0 ? ordered[target].id : ordered[target + 1]?.id || null;
      await saveStructured(moveItineraryItem(state.pack, shiftItem, item.dayId, beforeId), "顺序已保存");
    }
  } else if (deleteKind) {
    const isTransport = deleteKind === "transport";
    if (!window.confirm(isTransport ? "确定清空这张票据吗？关联资料与附件会保留。" : "确定删除这条记录吗？相关附件会保留。")) return;
    const collections = { itinerary: "itineraryItems", transport: "transportSegments", stay: "stays", task: "tasks", expense: "expenses", material: "materials" };
    const document = deleteRecord(state.pack, collections[deleteKind], recordId);
    await saveStructured(document, isTransport ? "票据已清空" : "记录已删除");
  } else if (exportIcs) {
    await addTasksToCalendar();
  } else if (calendarTask) {
    await addTasksToCalendar(calendarTask);
  } else if (copilotQuick) {
    const quick = COPILOT_QUICK_ACTIONS.find((entry) => entry.id === copilotQuick);
    state.copilotAction = quick?.id || null;
    state.copilotText = quickActionRequestText(quick);
    renderCopilot();
  } else if (copilotDay) {
    openCopilot({ source: { dayId: copilotDay, itineraryItemId: state.selectedItineraryItemId || null } });
  } else if (swapAlternative) {
    requestSwap(swapAlternative);
  } else if (alternativesForItem) {
    openAlternatives(alternativesForItem);
  } else if (itineraryViewMode) {
    state.itineraryView = itineraryViewMode;
    render();
  } else if (tab) {
    state.tab = tab;
    render();
    requestAnimationFrame(() => $("#moduleTitle")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else if (homeDay) {
    // 首页「今天的旅程」换一天，只影响首页焦点日，不动行程模块里的选择。
    state.homeDayId = homeDay;
    render();
  } else if (homeAction === "start-day") {
    // 主 CTA 真的把人送到行程模块，并把焦点落在今天（或最近的一天）。
    const focus = homeFocusDay(state.pack, localNow());
    if (focus) state.dayId = focus.id;
    state.tab = "itinerary";
    state.itineraryView = "list";
    render();
    requestAnimationFrame(() => $("#moduleTitle")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else if (homeAction === "ask-ai") {
    openCopilot({ source: { dayId: homeFocusDay(state.pack, localNow())?.id || null, itineraryItemId: null } });
  } else if (purpose) {
    state.purpose = purpose;
    state.segmentId = null;
    render();
  } else if (segment) {
    state.segmentId = segment;
    render();
  } else if (day) {
    state.dayId = day;
    render();
  } else if (currency) {
    state.currency = currency;
    render();
  } else if (expensePanel) {
    state.expensePanel = expensePanel;
    render();
  } else if (materialKind) {
    state.materialKind = materialKind;
    render();
  } else if (mapMode) {
    state.mapMode = mapMode;
    localStorage.setItem("travel-wallet-map-mode", mapMode);
    render();
  } else if (selectMapItem) {
    selectItineraryItem(selectMapItem);
  } else if (openMapItem) {
    const card = document.querySelector(`[data-map-item="${CSS.escape(openMapItem)}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.querySelector("details")?.setAttribute("open", "");
  } else if (openAttachments) {
    openAttachmentDialog(attachmentMaterialId);
  }
});

document.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-toggle-task]");
  if (input && state.pack) {
    input.disabled = true;
    const saved = await toggleTaskStatus(input.dataset.toggleTask);
    if (!saved) input.checked = !input.checked;
    input.disabled = false;
  }
});

// 点击行程卡片本体（非按钮、链接、详情折叠区）时选中该节点，地图随之高亮。
document.addEventListener("click", (event) => {
  if (!state.pack) return;
  const card = event.target.closest("[data-map-item]");
  if (!card) return;
  if (event.target.closest("button, a, summary, details, input, label, select, textarea")) return;
  selectItineraryItem(card.dataset.mapItem);
});

document.addEventListener("dragstart", (event) => {
  if (event.target.closest("[data-touch-drag], [data-drag-item]")) event.preventDefault();
});

document.addEventListener("selectstart", (event) => {
  if (event.target.closest("[data-touch-drag]")) event.preventDefault();
});

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-touch-drag]");
  if (!handle || state.mode !== "edit" || (event.pointerType === "mouse" && event.button !== 0)) return;
  state.dragItemId = handle.dataset.touchDrag;
  state.touchDropTarget = null;
  state.dragPointerId = event.pointerId;
  state.dragStartPoint = { x: event.clientX, y: event.clientY };
  state.dragActivated = false;
  event.preventDefault();
  handle.setPointerCapture?.(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  if (!state.dragItemId || event.pointerId !== state.dragPointerId) return;
  event.preventDefault();
  if (!state.dragActivated) {
    const distance = Math.hypot(event.clientX - state.dragStartPoint.x, event.clientY - state.dragStartPoint.y);
    const threshold = event.pointerType === "mouse" ? 4 : 7;
    if (distance < threshold) return;
    state.dragActivated = true;
    document.body.classList.add("drag-active");
    document.querySelector(`[data-drag-item="${CSS.escape(state.dragItemId)}"]`)?.classList.add("dragging");
    navigator.vibrate?.(18);
  }
  if (event.clientY < 100) window.scrollBy({ top: -18 });
  else if (event.clientY > window.innerHeight - 120) window.scrollBy({ top: 18 });
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-day], [data-drag-item]");
  document.querySelectorAll(".drop-target").forEach((element) => element.classList.remove("drop-target"));
  if (target && target.dataset.dragItem !== state.dragItemId) {
    const rect = target.getBoundingClientRect();
    const after = Boolean(target.dataset.dragItem) && event.clientY > rect.top + rect.height / 2;
    const next = after ? target.nextElementSibling?.closest?.("[data-drag-item]") : null;
    state.touchDropTarget = { element: target, beforeId: after ? (next?.dataset.dragItem || null) : (target.dataset.dragItem || null) };
    target.classList.add("drop-target");
    target.classList.toggle("drop-after", after);
  }
});

document.addEventListener("pointerup", async (event) => {
  if (!state.dragItemId) return;
  const itemId = state.dragItemId;
  const target = state.touchDropTarget;
  state.dragItemId = null;
  state.touchDropTarget = null;
  state.dragPointerId = null;
  state.dragStartPoint = null;
  const activated = state.dragActivated;
  state.dragActivated = false;
  document.body.classList.remove("drag-active");
  document.querySelectorAll(".dragging, .drop-target, .drop-after").forEach((element) => element.classList.remove("dragging", "drop-target", "drop-after"));
  if (!activated || !target) return;
  const beforeId = target.beforeId;
  const targetElement = target.element;
  const targetItem = beforeId ? state.pack.itineraryItems.find((item) => item.id === beforeId) : null;
  const draggedItem = state.pack.itineraryItems.find((item) => item.id === itemId);
  const dayId = targetElement.dataset.dropDay || targetItem?.dayId || targetElement.dataset.dragItem && state.pack.itineraryItems.find((item) => item.id === targetElement.dataset.dragItem)?.dayId || draggedItem?.dayId;
  if (dayId && beforeId !== itemId) await saveStructured(moveItineraryItem(state.pack, itemId, dayId, beforeId), "行程已拖动保存");
});

document.addEventListener("pointercancel", () => {
  state.dragItemId = null;
  state.touchDropTarget = null;
  state.dragPointerId = null;
  state.dragStartPoint = null;
  state.dragActivated = false;
  document.body.classList.remove("drag-active");
  document.querySelectorAll(".dragging, .drop-target, .drop-after").forEach((element) => element.classList.remove("dragging", "drop-target", "drop-after"));
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("travel-wallet-theme", theme);
  $("#themeButton").innerHTML = icon(theme === "dark" ? "sun" : "moon");
  refreshIcons();
}

$("#themeButton").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
applyTheme(localStorage.getItem("travel-wallet-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

function applyStyle(style, persist = true) {
  const next = styleLabels[style] ? style : DEFAULT_STYLE;
  document.documentElement.dataset.style = next;
  $("#styleButton span").textContent = styleLabels[next];
  $("#styleButton").setAttribute("aria-label", `选择界面风格，当前${styleLabels[next]}`);
  $("#styleDialog").querySelectorAll("[data-style-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.styleChoice === next));
  });
  if (persist) localStorage.setItem("travel-wallet-style", next);
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--navy").trim() || "#1450d2";
  refreshIcons();
  // 切到晴日手账时按需取回首页生产资产，再重绘一次。
  if (next === STORYBOOK_STYLE_ID && !state.homeAssets) {
    ensureHomeAssets().then(() => {
      if (state.pack && isStorybookHome()) render();
    });
  }
}

$("#styleButton").addEventListener("click", () => $("#styleDialog").showModal());
$("#styleDialog").addEventListener("click", (event) => {
  const choice = event.target.closest("[data-style-choice]");
  if (choice) applyStyle(choice.dataset.styleChoice);
});
$("#styleDialogClose").addEventListener("click", () => $("#styleDialog").close());
$("#styleDialogDone").addEventListener("click", () => $("#styleDialog").close());
applyStyle(localStorage.getItem("travel-wallet-style") || DEFAULT_STYLE, false);

function setSaveState(text, kind = "") {
  const element = $("#saveState");
  element.textContent = text;
  element.className = `save-state ${kind}`.trim();
}

function exportDocument() {
  const blob = new Blob([serializeTravelPack(state.pack)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.pack.trip.id}.travelpack.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("TravelPack 已导出");
}

function downloadJson(payload, filename) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportAttachmentManifest() {
  downloadJson(buildAttachmentManifest(state.pack), `${state.pack.trip.id}.attachments.json`);
  toast("附件清单已导出");
}

function openDataDialog() {
  $("#jsonEditor").value = JSON.stringify(state.pack, null, 2);
  $("#dialogError").textContent = "";
  $("#dataDialog").showModal();
}

function closeDataDialog() {
  if (!state.saving) $("#dataDialog").close();
}

async function saveEditor() {
  if (state.saving) return;
  const errorElement = $("#dialogError");
  errorElement.textContent = "";
  let document;
  try {
    document = parseTravelPack($("#jsonEditor").value);
  } catch {
    errorElement.textContent = "JSON 格式有误，请检查逗号、引号和括号。";
    return;
  }
  const errors = validateTravelPack(document);
  if (errors.length) {
    errorElement.textContent = errors.slice(0, 5).map((item) => `${item.path}：${item.message}`).join("\n");
    return;
  }
  state.saving = true;
  $("#saveButton").disabled = true;
  setSaveState("保存中…", "saving");
  try {
    const response = await cloudFetch(state.endpoint, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "if-match": `"${state.revision}"`,
      },
      body: JSON.stringify(document),
    });
    if (response.status === 412) {
      errorElement.textContent = "云端已有更新。当前内容仍保留在编辑框中，请另存后刷新页面，再重新应用修改。";
      setSaveState("版本有更新", "failed");
      return;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error === "invalid_travelpack" ? "旅行数据未通过服务端校验。" : "保存失败，请检查网络后重试。内容仍保留在编辑框中。");
    }
    const result = await response.json();
    state.pack = document;
    state.revision = result.revision;
    setSaveState("已保存", "saved");
    $("#dataDialog").close();
    render();
    toast("已保存到云端");
  } catch (error) {
    errorElement.textContent = error instanceof TypeError ? "保存失败，请检查网络后重试。内容仍保留在编辑框中。" : error.message;
    setSaveState("保存失败", "failed");
  } finally {
    state.saving = false;
    $("#saveButton").disabled = false;
  }
}

$("#exportButton").addEventListener("click", exportDocument);
$("#manifestButton").addEventListener("click", exportAttachmentManifest);
$("#dataButton").addEventListener("click", openDataDialog);
$("#dialogClose").addEventListener("click", closeDataDialog);
$("#dialogCancel").addEventListener("click", closeDataDialog);
$("#formatButton").addEventListener("click", () => {
  try {
    $("#jsonEditor").value = JSON.stringify(JSON.parse($("#jsonEditor").value), null, 2);
    $("#dialogError").textContent = "";
  } catch {
    $("#dialogError").textContent = "JSON 格式有误，暂时无法格式化。";
  }
});
$("#importFile").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 1024 * 1024) {
    $("#dialogError").textContent = "JSON 文件不能超过 1MB。";
    return;
  }
  $("#jsonEditor").value = await file.text();
  $("#dialogError").textContent = "文件已读取，保存前会执行 TravelPack 校验。";
  event.target.value = "";
});
$("#saveButton").addEventListener("click", saveEditor);

const maintenanceSections = [
  ["trip", "旅行"], ["itinerary", "行程"], ["places", "地点住宿"], ["transport", "交通"],
  ["tasks", "待办"], ["expenses", "记账"], ["materials", "资料"], ["agent", "Agent 更新"],
];

function options(items, value, label = (item) => item.name || item.title || item.id) {
  return items.map((item) => `<option value="${esc(item.id)}" ${item.id === value ? "selected" : ""}>${esc(label(item))}</option>`).join("");
}

function editorActions() {
  return `<div class="form-actions"><button class="text-button" type="button" data-cancel-editor="true">取消</button><button class="text-button primary-action" type="submit">保存</button></div>`;
}

function editorAttachmentButton(entry = {}, materialId = "") {
  if (!entry.id || !state.attachmentsEnabled) return "";
  return `<button class="text-button editor-attachment-button" type="button" data-open-attachments="true" ${materialId ? `data-attachment-material-id="${esc(materialId)}"` : ""}>${icon("paperclip")} 上传附件</button>`;
}

function card(title, detail, actions = "") {
  return `<article class="maintenance-card"><div><h4>${esc(title)}</h4><p>${detail}</p></div><div class="maintenance-card-actions">${actions}</div></article>`;
}

function action(label, attributes, danger = false) {
  return `<button class="mini-button ${danger ? "danger" : ""}" type="button" ${attributes}>${label}</button>`;
}

function pointFields(prefix, point = {}) {
  return `<label>${prefix === "departure" ? "出发" : "到达"}日期<input name="${prefix}Date" type="date" value="${esc(point.localDate || "")}" required></label>
    <label>${prefix === "departure" ? "出发" : "到达"}时间<input name="${prefix}Time" type="time" value="${esc(point.localTime || "")}"></label>`;
}

function tripEditor() {
  const trip = state.pack.trip;
  return `<form class="editor-form" data-form-kind="trip"><h4>旅行基本信息</h4><div class="form-grid">
    <label>标题<input name="title" value="${esc(trip.title)}" required></label><label>副标题<input name="subtitle" value="${esc(trip.subtitle || "")}"></label>
    <label>开始日期<input name="startDate" type="date" value="${esc(trip.startDate || "")}" required></label><label>结束日期<input name="endDate" type="date" value="${esc(trip.endDate || "")}" required></label>
    <label>目的地<input name="destination" value="${esc(trip.destination || "")}" required></label><label>目的地代码<input name="destinationCode" maxlength="6" value="${esc(trip.destinationCode || "")}"></label>
    <label class="wide">我的备注<textarea name="note">${esc(trip.note || "")}</textarea></label>
    </div>${editorActions()}</form>`;
}

function itineraryEditor(entry = {}) {
  const link = entry.links?.[0] || {};
  return `<form class="editor-form" data-form-kind="itinerary" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}行程节点</h4><div class="form-grid">
    <label>日期<select name="dayId" required>${options(state.pack.days, entry.dayId, (day) => `${day.date} · ${day.title || "旅行日"}`)}</select></label>
    <label>地点<select name="placeId" required>${options(state.pack.places, entry.placeId)}</select></label>
    <label>类型<select name="kind">${["visit", "meal", "shopping", "activity", "transport", "stay"].map((kind) => `<option value="${kind}" ${entry.kind === kind ? "selected" : ""}>${labels[kind]}</option>`).join("")}</select></label>
    <label>开始时间<input name="startTime" type="time" value="${esc(entry.startTime || "")}" required></label><label>结束时间<input name="endTime" type="time" value="${esc(entry.endTime || "")}" required></label>
    <label>链接标题<input name="linkTitle" value="${esc(link.title || "攻略链接")}" placeholder="如：拍照攻略"></label><label>攻略网址<input name="linkUrl" type="url" value="${esc(link.url || "")}" placeholder="https://"></label>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    </div>${editorActions()}</form>`;
}

function placeEditor(entry = {}) {
  const location = entry.location || {};
  const linkedItem = entry.id ? state.pack.itineraryItems.find((item) => item.placeId === entry.id) : null;
  const dayId = entry.dayId || linkedItem?.dayId || (state.dayId === "all" ? "" : state.dayId);
  const links = entry.links || [];
  const search = state.placeSearchEnabled ? `<section class="place-search-box wide"><label>地图关键词搜索<div class="inline-search"><input data-place-query value="${esc(state.placeSearchQuery)}" placeholder="输入景点、餐厅或地址"><button class="text-button" type="button" data-search-place="true">搜索地图</button></div></label>${state.placeResults.length ? `<div class="search-results">${state.placeResults.map((place, index) => `<button class="search-result" type="button" data-use-poi="${index}"><span>${esc(place.name)}<small>${esc(place.address || "")}</small></span><b>选择</b></button>`).join("")}</div>` : ""}</section>` : `<p class="wide capability-note">地图搜索尚未接入。可以先用名称、日期和链接创建地点；该地点不会显示地图标记。</p>`;
  return `<form class="editor-form" data-form-kind="place" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}地点</h4><input name="coordinateSystem" type="hidden" value="${esc(location.coordinateSystem || "WGS84")}"><input name="longitude" type="hidden" value="${esc(location.longitude ?? "")}"><input name="latitude" type="hidden" value="${esc(location.latitude ?? "")}"><div class="form-grid">
    ${search}
    <label>名称<input name="name" value="${esc(entry.name || "")}" required></label><label>地址<input name="address" value="${esc(entry.address || "")}"></label>
    <label>日期<select name="dayId" required><option value="">选择行程日期</option>${options(state.pack.days, dayId, (day) => `${day.date} · ${day.title || "旅行日"}`)}</select></label><label>类型<select name="kind">${["visit", "meal", "shopping", "activity"].map((kind) => `<option value="${kind}" ${linkedItem?.kind === kind ? "selected" : ""}>${labels[kind]}</option>`).join("")}</select></label>
    <label>开始时间<input name="startTime" type="time" value="${esc(linkedItem?.startTime || "")}" required></label><label>结束时间<input name="endTime" type="time" value="${esc(linkedItem?.endTime || "")}" required></label>
    <label class="check-row"><input name="alternative" type="checkbox" ${entry.alternative ? "checked" : ""}> 作为备选地点</label>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    <section class="wide place-link-editor"><div class="field-heading"><b>攻略与参考链接</b><button class="text-button" type="button" data-add-place-link="true">${icon("plus")} 添加链接</button></div><div data-place-links>${links.map((link) => placeLinkRow(link)).join("")}</div><p>支持小红书、公众号、餐厅、购票和其他网页链接。</p></section>
    </div>${editorActions()}</form>`;
}

function placeLinkRow(link = {}) {
  return `<div class="place-link-row"><input name="linkId" type="hidden" value="${esc(link.id || "")}"><label>标题<input name="linkTitle" value="${esc(link.title || "")}" placeholder="如：拍照机位"></label><label>网址<input name="linkUrl" type="url" value="${esc(link.url || "")}" placeholder="https://"></label><button type="button" data-remove-place-link="true" aria-label="删除链接">${icon("trash-2")}</button></div>`;
}

function stayEditor(entry = {}) {
  const link = entry.links?.[0] || {};
  return `<form class="editor-form" data-form-kind="stay" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}住宿</h4><div class="form-grid">
    <label>住宿地点<select name="placeId" required>${options(state.pack.places, entry.placeId)}</select></label><label>状态<select name="status">${["planned", "booked", "cancelled"].map((value) => `<option value="${value}" ${entry.status === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label>入住日期<input name="checkIn" type="date" value="${esc(entry.checkIn || "")}" required></label><label>退房日期<input name="checkOut" type="date" value="${esc(entry.checkOut || "")}" required></label>
    <label>链接标题<input name="linkTitle" value="${esc(link.title || "住宿链接")}" placeholder="如：酒店订单"></label><label>住宿网址<input name="linkUrl" type="url" value="${esc(link.url || "")}" placeholder="https://"></label>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    </div>${editorActions()}</form>`;
}

function transportEditor(entry = {}) {
  const milestoneTime = (kind) => entry.milestones?.find((item) => item.kind === kind)?.time || "";
  return `<form class="editor-form" data-form-kind="transport" data-record-id="${esc(entry.id || "")}" data-replaces-id="${esc(entry.replacesId || "")}"><h4>${entry.replacesId ? "录入替代交通" : entry.id ? "编辑" : "新增"}交通段</h4><div class="form-grid">
    <label>阶段<select name="purpose">${["outbound", "intermediate", "return"].map((value) => `<option value="${value}" ${entry.purpose === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label>方式<select name="mode">${["flight", "train", "bus", "car", "ferry", "other"].map((value) => `<option value="${value}" ${entry.mode === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label>出发地<input name="fromName" value="${esc(entry.from?.name || "")}" required></label><label>出发代码<input name="fromCode" value="${esc(entry.from?.code || "")}"></label>
    <label>到达地<input name="toName" value="${esc(entry.to?.name || "")}" required></label><label>到达代码<input name="toCode" value="${esc(entry.to?.code || "")}"></label>
    ${pointFields("departure", entry.departure)}${pointFields("arrival", entry.arrival)}
    <label>班次<input name="serviceNumber" value="${esc(entry.serviceNumber || "")}"></label><label>运营方<input name="operator" value="${esc(entry.operator || "")}"></label>
    <label>航站楼／候车区<input name="terminal" value="${esc(entry.terminal || "")}"></label><label>登机口／检票口<input name="gate" value="${esc(entry.gate || "")}"></label>
    <label>座位<input name="seat" value="${esc(entry.seat || "")}"></label><label>舱位／席别<input name="cabin" value="${esc(entry.cabin || "")}"></label>
    <label>票据类型<input name="fareType" value="${esc(entry.fareType || "")}"></label><label>状态<select name="status">${["planned", "booked", "cancelled", "replaced"].map((value) => `<option value="${value}" ${entry.status === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label class="wide">订单网页链接<input name="bookingUrl" type="url" value="${esc(entry.bookingUrl || "")}" placeholder="https://"></label>
    <label>建议到达机场／车站<input name="airportArrivalTime" type="time" value="${esc(milestoneTime("airport_arrival"))}"></label>
    <label>值机截止<input name="checkInCloseTime" type="time" value="${esc(milestoneTime("checkin_close"))}"></label>
    <label>登机／检票时间<input name="boardingTime" type="time" value="${esc(milestoneTime("boarding"))}"></label>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    </div>${editorAttachmentButton(entry, entry.materialIds?.[0])}${editorActions()}</form>`;
}

function taskEditor(entry = {}) {
  return `<form class="editor-form" data-form-kind="task" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}待办</h4><div class="form-grid">
    <label>标题<input name="title" value="${esc(entry.title || "")}" required></label><label>类型<select name="kind">${["reservation", "booking", "recheck", "general", "packing"].map((value) => `<option value="${value}" ${entry.kind === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label>提醒日期<input name="dueDate" type="date" value="${esc(entry.dueAt?.localDate || "")}"></label><label>提醒时间<input name="dueTime" type="time" value="${esc(entry.dueAt?.localTime || "")}"></label>
    <label>目标日期（可选）<input name="targetDate" type="date"></label><label>提前天数（自动计算）<input name="daysBefore" type="number" min="0" max="730"></label>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    </div>${editorActions()}</form>`;
}

function expenseEditor(entry = {}) {
  const participants = new Map((entry.allocations || []).map((row) => [row.personId, row.amountMinor]));
  const digits = ["JPY", "KRW"].includes(entry.currency) ? 0 : 2;
  const amount = entry.amountMinor ? (entry.amountMinor / 10 ** digits).toFixed(digits) : "";
  return `<form class="editor-form" data-form-kind="expense" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}账单</h4><div class="form-grid">
    <label>标题<input name="title" value="${esc(entry.title || "")}" required></label><label>日期<input name="date" type="date" value="${esc(entry.date || state.pack.trip.startDate || "")}" required></label>
    <label>分类<input name="category" value="${esc(entry.category || "其他")}"></label><label>币种<select name="currency">${["CNY", "USD", "JPY", "KRW", "EUR"].map((value) => `<option value="${value}" ${entry.currency === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label>金额<input name="amount" inputmode="decimal" value="${esc(amount)}" required></label><label>付款人<select name="payerId">${options(state.pack.companions, entry.payerId)}</select></label>
    <label>分摊方式<select name="splitMode" data-split-mode><option value="equal" ${entry.splitMode !== "custom" ? "selected" : ""}>均摊</option><option value="custom" ${entry.splitMode === "custom" ? "selected" : ""}>自定义</option></select></label>
    <div class="wide participant-grid" data-participant-grid>${state.pack.companions.map((person) => `<label><span><input name="participant" type="checkbox" value="${esc(person.id)}" ${participants.has(person.id) || !entry.id ? "checked" : ""}> ${esc(person.name)}</span><input class="custom-share" name="share_${esc(person.id)}" aria-label="${esc(person.name)}分摊金额" inputmode="decimal" value="${participants.has(person.id) ? esc((participants.get(person.id) / 10 ** digits).toFixed(digits)) : ""}" placeholder="金额"></label>`).join("")}</div>
    <p class="wide split-summary" data-split-summary></p>
    <label class="wide">笔记<textarea name="notes">${esc(entry.notes || "")}</textarea></label>
    </div>${editorActions()}</form>`;
}

function relatedOptions(selected = "") {
  const groups = [
    ["place", state.pack.places], ["itineraryItem", state.pack.itineraryItems], ["transportSegment", state.pack.transportSegments],
    ["stay", state.pack.stays], ["expense", state.pack.expenses],
  ];
  return `<option value="">不关联</option>${groups.flatMap(([type, items]) => items.map((item) => {
    const value = `${type}:${item.id}`;
    const title = item.name || item.title || item.serviceNumber || item.id;
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(labels[type] || type)} · ${esc(title)}</option>`;
  })).join("")}`;
}

function materialEditor(entry = {}) {
  const related = entry.relatedRefs?.[0] ? `${entry.relatedRefs[0].type}:${entry.relatedRefs[0].id}` : "";
  return `<form class="editor-form" data-form-kind="material" data-record-id="${esc(entry.id || "")}"><h4>${entry.id ? "编辑" : "新增"}资料</h4><div class="form-grid">
    <label>标题<input name="title" value="${esc(entry.title || "")}" required></label><label>类型<select name="kind">${["place", "ticket", "guide", "link"].map((value) => `<option value="${value}" ${entry.kind === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></label>
    <label class="wide">网址<input name="url" type="url" value="${esc(entry.url || "")}" placeholder="https://"></label><label class="wide">关联对象<select name="related">${relatedOptions(related)}</select></label>
    <label class="check-row"><input name="sensitive" type="checkbox" ${entry.sensitive ? "checked" : ""}> 敏感资料，仅编辑链接可见原件</label>
    <label class="wide">说明<textarea name="description">${esc(entry.description || "")}</textarea></label>
    </div>${editorAttachmentButton(entry, entry.id)}${editorActions()}</form>`;
}

function maintenanceBody() {
  const editor = state.maintenanceEditor;
  if (state.maintenanceSection === "trip") return tripEditor();
  if (editor?.kind === "itinerary") return itineraryEditor(editor.id ? state.pack.itineraryItems.find((item) => item.id === editor.id) : {});
  if (editor?.kind === "place") return placeEditor(editor.seed || (editor.id ? state.pack.places.find((item) => item.id === editor.id) : {}));
  if (editor?.kind === "stay") return stayEditor(editor.id ? state.pack.stays.find((item) => item.id === editor.id) : {});
  if (editor?.kind === "transport") return transportEditor(editor.seed || (editor.id ? state.pack.transportSegments.find((item) => item.id === editor.id) : {}));
  if (editor?.kind === "task") return taskEditor(editor.id ? state.pack.tasks.find((item) => item.id === editor.id) : {});
  if (editor?.kind === "expense") return expenseEditor(editor.id ? state.pack.expenses.find((item) => item.id === editor.id) : {});
  if (editor?.kind === "material") return materialEditor(editor.id ? state.pack.materials.find((item) => item.id === editor.id) : {});
  const summary = state.agentCandidate?.summary;
  if (state.maintenanceSection === "agent") return `<div class="maintenance-toolbar"><h3>导入 Agent 更新</h3></div><p class="plain-note">Agent 可提交完整 TravelPack。合并时自动保留用户备注、已完成待办、已上传资料和附件。</p><form class="editor-form" data-form-kind="agent-preview"><label>选择 Agent TravelPack<input name="agentFile" type="file" accept="application/json,.json" required></label><div class="form-actions"><button class="text-button" type="submit">生成变更预览</button></div></form>${summary ? `<div class="agent-summary">${Object.entries(summary).map(([name, value]) => `${esc(name)}：新增 ${value.added}、匹配更新 ${value.changed}、拟删除 ${value.removed}`).join("<br>")}</div><button class="text-button primary-action" type="button" data-apply-agent="true">确认并应用更新</button>` : ""}`;
  return `<p class="plain-note">请从模块页面选择新增或编辑。</p>`;
}

function renderMaintenance() {
  $("#maintenanceDialogTitle").textContent = maintenanceSections.find(([id]) => id === state.maintenanceSection)?.[1] || "编辑";
  $("#maintenanceBody").innerHTML = maintenanceBody();
  $("#maintenanceError").textContent = "";
  refreshIcons();
  const expenseForm = $("#maintenanceBody [data-form-kind='expense']");
  if (expenseForm) syncExpenseSplit(expenseForm);
}

function openMaintenance(section = "trip", editor = null) {
  state.maintenanceSection = section;
  state.maintenanceEditor = editor;
  state.agentCandidate = null;
  if (editor?.kind === "place") {
    state.placeResults = [];
    state.placeSearchQuery = "";
  }
  renderMaintenance();
  if (!$("#maintenanceDialog").open) $("#maintenanceDialog").showModal();
}

function syncExpenseSplit(form) {
  const custom = form.elements.splitMode?.value === "custom";
  const amount = Number(form.elements.amount?.value || 0);
  const shares = [...form.querySelectorAll(".custom-share")];
  shares.forEach((input) => {
    const participating = input.closest("label")?.querySelector('[name="participant"]')?.checked;
    input.hidden = !custom || !participating;
    input.disabled = !custom || !participating;
    input.max = amount > 0 ? String(amount) : "";
  });
  const summary = form.querySelector("[data-split-summary]");
  if (!summary) return;
  if (!custom) {
    summary.hidden = true;
    return;
  }
  const total = shares.filter((input) => !input.disabled).reduce((sum, input) => sum + Number(input.value || 0), 0);
  summary.hidden = false;
  summary.classList.toggle("invalid", total > amount || (amount > 0 && total !== amount));
  summary.textContent = `已分摊 ${total.toFixed(2)} / ${amount.toFixed(2)}`;
}

function closeMaintenance() {
  if (!state.saving) $("#maintenanceDialog").close();
}

async function saveStructured(document, successMessage) {
  if (state.saving) return false;
  const errors = validateTravelPack(document);
  if (errors.length) {
    $("#maintenanceError").textContent = errors.slice(0, 4).map((item) => `${item.path}：${item.message}`).join("\n");
    return false;
  }
  state.saving = true;
  setSaveState("保存中…", "saving");
  try {
    const response = await cloudFetch(state.endpoint, { method: "PUT", headers: { "content-type": "application/json", "if-match": `"${state.revision}"` }, body: JSON.stringify(document) });
    if (response.status === 412) throw new Error("云端已有更新。请保留当前页面，刷新后重新操作。");
    if (!response.ok) throw new Error("保存失败，请检查网络后重试。");
    const result = await response.json();
    state.pack = document;
    state.revision = result.revision;
    state.maintenanceEditor = null;
    setSaveState("已保存", "saved");
    render();
    if ($("#maintenanceDialog").open) $("#maintenanceDialog").close();
    toast(successMessage || "旅行已更新");
    return true;
  } catch (cause) {
    $("#maintenanceError").textContent = cause instanceof TypeError ? "保存失败，请检查网络后重试。当前表单内容仍保留。" : cause.message;
    setSaveState("保存失败", "failed");
    return false;
  } finally {
    state.saving = false;
  }
}

async function addTasksToCalendar(taskId = null) {
  const calendarPack = taskId ? { ...state.pack, tasks: state.pack.tasks.filter((task) => task.id === taskId) } : state.pack;
  if (!calendarPack.tasks.some((task) => task.dueAt?.localDate)) return void toast("请先补充提醒日期");
  const blob = new Blob([tasksToIcs(calendarPack)], { type: "text/calendar;charset=utf-8" });
  const fileName = `${state.pack.trip.id}${taskId ? `.${taskId}` : ".tasks"}.ics`;
  const file = new File([blob], fileName, { type: "text/calendar" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: taskId ? "添加旅行提醒" : "添加旅行待办到日历", text: state.pack.trip.title });
      toast("已打开手机日历分享面板");
    } catch (error) {
      if (error?.name !== "AbortError") toast("手机日历暂时无法打开");
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const mobileLike = window.matchMedia?.("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobileLike) {
    link.target = "_blank";
    link.rel = "noopener";
  } else {
    link.download = fileName;
  }
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(mobileLike ? "已打开日历文件，请选择系统日历" : "日历文件已下载");
}

async function toggleTaskStatus(taskId) {
  const document = structuredClone(state.pack);
  const task = document.tasks.find((entry) => entry.id === taskId);
  if (!task) return;
  task.status = task.status === "done" ? "pending" : "done";
  if (task.status === "done") task.completedAt = new Date().toISOString();
  else delete task.completedAt;
  return saveStructured(document, task.status === "done" ? "待办已完成" : "待办已恢复");
}

$("#maintenanceClose").addEventListener("click", closeMaintenance);
$("#maintenanceCancel").addEventListener("click", closeMaintenance);

$("#maintenanceDialog").addEventListener("click", async (event) => {
  event.stopPropagation();
  const button = event.target.closest("button");
  if (!button) return;
  const data = button.dataset;
  if (data.maintenanceSection) {
    state.maintenanceSection = data.maintenanceSection;
    state.maintenanceEditor = null;
    renderMaintenance();
  } else if (data.addKind) {
    state.maintenanceEditor = { kind: data.addKind, id: null };
    renderMaintenance();
  } else if (data.editKind) {
    state.maintenanceEditor = { kind: data.editKind, id: data.recordId };
    renderMaintenance();
  } else if (data.cancelEditor) {
    closeMaintenance();
  } else if (data.searchPlace !== undefined) {
    const input = $("#maintenanceBody [data-place-query]");
    state.placeSearchQuery = input?.value.trim() || "";
    if (!state.placeSearchQuery) return void ($("#maintenanceError").textContent = "请输入地点关键词。");
    if (!state.placeSearchEnabled) return void ($("#maintenanceError").textContent = "地图搜索连接器尚未接入，可先以名称创建地点。");
    const response = await cloudFetch(`${state.endpoint}/places-search?query=${encodeURIComponent(state.placeSearchQuery)}&region=${encodeURIComponent(state.pack.trip.destination || "")}`);
    if (!response.ok) return void ($("#maintenanceError").textContent = "地图搜索暂时不可用，可先以名称创建地点。");
    state.placeResults = (await response.json()).results || [];
    renderMaintenance();
  } else if (data.usePoi !== undefined) {
    const place = state.placeResults[Number(data.usePoi)];
    const previous = state.maintenanceEditor?.seed || (state.maintenanceEditor?.id ? state.pack.places.find((item) => item.id === state.maintenanceEditor.id) : {}) || {};
    state.maintenanceEditor = { kind: "place", id: state.maintenanceEditor?.id || null, seed: place ? { ...previous, ...place, links: previous.links || [], dayId: previous.dayId, location: place.location } : previous };
    renderMaintenance();
  } else if (data.addPlaceLink !== undefined) {
    $("#maintenanceBody [data-place-links]")?.insertAdjacentHTML("beforeend", placeLinkRow());
    refreshIcons();
  } else if (data.removePlaceLink !== undefined) {
    button.closest(".place-link-row")?.remove();
  } else if (data.shiftItem) {
    const item = state.pack.itineraryItems.find((entry) => entry.id === data.shiftItem);
    const ordered = state.pack.itineraryItems.filter((entry) => entry.dayId === item.dayId).sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const target = index + Number(data.direction);
    if (target < 0 || target >= ordered.length) return;
    const beforeId = Number(data.direction) < 0 ? ordered[target].id : ordered[target + 1]?.id || null;
    await saveStructured(moveItineraryItem(state.pack, item.id, item.dayId, beforeId), "行程顺序已更新");
  } else if (data.shiftSegment) {
    await saveStructured(reorderTransport(state.pack, data.shiftSegment, Number(data.direction)), "交通顺序已更新");
  } else if (data.toggleTask) {
    await toggleTaskStatus(data.toggleTask);
  } else if (data.cancelSegment) {
    const document = structuredClone(state.pack);
    document.transportSegments.find((item) => item.id === data.cancelSegment).status = "cancelled";
    await saveStructured(document, "交通已标记取消");
  } else if (data.replaceSegment) {
    const old = state.pack.transportSegments.find((item) => item.id === data.replaceSegment);
    state.maintenanceEditor = { kind: "transport", seed: { ...structuredClone(old), id: "", status: "planned", replacesId: old.id } };
    renderMaintenance();
  } else if (data.deleteKind) {
    if (!window.confirm("确定删除这条记录吗？相关附件会保留。")) return;
    const collections = { itinerary: "itineraryItems", stay: "stays", task: "tasks", expense: "expenses", material: "materials" };
    const collection = collections[data.deleteKind];
    const document = deleteRecord(state.pack, collection, data.recordId);
    await saveStructured(document, "记录已删除");
  } else if (data.exportIcs) {
    await addTasksToCalendar();
  } else if (data.applyAgent && state.agentCandidate) {
    await saveStructured(state.agentCandidate.document, "Agent 更新已应用，用户内容已保护");
    state.agentCandidate = null;
  }
});

$("#maintenanceDialog").addEventListener("input", (event) => {
  const form = event.target.closest("[data-form-kind='expense']");
  if (form) syncExpenseSplit(form);
});

$("#maintenanceDialog").addEventListener("change", (event) => {
  const form = event.target.closest("[data-form-kind='expense']");
  if (form) syncExpenseSplit(form);
});

$("#maintenanceDialog").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.formKind;
  const data = new FormData(form);
  const document = structuredClone(state.pack);
  try {
    if (kind === "agent-preview") {
      const file = data.get("agentFile");
      if (!file || file.size > 1024 * 1024) throw new Error("请选择 1MB 以内的 TravelPack JSON。");
      const incoming = JSON.parse(await file.text());
      const errors = validateTravelPack(incoming);
      if (errors.length) throw new Error(`Agent 数据校验失败：${errors[0].path} ${errors[0].message}`);
      state.agentCandidate = mergeAgentDocument(state.pack, incoming);
      renderMaintenance();
      return;
    }
    if (kind === "trip") {
      document.trip = { ...document.trip, title: data.get("title"), subtitle: data.get("subtitle"), startDate: data.get("startDate"), endDate: data.get("endDate"), destination: data.get("destination"), destinationCode: String(data.get("destinationCode") || "").toUpperCase(), note: data.get("note") };
    }
    if (kind === "itinerary") {
      const id = form.dataset.recordId || makeId("item");
      const old = document.itineraryItems.find((item) => item.id === id);
      if (data.get("endTime") <= data.get("startTime")) throw new Error("结束时间需要晚于开始时间。");
      const linkUrl = String(data.get("linkUrl") || "").trim();
      if (linkUrl && !safeUrl(linkUrl)) throw new Error("攻略网址需使用 http 或 https。");
      const record = { id, dayId: data.get("dayId"), placeId: data.get("placeId"), order: old?.order ?? document.itineraryItems.filter((item) => item.dayId === data.get("dayId")).length, kind: data.get("kind"), startTime: data.get("startTime"), endTime: data.get("endTime"), notes: data.get("notes") || "", links: linkUrl ? [{ id: old?.links?.[0]?.id || makeId("link"), title: data.get("linkTitle") || "攻略链接", url: linkUrl }] : [] };
      if (old) Object.assign(old, record); else document.itineraryItems.push(record);
      for (const day of document.days) document.itineraryItems.filter((item) => item.dayId === day.id).sort((a, b) => a.order - b.order).forEach((item, index) => { item.order = index; });
    }
    if (kind === "place") {
      const id = form.dataset.recordId || makeId("place");
      const longitude = data.get("longitude");
      const latitude = data.get("latitude");
      let location = longitude !== "" && latitude !== "" ? { longitude: Number(longitude), latitude: Number(latitude), coordinateSystem: data.get("coordinateSystem") || "WGS84" } : null;
      if (location?.coordinateSystem === "GCJ02") location = gcj02ToWgs84(location.longitude, location.latitude);
      const titles = data.getAll("linkTitle");
      const linkIds = data.getAll("linkId");
      const links = data.getAll("linkUrl").map((url, index) => ({ id: linkIds[index] || makeId("link"), title: titles[index] || "参考链接", url: String(url).trim() })).filter((link) => link.url);
      const record = { id, name: data.get("name"), address: data.get("address") || "", alternative: data.has("alternative"), notes: data.get("notes") || "", links, ...(location ? { location } : {}) };
      const old = document.places.find((item) => item.id === id);
      if (old) Object.assign(old, record); else document.places.push(record);
      const linkedItem = document.itineraryItems.find((item) => item.placeId === id);
      if (data.get("endTime") <= data.get("startTime")) throw new Error("结束时间需要晚于开始时间。");
      const itinerary = { id: linkedItem?.id || makeId("item"), dayId: data.get("dayId"), placeId: id, order: linkedItem?.order ?? document.itineraryItems.filter((item) => item.dayId === data.get("dayId")).length, kind: data.get("kind"), startTime: data.get("startTime"), endTime: data.get("endTime"), notes: linkedItem?.notes || "" };
      if (linkedItem) Object.assign(linkedItem, itinerary); else document.itineraryItems.push(itinerary);
      for (const day of document.days) document.itineraryItems.filter((item) => item.dayId === day.id).sort((a, b) => a.order - b.order).forEach((item, index) => { item.order = index; });
    }
    if (kind === "stay") {
      const id = form.dataset.recordId || makeId("stay");
      const old = document.stays.find((item) => item.id === id);
      const linkUrl = String(data.get("linkUrl") || "").trim();
      if (linkUrl && !safeUrl(linkUrl)) throw new Error("住宿网址需使用 http 或 https。");
      const record = { id, placeId: data.get("placeId"), checkIn: data.get("checkIn"), checkOut: data.get("checkOut"), status: data.get("status"), notes: data.get("notes") || "", links: linkUrl ? [{ id: old?.links?.[0]?.id || makeId("link"), title: data.get("linkTitle") || "住宿链接", url: linkUrl }] : [], materialIds: old?.materialIds || [] };
      if (old) Object.assign(old, record); else document.stays.push(record);
    }
    if (kind === "transport") {
      const id = form.dataset.recordId || makeId("segment");
      const old = document.transportSegments.find((item) => item.id === id);
      const point = (prefix) => ({ localDate: data.get(`${prefix}Date`), localTime: data.get(`${prefix}Time`) || null, timezone: document.trip.defaultTimezone || "Asia/Shanghai", precision: data.get(`${prefix}Time`) ? "minute" : "date" });
      const editedMilestoneKinds = new Set(["airport_arrival", "checkin_close", "boarding"]);
      const milestones = (old?.milestones || []).filter((item) => !editedMilestoneKinds.has(item.kind));
      [["airport_arrival", "建议到达机场／车站", "airportArrivalTime"], ["checkin_close", "值机截止", "checkInCloseTime"], ["boarding", "登机／检票时间", "boardingTime"]].forEach(([milestoneKind, label, field]) => {
        const time = data.get(field);
        if (time) milestones.push({ kind: milestoneKind, label, time });
      });
      const bookingUrl = String(data.get("bookingUrl") || "").trim();
      if (bookingUrl && !safeUrl(bookingUrl)) throw new Error("订单链接需使用 http 或 https。");
      const record = { id, purpose: data.get("purpose"), mode: data.get("mode"), from: { name: data.get("fromName"), code: data.get("fromCode") || "" }, to: { name: data.get("toName"), code: data.get("toCode") || "" }, departure: point("departure"), arrival: point("arrival"), serviceNumber: data.get("serviceNumber") || "", operator: data.get("operator") || "", terminal: data.get("terminal") || "", gate: data.get("gate") || "", seat: data.get("seat") || "", cabin: data.get("cabin") || "", fareType: data.get("fareType") || "", bookingUrl: bookingUrl || null, status: data.get("status"), notes: data.get("notes") || "", milestones, materialIds: old?.materialIds || [] };
      if (old) Object.assign(old, record); else document.transportSegments.push(record);
      if (form.dataset.replacesId) document.transportSegments.find((item) => item.id === form.dataset.replacesId).status = "replaced";
    }
    if (kind === "task") {
      const id = form.dataset.recordId || makeId("task");
      const old = document.tasks.find((item) => item.id === id);
      let dueDate = data.get("dueDate");
      if (!dueDate && data.get("targetDate") && data.get("daysBefore")) dueDate = dueDateFromAdvance(data.get("targetDate"), Number(data.get("daysBefore")));
      const dueAt = dueDate ? { localDate: dueDate, localTime: data.get("dueTime") || "09:00", timezone: document.trip.defaultTimezone || "Asia/Shanghai", precision: "minute" } : null;
      const record = { id, title: data.get("title"), kind: data.get("kind"), status: old?.status || "pending", dueAt, relatedRefs: old?.relatedRefs || [], notes: data.get("notes") || "" };
      if (old) Object.assign(old, record); else document.tasks.push(record);
    }
    if (kind === "expense") {
      const id = form.dataset.recordId || makeId("expense");
      const old = document.expenses.find((item) => item.id === id);
      const currency = data.get("currency");
      const amountMinor = parseAmount(data.get("amount"), currency);
      const participants = data.getAll("participant");
      let allocations;
      if (data.get("splitMode") === "custom") {
        allocations = participants.map((personId) => ({ personId, amountMinor: parseAmount(data.get(`share_${personId}`), currency) }));
        if (allocations.some((row) => row.amountMinor > amountMinor)) throw new Error("单人分摊金额不能大于账单总额。");
        if (allocations.reduce((sum, row) => sum + row.amountMinor, 0) !== amountMinor) throw new Error("自定义分摊合计必须等于账单金额。");
      } else allocations = equalAllocations(amountMinor, participants);
      const record = { id, title: data.get("title"), date: data.get("date"), category: data.get("category") || "其他", currency, amountMinor, payerId: data.get("payerId"), splitMode: data.get("splitMode"), allocations, notes: data.get("notes") || "", materialIds: old?.materialIds || [] };
      if (old) Object.assign(old, record); else document.expenses.push(record);
    }
    if (kind === "material") {
      const id = form.dataset.recordId || makeId("material");
      const old = document.materials.find((item) => item.id === id);
      const related = String(data.get("related") || "");
      const [type, relatedId] = related.split(":");
      const record = { id, title: data.get("title"), kind: data.get("kind"), url: data.get("url") || null, description: data.get("description") || "", sensitive: data.has("sensitive"), relatedRefs: related ? [{ type, id: relatedId }] : [], assetIds: old?.assetIds || [] };
      if (old) Object.assign(old, record); else document.materials.push(record);
    }
    await saveStructured(document, "旅行内容已保存");
  } catch (cause) {
    $("#maintenanceError").textContent = cause.message || "操作失败，请检查输入。";
  }
});

function openAttachmentDialog(materialId = "") {
  const select = $("#attachmentMaterial");
  select.innerHTML = state.pack.materials.map((material) => `<option value="${esc(material.id)}">${esc(material.title)}${material.sensitive ? " · 私密" : ""}</option>`).join("");
  if (materialId && state.pack.materials.some((material) => material.id === materialId)) select.value = materialId;
  $("#attachmentError").textContent = state.pack.materials.length ? "" : "请先在 TravelPack 中添加资料条目。";
  $("#uploadAttachmentButton").disabled = !state.pack.materials.length;
  $("#attachmentDialog").showModal();
}

function closeAttachmentDialog() {
  if (!state.saving) $("#attachmentDialog").close();
}

async function uploadAttachment() {
  const [file] = $("#attachmentFile").files;
  const materialId = $("#attachmentMaterial").value;
  const errorElement = $("#attachmentError");
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  errorElement.textContent = "";
  if (!file) return void (errorElement.textContent = "请选择文件。");
  if (!allowedTypes.includes(file.type)) return void (errorElement.textContent = "文件格式不受支持。");
  if (file.size > 5 * 1024 * 1024) return void (errorElement.textContent = "文件不能超过 5MB。");
  const material = state.pack.materials.find((item) => item.id === materialId);
  if (!material) return void (errorElement.textContent = "关联资料不存在，请重新选择。");

  state.saving = true;
  const button = $("#uploadAttachmentButton");
  button.disabled = true;
  button.textContent = state.pendingAttachment ? "正在重试保存…" : "正在上传…";
  setSaveState("保存中…", "saving");
  try {
    if (!state.pendingAttachment || state.pendingAttachment.materialId !== materialId) {
      const assetId = `asset-${crypto.randomUUID().replaceAll("-", "")}`;
      const upload = await cloudFetch(`${state.endpoint}/attachments/${assetId}`, {
        method: "PUT",
        headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      if (!upload.ok) {
        const payload = await upload.json().catch(() => ({}));
        const messages = {
          attachment_storage_unavailable: "附件存储尚未启用。",
          attachment_too_large: "文件不能超过 5MB。",
          attachment_type_not_allowed: "文件格式不受支持。",
          attachment_signature_mismatch: "文件内容与扩展格式不一致。",
        };
        throw new Error(messages[payload.error] || "上传失败，请检查网络后重试。文件仍保留在选择框中。");
      }
      const payload = await upload.json();
      state.pendingAttachment = { asset: payload.asset, materialId };
    }

    const attachToDocument = (pack) => {
      const document = structuredClone(pack);
      const target = document.materials.find((item) => item.id === state.pendingAttachment.materialId);
      if (!target) throw new Error("关联资料已被其他页面删除，请保留当前页面并重新选择。");
      if (!document.assets.some((asset) => asset.id === state.pendingAttachment.asset.id)) document.assets.push(state.pendingAttachment.asset);
      target.assetIds = [...new Set([...(target.assetIds || []), state.pendingAttachment.asset.id])];
      return document;
    };
    let document = attachToDocument(state.pack);
    button.textContent = "正在保存关联…";
    let saved = await cloudFetch(state.endpoint, {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": `"${state.revision}"` },
      body: JSON.stringify(document),
    });
    if (saved.status === 412) {
      button.textContent = "正在合并云端更新…";
      const latest = await cloudFetch(state.endpoint, { headers: { accept: "application/json" } });
      if (!latest.ok) throw new Error("附件已上传，读取云端更新失败。请保留当前页面并重试。");
      const payload = await latest.json();
      const errors = validateTravelPack(payload.document);
      if (errors.length) throw new Error("附件已上传，云端旅行数据校验失败。请保留当前页面并重试。");
      state.pack = payload.document;
      state.revision = payload.revision;
      document = attachToDocument(state.pack);
      saved = await cloudFetch(state.endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json", "if-match": `"${state.revision}"` },
        body: JSON.stringify(document),
      });
    }
    if (saved.status === 412) throw new Error("云端仍有新更新。附件已上传，请保留当前页面并重试。");
    if (!saved.ok) throw new Error("附件已上传，关联保存失败。请保留当前页面并重试。");
    const result = await saved.json();
    state.pack = document;
    state.revision = result.revision;
    state.pendingAttachment = null;
    $("#attachmentFile").value = "";
    setSaveState("已保存", "saved");
    $("#attachmentDialog").close();
    render();
    toast("附件已上传并关联");
  } catch (cause) {
    errorElement.textContent = cause instanceof TypeError ? "上传失败，请检查网络后重试。文件仍保留在选择框中。" : cause.message;
    setSaveState("保存失败", "failed");
    button.textContent = "重试上传与保存";
  } finally {
    state.saving = false;
    button.disabled = false;
    if (!errorElement.textContent) button.textContent = "上传并保存";
  }
}

$("#attachmentDialogClose").addEventListener("click", closeAttachmentDialog);
$("#attachmentCancel").addEventListener("click", closeAttachmentDialog);
$("#uploadAttachmentButton").addEventListener("click", uploadAttachment);

function openLinksDialog() {
  $("#linksError").textContent = "";
  $("#linksDialog").showModal();
}

function closeLinksDialog() {
  if (!$("#rotateLinksButton").disabled) $("#linksDialog").close();
}

async function rotateLinks() {
  if (!window.confirm("现有编辑链接和只读链接会立即失效。确定重新生成吗？")) return;
  const button = $("#rotateLinksButton");
  const error = $("#linksError");
  button.disabled = true;
  error.textContent = "";
  try {
    const response = await cloudFetch(`${state.endpoint}/access-links`, { method: "POST" });
    if (!response.ok) throw new Error("链接重新生成失败，请稍后重试。");
    const result = await response.json();
    const editUrl = new URL(result.editPath, location.origin).href;
    const readUrl = new URL(result.readPath, location.origin).href;
    $("#newEditLink").value = editUrl;
    $("#newReadLink").value = readUrl;
    $("#linkResults").hidden = false;
    if (!hostAdapter) state.endpoint = `/api/e/${encodeURIComponent(result.editToken)}`;
    if (result.editPath) history.replaceState(null, "", result.editPath);
    toast("新链接已生成，旧链接已失效");
  } catch (cause) {
    error.textContent = cause.message;
  } finally {
    button.disabled = false;
  }
}

$("#linksButton").addEventListener("click", openLinksDialog);
$("#linksDialogClose").addEventListener("click", closeLinksDialog);
$("#linksCancel").addEventListener("click", closeLinksDialog);
$("#rotateLinksButton").addEventListener("click", rotateLinks);
$("#linksDialog").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-link]");
  if (!button) return;
  const value = $(`#${button.dataset.copyLink}`).value;
  await navigator.clipboard.writeText(value);
  toast("链接已复制");
});

$("#copilotFab").addEventListener("click", () => openCopilot());
$("#copilotClose").addEventListener("click", () => $("#copilotDialog").close());
$("#copilotDone").addEventListener("click", () => $("#copilotDialog").close());
$("#copilotCopy").addEventListener("click", copyCopilotRequest);
$("#copilotSend").addEventListener("click", sendCopilotRequest);
$("#copilotDialog").addEventListener("click", (event) => {
  if (event.target === $("#copilotDialog")) $("#copilotDialog").close();
});
$("#copilotText").addEventListener("input", (event) => {
  state.copilotText = event.target.value;
  renderCopilot();
});
$("#alternativesClose").addEventListener("click", () => $("#alternativesDialog").close());
$("#alternativesDone").addEventListener("click", () => $("#alternativesDialog").close());
$("#alternativesDialog").addEventListener("click", (event) => {
  if (event.target === $("#alternativesDialog")) $("#alternativesDialog").close();
});

async function load() {
  const embedded = document.querySelector("#travelpack-data");
  if (embedded) {
    try {
      const pack = JSON.parse(embedded.textContent);
      const errors = validateTravelPack(pack);
      if (errors.length) throw new Error(`旅行数据校验失败：${errors[0].path} ${errors[0].message}`);
      state.mode = "demo";
      state.endpoint = null;
      state.pack = pack;
      state.revision = pack.baseRevision ?? null;
      state.attachmentsEnabled = false;
      state.placeSearchEnabled = false;
      applyStyle(localStorage.getItem("travel-wallet-style") || pack.appearance?.styleId || DEFAULT_STYLE, false);
      await ensureHomeAssets();
      render();
      document.body.dataset.appReady = "true";
    } catch (error) {
      document.body.dataset.appReady = "error";
      renderState("无法打开旅行", error.message || "内嵌旅行数据无效。", "circle-alert");
    }
    return;
  }
  if (hostAdapter) {
    state.mode = hostAdapter.mode === "read" ? "read" : "edit";
    state.endpoint = "host://travel";
    await loadDocument(state.endpoint);
    return;
  }
  if (location.pathname.replace(/\/$/, "") === "/demo") {
    state.mode = "demo";
    state.endpoint = "/api/demo";
    await loadDocument("/api/demo");
    return;
  }
  const route = location.pathname.match(/^\/(r|e)\/([^/]+)\/?$/);
  if (!route) {
    renderState("需要旅行分享链接", "请打开 Agent 为这趟旅行生成的只读链接或编辑链接。", "link-2");
    return;
  }
  state.mode = route[1] === "e" ? "edit" : "read";
  state.endpoint = `/api/${route[1]}/${encodeURIComponent(decodeURIComponent(route[2]))}`;
  await loadDocument(state.endpoint);
}

async function loadDocument(endpoint) {
  try {
    const response = await cloudFetch(endpoint, { headers: { accept: "application/json" } });
    if (response.status === 404) throw new Error("链接无效或已被重新生成");
    if (!response.ok) throw new Error("旅行数据暂时无法读取");
    const payload = await response.json();
    const errors = validateTravelPack(payload.document);
    if (errors.length) throw new Error(`旅行数据校验失败：${errors[0].path} ${errors[0].message}`);
    state.pack = payload.document;
    state.revision = payload.revision;
    state.attachmentsEnabled = Boolean(payload.capabilities?.attachments);
    state.placeSearchEnabled = Boolean(payload.capabilities?.placeSearch);
    state.accessLinksEnabled = hostAdapter
      ? Boolean(payload.capabilities?.accessLinks)
      : state.mode === "edit";
    applyStyle(localStorage.getItem("travel-wallet-style") || state.pack.appearance?.styleId || DEFAULT_STYLE, false);
    await ensureHomeAssets();
    render();
    document.body.dataset.appReady = "true";
    if (state.mode === "edit") toast("编辑链接已启用");
  } catch (error) {
    document.body.dataset.appReady = "error";
    renderState("无法打开旅行", error.message || "请稍后重试。", "circle-alert");
  }
}

load();
