"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Code2, ListChecks } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { studyCourses } from "@/data/study-courses";
import { courseProgress, isInLearning, itemStarted, nextCourseLesson, nextLearning } from "@/lib/learning-catalog";
import { readStudyProgress, studyRouteKey, type StudyLaunch } from "@/contracts/study";
import { workspaceSessionStorage } from "@/components/workspace-client";
import { Button } from "@/components/ui/button";
import "./learning-entry.css";

type OpenCourse = (courseId: string, lessonId?: string, mode?: "course" | "quiz") => void;
export function NextLearningHero({ state, onOpenCourse, onBrowse }: { state: WorkspaceState; onOpenCourse: OpenCourse; onBrowse: () => void }) {
  const [route, setRoute] = useState<StudyLaunch | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(workspaceSessionStorage.getItem(studyRouteKey) ?? "null");
      const course = studyCourses.find(item => item.id === saved?.courseId);
      const lesson = course?.lessons.find(item => item.id === saved?.lessonId);
      if (course && lesson && isInLearning({ kind: "course", item: course }, state.settings) && !readStudyProgress(state.settings, lesson.id)) setRoute({ courseId: course.id, lessonId: lesson.id, mode: saved.mode === "quiz" ? "quiz" : "course" });
      else setRoute(null);
    } catch { setRoute(null); }
  }, [state.settings]);
  const next = nextLearning(state.settings);
  const routedCourse = studyCourses.find(item => item.id === route?.courseId);
  const suggestion = studyCourses.find(item => item.id === "coding-reasoning" && courseProgress(item, state.settings) < item.lessons.length) ?? studyCourses.find(item => courseProgress(item, state.settings) < item.lessons.length);
  const course = routedCourse ?? next?.course ?? suggestion;
  const routedLesson = course?.lessons.find(item => item.id === route?.lessonId);
  const step = course ? { ...nextCourseLesson(course, state.settings), ...(routedLesson ? { lesson: routedLesson, mode: route?.mode ?? "course" } : {}) } : null;
  const started = Boolean(course && (routedLesson || itemStarted({ kind: "course", item: course }, state.settings)));
  const done = course ? courseProgress(course, state.settings) : 0;
  return <section className="learning-next-hero" aria-labelledby="learning-next-title">
    <div className="learning-next-copy"><span className="learning-next-context">{course ? started ? "Continue your course" : "Suggested course" : "Your learning"}</span><h1 id="learning-next-title">{course?.title ?? "Every course, completed."}</h1>
      {step && <p className="learning-next-lesson">{started ? "Up next" : "First lesson"} · {step.lesson.title}</p>}
      {course && started && <div className="learning-next-progress"><div><span>{done} of {course.lessons.length} lessons complete</span><strong>{Math.round(done / course.lessons.length * 100)}%</strong></div><progress aria-label="Course lessons completed" value={done} max={course.lessons.length} /></div>}
      <div className="learning-next-actions"><Button variant="learning" className="learning-entry-action text-lg font-extrabold justify-between gap-5 rounded-lg has-[>svg]:px-[18px]" onClick={() => course && step ? onOpenCourse(course.id, step.lesson.id, step.mode) : onBrowse()}>{course ? started ? "Continue course" : "Start course" : "Browse learning paths"}<ArrowRight size={21} className="size-5" /></Button>{course && !started && <span>{course.lessons.length} lessons · Reading + checks</span>}</div>
    </div><div className="learning-next-scene"><img src="/brand/practice-cafe-scene.png" alt="Deems reading with coffee in a San Francisco neighborhood café." width={1536} height={1024} fetchPriority="high" /></div>
  </section>;
}

export function PracticeOptions({ onCoding, onQuiz, onRecall, due = 0 }: { onCoding: () => void; onQuiz: () => void; onRecall: () => void; due?: number }) {
  const options = [
    { key:"coding", format:"Coding challenge", title:"Write code", exercise:"Arrays & hash maps", copy:"Build and test a solution in JavaScript or Python.", detail:"Fixed test cases", cta:"Start coding", icon:Code2, action:onCoding },
    { key:"quiz", format:"Knowledge check", title:"Answer a quiz", exercise:"Check your understanding", copy:"Choose a course and work through its questions.", detail:"Multiple choice", cta:"Start quiz", icon:ListChecks, action:onQuiz },
    { key:"recall", format:"Recall practice", title:"Explain a concept", exercise:due > 0 ? `${due} ${due === 1 ? "review" : "reviews"} ready` : "Make an idea stick", copy:"Put it in your own words, then compare with an explanation.", detail:"Self-rated recall", cta:"Start recall", icon:BookOpen, action:onRecall },
  ];
  return <section className="learning-practice-options" aria-label="Practice options">{options.map(({key,format,title,exercise,copy,detail,cta,icon:Icon,action}) => <article key={key} className={`learning-practice-option learning-option-${key}`}><header><span className="learning-option-icon"><Icon size={28} strokeWidth={1.8} /></span><div><span>{format}</span><h2>{title}</h2></div></header><div className="learning-option-content"><h3>{exercise}</h3><p>{copy}</p><span>{detail}</span></div><Button variant="learning" className="learning-entry-action text-lg font-extrabold justify-between gap-5 rounded-lg has-[>svg]:px-[18px]" onClick={action}>{cta}<ArrowRight size={20} className="size-5" /></Button></article>)}</section>;
}
