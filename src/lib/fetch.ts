"use client";

import { useUI } from "./store";

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: "same-origin",
  });
  const text = await res.text();
  const data = text ? safeJSON(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as { error: string }).error) ||
      `Request failed (${res.status})`;
    const code = data && typeof data === "object" && "code" in data ? (data as { code: string }).code : "ERROR";
    const err = new Error(msg) as Error & { code?: string; status?: number; details?: unknown };
    err.code = code;
    err.status = res.status;
    err.details = (data as { details?: unknown })?.details;
    // Auto-navigate to billing on upgrade-required errors
    if (code === "UPGRADE_REQUIRED") {
      const details = err.details as { requiredTier?: string; feature?: string } | undefined;
      const tier = details?.requiredTier || "pro";
      const feature = details?.feature || "";
      const store = useUI.getState();
      store.pushToast({
        title: `${feature || "This feature"} requires ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
        description: "Upgrade your plan to unlock this feature.",
        variant: "default",
      });
      store.setAppRoute("billing");
    }
    throw err;
  }
  return data as T;
}

function safeJSON(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export const swrKey = (path: string | null) => (path ? path : null);
