import type { Pool, PoolClient } from "pg";

// Each checked-out connection stays in one workspace until its queries finish.
// Reset finishes before the connection returns to the shared pool.
export function createWorkspacePool(raw: Pool, resolveSchema: () => Promise<string>): Pool {
  const schemas = new Set<string>();

  async function connect(): Promise<PoolClient> {
    const schema = await resolveSchema();
    if (schema !== "public" && !/^deems_[a-f0-9]{56}$/.test(schema)) {
      throw new Error("Invalid workspace schema.");
    }
    const client = await raw.connect();
    const release = client.release.bind(client);
    try {
      if (schema !== "public" && !schemas.has(schema)) {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [schema]);
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
        await client.query("COMMIT");
        schemas.add(schema);
      }
      await client.query("SELECT set_config('search_path',$1,false)", [schema]);
    } catch (error) {
      release(error instanceof Error ? error : new Error("Workspace setup failed."));
      throw error;
    }

    let released = false;
    client.release = (error?: Error | boolean) => {
      if (released) throw new Error("Workspace connection already released.");
      released = true;
      if (error) { release(error); return; }
      void client.query("ROLLBACK; RESET search_path")
        .then(() => release(), (failure: Error) => release(failure));
    };
    return client;
  }

  async function query(...args: unknown[]) {
    const client = await connect();
    try { return await Reflect.apply(client.query, client, args); }
    finally { client.release(); }
  }

  return new Proxy(raw, {
    get(target, key) {
      if (key === "connect") return connect;
      if (key === "query") return query;
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
