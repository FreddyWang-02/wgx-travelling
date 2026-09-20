# TravelPack 1.1.0 输出约束

顶层必须包含：

```text
protocol = "travelpack"
schemaVersion = "1.1.0"
appearance
trip
companions[]
days[]
places[]
itineraryItems[]
transportSegments[]
stays[]
tasks[]
expenses[]
materials[]
assets[]
sources[]
```

## 核心字段

- `appearance`：`styleId` 必须是 `storybook`、`aviation`、`natural`、`minimal`、`collage`、`print`、`urban` 之一，并且来自用户在 UI 预览阶段的明确选择。`storybook`（晴日手账）由 Phase 4A 以加法方式加入，是首页的视觉方向；原六个取值语义不变，旧数据继续按原规则校验。`collage`、`print`、`urban` 在 V4 首轮只完成出行模块视觉审核，未经用户确认不得扩展为全模块正式风格。
- `trip`：`id`、`title`、`startDate`、`endDate`、`defaultTimezone`、`destination`；可含 `subtitle`、`destinationCode`、`note`。
- `days[]`：`id`、`date`、`title`。
- `places[]`：`id`、`name`、`links[]`；坐标可选，存在时使用 `location.longitude`、`location.latitude`、`location.coordinateSystem = "WGS84"`。`links[]` 每项包含稳定 `id`、`title` 和 `http/https url`，用于保存小红书笔记、公众号、餐厅、购票和其他网页。
- `itineraryItems[]`：`id`、`dayId`、`placeId`、从 0 连续的 `order`、`kind`、`startTime`、`endTime`；备注字段固定使用 `notes`，可选 `links[]` 保存该节点专属攻略链接。开始和结束时间必须为 `HH:MM`，结束时间晚于开始时间。
- `transportSegments[]`：`id`、`purpose`、`mode`、`from`、`to`、`departure`、`arrival`、`status`、`milestones[]`、`materialIds[]`。`purpose` 限定 `outbound`、`intermediate`、`return`；`status` 限定 `planned`、`booked`、`cancelled`、`replaced`。时间点至少包含 `localDate`、`timezone`、`precision`；只知日期时 `localTime = null`、`precision = "date"`。关键时间节点包含 `kind`、`label`、`time`，`kind` 限定 `airport_arrival`、`station_arrival`、`checkin_close`、`boarding`、`security`、`other`。
- `stays[]`：`id`、`placeId`、`checkIn`、`checkOut`、`status`、`materialIds[]`，可选 `links[]` 保存酒店订单或住宿攻略；`status` 限定 `planned`、`booked`、`cancelled`。
- `tasks[]`：`id`、`title`、`kind`、`status`、`dueAt`、`relatedRefs[]`。`status` 只能为 `pending` 或 `done`；`dueAt` 为 `null` 或与交通一致的时间点对象，禁止写成日期字符串。
- `expenses[]`：必须包含 `date`、`title`、三位大写 `currency`、整数 `amountMinor`、`payerId`、`splitMode`、`allocations[]`；`splitMode` 限定 `equal` 或 `custom`，分摊金额合计必须等于 `amountMinor`。
- `materials[]`：字段名固定使用 `kind`，取值限定 `place`、`ticket`、`guide`、`link`；同时包含 `title`、`relatedRefs[]`、`assetIds[]` 和布尔值 `sensitive`。禁止使用 `type` 代替 `kind`。
- `sources[]`：必须包含 `platform`、`title`、`url`、`retrievedAt` 和 `freshness`；核验说明使用 `note`。`freshness` 必须包含 `kind`、`checkedAt`、`status`，并可包含 `publishedAt`、`validUntil`。`kind` 限定 `live`、`dynamic`、`seasonal`、`stable`；`status` 限定 `current`、`needs-recheck`；`live` 与 `dynamic` 必须填写 `validUntil`。禁止使用 `fetchedAt` 代替 `retrievedAt`。

字段名称属于运行时契约。近义字段不会被网页自动兼容，例如 `note` 不能代替行程的 `notes`，`todo` 不能代替待办状态 `pending`。

## 引用与安全

- 全部 ID 在顶层集合间唯一。
- 所有 `dayId`、`placeId`、`payerId`、`relatedRefs` 和 `assetIds` 必须存在。
- 旅行日期覆盖全部 `days`；入住日期顺序有效；同一时区内到达时间不得早于出发时间。
- URL 只允许 `http` 和 `https`。Key、Cookie、Token、证件号和支付信息不得进入来源或公开字段。
- 敏感票据设置 `sensitive: true`，只读分享由服务端过滤原件。
