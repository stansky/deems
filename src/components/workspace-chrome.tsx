"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, ChevronDown, LogOut, UserRound } from "lucide-react";
import { DeemsBrand } from "./brand";
import type { StudyTab } from "@/contracts/study";
import type { PrepCategory } from "./features/prep/prep-library";
import "./workspace-chrome.css";

export type WorkspaceView = "Home" | "PracticeHub" | "Preparation" | "Interviews" | "Today" | "Study" | "Practice" | "Algorithms" | "Reference" | "Applications" | "Experience";
type Navigation = { onNavigate: (view: WorkspaceView) => void; onLibrary: (tab: StudyTab) => void; onCategory: (category: PrepCategory) => void; onCareer: () => void };

export function WorkspaceHeader({ view, studyTab, authenticated, onSignOut, onNavigate, onLibrary, onCareer }: Navigation & { view: WorkspaceView; studyTab: StudyTab; authenticated: boolean; onSignOut: () => void }) {
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
  const active = workspaceSection(view, studyTab);
  const items = [
    { id: "home", label: "Home", action: () => onNavigate("Home") },
    { id: "learning", label: "My learning", action: () => onLibrary("My learning") },
    { id: "browse", label: "Browse", action: () => onLibrary("Courses") },
    { id: "practice", label: "Practice", action: () => onNavigate("PracticeHub") },
    { id: "career", label: "Career", action: onCareer },
  ];
  return <header ref={header} className="learning-header desk-header workspace-header">
    <button className="learning-brand" aria-label="Deems home" onClick={() => go(() => onNavigate("Home"))}><DeemsBrand /></button>
    <nav className="desk-navigation" aria-label="Workspace sections">{items.map(item => <button key={item.id} className={active === item.id ? "is-active" : ""} aria-current={active === item.id ? "page" : undefined} onClick={() => go(item.action)}>{item.label}</button>)}</nav>
    <details className="workspace-account" name="deems-header-menu"><summary aria-label="Workspace menu"><UserRound size={19} /><ChevronDown size={12} /></summary><div className="desk-menu">
      <div className="workspace-account-label"><strong>Your workspace</strong><span>Personal learning space</span></div>
      <a href="/api/export" download><ArrowDownToLine size={16} />Export your data</a>
      {authenticated && <button onClick={() => go(onSignOut)}><LogOut size={16} />Sign out</button>}
    </div></details>
  </header>;
}

export function WorkspaceFooter() {
  return <footer className="workspace-footer"><div className="workspace-footer-inner">
    <div className="workspace-footer-brand"><strong>Deems</strong><span>Your personal learning space</span></div>
    <nav aria-label="Workspace utilities"><a href="/api/export" download><ArrowDownToLine size={14} />Export your data</a><details className="workspace-credits"><summary>Credits</summary><p>Original Deems artwork. Interface icons by <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide</a>.</p></details></nav>
  </div></footer>;
}

function workspaceSection(view: WorkspaceView, studyTab: StudyTab) {
  if (view === "Home") return "home";
  if (["Interviews", "Applications", "Experience", "Today"].includes(view)) return "career";
  if (["PracticeHub", "Preparation", "Practice", "Algorithms"].includes(view) || (view === "Study" && ["Quizzes", "Flashcards"].includes(studyTab))) return "practice";
  if (view === "Study" && studyTab === "My learning") return "learning";
  return "browse";
}

export function WorkspaceSections({ view, studyTab, category, onNavigate, onLibrary, onCategory, onCareer }: Navigation & { view: WorkspaceView; studyTab: StudyTab; category: PrepCategory }) {
  const active = workspaceSection(view, studyTab);
  let items: { label: string; selected: boolean; action: () => void }[] = [];
  if (active === "practice") items = [
    { label: "Overview", selected: view === "PracticeHub", action: () => onNavigate("PracticeHub") },
    { label: "Review", selected: view === "Study" && studyTab === "Flashcards", action: () => onLibrary("Flashcards") },
    { label: "Quizzes", selected: view === "Study" && studyTab === "Quizzes", action: () => onLibrary("Quizzes") },
    { label: "Coding", selected: view === "Algorithms" || view === "Practice" || (view === "Preparation" && category === "Coding"), action: () => onNavigate("Algorithms") },
    { label: "System design", selected: view === "Preparation" && category === "System design", action: () => onCategory("System design") },
    { label: "Team management", selected: view === "Preparation" && category === "Management", action: () => onCategory("Management") },
    { label: "Interview skills", selected: view === "Preparation" && category === "Behavioral", action: () => onCategory("Behavioral") },
  ];
  if (active === "browse") items = [
    { label: "Courses & paths", selected: view === "Study" && studyTab === "Courses", action: () => onLibrary("Courses") },
    { label: "Guides", selected: view === "Study" && studyTab === "Guides", action: () => onLibrary("Guides") },
    { label: "Frameworks & reference", selected: view === "Reference", action: () => onNavigate("Reference") },
  ];
  if (active === "career") items = [
    { label: "Companies", selected: view === "Interviews", action: onCareer },
    { label: "Applications", selected: view === "Applications", action: () => onNavigate("Applications") },
    { label: "Experience & stories", selected: view === "Experience", action: () => onNavigate("Experience") },
    { label: "Upcoming", selected: view === "Today", action: () => onNavigate("Today") },
  ];
  if (!items.length) return null;
  return <nav className="workspace-sections" aria-label={`${active === "browse" ? "Browse" : active === "career" ? "Career" : "Practice"} sections`}>{items.map(item => <button key={item.label} onClick={item.action} aria-current={item.selected ? "page" : undefined}>{item.label}</button>)}</nav>;
}
