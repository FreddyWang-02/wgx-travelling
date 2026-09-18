const collections = [
  "companions",
  "days",
  "places",
  "itineraryItems",
  "transportSegments",
  "stays",
  "tasks",
  "expenses",
  "materials",
  "assets",
  "sources",
];

const referenceCollections = {
  companion: "companions",
  day: "days",
  place: "places",
  itineraryItem: "itineraryItems",
  transportSegment: "transportSegments",
  stay: "stays",
  task: "tasks",
  expense: "expenses",
  material: "materials",
  asset: "assets",
};

function localStamp(point) {
  if (!point?.localDate) return null;
  return `${point.localDate}T${point.localTime || "00:00"}`;
}

export function validateTravelPack(pack) {
  const errors = [];
  const error = (path, message) => errors.push({ path, message });
  const requiredString = (value, path) => {
    if (typeof value !== "string" || !value.trim()) error(path, "必须是非空字符串");
  };
  const requiredArray = (value, path) => {
    if (!Array.isArray(value)) error(path, "必须是数组");
  };
  const oneOf = (value, allowed, path) => {
    if (!allowed.includes(value)) error(path, `必须是 ${allowed.join("、")} 之一`);
  };
  const links = (value, path, { required = false } = {}) => {
    if (value == null && !required) return;
    requiredArray(value, path);
    (value || []).forEach((link, linkIndex) => {
      requiredString(link.id, `${path}[${linkIndex}].id`);
      requiredString(link.title, `${path}[${linkIndex}].title`);
      requiredString(link.url, `${path}[${linkIndex}].url`);
      if (link.url && !/^https?:\/\//i.test(link.url)) error(`${path}[${linkIndex}].url`, "只允许 http 或 https 链接");
    });
  };
  const timePoint = (value, path, { nullable = false } = {}) => {
    if (value == null && nullable) return;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      error(path, nullable ? "必须为 null 或时间点对象" : "必须是时间点对象");
      return;
    }
    requiredString(value.localDate, `${path}.localDate`);
    requiredString(value.timezone, `${path}.timezone`);
    oneOf(value.precision, ["date", "minute"], `${path}.precision`);
    if (value.precision === "date" && value.localTime != null) error(`${path}.localTime`, "日期精度时必须为 null");
    if (value.precision === "minute" && (typeof value.localTime !== "string" || !/^\d{2}:\d{2}$/.test(value.localTime))) {
      error(`${path}.localTime`, "分钟精度时必须为 HH:MM");
    }
  };

  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return [{ path: "$", message: "旅行数据必须是对象" }];
  }
  if (pack.protocol !== "travelpack") error("protocol", "必须为 travelpack");
  if (pack.schemaVersion !== "1.1.0") error("schemaVersion", "当前仅支持 1.1.0");
  if (!pack.trip?.id || !pack.trip?.title) error("trip", "缺少旅行 ID 或标题");
  if (pack.appearance != null && !["aviation", "natural", "minimal", "collage", "print", "urban"].includes(pack.appearance.styleId)) {
    error("appearance.styleId", "必须是 aviation、natural、minimal、collage、print、urban 之一");
  }

  for (const name of collections) {
    if (!Array.isArray(pack[name])) error(name, "必须是数组");
  }
  if (errors.length) return errors;

  const ids = new Map();
  for (const name of collections) {
    pack[name].forEach((item, index) => {
      if (!item?.id) return error(`${name}[${index}].id`, "缺少 ID");
      if (ids.has(item.id)) error(`${name}[${index}].id`, `ID 与 ${ids.get(item.id)} 重复`);
      else ids.set(item.id, `${name}[${index}]`);
    });
  }

  const idSets = Object.fromEntries(collections.map((name) => [name, new Set(pack[name].map((x) => x.id))]));
  const ref = (collection, id, path) => {
    if (id && !idSets[collection]?.has(id)) error(path, `引用不存在：${id}`);
  };

  pack.days.forEach((day, index) => {
    requiredString(day.date, `days[${index}].date`);
    requiredString(day.title, `days[${index}].title`);
  });
  pack.places.forEach((place, index) => {
    requiredString(place.name, `places[${index}].name`);
    links(place.links, `places[${index}].links`, { required: true });
    if (place.location != null) {
      if (!Number.isFinite(place.location.longitude) || !Number.isFinite(place.location.latitude)) {
        error(`places[${index}].location`, "经纬度必须是有限数字");
      }
      if (place.location.coordinateSystem !== "WGS84") {
        error(`places[${index}].location.coordinateSystem`, "必须为 WGS84");
      }
    }
  });
  pack.itineraryItems.forEach((item, index) => {
    requiredString(item.dayId, `itineraryItems[${index}].dayId`);
    requiredString(item.placeId, `itineraryItems[${index}].placeId`);
    requiredString(item.kind, `itineraryItems[${index}].kind`);
    if (typeof item.startTime !== "string" || !/^\d{2}:\d{2}$/.test(item.startTime)) error(`itineraryItems[${index}].startTime`, "必须为明确的 HH:MM 时间");
    if (typeof item.endTime !== "string" || !/^\d{2}:\d{2}$/.test(item.endTime)) error(`itineraryItems[${index}].endTime`, "必须为明确的 HH:MM 时间");
    if (item.startTime && item.endTime && item.startTime >= item.endTime) error(`itineraryItems[${index}]`, "结束时间必须晚于开始时间");
    links(item.links, `itineraryItems[${index}].links`);
    ref("days", item.dayId, `itineraryItems[${index}].dayId`);
    ref("places", item.placeId, `itineraryItems[${index}].placeId`);
  });
  pack.transportSegments.forEach((segment, index) => {
    oneOf(segment.purpose, ["outbound", "intermediate", "return"], `transportSegments[${index}].purpose`);
    oneOf(segment.mode, ["flight", "train", "bus", "car", "ferry", "other"], `transportSegments[${index}].mode`);
    oneOf(segment.status, ["planned", "booked", "cancelled", "replaced"], `transportSegments[${index}].status`);
    requiredString(segment.from?.name, `transportSegments[${index}].from.name`);
    requiredString(segment.to?.name, `transportSegments[${index}].to.name`);
    timePoint(segment.departure, `transportSegments[${index}].departure`);
    timePoint(segment.arrival, `transportSegments[${index}].arrival`);
    requiredArray(segment.materialIds, `transportSegments[${index}].materialIds`);
    requiredArray(segment.milestones, `transportSegments[${index}].milestones`);
    if (segment.bookingUrl && !/^https?:\/\//i.test(segment.bookingUrl)) error(`transportSegments[${index}].bookingUrl`, "只允许 http 或 https 链接");
    (segment.milestones || []).forEach((milestone, milestoneIndex) => {
      oneOf(milestone.kind, ["airport_arrival", "station_arrival", "checkin_close", "boarding", "security", "other"], `transportSegments[${index}].milestones[${milestoneIndex}].kind`);
      requiredString(milestone.label, `transportSegments[${index}].milestones[${milestoneIndex}].label`);
      if (typeof milestone.time !== "string" || !/^\d{2}:\d{2}$/.test(milestone.time)) error(`transportSegments[${index}].milestones[${milestoneIndex}].time`, "必须为 HH:MM");
    });
    (segment.materialIds || []).forEach((id, materialIndex) => ref("materials", id, `transportSegments[${index}].materialIds[${materialIndex}]`));
  });
  pack.stays.forEach((stay, index) => {
    requiredString(stay.placeId, `stays[${index}].placeId`);
    requiredString(stay.checkIn, `stays[${index}].checkIn`);
    requiredString(stay.checkOut, `stays[${index}].checkOut`);
    oneOf(stay.status, ["planned", "booked", "cancelled"], `stays[${index}].status`);
    requiredArray(stay.materialIds, `stays[${index}].materialIds`);
    links(stay.links, `stays[${index}].links`);
    ref("places", stay.placeId, `stays[${index}].placeId`);
    (stay.materialIds || []).forEach((id, materialIndex) => ref("materials", id, `stays[${index}].materialIds[${materialIndex}]`));
  });
  pack.tasks.forEach((task, index) => {
    requiredString(task.title, `tasks[${index}].title`);
    oneOf(task.kind, ["reservation", "booking", "recheck", "general", "packing"], `tasks[${index}].kind`);
    oneOf(task.status, ["pending", "done"], `tasks[${index}].status`);
    timePoint(task.dueAt, `tasks[${index}].dueAt`, { nullable: true });
    requiredArray(task.relatedRefs, `tasks[${index}].relatedRefs`);
    (task.relatedRefs || []).forEach((item, refIndex) => {
      const collection = referenceCollections[item.type];
      if (!collection) error(`tasks[${index}].relatedRefs[${refIndex}].type`, "未知引用类型");
      else ref(collection, item.id, `tasks[${index}].relatedRefs[${refIndex}].id`);
    });
  });
  pack.expenses.forEach((expense, index) => {
    requiredString(expense.date, `expenses[${index}].date`);
    requiredString(expense.title, `expenses[${index}].title`);
    if (typeof expense.currency !== "string" || !/^[A-Z]{3}$/.test(expense.currency)) {
      error(`expenses[${index}].currency`, "必须是三位大写货币代码");
    }
    oneOf(expense.splitMode, ["equal", "custom"], `expenses[${index}].splitMode`);
    requiredArray(expense.allocations, `expenses[${index}].allocations`);
    ref("companions", expense.payerId, `expenses[${index}].payerId`);
    const allocated = (expense.allocations || []).reduce((sum, allocation, allocationIndex) => {
      ref("companions", allocation.personId, `expenses[${index}].allocations[${allocationIndex}].personId`);
      return sum + allocation.amountMinor;
    }, 0);
    if (!Number.isSafeInteger(expense.amountMinor) || expense.amountMinor <= 0) {
      error(`expenses[${index}].amountMinor`, "金额必须是正整数最小货币单位");
    }
    if (allocated !== expense.amountMinor) {
      error(`expenses[${index}].allocations`, "分摊合计必须等于总金额");
    }
  });
  pack.materials.forEach((material, index) => {
    oneOf(material.kind, ["place", "ticket", "guide", "link"], `materials[${index}].kind`);
    requiredString(material.title, `materials[${index}].title`);
    requiredArray(material.relatedRefs, `materials[${index}].relatedRefs`);
    requiredArray(material.assetIds, `materials[${index}].assetIds`);
    if (typeof material.sensitive !== "boolean") error(`materials[${index}].sensitive`, "必须是布尔值");
    (material.relatedRefs || []).forEach((item, refIndex) => {
      const collection = referenceCollections[item.type];
      if (!collection) error(`materials[${index}].relatedRefs[${refIndex}].type`, "未知引用类型");
      else ref(collection, item.id, `materials[${index}].relatedRefs[${refIndex}].id`);
    });
    (material.assetIds || []).forEach((id, assetIndex) => ref("assets", id, `materials[${index}].assetIds[${assetIndex}]`));
  });
  pack.sources.forEach((source, index) => {
    requiredString(source.platform, `sources[${index}].platform`);
    requiredString(source.title, `sources[${index}].title`);
    requiredString(source.url, `sources[${index}].url`);
    requiredString(source.retrievedAt, `sources[${index}].retrievedAt`);
    const freshness = source.freshness;
    if (!freshness || typeof freshness !== "object" || Array.isArray(freshness)) {
      error(`sources[${index}].freshness`, "必须记录来源时效状态");
      return;
    }
    oneOf(freshness.kind, ["live", "dynamic", "seasonal", "stable"], `sources[${index}].freshness.kind`);
    requiredString(freshness.checkedAt, `sources[${index}].freshness.checkedAt`);
    oneOf(freshness.status, ["current", "needs-recheck"], `sources[${index}].freshness.status`);
    if (["live", "dynamic"].includes(freshness.kind)) requiredString(freshness.validUntil, `sources[${index}].freshness.validUntil`);
    if (freshness.publishedAt != null && typeof freshness.publishedAt !== "string") error(`sources[${index}].freshness.publishedAt`, "必须为日期字符串或 null");
  });

  const startDate = pack.trip.startDate;
  const endDate = pack.trip.endDate;
  if (startDate && endDate && startDate > endDate) error("trip", "旅行开始日期需早于结束日期");
  pack.days.forEach((day, index) => {
    if ((startDate && day.date < startDate) || (endDate && day.date > endDate)) {
      error(`days[${index}].date`, "日期超出旅行范围");
    }
  });
  pack.stays.forEach((stay, index) => {
    if (stay.checkIn && stay.checkOut && stay.checkIn > stay.checkOut) {
      error(`stays[${index}]`, "退房日期需晚于或等于入住日期");
    }
  });
  pack.transportSegments.forEach((segment, index) => {
    const departure = localStamp(segment.departure);
    const arrival = localStamp(segment.arrival);
    if (departure && arrival && segment.departure.timezone === segment.arrival.timezone && departure > arrival) {
      error(`transportSegments[${index}]`, "同一时区内到达时间需晚于出发时间");
    }
  });

  for (const day of pack.days) {
    const dayItems = pack.itineraryItems.filter((item) => item.dayId === day.id);
    const orders = dayItems.map((item) => item.order);
    if (orders.some((value) => !Number.isInteger(value) || value < 0)) {
      error(`itineraryItems:${day.id}`, "顺序必须是非负整数");
    } else if (new Set(orders).size !== orders.length || [...orders].sort((a, b) => a - b).some((value, index) => value !== index)) {
      error(`itineraryItems:${day.id}`, "同一天的顺序必须从 0 连续排列");
    }
  }

  return errors;
}

export function currencyDigits(currency) {
  return ["JPY", "KRW"].includes(currency) ? 0 : 2;
}

export function formatMoney(amountMinor, currency) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: currencyDigits(currency),
  }).format(amountMinor / 10 ** currencyDigits(currency));
}

export function buildLedger(pack, currency) {
  const rows = new Map(pack.companions.map((person) => [person.id, {
    id: person.id,
    name: person.name,
    paid: 0,
    spent: 0,
    balance: 0,
  }]));
  for (const expense of pack.expenses.filter((item) => item.currency === currency)) {
    if (!rows.has(expense.payerId)) throw new Error("账单付款人不在同行人名单中");
    rows.get(expense.payerId).paid += expense.amountMinor;
    for (const allocation of expense.allocations) {
      if (!rows.has(allocation.personId)) throw new Error("账单分摊人不在同行人名单中");
      rows.get(allocation.personId).spent += allocation.amountMinor;
    }
  }
  for (const row of rows.values()) {
    row.balance = row.paid - row.spent;
    row.receivable = Math.max(row.balance, 0);
    row.payable = Math.max(-row.balance, 0);
  }
  const result = [...rows.values()];
  if (result.reduce((sum, row) => sum + row.balance, 0) !== 0) throw new Error("账目不平衡，请检查账单金额与分摊明细");
  return result;
}

export function suggestSettlements(rows) {
  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);
  if (totalBalance !== 0) throw new Error("账目不平衡，暂时无法生成结算建议");
  const byAmountThenId = (left, right) => right.remaining - left.remaining || String(left.id).localeCompare(String(right.id));
  const debtors = rows.filter((row) => row.balance < 0).map((row) => ({ id: row.id, remaining: -row.balance })).sort(byAmountThenId);
  const creditors = rows.filter((row) => row.balance > 0).map((row) => ({ id: row.id, remaining: row.balance })).sort(byAmountThenId);
  const payments = [];
  let debtor = 0;
  let creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const amountMinor = Math.min(debtors[debtor].remaining, creditors[creditor].remaining);
    payments.push({ fromPersonId: debtors[debtor].id, toPersonId: creditors[creditor].id, amountMinor });
    debtors[debtor].remaining -= amountMinor;
    creditors[creditor].remaining -= amountMinor;
    if (!debtors[debtor].remaining) debtor += 1;
    if (!creditors[creditor].remaining) creditor += 1;
  }
  if (debtors.some((row) => row.remaining) || creditors.some((row) => row.remaining)) throw new Error("结算建议未能完全平账");
  return payments;
}
