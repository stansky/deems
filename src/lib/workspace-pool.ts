import type { Pool, PoolClient } from "pg";

// SET LOCAL and all workspace queries share a transaction. This also pins the
// backend when the connection URL uses a transaction pooler such as PgBouncer.
export function createWorkspacePool(raw: Pool, resolveSchema: () => Promise<string>): Pool {
  const schemas = new Set<string>();

  async function connect(): Promise<PoolClient> {
    const schema = await resolveSchema();
    if (schema !== "public" && !/^deems_[a-f0-9]{56}$/.test(schema)) throw new Error("Invalid workspace schema.");
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
    } catch (error) {
      release(error instanceof Error ? error : new Error("Workspace setup failed."));
      throw error;
    }

    let state: "idle" | "active" | "done" = "idle";
    let entering: Promise<void> | undefined;
    let released = false;
    async function enter(begin = "BEGIN") {
      entering ??= (async () => {
        await client.query(begin);
        state = "active";
        await client.query("SELECT set_config('search_path',$1,true)", [schema]);
      })();
      await entering;
    }
    async function scopedQuery(...args: unknown[]) {
      if (released || state === "done") throw new Error("Workspace transaction already completed.");
      if (typeof args.at(-1) === "function") throw new Error("Workspace queries require the promise interface.");
      const config = args[0];
      const text = typeof config === "string" ? config : config && typeof config === "object" && "text" in config ? String(config.text) : "";
      const begin = /^\s*(?:BEGIN|START\s+TRANSACTION)\b/i.test(text);
      const finish = /^\s*(?:COMMIT|END|ROLLBACK)(?:\s+(?:WORK|TRANSACTION))?\s*;?\s*$/i.test(text);
      const savepointRollback = /^\s*ROLLBACK(?:\s+(?:WORK|TRANSACTION))?\s+TO\b/i.test(text);
      if (/;\s*(?:BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|END)\b/i.test(text) ||
          (begin && /;\s*\S/.test(text)) ||
          (/^\s*(?:COMMIT|END|ROLLBACK)\b/i.test(text) && !finish && !savepointRollback)) {
        throw new Error("Workspace transaction boundaries must be separate statements.");
      }
      if (begin) {
        if (!entering) await enter(text);
        else {
          await entering;
          if (!/^\s*BEGIN(?:\s+(?:WORK|TRANSACTION))?\s*;?\s*$/i.test(text)) throw new Error("Workspace transaction already started.");
        }
        return { command: "BEGIN", rowCount: null, oid: 0, rows: [], fields: [] };
      }
      await enter();
      const result = await Reflect.apply(client.query, client, args);
      if (finish) state = "done";
      return result;
    }
    function scopedRelease(error?: Error | boolean) {
      if (released) throw new Error("Workspace connection already released.");
      released = true;
      if (error) { release(error); return; }
      if (state === "idle" && !entering) { release(); return; }
      void (async () => {
        if (entering) await entering;
        if (state === "active") await client.query("ROLLBACK");
        release();
      })().catch((failure: Error) => release(failure));
    }
    return new Proxy(client, {
      get(target, key) {
        if (key === "query") return scopedQuery;
        if (key === "release") return scopedRelease;
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  async function query(...args: unknown[]) {
    const client = await connect();
    try {
      const result = await Reflect.apply(client.query, client, args);
      await client.query("COMMIT");
      return result;
    } finally { client.release(); }
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
