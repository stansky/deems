import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { BrandState } from "./brand";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "amber" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  if (typeof children === "string") return <BrandState kind="empty" title={title} description={children} compact />;
  return <div className="empty-state"><strong>{title}</strong><p>{children}</p></div>;
}
