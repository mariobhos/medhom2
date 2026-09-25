import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __medhomeDb: { pool: Pool; db: Database } | undefined;
}

function connect(): { pool: Pool; db: Database } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local locally and in the Vercel project settings for production.",
    );
  }

  const pool = new Pool({
    connectionString,
    // Serverless invocations are short lived: keep the pool small and release
    // idle connections quickly so Postgres slots are not exhausted.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });

  return { pool, db: drizzle(pool, { schema }) };
}

/**
 * The connection is created on first use rather than at import time, so that
 * builds and any code path that never touches the database do not require
 * DATABASE_URL to be present.
 */
function getDb(): Database {
  const existing = globalThis.__medhomeDb ?? connect();
  globalThis.__medhomeDb = existing;
  return existing.db;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const instance = getDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
