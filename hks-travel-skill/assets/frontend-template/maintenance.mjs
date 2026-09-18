const USER_FIELDS = ["note", "notes"];

function clone(value) {
  return structuredClone(value);
}

export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function buildSchematicRoute(pack, dayId = "all") {
  const days = dayId === "all" ? pack.days : pack.days.filter((day) => day.id === dayId);
  return days.map((day) => ({
    id: day.id,
    date: day.date,
    title: day.title,
    stops: pack.itineraryItems
      .filter((item) => item.dayId === day.id)
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({
        id: item.id,
        index: index + 1,
        name: pack.places.find((place) => place.id === item.placeId)?.name || item.title || "自由活动",
        time: item.startTime || "时间待定",
        kind: item.kind,
      })),
  })).filter((day) => day.stops.length);
}

export function layoutSchematicPoints(items, places) {
  const placeById = new Map(places.map((place) => [place.id, place]));
  const located = items.map((item) => placeById.get(item.placeId)?.location).filter((location) =>
    location?.coordinateSystem === "WGS84" && Number.isFinite(Number(location.longitude)) && Number.isFinite(Number(location.latitude)),
  );
  const longitudes = located.map((location) => Number(location.longitude));
  const latitudes = located.map((location) => Number(location.latitude));
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeSpan = maxLongitude - minLongitude;
  const latitudeSpan = maxLatitude - minLatitude;
  const columns = Math.max(3, Math.ceil(Math.sqrt(Math.max(items.length, 1) * 1.45)));
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const placed = [];

  const sequencePoint = (index) => {
    const row = Math.floor(index / columns);
    const rawColumn = index % columns;
    const column = row % 2 ? columns - 1 - rawColumn : rawColumn;
    return {
      x: columns === 1 ? 50 : 12 + column * 76 / (columns - 1),
      y: rows === 1 ? 50 : 16 + row * 68 / (rows - 1),
    };
  };

  const avoidCollision = (origin) => {
    const free = (point) => placed.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= 8);
    if (free(origin)) return origin;
    for (let radius = 5; radius <= 30; radius += 5) {
      for (let step = 0; step < 12; step += 1) {
        const angle = step * Math.PI / 6;
        const candidate = {
          x: Math.min(90, Math.max(10, origin.x + Math.cos(angle) * radius)),
          y: Math.min(88, Math.max(12, origin.y + Math.sin(angle) * radius)),
        };
        if (free(candidate)) return candidate;
      }
    }
    return sequencePoint(placed.length);
  };

  return items.map((item, index) => {
    const location = placeById.get(item.placeId)?.location;
    const hasLocation = location?.coordinateSystem === "WGS84" && Number.isFinite(Number(location.longitude)) && Number.isFinite(Number(location.latitude));
    const fallback = sequencePoint(index);
    const origin = hasLocation && located.length > 1 ? {
      x: longitudeSpan ? 12 + (Number(location.longitude) - minLongitude) / longitudeSpan * 76 : fallback.x,
      y: latitudeSpan ? 16 + (maxLatitude - Number(location.latitude)) / latitudeSpan * 68 : fallback.y,
    } : fallback;
    const point = avoidCollision(origin);
    const result = { item, x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)), source: hasLocation ? "coordinate" : "sequence" };
    placed.push(result);
    return result;
  });
}

export function normalizeDayOrders(pack, dayId) {
  pack.itineraryItems
    .filter((item) => item.dayId === dayId)
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => { item.order = index; });
  return pack;
}

export function moveItineraryItem(pack, itemId, targetDayId, beforeId = null) {
  if (!pack.days.some((day) => day.id === targetDayId)) throw new Error("目标日期不存在。");
  const next = clone(pack);
  const item = next.itineraryItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error("行程节点不存在。");
  const oldDayId = item.dayId;
  const targetItems = next.itineraryItems
    .filter((entry) => entry.dayId === targetDayId && entry.id !== itemId)
    .sort((a, b) => a.order - b.order);
  const index = beforeId ? targetItems.findIndex((entry) => entry.id === beforeId) : targetItems.length;
  if (beforeId && index < 0) throw new Error("目标节点不属于所选日期。");
  item.dayId = targetDayId;
  targetItems.splice(index, 0, item);
  targetItems.forEach((entry, order) => { entry.order = order; });
  if (oldDayId !== targetDayId) normalizeDayOrders(next, oldDayId);
  return next;
}

export function deleteItineraryItem(pack, itemId) {
  const next = clone(pack);
  const item = next.itineraryItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error("行程节点不存在。");
  next.itineraryItems = next.itineraryItems.filter((entry) => entry.id !== itemId);
  normalizeDayOrders(next, item.dayId);
  for (const material of next.materials) {
    material.relatedRefs = (material.relatedRefs || []).filter((ref) => !(ref.type === "itineraryItem" && ref.id === itemId));
  }
  for (const task of next.tasks) {
    task.relatedRefs = (task.relatedRefs || []).filter((ref) => !(ref.type === "itineraryItem" && ref.id === itemId));
  }
  return next;
}

export function deleteRecord(pack, collection, id) {
  const referenceTypes = { itineraryItems: "itineraryItem", transportSegments: "transportSegment", stays: "stay", tasks: "task", expenses: "expense", materials: "material" };
  const type = referenceTypes[collection];
  if (!type || !Array.isArray(pack[collection])) throw new Error("不支持删除该记录。");
  const next = clone(pack);
  const removed = next[collection].find((item) => item.id === id);
  if (!removed) throw new Error("记录不存在。");
  next[collection] = next[collection].filter((item) => item.id !== id);
  if (collection === "itineraryItems") normalizeDayOrders(next, removed.dayId);
  for (const item of [...next.tasks, ...next.materials]) {
    item.relatedRefs = (item.relatedRefs || []).filter((ref) => !(ref.type === type && ref.id === id));
  }
  if (collection === "materials") {
    for (const item of [...next.transportSegments, ...next.stays, ...next.expenses]) {
      item.materialIds = (item.materialIds || []).filter((materialId) => materialId !== id);
    }
  }
  return next;
}

export function reorderTransport(pack, segmentId, direction) {
  const next = clone(pack);
  const index = next.transportSegments.findIndex((segment) => segment.id === segmentId);
  const target = index + direction;
  if (index < 0) throw new Error("交通段不存在。");
  if (target < 0 || target >= next.transportSegments.length) return next;
  [next.transportSegments[index], next.transportSegments[target]] = [next.transportSegments[target], next.transportSegments[index]];
  return next;
}

function localStamp(point) {
  if (!point?.localDate || !point?.localTime) return null;
  return Date.parse(`${point.localDate}T${point.localTime}:00Z`);
}

export function connectionSummary(current, next) {
  if (!current || !next) return null;
  const stationChange = current.to?.name && next.from?.name && current.to.name !== next.from.name;
  const start = localStamp(current.arrival);
  const end = localStamp(next.departure);
  const crossDay = Boolean(current.arrival?.localDate && next.departure?.localDate && current.arrival.localDate !== next.departure.localDate);
  if (start === null || end === null) {
    return {
      minutes: null,
      crossDay,
      stationChange,
      text: `${stationChange ? `需从${current.to.name}前往${next.from.name}；` : "同站衔接；"}时间待补充`,
    };
  }
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 0) return { minutes, crossDay, stationChange, text: "后续出发时间早于前段到达时间，请复核。" };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const duration = `${hours ? `${hours} 小时` : ""}${hours && rest ? " " : ""}${rest ? `${rest} 分钟` : ""}` || "0 分钟";
  return {
    minutes,
    crossDay,
    stationChange,
    text: `${crossDay ? "跨日 · " : ""}${stationChange ? `换站 ${current.to.name} → ${next.from.name} · ` : "同站 · "}预留 ${duration}`,
  };
}

function outsideChina(longitude, latitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(x, y) {
  let value = -100 + 2 * x + 3 * y + .2 * y * y + .1 * x * y + .2 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  value += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
  return value + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
}

function transformLongitude(x, y) {
  let value = 300 + x + 2 * y + .1 * x * x + .1 * x * y + .1 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  value += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  return value + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
}

export function gcj02ToWgs84(longitude, latitude) {
  const lng = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error("地点坐标无效。");
  if (outsideChina(lng, lat)) return { longitude: lng, latitude: lat, coordinateSystem: "WGS84" };
  const earthRadius = 6378245;
  const eccentricity = .006693421622965943;
  let deltaLat = transformLatitude(lng - 105, lat - 35);
  let deltaLng = transformLongitude(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - eccentricity * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  deltaLat = deltaLat * 180 / ((earthRadius * (1 - eccentricity)) / (magic * sqrtMagic) * Math.PI);
  deltaLng = deltaLng * 180 / (earthRadius / sqrtMagic * Math.cos(radLat) * Math.PI);
  return { longitude: lng * 2 - (lng + deltaLng), latitude: lat * 2 - (lat + deltaLat), coordinateSystem: "WGS84" };
}

export function dueDateFromAdvance(targetDate, daysBefore) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate || "")) throw new Error("目标日期格式有误。");
  const days = Number(daysBefore);
  if (!Number.isInteger(days) || days < 0 || days > 730) throw new Error("提前天数需为 0–730 的整数。");
  const date = new Date(`${targetDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function icsEscape(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
}

export function tasksToIcs(pack) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Travel Wallet//TravelPack 1.1//ZH-CN", "CALSCALE:GREGORIAN"];
  for (const task of pack.tasks.filter((entry) => entry.dueAt?.localDate)) {
    const time = (task.dueAt.localTime || "09:00").replace(":", "");
    const date = task.dueAt.localDate.replaceAll("-", "");
    const timezone = task.dueAt.timezone || pack.trip.defaultTimezone || "Asia/Shanghai";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(task.id)}@travel-wallet`,
      `DTSTART;TZID=${icsEscape(timezone)}:${date}T${time}00`,
      `SUMMARY:${icsEscape(task.title)}`,
      `DESCRIPTION:${icsEscape(task.notes || "旅行准备事项")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function currencyDigits(currency) {
  return ["JPY", "KRW"].includes(currency) ? 0 : 2;
}

export function parseAmount(value, currency = "CNY") {
  const text = String(value || "").trim();
  const digits = currencyDigits(currency);
  const pattern = digits ? /^\d+(?:\.\d{1,2})?$/ : /^\d+$/;
  if (!pattern.test(text)) throw new Error(`金额需为正数，${currency} 最多保留 ${digits} 位小数。`);
  const amount = Math.round(Number(text) * 10 ** digits);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("金额超出可用范围。");
  return amount;
}

export function equalAllocations(amountMinor, personIds) {
  if (!personIds.length) throw new Error("请至少选择一位参与人。");
  const base = Math.floor(amountMinor / personIds.length);
  let remainder = amountMinor % personIds.length;
  return personIds.map((personId) => ({ personId, amountMinor: base + (remainder-- > 0 ? 1 : 0) }));
}

function preserveUserFields(current, incoming) {
  const result = { ...incoming };
  for (const field of USER_FIELDS) {
    if (current?.[field] !== undefined && current[field] !== "") result[field] = current[field];
  }
  return result;
}

function collectionDiff(current, incoming) {
  const currentIds = new Set(current.map((entry) => entry.id));
  const incomingIds = new Set(incoming.map((entry) => entry.id));
  return {
    added: incoming.filter((entry) => !currentIds.has(entry.id)).length,
    changed: incoming.filter((entry) => currentIds.has(entry.id)).length,
    removed: current.filter((entry) => !incomingIds.has(entry.id)).length,
  };
}

export function mergeAgentDocument(current, incoming) {
  const document = clone(incoming);
  document.trip.note = current.trip.note || incoming.trip.note || "";
  const collections = ["places", "itineraryItems", "transportSegments", "stays", "tasks", "expenses", "materials"];
  const summary = {};
  for (const name of collections) {
    summary[name] = collectionDiff(current[name] || [], incoming[name] || []);
    const currentById = new Map((current[name] || []).map((entry) => [entry.id, entry]));
    document[name] = (document[name] || []).map((entry) => {
      const old = currentById.get(entry.id);
      let merged = old ? preserveUserFields(old, entry) : entry;
      if (name === "tasks" && old?.status === "done") {
        merged = { ...merged, status: "done" };
        if (old.completedAt) merged.completedAt = old.completedAt;
      }
      if (name === "materials" && old) {
        merged = { ...merged, assetIds: [...new Set([...(entry.assetIds || []), ...(old.assetIds || [])])] };
      }
      return merged;
    });
  }
  const taskIds = new Set(document.tasks.map((entry) => entry.id));
  document.tasks.push(...current.tasks.filter((entry) => entry.status === "done" && !taskIds.has(entry.id)).map(clone));
  const materialIds = new Set(document.materials.map((entry) => entry.id));
  document.materials.push(...current.materials.filter((entry) => (entry.assetIds || []).length && !materialIds.has(entry.id)).map(clone));
  const assetIds = new Set(document.assets.map((entry) => entry.id));
  document.assets.push(...current.assets.filter((entry) => !assetIds.has(entry.id)).map(clone));
  return { document, summary };
}
