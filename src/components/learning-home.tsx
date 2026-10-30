"use client";

import { useMemo } from "react";
import { ArrowRight, Check, Code2, RotateCcw, WifiOff } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { exercises, flashcards } from "@/data/prep";
import { readStudyProgress } from "@/contracts/study";
import { catalogItems, courseProgress, isInLearning, itemProgress, myLearning } from "@/lib/learning-catalog";
import { Button } from "./ui/button";
import { LearningOverview } from "./learning-overview";
import { CareerLearning } from "./career-learning";
import { LearningCard } from "./features/study/learning-library";
import "./learning-home.css";
import { NextLearningHero, PracticeOptions } from "./features/learning/learning-entry";

type Props = {
  state: WorkspaceState; loading: boolean; historyUnavailable?: boolean; onRetry?: () => void;
  onCourses: () => void; onMyLearning: () => void; onOpenPath: (id: string) => void;
  onOpenCourse: (courseId: string, lessonId?: string, mode?: "course" | "quiz") => void;
  onCoding: () => void; onQuizzes: () => void; onArea: (area: string) => void; onReview: () => void; onCareer: (companyId?: string, roleId?: string) => void;
};

export default function LearningHome({ state, loading, historyUnavailable = false, onRetry, onCourses, onMyLearning, onOpenCourse, onOpenPath: _onOpenPath, onArea, onReview, onCareer, onCoding, onQuizzes }: Props) {
  const mine = myLearning(state.settings);
  const activeEntries = mine.filter(entry => itemProgress(entry, state.settings).done < itemProgress(entry, state.settings).total);
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
    <NextLearningHero state={state} onOpenCourse={onOpenCourse} onBrowse={onCourses} />
    <section className="home-practice" aria-labelledby="home-practice-title"><h2 id="home-practice-title">Choose your practice</h2><PracticeOptions onCoding={onCoding} onQuiz={onQuizzes} onRecall={onReview} due={dueReviews.length} /></section>

    <nav className="home-topics" aria-label="Explore learning topics"><span className="home-eyebrow">Explore topics</span><div>{["Coding", "AI & systems", "Frameworks & tools", "Team management", "Interview skills"].map(topic => <button key={topic} onClick={() => onArea(topic)}>{topic}<ArrowRight size={14} /></button>)}</div></nav>

    {isNew && suggestedCourses.length > 0 && <section className="home-suggested" aria-labelledby="home-suggested-title"><div className="home-section-heading"><div><h2 id="home-suggested-title">Suggested courses</h2></div><button className="home-text-action" onClick={onCourses}>Browse all courses<ArrowRight size={15} /></button></div><div className="home-course-grid">{suggestedCourses.map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}

    {finished && <>
      {completedCatalogCourses.length > 0 && <section className="home-completions" aria-labelledby="home-completed-title"><div className="home-section-heading"><h2 id="home-completed-title">Courses you completed</h2><button className="home-text-action" onClick={onMyLearning}>See My learning<ArrowRight size={15} /></button></div><div className="home-course-grid">{completedCatalogCourses.slice(0, 3).map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}
      {suggestedCourses.length > 0 && <section className="home-suggested" aria-labelledby="home-suggested-title"><div className="home-section-heading"><div><p className="home-eyebrow">Keep going</p><h2 id="home-suggested-title">Suggested courses</h2></div><button className="home-text-action" onClick={onCourses}>Browse all courses<ArrowRight size={15} /></button></div><div className="home-course-grid">{suggestedCourses.map(entry => entry.kind === "course" && <LearningCard key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section>}
    </>}

    {started && activeEntries.length > 0 && <section className="home-my-learning" aria-labelledby="home-my-learning"><div className="home-section-heading"><h2 id="home-my-learning">My learning</h2><button className="home-text-action" onClick={onMyLearning}>View all<ArrowRight size={15} /></button></div><div className="home-learning-cards">{activeEntries.slice(0, 4).map(entry => <LearningCard key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={state.settings} onOpen={() => entry.kind === "course" ? onOpenCourse(entry.item.id) : _onOpenPath(entry.item.id)} />)}</div></section>}

    {dueReviews.length > 0 && <div className="home-due-review"><span><strong>{dueReviews.length} review{dueReviews.length === 1 ? "" : "s"} due</strong><small>{dueReviews[0].category} · {dueReviews[0].question}</small></span><button onClick={onReview}>Review now<ArrowRight size={15} /></button></div>}

    {recent.length > 0 && <section className="home-progress-summary" aria-label="Your learning progress"><LearningOverview compact state={state} loading={false} unavailable={false} onLearning={onMyLearning} onArea={onArea} /></section>}

    <CareerLearning onOpen={onCareer} limit={4} />

    {recent.length > 0 && <section className="home-recent" aria-labelledby="home-recent"><div className="home-section-heading"><h2 id="home-recent">Recent activity</h2></div><div className="home-recent-grid">{recent.map(item => <div key={`${item.kind}-${item.id}`}><item.icon size={18} /><div><strong>{item.title}</strong><span>{item.kind} · <time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span></div></div>)}</div></section>}
  </div>;
}
