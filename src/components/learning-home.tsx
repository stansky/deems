"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Blocks, Bookmark, BrainCircuit, Check, Code2, Layers3, MessageSquare, RotateCcw, Users, WifiOff } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { studyPaths } from "@/data/study-catalog";
import { exercises } from "@/data/prep";
import { readStudyProgress, studyRouteKey, type StudyLaunch } from "@/contracts/study";
import { itemCourses, itemProgress, itemStarted, myLearning, nextCourseLesson } from "@/lib/learning-catalog";
import { workspaceSessionStorage } from "./workspace-client";
import { Button } from "./ui/button";
import { SceneArt } from "./scene-art";
import { LearningCard } from "./features/study/learning-library";
import "./learning-home.css";

const areas = [
  { title: "Coding", detail: "Patterns & problem solving", icon: Code2, color: "blue" },
  { title: "AI & systems", detail: "Agents & architecture", icon: BrainCircuit, color: "purple" },
  { title: "Frameworks & tools", detail: "Concepts & reference", icon: Blocks, color: "mint" },
  { title: "Team management", detail: "Feedback & leadership", icon: Users, color: "peach" },
  { title: "Interview skills", detail: "Stories & communication", icon: MessageSquare, color: "yellow" },
] as const;

type Props = {
  state: WorkspaceState; loading: boolean; historyUnavailable?: boolean; onRetry?: () => void;
  onCourses: () => void; onMyLearning: () => void; onOpenPath: (id: string) => void;
  onOpenCourse: (courseId: string, lessonId?: string, mode?: "course" | "quiz") => void;
  onArea: (area: string) => void; onReview: () => void;
};

export default function LearningHome({ state, loading, historyUnavailable = false, onRetry, onCourses, onMyLearning, onOpenCourse, onOpenPath, onArea, onReview }: Props) {
  const [route, setRoute] = useState<StudyLaunch | null>(null);
  const [date, setDate] = useState("");
  useEffect(() => {
    const refreshDate = () => setDate(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
    refreshDate(); window.addEventListener("focus", refreshDate);
    try {
      const saved = JSON.parse(workspaceSessionStorage.getItem(studyRouteKey) ?? "null");
      const course = studyCourses.find(item => item.id === saved?.courseId);
      const lesson = course?.lessons.find(item => item.id === saved?.lessonId);
      if (course && lesson) setRoute({ courseId: course.id, lessonId: lesson.id, mode: saved.mode === "quiz" ? "quiz" : "course" });
    } catch { /* A missing route does not block learning. */ }
    return () => window.removeEventListener("focus", refreshDate);
  }, []);
  const mine = myLearning(state.settings);
  const nextEntry = mine.find(entry => { const progress = itemProgress(entry, state.settings); return progress.done < progress.total; });
  const nextCourse = nextEntry && itemCourses(nextEntry).find(course => course.lessons.some(lesson => !readStudyProgress(state.settings, lesson.id)));
  const next = nextCourse && nextCourseLesson(nextCourse, state.settings);
  const currentRoute = route && !readStudyProgress(state.settings, route.lessonId ?? "") ? route : null;
  const resumable: StudyLaunch | null = loading || historyUnavailable ? null : currentRoute ?? (nextCourse && next ? { courseId: nextCourse.id, lessonId: next.lesson.id, mode: next.mode } : null);
  const resumeCourse = studyCourses.find(course => course.id === resumable?.courseId);
  const resumeLesson = resumeCourse?.lessons.find(lesson => lesson.id === resumable?.lessonId);
  const started = Boolean(currentRoute) || Boolean(nextEntry && itemStarted(nextEntry, state.settings));
  const recent = [
    ...studyCourses.flatMap(course => course.lessons.flatMap(lesson => {
      const saved = readStudyProgress(state.settings, lesson.id);
      return saved?.courseId === course.id ? [{ id: lesson.id, title: lesson.title, date: saved.completedAt, kind: "Module completed", icon: Check }] : [];
    })),
    ...state.sessions.map(session => ({ id: session.id, title: exercises.find(item => item.id === session.exerciseId)?.title ?? session.mode, date: session.completedAt, kind: "Practice saved", icon: Code2 })),
  ].filter(item => Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);

  return <div className="learning-home">
    <header className="home-heading"><div className="home-welcome-copy"><p className="home-date">{date || "Your learning space"}</p><h1>Welcome back</h1><p className="home-welcome-detail">{resumeLesson ? resumeLesson.title : "What will you make progress on today?"}</p>{resumeCourse && <p className="home-resume-context">{resumeCourse.title}</p>}<Button variant="learning" className="lc-action home-primary" onClick={() => resumeCourse && resumeLesson ? onOpenCourse(resumeCourse.id, resumeLesson.id, resumable?.mode) : onCourses()}>{resumeLesson ? started ? "Continue learning" : "Start learning" : "Find your next course"}<ArrowRight size={17} /></Button></div><SceneArt className="home-scene" /></header>

    <section className="home-my-learning" aria-labelledby="home-my-learning"><div className="home-section-heading"><h2 id="home-my-learning">My learning</h2>{!loading && !historyUnavailable && <button className="home-text-action" onClick={mine.length ? onMyLearning : onCourses}>{mine.length ? "View all" : "Browse"}<ArrowRight size={15} /></button>}</div>
      {loading ? <div className="home-learning-skeleton" aria-busy="true" aria-label="Loading your learning"><span /><span /><span /></div> : historyUnavailable ? <div className="home-learning-state" role="alert"><WifiOff size={25} /><div><h3>Your learning is unavailable</h3><p>Your saved work is unchanged. Try loading it again.</p></div><Button className="lc-action lc-action-outline" variant="learning-outline" onClick={onRetry}>Try again<RotateCcw size={15} /></Button></div> : mine.length ? <div className="lc-card-grid">{mine.slice(0, 4).map(entry => <LearningCard key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={state.settings} onOpen={() => entry.kind === "path" ? onOpenPath(entry.item.id) : onOpenCourse(entry.item.id)} />)}</div> : <div className="home-learning-state"><span className="home-state-icon"><Bookmark size={25} /></span><div><h3>Pick something you want to learn</h3><p>Save a course or path. Come back here to keep going.</p></div></div>}
    </section>

    <section className="home-discover" aria-labelledby="home-discover"><div className="home-section-heading"><h2 id="home-discover">Take a learning path</h2><button className="home-text-action" onClick={onCourses}>Browse all<ArrowRight size={15} /></button></div><div className="home-discover-layout"><div className="home-path-grid">{studyPaths.map(path => <LearningCard key={path.id} entry={{ kind: "path", item: path }} settings={historyUnavailable || loading ? {} : state.settings} onOpen={() => onOpenPath(path.id)} />)}</div><aside className="home-practice-panel"><span className="home-practice-label">A little practice</span><h3>Put an idea to work.</h3><p>Try a problem, revisit a concept, or talk through a decision.</p><button onClick={() => onArea("Coding")}><Code2 size={19} /><span>Coding & debugging</span><ArrowRight size={15} /></button><button onClick={onReview}><Layers3 size={19} /><span>Spaced review</span><ArrowRight size={15} /></button><button onClick={() => onArea("Interview skills")}><MessageSquare size={19} /><span>Interview stories</span><ArrowRight size={15} /></button></aside></div></section>

    <section className="home-topics" aria-labelledby="home-topics"><div className="home-section-heading"><h2 id="home-topics">Explore by topic</h2></div><div className="home-area-grid">{areas.map(({ title, detail, icon: Icon, color }) => <button key={title} className={`home-area home-area-${color}`} onClick={() => onArea(title)}><Icon size={24} strokeWidth={1.8} /><h3>{title}</h3><p>{detail}</p><ArrowRight className="home-area-arrow" size={15} /></button>)}</div></section>

    {!loading && !historyUnavailable && recent.length > 0 && <section className="home-recent" aria-labelledby="home-recent"><div className="home-section-heading"><h2 id="home-recent">Recent activity</h2></div><div className="home-recent-grid">{recent.map(item => <div key={`${item.kind}-${item.id}`}><item.icon size={18} /><div><strong>{item.title}</strong><span>{item.kind} · <time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span></div></div>)}</div></section>}
  </div>;
}
