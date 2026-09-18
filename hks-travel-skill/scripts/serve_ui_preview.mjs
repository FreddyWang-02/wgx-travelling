#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const [, , directoryName, ...flags] = process.argv;
if (!directoryName) {
  console.error("Usage: node serve_ui_preview.mjs <preview-directory> [--port 0]");
  process.exit(2);
}

const portIndex = flags.indexOf("--port");
const requestedPort = portIndex >= 0 ? Number(flags[portIndex + 1]) : 0;
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  console.error("--port must be an integer from 0 to 65535");
  process.exit(2);
}

const root = path.resolve(directoryName);
const indexPath = path.join(root, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error(`Preview directory is missing index.html: ${root}`);
  process.exit(1);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolveRequest(url = "/") {
  const pathname = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  const insideRoot = candidate === root || candidate.startsWith(`${root}${path.sep}`);
  return insideRoot ? candidate : null;
}

const server = http.createServer((request, response) => {
  const target = resolveRequest(request.url);
  if (!target) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  let file = target;
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  fs.createReadStream(file).pipe(response);
});

server.on("error", (error) => {
  console.error(`Preview server failed: ${error.message}`);
  process.exit(1);
});

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/`;
  console.log(JSON.stringify({ ready: true, mode: "ui-review", url, directory: root }));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
