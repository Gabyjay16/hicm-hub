import { ChevronDown, GraduationCap, LogIn, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";

const groups = [
  { label: "Academics", items: [{ label: "Notes & MCQs", to: "/quiz" }, { label: "Thesis Checker", to: "/thesis" }] },
  { label: "Student Services", items: [{ label: "Complaints Desk", to: "/complaints" }, { label: "Lost & Found", to: "/lost-found" }] },
  { label: "Campus Life", items: [{ label: "Announcements", to: "/announcements" }, { label: "Student Voting", to: "/voting" }, { label: "Chat Forums", to: "/forums" }] },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, user, viewRole, setAuthOpen, logout, toggleRole } = useApp();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-700 text-white shadow-soft">
            <GraduationCap size={25} />
          </span>
          <span>
            <span className="block text-lg font-black tracking-wide text-slate-950">HICM HUB</span>
            <span className="hidden text-xs font-semibold uppercase text-teal-700 sm:block">University Services Portal</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {groups.map((group) => <Dropdown key={group.label} group={group} />)}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button onClick={toggleRole} className="btn-secondary" title="Switch testing role">
            <ShieldCheck size={17} />
            {viewRole === "staff" ? "Staff/Admin View" : "Student View"}
          </button>
          {session ? (
            <>
              <span className="max-w-40 truncate rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {user.name}
              </span>
              <button onClick={logout} className="btn-secondary">Logout</button>
            </>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn-primary"><LogIn size={17} /> Login</button>
          )}
        </div>

        <button className="btn-secondary px-3 lg:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Open menu">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-black uppercase text-slate-500">{group.label}</p>
                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-teal-50">
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={toggleRole} className="btn-secondary w-full"><ShieldCheck size={17} /> {viewRole === "staff" ? "Staff/Admin View" : "Student View"}</button>
            {session ? <button onClick={logout} className="btn-secondary w-full">Logout</button> : <button onClick={() => setAuthOpen(true)} className="btn-primary w-full"><UserRound size={17} /> Login / Register</button>}
          </div>
        </div>
      )}
    </header>
  );
}

function Dropdown({ group }) {
  return (
    <div className="group relative">
      <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
        {group.label}
        <ChevronDown size={15} />
      </button>
      <div className="invisible absolute left-0 top-full min-w-56 translate-y-2 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-soft transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {group.items.map((item) => (
          <NavLink key={item.to} to={item.to} className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800">
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
