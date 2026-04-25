import "./loadEnv";
import http from "http";

async function start(): Promise<void> {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const { pool } = await import("@workspace/db");
  await pool.query("select 1");
  console.log("[db] PostgreSQL connection verified");

  const { default: app } = await import("./app");

  // Create HTTP server to handle both app and health endpoint
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    // Pass other requests to the app
    app.server?.emit("request", req, res);
  });

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);

    // Keep-alive: ping health endpoint every 14 minutes
    setInterval(() => {
      const url = `http://localhost:${port}/api/health`;
      http.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          console.log(`[keep-alive] Ping result: ${res.statusCode} - ${data}`);
        });
      }).on("error", (err) => {
        console.log(`[keep-alive] Ping error: ${err.message}`);
      });
    }, 14 * 60 * 1000); // 14 minutes
  });
}

start().catch((error) => {
  console.error("[startup] Failed to start API server");
  console.error(error);
  process.exit(1);
});
