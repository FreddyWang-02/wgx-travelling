import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { supportedStyleIds, validateTravelPack } from "../hks-travel-skill/assets/frontend-template/protocol.mjs";
import {
  DESTINATION_THEME_IDS,
  STORYBOOK_ROUTE_PATH,
  STORYBOOK_STYLE_ID,
  destinationTheme,
  homeFocusDay,
  homeHeroCopy,
  homeInspiration,
  homeJourney,
  homeLockedGroups,
  homeReasons,
  homeRouteCopy,
  homeTravelStatus,
  storybookHomeMarkup,
  themeAmbient,
  themeCollageCaptions,
  themeSceneId,
} from "../hks-travel-skill/assets/frontend-template/assets/home/home-ux.mjs";
import { HOME_ASSET_MANIFEST, homeAssetPaths } from "../hks-travel-skill/assets/frontend-template/assets/home/home-assets.mjs";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "hks-travel-skill");
const template = path.join(skill, "assets/frontend-template");
const sampleStorybook = path.join(template, "travelpack.sample.storybook.json");
const sampleV12 = path.join(template, "travelpack.sample.1.2.json");
const sampleV11 = path.join(template, "travelpack.sample.json");
const previewBuilder = path.join(skill, "scripts/build_static_preview.mjs");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const pack12 = readJson(sampleV12);
const pack11 = readJson(sampleV11);
const packSb = readJson(sampleStorybook);

const appSource = fs.readFileSync(path.join(template, "app.mjs"), "utf8");
const homeCss = fs.readFileSync(path.join(template, "assets/home/homepage.css"), "utf8");
const indexSource = fs.readFileSync(path.join(template, "index.html"), "utf8");
const baseCss = fs.readFileSync(path.join(template, "app.css"), "utf8");

const TODAY = { date: "2026-09-22", time: "10:30" };
const visibleText = (markup) => markup.replace(/<[^>]*>/g, " ");

test("storybook is an additive styleId and the six legacy ids keep their meaning", () => {
  assert.equal(STORYBOOK_STYLE_ID, "storybook");
  assert.deepEqual(supportedStyleIds, ["storybook", "aviation", "natural", "minimal", "collage", "print", "urban"]);
  // 旧枚举里的六个值必须原样保留，只是新增了一个取值。
  for (const legacy of ["aviation", "natural", "minimal", "collage", "print", "urban"]) {
    assert.ok(supportedStyleIds.includes(legacy), `${legacy} 不能被移除`);
  }
});

test("validator accepts legacy and storybook styleIds and still rejects unknown ones", () => {
  assert.deepEqual(validateTravelPack(pack11), []);
  assert.deepEqual(validateTravelPack(pack12), []);
  assert.deepEqual(validateTravelPack(packSb), []);
  const broken = { ...pack12, appearance: { styleId: "neon-city" } };
  const errors = validateTravelPack(broken);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, "appearance.styleId");
  assert.match(errors[0].message, /storybook/);
});

test("app.mjs style labels and the validator enum cannot drift apart", () => {
  const block = appSource.match(/const styleLabels = \{([\s\S]*?)\};/);
  assert.ok(block, "styleLabels must exist in app.mjs");
  const ids = [...block[1].matchAll(/^\s*([a-z-]+):/gm)].map((match) => match[1]);
  assert.deepEqual(ids.sort(), [...supportedStyleIds].sort());
  assert.match(appSource, new RegExp(`const DEFAULT_STYLE = STORYBOOK_STYLE_ID`));
});

test("destination theme is driven by the destination first and preferences only as a fallback", () => {
  assert.equal(destinationTheme({ destination: "济州岛" }), "coast");
  assert.equal(destinationTheme({ destination: "东京" }), "city");
  assert.equal(destinationTheme({ destination: "Switzerland" }), "mountain");
  assert.equal(destinationTheme({ destination: "京都" }), "heritage");
  assert.equal(destinationTheme({ destination: "云南" }), "mountain");
  assert.equal(destinationTheme({ title: "某个没听过的地方" }), "default");
  // 目的地判断不出来时才看偏好。
  assert.equal(destinationTheme({ title: "某个没听过的地方" }, { interests: ["coast"] }), "coast");
  assert.equal(destinationTheme({ destination: "东京" }, { interests: ["coast"] }), "city");
  assert.equal(destinationTheme({ title: "某个没听过的地方" }, { interests: ["不存在的兴趣"] }), "default");
  // 每个主题都必须有可用的场景、氛围元素与拼贴文案。
  for (const id of DESTINATION_THEME_IDS) {
    assert.ok(HOME_ASSET_MANIFEST.scenes.some((file) => file.endsWith(`scene-${themeSceneId(id)}.svg`)), `${id} 场景缺失`);
    assert.ok(themeAmbient(id).length >= 2, `${id} 氛围元素不足`);
    assert.equal(themeCollageCaptions(id).length, 3);
  }
});

test("every referenced production asset exists on disk", () => {
  const homeDir = path.join(template, "assets/home");
  for (const relative of homeAssetPaths()) {
    const target = path.resolve(homeDir, relative);
    assert.ok(fs.existsSync(target), `缺少生产资产 ${relative}`);
    const text = fs.readFileSync(target, "utf8");
    assert.match(text, /<svg/, `${relative} 不是 SVG`);
  }
  // 内联进 DOM 的角色必须暴露可动部件，否则 CSS 动效契约不成立。
  const puppy = fs.readFileSync(path.join(template, "assets/mascots/travel-puppy.svg"), "utf8");
  const cat = fs.readFileSync(path.join(template, "assets/mascots/travel-cat.svg"), "utf8");
  for (const part of ["pup-breathe", "pup-head", "pup-eyes", "pup-tail"]) assert.match(puppy, new RegExp(part));
  for (const part of ["cat-breathe", "cat-head", "cat-eyes", "cat-tail"]) assert.match(cat, new RegExp(part));
});

test("homepage only loads local assets and never a remote origin", () => {
  const assets = fs.readFileSync(path.join(template, "assets/home/home-assets.mjs"), "utf8");
  assert.doesNotMatch(assets, /https?:\/\//, "生产资产不得引用外部域名");
  assert.doesNotMatch(homeCss, /https?:\/\//, "首页样式不得引用外部域名");
  // 字体必须是自托管的 woff2。
  assert.match(homeCss, /url\("\.\.\/fonts\/caveat-latin-var\.woff2"\)/);
  assert.match(homeCss, /url\("\.\.\/fonts\/nunito-latin-var\.woff2"\)/);
  assert.ok(fs.existsSync(path.join(template, "assets/fonts/caveat-latin-var.woff2")));
  assert.ok(fs.existsSync(path.join(template, "assets/fonts/nunito-latin-var.woff2")));
});

test("today's journey focuses the right day and carries lock state", () => {
  const focus = homeFocusDay(pack12, TODAY);
  assert.equal(focus.id, "day-22");
  const journey = homeJourney(pack12, null, TODAY);
  assert.equal(journey.day.id, "day-22");
  assert.equal(journey.relation, "today");
  assert.equal(journey.stops.length, 2);
  assert.equal(journey.stops[0].index, 1);
  assert.ok(journey.stops[0].title.length > 0);
  // 未开始时按行程顺序落到第一个有安排的日子，不伪造「今天」。
  const first = homeJourney(pack12, null, { date: "2026-01-01", time: "09:00" });
  assert.equal(first.relation, "upcoming");
  assert.equal(first.day.id, "day-20");
  // 显式指定某一天时以该天为准。
  assert.equal(homeJourney(pack12, "day-23", TODAY).day.id, "day-23");
});

test("why-this-route prefers the focus day, falls back to the trip, and stays silent without data", () => {
  const dayScoped = homeReasons(pack12, "day-22");
  assert.equal(dayScoped.scope, "day");
  assert.ok(dayScoped.list.length > 0);
  assert.ok(dayScoped.summary.length > 0);

  const tripScoped = homeReasons(pack12, "day-20");
  assert.equal(tripScoped.scope, "trip");
  assert.ok(tripScoped.list.length > 0);
  assert.ok(tripScoped.list.length <= 4);

  const silent = homeReasons({ ...pack12, decisionLog: [] }, "day-20");
  assert.equal(silent.list.length, 0);
  assert.equal(silent.summary, "");
});

test("travel status and locked plans use user language only", () => {
  const rows = homeTravelStatus(pack12);
  assert.ok(rows.length >= 2 && rows.length <= 4);
  const tones = new Set(rows.map((row) => row.tone));
  for (const tone of tones) assert.ok(["ok", "info", "warn"].includes(tone));
  const text = JSON.stringify(rows);
  for (const leaked of ["constraint", "decisionLog", "chain-of-thought", "Hard Constraint"]) {
    assert.ok(!text.includes(leaked), `旅行状态泄漏了字段名 ${leaked}`);
  }
  assert.equal(homeLockedGroups(pack12).length, 4);
  assert.equal(homeLockedGroups(pack11).length, 0);
});

test("inspiration stays short, capped and free of full addresses", () => {
  const items = homeInspiration(pack12);
  assert.ok(items.length > 0 && items.length <= 3);
  for (const item of items) {
    assert.ok(item.note.length <= 22, `灵感卡文案过长：${item.note}`);
    assert.ok(["a", "b", "c"].includes(item.crop));
  }
  assert.deepEqual(homeInspiration({ ...pack12, places: [] }), []);
});

test("hero copy and route copy degrade to the trip itself without transport", () => {
  const hero = homeHeroCopy(pack12, "city");
  assert.equal(hero.destination, "北京");
  assert.equal(hero.destinationCode, "PEK");
  assert.equal(hero.nights, "5 天");
  assert.ok(hero.subtitle.length > 0);
  const route = homeRouteCopy(pack12);
  assert.equal(route.fromLabel, "SHA");
  assert.equal(route.toLabel, "PEK");
  const noTransport = homeRouteCopy({ ...pack12, transportSegments: [] });
  assert.equal(noTransport.toName, "北京");
  assert.ok(noTransport.fromName.length > 0);
});

test("homepage markup renders the full storybook structure", () => {
  const markup = storybookHomeMarkup(packSb, { now: TODAY });
  assert.match(markup, /class="sb-home"/);
  assert.match(markup, /class="sb-hero"/);
  assert.match(markup, /data-theme="city"/);
  assert.equal((markup.match(/class="sb-postcard /g) || []).length, 3);
  assert.match(markup, /data-home-action="start-day"/);
  assert.match(markup, /data-home-action="ask-ai"/);
  assert.match(markup, /开始今天的旅程/);
  assert.match(markup, /问问旅行 AI/);
  assert.ok(markup.includes(STORYBOOK_ROUTE_PATH), "航线路径必须来自同一个常量");
  assert.match(markup, /class="sb-route-plane"/);
  assert.match(markup, /class="sb-postmark"/);
  assert.match(markup, /TODAY'S JOURNEY/);
  assert.match(markup, /为什么这样安排？/);
  assert.match(markup, /已锁定安排/);
  assert.match(markup, /<span aria-hidden="true">🔒<\/span> 已锁定安排/);
  assert.match(markup, /旅行状态/);
  assert.match(markup, /别错过/);
  assert.match(markup, /class="sb-day-chips"/);
});

test("homepage never shows contract field names in user-visible copy", () => {
  const markup = storybookHomeMarkup(packSb, { now: TODAY });
  const text = visibleText(markup);
  for (const leaked of ["Hard Constraint", "constraints", "decisionLog", "replanHistory", "planningMeta", "preferences", "Reasoning", "chain-of-thought"]) {
    assert.ok(!text.includes(leaked), `首页可见文案出现了契约字段名：${leaked}`);
  }
});

test("homepage markup escapes traveller-supplied text", () => {
  const hostile = JSON.parse(JSON.stringify(packSb));
  hostile.trip.destination = '<img src=x onerror="alert(1)">危险';
  hostile.trip.title = '</h1><script>alert(2)</script>';
  const markup = storybookHomeMarkup(hostile, { now: TODAY });
  assert.ok(!markup.includes("<script>alert(2)"), "标题必须被转义");
  assert.ok(!markup.includes('onerror="alert(1)"'), "目的地必须被转义");
  assert.match(markup, /&lt;img src=x/);
});

test("TravelPack 1.1 renders the homepage without new fields", () => {
  const markup = storybookHomeMarkup(pack11, { now: null, assets: {} });
  assert.match(markup, /class="sb-home"/);
  assert.ok(!markup.includes("undefined"), "1.1 数据不得渲染出 undefined");
  assert.ok(!markup.includes("null 项"));
  // 1.1 没有 constraints / decisionLog，对应板块整体不出现而不是显示空壳。
  assert.ok(!markup.includes("已锁定安排"), "1.1 没有 constraints 时不应渲染已锁定安排");
  assert.ok(!markup.includes("为什么这样安排？"), "1.1 没有 decisionLog 时不应渲染安排理由");
  // 1.1 有 places，所以「别错过」照常出现；没有 places 时整体隐藏。
  assert.ok(markup.includes("别错过"));
  assert.ok(!storybookHomeMarkup({ ...pack11, places: [] }, {}).includes("别错过"));
});

test("homepage degrades to the theme-colour canvas when assets are unavailable", () => {
  const markup = storybookHomeMarkup(packSb, { now: TODAY, assets: {} });
  assert.match(markup, /sb-scene-missing/);
  assert.ok(!markup.includes("<svg viewBox=\"0 0 800 520\""), "缺资产时不得渲染场景插画");
  assert.match(markup, /data-home-action="start-day"/, "缺资产时 CTA 必须仍然可用");
});

test("storybook is opt-in: the six legacy styles keep the Phase 3 overview", () => {
  assert.match(appSource, /function classicOverviewView\(\)/);
  assert.match(appSource, /return isStorybookHome\(\) \? storybookHomeView\(\) : classicOverviewView\(\);/);
  assert.match(appSource, /overview: overviewView/);
  assert.match(appSource, /function isStorybookHome\(\)/);
  // 六套旧 style 的样式块与 Phase 3 概览结构都没有被移除。
  for (const legacy of ["natural", "minimal", "collage", "print", "urban"]) {
    assert.match(baseCss, new RegExp(`:root\\[data-style="${legacy}"\\]`));
  }
  assert.match(baseCss, /\.overview-hero \{/);
  assert.match(appSource, /function transportPanelSection\(\)/);
});

test("storybook is the default for new trips and is offered in the style dialog", () => {
  assert.match(appSource, /localStorage\.getItem\("travel-wallet-style"\) \|\| DEFAULT_STYLE/);
  assert.match(indexSource, /data-style-choice="storybook"/);
  assert.match(indexSource, /style-preview-storybook/);
  assert.match(homeCss, /\.style-preview-storybook \{/);
  // 一级导航仍然是冻结的 5 项，storybook 不新增一级模块。
  const nav = indexSource.match(/<nav class="module-nav"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/data-tab=/g) || []).length, 5);
});

test("homepage motion honours prefers-reduced-motion and stays on the compositor", () => {
  const reduced = homeCss.slice(homeCss.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.length > 0, "必须存在 reduced-motion 分支");
  for (const part of [".pup-breathe", ".cat-eyes", ".sb-ambient", ".sb-route-line", ".sb-postcard"]) {
    assert.ok(reduced.includes(part), `reduced-motion 必须关掉 ${part}`);
  }
  assert.match(reduced, /animation: none !important/);
  // 关掉动效后内容仍必须可见。
  assert.match(reduced, /opacity: 1 !important/);
  // 动效只用 transform / opacity：不允许对布局属性做过渡。
  assert.doesNotMatch(homeCss, /transition:[^;]*\b(?:width|height|top|left)\b/);
});

test("the storybook acceptance sample validates and builds a preview", () => {
  assert.equal(packSb.appearance.styleId, "storybook");
  assert.equal(packSb.schemaVersion, "1.2.0");
  assert.deepEqual(validateTravelPack(packSb), []);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase4a-"));
  const result = JSON.parse(execFileSync(process.execPath, [previewBuilder, sampleStorybook, outputDir, "--ui-review"], { encoding: "utf8" }));
  assert.equal(result.built, true);
  // 整目录拷贝必须把首页生产资产一起带上，否则线上会缺图。
  for (const relative of ["assets/home/home-ux.mjs", "assets/home/home-assets.mjs", "assets/home/homepage.css", "assets/mascots/travel-puppy.svg", "assets/mascots/travel-cat.svg", "assets/homepage/scene-city.svg", "assets/decor/postmark.svg", "assets/fonts/caveat-latin-var.woff2"]) {
    assert.ok(fs.existsSync(path.join(outputDir, relative)), `预览缺少 ${relative}`);
  }
});
