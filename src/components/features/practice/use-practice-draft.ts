"use client";

import { workspaceLocalStorage } from "@/components/workspace-client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import type { PracticeCommand, PracticeOrigin, PracticeSave } from "@/contracts/practice";

export type PracticeDraft = {
  notes: string; code: string; selfReview: string; elapsed: number; hints: number;
  solutionSeen: boolean; coachUsed: boolean; mode: "Coach" | "Mock"; checks: string[];
  otherHelp: PracticeSave["assistance"]["otherHelp"]; assistanceNote: string;
  observedResult: string; limitations: string; nextAction: string; origin: PracticeOrigin | null;
  pendingSave: Extract<PracticeCommand, {action:"save"}> | null; savedAttemptId: string | null;
  pendingAttachments: Record<string, Extract<PracticeCommand, {action:"attach"}>>;
};

export function emptyPracticeDraft(starter: string, origin: PracticeOrigin | null): PracticeDraft {
  return { notes: "", code: starter, selfReview: "", elapsed: 0, hints: 0, solutionSeen: false,
    coachUsed: false, mode: "Coach", checks: [], otherHelp: "unknown", assistanceNote: "",
    observedResult: "", limitations: "", nextAction: "", origin, pendingSave: null,
    savedAttemptId: null, pendingAttachments: {} };
}

export function usePracticeDraft(key: string, starter: string, launchOrigin: PracticeOrigin | null) {
  const [draft, setDraftState] = useState<PracticeDraft>(() => emptyPracticeDraft(starter, launchOrigin));
  const draftRef = useRef(draft);
  const loadedKeyRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    setReady(false);
    setLoadedKey(null);
    loadedKeyRef.current = null;
    let next = emptyPracticeDraft(starter, launchOrigin);
    try {
      const raw = workspaceLocalStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<PracticeDraft> & Record<string, unknown>;
        next = { ...next, ...stored,
          notes: String(stored.notes ?? ""), code: String(stored.code ?? starter),
          selfReview: String(stored.selfReview ?? ""), elapsed: Number(stored.elapsed ?? 0),
          hints: Number(stored.hints ?? 0), solutionSeen: Boolean(stored.solutionSeen),
          coachUsed: Boolean(stored.coachUsed), mode: stored.mode === "Mock" ? "Mock" : "Coach",
          checks: Array.isArray(stored.checks) ? stored.checks.filter((value): value is string => typeof value === "string") : [],
          otherHelp: ["unknown", "none", "ai", "person", "reference", "mixed"].includes(String(stored.otherHelp)) ? stored.otherHelp as PracticeDraft["otherHelp"] : "unknown",
          assistanceNote: String(stored.assistanceNote ?? ""), observedResult: String(stored.observedResult ?? ""),
          limitations: String(stored.limitations ?? ""), nextAction: String(stored.nextAction ?? ""),
          origin: Object.prototype.hasOwnProperty.call(stored, "origin") ? stored.origin ?? null : null,
          pendingSave: stored.pendingSave ?? null, savedAttemptId: typeof stored.savedAttemptId === "string" ? stored.savedAttemptId : null,
          pendingAttachments: stored.pendingAttachments && typeof stored.pendingAttachments === "object" ? stored.pendingAttachments : {},
        };
      }
    } catch { /* Keep the current browser draft fields at safe defaults. */ }
    draftRef.current = next;
    loadedKeyRef.current = key;
    setDraftState(next);
    setLoadedKey(key);
    setReady(true);
  }, [key, starter, launchOrigin?.roleId, launchOrigin?.planStepId]);
  const setDraft = useCallback((action: SetStateAction<PracticeDraft>) => {
    if (loadedKeyRef.current !== key) return;
    const next = typeof action === "function" ? action(draftRef.current) : action;
    draftRef.current = next;
    setDraftState(next);
    // Store the latest edit before a reload can interrupt a save or retry.
    try { workspaceLocalStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the draft in memory if browser storage is full. */ }
  }, [key]);
  return { draft, setDraft, ready: ready && loadedKey === key };
}
