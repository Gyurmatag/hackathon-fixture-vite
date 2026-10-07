let clicks = 0;
const button = document.getElementById("count");
button.addEventListener("click", () => {
  clicks += 1;
  button.textContent = `Clicked ${clicks} times`;
});

fetch("/api/info")
  .then((r) => r.json())
  .then((info) => {
    document.getElementById("commit").textContent = info.commit || "unknown";
  })
  .catch(() => {});

const out = document.getElementById("ws");
const scheme = location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${scheme}//${location.host}/ws`);
socket.addEventListener("open", () => socket.send("ping"));
socket.addEventListener("message", (e) => {
  out.textContent = `received "${e.data}"`;
});
socket.addEventListener("error", () => {
  out.textContent = "error";
});
