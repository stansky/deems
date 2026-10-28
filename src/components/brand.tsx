import type { CSSProperties, ReactNode } from "react";
import "./brand.css";

type MascotState = "idle" | "loading" | "thinking" | "empty" | "error" | "success";
type BrandStateKind = "loading" | "empty" | "error" | "success";

const mascotAssets: Record<MascotState, string> = {
  idle: "/brand/mascot-idle.svg",
  loading: "/brand/mascot-thinking.svg",
  thinking: "/brand/mascot-thinking.svg",
  empty: "/brand/mascot-curious.svg",
  error: "/brand/mascot-concerned.svg",
  success: "/brand/mascot-success.svg",
};

export function DeemsBrand({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return <span className={`deems-brand${compact ? " deems-brand-compact" : ""}${className ? ` ${className}` : ""}`} role="img" aria-label="Deems">
    <img className="deems-brand-mark" src="/brand/deems-mark.svg" alt="" aria-hidden="true" width="40" height="35" />
    {!compact && <><img className="deems-brand-wordmark deems-brand-wordmark-ink" src="/brand/deems-wordmark.svg" alt="" aria-hidden="true" width="104" height="43" />
      <img className="deems-brand-wordmark deems-brand-wordmark-light" src="/brand/deems-wordmark-light.svg" alt="" aria-hidden="true" width="104" height="43" /></>}
  </span>;
}

export function Mascot({ state = "idle", size = 96, className = "" }: { state?: MascotState; size?: number; className?: string }) {
  const style = { "--deems-mascot-size": `${size}px` } as CSSProperties;
  return <span className={`deems-mascot deems-mascot-${state}${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
    <img src={mascotAssets[state]} alt="" width={size} height={Math.round(size * 0.875)} />
  </span>;
}

export function BrandState({ kind = "loading", title, description, action, compact = false }: {
  kind?: BrandStateKind;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const isLoading = kind === "loading";
  return <section className={`deems-brand-state deems-brand-state-${kind}${compact ? " deems-brand-state-compact" : ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"} aria-busy={isLoading || undefined}>
    <Mascot state={kind} size={compact ? 56 : 92} />
    <div className="deems-brand-state-copy">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="deems-brand-state-action">{action}</div>}
    </div>
  </section>;
}
