// Log diagnostic codes without SQL parameters or a user's saved content.
export function reportDatabaseError(label: string, error: unknown): void {
  let detail = error;
  for (let depth = 0; depth < 4 && detail && typeof detail === "object" && "cause" in detail && detail.cause; depth++) detail = detail.cause;
  const code = detail && typeof detail === "object" && "code" in detail && typeof detail.code === "string" && /^[A-Z0-9_]{5,24}$/.test(detail.code) ? detail.code : "unknown";
  const connection = detail instanceof Error && /timeout|connection|socket/i.test(detail.message);
  console.error(label, { code, connection });
}
