import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  auditLogRelations,
  projectEnvVersionRelations,
  userRelations,
} from "./relations";
import { schema as tables } from "./schema";

export * from "./schema";

const schema = {
  ...tables,
  userRelations,
  projectEnvVersionRelations,
  auditLogRelations,
};

const conn = globalThis as unknown as {
  __dotvault_sql?: ReturnType<typeof postgres>;
};

function getSql() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://127.0.0.1:5432/__dotvault_build_placeholder__";
  if (!conn.__dotvault_sql) {
    conn.__dotvault_sql = postgres(url, {
      prepare: false,
      max: process.env.VERCEL ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return conn.__dotvault_sql;
}

export const db = drizzle(getSql(), { schema });
