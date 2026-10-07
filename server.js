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
  if (url.pathname === "/api/network-check") {
    // A host outside the preview allowlist: the runner's gateway answers 403.
    const r = await fetch("https://example.com/").catch((e) => ({ status: 0, error: String(e) }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ host: "example.com", status: r.status }));
    return;
  }
  if (url.pathname === "/api/ai-check") {
    // The Anthropic Messages API as any app calls it; the hackathon's gateway answers.
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 20, messages: [{ role: "user", content: "Say hello in three words." }] }),
    }).catch((e) => ({ status: 0, json: async () => ({ error: String(e) }) }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: r.status, body: await r.json().catch(() => null) }));
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
