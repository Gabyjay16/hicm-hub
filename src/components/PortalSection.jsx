import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function PortalSection({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="portal-section">
      <button
        type="button"
        className="portal-section-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="portal-icon-ring"><Icon size={24} /></span>
        <span className="flex-1 text-left text-lg font-extrabold text-navy sm:text-xl">{title}</span>
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} size={22} />
      </button>
      {open && <div className="portal-section-content">{children}</div>}
    </section>
  );
}

export function PortalRow({ icon: Icon, label, to, badge }) {
  return (
    <Link to={to} className="portal-row">
      <Icon size={25} strokeWidth={1.7} />
      <span className="min-w-0 flex-1 text-base font-semibold text-navy sm:text-lg">{label}</span>
      {badge ? <span className="portal-count">{badge}</span> : null}
      <span aria-hidden="true" className="text-2xl font-light leading-none">›</span>
    </Link>
  );
}
