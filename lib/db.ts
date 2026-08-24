import "server-only";

import { Pool } from "pg";

declare global {
  var sarahDatabasePool: Pool | undefined;
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  if (!globalThis.sarahDatabasePool) {
    globalThis.sarahDatabasePool = new Pool({
      application_name: "sarah-revenue-assistant",
      connectionString,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      max: 5,
    });
  }

  return globalThis.sarahDatabasePool;
}
