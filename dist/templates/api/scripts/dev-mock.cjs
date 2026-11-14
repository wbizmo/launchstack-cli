const http = require("node:http");

const host = process.env.LAUNCHSTACK_MOCK_HOST || "127.0.0.1";
const port = Number(process.env.LAUNCHSTACK_MOCK_PORT || 4010);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("LAUNCHSTACK_MOCK_PORT must be between 0 and 65535.");
}

const server = http.createServer((request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200).end(JSON.stringify({ status: "ok", mode: "local-mock" }));
    return;
  }

  const match = /^\/mock\/([a-z0-9-]{1,48})(?:\/.*)?$/i.exec(request.url || "");
  if (match && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method || "")) {
    response.writeHead(200).end(JSON.stringify({
      mock: true,
      service: match[1],
      method: request.method,
      path: request.url,
      note: "Deterministic local stub; it does not reproduce a provider's behavior."
    }));
    return;
  }

  response.writeHead(404).end(JSON.stringify({ error: "No local mock route is configured." }));
});

server.listen(port, host, () => {
  const address = server.address();
  if (address && typeof address === "object") {
    console.log(`Local mock server listening at http://${host}:${address.port}`);
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
