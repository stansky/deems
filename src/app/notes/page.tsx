import type { Metadata, Viewport } from "next";
import InterviewNotes from "@/components/features/notes/interview-notes";
import { interviewGuides } from "@/data/interview-guides";
import { interviewNotes } from "@/data/interview-notes";
import "./notes.css";

export const metadata: Metadata = {
  title: "Interview notes · Deems",
  description: "Open a printed interview sticky note by its number.",
  appleWebApp: { capable: true, title: "Notes", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Every note and guide ships with the page, so moving between them never needs the network.
export default function NotesPage() {
  return <InterviewNotes notes={interviewNotes} guides={interviewGuides} />;
}
