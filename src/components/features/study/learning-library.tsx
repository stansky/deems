"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Check, CheckCircle2, ChevronDown, Code2, FolderCode, ListChecks, Network, Route, Search, ShieldCheck } from "lucide-react";
import type { StudyCourse, StudyLesson } from "@/contracts/study";
import { courseDetails, learningTopics, type StudyPath } from "@/data/study-catalog";
import { cheatSheets, exercises } from "@/data/prep";
import { catalogItems, courseProgress, isInLearning, itemCourses, itemProgress, itemStarted, myLearning, nextCourseLesson, nextPathCourse, type LearningItem } from "@/lib/learning-catalog";
import { readStudyProgress } from "@/contracts/study";
import type { WorkspaceState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import "./learning-library.css";

const courseIcons = { blue: Network, purple: ShieldCheck, green: CheckCircle2, gold: Code2 };
export type SaveLearning = (kind: "course" | "path", id: string, saved: boolean, launch?: { lessonId: string; mode: "course" | "quiz" }) => Promise<boolean>;

function useLearningHeading(identity: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); ref.current?.focus({ preventScroll: true }); }, [identity]);
  return ref;
}

export function LearningCard({ entry, settings, onOpen, onToggle, saving = false }: { entry: LearningItem; settings: Record<string, string>; onOpen: () => void; onToggle?: () => void; saving?: boolean }) {
  const { item } = entry;
  const details = entry.kind === "course" ? courseDetails[item.id] : entry.item;
  const progress = itemProgress(entry, settings);
  const saved = isInLearning(entry, settings);
  const Icon = entry.kind === "path" ? Route : courseIcons[item.theme];
  const status = progress.done === progress.total ? "Completed" : progress.done ? `${progress.done} of ${progress.total} modules complete` : saved ? "Saved to My learning" : details.level;
  return <article className={`lc-card lc-theme-${item.theme} lc-kind-${entry.kind}`}>
    <button type="button" className="lc-card-open" onClick={onOpen} aria-label={`Open ${entry.kind === "path" ? "path" : "course"}: ${item.title}`}>
      <span className="lc-type-band"><span>{entry.kind === "path" ? "Learning path" : "Course"}</span><Icon size={19} /></span>
      <span className="lc-card-body"><span className="lc-topic">{details.topic}</span><h3 title={item.title}>{item.title}</h3><p>{item.description}</p>
        <span className="lc-card-metadata">{entry.kind === "path" ? `${entry.item.courseIds.length} courses` : `${progress.total} ${progress.total === 1 ? "module" : "modules"}`}<span>{details.level}</span></span>
        {(saved || progress.done > 0) && <span className="lc-card-progress"><progress value={progress.done} max={progress.total} aria-label={`${item.title}: ${progress.done} of ${progress.total} modules completed`} /><span>{status}</span></span>}
        <span className="lc-card-action">{saved ? progress.done === progress.total ? "Review" : itemStarted(entry, settings) ? "Continue" : "Start" : "Explore"}<ArrowRight size={16} /></span>
      </span>
    </button>
    {onToggle && <button type="button" className="lc-card-save" disabled={saving} onClick={onToggle} aria-label={`${saved ? "Remove" : "Add"} ${item.title} ${saved ? "from" : "to"} My learning`} aria-pressed={saved}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>}
  </article>;
}

export function LearningLibrary({ mine, state, saving, onSave, onOpenCourse, onOpenPath, onBrowse, onReview }: { mine: boolean; state: WorkspaceState; saving: boolean; onSave: SaveLearning; onOpenCourse: (id: string) => void; onOpenPath: (id: string) => void; onBrowse: () => void; onReview: () => void }) {
  const headingRef = useLearningHeading(mine ? "my-learning" : "browse");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All types");
  const [topic, setTopic] = useState("All topics");
  const [status, setStatus] = useState("All learning");
  const source = mine ? myLearning(state.settings) : catalogItems;
  const entries = source.filter(entry => {
    const details = entry.kind === "course" ? courseDetails[entry.item.id] : entry.item;
    const progress = itemProgress(entry, state.settings);
    const started = itemStarted(entry, state.settings);
    const matchesStatus = status === "All learning" || (status === "Completed" ? progress.done === progress.total : status === "In progress" ? progress.done < progress.total && started : !started);
    return (kind === "All types" || entry.kind === kind) && (topic === "All topics" || details.topic === topic) && matchesStatus && `${entry.item.title} ${entry.item.description} ${details.topic}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  function clearFilters() { setQuery(""); setKind("All types"); setTopic("All topics"); setStatus("All learning"); }
  return <div className="learning-library">
    <header className="lc-page-heading"><h1 ref={headingRef} tabIndex={-1}>{mine ? "My learning" : "Browse"}</h1><Button className="lc-action lc-action-outline" variant="learning-outline" onClick={mine ? onBrowse : onReview}>{mine ? "Browse learning" : "Spaced review"}<ArrowRight size={16} /></Button></header>
    {source.length > 0 && <div className="lc-toolbar">
      <label className="lc-search"><Search size={18} /><input aria-label={mine ? "Search My learning" : "Search learning catalog"} value={query} onChange={event => setQuery(event.target.value)} placeholder={mine ? "Search your learning" : "Find a course or path"} /></label>
      <label className="lc-select"><span>Type</span><select aria-label="Filter learning type" value={kind} onChange={event => setKind(event.target.value)}><option>All types</option><option value="path">Learning paths</option><option value="course">Courses</option></select></label>
      <label className="lc-select"><span>{mine ? "Status" : "Topic"}</span>{mine ? <select aria-label="Filter learning status" value={status} onChange={event => setStatus(event.target.value)}>{["All learning", "Saved", "In progress", "Completed"].map(value => <option key={value}>{value}</option>)}</select> : <select aria-label="Filter learning topic" value={topic} onChange={event => setTopic(event.target.value)}><option>All topics</option>{learningTopics.map(value => <option key={value}>{value}</option>)}</select>}</label>
    </div>}
    {source.length > 0 && <p className="lc-result-count" role="status">{entries.length} {entries.length === 1 ? "result" : "results"}</p>}
    {entries.length ? <div className="lc-card-grid">{entries.map(entry => <LearningCard key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={state.settings} saving={saving} onOpen={() => entry.kind === "course" ? onOpenCourse(entry.item.id) : onOpenPath(entry.item.id)} onToggle={() => void onSave(entry.kind, entry.item.id, !isInLearning(entry, state.settings))} />)}</div> : <div className="lc-empty"><span className="lc-empty-icon">{source.length ? <Search size={26} /> : <Bookmark size={26} />}</span><div><h2>{source.length ? "No matches" : "Make this space yours"}</h2><p>{source.length ? "Try another search or clear your filters." : "Save a course or path, or start a module. Your learning will be here when you return."}</p></div>{source.length > 0 && <Button variant="learning-outline" className="lc-action lc-action-outline" onClick={clearFilters}>Clear filters<ArrowRight size={16} /></Button>}</div>}
  </div>;
}

function SelectionButton({ saved, saving, onClick }: { saved: boolean; saving: boolean; onClick: () => void }) {
  return <Button variant="learning-outline" className="lc-action lc-action-outline" disabled={saving} onClick={onClick} aria-pressed={saved} title={saved ? "Remove from My learning" : "Add to My learning"}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? "In My learning" : "Add to My learning"}</Button>;
}

export function PathOverview({ path, state, saving, onSave, onCourse, onBack }: { path: StudyPath; state: WorkspaceState; saving: boolean; onSave: SaveLearning; onCourse: (id: string) => void; onBack: () => void }) {
  const headingRef = useLearningHeading(path.id);
  const entry: LearningItem = { kind: "path", item: path };
  const courses = itemCourses(entry);
  const progress = itemProgress(entry, state.settings);
  const next = nextPathCourse(path, state.settings);
  const saved = isInLearning(entry, state.settings);
  return <div className={`learning-library lc-detail lc-theme-${path.theme}`}>
    <button className="lc-back" type="button" onClick={onBack}><ArrowLeft size={16} />Browse</button>
    <header className="lc-detail-heading lc-path-heading"><div><p className="lc-eyebrow"><Route size={17} />Learning path</p><h1 ref={headingRef} tabIndex={-1}>{path.title}</h1><p>{path.description}</p><div className="lc-detail-meta"><span>{courses.length} courses</span><span>{progress.total} modules</span><span>{path.level}</span></div></div><Route className="lc-path-mark" size={92} strokeWidth={1.2} /></header>
    <div className="lc-detail-actions"><SelectionButton saved={saved} saving={saving} onClick={() => void onSave("path", path.id, !saved)} />{next && <Button variant="learning" className="lc-action" onClick={() => onCourse(next.id)}>{progress.done === progress.total ? "Review path" : saved || progress.done > 0 ? "Continue path" : "Explore first course"}<ArrowRight size={16} /></Button>}</div>
    <div className="lc-detail-grid"><section className="lc-curriculum" aria-labelledby="lc-path-curriculum"><div className="lc-section-title"><h2 id="lc-path-curriculum">Your route</h2><span>{progress.done} of {progress.total} modules complete</span></div><ol className="lc-course-sequence">{courses.map((course, index) => {
      const done = courseProgress(course, state.settings);
      return <li key={course.id}><button type="button" onClick={() => onCourse(course.id)}><span className={`lc-number ${done === course.lessons.length ? "lc-number-complete" : ""}`}>{done === course.lessons.length ? <Check size={18} /> : index + 1}</span><span><small>Course {index + 1}</small><h3>{course.title}</h3><p>{course.description}</p><span className="lc-sequence-meta">{done} of {course.lessons.length} modules complete{next?.id === course.id && done < course.lessons.length ? " · Up next" : ""}</span></span><ArrowRight size={18} /></button></li>;
    })}</ol></section><aside className="lc-outcomes"><h2>What you’ll work on</h2><ul>{path.outcomes.map(outcome => <li key={outcome}><CheckCircle2 size={17} />{outcome}</li>)}</ul><div className="lc-detail-progress"><progress value={progress.done} max={progress.total} aria-label="Path module completion" /><span>{progress.done} of {progress.total} modules complete</span></div></aside></div>
  </div>;
}

export function CourseOverview({ course, state, saving, hasDraft, onSave, onLesson, onGuide, onPractice, onBack, backLabel }: { course: StudyCourse; state: WorkspaceState; saving: boolean; hasDraft: (id: string) => boolean; onSave: SaveLearning; onLesson: (lesson: StudyLesson, quiz?: boolean) => void; onGuide: (id: string) => void; onPractice: (id: string) => void; onBack: () => void; backLabel: string }) {
  const headingRef = useLearningHeading(course.id);
  const details = courseDetails[course.id];
  const done = courseProgress(course, state.settings);
  const saved = isInLearning({ kind: "course", item: course }, state.settings);
  const next = nextCourseLesson(course, state.settings);
  const practice = details.practiceIds.flatMap(id => exercises.find(exercise => exercise.id === id) ?? []);
  const Icon = courseIcons[course.theme];
  return <div className={`learning-library lc-detail lc-theme-${course.theme}`}>
    <button type="button" className="lc-back" onClick={onBack}><ArrowLeft size={16} />{backLabel}</button>
    <header className="lc-detail-heading lc-course-heading"><div><p className="lc-eyebrow"><BookOpen size={17} />Course</p><h1 ref={headingRef} tabIndex={-1}>{course.title}</h1><p>{course.description}</p><div className="lc-detail-meta"><span>{details.topic}</span><span>{details.level}</span><span>{course.lessons.length} {course.lessons.length === 1 ? "module" : "modules"}</span></div></div><Icon className="lc-path-mark" size={82} strokeWidth={1.3} /></header>
    <div className="lc-detail-actions"><SelectionButton saved={saved} saving={saving} onClick={() => void onSave("course", course.id, !saved)} /><Button variant="learning" disabled={saving} className="lc-action" onClick={() => onLesson(next.lesson, next.mode === "quiz")}>{done === course.lessons.length ? "Review course" : saved || done > 0 || hasDraft(next.lesson.id) ? "Continue learning" : "Start learning"}<ArrowRight size={16} /></Button></div>
    <div className="lc-detail-grid"><section className="lc-curriculum" aria-labelledby="lc-course-curriculum"><div className="lc-section-title"><h2 id="lc-course-curriculum">Course syllabus</h2><span>{done} of {course.lessons.length} complete</span></div>
      <div className="lc-module-list">{course.lessons.map((lesson, index) => {
        const completed = readStudyProgress(state.settings, lesson.id)?.courseId === course.id;
        const current = !completed && lesson.id === next.lesson.id;
        const guide = cheatSheets.find(item => item.id === lesson.guideId);
        return <details key={lesson.id} className={`lc-module ${current ? "lc-module-current" : ""}`} open={current || course.lessons.length === 1}>
          <summary><span className={`lc-number ${completed ? "lc-number-complete" : ""}`}>{completed ? <Check size={18} /> : index + 1}</span><span><small>Module {index + 1}</small><h3>{lesson.title}</h3><span className="lc-module-status">{completed ? "Completed" : hasDraft(lesson.id) ? "In progress" : current ? "Up next" : "Not started"}</span></span><ChevronDown size={18} /></summary>
          <div className="lc-module-body"><p>{lesson.description}</p><div className="lc-activity-list"><button type="button" disabled={saving} onClick={() => onLesson(lesson)}><BookOpen size={19} /><span><strong>Lesson</strong><small>{guide?.sections.length ?? 0} reading sections</small></span><ArrowRight size={16} /></button><button type="button" disabled={saving} onClick={() => onLesson(lesson, true)}><ListChecks size={19} /><span><strong>Knowledge check</strong><small>{lesson.checks.length} {lesson.checks.length === 1 ? "question" : "questions"}</small></span><ArrowRight size={16} /></button></div><button className="lc-text-action" type="button" onClick={() => onGuide(lesson.guideId)}>Open reference guide<ArrowRight size={14} /></button></div>
        </details>;
      })}</div>
      {practice.length > 0 && <section className="lc-practice-projects" aria-labelledby="lc-practice-projects"><div className="lc-section-title"><h2 id="lc-practice-projects">Put it into practice</h2></div><p className="lc-deliverable">{details.deliverable}</p><div className="lc-project-grid">{practice.map(exercise => {
        const sessions = state.sessions.filter(session => session.exerciseId === exercise.id).length;
        return <article key={exercise.id}><span className="lc-eyebrow"><FolderCode size={17} />Practice project</span><h3>{exercise.title}</h3><p>{exercise.requirements[0]}</p><small>{exercise.duration}-minute suggested session{sessions ? ` · ${sessions} saved ${sessions === 1 ? "session" : "sessions"}` : ""}</small><button className="lc-text-action" type="button" onClick={() => onPractice(exercise.id)}>Open workspace<ArrowRight size={15} /></button></article>;
      })}</div></section>}
    </section><aside className="lc-outcomes"><h2>What you’ll work on</h2><ul>{details.outcomes.map(outcome => <li key={outcome}><CheckCircle2 size={17} />{outcome}</li>)}</ul><div className="lc-detail-progress"><progress value={done} max={course.lessons.length} aria-label="Course module completion" /><span>{done} of {course.lessons.length} modules complete</span><p>Complete a module’s knowledge checks to save its progress.</p></div></aside></div>
  </div>;
}
