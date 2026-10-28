"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Blocks, BookOpen, BrainCircuit, Check, Code2, Layers3, MessageSquare, Network, RotateCcw, ShieldCheck, Users, WifiOff } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { exercises } from "@/data/prep";
import { readStudyProgress, studyRouteKey, type StudyCourse, type StudyLaunch } from "@/contracts/study";
import { workspaceSessionStorage } from "./workspace-client";
import { Button } from "./ui/button";
import { SceneArt } from "./scene-art";
import "./learning-home.css";

const areas = [
  { title: "Coding", detail: "Patterns & problem solving", icon: Code2, color: "blue" },
  { title: "AI & systems", detail: "Agents & architecture", icon: BrainCircuit, color: "purple" },
  { title: "Frameworks & tools", detail: "Concepts & reference", icon: Blocks, color: "mint" },
  { title: "Team management", detail: "Feedback & leadership", icon: Users, color: "peach" },
  { title: "Interview skills", detail: "Stories & communication", icon: MessageSquare, color: "yellow" },
] as const;
const courseIcons = { blue: Network, purple: ShieldCheck, green: BrainCircuit, gold: Code2 };
const courseTopics = { blue: "AI & systems", purple: "Security & AI", green: "AI evaluation", gold: "Coding" };

type Props = {
  state: WorkspaceState; loading: boolean; historyUnavailable?: boolean; onRetry?: () => void;
  onCourses: () => void; onOpenCourse: (courseId: string, lessonId?: string, mode?: "course" | "quiz") => void;
  onArea: (area: string) => void; onReview: () => void;
};

function CourseTile({ course, completed, unavailable, onOpen }: { course: StudyCourse; completed: number; unavailable: boolean; onOpen: () => void }) {
  const Icon = courseIcons[course.theme];
  return <button className={`home-course home-course-${course.theme}`} onClick={onOpen}>
    <div className="home-course-top"><span className="home-course-icon"><Icon size={24} strokeWidth={1.7} /></span><span>{courseTopics[course.theme]}</span></div>
    <h3>{course.title}</h3><p>{course.description}</p>
    {!unavailable && completed > 0 && <div className="home-course-progress"><progress value={completed} max={course.lessons.length} aria-label={`${course.title}: ${completed} of ${course.lessons.length} lessons completed`} /><span>{completed} of {course.lessons.length} completed</span></div>}
    <div className="home-course-bottom"><span>{course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}</span><strong>{unavailable ? "Open course" : completed === course.lessons.length ? "Review course" : completed > 0 ? "Continue" : "Start course"}<ArrowRight size={15} /></strong></div>
  </button>;
}

export default function LearningHome({ state, loading, historyUnavailable = false, onRetry, onCourses, onOpenCourse, onArea, onReview }: Props) {
  const [route, setRoute] = useState<StudyLaunch | null>(null);
  const [date, setDate] = useState("");
  useEffect(() => {
    const refreshDate = () => setDate(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
    refreshDate();
    window.addEventListener("focus", refreshDate);
    try {
      const saved = JSON.parse(workspaceSessionStorage.getItem(studyRouteKey) ?? "null");
      const course = studyCourses.find(item => item.id === saved?.courseId);
      const lesson = course?.lessons.find(item => item.id === saved?.lessonId);
      if (course && lesson) setRoute({ courseId: course.id, lessonId: lesson.id, mode: saved.mode === "quiz" ? "quiz" : "course" });
    } catch { /* A missing route does not block learning. */ }
    return () => window.removeEventListener("focus", refreshDate);
  }, []);
  const progress = new Map(studyCourses.flatMap(course => course.lessons.map(lesson => {
    const saved = readStudyProgress(state.settings, lesson.id);
    return [lesson.id, saved?.courseId === course.id ? saved : null] as const;
  })));
  const completedFor = (course: StudyCourse) => course.lessons.filter(lesson => progress.get(lesson.id)).length;
  const partial = studyCourses.filter(course => completedFor(course) > 0 && completedFor(course) < course.lessons.length).sort((a, b) => {
    const lastCompleted = (course: StudyCourse) => Math.max(...course.lessons.map(lesson => Date.parse(progress.get(lesson.id)?.completedAt ?? "") || 0));
    return lastCompleted(b) - lastCompleted(a);
  })[0];
  const nextLesson = partial?.lessons.find(lesson => !progress.get(lesson.id));
  const resumable: StudyLaunch | null = historyUnavailable || loading ? null : route && !progress.get(route.lessonId ?? "") ? route : partial && nextLesson ? { courseId: partial.id, lessonId: nextLesson.id, mode: "course" } : null;
  const resumeCourse = studyCourses.find(course => course.id === resumable?.courseId);
  const resumeLesson = resumeCourse?.lessons.find(lesson => lesson.id === resumable?.lessonId);
  const recent = [
    ...studyCourses.flatMap(course => course.lessons.flatMap(lesson => {
      const saved = progress.get(lesson.id);
      return saved ? [{ id: lesson.id, title: lesson.title, date: saved.completedAt, kind: "Lesson completed", icon: Check }] : [];
    })),
    ...state.sessions.map(session => ({ id: session.id, title: exercises.find(item => item.id === session.exerciseId)?.title ?? session.mode, date: session.completedAt, kind: "Practice saved", icon: Code2 })),
  ].filter(item => Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 4);

  return <div className="learning-home">
    <header className="home-heading">
      <div className="home-welcome-copy"><p className="home-date">{date || "Your learning space"}</p><h1>Welcome back</h1>
        <p className="home-welcome-detail">{resumeLesson ? resumeLesson.title : "Find your next lesson, or practice something you’re working on."}</p>
        {resumeCourse && <p className="home-resume-context">{resumeCourse.title}</p>}
        <Button variant="secondary" className="home-primary" onClick={() => resumeCourse && resumeLesson ? onOpenCourse(resumeCourse.id, resumeLesson.id, resumable?.mode) : onCourses()}>{resumeLesson ? "Continue learning" : "Browse courses"}<ArrowRight size={17} /></Button>
      </div>
      <SceneArt className="home-scene" />
    </header>

    <section className="home-topics" aria-labelledby="learning-areas-title"><div className="home-section-heading"><h2 id="learning-areas-title">Explore by topic</h2></div>
      <div className="home-area-grid">{areas.map(({ title, detail, icon: Icon, color }) => <button key={title} className={`home-area home-area-${color}`} onClick={() => onArea(title)}><Icon size={23} strokeWidth={1.7} /><h3>{title}</h3><p>{detail}</p><ArrowRight className="home-area-arrow" size={15} /></button>)}</div>
    </section>

    <div className="home-learning-grid">
      <section aria-labelledby="home-courses-title"><div className="home-section-heading"><h2 id="home-courses-title">Your courses</h2><button className="home-text-action" onClick={onCourses}>View all<ArrowRight size={14} /></button></div>
        {loading ? <div className="home-course-grid" aria-label="Loading course progress" aria-busy="true">{studyCourses.map(course => <div key={course.id} className="home-course-skeleton"><span /><span /><span /></div>)}</div> : <div className="home-course-grid">{studyCourses.map(course => <CourseTile key={course.id} course={course} completed={completedFor(course)} unavailable={historyUnavailable} onOpen={() => onOpenCourse(course.id)} />)}</div>}
      </section>
      <aside className="home-sidebar">
        <section className="home-activity" aria-labelledby="home-activity-title"><div className="home-section-heading"><h2 id="home-activity-title">Recent learning</h2></div>
          {loading ? <div className="home-activity-loading" role="status">Loading your activity…</div> : historyUnavailable ? <div className="home-activity-state" role="alert"><WifiOff size={24} strokeWidth={1.6} /><h3>Activity is unavailable</h3><p>Your saved work is unchanged. Try loading it again.</p><button className="home-text-action" onClick={onRetry}>Try again<RotateCcw size={14} /></button></div> : recent.length ? <div className="home-recent-list">{recent.map(item => <div key={`${item.kind}-${item.id}`}><span className="home-activity-icon"><item.icon size={16} /></span><div><strong>{item.title}</strong><span>{item.kind}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></div></div>)}</div> : <div className="home-activity-state"><BookOpen size={25} strokeWidth={1.5} /><h3>A fresh start</h3><p>Your completed lessons and saved practice will appear here.</p></div>}
        </section>
        <section className="home-study-tools" aria-labelledby="home-tools-title"><h2 id="home-tools-title">A little practice</h2><button onClick={() => onArea("Coding")}><Code2 size={19} /><span><strong>Work through a problem</strong><small>Coding and debugging</small></span><ArrowRight size={15} /></button><button onClick={onReview}><Layers3 size={19} /><span><strong>Review a concept</strong><small>Spaced recall</small></span><ArrowRight size={15} /></button><button onClick={() => onArea("Interview skills")}><MessageSquare size={19} /><span><strong>Find the words</strong><small>Interview stories and communication</small></span><ArrowRight size={15} /></button></section>
      </aside>
    </div>
  </div>;
}
