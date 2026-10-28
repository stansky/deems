import { type ButtonHTMLAttributes, type ReactNode } from "react";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "amber" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><p>{children}</p></div>;
}
