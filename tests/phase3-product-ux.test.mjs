import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { moveItineraryItem } from "../hks-travel-skill/assets/frontend-template/maintenance.mjs";
import { buildLedger, suggestSettlements, validateTravelPack } from "../hks-travel-skill/assets/frontend-template/protocol.mjs";
import {
  COPILOT_QUICK_ACTIONS,
  ITINERARY_VIEWS,
  PRODUCT_MODULES,
  activeConstraints,
  alternativesFor,
  alternativesMarkup,
  buildAgentRequest,
  formatAgentRequestText,
  groupTasksByPhase,
  hasAgentBridge,
  isItineraryItemLocked,
  liveRecheckCount,
  lockedConstraintsMarkup,
  nextItineraryItem,
  planningReasonsFor,
  planningReasonsMarkup,
  preferenceChips,
  quickActionsMarkup,
  recheckSnapshot,
  replanSummaries,
  sourceFreshness,
  swapEntryLabel,
  swapRequestText,
  taskPhase,
  tripStatusLabel,
} from "../hks-travel-skill/assets/frontend-template/ux.mjs";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "hks-travel-skill");
const template = path.join(skill, "assets/frontend-template");
const sampleV11 = path.join(template, "travelpack.sample.json");
const sampleV12 = path.join(template, "travelpack.sample.1.2.json");
const validator = path.join(skill, "scripts/validate_travelpack.mjs");
const previewBuilder = path.join(skill, "scripts/build_static_preview.mjs");
const appSource = fs.readFileSync(path.join(template, "app.mjs"), "utf8");
const htmlSource = fs.readFileSync(path.join(template, "index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(template, "app.css"), "utf8");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const pack12 = readJson(sampleV12);
const pack11 = readJson(sampleV11);
const navMarkup = htmlSource.match(/<nav class="module-nav"[\s\S]*?<\/nav>/)[0];
const navTabs = [...navMarkup.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1]);
const navLabels = [...navMarkup.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);

test("first-level navigation exposes exactly five product modules", () => {
  assert.equal(navTabs.length, 5, `expected 5 first-level entries, saw ${navTabs.join(", ")}`);
  assert.deepEqual(navTabs, PRODUCT_MODULES.map((entry) => entry.id));
});

test("first-level navigation uses the frozen five labels", () => {
  assert.deepEqual(navLabels, ["概览", "行程", "准备", "记账", "资料"]);
  assert.deepEqual(PRODUCT_MODULES.map((entry) => entry.label), navLabels);
});

test("map is an itinerary view, not a first-level module", () => {
  assert.ok(!navTabs.includes("map"), "map must not be a first-level tab");
  assert.deepEqual(ITINERARY_VIEWS.map((view) => view.id), ["list", "map"]);
  assert.match(cssSource, /\[data-view="map"\] \.itinerary-col-list \{ display: none; \}/);
  const switcher = appSource.match(/data-itinerary-view="\$\{view\.id\}"/);
  assert.ok(switcher, "itinerary view switcher must be rendered from ITINERARY_VIEWS");
});

test("AI Copilot is a global capability, not a first-level module", () => {
  assert.ok(!navTabs.includes("copilot"), "copilot must not be a first-level tab");
  const navIndex = htmlSource.indexOf('id="moduleNav"');
  const fabIndex = htmlSource.indexOf('id="copilotFab"');
  assert.ok(fabIndex > navIndex, "copilot entry must live outside the module nav");
  assert.match(htmlSource, /class="copilot-fab"/);
  assert.match(htmlSource, /id="copilotDialog"/);
  assert.match(cssSource, /\.copilot-fab \{ position: fixed;/);
  // 一级导航固定 5 项，不随新能力增加。
  assert.equal(PRODUCT_MODULES.length, 5);
});

test("TravelPack 1.2 Overview surface renders from the sample data", () => {
  assert.equal(pack12.schemaVersion, "1.2.0");
  const locked = lockedConstraintsMarkup(pack12);
  assert.match(locked, /🔒 已锁定安排/);
  assert.equal((locked.match(/class="locked-row"/g) || []).length, activeConstraints(pack12).length);
  assert.equal(activeConstraints(pack12).length, 4);
  assert.equal(preferenceChips(pack12.preferences).length, 9);
  assert.equal(replanSummaries(pack12, (id) => id).length, 2);
  const recheck = recheckSnapshot(pack12);
  assert.equal(recheck.count, 3);
  assert.match(recheck.text, /规划时有 3 项信息待复核/);
  assert.equal(liveRecheckCount(pack12), 1);
  const next = nextItineraryItem(pack12, { date: "2026-09-22", time: "10:30" });
  assert.equal(next.item.id, "item-guozijian");
  assert.equal(next.estimated, false);
  // 概览必须继承原「出行」能力。
  assert.match(appSource, /function transportPanelSection\(\)/);
  assert.match(appSource, /overview: overviewView/);
});

test("TravelPack 1.2 Overview does not advertise a fabricated realtime state", () => {
  const next = nextItineraryItem(pack12, null);
  assert.equal(next.estimated, true);
  assert.match(appSource, /暂未接入实时时间，这里按行程顺序显示下一项/);
  // 待复核数量按契约描述为规划快照，不写成实时值。
  const uxSource = fs.readFileSync(path.join(template, "ux.mjs"), "utf8");
  assert.match(uxSource, /text: `规划时有 \$\{meta\.needsRecheckCount\} 项信息待复核`/);
  assert.match(appSource, /esc\(recheck\.text\)/);
  assert.doesNotMatch(appSource, /当前实时还有/);
  assert.doesNotMatch(uxSource, /当前实时还有/);
});

test("TravelPack 1.1 keeps building a preview and degrades gracefully", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase3-11-"));
  const result = JSON.parse(execFileSync(process.execPath, [previewBuilder, sampleV11, outputDir, "--ui-review"], { encoding: "utf8" }));
  assert.equal(result.built, true);
  assert.ok(fs.existsSync(path.join(outputDir, "ux.mjs")), "ux.mjs must ship with the template");
  // 1.1 数据下所有新增能力自动退化为空，而不是报错。
  assert.equal(pack11.schemaVersion, "1.1.0");
  assert.deepEqual(validateTravelPack(pack11), []);
  assert.equal(tripStatusLabel(pack11.tripStatus), null);
  assert.equal(lockedConstraintsMarkup(pack11), "");
  assert.deepEqual(preferenceChips(pack11.preferences), []);
  assert.deepEqual(replanSummaries(pack11), []);
  assert.equal(recheckSnapshot(pack11), null);
  assert.deepEqual(planningReasonsFor(pack11, { dayId: "day-21" }), []);
  assert.deepEqual(alternativesFor(pack11, { itineraryItemId: "item-palace" }), []);
  assert.equal(nextItineraryItem(pack11, null).item.id, "item-arrival");
});

test("tripStatus renders user copy instead of raw enum values", () => {
  assert.equal(tripStatusLabel("planning"), "正在规划");
  assert.equal(tripStatusLabel("confirmed"), "行程已确认");
  assert.equal(tripStatusLabel("in-progress"), "旅行进行中");
  assert.equal(tripStatusLabel("completed"), "旅程完成");
  assert.equal(tripStatusLabel("draft"), null);
  assert.match(appSource, /tripStatusLabel\(state\.pack\.tripStatus\)/);
});

test("active constraints map to locked UI state", () => {
  assert.ok(isItineraryItemLocked(pack12, "item-palace"), "reservation constraint locks the palace item");
  assert.equal(isItineraryItemLocked(pack12, "item-lama-visit"), false);
  assert.ok(isItineraryItemLocked(pack12, "item-badaling"), "must_visit place lock reaches its item");
  assert.match(appSource, /已锁定安排，AI 调整时不会自动移动/);
  // 界面不出现 Hard Constraint 字样。
  assert.ok(!appSource.includes("Hard Constraint"), "UI copy must not expose Hard Constraint");
  assert.ok(!htmlSource.includes("Hard Constraint"));
});

test("decisionLog maps to itinerary planning reasons", () => {
  const reasons = planningReasonsFor(pack12, { itineraryItemId: "item-palace", dayId: "day-21", placeId: "place-palace" });
  assert.ok(reasons.length >= 1);
  assert.ok(reasons.every((entry) => typeof entry.reason === "string" && entry.reason.length > 0));
  const markup = planningReasonsMarkup(reasons);
  assert.match(markup, /✨/);
  assert.match(markup, /AI 安排理由/);
  assert.equal((markup.match(/<p>/g) || []).length, reasons.length);
  for (const entry of reasons) assert.ok(markup.includes(entry.reason.slice(0, 12)));
  // 只展示短理由，不出现内部推理字样。
  for (const forbidden of ["Decision Log", "Reasoning", "Chain of Thought", "chain-of-thought"]) {
    assert.ok(!markup.includes(forbidden), `UI must not show ${forbidden}`);
  }
  assert.equal(planningReasonsMarkup([], {}), "");
});

test("alternatives are associated with the current itinerary item", () => {
  assert.equal(alternativesFor(pack12, { itineraryItemId: "item-jingshan", placeId: "place-jingshan" }).length, 1);
  assert.equal(alternativesFor(pack12, { itineraryItemId: "item-badaling", placeId: "place-badaling" }).length, 1);
  assert.equal(alternativesFor(pack12, { itineraryItemId: "item-lama-visit", placeId: "place-lama" }).length, 1);
  assert.equal(alternativesFor(pack12, { itineraryItemId: "item-return", placeId: "place-capital-airport" }).length, 0);
  const markup = alternativesMarkup(alternativesFor(pack12, { itineraryItemId: "item-jingshan" }));
  assert.match(markup, /景山登顶可跳过/);
  assert.match(markup, /可选/);
  assert.match(markup, /data-swap-alternative="alternative-jingshan-skip"/);
  assert.match(alternativesMarkup([]), /没有备选方案/);
  // 选择替代方案只生成变更请求，不直接改写数据。
  assert.match(swapRequestText({ title: "X", reason: "因为更近。" }, "景山公园"), /请把「景山公园」换成「X」，理由：因为更近。/);
  assert.match(appSource, /网页不会直接改写整份旅行数据/);
  // 入口按钮语义跟随相关备选状态，数据逻辑与请求行为不变。
  assert.equal(swapEntryLabel(alternativesFor(pack12, { itineraryItemId: "item-jingshan", placeId: "place-jingshan" })), "换一个");
  assert.equal(swapEntryLabel(alternativesFor(pack12, { itineraryItemId: "item-lama-visit", placeId: "place-lama" })), "重新选择");
  assert.equal(pack12.alternatives.find((entry) => entry.id === "alternative-lama-rain").status, "selected");
  assert.equal(pack12.alternatives.find((entry) => entry.id === "alternative-jingshan-skip").status, "available");
  assert.equal(swapEntryLabel([]), "换一个");
  assert.equal(swapEntryLabel([{ status: "rejected" }]), "换一个");
  assert.equal(swapEntryLabel([{ status: "needs-recheck" }]), "换一个");
  assert.equal(swapEntryLabel([{ status: "selected" }, { status: "available" }]), "换一个", "还有可选方案时优先显示换一个");
  assert.equal(swapEntryLabel([{ status: "rejected" }, { status: "selected" }]), "重新选择");
  assert.match(appSource, /esc\(swapEntryLabel\(swaps\)\)/);
});

test("replanHistory produces user-readable summaries", () => {
  const entries = replanSummaries(pack12, (id) => `第 ${id} 天`);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].triggerLabel, "天气变化");
  assert.equal(entries[0].statusLabel, "已应用");
  assert.equal(entries[1].triggerLabel, "体力调整");
  assert.equal(entries[1].statusLabel, "待确认");
  assert.ok(entries[0].summary.length > 0);
  assert.match(appSource, /AI 最近调整/);
  // 不在界面上暴露内部 ID。
  assert.ok(!appSource.includes("replanHistory 记录"), "UI must not render raw replan ids");
});

test("copilot quick actions produce a structured agent request", () => {
  const tired = COPILOT_QUICK_ACTIONS.find((entry) => entry.id === "tired");
  const request = buildAgentRequest({
    action: tired.action,
    pack: pack12,
    text: tired.text,
    module: "itinerary",
    dayId: "day-23",
    itineraryItemId: "item-badaling",
  });
  assert.deepEqual(Object.keys(request), ["action", "tripId", "dayId", "itineraryItemId", "text", "context"]);
  assert.equal(request.action, "replan-day");
  assert.equal(request.tripId, "trip-beijing-2026");
  assert.equal(request.dayId, "day-23");
  assert.equal(request.itineraryItemId, "item-badaling");
  assert.equal(request.context.module, "itinerary");
  assert.equal(request.context.schemaVersion, "1.2.0");
  assert.equal(request.context.tripStatus, "in-progress");
  assert.equal(request.context.selectedDayId, "day-23");
  const markup = quickActionsMarkup("tired");
  assert.equal((markup.match(/class="quick-action/g) || []).length, 6);
  assert.match(markup, /data-copilot-quick="tired"/);
  assert.match(markup, /class="quick-action active" type="button" data-copilot-quick="tired"/);
  for (const label of ["今天太累了", "下雨了", "明天晚一点出发", "加一家餐厅", "想找拍照地点", "今天想少花一点"]) {
    assert.ok(markup.includes(label), `missing quick action ${label}`);
  }
  // 1.1 数据也要能生成请求，不因缺少 1.2 字段崩溃。
  const legacy = buildAgentRequest({ action: "freeform", pack: pack11, text: "换个安排" });
  assert.equal(legacy.tripId, "trip-beijing-2026");
  assert.equal(legacy.context.tripStatus, null);
});

test("copilot falls back to a copyable Skill request without a host bridge", () => {
  assert.equal(hasAgentBridge(null), false);
  assert.equal(hasAgentBridge({}), false);
  assert.equal(hasAgentBridge({ requestAgentUpdate: "no" }), false);
  assert.equal(hasAgentBridge({ requestAgentUpdate: () => {} }), true);
  const request = buildAgentRequest({ action: "replan-day", pack: pack12, text: "今天比较累，请减少步行和跨区移动。", module: "itinerary", dayId: "day-22", itineraryItemId: "item-lama-visit" });
  const text = formatAgentRequestText(request, { tripTitle: pack12.trip.title, dayTitle: "胡同慢行（2026-09-22）", placeName: "雍和宫" });
  assert.match(text, /【AI Travel Copilot 调整请求】/);
  assert.match(text, /- 旅行：北京，慢慢走/);
  assert.match(text, /- 日期：胡同慢行（2026-09-22）/);
  assert.match(text, /- 当前节点：雍和宫/);
  assert.match(text, /保留所有已锁定安排/);
  assert.match(text, /只重规划最小受影响范围/);
  assert.match(text, /写入 replanHistory/);
  assert.match(appSource, /网页不会自动重规划/);
  assert.match(htmlSource, /复制调整请求/);
});

test("frontend never stores model credentials", () => {
  const sources = [appSource, htmlSource, fs.readFileSync(path.join(template, "ux.mjs"), "utf8"), cssSource];
  for (const source of sources) {
    assert.doesNotMatch(source, /\bsk-[A-Za-z0-9_-]{16,}\b/, "no provider key literals");
    assert.doesNotMatch(source, /\bAKID[A-Za-z0-9]{12,}\b/);
    assert.doesNotMatch(source, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
    assert.doesNotMatch(source, /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/i, "no hardcoded model endpoint");
    assert.doesNotMatch(source, /(?:apiKey|api_key|accessToken|clientSecret)\s*[:=]\s*["'][^"']+["']/, "no inline credential assignment");
  }
  // 唯一的外部 Agent 通道是宿主适配器方法。
  assert.match(appSource, /AGENT_BRIDGE_METHOD/);
  const request = buildAgentRequest({ action: "freeze", pack: pack12, text: "" });
  const serialized = JSON.stringify(request).toLowerCase();
  for (const key of ["apikey", "api_key", "token", "secret", "password", "cookie", "authorization"]) {
    assert.ok(!serialized.includes(key), `agent request must not carry ${key}`);
  }
  assert.match(htmlSource, /本次操作结果中|不影响|只读/);
});

test("list and map share a single selected itinerary state", () => {
  assert.ok(!appSource.includes("selectedMapItemId"), "legacy duplicated selection state must be gone");
  const occurrences = (appSource.match(/selectedItineraryItemId/g) || []).length;
  assert.ok(occurrences >= 5, "one selection state should drive list, map and copilot context");
  assert.match(appSource, /function selectItineraryItem\(itemId\)/);
  // 两个方向都写同一个状态。
  assert.match(appSource, /selectItineraryItem\(selectMapItem\)/);
  assert.match(appSource, /selectItineraryItem\(card\.dataset\.mapItem\)/);
  assert.match(appSource, /\.map-marker"\)\.forEach/);
  assert.match(appSource, /\.route-stop"\)\.forEach/);
  // 列表与地图读取同一份排序结果。
  assert.match(appSource, /sort\(\(a, b\) => a\.order - b\.order\)/);
});

test("itinerary drag and reorder capability is preserved", () => {
  assert.match(appSource, /data-touch-drag=/);
  assert.match(appSource, /class="drag-handle"/);
  assert.match(appSource, /data-drop-list="true"/);
  assert.match(appSource, /data-drop-day=/);
  assert.match(appSource, /moveItineraryItem/);
  // Pointer Events 阈值仍然存在（桌面 4px / 触摸 7px）。
  assert.match(appSource, /const threshold = event\.pointerType === "mouse" \? 4 : 7;/);
  assert.match(appSource, /pointerdown/);
  assert.match(appSource, /pointermove/);
  assert.match(appSource, /pointerup/);
  // 重排逻辑本身仍然可用。
  const moved = moveItineraryItem(pack12, "item-lama-visit", "day-23", "item-badaling");
  const day23 = moved.itineraryItems.filter((item) => item.dayId === "day-23").sort((a, b) => a.order - b.order);
  assert.deepEqual(day23.map((item) => item.id), ["item-beijing-north", "item-lama-visit", "item-badaling"]);
  const day22 = moved.itineraryItems.filter((item) => item.dayId === "day-22").sort((a, b) => a.order - b.order);
  assert.deepEqual(day22.map((item) => item.order), day22.map((entry, index) => index));
});

test("dataset keys in the click handler never shadow module functions", () => {
  // 严格限定在点击处理器那一条解构语句内（对象字面量里没有 `}`）。
  const destructure = appSource.match(/const \{([^}]*)\} = button\.dataset;/);
  assert.ok(destructure, "click handler must destructure button.dataset");
  // 取实际绑定的名字：`key: binding` 只有绑定名会进入作用域。
  const bindings = destructure[1]
    .split(",")
    .map((part) => (part.includes(":") ? part.split(":")[1] : part).trim())
    .filter(Boolean);
  const functionNames = [...appSource.matchAll(/^function ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((match) => match[1]);
  const collisions = bindings.filter((binding) => functionNames.includes(binding));
  assert.deepEqual(collisions, [], `dataset bindings shadow module functions: ${collisions.join(", ")}`);
  // 历史 bug 回归：openAlternatives 曾被同名绑定遮蔽。
  assert.ok(bindings.includes("alternativesForItem"));
  assert.ok(!bindings.includes("openAlternatives"));
});

test("budget calculations are unchanged and summaries are derived", () => {
  const ledger = buildLedger(pack12, "CNY");
  assert.equal(ledger.length, pack12.companions.length);
  assert.equal(ledger.reduce((sum, row) => sum + row.balance, 0), 0);
  const total = pack12.expenses.filter((expense) => expense.currency === "CNY").reduce((sum, expense) => sum + expense.amountMinor, 0);
  assert.equal(ledger.reduce((sum, row) => sum + row.paid, 0), total);
  const receivable = ledger.reduce((sum, row) => sum + row.receivable, 0);
  const payable = ledger.reduce((sum, row) => sum + row.payable, 0);
  assert.equal(receivable, payable);
  const settlements = suggestSettlements(ledger);
  assert.equal(settlements.reduce((sum, payment) => sum + payment.amountMinor, 0), receivable);
  // 首页摘要全部由现有账单推导，不新增总预算字段。
  assert.match(appSource, /<small>已花<\/small>/);
  assert.match(appSource, /<small>应收合计<\/small>/);
  assert.match(appSource, /<small>应付合计<\/small>/);
  assert.ok(!appSource.includes("总预算"), "must not invent a budget field");
});

test("prepare regroups tasks by departure phase without new schema fields", () => {
  const groups = groupTasksByPhase(pack12);
  assert.deepEqual(groups.map((group) => group.phase), ["出发前 7 天", "出发前一周内", "旅行中", "待排期"]);
  // 分桶边界不变，仅展示文案更准确：距出发 1–6 天归入「出发前一周内」。
  assert.equal(taskPhase("2026-09-14", pack12.trip), "出发前一周内");
  assert.equal(taskPhase("2026-09-13", pack12.trip), "出发前 7 天");
  assert.equal(taskPhase("2026-09-08", pack12.trip), "出发前 7 天");
  assert.equal(taskPhase("2026-08-20", pack12.trip), "出发前 30 天");
  assert.equal(taskPhase("2026-09-22", pack12.trip), "旅行中");
  assert.equal(groups.reduce((sum, group) => sum + group.tasks.length, 0), pack12.tasks.length);
  assert.match(appSource, /groupTasksByPhase/);
  assert.match(appSource, /行李里，别忘了/);
  // 三列统计容器保持不变。
  assert.match(appSource, /<small>待完成<\/small>/);
  assert.match(appSource, /<small>已完成<\/small>/);
  assert.match(appSource, /<small>下一项<\/small>/);
});

test("materials express source freshness in user language", () => {
  assert.deepEqual(sourceFreshness({ freshness: { status: "current" } }, "2026-09-20"), { label: "当前有效", tone: "ok" });
  assert.deepEqual(sourceFreshness({ freshness: { status: "needs-recheck" } }, "2026-09-20"), { label: "建议复核", tone: "warn" });
  assert.deepEqual(sourceFreshness({ freshness: { status: "current", validUntil: "2026-09-19" } }, "2026-09-20"), { label: "已过期", tone: "danger" });
  assert.deepEqual(sourceFreshness({}, null), { label: "待复核", tone: "warn" });
  assert.match(cssSource, /\.freshness-badge\.ok/);
  assert.match(cssSource, /\.freshness-badge\.warn/);
  assert.match(cssSource, /\.freshness-badge\.danger/);
});

test("generated markup escapes untrusted content", () => {
  const hostile = {
    id: "alt-x",
    title: '<img src=x onerror="alert(1)">',
    reason: "<script>alert(2)</script>",
    status: "available",
    sourceIds: [],
  };
  const markup = alternativesMarkup([hostile]);
  assert.ok(!markup.includes("<script>"), "script tags must be escaped");
  assert.ok(!markup.includes("<img"), "html tags must be escaped");
  assert.match(markup, /&lt;script&gt;/);
  const reasons = planningReasonsMarkup([{ id: "d1", kind: "other", reason: "<b>bold</b>", relatedRefs: [] }]);
  assert.ok(!reasons.includes("<b>bold</b>"));
  assert.match(reasons, /&lt;b&gt;/);
  const locked = lockedConstraintsMarkup({ constraints: [{ id: "c1", kind: "flight", status: "active", source: "user", description: "<i>x</i>", relatedRefs: [] }] });
  assert.match(locked, /&lt;i&gt;x&lt;\/i&gt;/);
});

test("both TravelPack validators keep passing through the CLI", () => {
  const legacy = JSON.parse(execFileSync(process.execPath, [validator, sampleV11], { encoding: "utf8" }));
  assert.equal(legacy.valid, true);
  assert.equal(legacy.schemaVersion, "1.1.0");
  const current = JSON.parse(execFileSync(process.execPath, [validator, sampleV12], { encoding: "utf8" }));
  assert.equal(current.valid, true);
  assert.equal(current.schemaVersion, "1.2.0");
  assert.deepEqual(current.supportedSchemaVersions, ["1.1.0", "1.2.0"]);
});

test("static preview builds for both schema versions", () => {
  for (const [label, sample] of [["1.1", sampleV11], ["1.2", sampleV12]]) {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `phase3-${label.replace(".", "")}-`));
    const result = JSON.parse(execFileSync(process.execPath, [previewBuilder, sample, outputDir, "--ui-review"], { encoding: "utf8" }));
    assert.equal(result.built, true, `${label} preview must build`);
    assert.equal(result.tripId, "trip-beijing-2026");
    const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    assert.match(html, /id="copilotFab"/);
    assert.match(html, /data-tab="overview"/);
    assert.ok(!html.includes('data-tab="map"'), "map must never become a nav entry in built output");
  }
});

test("Phase 3 keeps the phase constraints (no framework, no motion library)", () => {
  const manifest = readJson(path.join(root, "package.json"));
  assert.deepEqual(Object.keys(manifest.dependencies || {}), [], "no runtime dependencies may be added");
  for (const forbidden of ["gsap", "lottie", "animejs", "react", "vue", "vite", "framer-motion"]) {
    assert.ok(!appSource.toLowerCase().includes(forbidden), `frontend must not use ${forbidden}`);
  }
  assert.match(appSource, /from "\.\/ux\.mjs"/);
  assert.match(appSource, /from "\.\/protocol\.mjs"/);
});

test("public tree still passes the privacy audit", () => {
  const result = JSON.parse(execFileSync(process.execPath, [path.join(root, "scripts/audit-public-tree.mjs")], { encoding: "utf8" }));
  assert.equal(result.safe, true);
});
