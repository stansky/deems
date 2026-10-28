"use client";

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
import "./study-night.css";
import "./study-combined.css";
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

export default function StudyWorkspace({ initialRoute, state, tab, setTab, selected, setSelected, mutate, saving, onPractice }: Props) {
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
  const [dueOnly, setDueOnly] = useState(true);
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
  const dueCount = flashcards.filter(card => {
    const latest = reviewsByCard.get(card.id);
    return !latest || new Date(latest.dueAt).getTime() <= Date.now();
  }).length;

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
      <StudyTabs tab={tab} setTab={setTab} dueCount={dueCount} />
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
    onOpenCourse={setOpenCourseId} onOpenPath={setOpenPathId} onBrowse={() => setTab("Courses")} onReview={() => setTab("Flashcards")} />;
}

function StudyTabs({ tab, setTab, dueCount }: { tab: StudyTab; setTab: (tab: StudyTab) => void; dueCount: number }) {
  return <nav className="sw-tabs" aria-label="Study formats">
    {(["My learning", "Courses", "Quizzes", "Guides", "Flashcards"] as const).map(item => <button type="button" key={item} className={tab === item ? "is-selected" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>
      {item === "Courses" ? <BookOpen size={16} /> : item === "Quizzes" ? <ListChecks size={16} /> : item === "Guides" ? <Circle size={15} /> : <Layers3 size={16} />}{item}{item === "Flashcards" && dueCount > 0 && tab !== "Flashcards" ? <span>{dueCount}</span> : null}
    </button>)}
  </nav>;
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
    <StudyTabs tab="Quizzes" setTab={setTab} dueCount={dueCount} />
    <header className="sw-quiz-heading"><div><h1>Quizzes</h1></div></header>
    <section className="sw-quiz-picker" aria-labelledby="sw-quiz-picker-title">
      <div className="sw-quiz-picker-heading"><p className="sw-eyebrow">Choose a concept</p><h2 id="sw-quiz-picker-title">Practice a concept</h2></div>
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
  const quizOnly = draft.quizOnly === true;
  useEffect(() => {
    requestAnimationFrame(() => headingRef.current?.focus());
  }, [draft.sectionIndex, draft.checkIndex, draft.inChecks, headingRef]);
  if (!guide) return <div className="study-workspace"><p role="alert">The guide for this lesson is unavailable.</p><button type="button" onClick={onBack}>Return to course</button></div>;
  const readingComplete = draft.sectionIndex >= guide.sections.length;
  const checksComplete = draft.inChecks && draft.checkIndex >= lesson.checks.length;
  const check = lesson.checks[draft.checkIndex];
  const currentSection = guide.sections[draft.sectionIndex];
  const totalSteps = quizOnly ? lesson.checks.length : guide.sections.length + lesson.checks.length;
  const currentStep = draft.inChecks
    ? (quizOnly ? draft.checkIndex + 1 : guide.sections.length + draft.checkIndex + 1)
    : Math.min(draft.sectionIndex + 1, guide.sections.length);
  const progressPercent = Math.min(100, totalSteps ? ((currentStep - 1) / totalSteps) * 100 : 0);
  const correctCount = draft.results.filter(result => result.correct).length;
  const revealedCount = draft.results.filter(result => result.revealed).length;

  return <div className="study-workspace sw-lesson-screen">
    <div className="sw-lesson-topline"><button type="button" className="sw-close-lesson" onClick={onBack} aria-label="Close lesson"><X size={20} /><span>Close lesson</span></button><span className="sw-lesson-name">{lesson.title}</span><span>{quizOnly ? "Question" : "Step"} {Math.min(currentStep, totalSteps)} of {totalSteps}</span></div>
    <div className="sw-lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={Math.min(currentStep - 1, totalSteps)} aria-valuetext={`${Math.max(0, Math.round(progressPercent))}%`}><span style={{ width: `${progressPercent}%` }} /></div>
    <article className="sw-lesson-content">
      {!draft.inChecks && !readingComplete && currentSection && <>
        <p className="sw-eyebrow">{guide.category} · Section {draft.sectionIndex + 1} of {guide.sections.length}</p>
        <h1 ref={headingRef} tabIndex={-1}>{currentSection.title}</h1>
        {draft.sectionIndex === 0 && <p className="sw-lesson-description">{lesson.description}</p>}
        <div className="sw-reading-copy"><p>{currentSection.body}</p>
          {currentSection.bullets?.length ? <ul>{currentSection.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
          {currentSection.code && <pre><code>{currentSection.code}</code></pre>}
        </div>
        {guide.sources?.length ? <div className="sw-inline-sources"><span>Related sources</span>{guide.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13} /></a>)}</div> : null}
        <div className="sw-lesson-actions"><button type="button" className="sw-primary-button" onClick={() => draft.sectionIndex + 1 < guide.sections.length ? setDraft(current => ({ ...current, sectionIndex: current.sectionIndex + 1 })) : onStartChecks()}>{draft.sectionIndex + 1 < guide.sections.length ? "Continue" : "Start the checks"}<ArrowRight size={17} /></button></div>
      </>}
      {draft.inChecks && !checksComplete && check && <>
        <p className="sw-eyebrow">{quizOnly ? `Question ${draft.checkIndex + 1} of ${lesson.checks.length}` : `Check ${draft.checkIndex + 1} of ${lesson.checks.length}`}</p>
        <h1 ref={headingRef} tabIndex={-1}>{check.prompt}</h1>
        <p className="sw-check-source">From the guide section: <strong>{check.sourceSectionTitle}</strong></p>
        <fieldset className={`sw-answer-options is-${draft.feedback}`} disabled={draft.feedback !== "idle"}>
          <legend>Choose one answer</legend>
          {check.options.map(option => <label key={option.id} className={`sw-answer-option ${draft.selectedOptionId === option.id ? "is-selected" : ""} ${draft.feedback === "incorrect" && option.id === draft.selectedOptionId ? "is-incorrect" : ""} ${(draft.feedback === "correct" || draft.feedback === "revealed") && option.id === check.answerId ? "is-correct" : ""}`}>
            <input type="radio" name={`study-check-${check.id}`} value={option.id} checked={draft.selectedOptionId === option.id} onChange={() => setDraft(current => ({ ...current, selectedOptionId: option.id }))} />
            <span>{option.text}</span>
          </label>)}
        </fieldset>
        {draft.feedback === "incorrect" && <div className="sw-feedback sw-feedback-incorrect" role="status"><strong><X size={17} />Not quite. Try another answer, or review the explanation.</strong><div><button type="button" onClick={onRetry}><RotateCcw size={15} />Try again</button><button type="button" onClick={onReveal}>See explanation<ArrowRight size={15} /></button></div></div>}
        {draft.feedback === "correct" && <div className="sw-feedback sw-feedback-correct" role="status"><strong><CheckCircle2 size={18} />Correct</strong><p>{check.explanation}</p></div>}
        {draft.feedback === "revealed" && <div className="sw-feedback sw-feedback-revealed" role="status"><strong><BookOpen size={17} />Answer revealed</strong><p>{check.options.find(option => option.id === check.answerId)?.text} {check.explanation}</p></div>}
        <div className="sw-lesson-actions">
          {draft.feedback === "idle" ? <><button type="button" className="sw-check-button" onClick={onSubmit} disabled={!draft.selectedOptionId}>Check answer<Check size={16} /></button><button type="button" className="sw-reset-selection" onClick={onRetry} disabled={!draft.selectedOptionId}>Reset selection</button></> : draft.feedback === "incorrect" ? null : <button type="button" className="sw-continue-button" onClick={onContinue}>Continue<ArrowRight size={17} /></button>}
        </div>
      </>}
      {checksComplete && <>
        <div className="sw-completion-icon"><CheckCircle2 size={27} /></div>
        <p className="sw-eyebrow">Ready to save</p>
        <h1 ref={headingRef} tabIndex={-1}>{lesson.title}</h1>
        <p className="sw-completion-copy">Save this session to mark the {quizOnly ? "quiz" : "lesson"} complete. This records reviewed checks, not mastery.</p>
        <div className="sw-check-summary"><span><strong>{correctCount}</strong><small>Correct</small></span><span><strong>{revealedCount}</strong><small>Explanations opened</small></span><span><strong>{lesson.checks.length}</strong><small>Checks reviewed</small></span></div>
        {saveError && <p className="sw-save-error" role="alert">{saveError}</p>}
        <div className="sw-lesson-actions"><button type="button" className="sw-check-button" onClick={onFinish} disabled={saving}>{saving ? "Saving progress…" : "Save progress"}<Check size={17} /></button></div>
      </>}
    </article>
  </div>;
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
  const [recallAnswer, setRecallAnswer] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviews = useMemo(() => latestReviews(state.reviews), [state.reviews]);
  const cards = flashcards.filter(card => {
    const latest = reviews.get(card.id);
    const due = !latest || new Date(latest.dueAt).getTime() <= Date.now();
    return (topic === "All topics" || card.category === topic) && (!dueOnly || due);
  });
  const card = cards[cardIndex];
  const topics = Array.from(new Set(flashcards.map(item => item.category))).sort();

  async function review(rating: "again" | "good") {
    if (!card || saving || reviewSubmitting) return;
    setReviewError("");
    setReviewSubmitting(true);
    const now = new Date();
    try {
      const ok = await mutate("review", {
        cardId: card.id,
        rating,
        reviewedAt: now.toISOString(),
        dueAt: new Date(now.getTime() + (rating === "again" ? 10 * 60_000 : 24 * 60 * 60_000)).toISOString(),
      });
      if (!ok) {
        setReviewError("This review did not save. The card and your answer are still here so you can try again.");
        return;
      }
      setLastReviewedCard(card.id);
      setRevealed(false);
      setRecallAnswer("");
      setCardIndex(index => dueOnly || !cards.length ? index : (index + 1) % cards.length);
    } finally {
      setReviewSubmitting(false);
    }
  }

  function changeTopic(nextTopic: string) {
    setTopic(nextTopic);
    setCardIndex(0);
    setRevealed(false);
    setRecallAnswer("");
    setReviewError("");
  }

  function changeDueFilter(nextDueOnly: boolean) {
    setDueOnly(nextDueOnly);
    setCardIndex(0);
    setRevealed(false);
    setRecallAnswer("");
    setReviewError("");
  }

  return <div className="study-workspace sw-flashcards">
    <StudyTabs tab="Flashcards" setTab={setTab} dueCount={dueCount} />
    <header className="sw-catalog-heading sw-flashcard-heading"><div><h1>Review</h1></div><span className="sw-due-count"><strong>{dueCount}</strong><small>due now</small></span></header>
    <div className="sw-card-toolbar"><label>Topic<select value={topic} onChange={event => changeTopic(event.target.value)}>{["All topics", ...topics].map(item => <option key={item}>{item}</option>)}</select></label><div className="sw-filter-toggle" role="group" aria-label="Flashcard set"><button type="button" className={dueOnly ? "is-selected" : ""} aria-pressed={dueOnly} onClick={() => changeDueFilter(true)}>Due now</button><button type="button" className={!dueOnly ? "is-selected" : ""} aria-pressed={!dueOnly} onClick={() => changeDueFilter(false)}>All cards</button></div></div>
    {lastReviewedCard && reviews.get(lastReviewedCard) && <p className="sw-review-saved" role="status">Review saved. Next due {new Date(reviews.get(lastReviewedCard)!.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.</p>}
    {reviewError && <p className="sw-save-error" role="alert">{reviewError}</p>}
    {dueOnly && topic === "All topics" && dueCount === 0 && lastReviewedCard && reviews.has(lastReviewedCard) ? <BrandState kind="success" title="Reviews are caught up" description="You reviewed every card that was due. More cards will return when they are ready." compact /> : card ? <article className="sw-flashcard">
      <div className="sw-flashcard-meta"><span>{card.category}</span><span>{cardIndex + 1} of {cards.length} · {card.difficulty}</span></div>
      <h2>{card.question}</h2>
      <label className="sw-recall-field"><span>Your answer <small>(optional)</small></span><textarea value={recallAnswer} onChange={event => setRecallAnswer(event.target.value)} placeholder="A few words or steps, in your own words…" /></label>
      {revealed ? <div className="sw-flashcard-answer"><p className="sw-eyebrow">The idea</p><p>{card.answer}</p>{card.example && <div><strong>For example</strong><p>{card.example}</p></div>}</div> : <button type="button" className="sw-secondary-button" onClick={() => setRevealed(true)}>Reveal answer<ChevronRight size={16} /></button>}
      {revealed && <div className="sw-flashcard-actions"><span>How well did you recall it?</span><div><button type="button" className="sw-secondary-button" onClick={() => review("again")} disabled={saving || reviewSubmitting}><RotateCcw size={15} />Again</button><button type="button" className="sw-primary-button" onClick={() => review("good")} disabled={saving || reviewSubmitting}><Check size={16} />Got it</button></div></div>}
    </article> : <div className="sw-caught-up"><CheckCircle2 size={24} /><h2>No cards are due in this topic.</h2><p>Choose All cards to practice cards that are not due yet.</p><button type="button" className="sw-secondary-button" onClick={() => changeDueFilter(false)}>Show all cards<ArrowRight size={16} /></button></div>}
  </div>;
}

function latestReviews(reviews: WorkspaceState["reviews"]) {
  const ordered = [...reviews].sort((left, right) => left.reviewedAt.localeCompare(right.reviewedAt));
  return new Map(ordered.map(review => [review.cardId, review] as const));
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
