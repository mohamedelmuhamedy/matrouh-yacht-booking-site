import "./loadEnv";

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
  });
}

start().catch((error) => {
  console.error("[startup] Failed to start API server");
  console.error(error);
  process.exit(1);
});
