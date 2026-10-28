export { workspaceMutationSchema as mutationSchema } from "@/contracts/workspace";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = request.headers.get("host");
    return originUrl.host === requestHost;
  } catch { return false; }
}
