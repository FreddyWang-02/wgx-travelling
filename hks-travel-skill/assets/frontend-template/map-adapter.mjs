/**
 * Create a browser-map bridge for the host or deployment platform.
 * Register the result as window.TRAVEL_MAP_ADAPTER before app.mjs runs.
 *
 * The renderer receives WGS84 stops grouped by day. It may use Tencent,
 * AMap, Baidu, Google Maps, or another map service already available to the
 * host. The provider integration must use an officially documented and
 * authorized SDK/API. A reachable undocumented raw tile endpoint is not a
 * supported provider. Return an optional controller with remove() for cleanup.
 */
export function createTravelMapAdapter({ provider, mount, destroy } = {}) {
  if (typeof mount !== "function") throw new TypeError("map adapter mount 必须是函数");
  return {
    provider: provider || "宿主",
    mount,
    destroy: typeof destroy === "function" ? destroy : undefined,
  };
}
