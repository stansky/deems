"use client";

import { QuestionSession, SessionAction, ReadOnlyCode } from "@/components/features/learning/question-session";
import { recallContexts } from "@/data/practice-context";
import { recallDraftKey, recallDraftSchema } from "@/contracts/review-draft";
import { ChevronDown, Lightbulb } from "lucide-react";
import { workspaceSessionStorage } from "@/components/workspace-client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, CheckCircle2, ChevronRight,
  Circle, Code2, ExternalLink, Layers3, ListChecks, Network, Printer, RotateCcw, Search, Shield, X,
} from "lucide-react";
import { cheatSheets, flashcards } from "@/data/prep";
import { studyCourses } from "@/data/study-courses";
import { studyPaths } from "@/data/study-catalog";
import { learningSelection } from "@/lib/learning-catalog";
import { LearningLibrary, PathOverview, CourseOverview, type SaveLearning } from "./learning-library";
import {
  readStudyProgress, studyProgressKey, studyProgressSchema, studyRouteKey, learningSelectionKey, type StudyLaunch,
  studyCheckResultSchema, type StudyCheckResult, type StudyCourse, type StudyLesson, type StudyProgress, type StudyTab,
} from "@/contracts/study";
import type { WorkspaceState } from "@/lib/types";
import type { CommandMeta } from "@/domains/career/contracts";
import "./study-workspace.css";

import "./study-combined.css";
import { latestReviews, reviewCounts } from "@/lib/review-summary";
import { PageHeader } from "@/components/ui";
import { BrandState } from "@/components/brand";

type Props = {
  initialRoute?: StudyLaunch | null;
  state: WorkspaceState;
  tab: StudyTab;
  setTab: (tab: StudyTab) => void;
  selected: string;
  setSelected: (id: string) => void;
  mutate: (action: string, data: unknown, meta?: CommandMeta) => Promise<boolean>;
  saving: boolean;
  onPractice: (id: string) => void;
  onCareer: (companyId?: string, roleId?: string) => void;
};

type LessonDraft = {
  version: 1;
  courseId: string;
  lessonId: string;
  quizOnly?: boolean;
  sectionIndex: number;
  checkIndex: number;
  inChecks: boolean;
  results: StudyCheckResult[];
  selectedOptionId: string | null;
  feedback: "idle" | "incorrect" | "correct" | "revealed";
};

const blankDraft = (courseId = "", lessonId = ""): LessonDraft => ({ version: 1, courseId, lessonId, quizOnly: false, sectionIndex: 0, checkIndex: 0, inChecks: false, results: [], selectedOptionId: null, feedback: "idle" });
const draftStorageKey = (lessonId: string, mode: "course" | "quiz" = "course") => `interview-study-course-draft-v1:${lessonId}${mode === "quiz" ? ":quiz" : ""}`;
const routeStorageKey = studyRouteKey;
const themeLabels: Record<StudyCourse["theme"], string> = {
  blue: "Systems",
  purple: "Security",
  green: "Evaluation",
  gold: "Coding",
};

export default function StudyWorkspace({ initialRoute, state, tab, setTab, selected, setSelected, mutate, saving, onPractice, onCareer }: Props) {
  const [openCourseId, setOpenCourseId] = useState("");
  const [openPathId, setOpenPathId] = useState("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const [lessonLaunchMode, setLessonLaunchMode] = useState<"course" | "quiz">("course");
  const [routeReady, setRouteReady] = useState(false);
  const [draft, setDraft] = useState<LessonDraft>(blankDraft);
  const [savedDrafts, setSavedDrafts] = useState<Record<string, LessonDraft>>({});
  const [draftReadyFor, setDraftReadyFor] = useState("");
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [quizCourseId, setQuizCourseId] = useState(studyCourses[0]?.id ?? "");
  const [quizLessonId, setQuizLessonId] = useState(studyCourses[0]?.lessons[0]?.id ?? "");
  const [cardTopic, setCardTopic] = useState("All topics");
  const [dueOnly, setDueOnly] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [lastReviewedCard, setLastReviewedCard] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentCourse = studyCourses.find(course => course.id === openCourseId);
  const currentPath = studyPaths.find(path => path.id === openPathId);
  const activeLesson = currentCourse?.lessons.find(lesson => lesson.id === activeLessonId);
  const progressByLesson = useMemo(
    () => new Map(studyCourses.flatMap(course => course.lessons.map(lesson => { const saved = readStudyProgress(state.settings, lesson.id); return [lesson.id, saved?.courseId === course.id ? saved : null] as const; }))),
    [state.settings],
  );
  const reviewsByCard = useMemo(() => latestReviews(state.reviews), [state.reviews]);
  const dueCount = reviewCounts(state.reviews).due;

  useEffect(() => {
    try {
      let route: unknown = initialRoute;
      if (initialRoute === undefined) {
        const saved = workspaceSessionStorage.getItem(routeStorageKey);
        route = saved ? JSON.parse(saved) : null;
      }
      if (route && typeof route === "object") {
        const { courseId, lessonId, pathId } = route as { courseId?: unknown; lessonId?: unknown; pathId?: unknown };
        const path = studyPaths.find(item => item.id === pathId);
        if (path) setOpenPathId(path.id);
        const course = studyCourses.find(item => item.id === courseId);
        if (course) {
          setOpenCourseId(course.id);
          const lesson = typeof lessonId === "string" ? course.lessons.find(item => item.id === lessonId) : undefined;
          if (lesson) {
            setActiveLessonId(lesson.id);
            setQuizCourseId(course.id);
            setQuizLessonId(lesson.id);
            if ((route as { mode?: unknown }).mode === "quiz") {
              setLessonLaunchMode("quiz");
              setTab("Quizzes");
            }
          }
        }
      }
    } catch {
      // Ignore a malformed local route and start at the course catalog.
    }
    setRouteReady(true);
  }, []);

  useEffect(() => {
    if (!routeReady) return;
    try {
      if (!openCourseId && !openPathId) {
        workspaceSessionStorage.removeItem(routeStorageKey);
      } else {
        workspaceSessionStorage.setItem(routeStorageKey, JSON.stringify({ courseId: openCourseId || undefined, pathId: openPathId || undefined, lessonId: activeLessonId || undefined, mode: activeLessonId ? lessonLaunchMode : "course" }));
      }
    } catch {
      // Course navigation remains usable without session storage.
    }
  }, [routeReady, openCourseId, openPathId, activeLessonId, lessonLaunchMode]);

  useEffect(() => {
    if (!routeReady) return;
    const found: Record<string, LessonDraft> = {};
    for (const course of studyCourses) {
      for (const lesson of course.lessons) {
        const sectionCount = cheatSheets.find(item => item.id === lesson.guideId)?.sections.length ?? 1;
        for (const mode of ["course", "quiz"] as const) {
          const saved = readSavedLessonDraft(course, lesson, mode, sectionCount);
          if (saved) found[savedDraftKey(lesson.id, mode)] = saved;
        }
      }
    }
    setSavedDrafts(found);
  }, [routeReady]);

  useEffect(() => {
    if (!activeLessonId || !activeLesson) return;
    setDraftReadyFor("");
    setSaveError("");
    try {
      const saved = workspaceSessionStorage.getItem(draftStorageKey(activeLessonId, lessonLaunchMode));
      const guide = cheatSheets.find(item => item.id === activeLesson.guideId);
      const sectionCount = guide?.sections.length ?? 1;
      const startQuizDraft: LessonDraft = {
        ...blankDraft(currentCourse?.id ?? "", activeLessonId),
        quizOnly: true,
        sectionIndex: Math.max(0, sectionCount - 1),
        inChecks: true,
      };
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isLessonDraft(parsed, currentCourse?.id ?? "", activeLesson, sectionCount)) {
          const matchingMode = (parsed.quizOnly === true) === (lessonLaunchMode === "quiz");
          setDraft(matchingMode ? parsed : lessonLaunchMode === "quiz" ? startQuizDraft : blankDraft(currentCourse?.id ?? "", activeLessonId));
        } else {
          setDraft(lessonLaunchMode === "quiz" ? startQuizDraft : blankDraft(currentCourse?.id ?? "", activeLessonId));
        }
      } else {
        setDraft(lessonLaunchMode === "quiz" ? startQuizDraft : blankDraft(currentCourse?.id ?? "", activeLessonId));
      }
    } catch {
      const sectionCount = cheatSheets.find(item => item.id === activeLesson.guideId)?.sections.length ?? 1;
      setDraft(lessonLaunchMode === "quiz" ? {
        ...blankDraft(currentCourse?.id ?? "", activeLessonId), quizOnly: true,
        sectionIndex: Math.max(0, sectionCount - 1), inChecks: true,
      } : blankDraft(currentCourse?.id ?? "", activeLessonId));
    }
    setDraftReadyFor(activeLessonId);
    requestAnimationFrame(() => headingRef.current?.focus());
  }, [activeLessonId, activeLesson, currentCourse?.id, lessonLaunchMode]);

  useEffect(() => {
    if (!activeLessonId || draftReadyFor !== activeLessonId) return;
    try {
      workspaceSessionStorage.setItem(draftStorageKey(activeLessonId, lessonLaunchMode), JSON.stringify(draft));
      setSavedDrafts(current => ({ ...current, [savedDraftKey(activeLessonId, lessonLaunchMode)]: draft }));
    } catch {
      // Keep the lesson usable if this browser cannot store a same-tab draft.
    }
  }, [activeLessonId, draft, draftReadyFor, lessonLaunchMode]);

  useEffect(() => {
    if (tab === "Guides" || !activeLessonId) requestAnimationFrame(() => headingRef.current?.focus());
  }, [tab, selected, openCourseId, activeLessonId]);

  function clearLessonDrafts(lessonId: string) {
    for (const mode of ["course", "quiz"] as const) {
      try { workspaceSessionStorage.removeItem(draftStorageKey(lessonId, mode)); } catch { /* Saved progress remains authoritative. */ }
    }
    setSavedDrafts(current => {
      const next = { ...current };
      delete next[savedDraftKey(lessonId, "course")];
      delete next[savedDraftKey(lessonId, "quiz")];
      return next;
    });
  }

  const saveSelection: SaveLearning = async (kind, id, saved, launch) => {
    const selection = learningSelection(state.settings, kind, id, saved, launch);
    return mutate("setting", { key: learningSelectionKey(kind, id), value: JSON.stringify(selection) });
  };

  async function openLesson(course: StudyCourse, lesson: StudyLesson, startWithQuiz = false) {
    if (saving) return;
    const completed = Boolean(progressByLesson.get(lesson.id));
    const sectionCount = cheatSheets.find(item => item.id === lesson.guideId)?.sections.length ?? 1;
    const savedCourseDraft = completed ? null : readSavedLessonDraft(course, lesson, "course", sectionCount);
    const savedQuizDraft = completed ? null : readSavedLessonDraft(course, lesson, "quiz", sectionCount);
    const resumeQuiz = startWithQuiz || (!savedCourseDraft && Boolean(savedQuizDraft));
    const enrolled = await saveSelection("course", course.id, true, { lessonId: lesson.id, mode: resumeQuiz ? "quiz" : "course" });
    if (!enrolled) return;
    if (completed) clearLessonDrafts(lesson.id);
    setOpenCourseId(course.id);
    setActiveLessonId(lesson.id);
    setLessonLaunchMode(resumeQuiz ? "quiz" : "course");
    const guide = cheatSheets.find(item => item.id === lesson.guideId);
    const readingEnd = Math.max(0, (guide?.sections.length ?? 1) - 1);
    setDraft({ ...blankDraft(course.id, lesson.id), quizOnly: resumeQuiz, ...(resumeQuiz ? { sectionIndex: readingEnd, inChecks: true } : {}) });
    setDraftReadyFor("");
    setSaveError("");
  }

  function returnToCourse() {
    setActiveLessonId("");
    setLessonLaunchMode("course");
    setDraftReadyFor("");
    setSaveError("");
  }

  function openGuide(guideId: string) {
    setSelected(guideId);
    setTab("Guides");
    setOpenCourseId("");
    setOpenPathId("");
    setActiveLessonId("");
    setLessonLaunchMode("course");
  }

  function beginChecks() {
    setDraft(current => ({ ...current, inChecks: true, checkIndex: 0, selectedOptionId: null, feedback: "idle" }));
  }

  function submitAnswer() {
    if (!activeLesson || !draft.selectedOptionId || draft.feedback !== "idle") return;
    const check = activeLesson.checks[draft.checkIndex];
    const attempts = Math.min(100, (draft.results[draft.checkIndex]?.attempts ?? 0) + 1);
    const correct = draft.selectedOptionId === check.answerId;
    const result: StudyCheckResult = {
      checkId: check.id,
      selectedOptionId: draft.selectedOptionId,
      correct,
      revealed: draft.results[draft.checkIndex]?.revealed ?? false,
      attempts,
    };
    setDraft(current => ({
      ...current,
      results: replaceAt(current.results, current.checkIndex, result),
      feedback: correct ? "correct" : "incorrect",
    }));
  }

  function retryAnswer() {
    setDraft(current => ({ ...current, selectedOptionId: null, feedback: "idle" }));
  }

  function revealExplanation() {
    if (!activeLesson) return;
    const check = activeLesson.checks[draft.checkIndex];
    const prior = draft.results[draft.checkIndex];
    const result: StudyCheckResult = {
      checkId: check.id,
      selectedOptionId: draft.selectedOptionId ?? prior?.selectedOptionId ?? null,
      correct: false,
      revealed: true,
      attempts: prior?.attempts ?? 0,
    };
    setDraft(current => ({ ...current, results: replaceAt(current.results, current.checkIndex, result), feedback: "revealed" }));
  }

  function continueCheck() {
    if (!activeLesson) return;
    if (draft.checkIndex + 1 < activeLesson.checks.length) {
      setDraft(current => ({ ...current, checkIndex: current.checkIndex + 1, selectedOptionId: null, feedback: "idle" }));
    } else {
      setDraft(current => ({ ...current, checkIndex: activeLesson.checks.length, selectedOptionId: null, feedback: "idle" }));
    }
  }

  async function finishLesson() {
    if (!currentCourse || !activeLesson || saving) return;
    const checkResults = activeLesson.checks.map((check, index) => draft.results[index] ?? {
      checkId: check.id,
      selectedOptionId: null,
      correct: false,
      revealed: false,
      attempts: 0,
    });
    const progress = studyProgressSchema.parse({
      version: 1,
      contentVersion: 1,
      courseId: currentCourse.id,
      lessonId: activeLesson.id,
      completedAt: new Date().toISOString(),
      checks: checkResults,
    });
    setSaveError("");
    const saved = await mutate("setting", {
      key: studyProgressKey(activeLesson.id),
      value: JSON.stringify(progress),
    });
    if (saved) {
      clearLessonDrafts(activeLesson.id);
      setActiveLessonId("");
      setLessonLaunchMode("course");
      setDraftReadyFor("");
    } else {
      setSaveError("Your lesson is still here. Check the connection and try saving again.");
    }
  }

  const guideList = cheatSheets.filter(guide => `${guide.title} ${guide.subtitle} ${guide.category}`.toLowerCase().includes(query.trim().toLowerCase()));

  if (tab === "Guides") {
    const guide = guideList.find(item => item.id === selected) ?? guideList[0];
    return <div className="study-workspace study-workspace-guides">

      <div className="sw-guide-toolbar">
        <label className="sw-search"><Search size={17} /><input aria-label="Search guides" placeholder="Search guides" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <span>{guideList.length} {guideList.length === 1 ? "guide" : "guides"}</span><button type="button" className="sw-print-button" onClick={() => window.print()}><Printer size={15} />Print guide</button>
      </div>
      <div className="sw-guide-layout">
        <aside className="sw-guide-list" aria-label="Study guides">
          {guideList.map(item => <button type="button" key={item.id} className={guide?.id === item.id ? "is-selected" : ""} onClick={() => setSelected(item.id)}>
            <span>{item.category}</span><strong>{item.title}</strong><ChevronRight size={16} aria-hidden="true" />
          </button>)}
          {!guideList.length && <p className="sw-muted">No guides match that search.</p>}
        </aside>
        {guide && <article className="sw-guide-article">
          <p className="sw-eyebrow">{guide.category}</p>
          <h1 ref={headingRef} tabIndex={-1}>{guide.title}</h1>
          <p className="sw-guide-subtitle">{guide.subtitle}</p>
          <div className="sw-guide-sections">{guide.sections.map((section, index) => <section key={`${section.title}-${index}`}>
            <h2><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
            <p>{section.body}</p>
            {section.bullets?.length ? <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
            {section.code && <pre><code>{section.code}</code></pre>}
          </section>)}</div>
          {guide.sources?.length ? <footer className="sw-guide-sources"><h2>Sources</h2>{guide.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={14} /></a>)}</footer> : null}
        </article>}
      </div>
    </div>;
  }

  if (tab === "Flashcards") {
    return <FlashcardStudy state={state} setTab={setTab} dueCount={dueCount} topic={cardTopic} setTopic={setCardTopic} dueOnly={dueOnly} setDueOnly={setDueOnly} cardIndex={cardIndex} setCardIndex={setCardIndex} revealed={cardRevealed} setRevealed={setCardRevealed} saving={saving} mutate={mutate} reviewError={reviewError} setReviewError={setReviewError} lastReviewedCard={lastReviewedCard} setLastReviewedCard={setLastReviewedCard} />;
  }

  if (activeLesson && currentCourse) {
    return <LessonStudy
      course={currentCourse}
      lesson={activeLesson}
      draft={draft}
      setDraft={setDraft}
      headingRef={headingRef}
      onBack={returnToCourse}
      onStartChecks={beginChecks}
      onSubmit={submitAnswer}
      onRetry={retryAnswer}
      onReveal={revealExplanation}
      onContinue={continueCheck}
      onFinish={finishLesson}
      saveError={saveError}
      saving={saving}
    />;
  }

  if (tab === "Quizzes") {
    return <QuizHub
      courses={studyCourses}
      progressByLesson={progressByLesson}
      courseId={quizCourseId}
      lessonId={quizLessonId}
      onCourseChange={courseId => {
        const course = studyCourses.find(item => item.id === courseId);
        setQuizCourseId(courseId);
        setQuizLessonId(course?.lessons[0]?.id ?? "");
      }}
      onLessonChange={setQuizLessonId}
      onStart={course => openLesson(course, course.lessons.find(lesson => lesson.id === quizLessonId) ?? course.lessons[0], true)}
      onOpenCourse={course => { setTab("Courses"); setOpenCourseId(course.id); }}
      dueCount={dueCount}
      setTab={setTab}
    />;
  }

  if ((tab === "Courses" || tab === "My learning") && currentCourse) {
    return <CourseOverview course={currentCourse} state={state} saving={saving} onSave={saveSelection}
      hasDraft={id => Boolean(savedDrafts[savedDraftKey(id, "course")] ?? savedDrafts[savedDraftKey(id, "quiz")])}
      onLesson={(lesson, quiz) => void openLesson(currentCourse, lesson, quiz)} onGuide={openGuide} onPractice={onPractice}
      onBack={() => { setOpenCourseId(""); setActiveLessonId(""); }} backLabel={currentPath?.title ?? (tab === "My learning" ? "My learning" : "Browse")} />;
  }
  if ((tab === "Courses" || tab === "My learning") && currentPath) {
    return <PathOverview path={currentPath} state={state} saving={saving} onSave={saveSelection} onCourse={setOpenCourseId} onBack={() => setOpenPathId("")} />;
  }
  return <LearningLibrary mine={tab === "My learning"} state={state} saving={saving} onSave={saveSelection}
    onOpenCourse={setOpenCourseId} onOpenPath={setOpenPathId} onBrowse={() => setTab("Courses")} onReview={() => setTab("Flashcards")} onCareer={onCareer}
    onResume={(courseId, lessonId, mode) => { const course = studyCourses.find(item => item.id === courseId); const lesson = course?.lessons.find(item => item.id === lessonId); if (course && lesson) void openLesson(course, lesson, mode === "quiz"); }} />;
}


function QuizHub({ courses, progressByLesson, courseId, lessonId, onCourseChange, onLessonChange, onStart, onOpenCourse, dueCount, setTab }: {
  courses: StudyCourse[];
  progressByLesson: ReadonlyMap<string, StudyProgress | null>;
  courseId: string;
  lessonId: string;
  onCourseChange: (id: string) => void;
  onLessonChange: (id: string) => void;
  onStart: (course: StudyCourse) => void;
  onOpenCourse: (course: StudyCourse) => void;
  dueCount: number;
  setTab: (tab: StudyTab) => void;
}) {
  const course = courses.find(item => item.id === courseId) ?? courses[0];
  const lesson = course?.lessons.find(item => item.id === lessonId) ?? course?.lessons[0];
  const guide = lesson && cheatSheets.find(item => item.id === lesson.guideId);
  return <div className="study-workspace sw-quiz-hub">

    <PageHeader title="Quizzes" visible />
    <section className="sw-quiz-picker" aria-labelledby="sw-quiz-picker-title">
      <h2 id="sw-quiz-picker-title" className="sr-only">Choose a quiz</h2>
      {course && <div className="sw-quiz-selects">
        <label>Subject<select className="sw-select-blue" aria-label="Choose a course" value={course.id} onChange={event => onCourseChange(event.target.value)}>{courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {lesson && <label>Lesson<select className="sw-select-blue" aria-label="Choose a lesson" value={lesson.id} onChange={event => onLessonChange(event.target.value)}>{course.lessons.map(item => <option key={item.id} value={item.id}>{item.title}{progressByLesson.get(item.id) ? " · reviewed" : ""}</option>)}</select></label>}
      </div>}
      {course && lesson && <div className="sw-quiz-preview">
        <div><p className="sw-eyebrow">{themeLabels[course.theme]} · {guide?.category ?? "Study guide"}</p><h3>{lesson.title}</h3><p>{lesson.description}</p></div>
        <span>{lesson.checks.length} {lesson.checks.length === 1 ? "check" : "checks"}</span>
      </div>}
      <div className="sw-quiz-hub-actions">{course && <button type="button" className="sw-quiz-path-link" onClick={() => onOpenCourse(course)}>View course<ArrowRight size={16} /></button>}{course && lesson && <button type="button" className="sw-primary-button" onClick={() => onStart(course)}>Start quiz<ArrowRight size={17} /></button>}</div>
    </section>
  </div>;
}

function LessonStudy({ course, lesson, draft, setDraft, headingRef, onBack, onStartChecks, onSubmit, onRetry, onReveal, onContinue, onFinish, saveError, saving }: {
  course: StudyCourse;
  lesson: StudyLesson;
  draft: LessonDraft;
  setDraft: Dispatch<SetStateAction<LessonDraft>>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onStartChecks: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onReveal: () => void;
  onContinue: () => void;
  onFinish: () => void;
  saveError: string;
  saving: boolean;
}) {
  const guide = cheatSheets.find(item => item.id === lesson.guideId);
  useEffect(() => { requestAnimationFrame(() => headingRef.current?.focus()); }, [draft.sectionIndex, draft.checkIndex, draft.inChecks, headingRef]);
  if (!guide) return <div className="study-workspace"><p role="alert">The guide for this lesson is unavailable.</p><button type="button" onClick={onBack}>Return to course</button></div>;
  const checksComplete = draft.inChecks && draft.checkIndex >= lesson.checks.length;
  const check = lesson.checks[draft.checkIndex];
  const section = guide.sections[draft.sectionIndex];
  const source = check && guide.sections.find(item => item.title === check.sourceSectionTitle);
  const correctCount = draft.results.filter(result => result.correct).length;
  const revealedCount = draft.results.filter(result => result.revealed).length;
  const feedback = draft.feedback === "correct" ? "Correct. Here’s why." : draft.feedback === "incorrect" ? "Not quite. Try another approach." : draft.feedback === "revealed" ? "Compare with your thinking." : "Select one answer, then check it.";
  const actions = <div className="qs-footer-actions">{checksComplete ? <SessionAction onClick={onFinish} disabled={saving}>{saving ? "Saving progress…" : "Save progress"}<Check size={18} /></SessionAction> : !draft.inChecks ? <SessionAction onClick={() => draft.sectionIndex + 1 < guide.sections.length ? setDraft(current => ({ ...current, sectionIndex: current.sectionIndex + 1 })) : onStartChecks()}>{draft.sectionIndex + 1 < guide.sections.length ? "Continue" : "Start the checks"}<ArrowRight size={18} /></SessionAction> : draft.feedback === "idle" ? <SessionAction onClick={onSubmit} disabled={!draft.selectedOptionId}>Check answer<ArrowRight size={18} /></SessionAction> : draft.feedback === "incorrect" ? <><SessionAction secondary onClick={onReveal}>See explanation</SessionAction><SessionAction onClick={onRetry}>Try again<RotateCcw size={18} /></SessionAction></> : <SessionAction onClick={onContinue}>Continue<ArrowRight size={18} /></SessionAction>}</div>;
  return <QuestionSession title={lesson.title} context={course.title} onExit={onBack} className="qs-lesson" position={draft.inChecks ? checksComplete ? "Checks reviewed" : `Question ${draft.checkIndex + 1} of ${lesson.checks.length}` : `Section ${draft.sectionIndex + 1} of ${guide.sections.length}`} completed={draft.results.filter(result => result.correct || result.revealed).length} total={draft.inChecks ? lesson.checks.length : undefined} footer={<><div className="qs-footer-message" aria-live="polite">{checksComplete ? <CheckCircle2 size={21} /> : <BookOpen size={21} />}<div><strong>{checksComplete ? "Ready to save" : draft.inChecks ? feedback : "One section at a time."}</strong><p>{saveError || (checksComplete ? "Reviewed checks are saved only when you choose Save progress." : draft.inChecks ? "Your answer stays here until you continue." : "Your place is kept in this tab.")}</p></div></div>{actions}</>}>
    {checksComplete ? <section className="qs-completion"><CheckCircle2 size={45} /><h1 ref={headingRef} tabIndex={-1}>{lesson.title}</h1><p>Save this session to mark the {draft.quizOnly ? "quiz" : "lesson"} complete. This records reviewed checks, not mastery.</p><div className="qs-completion-stats"><span><strong>{correctCount}</strong>Correct</span><span><strong>{revealedCount}</strong>Explanations opened</span><span><strong>{lesson.checks.length}</strong>Checks reviewed</span></div>{saveError && <p className="qs-save-error" role="alert">{saveError}</p>}</section> : !draft.inChecks && section ? <article className="qs-reading"><div className="qs-subject"><BookOpen size={20} /><span>{guide.category}</span></div><h1 ref={headingRef} tabIndex={-1}>{section.title}</h1><p>{section.body}</p>{section.bullets?.length ? <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}{section.code && <ReadOnlyCode code={section.code} />}{guide.sources?.length ? <details className="qs-source"><summary>Related sources<ChevronRight size={16} /></summary>{guide.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13} /></a></p>)}</details> : null}</article> : check && <div className="qs-columns"><section className="qs-question" aria-label="Question and context"><div className="qs-subject"><Code2 size={20} /><span>{guide.category}</span><span>Knowledge check</span></div><h1 ref={headingRef} tabIndex={-1}>{check.prompt}</h1><p className="qs-intro">{lesson.description}</p>{source?.code && <ReadOnlyCode code={source.code} label="Example from the lesson" />}{source && <details className="qs-source"><summary><Lightbulb size={18} />Review the source section<ChevronDown size={16} /></summary><h2 className="qs-source-heading">{source.title}</h2><p>{source.body}</p>{source.bullets?.length ? <ul>{source.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}</details>}</section><section className="qs-response" aria-label="Your answer"><h2>Choose your answer.</h2><p>One choice. You can review the source if you need a nudge.</p><fieldset className="qs-answer-options" disabled={draft.feedback !== "idle"}><legend>Choose one answer</legend>{check.options.map((option, index) => <label key={option.id} className={`qs-answer-option ${draft.selectedOptionId === option.id ? "is-selected" : ""} ${draft.feedback === "incorrect" && option.id === draft.selectedOptionId ? "is-incorrect" : ""} ${(draft.feedback === "correct" || draft.feedback === "revealed") && option.id === check.answerId ? "is-correct" : ""}`}><span className="qs-answer-letter">{String.fromCharCode(65 + index)}</span><input type="radio" name={`study-check-${check.id}`} value={option.id} checked={draft.selectedOptionId === option.id} onChange={() => setDraft(current => ({ ...current, selectedOptionId: option.id }))} /><span>{option.text}</span></label>)}</fieldset>{(draft.feedback === "correct" || draft.feedback === "revealed") && <div className="qs-explanation" role="status"><h2>{draft.feedback === "correct" ? "The connection" : "Answer revealed"}</h2><p>{check.explanation}</p></div>}{draft.feedback === "incorrect" && <p role="status">That answer misses a constraint. Your choice is kept so you can compare it with the source.</p>}</section></div>}
  </QuestionSession>;
}

function FlashcardStudy({ state, setTab, dueCount, topic, setTopic, dueOnly, setDueOnly, cardIndex, setCardIndex, revealed, setRevealed, saving, mutate, reviewError, setReviewError, lastReviewedCard, setLastReviewedCard }: {
  state: WorkspaceState;
  setTab: (tab: StudyTab) => void;
  dueCount: number;
  topic: string;
  setTopic: (topic: string) => void;
  dueOnly: boolean;
  setDueOnly: (dueOnly: boolean) => void;
  cardIndex: number;
  setCardIndex: Dispatch<SetStateAction<number>>;
  revealed: boolean;
  setRevealed: (revealed: boolean) => void;
  saving: boolean;
  mutate: Props["mutate"];
  reviewError: string;
  setReviewError: (error: string) => void;
  lastReviewedCard: string;
  setLastReviewedCard: (id: string) => void;
}) {
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { text: string; revealed: boolean }>>({});
  const [ready, setReady] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const submitLock = useRef(false);
  const reviews = useMemo(() => latestReviews(state.reviews), [state.reviews]);
  const topics = Array.from(new Set(flashcards.map(item => item.category))).sort();
  const cards = flashcards.filter(card => (topic === "All topics" || card.category === topic) && (!dueOnly || Boolean(reviews.get(card.id) && Date.parse(reviews.get(card.id)!.dueAt) <= Date.now())));
  const card = flashcards.find(item => item.id === queue[cursor]);
  const context = card ? recallContexts[card.id] : undefined;
  const answer = card ? answers[card.id] ?? { text:"", revealed:false } : { text:"", revealed:false };
  useEffect(() => {
    try {
      const parsed = recallDraftSchema.safeParse(JSON.parse(workspaceSessionStorage.getItem(recallDraftKey) ?? "null"));
      if (parsed.success && parsed.data.ids.every(id => flashcards.some(card => card.id === id)) && (parsed.data.topic === "All topics" || topics.includes(parsed.data.topic))) {
        setQueue(parsed.data.ids); setCursor(parsed.data.cursor); setAnswers(parsed.data.answers); setTopic(parsed.data.topic); setDueOnly(parsed.data.dueOnly);
        setStarted(parsed.data.ids.length > 0 && parsed.data.cursor < parsed.data.ids.length);
      }
    } catch { setDraftError(true); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { workspaceSessionStorage.setItem(recallDraftKey, JSON.stringify(recallDraftSchema.parse({version:1,topic,dueOnly,ids:queue,cursor,answers}))); setDraftError(false); }
    catch { setDraftError(true); }
  }, [ready, topic, dueOnly, queue, cursor, answers]);
  function updateAnswer(change: Partial<typeof answer>) { if (card) setAnswers(previous => ({...previous,[card.id]:{...answer,...change}})); }
  function begin() { if (queue.length && cursor < queue.length) { setStarted(true); return; } setQueue(cards.slice(0,batchSize).map(card => card.id)); setCursor(0); setStarted(true); setReviewError(""); }
  function configure(nextTopic: string, nextDueOnly: boolean) { setTopic(nextTopic); setDueOnly(nextDueOnly); setQueue([]); setCursor(0); setReviewError(""); }
  async function review(rating: "again" | "good") {
    if (!card || !answer.revealed || saving || submitLock.current) return;
    submitLock.current = true; setReviewSubmitting(true); setReviewError("");
    const now = new Date();
    try {
      const ok = await mutate("review", { cardId:card.id, rating, reviewedAt:now.toISOString(), dueAt:new Date(now.getTime() + (rating === "again" ? 10 * 60_000 : 24 * 60 * 60_000)).toISOString() });
      if (!ok) { setReviewError("This review did not save. Your answer is still here. Try again."); return; }
      setLastReviewedCard(card.id);
      setAnswers(previous => {const next = {...previous}; delete next[card.id]; return next;});
      setCursor(index => index + 1);
    } finally { submitLock.current = false; setReviewSubmitting(false); }
  }
  if (started && queue.length && cursor >= queue.length) return <QuestionSession title="Review complete" context="Recall practice" onExit={() => setStarted(false)} completed={cursor} total={queue.length} position={`${cursor} reviews saved`} footer={<><div className="qs-footer-message"><CheckCircle2 size={22} /><div><strong>A little clearer.</strong><p>Your ratings were saved. Cards return according to their review schedule.</p></div></div><SessionAction onClick={() => {setStarted(false);setQueue([]);setCursor(0);}}>Choose more practice<ArrowRight size={18} /></SessionAction></>}><section className="qs-completion"><CheckCircle2 size={45} /><h1>{cursor} cards reviewed.</h1><p>That’s this batch complete. Take a break or choose another topic.</p></section></QuestionSession>;
  if (started && card) return <QuestionSession title="Recall & explain" context={card.category} onExit={() => setStarted(false)} className="qs-review" position={`Card ${cursor + 1} of ${queue.length}`} completed={cursor} total={queue.length} footer={<><div className="qs-footer-message" aria-live="polite"><BookOpen size={21} /><div><strong>{reviewError ? "Your answer is still here." : answer.revealed ? "How well did you recall it?" : "Recall first. Then compare."}</strong><p role={reviewError ? "alert" : undefined}>{reviewError || (draftError ? "The browser draft could not be saved. Keep this page open." : answer.revealed ? "Your rating schedules the next review." : "Writing an answer is optional.")}</p></div></div><div className="qs-footer-actions">{answer.revealed ? <><SessionAction secondary disabled={saving || reviewSubmitting} onClick={() => void review("again")}><RotateCcw size={18} />Again</SessionAction><SessionAction disabled={saving || reviewSubmitting} onClick={() => void review("good")}>{reviewSubmitting ? "Saving…" : "Got it"}<Check size={18} /></SessionAction></> : <SessionAction onClick={() => updateAnswer({revealed:true})}>Reveal explanation<ArrowRight size={18} /></SessionAction>}</div></>}><div className="qs-columns"><section className="qs-question" aria-label="Recall question"><div className="qs-subject"><BookOpen size={20} /><span>{card.category}</span><span>{card.difficulty}</span></div><h1>{card.question}</h1>{context && <div className="qs-recall-scenario"><span>FICTIONAL SCENARIO</span><h2>{context.title}</h2><div>{context.steps.map((step,index) => <span key={step}>{index > 0 && <ArrowRight size={15} />}<span>{step}</span></span>)}</div><p>{context.description}</p></div>}<div className="qs-review-note"><strong>Explain it in your own words.</strong><p>Think about the decision, why it matters, and an example. Compare your reasoning before rating your recall.</p></div></section><section className="qs-response" aria-label="Your thinking"><h2>{answer.revealed ? "Compare your thinking." : "Where would you start?"}</h2>{answer.revealed ? <><div className="qs-explanation"><h2>The idea</h2><p>{card.answer}</p>{card.example && <div><strong>For example</strong><p>{card.example}</p></div>}</div>{answer.text && <details className="qs-source"><summary>Your response<ChevronDown size={16} /></summary><p>{answer.text}</p></details>}</> : <><label htmlFor="recall-response" className="qs-recall-label">Your thinking <span>Optional</span></label><textarea id="recall-response" className="qs-recall-input" maxLength={12000} value={answer.text} onChange={event => updateAnswer({text:event.target.value})} placeholder="Start with what you remember…" /><p className="qs-intro">Self-rated recall. There is no automatic grade.</p></>}</section></div></QuestionSession>;
  return <div className="study-workspace sw-flashcards"><section className="recall-setup"><header><div><h1>Recall & explain</h1><p>Choose a topic and a short batch.</p></div><BookOpen size={30} /></header><div className="recall-setup-controls"><label>Topic<select value={topic} onChange={event => configure(event.target.value,dueOnly)}><option>All topics</option>{topics.map(item => <option key={item}>{item}</option>)}</select></label><label>Cards<select value={dueOnly ? "due" : "all"} onChange={event => configure(topic,event.target.value === "due")}><option value="due">Due now · {dueCount}</option><option value="all">All cards</option></select></label><label>Batch size<select value={batchSize} onChange={event => {setBatchSize(Number(event.target.value));setQueue([]);setCursor(0);}}>{[5,10,20].map(size => <option key={size} value={size}>{size} cards</option>)}</select></label></div>{!cards.length ? <BrandState kind="success" title="No cards due here" description="Choose all cards or another topic to keep practicing." compact /> : <p className="recall-available">{cards.length} cards available · {Math.min(cards.length,batchSize)} in a new batch</p>}<div className="recall-setup-actions"><button type="button" className="sw-secondary-button" onClick={() => setTab("Quizzes")}>Browse quizzes<ArrowRight size={17} /></button><button type="button" className="sw-primary-button" disabled={!ready || (!cards.length && !(queue.length && cursor < queue.length))} onClick={begin}>{queue.length && cursor < queue.length ? "Continue review" : "Start review"}<ArrowRight size={18} /></button></div>{draftError && <p className="qs-save-error">Browser draft storage is unavailable. Your answers stay in this open page.</p>}</section></div>;
}


function courseCountLabel(count: number) {
  return count === 1 ? "lesson" : "lessons";
}

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  const next = [...items];
  next[index] = value;
  return next;
}

const savedDraftKey = (lessonId: string, mode: "course" | "quiz") => `${lessonId}:${mode}`;

function courseTopicIcon(theme: StudyCourse["theme"]) {
  const props = { size: 28, strokeWidth: 1.8, "aria-hidden": true as const };
  switch (theme) {
    case "blue": return <Network {...props} />;
    case "purple": return <Shield {...props} />;
    case "green": return <BarChart3 {...props} />;
    case "gold": return <Code2 {...props} />;
  }
}

function readSavedLessonDraft(course: StudyCourse, lesson: StudyLesson, mode: "course" | "quiz", sectionCount: number): LessonDraft | null {
  try {
    const saved = workspaceSessionStorage.getItem(draftStorageKey(lesson.id, mode));
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!isLessonDraft(parsed, course.id, lesson, sectionCount)) return null;
    return (parsed.quizOnly === true) === (mode === "quiz") ? parsed : null;
  } catch {
    return null;
  }
}

function isLessonDraft(value: unknown, courseId: string, lesson: StudyLesson, sectionCount: number): value is LessonDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<LessonDraft>;
  if (draft.version !== 1 || draft.courseId !== courseId || draft.lessonId !== lesson.id) return false;
  if (draft.quizOnly !== undefined && typeof draft.quizOnly !== "boolean") return false;
  if (draft.quizOnly === true && !draft.inChecks) return false;
  if (!Number.isInteger(draft.sectionIndex) || Number(draft.sectionIndex) < 0 || Number(draft.sectionIndex) >= sectionCount) return false;
  if (!Number.isInteger(draft.checkIndex) || Number(draft.checkIndex) < 0 || Number(draft.checkIndex) > lesson.checks.length) return false;
  if (typeof draft.inChecks !== "boolean" || !Array.isArray(draft.results) || !["idle", "incorrect", "correct", "revealed"].includes(String(draft.feedback))) return false;
  if (draft.selectedOptionId !== null && typeof draft.selectedOptionId !== "string") return false;
  const checkIndex = Number(draft.checkIndex);
  const feedback = draft.feedback;
  if (!draft.inChecks) return checkIndex === 0 && draft.results.length === 0 && draft.selectedOptionId === null && feedback === "idle";
  if (Number(draft.sectionIndex) !== sectionCount - 1 || draft.results.length < checkIndex || draft.results.length > checkIndex + 1) return false;
  if (checkIndex === lesson.checks.length && (draft.results.length !== lesson.checks.length || draft.selectedOptionId !== null || feedback !== "idle")) return false;

  for (let index = 0; index < draft.results.length; index += 1) {
    const parsed = studyCheckResultSchema.safeParse(draft.results[index]);
    const result = parsed.success ? parsed.data : null;
    const check = lesson.checks[index];
    if (!result || result.checkId !== check.id) return false;
    if (result.selectedOptionId && !check.options.some(option => option.id === result.selectedOptionId)) return false;
    if (result.correct && (result.selectedOptionId !== check.answerId || result.revealed || result.attempts < 1)) return false;
    if (result.revealed && (result.correct || result.selectedOptionId === check.answerId || result.attempts < 1)) return false;
    if (!result.correct && !result.revealed && (result.attempts < 1 || result.selectedOptionId === check.answerId)) return false;
    if (index < checkIndex && !result.correct && !result.revealed) return false;
  }

  if (checkIndex < lesson.checks.length) {
    const check = lesson.checks[checkIndex];
    if (draft.selectedOptionId && !check.options.some(option => option.id === draft.selectedOptionId)) return false;
    const currentResult = draft.results[checkIndex];
    if (feedback === "idle" && currentResult && (currentResult.correct || currentResult.revealed)) return false;
    if (feedback === "incorrect" && (!currentResult || currentResult.correct || currentResult.revealed || currentResult.selectedOptionId !== draft.selectedOptionId)) return false;
    if (feedback === "correct" && (!currentResult || !currentResult.correct || draft.selectedOptionId !== check.answerId)) return false;
    if (feedback === "revealed" && (!currentResult?.revealed || !currentResult.selectedOptionId || currentResult.selectedOptionId !== draft.selectedOptionId)) return false;
  }
  return true;
}
