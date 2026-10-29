"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Blocks, BrainCircuit, Check, Code2, Layers3, MessageSquare, RotateCcw, Users, WifiOff } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { exercises } from "@/data/prep";
import { readStudyProgress, studyRouteKey, type StudyLaunch } from "@/contracts/study";
import { isInLearning, myLearning, nextLearning } from "@/lib/learning-catalog";
import { workspaceSessionStorage } from "./workspace-client";
import { Button } from "./ui/button";
import { LearningOverview } from "./learning-overview";
import { CareerLearning } from "./career-learning";
import { LearningCollection, NextLearningStep } from "./features/study/learning-library";
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
  onArea: (area: string) => void; onReview: () => void; onCareer: (companyId?: string, roleId?: string) => void;
};

export default function LearningHome({ state, loading, historyUnavailable = false, onRetry, onCourses, onMyLearning, onOpenCourse, onOpenPath, onArea, onReview, onCareer }: Props) {
  const [route, setRoute] = useState<StudyLaunch | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(workspaceSessionStorage.getItem(studyRouteKey) ?? "null");
      const course = studyCourses.find(item => item.id === saved?.courseId);
      const lesson = course?.lessons.find(item => item.id === saved?.lessonId);
      if (course && lesson) setRoute({ courseId: course.id, lessonId: lesson.id, mode: saved.mode === "quiz" ? "quiz" : "course" });
    } catch { /* A missing route does not block learning. */ }
  }, []);
  const mine = myLearning(state.settings);
  const next = nextLearning(state.settings);
  const routeCourse = studyCourses.find(course => course.id === route?.courseId);
  const currentRoute = route && routeCourse && isInLearning({ kind: "course", item: routeCourse }, state.settings) && !readStudyProgress(state.settings, route.lessonId ?? "") ? route : null;
  const resumable: StudyLaunch | null = loading || historyUnavailable ? null : currentRoute ?? (next ? { courseId: next.course.id, lessonId: next.lesson.id, mode: next.mode } : null);
  const resumeCourse = studyCourses.find(course => course.id === resumable?.courseId);
  const resumeLesson = resumeCourse?.lessons.find(lesson => lesson.id === resumable?.lessonId);
  const started = Boolean(currentRoute) || Boolean(next?.started);
  const recent = [
    ...studyCourses.flatMap(course => course.lessons.flatMap(lesson => {
      const saved = readStudyProgress(state.settings, lesson.id);
      return saved?.courseId === course.id ? [{ id: lesson.id, title: lesson.title, date: saved.completedAt, kind: "Module completed", icon: Check }] : [];
    })),
    ...state.sessions.map(session => ({ id: session.id, title: exercises.find(item => item.id === session.exerciseId)?.title ?? session.mode, date: session.completedAt, kind: "Practice saved", icon: Code2 })),
  ].filter(item => Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);

  return <div className="learning-home">
    <LearningOverview state={state} loading={loading} unavailable={historyUnavailable} onLearning={onMyLearning} onArea={onArea} />

    <section className="home-my-learning" aria-labelledby="home-my-learning"><div className="home-section-heading"><h2 id="home-my-learning">My learning</h2>{!loading && !historyUnavailable && <button className="home-text-action" onClick={mine.length ? onMyLearning : onCourses}>{mine.length ? "View all" : "Browse"}<ArrowRight size={15} /></button>}</div>
      {loading ? <div className="home-learning-skeleton" aria-busy="true" aria-label="Loading your learning"><span /><span /><span /></div> : historyUnavailable ? <div className="home-learning-state" role="alert"><WifiOff size={25} /><div><h3>Your learning is unavailable</h3><p>Your saved work is unchanged. Try loading it again.</p></div><Button className="lc-action lc-action-outline" variant="learning-outline" onClick={onRetry}>Try again<RotateCcw size={15} /></Button></div> : <>
        {resumeCourse && resumeLesson && <NextLearningStep course={resumeCourse} lesson={resumeLesson} mode={resumable?.mode === "quiz" ? "quiz" : "course"} started={started} settings={state.settings} onOpen={() => onOpenCourse(resumeCourse.id, resumeLesson.id, resumable?.mode)} />}
        <LearningCollection entries={mine} settings={state.settings} onOpenCourse={onOpenCourse} onOpenPath={onOpenPath} limit={2} />
      </>}
    </section>

    <CareerLearning onOpen={onCareer} limit={4} />

    <section className="home-topics" aria-labelledby="home-topics"><div className="home-section-heading"><h2 id="home-topics">Explore by topic</h2></div><div className="home-area-grid">{areas.map(({ title, detail, icon: Icon, color }) => <button key={title} className={`home-area home-area-${color}`} onClick={() => onArea(title)}><Icon size={24} strokeWidth={1.8} /><h3>{title}</h3><p>{detail}</p><ArrowRight className="home-area-arrow" size={15} /></button>)}</div></section>

    <section className="home-quick-practice" aria-label="Quick practice"><button onClick={() => onArea("Coding")}><Code2 size={19} /><span>Coding & debugging</span><ArrowRight size={15} /></button><button onClick={onReview}><Layers3 size={19} /><span>Spaced review</span><ArrowRight size={15} /></button><button onClick={() => onArea("Interview skills")}><MessageSquare size={19} /><span>Interview stories</span><ArrowRight size={15} /></button></section>

    {!loading && !historyUnavailable && recent.length > 0 && <section className="home-recent" aria-labelledby="home-recent"><div className="home-section-heading"><h2 id="home-recent">Recent activity</h2></div><div className="home-recent-grid">{recent.map(item => <div key={`${item.kind}-${item.id}`}><item.icon size={18} /><div><strong>{item.title}</strong><span>{item.kind} · <time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span></div></div>)}</div></section>}
  </div>;
}
