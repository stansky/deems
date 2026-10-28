"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const prefix = "interview-draft-v1:";

// Drafts stay in this browser tab. Only an explicit Save writes to the database.
export function useLocalDraft<T extends Record<string, unknown>>(key: string, initial: T): {
  draft: T;
  setDraft: Dispatch<SetStateAction<T>>;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const [draft, setValue] = useState<T>(initial);
  const [hasDraft, setHasDraft] = useState(false);
  const current = useRef(initial);
  const initialValue = useRef(initial);
  initialValue.current = initial;

  useEffect(() => {
    let value = initialValue.current;
    let restored = false;
    try {
      const raw = sessionStorage.getItem(prefix + key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const fields = parsed as Record<string, unknown>;
          // Ignore malformed or old fields without losing new defaults.
          const compatible = Object.entries(value).every(([field, fallback]) =>
            !(field in fields) || (Array.isArray(fallback)
              ? Array.isArray(fields[field]) && (fields[field] as unknown[]).every(item => typeof item === "string")
              : typeof fields[field] === typeof fallback));
          if (compatible) {
            value = { ...value, ...Object.fromEntries(Object.keys(value).filter(field => field in fields).map(field => [field, fields[field]])) };
            restored = true;
          }
        }
      }
    } catch { /* Keep the form usable when browser storage is unavailable. */ }
    current.current = value;
    setValue(value);
    setHasDraft(restored);
  }, [key]);

  const setDraft = useCallback<Dispatch<SetStateAction<T>>>(update => {
    const next = typeof update === "function" ? update(current.current) : update;
    current.current = next;
    setValue(next);
    try {
      sessionStorage.setItem(prefix + key, JSON.stringify(next));
      setHasDraft(true);
    } catch { setHasDraft(false); }
  }, [key]);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(prefix + key); } catch { /* The server save still succeeded. */ }
    setHasDraft(false);
  }, [key]);

  return { draft, setDraft, clearDraft, hasDraft };
}
