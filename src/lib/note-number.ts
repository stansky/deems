// Note numbers for the printed interview sticky notes, read from the URL hash or typed on the pad.

export function noteNumberFromHash(hash: string, count: number): number | null {
  const value = Number(hash.replace(/^#/, ""));
  return Number.isInteger(value) && value >= 1 && value <= count ? value : null;
}

/** True once no longer note number could start with the typed digits, so the note can open. */
export function isUnambiguousNoteNumber(typed: string, count: number): boolean {
  const value = Number(typed);
  return Number.isInteger(value) && value >= 1 && value <= count && value * 10 > count;
}
