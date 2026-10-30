import { type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { BrandState } from "./brand";

export function PageHeader({ title, actions, children, visible = false, headingRef, id }: { title: string; actions?: ReactNode; children?: ReactNode; visible?: boolean; headingRef?: Ref<HTMLHeadingElement>; id?: string }) {
  return <header className={`page-header${visible ? " page-header-visible" : ""}${actions || children ? " page-header-with-content" : ""}`}><h1 id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={visible ? undefined : "sr-only"}>{title}</h1>{children}{actions && <div className="page-header-actions">{actions}</div>}</header>;
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "amber" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Empty({ title, children, loading = false }: { title: string; children: ReactNode; loading?: boolean }) {
  if (typeof children === "string") return <BrandState kind={loading ? "loading" : "empty"} title={title} description={children} compact />;
  return <div className="empty-state"><strong>{title}</strong><p>{children}</p></div>;
}
