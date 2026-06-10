import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handler = await import("./dist/server/server.js").then((m) => m.default ?? m);

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, "dist/client");

const MIME_TYPES = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".map": "application/json",
};

const server = http.createServer(async (req, res) => {
  // Serve static client assets from dist/client/
  const urlPath = req.url.split("?")[0];
  const filePath = path.join(CLIENT_DIR, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    // Cache hashed assets for 1 year
    const isHashed = /\.[a-f0-9]{8,}\.[a-z]+$/.test(filePath);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", isHashed ? "public, max-age=31536000, immutable" : "no-cache");
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fall through to SSR handler
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    duplex: "half",
  });

  try {
    const response = await handler.fetch(request, {}, {});
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
