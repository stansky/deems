"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { ArrowLeft, Code2 } from "lucide-react";
import { useTheme } from "@/components/theme";
import { Button } from "@/components/ui/button";
import "./question-session.css";

const Code = dynamic(() => import("@uiw/react-codemirror"), { ssr:false, loading:() => <p role="status">Loading code example…</p> });
export function ReadOnlyCode({ code, label = "Code example" }: { code: string; label?: string }) {
  const { resolved } = useTheme();
  return <div className="qs-code-example"><header><Code2 size={17} /><span>{label}</span><small>Read only</small></header><Code value={code} readOnly editable={false} theme={resolved} aria-label={`${label}, read only`} basicSetup={{lineNumbers:true,foldGutter:false,highlightActiveLine:false,highlightActiveLineGutter:false}} /></div>;
}
export function SessionAction({ children, onClick, disabled = false, secondary = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Button variant={secondary ? "learning-outline" : "learning"} className={`qs-action text-base font-bold gap-4 rounded-lg ${secondary ? "qs-secondary" : "qs-primary"}`} onClick={onClick} disabled={disabled}>{children}</Button>;
}
export function QuestionSession({ title, context, onExit, children, footer, toolbar, position, completed, total, className = "" }: {
  title: string; context: string; onExit: () => void; children: ReactNode; footer?: ReactNode; toolbar?: ReactNode;
  position?: string; completed?: number; total?: number; className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {if(mounted){const heading=frame.current?.querySelector<HTMLElement>("h1");if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}, [mounted]);
  useEffect(() => {
    const app = document.querySelector<HTMLElement>(".app-shell");
    const wasInert = app?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (app) app.inert = true;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => { if (app) app.inert = wasInert; document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); };
  }, []);
  if (!mounted) return null;
  return createPortal(<div ref={frame} className={`question-session ${className}`}><header className="qs-header"><div className="qs-context"><button type="button" className="qs-exit" aria-label="Exit session" onClick={onExit}><ArrowLeft size={22} /></button><div><span>{context}</span><strong>{title}</strong></div></div>{position && <div className="qs-position"><span>{position}</span>{total !== undefined && total > 1 && completed !== undefined && <progress aria-label="Reviewed questions" value={completed} max={total} />}</div>}{toolbar && <div className="qs-tools">{toolbar}</div>}</header><main className="qs-main">{children}</main>{footer && <footer className="qs-footer">{footer}</footer>}</div>, document.body);
}
