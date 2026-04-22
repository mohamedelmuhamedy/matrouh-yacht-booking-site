import "./loadEnv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  if (
    process.env.PGHOST &&
    process.env.PGUSER &&
    process.env.PGPASSWORD &&
    process.env.PGDATABASE
  ) {
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const password = encodeURIComponent(process.env.PGPASSWORD);
    const database = process.env.PGDATABASE;
    const port = process.env.PGPORT || "5432";
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  return process.env.DATABASE_URL;
}

const connectionString = getConnectionString();

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
