export function serializeTravelPack(pack) {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export function parseTravelPack(text) {
  return JSON.parse(text);
}

export function buildAttachmentManifest(pack, exportedAt = new Date().toISOString()) {
  const materialIdsByAsset = new Map();
  for (const material of pack.materials || []) {
    for (const assetId of material.assetIds || []) {
      if (!materialIdsByAsset.has(assetId)) materialIdsByAsset.set(assetId, []);
      materialIdsByAsset.get(assetId).push(material.id);
    }
  }
  return {
    format: "travelpack-attachment-manifest",
    version: "1.0.0",
    tripId: pack.trip.id,
    exportedAt,
    assets: (pack.assets || []).map((asset) => ({
      id: asset.id,
      name: asset.name,
      mime: asset.mime,
      size: asset.size,
      storageKey: asset.storageKey,
      materialIds: materialIdsByAsset.get(asset.id) || [],
    })),
  };
}
