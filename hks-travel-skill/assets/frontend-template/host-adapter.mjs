function requireFunction(value, name) {
  if (typeof value !== "function") throw new TypeError(`Host adapter requires ${name}()`);
  return value;
}

function requireVersion(value, operation) {
  if (value === null || value === undefined || value === "") {
    throw new TypeError(`Host adapter ${operation}() must return version or revision`);
  }
  return value;
}

export function createTravelHostAdapter(options = {}) {
  const mode = options.mode === "read" ? "read" : "edit";
  const loadRecord = requireFunction(options.load, "load");
  const saveRecord = mode === "edit" ? requireFunction(options.save, "save") : options.save;
  const prepareEdit = typeof options.prepareEdit === "function" ? options.prepareEdit : null;
  return Object.freeze({
    mode,
    capabilities: Object.freeze({
      attachments: Boolean(options.capabilities?.attachments),
      placeSearch: Boolean(options.capabilities?.placeSearch),
      accessLinks: Boolean(options.capabilities?.accessLinks),
    }),
    async load() {
      const result = await loadRecord();
      if (!result?.document) throw new TypeError("Host adapter load() must return document");
      const version = requireVersion(result.version ?? result.revision, "load");
      return { ...result, version };
    },
    async save(input) {
      if (mode !== "edit") throw Object.assign(new Error("Read-only host adapter cannot save"), { code: "read_only" });
      const result = await saveRecord(input);
      const version = requireVersion(result?.version ?? result?.revision, "save");
      return { ...result, version };
    },
    prepareEdit: prepareEdit ? async () => {
      if (mode !== "edit") throw Object.assign(new Error("Read-only host adapter cannot prepare editing"), { code: "read_only" });
      return prepareEdit();
    } : undefined,
    searchPlaces: options.searchPlaces,
    uploadAttachment: options.uploadAttachment,
    getAttachmentUrl: options.getAttachmentUrl,
    rotateAccessLinks: options.rotateAccessLinks,
  });
}
