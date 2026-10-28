import test from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createWorkspacePool } from "../src/lib/workspace-pool";
import { workspaceSchema } from "../src/domains/auth/workspace-key";

test("reused PostgreSQL connections isolate workspaces, transactions and concurrent requests", { skip: !process.env.DEEMS_ISOLATION_TEST_DATABASE_URL }, async () => {
  const raw = new Pool({ connectionString: process.env.DEEMS_ISOLATION_TEST_DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
  const context = new AsyncLocalStorage<string>();
  const pool = createWorkspacePool(raw, async () => {
    const identity = context.getStore();
    if (!identity) throw new Error("No authenticated workspace.");
    return identity;
  });
  const a = workspaceSchema(randomUUID()); const b = workspaceSchema(randomUUID());
  const within = <T>(identity: string, operation: () => Promise<T>) => context.run(identity, operation);
  try {
    for (const identity of [a, b]) await within(identity, async () => {
      await pool.query("CREATE TABLE isolated_check (id text PRIMARY KEY, value text NOT NULL)");
      await pool.query("INSERT INTO isolated_check VALUES ('same-id',$1)", [identity]);
    });
    await Promise.all(Array.from({ length: 12 }, (_, i) => within(i % 2 ? a : b, async () => {
      const expected = i % 2 ? a : b;
      const rows = await pool.query("SELECT value,current_schema() AS schema FROM isolated_check WHERE id='same-id'");
      assert.equal(rows.rows[0].value, expected); assert.equal(rows.rows[0].schema, expected);
    })));
    await within(a, async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO isolated_check VALUES ('unsaved','private-a')");
        await assert.rejects(() => client.query("SELECT 1/0"));
      } finally { client.release(); }
    });
    await within(b, async () => assert.equal((await pool.query("SELECT count(*)::int AS n FROM isolated_check")).rows[0].n, 1));
    await within(a, async () => assert.equal((await pool.query("SELECT count(*)::int AS n FROM isolated_check WHERE id='unsaved'")).rows[0].n, 0));
    await assert.rejects(() => pool.query("SELECT 1"), /No authenticated workspace/);
    await assert.rejects(() => within('public; DROP SCHEMA public', () => pool.query("SELECT 1")), /Invalid workspace schema/);
    assert.equal((await raw.query("SELECT current_schema() AS schema")).rows[0].schema, "public");
  } finally {
    for (const identity of [a, b]) await raw.query(`DROP SCHEMA IF EXISTS "${identity}" CASCADE`);
    await raw.end();
  }
});
