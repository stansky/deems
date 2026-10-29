"use client";

import { ArrowRight, BookOpenCheck, Code2, Layers3, ListChecks, MessageSquare, Network, Users } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { flashcards } from "@/data/prep";
import { studyCourses } from "@/data/study-courses";
import type { StudyTab } from "@/contracts/study";
import type { PrepCategory } from "./features/prep/prep-library";
import "./practice-hub.css";

export function PracticeHub({ state, loading, unavailable, onLibrary, onCategory, onAlgorithms, onExercise }: { state: WorkspaceState; loading: boolean; unavailable: boolean; onLibrary: (tab: StudyTab) => void; onCategory: (category: PrepCategory) => void; onAlgorithms: () => void; onExercise: (kind: string) => void }) {
  const latest = new Map<string, WorkspaceState["reviews"][number]>();
  for (const review of state.reviews) if (!latest.has(review.cardId) || review.reviewedAt > latest.get(review.cardId)!.reviewedAt) latest.set(review.cardId, review);
  const due = flashcards.filter(card => { const review = latest.get(card.id); return review && Date.parse(review.dueAt) <= Date.now(); }).length;
  const checks = studyCourses.reduce((sum, course) => sum + course.lessons.reduce((count, lesson) => count + lesson.checks.length, 0), 0);
  const items = [
    { title: "Coding exercises", copy: "Write, debug and explain a working approach.", icon: Code2, label: "Practical coding", action: () => onExercise("Live coding") },
    { title: "Coding problems", copy: "Work through patterns with language solutions and hints.", icon: Layers3, label: "Algorithms", action: onAlgorithms },
    { title: "System design", copy: "Reason about architecture, APIs and failure recovery.", icon: Network, label: "Design practice", action: () => onCategory("System design") },
    { title: "Knowledge checks", copy: "Check your understanding, then explore why an answer works.", icon: ListChecks, label: `${checks} questions`, action: () => onLibrary("Quizzes") },
    { title: "Team management", copy: "Practice feedback, delegation and difficult tradeoffs.", icon: Users, label: "People skills", action: () => onCategory("Management") },
    { title: "Interview skills", copy: "Build clear answers around your own experience.", icon: MessageSquare, label: "Story practice", action: () => onCategory("Behavioral") },
  ];
  return <section className="practice-hub" aria-labelledby="practice-hub-title">
    <header className="hub-page-heading"><h1 id="practice-hub-title">Practice</h1><button className="hub-outline-action" onClick={() => onLibrary("Flashcards")}><BookOpenCheck size={17} />{!loading && !unavailable && due > 0 ? `Review ${due} due cards` : "Spaced review"}<ArrowRight size={16} /></button></header>
    <div className="practice-format-grid">{items.map(({ title, copy, icon: Icon, label, action }) => <button key={title} onClick={action} className="practice-format-card"><span className="practice-format-icon"><Icon size={25} strokeWidth={1.8} /></span><span className="practice-format-label">{label}</span><h2>{title}</h2><p>{copy}</p><ArrowRight className="practice-format-arrow" size={18} /></button>)}</div>
    {!loading && !unavailable && state.sessions.length > 0 && <p className="practice-history-note">{state.sessions.length} saved practice {state.sessions.length === 1 ? "session" : "sessions"}. Your work stays in its original exercise.</p>}
  </section>;
}
