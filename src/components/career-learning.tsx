"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Building2, RotateCcw } from "lucide-react";
import { targetStateSchema } from "@/contracts/targets";
import type { TargetsState } from "@/lib/target-types";
import { companyBranding } from "@/data/company-branding";
import { companySurface } from "@/lib/company-colors";
import { workspaceFetch } from "./workspace-client";
import "./career-learning.css";

export function CareerLearning({ onOpen, limit }: { onOpen: (companyId?: string, roleId?: string) => void; limit?: number }) {
  const [data, setData] = useState<TargetsState | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), 12000);
    setFailed(false);
    void workspaceFetch("/api/targets", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Could not load career tracks");
      const next = targetStateSchema.parse(await response.json());
      if (current) setData(next);
    }).catch(() => { if (current) setFailed(true); }).finally(() => window.clearTimeout(deadline));
    return () => { current = false; controller.abort(); window.clearTimeout(deadline); };
  }, [retry]);
  const companies = data?.companies.filter((company, index, all) => company.id !== "general" && all.findIndex(item => item.id === company.id) === index).sort((a, b) => {
    const activity = (id: string) => Math.max(0, ...data.progress.filter(item => data.roles.some(role => role.id === item.roleId && role.companyId === id)).map(item => Date.parse(item.updatedAt) || 0));
    const primary = (id: string) => Number(data.roles.some(role => role.companyId === id && role.priority === "Primary"));
    return activity(b.id) - activity(a.id) || primary(b.id) - primary(a.id) || a.name.localeCompare(b.name);
  }) ?? [];
  const resumed = data?.roles.find(role => role.companyId !== "general" && role.steps.some(step => data.progress.some(item => item.roleId === role.id && item.itemId === step.id && item.status === "working")));
  return <section className="career-learning" aria-labelledby="career-learning-title"><header className="career-learning-heading"><h2 id="career-learning-title">Career & company tracks</h2><button onClick={() => onOpen()}>{companies.length ? `All companies (${companies.length})` : "Add company"}<ArrowRight size={15} /></button></header>
    {failed ? <div className="career-learning-state" role="alert"><BriefcaseBusiness size={23} /><span>Career tracks couldn’t load. Your saved plans are unchanged.</span><button onClick={() => setRetry(value => value + 1)}>Try again<RotateCcw size={15} /></button></div> : !data ? <div className="career-learning-pending" aria-label="Loading career tracks" aria-busy="true"><span /><span /><span /><span /></div> : companies.length ? <>
      {resumed && <button className="career-resume" onClick={() => onOpen(resumed.companyId, resumed.id)}><BriefcaseBusiness size={18} /><span><small>Continue your role plan</small><strong>{resumed.title} · {data.companies.find(company => company.id === resumed.companyId)?.name}</strong></span><ArrowRight size={16} /></button>}
      <div className="career-track-grid">{companies.slice(0, limit).map(company => {
        const roles = data.roles.filter(role => role.companyId === company.id);
        const lead = roles.find(role => role.priority === "Primary") ?? roles[0];
        const total = roles.reduce((sum, role) => sum + role.steps.length, 0);
        const done = roles.reduce((sum, role) => sum + role.steps.filter(step => data.progress.some(item => item.roleId === role.id && item.itemId === step.id && item.status === "done")).length, 0);
        const brand = companyBranding[company.id];
        return <button className="career-track-card" key={company.id} style={companySurface(brand?.accent)} onClick={() => onOpen(company.id)} aria-label={`Open ${company.name} career tracks`}><span className={`career-track-logo ${company.id === "crunchyroll" ? "career-logo-backed" : ""}`}>{brand?.logoPath ? <><img src={brand.logoPath} alt="" width={64} height={64} loading="lazy" onError={event => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("logo-missing"); }} /><span className="career-logo-fallback" aria-hidden="true">{company.name.slice(0, 1)}</span></> : <span>{company.name.slice(0, 1)}</span>}</span><h3>{company.name}</h3>{lead && <p>{lead.title}</p>}<span className="career-track-footer"><span>{done > 0 && total > 0 ? `${done} / ${total} steps complete` : `${roles.length} ${roles.length === 1 ? "role plan" : "role plans"}`}</span><ArrowRight size={17} /></span>{done > 0 && total > 0 && <progress value={done} max={total} aria-label={`${company.name}: ${done} of ${total} preparation steps completed`} />}</button>;
      })}</div>
    </> : <div className="career-learning-state"><button onClick={() => onOpen()}>Set up a career plan <ArrowRight size={15} /></button></div>}
  </section>;
}
