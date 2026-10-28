"use client";

import { workspaceSessionStorage } from "@/components/workspace-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { commandMetaSchema } from "@/lib/command-validation";
import type { CommandMeta } from "@/domains/career/contracts";

const companionPrefix = "interview-command-v1:";
const legacyDraftPrefix = "interview-draft-v1:";
const producer = "interview-web";

type PendingCommand = {
  serialized: string;
  meta: CommandMeta;
};

type CommandDraftState = {
  key: string;
  ready: boolean;
  baseRevision: number;
  reviewRequired: boolean;
  pending: PendingCommand | null;
};

export type UseCommandDraftResult = {
  meta: (action: string, data: unknown) => CommandMeta;
  commit: (newRevision: number) => void;
  baseRevision: number;
  reviewRequired: boolean;
  acceptRevision: (revision: number) => void;
};

function emptyState(key: string, currentRevision: number): CommandDraftState {
  return { key, ready: false, baseRevision: currentRevision, reviewRequired: false, pending: null };
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isMeta(value: unknown): value is CommandMeta {
  const parsed=commandMetaSchema.safeParse(value);
  return parsed.success && parsed.data.producer === producer;
}

function serializeCommand(action: string, data: unknown): string {
  const serialized = JSON.stringify({ action, data }, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return Object.keys(record).sort().reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = record[key];
        return sorted;
      }, {});
    }
    return value;
  });
  if (serialized === undefined) throw new Error("The command could not be serialized.");
  return serialized;
}

function newCommandKey(): string {
  if (typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new Error("Secure command keys are unavailable in this browser.");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

function readStoredState(key: string, currentRevision: number): CommandDraftState {
  const fallback = { ...emptyState(key, currentRevision), ready: true };
  if (typeof window === "undefined") return fallback;

  let sawCompanion = false;
  try {
    const raw = workspaceSessionStorage.getItem(companionPrefix + key);
    sawCompanion = raw !== null;
    if (raw !== null) {
      const stored: unknown = JSON.parse(raw);
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        const value = stored as Record<string, unknown>;
        const pendingValue = value.pending;
        let pending: PendingCommand | null = null;
        const pendingIsValid = pendingValue === null || (
          pendingValue !== null
          && typeof pendingValue === "object"
          && !Array.isArray(pendingValue)
          && typeof (pendingValue as Record<string, unknown>).serialized === "string"
          && isMeta((pendingValue as Record<string, unknown>).meta)
          && ((pendingValue as Record<string, unknown>).meta as CommandMeta).expectedRevision === value.baseRevision
        );
        if (value.version === 1 && isRevision(value.baseRevision)
          && typeof value.reviewRequired === "boolean" && pendingIsValid) {
          if (pendingValue) {
            const pendingRecord = pendingValue as Record<string, unknown>;
            pending = { serialized: pendingRecord.serialized as string, meta: pendingRecord.meta as CommandMeta };
          }
          const hasDraft = workspaceSessionStorage.getItem(legacyDraftPrefix + key) !== null;
          // A newly opened clean form uses the record it actually loaded.
          if (!hasDraft && !pending && !value.reviewRequired) return fallback;
          return {
            key,
            ready: true,
            baseRevision: value.baseRevision,
            reviewRequired: value.reviewRequired,
            pending,
          };
        }
      }
      // Corrupt or unknown companion state needs explicit review before a write.
      return { ...fallback, reviewRequired: true };
    }

    const hasLegacyDraft = workspaceSessionStorage.getItem(legacyDraftPrefix + key) !== null;
    return { ...fallback, reviewRequired: hasLegacyDraft };
  } catch {
    // Invalid stored metadata must not upgrade an older draft to the current revision.
    return sawCompanion ? {...fallback,reviewRequired:true} : fallback;
  }
}

function persistState(state: CommandDraftState): void {
  if (typeof window === "undefined") return;
  try {
    workspaceSessionStorage.setItem(companionPrefix + state.key, JSON.stringify({
      version: 1,
      baseRevision: state.baseRevision,
      reviewRequired: state.reviewRequired,
      pending: state.pending,
    }));
  } catch {
    // The command remains usable in memory when session storage is full or blocked.
  }
}

export function useCommandDraft(key: string, currentRevision: number): UseCommandDraftResult {
  if (!isRevision(currentRevision)) throw new Error("The current revision must be a non-negative integer.");
  const [state, setState] = useState<CommandDraftState>(() => emptyState(key, currentRevision));
  const stateRef = useRef(state);

  // Reset synchronously on identity changes so stale metadata cannot escape during an effect.
  if (state.key !== key) {
    const next = emptyState(key, currentRevision);
    stateRef.current = next;
    setState(next);
  } else {
    stateRef.current = state;
  }

  useEffect(() => {
    let cancelled = false;
    const restored = readStoredState(key, currentRevision);
    if (!cancelled) {
      stateRef.current = restored;
      setState(restored);
      persistState(restored);
    }
    return () => { cancelled = true; };
  }, [key]);

  const meta = useCallback((action: string, data: unknown): CommandMeta => {
    const current = stateRef.current;
    if (!current.ready) throw new Error("Command draft is still restoring. Retry after it is ready.");
    if (current.reviewRequired) {
      throw new Error("Review your draft against the saved record and choose the current revision before saving.");
    }
    if (!action.trim()) throw new Error("A command action is required.");

    const serialized = serializeCommand(action, data);
    if (current.pending?.serialized === serialized) return current.pending.meta;

    const pending: PendingCommand = {
      serialized,
      meta: {
        expectedRevision: current.baseRevision,
        producer,
        key: newCommandKey(),
      },
    };
    const next = { ...current, pending };
    stateRef.current = next;
    setState(next);
    persistState(next);
    return pending.meta;
  }, []);

  const commit = useCallback((newRevision: number): void => {
    if (!isRevision(newRevision)) throw new Error("The committed revision must be a non-negative integer.");
    const current = stateRef.current;
    if (!current.ready) throw new Error("Command draft is still restoring. Retry after it is ready.");
    const next: CommandDraftState = {
      ...current,
      baseRevision: newRevision,
      reviewRequired: false,
      pending: null,
    };
    stateRef.current = next;
    setState(next);
    persistState(next);
  }, []);

  const acceptRevision = useCallback((revision: number): void => {
    if (!isRevision(revision)) throw new Error("The reviewed revision must be a non-negative integer.");
    const current = stateRef.current;
    if (!current.ready) throw new Error("Command draft is still restoring. Retry after it is ready.");
    const next: CommandDraftState = {
      ...current,
      baseRevision: revision,
      reviewRequired: false,
      pending: null,
    };
    stateRef.current = next;
    setState(next);
    persistState(next);
  }, []);

  return { meta, commit, baseRevision: state.baseRevision, reviewRequired: state.reviewRequired, acceptRevision };
}
