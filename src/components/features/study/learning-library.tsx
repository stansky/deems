"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Check, CheckCircle2, ChevronDown, Code2, FolderCode, ListChecks, Network, Route, Search, ShieldCheck } from "lucide-react";
import type { StudyCourse, StudyLesson } from "@/contracts/study";
import { courseDetails, learningTopics, type StudyPath } from "@/data/study-catalog";
import { cheatSheets, exercises } from "@/data/prep";
import { catalogItems, courseProgress, isInLearning, itemCourses, itemProgress, itemStarted, myLearning, nextCourseLesson, nextLearning, nextPathCourse, type LearningItem } from "@/lib/learning-catalog";
import { readStudyProgress } from "@/contracts/study";
import type { WorkspaceState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui";
import "./learning-library.css";

const courseIcons = { blue: Network, purple: ShieldCheck, green: CheckCircle2, gold: Code2 };
export type SaveLearning = (kind: "course" | "path", id: string, saved: boolean, launch?: { lessonId: string; mode: "course" | "quiz" }) => Promise<boolean>;

function useLearningHeading(identity: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); ref.current?.focus({ preventScroll: true }); }, [identity]);
  return ref;
}

export function LearningCard({ entry, settings, onOpen, onToggle, saving = false, compact = false }: { compact?: boolean; entry: LearningItem; settings: Record<string, string>; onOpen: () => void; onToggle?: () => void; saving?: boolean }) {
  const { item } = entry;
  const details = entry.kind === "course" ? courseDetails[item.id] : entry.item;
  const progress = itemProgress(entry, settings);
  const saved = isInLearning(entry, settings);
  const Icon = entry.kind === "path" ? item.theme === "blue" ? FolderCode : Route : courseIcons[item.theme];
  const status = progress.done === progress.total ? "Completed" : progress.done ? `${progress.done} of ${progress.total} modules complete` : saved ? "Saved to My learning" : details.level;
  const nextCourse = entry.kind === "course" ? entry.item : nextPathCourse(entry.item, settings);
  const next = nextCourse && nextCourseLesson(nextCourse, settings);
  return <article className={`lc-card lc-theme-${item.theme} lc-kind-${entry.kind}${compact ? " lc-card-compact" : ""}`}>
    <button type="button" className="lc-card-open" onClick={onOpen} aria-label={`Open ${entry.kind === "path" ? "path" : "course"}: ${item.title}`}>
      <span className="lc-cover"><span className="lc-type-band">{entry.kind === "path" ? "Learning path" : "Course"}</span><Icon className="lc-cover-icon" size={68} strokeWidth={1.5} /></span>
      <span className="lc-card-body"><span className="lc-topic">{details.topic}</span><h3 title={item.title}>{item.title}</h3><p>{item.description}</p>
        <span className="lc-card-metadata">{entry.kind === "path" ? `${entry.item.courseIds.length} courses` : `${progress.total} ${progress.total === 1 ? "module" : "modules"}`}<span>{details.level}</span></span>
        {(saved || progress.done > 0) && <span className="lc-card-progress"><progress value={progress.done} max={progress.total} aria-label={`${item.title}: ${progress.done} of ${progress.total} modules completed`} /><span>{status}</span></span>}
        {saved && next && progress.done < progress.total && <span className="lc-card-next"><strong>Up next</strong>{next.lesson.title}</span>}
        {saved && <span className="lc-card-action">{progress.done === progress.total ? "Review" : saved ? itemStarted(entry, settings) ? "Continue" : "Start" : "View curriculum"}<ArrowRight size={16} /></span>}
      </span>
    </button>
    {onToggle && <button type="button" className="lc-card-save" disabled={saving} onClick={onToggle} aria-label={`${saved ? "Remove" : "Add"} ${item.title} ${saved ? "from" : "to"} My learning`} aria-pressed={saved}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>}
  </article>;
}

type LearningCollectionProps = { entries: LearningItem[]; settings: Record<string, string>; onOpenCourse: (id: string) => void; onOpenPath: (id: string) => void; saving?: boolean; onSave?: SaveLearning; suggestions?: boolean; limit?: number };

export function LearningCollection({ entries, settings, onOpenCourse, onOpenPath, saving, onSave, suggestions = true, limit }: LearningCollectionProps) {
  const active = entries.filter(entry => { const progress = itemProgress(entry, settings); return progress.done < progress.total; });
  const completed = entries.filter(entry => { const progress = itemProgress(entry, settings); return progress.done === progress.total; });
  function cards(items: LearningItem[]) { return <div className="lc-shelf-grid">{items.slice(0, limit).map(entry => <LearningCard key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={settings} saving={saving} onOpen={() => entry.kind === "course" ? onOpenCourse(entry.item.id) : onOpenPath(entry.item.id)} onToggle={onSave ? () => void onSave(entry.kind, entry.item.id, !isInLearning(entry, settings)) : undefined} />)}</div>; }
  const paired = active.filter(entry => entry.kind === "course").length === 1 && active.filter(entry => entry.kind === "path").length === 1;
  return <div className="lc-learning-collection"><div className={`lc-learning-shelves ${paired ? "lc-learning-shelves-paired" : ""}`}>{(["course", "path"] as const).map(kind => {
    const items = active.filter(entry => entry.kind === kind);
    if (!items.length && !suggestions) return null;
    const suggested = kind === "course" ? catalogItems.filter(entry => entry.kind === "course" && ["coding-reasoning", "reliable-systems"].includes(entry.item.id) && !isInLearning(entry, settings)).reverse() : catalogItems.filter(entry => entry.kind === "path" && !isInLearning(entry, settings));
    return <section key={kind} className="lc-learning-shelf" aria-label={kind === "course" ? "Active courses" : "Learning paths"}><header><h3>{kind === "course" ? "Active courses" : "Learning paths"}</h3><span>{items.length}</span></header>{items.length ? cards(items) : suggestions && suggested.length ? <><p className="lc-shelf-empty">{kind === "course" ? "No active courses. Start with one of these." : "No path selected. Build a sequence with one of these."}</p>{cards(suggested.slice(0, 2))}</> : <p className="lc-shelf-empty">{completed.some(entry => entry.kind === kind) ? "All selected learning is complete." : "Nothing here yet."}</p>}</section>;
  })}</div>{completed.length > 0 && <details className="lc-completed-learning"><summary><CheckCircle2 size={18} />Completed learning<span>{completed.length}</span><ChevronDown size={16} /></summary>{cards(completed)}</details>}</div>;
}

export function NextLearningStep({ course, lesson, mode, started, settings, onOpen }: { course: StudyCourse; lesson: StudyLesson; mode: "course" | "quiz"; started: boolean; settings: Record<string, string>; onOpen: () => void }) {
  const done = courseProgress(course, settings);
  return <div className="lc-next-step"><span className="lc-next-number">{course.lessons.findIndex(item => item.id === lesson.id) + 1}<small>/{course.lessons.length}</small></span><div><span className="lc-eyebrow">{started ? "Continue where you left off" : "Your next step"}</span><h3>{lesson.title}</h3><p>{course.title} · {done} of {course.lessons.length} complete{mode === "quiz" ? " · Knowledge check" : ""}</p></div><Button variant="learning" className="lc-action" onClick={onOpen}>{started ? "Continue" : "Start module"}<ArrowRight size={16} /></Button></div>;
}

export function LearningLibrary({ mine, state, saving, onSave, onOpenCourse, onOpenPath, onBrowse, onReview, onCareer, onResume }: { mine: boolean; state: WorkspaceState; saving: boolean; onSave: SaveLearning; onOpenCourse: (id: string) => void; onOpenPath: (id: string) => void; onBrowse: () => void; onReview: () => void; onCareer: (companyId?: string, roleId?: string) => void; onResume: (courseId: string, lessonId: string, mode: "course" | "quiz") => void }) {
  const headingRef = useLearningHeading(mine ? "my-learning" : "browse");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All types");
  const [topic, setTopic] = useState("All topics");
  const [status, setStatus] = useState("All learning");
  const source = mine ? myLearning(state.settings) : catalogItems;
  const next = mine ? nextLearning(state.settings) : null;
  const entries = source.filter(entry => {
    const details = entry.kind === "course" ? courseDetails[entry.item.id] : entry.item;
    const progress = itemProgress(entry, state.settings);
    const started = itemStarted(entry, state.settings);
    const matchesStatus = status === "All learning" || (status === "Completed" ? progress.done === progress.total : status === "In progress" ? progress.done < progress.total && started : progress.done === 0 && !started);
    return (kind === "All types" || entry.kind === kind) && (topic === "All topics" || details.topic === topic) && matchesStatus && `${entry.item.title} ${entry.item.description} ${details.topic}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  function clearFilters() { setQuery(""); setKind("All types"); setTopic("All topics"); setStatus("All learning"); }
  return <div className="learning-library">
    <PageHeader title={mine ? "My learning" : "Browse"} headingRef={headingRef} actions={mine && source.length > 0 && <Button className="lc-action lc-action-outline" variant="learning-outline" onClick={onBrowse}>Browse courses<ArrowRight size={16} /></Button>} />
    {next && status !== "Completed" && status !== "Saved" && <NextLearningStep {...next} settings={state.settings} onOpen={() => onResume(next.course.id, next.lesson.id, next.mode)} />}
    {source.length > 0 && <div className="lc-toolbar">
      <label className="lc-search"><Search size={18} /><input aria-label={mine ? "Search My learning" : "Search learning catalog"} value={query} onChange={event => setQuery(event.target.value)} placeholder={mine ? "Search your learning" : "Find a course or path"} /></label>
      <label className="lc-select"><span>Type</span><select aria-label="Filter learning type" value={kind} onChange={event => setKind(event.target.value)}><option>All types</option><option value="path">Learning paths</option><option value="course">Courses</option></select></label>
      {!mine && <label className="lc-select"><span>Topic</span><select aria-label="Filter learning topic" value={topic} onChange={event => setTopic(event.target.value)}><option>All topics</option>{learningTopics.map(value => <option key={value}>{value}</option>)}</select></label>}
    </div>}
    {mine && source.length > 0 && <div className="lc-status-tabs" role="group" aria-label="Filter My learning by status">{["All learning", "In progress", "Saved", "Completed"].map(value => <button type="button" key={value} className={status === value ? "is-selected" : ""} aria-pressed={status === value} onClick={() => setStatus(value)}>{value}</button>)}</div>}
    {source.length > 0 && (query.trim() || kind !== "All types" || topic !== "All topics" || status !== "All learning") && <p className="lc-result-count" role="status">{entries.length} {entries.length === 1 ? "result" : "results"}</p>}
    {mine && source.length === 0 ? <><div className="lc-empty"><span className="lc-empty-icon"><BookOpen size={26} /></span><div><h2>Nothing saved yet</h2><p>Choose a course or path to get started.</p></div><Button variant="learning" className="lc-action" onClick={onBrowse}>Browse courses<ArrowRight size={16} /></Button></div>
<section className="lc-empty-suggestions" aria-label="Suggested courses"><header className="lc-catalog-group-heading"><h2>Suggested courses</h2></header><div className="lc-card-grid">{catalogItems.filter(entry => entry.kind === "course" && ["coding-reasoning", "reliable-systems"].includes(entry.item.id)).map(entry => <LearningCard compact key={entry.item.id} entry={entry} settings={state.settings} onOpen={() => onOpenCourse(entry.item.id)} />)}</div></section></> : mine && !query.trim() && kind === "All types" && status === "All learning" ? <LearningCollection entries={entries} settings={state.settings} saving={saving} onSave={onSave} onOpenCourse={onOpenCourse} onOpenPath={onOpenPath} suggestions={false} /> : entries.length ? <div className="lc-catalog-groups">{(["path", "course"] as const).map(group => { const items = entries.filter(entry => entry.kind === group); return items.length > 0 && <section key={group}><header className="lc-catalog-group-heading"><div><h2>{group === "path" ? "Learning paths" : "Courses"} <small>{items.length}</small></h2></div></header><div className="lc-card-grid">{items.map(entry => <LearningCard compact={group === "course"} key={`${entry.kind}-${entry.item.id}`} entry={entry} settings={state.settings} saving={saving} onOpen={() => entry.kind === "course" ? onOpenCourse(entry.item.id) : onOpenPath(entry.item.id)} onToggle={() => void onSave(entry.kind, entry.item.id, !isInLearning(entry, state.settings))} />)}</div></section>; })}</div> : <div className="lc-empty"><span className="lc-empty-icon"><Search size={26} /></span><div><h2>No matches</h2><p>Try another search or clear your filters.</p></div><Button variant="learning-outline" className="lc-action lc-action-outline" onClick={clearFilters}>Clear filters<ArrowRight size={16} /></Button></div>}
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
      return <li key={course.id}><button type="button" onClick={() => onCourse(course.id)}><span className={`lc-number ${done === course.lessons.length ? "lc-number-complete" : ""}`}>{done === course.lessons.length ? <Check size={18} /> : index + 1}</span><span><small>Course {index + 1}</small><h3>{course.title}</h3><p>{course.description}</p><span className="lc-sequence-meta">{done} of {course.lessons.length} {course.lessons.length === 1 ? "module" : "modules"} complete{next?.id === course.id && done < course.lessons.length ? " · Up next" : ""}</span></span><ArrowRight size={18} /></button></li>;
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
    </section><aside className="lc-outcomes"><h2>What you’ll work on</h2><ul>{details.outcomes.map(outcome => <li key={outcome}><CheckCircle2 size={17} />{outcome}</li>)}</ul><div className="lc-detail-progress"><progress value={done} max={course.lessons.length} aria-label="Course module completion" /><span>{done} of {course.lessons.length} {course.lessons.length === 1 ? "module" : "modules"} complete</span><p>Complete a module’s knowledge checks to save its progress.</p></div></aside></div>
  </div>;
}
