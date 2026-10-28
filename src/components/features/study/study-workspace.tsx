"use client";

import { workspaceSessionStorage } from "@/components/workspace-client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  Circle, ExternalLink, Layers3, ListChecks, Printer, RotateCcw, Search, X,
} from "lucide-react";
import { cheatSheets, flashcards } from "@/data/prep";
import { studyCourses } from "@/data/study-courses";
import {
  readStudyProgress, studyProgressKey, studyProgressSchema,
  studyCheckResultSchema, type StudyCheckResult, type StudyCourse, type StudyLesson, type StudyProgress, type StudyTab,
} from "@/contracts/study";
import type { WorkspaceState } from "@/lib/types";
import type { CommandMeta } from "@/domains/career/contracts";
import "./study-workspace.css";
import "./study-night.css";
import { BrandState } from "@/components/brand";

type Props = {
  state: WorkspaceState;
  tab: StudyTab;
  setTab: (tab: StudyTab) => void;
  selected: string;
  setSelected: (id: string) => void;
  mutate: (action: string, data: unknown, meta?: CommandMeta) => Promise<boolean>;
  saving: boolean;
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
const routeStorageKey = "interview-study-course-route-v1";
const themeLabels: Record<StudyCourse["theme"], string> = {
  blue: "Systems",
  purple: "Security",
  green: "Evaluation",
  gold: "Coding",
};

export default function StudyWorkspace({ state, tab, setTab, selected, setSelected, mutate, saving }: Props) {
  const [openCourseId, setOpenCourseId] = useState("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const [lessonLaunchMode, setLessonLaunchMode] = useState<"course" | "quiz">("course");
  const [routeReady, setRouteReady] = useState(false);
  const [draft, setDraft] = useState<LessonDraft>(blankDraft);
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
  const activeLesson = currentCourse?.lessons.find(lesson => lesson.id === activeLessonId);
  const progressByLesson = useMemo(
    () => new Map(studyCourses.flatMap(course => course.lessons.map(lesson => [lesson.id, readStudyProgress(state.settings, lesson.id)] as const))),
    [state.settings],
  );
  const reviewsByCard = useMemo(() => latestReviews(state.reviews), [state.reviews]);
  const completedLessons = Array.from(progressByLesson.values()).filter(Boolean).length;
  const totalLessons = studyCourses.reduce((total, course) => total + course.lessons.length, 0);
  const progressPercent = totalLessons ? (completedLessons / totalLessons) * 100 : 0;
  const dueCount = flashcards.filter(card => {
    const latest = reviewsByCard.get(card.id);
    return !latest || new Date(latest.dueAt).getTime() <= Date.now();
  }).length;

  useEffect(() => {
    try {
      const saved = workspaceSessionStorage.getItem(routeStorageKey);
      const route: unknown = saved ? JSON.parse(saved) : null;
      if (route && typeof route === "object") {
        const { courseId, lessonId } = route as { courseId?: unknown; lessonId?: unknown };
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
      if (!openCourseId) {
        workspaceSessionStorage.removeItem(routeStorageKey);
      } else {
        workspaceSessionStorage.setItem(routeStorageKey, JSON.stringify({ courseId: openCourseId, lessonId: activeLessonId || null, mode: activeLessonId ? lessonLaunchMode : "course" }));
      }
    } catch {
      // Course navigation remains usable without session storage.
    }
  }, [routeReady, openCourseId, activeLessonId, lessonLaunchMode]);

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
    } catch {
      // Keep the lesson usable if this browser cannot store a same-tab draft.
    }
  }, [activeLessonId, draft, draftReadyFor, lessonLaunchMode]);

  useEffect(() => {
    if (tab === "Guides" || !activeLessonId) requestAnimationFrame(() => headingRef.current?.focus());
  }, [tab, selected, openCourseId, activeLessonId]);

  function openLesson(course: StudyCourse, lesson: StudyLesson, startWithQuiz = false) {
    setOpenCourseId(course.id);
    setActiveLessonId(lesson.id);
    setLessonLaunchMode(startWithQuiz ? "quiz" : "course");
    const guide = cheatSheets.find(item => item.id === lesson.guideId);
    const readingEnd = Math.max(0, (guide?.sections.length ?? 1) - 1);
    setDraft({ ...blankDraft(course.id, lesson.id), quizOnly: startWithQuiz, ...(startWithQuiz ? { sectionIndex: readingEnd, inChecks: true } : {}) });
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
      try { workspaceSessionStorage.removeItem(draftStorageKey(activeLesson.id, lessonLaunchMode)); } catch { /* Saved server state remains authoritative. */ }
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

  if (tab === "Courses" && currentCourse) {
    const courseProgress = currentCourse.lessons.filter(lesson => progressByLesson.get(lesson.id)).length;
    const nextLesson = currentCourse.lessons.find(lesson => !progressByLesson.get(lesson.id));
    return <div className="study-workspace">
      <StudyTabs tab={tab} setTab={setTab} dueCount={dueCount} />
      <button type="button" className="sw-back-link" onClick={() => { setOpenCourseId(""); setActiveLessonId(""); }}><ArrowLeft size={16} />All courses</button>
      <div className="sw-course-layout">
        <div className="sw-course-overview">
          <div className={`sw-course-art sw-theme-${currentCourse.theme}`} style={courseArt(currentCourse.illustration)} role="img" aria-label={`${themeLabels[currentCourse.theme]} course illustration`} />
          <div className="sw-course-copy">
            <p className="sw-eyebrow">{themeLabels[currentCourse.theme]} course</p>
            <h1 ref={headingRef} tabIndex={-1}>{currentCourse.title}</h1>
            <p>{currentCourse.description}</p>
            <p className="sw-progress-copy"><CheckCircle2 size={16} />{courseProgress} of {currentCourse.lessons.length} {courseCountLabel(currentCourse.lessons.length)} reviewed</p>
          </div>
        </div>
        <section className="sw-lesson-path" aria-labelledby="sw-path-title">
          <div className="sw-section-heading"><div><p className="sw-eyebrow">Course path</p><h2 id="sw-path-title">{currentCourse.lessons.length} {courseCountLabel(currentCourse.lessons.length)}</h2></div><span>{courseProgress} reviewed</span></div>
          <ol className="sw-map-nodes">{currentCourse.lessons.map((lesson, index) => {
            const progress = progressByLesson.get(lesson.id);
            const guide = cheatSheets.find(item => item.id === lesson.guideId);
            const status = progress ? "complete" : nextLesson?.id === lesson.id ? "current" : "upcoming";
            return <li key={lesson.id} className={`sw-map-item is-${status}`}>
              <button type="button" className="sw-map-node" onClick={() => openLesson(currentCourse, lesson)} aria-current={status === "current" ? "step" : undefined} aria-label={`${status === "complete" ? "Review completed" : status === "current" ? "Continue" : "Start"} lesson ${index + 1}: ${lesson.title}`}>
                <span className="sw-map-diamond"><span>{status === "complete" ? <Check size={23} /> : status === "current" ? <BookOpen size={22} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</span></span>
                <span className="sw-map-label"><strong>{lesson.title}</strong><small>{guide?.category ?? "Study guide"} · {lesson.checks.length} checks</small></span>
              </button>
              {index < currentCourse.lessons.length - 1 && <span className="sw-map-connector" aria-hidden="true" />}
            </li>;
          })}</ol>
          {nextLesson && <button type="button" className="sw-path-continue" onClick={() => openLesson(currentCourse, nextLesson)}>Continue course<ArrowRight size={17} /></button>}
        </section>
      </div>
    </div>;
  }

  return <div className="study-workspace">
    <StudyTabs tab={tab} setTab={setTab} dueCount={dueCount} />
    <header className="sw-catalog-heading">
      <div><h1 ref={headingRef} tabIndex={-1}>Courses</h1><p>Choose a path and work through its lessons at your own pace.</p></div>
      <button type="button" className="sw-review-nudge" onClick={() => setTab("Flashcards")}><span className="sw-review-icon"><Layers3 size={18} /></span><span><strong>{dueCount ? `${dueCount} cards due` : "Reviews are caught up"}</strong><small>{dueCount ? "Open spaced review" : "Check your saved cards"}</small></span><ArrowRight size={16} /></button>
    </header>
    <section className="sw-catalog" aria-label="Study courses">
      <div className="sw-progress-overview"><div><p className="sw-eyebrow">Your progress</p><strong>{completedLessons} of {totalLessons} lessons reviewed</strong></div><span className="sw-overall-progress" role="progressbar" aria-label="Lessons reviewed" aria-valuemin={0} aria-valuemax={totalLessons} aria-valuenow={completedLessons}><span style={{ width: `${progressPercent}%` }} /></span></div>
      <div className="sw-section-heading"><div><p className="sw-eyebrow">Learning paths</p><h2>Choose a course</h2></div></div>
      <div className="sw-course-grid">{studyCourses.map(course => {
        const done = course.lessons.filter(lesson => progressByLesson.get(lesson.id)).length;
        const percent = course.lessons.length ? (done / course.lessons.length) * 100 : 0;
        return <article key={course.id} className={`sw-course-tile sw-theme-${course.theme}`}>
          <div className="sw-tile-art" style={courseArt(course.illustration)} role="img" aria-label={`${themeLabels[course.theme]} course illustration`} />
          <div className="sw-tile-copy"><span className="sw-tile-topic">{themeLabels[course.theme]}</span><h3>{course.title}</h3><span className="sw-tile-description">{course.description}</span>
            <span className="sw-tile-count">{course.lessons.length} {courseCountLabel(course.lessons.length)}</span>
            <span className="sw-tile-progress" role="progressbar" aria-label={`${course.title} progress`} aria-valuemin={0} aria-valuemax={course.lessons.length} aria-valuenow={done}><span style={{ width: `${percent}%` }} /></span>
            <span className="sw-tile-footer"><span>{done} of {course.lessons.length} reviewed</span></span>
            <button type="button" className="sw-course-continue" onClick={() => setOpenCourseId(course.id)}>{done ? done === course.lessons.length ? "Review course" : "Continue course" : "Start course"}<ArrowRight size={17} /></button>
          </div>
        </article>;
      })}</div>
    </section>
  </div>;
}

function StudyTabs({ tab, setTab, dueCount }: { tab: StudyTab; setTab: (tab: StudyTab) => void; dueCount: number }) {
  return <nav className="sw-tabs" aria-label="Study formats">
    {(["Courses", "Quizzes", "Guides", "Flashcards"] as const).map(item => <button type="button" key={item} className={tab === item ? "is-selected" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>
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
    <header className="sw-quiz-heading"><div><h1>Quizzes</h1><p>Check your understanding of one lesson at a time.</p></div></header>
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
      <div className="sw-quiz-hub-actions">{course && <button type="button" className="sw-quiz-path-link" onClick={() => onOpenCourse(course)}>View course path<ArrowRight size={16} /></button>}{course && lesson && <button type="button" className="sw-primary-button" onClick={() => onStart(course)}>Start quiz<ArrowRight size={17} /></button>}</div>
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
    <div className="sw-lesson-topline"><button type="button" className="sw-close-lesson" onClick={onBack} aria-label="Close lesson"><X size={20} /><span>Close lesson</span></button><span>{quizOnly ? "Question" : "Step"} {Math.min(currentStep, totalSteps)} of {totalSteps}</span></div>
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
        <fieldset className="sw-answer-options" disabled={draft.feedback !== "idle"}>
          <legend>Choose one answer</legend>
          {check.options.map(option => <label key={option.id} className={`sw-answer-option ${draft.selectedOptionId === option.id ? "is-selected" : ""} ${draft.feedback === "correct" && option.id === check.answerId ? "is-correct" : ""}`}>
            <input type="radio" name={`study-check-${check.id}`} value={option.id} checked={draft.selectedOptionId === option.id} onChange={() => setDraft(current => ({ ...current, selectedOptionId: option.id }))} />
            <span>{option.text}</span>
          </label>)}
        </fieldset>
        {draft.feedback === "incorrect" && <div className="sw-feedback sw-feedback-incorrect" role="status"><strong>Not quite. Try another answer, or review the explanation.</strong><div><button type="button" onClick={onRetry}><RotateCcw size={15} />Try again</button><button type="button" onClick={onReveal}>See explanation<ArrowRight size={15} /></button></div></div>}
        {draft.feedback === "correct" && <div className="sw-feedback sw-feedback-correct" role="status"><strong><CheckCircle2 size={18} />That answer fits.</strong><p>{check.explanation}</p></div>}
        {draft.feedback === "revealed" && <div className="sw-feedback sw-feedback-revealed" role="status"><strong>The answer is {check.options.find(option => option.id === check.answerId)?.text}</strong><p>{check.explanation}</p></div>}
        <div className="sw-lesson-actions">
          {draft.feedback === "idle" ? <><button type="button" className="sw-check-button" onClick={onSubmit} disabled={!draft.selectedOptionId}>Check<Check size={16} /></button><button type="button" className="sw-reset-selection" onClick={onRetry} disabled={!draft.selectedOptionId}>Reset selection</button></> : draft.feedback === "incorrect" ? null : <button type="button" className="sw-continue-button" onClick={onContinue}>Continue<ArrowRight size={17} /></button>}
        </div>
      </>}
      {checksComplete && <>
        <div className="sw-completion-icon"><CheckCircle2 size={27} /></div>
        <p className="sw-eyebrow">{quizOnly ? "Quiz complete" : "Lesson complete"}</p>
        <h1 ref={headingRef} tabIndex={-1}>{quizOnly ? `You finished ${lesson.title}` : `You worked through ${lesson.title}`}</h1>
        <p className="sw-completion-copy">{correctCount} answered correctly · {revealedCount} {revealedCount === 1 ? "explanation opened" : "explanations opened"}. This records reviewed checks, not mastery.</p>
        <div className="sw-check-summary"><span><strong>{correctCount}</strong><small>Correct</small></span><span><strong>{revealedCount}</strong><small>Explanations opened</small></span><span><strong>{lesson.checks.length}</strong><small>Checks reviewed</small></span></div>
        {saveError && <p className="sw-save-error" role="alert">{saveError}</p>}
        <div className="sw-lesson-actions"><button type="button" className="sw-check-button" onClick={onFinish} disabled={saving}>{saving ? "Saving progress…" : quizOnly ? "Save quiz progress" : "Finish lesson"}<Check size={17} /></button></div>
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

function courseArt(index: number) {
  const pose = ["presenting", "research", "notes", "coding"][index] ?? "coding";
  return { backgroundImage: `url("/brand/pose-${pose}.svg")`, backgroundPosition: "center", backgroundSize: "contain" };
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
