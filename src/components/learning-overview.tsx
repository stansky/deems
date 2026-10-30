"use client";

import { ArrowRight, BookOpenCheck, Check, CheckCircle2, Code2, Trophy } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { learningSnapshot } from "@/lib/learning-catalog";
import "./learning-overview.css";

type Props = { state: WorkspaceState; loading: boolean; unavailable: boolean; onLearning: () => void; onArea: (area: string) => void; onCourses?: () => void; onReview?: () => void; compact?: boolean };

export function LearningOverview({ state, loading, unavailable, onLearning, onArea, onCourses, onReview, compact = false }: Props) {
  const snapshot = learningSnapshot(state.settings);
  const earned = snapshot.milestones.filter(item => item.earned);
  const hasProgress = snapshot.completedModules > 0;
  if (loading || unavailable) return null;
  if (compact) return <aside className="overview-compact" aria-label="Learning progress summary">
    <div className="overview-compact-counts">{snapshot.completedModules > 0 && <div><strong>{snapshot.completedModules}</strong><span>Modules</span></div>}{snapshot.completedCourses > 0 && <div><strong>{snapshot.completedCourses}</strong><span>Courses</span></div>}{state.sessions.length > 0 && <div><strong>{state.sessions.length}</strong><span>Practice</span></div>}</div>
    {snapshot.skills.length > 0 && <div className="overview-compact-skills"><span>Coverage</span><div>{snapshot.skills.map(skill => <button key={skill.topic} onClick={() => onArea(skill.topic)} title={`${skill.done} of ${skill.total} selected modules completed`}>{skill.topic}<small>{skill.done}/{skill.total}</small></button>)}</div></div>}
    {earned.length > 0 && <details className="overview-compact-milestones"><summary><Trophy size={15} /><span>{earned.length} earned milestone{earned.length === 1 ? "" : "s"}</span><ArrowRight size={13} /></summary><ul>{earned.map(item => <li key={item.id}><Check size={14} /><span>{item.title}{item.earnedAt ? <small>{new Date(item.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small> : null}</span></li>)}</ul></details>}
  </aside>;

  if (!hasProgress) return <section className="learning-overview overview-new" aria-labelledby="learning-overview-title">
    <div className="overview-new-copy"><h1 id="learning-overview-title">Your next skill starts here</h1><button className="overview-browse" onClick={onCourses}>Browse courses<ArrowRight size={16} /></button></div>
    <img className="overview-new-mascot" src="/brand/presidio-reading.webp" alt="" width={512} height={512} />
  </section>;

  return <section className="learning-overview overview-completed" aria-labelledby="learning-overview-title">
    <div className="overview-body"><header className="overview-heading"><div><p className="overview-kicker">Your learning</p><h1 id="learning-overview-title">Look how far you’ve come</h1></div><button onClick={onLearning} className="overview-learning-link">My learning<ArrowRight size={16} /></button></header>
      <dl className="overview-stats"><div><dd>{snapshot.completedModules}</dd><dt><CheckCircle2 size={16} />Modules complete</dt></div>{snapshot.completedCourses > 0 && <div><dd>{snapshot.completedCourses}</dd><dt><BookOpenCheck size={16} />Courses complete</dt></div>}{state.sessions.length > 0 && <div><dd>{state.sessions.length}</dd><dt><Code2 size={16} />Practice sessions</dt></div>}</dl>
      {snapshot.skills.length > 0 && <div className="overview-skills"><span>Topic coverage</span><div>{snapshot.skills.map(skill => <button key={skill.topic} onClick={() => onArea(skill.topic)} title={`${skill.done} of ${skill.total} selected modules completed. Content coverage, not a skill rating.`}>{skill.topic}<span>{skill.done}/{skill.total}</span></button>)}</div></div>}
      {earned.length > 0 && <details className="overview-trophies"><summary><span><Trophy size={17} /><strong>{earned.length} milestone{earned.length === 1 ? "" : "s"} earned</strong></span><span>See your progress<ArrowRight size={14} /></span></summary><ul>{earned.map(item => <li key={item.id}><Check size={16} /><span><strong>{item.title}</strong>{item.earnedAt && <small>Earned {new Date(item.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small>}</span></li>)}</ul></details>}
    </div><img className="overview-completed-mascot" src="/brand/presidio-reading.webp" alt="" width={512} height={512} />
  </section>;
}
