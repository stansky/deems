"use client";

import { ArrowRight, BookOpenCheck, Check, CheckCircle2, Code2, LockKeyhole, Trophy } from "lucide-react";
import type { WorkspaceState } from "@/lib/types";
import { learningSnapshot } from "@/lib/learning-catalog";
import "./learning-overview.css";

export function LearningOverview({ state, loading, unavailable, onLearning, onArea }: { state: WorkspaceState; loading: boolean; unavailable: boolean; onLearning: () => void; onArea: (area: string) => void }) {
  const snapshot = learningSnapshot(state.settings);
  const earned = snapshot.milestones.filter(item => item.earned).length;
  return <section className="learning-overview" aria-labelledby="learning-overview-title">
    <div className="overview-body">
      <header className="overview-heading"><h1 id="learning-overview-title">Welcome back</h1><button onClick={onLearning} className="overview-learning-link">My learning<ArrowRight size={16} /></button></header>
      {loading ? <div className="overview-pending" aria-busy="true" aria-label="Loading learning summary"><span /><span /><span /><p>Loading your progress</p></div> : unavailable ? <div className="overview-unavailable"><h2>Your progress is unavailable</h2><p>Reload your learning below to bring it back.</p></div> : <>
        <dl className="overview-stats">
          <div><dt><CheckCircle2 size={17} />Modules completed</dt><dd>{snapshot.completedModules}</dd></div>
          <div><dt><BookOpenCheck size={17} />Courses completed</dt><dd>{snapshot.completedCourses}</dd></div>
          <div><dt><Code2 size={17} />Practice sessions</dt><dd>{state.sessions.length}</dd></div>
        </dl>
        <div className="overview-progress"><div><span>Selected learning</span><strong>{snapshot.selectedModules ? `${snapshot.completedModules} / ${snapshot.selectedModules} modules` : "No course selected"}</strong></div><progress value={snapshot.completedModules} max={snapshot.selectedModules || 1} aria-label={snapshot.selectedModules ? `${snapshot.completedModules} of ${snapshot.selectedModules} selected modules completed` : "No learning selected yet"} />{!snapshot.selectedModules && <p>Start a course below to build your progress.</p>}</div>
        <div className="overview-skills"><span>{snapshot.skills.length ? "Skills in focus" : "Skills to explore"}</span><div>{snapshot.skills.length ? snapshot.skills.map(skill => <button key={skill.topic} onClick={() => onArea(skill.topic)} title={`${skill.done} of ${skill.total} selected modules completed. Content coverage, not a skill rating.`}>{skill.topic}<span>{skill.done}/{skill.total}</span></button>) : ["Coding", "AI & systems", "Team management"].map(topic => <button key={topic} onClick={() => onArea(topic)}>{topic}<ArrowRight size={12} /></button>)}</div></div>
        <details className="overview-trophies"><summary><span><Trophy size={18} /><strong>{earned} / {snapshot.milestones.length} trophies</strong></span><span>{earned === snapshot.milestones.length ? "All milestones reached" : `Next: ${snapshot.milestones.find(item => !item.earned)?.title}`}<ArrowRight size={14} /></span></summary><ul>{snapshot.milestones.map(item => <li key={item.id} className={item.earned ? "is-earned" : ""}>{item.earned ? <Check size={17} /> : <LockKeyhole size={16} />}<span><strong>{item.title}{item.earned ? " · Earned" : " · Not earned"}</strong><small>{item.detail}</small></span></li>)}</ul></details>
      </>}
    </div>
    <div className="overview-art"><img src="/brand/pose-reading.svg" alt="" width={250} height={210} /></div>
  </section>;
}
