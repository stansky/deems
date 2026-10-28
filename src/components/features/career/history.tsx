import type { RecordRevision } from "@/domains/career/contracts";
import { ChevronRight } from "lucide-react";
import "./history.css";

type Props = { revisions: RecordRevision[]; entityType: string; entityId: string };

const labels: Record<string, string> = {
  stage: "Stage",
  company: "Company",
  title: "Role",
  submittedAt: "Submitted",
  nextAction: "Next action",
  notes: "Notes",
  pipelineNotes: "Pipeline notes",
  scheduledAt: "Scheduled",
  status: "Status",
  format: "Format",
  occurredOn: "Date",
  outcome: "Outcome",
  prompt: "Question or prompt",
  worked: "What worked",
  struggled: "Where things were hard",
  feedback: "Feedback received",
  resolvedAt: "Follow-up completed",
  createdAt: "Created",
  requirementIds: "Related requirements",
  key: "Key",
  value: "Content",
};

const visibleFields: Record<string, string[]> = {
  candidacy: ["stage", "company", "title", "submittedAt", "nextAction", "notes", "pipelineNotes"],
  interview: ["title", "status", "scheduledAt", "format", "notes"],
  debrief: ["occurredOn", "outcome", "prompt", "worked", "struggled", "feedback", "nextAction", "requirementIds", "resolvedAt", "createdAt"],
  note: ["key", "value"],
};

function recordContent(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(item => typeof item === "string" ? item : "").filter(Boolean).join(", ") || "Not recorded";
  return "Not recorded";
}

function formatDate(value: unknown, includeTime = true): string {
  if (typeof value !== "string" || !value) return display(value);
  const day = !includeTime && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (!Number.isFinite(day.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(day);
}

function snapshotFields(type: string, content: unknown) {
  const data = recordContent(content);
  return (visibleFields[type] ?? Object.keys(labels)).map(key => {
    if (!(key in data)) return null;
    const value = key === "scheduledAt" || key === "submittedAt" || key === "resolvedAt" || key === "createdAt"
      ? formatDate(data[key])
      : key === "occurredOn" ? formatDate(data[key], false) : display(data[key]);
    return { key, label: labels[key] ?? key, value };
  }).filter((item): item is { key: string; label: string; value: string } => item !== null);
}

export function CareerHistory({ revisions, entityType, entityId }: Props) {
  const entries = revisions
    .filter(item => item.entityType === entityType && item.entityId === entityId)
    .sort((a, b) => b.revision - a.revision);

  if (!entries.length) return <p className="career-history-empty">No saved history is available.</p>;

  return <ol className="career-history">
    {entries.map((item, index) => {
      const imported = item.reason === "baseline_import";
      const fields = snapshotFields(entityType, item.content);
      return <li className="career-history-entry" key={`${item.entityType}:${item.entityId}:${item.revision}`}>
        <details open={index === 0}>
          <summary>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="career-history-revision">Revision {item.revision}</span>
            <span className="career-history-kind">{imported ? "Imported baseline" : item.previousRevision === null ? "Created" : "Saved change"}</span>
            <time dateTime={item.recordedAt}>{formatDate(item.recordedAt)}</time>
          </summary>
          {imported && <p className="career-history-baseline">This is the imported starting snapshot. It does not represent a past edit.</p>}
          <dl>
            {fields.length ? fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>) : <div><dt>Snapshot</dt><dd>Saved content is not available in a readable format.</dd></div>}
          </dl>
        </details>
      </li>;
    })}
  </ol>;
}
