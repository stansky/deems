import type { InterviewGuide } from "@/data/interview-guides";
import type { InterviewTopic } from "@/data/interview-topics";

export type NotesSearchResult = { kind: "topic" | "guide"; id: string; title: string; detail: string; score: number };

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9?.=<>|!]+/g, " ").trim();

/**
 * Ranks topics and guides for a keyword query. Every query word must appear somewhere; title
 * matches count most, then keywords, then the rest of the text.
 */
export function searchNotes(query: string, topics: InterviewTopic[], guides: InterviewGuide[], limit = 8): NotesSearchResult[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const score = (title: string, keywords: string, body: string) => {
    const t = normalize(title), k = normalize(keywords), b = normalize(body);
    let total = 0;
    for (const word of words) {
      const points = (t.includes(word) ? 6 : 0) + (k.split(" ").includes(word) ? 4 : k.includes(word) ? 2 : 0) + (b.includes(word) ? 1 : 0);
      if (!points) return 0;
      total += points;
    }
    return total;
  };
  const results: NotesSearchResult[] = [];
  for (const guide of guides) {
    const body = [guide.summary, ...guide.sections.flatMap(s => s.kind === "table" ? s.rows.flat() : s.items)].join(" ");
    const value = score(guide.title, guide.id, body);
    if (value) results.push({ kind: "guide", id: guide.id, title: guide.title, detail: guide.summary, score: value + 1 });
  }
  for (const topic of topics) {
    const body = [topic.summary, ...topic.useWhen, ...topic.tips, ...topic.watchOut].join(" ");
    const value = score(topic.title, `${topic.id.replace(/-/g, " ")} ${topic.keywords}`, body);
    if (value) results.push({ kind: "topic", id: topic.id, title: topic.title, detail: topic.summary, score: value });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
