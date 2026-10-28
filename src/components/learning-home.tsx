"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Blocks, BookOpen, BrainCircuit, Code2, MessageSquare, Users } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { studyProgressSchema } from "@/contracts/study";
import { workspaceSessionStorage } from "./workspace-client";
import { Mascot } from "./brand";
import "./learning-home.css";

const areas = [
  { title: "Coding", detail: "Patterns, debugging and practical exercises", icon: Code2, color: "blue" },
  { title: "AI & systems", detail: "Agents, evaluation and reliable systems", icon: BrainCircuit, color: "purple" },
  { title: "Frameworks & tools", detail: "Technical concepts, APIs and reference guides", icon: Blocks, color: "mint" },
  { title: "Team management", detail: "Feedback, delegation and leadership", icon: Users, color: "peach" },
  { title: "Interview skills", detail: "Communication, stories and preparation", icon: MessageSquare, color: "yellow" },
] as const;

export default function LearningHome({ state, loading, onCourses, onArea }: { state: WorkspaceState; loading: boolean; onCourses: () => void; onArea: (area: string) => void }) {
  const [resume, setResume] = useState<{ course: string; lesson: string } | null>(null);
  useEffect(() => {
    try {
      const route = JSON.parse(workspaceSessionStorage.getItem("interview-study-course-route-v1") ?? "null");
      const course = studyCourses.find(item => item.id === route?.courseId);
      const lesson = course?.lessons.find(item => item.id === route?.lessonId);
      if (course && lesson) setResume({ course: course.title, lesson: lesson.title });
    } catch { /* An unavailable draft does not block the dashboard. */ }
  }, []);
  const completed = Object.entries(state.settings).flatMap(([key, value]) => {
    if (!key.startsWith("study:lesson:")) return [];
    try {
      const parsed = studyProgressSchema.safeParse(JSON.parse(value));
      if (!parsed.success) return [];
      const lesson = studyCourses.flatMap(course => course.lessons).find(item => item.id === parsed.data.lessonId);
      return lesson ? [{ title: lesson.title, date: parsed.data.completedAt, kind: "Lesson completed" }] : [];
    } catch { return []; }
  });
  const recent = [...completed, ...state.sessions.map(session => ({ title: session.mode, date: session.completedAt, kind: "Practice saved" }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return <div className="learning-home">
    <header className="home-heading"><div><p className="home-kicker">Your personal learning space</p><h1>Welcome back</h1></div><button className="home-primary" onClick={onCourses}>Browse courses<ArrowRight size={17}/></button></header>
    {resume && <button className="home-resume" onClick={onCourses}><BookOpen size={22}/><span><small>Continue learning</small><strong>{resume.lesson}</strong><span>{resume.course}</span></span><ArrowRight size={19}/></button>}
    <section aria-labelledby="learning-areas-title"><div className="home-section-heading"><h2 id="learning-areas-title">What would you like to work on?</h2></div><div className="home-area-grid">{areas.map(({ title, detail, icon: Icon, color }) => <button key={title} className={`home-area home-area-${color}`} onClick={() => onArea(title)}><span className="home-icon"><Icon size={27} strokeWidth={1.7}/></span><h3>{title}</h3><p>{detail}</p><ArrowRight className="home-area-arrow" size={17}/></button>)}</div></section>
    <section className="home-activity" aria-labelledby="home-activity-title"><div className="home-section-heading"><h2 id="home-activity-title">Recent learning</h2></div>{loading ? <p className="home-muted" role="status">Loading your saved activity…</p> : recent.length ? <div className="home-recent-list">{recent.map((item, index) => <div key={`${item.date}-${index}`}><BookOpen size={18}/><span><strong>{item.title}</strong><small>{item.kind}</small></span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></div>)}</div> : <div className="home-first-session"><Mascot state="idle" size={64}/><div><h3>No learning activity yet</h3><p>Complete a lesson or save a practice session to see it here.</p><button onClick={onCourses}>Explore courses<ArrowRight size={15}/></button></div></div>}</section>
  </div>;
}
