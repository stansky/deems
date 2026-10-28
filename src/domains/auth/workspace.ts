import { cookies } from "next/headers";
import { authEnabled, getAuthEnvironment, verifyIdToken } from "./server";
import { workspaceSchema } from "./workspace-key";

export async function currentWorkspaceSchema(): Promise<string> {
  if (!authEnabled()) return "public";
  const token = (await cookies()).get("deems_session")?.value;
  if (!token) throw new Error("Authentication is required for workspace access.");
  const claims = await verifyIdToken(token, getAuthEnvironment());
  return workspaceSchema(claims.sub!);
}
