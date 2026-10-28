"use client";

let workspaceKey = "";
export function setBrowserWorkspace(key: string) { workspaceKey = key; }

function scopedStorage(kind: "localStorage" | "sessionStorage") {
  const keyFor = (key: string) => workspaceKey ? `${workspaceKey}:${key}` : key;
  return {
    getItem: (key: string) => window[kind].getItem(keyFor(key)),
    setItem: (key: string, value: string) => window[kind].setItem(keyFor(key), value),
    removeItem: (key: string) => window[kind].removeItem(keyFor(key)),
  };
}
export const workspaceLocalStorage = scopedStorage("localStorage");
export const workspaceSessionStorage = scopedStorage("sessionStorage");

export function notifyAccountChange() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("deems-account");
  channel.postMessage("changed"); channel.close();
}

export async function workspaceFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input instanceof Request ? input : new URL(String(input), window.location.href), init);
  const headers = new Headers(request.headers);
  if (workspaceKey && new URL(request.url).origin === window.location.origin) headers.set("x-deems-workspace", workspaceKey);
  const response = await fetch(request, { headers });
  if (workspaceKey && response.status === 409) {
    const body = await response.clone().json().catch(() => ({}));
    if (body.code === "workspace_changed") {
      window.location.replace("/login");
      throw new Error("Your account changed. Reopen this workspace before saving.");
    }
  }
  if (workspaceKey && response.status === 401) window.location.replace("/login");
  return response;
}
