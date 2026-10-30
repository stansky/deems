"use client";

import { ArrowRight, BookOpenCheck, Code2, MessageSquare, Network, Users } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { reviewCounts } from "@/lib/review-summary";
import { PageHeader } from "./ui";
import type { StudyTab } from "@/contracts/study";
import type { PrepCategory } from "./features/prep/prep-library";
import "./practice-hub.css";
import { PracticeOptions } from "./features/learning/learning-entry";

export function PracticeHub({ state, loading, unavailable, onLibrary, onCategory, onAlgorithms, onExercise }: { state: WorkspaceState; loading: boolean; unavailable: boolean; onLibrary: (tab: StudyTab) => void; onCategory: (category: PrepCategory) => void; onAlgorithms: () => void; onExercise: (kind: string) => void }) {
  const due = reviewCounts(state.reviews).due;
  const items = [
    { title: "Coding exercises", copy: "Write, debug and explain a working approach.", icon: Code2, label: "Practical coding", action: () => onExercise("Live coding") },
    { title: "System design", copy: "Reason about architecture, APIs and failure recovery.", icon: Network, label: "Design practice", action: () => onCategory("System design") },
    { title: "Team management", copy: "Practice feedback, delegation and difficult tradeoffs.", icon: Users, label: "People skills", action: () => onCategory("Management") },
    { title: "Interview skills", copy: "Build clear answers around your own experience.", icon: MessageSquare, label: "Story practice", action: () => onCategory("Behavioral") },
  ];
  return <section className="practice-hub" aria-labelledby="practice-hub-title">
    <PageHeader title="Practice" id="practice-hub-title" actions={<button className="hub-outline-action" onClick={() => onLibrary("Flashcards")}><BookOpenCheck size={17} />{!loading && !unavailable && due > 0 ? `Review ${due} due cards` : "Review cards"}<ArrowRight size={16} /></button>} />
    <PracticeOptions onCoding={onAlgorithms} onQuiz={() => onLibrary("Quizzes")} onRecall={() => onLibrary("Flashcards")} due={due} />
    <h2 className="practice-more-heading">More ways to practice</h2><div className="practice-format-grid">{items.map(({ title, copy, icon: Icon, label, action }) => <button key={title} onClick={action} className="practice-format-card"><span className="practice-format-icon"><Icon size={25} strokeWidth={1.8} /></span>{/\d/.test(label) && <span className="practice-format-label">{label}</span>}<h2>{title}</h2><p>{copy}</p><ArrowRight className="practice-format-arrow" size={18} /></button>)}</div>
    {!loading && !unavailable && state.sessions.length > 0 && <p className="practice-history-note">{state.sessions.length} saved practice {state.sessions.length === 1 ? "session" : "sessions"}. Your work stays in its original exercise.</p>}
  </section>;
}
