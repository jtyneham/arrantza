// Local production fixture: intentionally returns 404 for missing files, with no SPA fallback.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist"),
  prefix = "/arrantza/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const relative =
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const bytes = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(4174, "127.0.0.1", () =>
  console.log(
    "Pages-style production preview: http://127.0.0.1:4174/arrantza/",
  ),
);
