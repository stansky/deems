import type { Metadata, Viewport } from "next";
import InterviewNotes from "@/components/features/notes/interview-notes";
import { cheatSheet, interviewGuides } from "@/data/interview-guides";
import { stickyNotes } from "@/data/interview-notes";
import { interviewTopics } from "@/data/interview-topics";
import { systemDesignNotes, systemDesignTopics, systemDesignGuides, systemDesignCheatSheet } from "@/data/system-design-notes";
import "./notes.css";

export const metadata: Metadata = {
  title: "Interview notes · Deems",
  description: "TypeScript and system design interview notes: open a printed note by number, search topics, or open the cheat sheet.",
  appleWebApp: { capable: true, title: "Notes", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Every note, topic, and guide ships with the page, so moving between them never needs the network.
export default async function NotesPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const systemDesign = (await searchParams).set === "system-design";
  if (systemDesign) return <InterviewNotes notes={systemDesignNotes} topics={systemDesignTopics} guides={systemDesignGuides} cheatSheet={systemDesignCheatSheet} subject="System design" />;
  return <InterviewNotes notes={stickyNotes} topics={interviewTopics} guides={interviewGuides} cheatSheet={cheatSheet} />;
}
