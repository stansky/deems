"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Code2, RotateCcw, WifiOff } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { exercises, flashcards } from "@/data/prep";
import { readStudyProgress, studyRouteKey, type StudyLaunch } from "@/contracts/study";
import { catalogItems, courseProgress, isInLearning, itemProgress, itemStarted, myLearning, nextLearning, nextCourseLesson } from "@/lib/learning-catalog";
import { workspaceSessionStorage } from "./workspace-client";
import { Button } from "./ui/button";
import { LearningOverview } from "./learning-overview";
import { CareerLearning } from "./career-learning";
import { LearningCard, NextLearningStep } from "./features/study/learning-library";
import "./learning-home.css";

type Props = {
  state: WorkspaceState; loading: boolean; historyUnavailable?: boolean; onRetry?: () => void;
  onCourses: () => void; onMyLearning: () => void; onOpenPath: (id: string) => void;
  onOpenCourse: (courseId: string, lessonId?: string, mode?: "course" | "quiz") => void;
  onArea: (area: string) => void; onReview: () => void; onCareer: (companyId?: string, roleId?: string) => void;
};

export default function LearningHome({ state, loading, historyUnavailable = false, onRetry, onCourses, onMyLearning, onOpenCourse, onOpenPath: _onOpenPath, onArea, onReview, onCareer }: Props) {
  const [route, setRoute] = useState<StudyLaunch | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(workspaceSessionStorage.getItem(studyRouteKey) ?? "null");
      const course = studyCourses.find(item => item.id === saved?.courseId);
      const lesson = course?.lessons.find(item => item.id === saved?.lessonId);
      if (course && lesson) setRoute({ courseId: course.id, lessonId: lesson.id, mode: saved.mode === "quiz" ? "quiz" : "course" });
    } catch { /* A missing route does not block learning. */ }
  }, []);

  const mine = myLearning(state.settings);
  const activeCourses = mine.filter(entry => entry.kind === "course" && courseProgress(entry.item, state.settings) < entry.item.lessons.length).flatMap(entry => entry.kind === "course" ? [entry.item] : []);
  const activeEntries = mine.filter(entry => itemProgress(entry, state.settings).done < itemProgress(entry, state.settings).total);
  const completedCourses = mine.filter(entry => entry.kind === "course" && itemProgress(entry, state.settings).done === itemProgress(entry, state.settings).total);
  const currentRouteCourse = studyCourses.find(course => course.id === route?.courseId);
  const currentRoute = route && currentRouteCourse && isInLearning({ kind: "course", item: currentRouteCourse }, state.settings) && !readStudyProgress(state.settings, route.lessonId ?? "") ? route : null;
  const initialCourseId = currentRoute?.courseId ?? nextLearning(state.settings)?.course.id ?? activeCourses[0]?.id ?? "";
  const chosenCourseId = activeCourses.some(course => course.id === selectedCourseId) ? selectedCourseId : initialCourseId;
  const resumeCourse = studyCourses.find(course => course.id === chosenCourseId);
  const baseResume = resumeCourse ? { course: resumeCourse, ...nextCourseLesson(resumeCourse, state.settings), started: itemStarted({ kind: "course", item: resumeCourse }, state.settings) } : null;
  const resumable = baseResume && currentRoute?.courseId === baseResume.course.id ? { ...baseResume, lesson: baseResume.course.lessons.find(lesson => lesson.id === currentRoute.lessonId) ?? baseResume.lesson, mode: currentRoute.mode ?? baseResume.mode, started: true } : baseResume;
  const started = activeEntries.length > 0;
  const finished = !loading && !historyUnavailable && mine.length > 0 && !started;
  const isNew = !loading && !historyUnavailable && !started && !finished;
  const suggestions = catalogItems.filter(entry => entry.kind === "course" && !isInLearning(entry, state.settings) && itemProgress(entry, state.settings).done < itemProgress(entry, state.settings).total);
  const suggestedCourses = suggestions.filter(entry => entry.kind === "course").sort((a, b) => Number(b.item.id === "coding-reasoning") - Number(a.item.id === "coding-reasoning")).slice(0, 3);
  const completedCatalogCourses = catalogItems.filter(entry => entry.kind === "course" && itemProgress(entry, state.settings).done === itemProgress(entry, state.settings).total && courseProgress(entry.item, state.settings) > 0);
  const dueReviews = useMemo(() => {
    const cardById = new Map(flashcards.map(card => [card.id, card]));
    const latestByCard = new Map<string, WorkspaceState["reviews"][number]>();
    for (const review of state.reviews) {
      const previous = latestByCard.get(review.cardId);
      if (!previous || Date.parse(review.reviewedAt) > Date.parse(previous.reviewedAt)) latestByCard.set(review.cardId, review);
    }
    return [...latestByCard.values()].filter(review => Date.parse(review.dueAt) <= Date.now() && cardById.has(review.cardId)).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)).map(review => cardById.get(review.cardId)!);
  }, [state.reviews]);
  const recent = [
    ...studyCourses.flatMap(course => course.lessons.flatMap(lesson => {
      const saved = readStudyProgress(state.settings, lesson.id);
      return saved?.courseId === course.id ? [{ id: lesson.id, title: lesson.title, date: saved.completedAt, kind: "Module completed", icon: Check }] : [];
    })),
    ...state.sessions.map(session => ({ id: session.id, title: exercises.find(item => item.id === session.exerciseId)?.title ?? session.mode, date: session.completedAt, kind: "Practice saved", icon: Code2 })),
  ].filter(item => Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);

  if (loading) return <div className="learning-home"><section className="home-state-card" aria-busy="true"><span /><span /><p>Loading your learning</p></section></div>;
  if (historyUnavailable) return <div className="learning-home"><section className="home-state-card home-error-state" role="alert"><WifiOff size={24} /><div><h1>Your learning is unavailable</h1><p>Your saved work is unchanged. Try loading it again.</p></div><Button className="lc-action lc-action-outline" variant="learning-outline" onClick={onRetry}>Try again<RotateCcw size={15} /></Button></section></div>;

  return <div className="learning-home">
    {isNew && <LearningOverview state={state} loading={false} unavailable={false} onLearning={onMyLearning} onArea={onArea} onCourses={onCourses} onReview={onReview} />}

    {started && resumable && <div className="home-snapshot-row">
      <section className="home-next-panel" aria-labelledby="home-resume-title"><div className="home-section-heading"><div><p className="home-eyebrow">Pick up your learning</p><h1 id="home-resume-title">Next activity</h1></div>{activeCourses.length > 1 && <div className="home-course-buttons" aria-label="Choose an active course">{activeCourses.map(course => <button key={course.id} type="button" className={course.id === resumable.course.id ? "is-selected" : ""} aria-pressed={course.id === resumable.course.id} onClick={() => setSelectedCourseId(course.id)}>{course.title}</button>)}</div>}</div><NextLearningStep course={resumable.course} lesson={resumable.lesson} mode={resumable.mode} started={resumable.started} settings={state.settings} onOpen={() => onOpenCourse(resumable.course.id, resumable.lesson.id, resumable.mode)} /></section>
      <LearningOverview compact state={state} loading={false} unavailable={false} onLearning={onMyLearning} onArea={onArea} />
    </div>}

    {isNew && suggestedCourses.length > 0 && <section className="home-suggested" aria-labelledby="home-suggested-title"><div className="home-section-heading"><div><p className="home-eyebrow">Take one small step</p><h2 id="home-suggested-title">Suggested courses</h2></div><button className="home-text-action" onClick={onCourses}>Browse all courses<ArrowRight size={15} /></button></div><div className="home-course-grid">{suggestedCourses.map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}

    {finished && <>
      <LearningOverview state={state} loading={false} unavailable={false} onLearning={onMyLearning} onArea={onArea} onCourses={onCourses} onReview={onReview} />
      {completedCatalogCourses.length > 0 && <section className="home-completions" aria-labelledby="home-completed-title"><div className="home-section-heading"><h2 id="home-completed-title">Courses you completed</h2><button className="home-text-action" onClick={onMyLearning}>See My learning<ArrowRight size={15} /></button></div><div className="home-course-grid">{completedCatalogCourses.slice(0, 3).map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}
      {suggestedCourses.length > 0 && <section className="home-suggested" aria-labelledby="home-suggested-title"><div className="home-section-heading"><div><p className="home-eyebrow">Keep going</p><h2 id="home-suggested-title">Suggested courses</h2></div><button className="home-text-action" onClick={onCourses}>Browse all courses<ArrowRight size={15} /></button></div><div className="home-course-grid">{suggestedCourses.map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}
    </>}

    {started && activeEntries.length > 0 && <section className="home-my-learning" aria-labelledby="home-my-learning"><div className="home-section-heading"><h2 id="home-my-learning">My learning</h2><button className="home-text-action" onClick={onMyLearning}>View all<ArrowRight size={15} /></button></div><div className="home-learning-cards">{activeEntries.slice(0, 4).map(entry => <LearningCard key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={state.settings} onOpen={() => entry.kind === "course" ? onOpenCourse(entry.item.id) : _onOpenPath(entry.item.id)} />)}</div></section>}

    {dueReviews.length > 0 && <div className="home-due-review"><span><strong>{dueReviews.length} review{dueReviews.length === 1 ? "" : "s"} due</strong><small>{dueReviews[0].category} · {dueReviews[0].question}</small></span><button onClick={onReview}>Review now<ArrowRight size={15} /></button></div>}

    <CareerLearning onOpen={onCareer} limit={4} />
    <nav className="home-topics" aria-label="Explore learning topics"><span className="home-eyebrow">Explore topics</span><div>{["Coding", "AI & systems", "Frameworks & tools", "Team management", "Interview skills"].map(topic => <button key={topic} onClick={() => onArea(topic)}>{topic}<ArrowRight size={14} /></button>)}</div></nav>
    {recent.length > 0 && <section className="home-recent" aria-labelledby="home-recent"><div className="home-section-heading"><h2 id="home-recent">Recent activity</h2></div><div className="home-recent-grid">{recent.map(item => <div key={`${item.kind}-${item.id}`}><item.icon size={18} /><div><strong>{item.title}</strong><span>{item.kind} · <time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span></div></div>)}</div></section>}
  </div>;
}
