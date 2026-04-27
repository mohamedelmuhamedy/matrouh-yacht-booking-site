import "./loadEnv";
import * as http from "node:http";

const KEEP_ALIVE_INTERVAL_MS = 13 * 60 * 1000;

function pingHealthEndpoint(port: number): void {
  const request = http.get(
    {
      hostname: "localhost",
      port,
      path: "/api/health",
      timeout: 10_000,
    },
    (response) => {
      response.resume();
      console.log(`[keep-alive] /api/health responded with ${response.statusCode}`);
    },
  );

  request.on("timeout", () => {
    request.destroy(new Error("Health ping timed out"));
  });

  request.on("error", (error) => {
    console.error(`[keep-alive] /api/health ping failed: ${error.message}`);
  });
}

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
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    setInterval(() => pingHealthEndpoint(port), KEEP_ALIVE_INTERVAL_MS);
  });
}

start().catch((error) => {
  console.error("[startup] Failed to start API server");
  console.error(error);
  process.exit(1);
});
