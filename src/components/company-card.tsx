import { ArrowRight } from "lucide-react";
import { companySurface } from "@/lib/company-colors";
import "./company-card.css";

export function CompanyCard({ name, logo, accent, meta, done = 0, total = 0, onOpen, label }: { name: string; logo?: string; accent?: string; meta: string; done?: number; total?: number; onOpen: () => void; label: string }) {
  return <button type="button" className="company-card" style={companySurface(accent)} onClick={onOpen} aria-label={label}>
    <span className="company-card-logo">{logo && <img src={logo} alt="" width={72} height={72} loading="lazy" onError={event => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("logo-missing"); }} />}<span className={logo ? "company-card-fallback" : ""} aria-hidden="true">{name.slice(0, 1)}</span></span>
    <h3>{name}</h3><span className="company-card-meta">{meta}<ArrowRight size={16} /></span>
    {done > 0 && total > 0 && <progress value={done} max={total} aria-label={`${name}: ${done} of ${total} preparation steps completed`} />}
  </button>;
}
