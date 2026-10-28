"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, BookOpen, ChevronDown, Code2, FileText, LogOut, UserRound } from "lucide-react";
import { DeemsBrand } from "./brand";
import type { StudyTab } from "@/contracts/study";
import type { PrepCategory } from "./features/prep/prep-library";
import "./workspace-chrome.css";

export type WorkspaceView = "Home" | "Preparation" | "Interviews" | "Today" | "Study" | "Practice" | "Algorithms" | "Reference" | "Applications" | "Experience";
type Navigation = { onNavigate: (view: WorkspaceView) => void; onLibrary: (tab: StudyTab) => void; onCategory: (category: PrepCategory) => void };

export function WorkspaceHeader({ view, studyTab, authenticated, onSignOut, onNavigate, onLibrary, onCategory }: Navigation & { view: WorkspaceView; studyTab: StudyTab; authenticated: boolean; onSignOut: () => void }) {
  const header = useRef<HTMLElement>(null);
  function closeMenus() { header.current?.querySelectorAll("details[open]").forEach(menu => menu.removeAttribute("open")); }
  function go(action: () => void) { closeMenus(); action(); }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) closeMenus(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const menu = header.current?.querySelector("details[open]");
      if (menu) { menu.removeAttribute("open"); menu.querySelector("summary")?.focus(); }
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const practicing = ["Preparation", "Practice", "Algorithms"].includes(view);
  const library = ["Reference", "Interviews", "Applications", "Experience", "Today"].includes(view) || (view === "Study" && studyTab !== "Courses");
  return <header ref={header} className="learning-header desk-header workspace-header">
    <button className="learning-brand" aria-label="Deems home" onClick={() => go(() => onNavigate("Home"))}><DeemsBrand /></button>
    <nav className="desk-navigation" aria-label="Workspace sections">
      <button className={view === "Home" ? "is-active" : ""} aria-current={view === "Home" ? "page" : undefined} onClick={() => go(() => onNavigate("Home"))}>Home</button>
      <button className={view === "Study" && studyTab === "Courses" ? "is-active" : ""} aria-current={view === "Study" && studyTab === "Courses" ? "page" : undefined} onClick={() => go(() => onLibrary("Courses"))}>Learn</button>
      <details name="deems-header-menu"><summary className={practicing ? "is-active" : ""}>Practice<ChevronDown size={14} /></summary><div className="desk-menu">
        {(["Coding", "System design", "Management", "Behavioral"] as PrepCategory[]).map(category => <button key={category} onClick={() => go(() => onCategory(category))}>{category === "Management" ? "Team management" : category === "Behavioral" ? "Interview skills" : category}</button>)}
        <button onClick={() => go(() => onNavigate("Algorithms"))}>Algorithm practice</button>
      </div></details>
      <details name="deems-header-menu"><summary className={library ? "is-active" : ""}>Library<ChevronDown size={14} /></summary><div className="desk-menu">
        {(["Quizzes", "Guides", "Flashcards"] as StudyTab[]).map(tab => <button key={tab} onClick={() => go(() => onLibrary(tab))}>{tab === "Flashcards" ? "Spaced review" : tab}</button>)}
        <button onClick={() => go(() => onNavigate("Reference"))}>Frameworks & reference</button>
        <span className="desk-menu-label">Career tools</span>
        <button onClick={() => go(() => onNavigate("Interviews"))}>Companies & interviews</button>
        <button onClick={() => go(() => onNavigate("Applications"))}>Applications</button>
        <button onClick={() => go(() => onNavigate("Experience"))}>Experience & stories</button>
      </div></details>
    </nav>
    <details className="workspace-account" name="deems-header-menu"><summary aria-label="Workspace menu"><UserRound size={19} /><ChevronDown size={12} /></summary><div className="desk-menu">
      <div className="workspace-account-label"><strong>Your workspace</strong><span>Personal learning space</span></div>
      <a href="/api/export" download><ArrowDownToLine size={16} />Export your data</a>
      {authenticated && <button onClick={() => go(onSignOut)}><LogOut size={16} />Sign out</button>}
    </div></details>
  </header>;
}

export function WorkspaceFooter({ onNavigate, onLibrary, onCategory }: Navigation) {
  return <footer className="workspace-footer"><div className="workspace-footer-inner">
    <div className="workspace-footer-brand"><strong>Deems</strong><span>Your personal learning space</span></div>
    <nav aria-label="Footer navigation">
      <button onClick={() => onLibrary("Courses")}><BookOpen size={14} />Courses</button>
      <button onClick={() => onCategory("Coding")}><Code2 size={14} />Practice</button>
      <button onClick={() => onNavigate("Reference")}><FileText size={14} />Reference</button>
      <a href="/api/export" download><ArrowDownToLine size={14} />Export</a>
    </nav>
  </div></footer>;
}
