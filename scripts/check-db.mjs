/**
 * Usage: node --env-file=.env.local scripts/check-db.mjs
 * Verifies DATABASE_URL without printing the URL or password.
 */
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL is empty or not set.");
  process.exit(1);
}

const { default: postgres } = await import("postgres");
const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 15,
});

try {
  const rows = await sql`
    select 1 as ok,
           current_database() as database,
           current_user as role,
           inet_server_addr()::text as server_addr
  `;
  const row = rows[0];
  console.log("OK — database connected.");
  console.log("  database:", row.database);
  console.log("  role:", row.role);
  if (row.server_addr) console.log("  server_addr:", row.server_addr);
  await sql.end({ timeout: 5 });
  process.exit(0);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("FAIL — could not connect.");
  console.error(" ", msg);
  if (/28P01|password authentication failed/i.test(msg)) {
    console.error(
      "  Hint: wrong DB password in DATABASE_URL, or special chars need URL-encoding."
    );
  }
  try {
    await sql.end({ timeout: 1 });
  } catch {
    /* ignore */
  }
  process.exit(1);
}
