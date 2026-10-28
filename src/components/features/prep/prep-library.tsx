"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Braces,
  ChevronDown,
  Network,
  UsersRound,
} from "lucide-react";
import "./prep-library.css";

export type PrepCategory = "Coding" | "System design" | "Behavioral" | "Management";

type PrepLibraryProps = {
  category: PrepCategory;
  onGuide: (id: string) => void;
  onPractice: (kind?: string) => void;
  onAlgorithms: () => void;
  onStories: () => void;
  onStudy: () => void;
  onReference: () => void;
};

type GuideLink = { id: string; title: string; detail: string };

const codingGuides: GuideLink[] = [
  { id: "coding-collab", title: "Live coding", detail: "Clarify the task, work a small example, then make behavior testable." },
  { id: "math-patterns", title: "Algorithms and complexity", detail: "Recognize common patterns and explain time and memory in plain words." },
];

const designGuides: GuideLink[] = [
  { id: "agent-design", title: "Design a durable agent run", detail: "Trace one workflow through authorization, persistence, tools, and recovery." },
  { id: "api-reliability", title: "APIs, retries, and idempotency", detail: "Define safe retry behavior when a remote outcome is uncertain." },
  { id: "tenant-security", title: "Tenant boundaries and agent authority", detail: "Place authorization in trusted code and verify isolation at each boundary." },
  { id: "streaming-ui", title: "Streaming run state", detail: "Separate connection health, durable run state, and partial output." },
];

const behavioralPrompts = [
  { title: "Ownership", prompt: "Tell me about a problem you noticed and carried through to a useful result." },
  { title: "Conflict", prompt: "Describe a disagreement about a technical or product decision. How did you work toward a decision?" },
  { title: "Failure", prompt: "Tell me about a change or approach that did not work as expected. What did you do next?" },
  { title: "Ambiguity", prompt: "Describe a time the goal or requirements were unclear. What did you clarify before acting?" },
];

const managementPrompts = [
  { title: "Scope", prompt: "A deadline is fixed, but the requested work is too large. How do you shape a credible first release?" },
  { title: "Team feedback", prompt: "How would you give direct feedback when a teammate's work repeatedly creates rework?" },
  { title: "Delegation", prompt: "How do you delegate an important task while keeping ownership and support clear?" },
  { title: "Tradeoff", prompt: "Describe how you would explain a quality, time, or reliability tradeoff to the people affected." },
  { title: "Stakeholder alignment", prompt: "Two groups need different outcomes from the same project. How would you get to a workable decision?" },
];

const categoryIcon = {
  Coding: Braces,
  "System design": Network,
  Behavioral: UsersRound,
  Management: UsersRound,
} satisfies Record<PrepCategory, typeof Braces>;

function GuideList({ guides, onGuide }: { guides: GuideLink[]; onGuide: (id: string) => void }) {
  return (
    <div className="prep-guide-list">
      {guides.map(guide => (
        <button className="prep-guide" key={guide.id} onClick={() => onGuide(guide.id)} type="button">
          <span className="prep-guide-copy">
            <strong>{guide.title}</strong>
            <small>{guide.detail}</small>
          </span>
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      ))}
    </div>
  );
}

function PracticePrompts({
  prompts,
  structure,
  instruction,
}: {
  prompts: { title: string; prompt: string }[];
  structure: string[];
  instruction: string;
}) {
  return (
    <div className="prep-prompt-list">
      {prompts.map(item => (
        <details className="prep-prompt" key={item.title}>
          <summary>
            <span><strong>{item.title}</strong><span>{item.prompt}</span></span>
            <ChevronDown aria-hidden="true" size={16} />
          </summary>
          <div className="prep-prompt-body">
            <p>{instruction}</p>
            <ol>{structure.map(line => <li key={line}>{line}</li>)}</ol>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function PrepLibrary({
  category,
  onGuide,
  onPractice,
  onAlgorithms,
  onStories,
  onStudy,
  onReference,
}: PrepLibraryProps) {
  const Icon = categoryIcon[category];

  return (
    <section className="prep-library" aria-label={`${category} preparation`}>
      <header className="prep-library-heading">
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
        <h1>{category}</h1>
      </header>

      {category === "Coding" && (
        <>
          <section className="prep-library-section" aria-labelledby="prep-coding-guides">
            <h2 id="prep-coding-guides">Guides</h2>
            <GuideList guides={codingGuides} onGuide={onGuide} />
          </section>
          <section className="prep-library-section prep-coding-actions" aria-labelledby="prep-coding-practice">
            <h2 id="prep-coding-practice">Practice</h2>
            <button className="prep-action" type="button" onClick={() => onPractice("Live coding")}>
              <span><strong>Start a coding exercise</strong><small>Pick a small problem and talk through the tradeoffs.</small></span>
              <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button className="prep-action" type="button" onClick={onAlgorithms}>
              <span><strong>Browse algorithm questions</strong><small>Use the curated question bank and language solutions.</small></span>
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </section>
        </>
      )}

      {category === "System design" && (
        <>
          <section className="prep-library-section" aria-labelledby="prep-design-guides">
            <h2 id="prep-design-guides">Guides</h2>
            <GuideList guides={designGuides} onGuide={onGuide} />
          </section>
          <section className="prep-library-section prep-coding-actions" aria-labelledby="prep-design-practice">
            <h2 id="prep-design-practice">Practice</h2>
            <button className="prep-action" type="button" onClick={() => onPractice("System design")}>
              <span><strong>Start a system design session</strong><small>Use the guided 60-minute enterprise agent scenario.</small></span>
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </section>
        </>
      )}

      {category === "Behavioral" && (
        <>
          <section className="prep-library-section" aria-labelledby="prep-behavioral-prompts">
            <h2 id="prep-behavioral-prompts">Practice prompts</h2>
            <PracticePrompts
              prompts={behavioralPrompts}
              instruction="STAR answer outline"
              structure={["Situation: what was happening and why it mattered", "Task: your responsibility and the result you needed", "Action: the steps you personally took", "Result: the observed outcome and what you learned"]}
            />
          </section>
          <section className="prep-library-section prep-story-link" aria-labelledby="prep-story-heading">
            <div><h2 id="prep-story-heading">Use a real example</h2><p>Choose a story from your resume, then keep your role and results precise.</p></div>
            <button className="prep-inline-button" type="button" onClick={onStories}>Open resume stories <ArrowRight aria-hidden="true" size={15} /></button>
          </section>
        </>
      )}

      {category === "Management" && (
        <>
          <section className="prep-library-section" aria-labelledby="prep-management-prompts">
            <h2 id="prep-management-prompts">Practice prompts</h2>
            <PracticePrompts
              prompts={managementPrompts}
              instruction="Shape the answer with concrete decisions and actions"
              structure={["Outcome and constraints", "Options and decision", "How you involved or supported people", "Evidence, result, and follow-up"]}
            />
          </section>
          <section className="prep-library-section prep-story-link" aria-labelledby="prep-management-story-heading">
            <div><h2 id="prep-management-story-heading">Ground it in your experience</h2><p>Use a documented resume story. Do not fill gaps with invented team outcomes.</p></div>
            <button className="prep-inline-button" type="button" onClick={onStories}>Open resume stories <ArrowRight aria-hidden="true" size={15} /></button>
          </section>
        </>
      )}

      <footer className="prep-library-footer" aria-label="More preparation resources">
        <button type="button" onClick={onStudy}><BookOpenCheck aria-hidden="true" size={15} /> Courses</button>
        <button type="button" onClick={onReference}><BookOpen aria-hidden="true" size={15} /> Reference</button>
      </footer>
    </section>
  );
}
