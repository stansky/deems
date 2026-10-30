// Note numbers for the printed interview sticky notes, read from the URL hash or typed on the pad.

export type NotesRoute = { kind: "note"; number: number } | { kind: "guide"; id: string } | null;

export function noteNumberFromHash(hash: string, count: number): number | null {
  const value = Number(hash.replace(/^#/, ""));
  return Number.isInteger(value) && value >= 1 && value <= count ? value : null;
}

/** #12 opens note 12, #loops opens the loops guide, anything else shows the number pad. */
export function routeFromHash(hash: string, count: number, guideIds: readonly string[]): NotesRoute {
  const number = noteNumberFromHash(hash, count);
  if (number !== null) return { kind: "note", number };
  const id = hash.replace(/^#/, "");
  return guideIds.includes(id) ? { kind: "guide", id } : null;
}

export function hashForRoute(route: NotesRoute): string {
  if (route === null) return "";
  return route.kind === "note" ? String(route.number) : route.id;
}

/** True once no longer note number could start with the typed digits, so the note can open. */
export function isUnambiguousNoteNumber(typed: string, count: number): boolean {
  const value = Number(typed);
  return Number.isInteger(value) && value >= 1 && value <= count && value * 10 > count;
}
