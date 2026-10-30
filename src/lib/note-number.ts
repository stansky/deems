// Routes for /notes, kept in the URL hash: #3 opens printed note 3, #two-sum a topic,
// #patterns a guide, #cheat the cheat sheet. Anything else shows the start page.

export type NotesRoute =
  | { kind: "note"; number: number }
  | { kind: "topic"; id: string }
  | { kind: "guide"; id: string }
  | { kind: "cheat" }
  | null;

export const CHEAT_SHEET_HASH = "cheat";

export function noteNumberFromHash(hash: string, count: number): number | null {
  const value = Number(hash.replace(/^#/, ""));
  return Number.isInteger(value) && value >= 1 && value <= count ? value : null;
}

export function routeFromHash(hash: string, count: number, topicIds: readonly string[], guideIds: readonly string[]): NotesRoute {
  const number = noteNumberFromHash(hash, count);
  if (number !== null) return { kind: "note", number };
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
  if (id === CHEAT_SHEET_HASH) return { kind: "cheat" };
  if (guideIds.includes(id)) return { kind: "guide", id };
  if (topicIds.includes(id)) return { kind: "topic", id };
  return null;
}

export function hashForRoute(route: NotesRoute): string {
  if (route === null) return "";
  if (route.kind === "note") return String(route.number);
  if (route.kind === "cheat") return CHEAT_SHEET_HASH;
  return route.id;
}

/** True once no longer note number could start with the typed digits, so the note can open. */
export function isUnambiguousNoteNumber(typed: string, count: number): boolean {
  const value = Number(typed);
  return Number.isInteger(value) && value >= 1 && value <= count && value * 10 > count;
}
