// Serves the Vite build from dist/ and echoes WebSocket messages on /ws.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const DIST = join(import.meta.dirname, "dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/info") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, commit: process.env.HK_COMMIT || null, node: process.version }));
    return;
  }
  const path = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(DIST, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found\n");
  }
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url, "http://localhost").pathname !== "/ws") return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => ws.on("message", (data) => ws.send(`echo: ${data}`)));
});

server.listen(PORT, HOST, () => console.log(`listening on ${HOST}:${PORT}`));
