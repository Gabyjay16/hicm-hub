import { Bell, BriefcaseBusiness, ChevronDown, GraduationCap, Home, LogIn, MessageSquare, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

const groups = [
  { label: "Academics", items: [{ label: "Evaluation", to: "/quiz" }, { label: "Lecture Notes", to: "/quiz" }, { label: "Plagiarism Test", to: "/thesis" }] },
  { label: "Student Services", items: [{ label: "Complaints Desk", to: "/complaints" }, { label: "Lost & Found", to: "/lost-found" }] },
  { label: "Campus Life", items: [{ label: "Announcements", to: "/announcements" }, { label: "Student Voting", to: "/voting" }, { label: "General Forum", to: "/forums" }] },
];

export default function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { session, user, viewRole, setAuthOpen, logout, toggleRole, unreadCount } = useApp();
  const location = useLocation();
  const staff = viewRole === "staff";

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/98">
      <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-sm bg-navy text-white">
            <GraduationCap size={27} />
          </span>
          <span className="font-serif text-xl font-bold text-navy sm:text-2xl">{staff ? "Staff Portal" : "HICM Portal"}</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {groups.map((group) => <Dropdown key={group.label} group={group} />)}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/alerts" className="relative grid h-10 w-10 place-items-center text-navy" aria-label={`${unreadCount} unread notifications`}>
            <Bell size={23} />
            {unreadCount > 0 && <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-teal-700 px-1 text-[11px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          {session ? (
            <div className="relative">
              <button onClick={() => setProfileOpen((open) => !open)} className="flex max-w-48 items-center gap-2 px-1 py-2 text-sm font-semibold text-navy sm:text-base">
                <span className="max-w-28 truncate sm:max-w-40">{user.name}</span><ChevronDown size={18} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-soft">
                  {(user.role === "staff" || user.role === "admin") && <button onClick={() => { toggleRole(); setProfileOpen(false); }} className="nav-menu-action"><ShieldCheck size={17} /> Switch portal view</button>}
                  {user.role === "admin" && <Link to="/admin" onClick={() => setProfileOpen(false)} className="nav-menu-action"><Settings size={17} /> Administration</Link>}
                  <button onClick={() => { logout(); setProfileOpen(false); }} className="nav-menu-action"><LogIn size={17} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn-primary"><LogIn size={17} /> <span className="hidden sm:inline">Login</span></button>
          )}
        </div>
      </nav>
    </header>
    <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
      <MobileLink to="/" label="Home" icon={Home} active={location.pathname === "/"} />
      <MobileLink to={staff ? "/quiz" : "/forums"} label={staff ? "Academic Tools" : "Forum"} icon={staff ? BriefcaseBusiness : MessageSquare} active={location.pathname === (staff ? "/quiz" : "/forums")} />
      <MobileLink to="/alerts" label="Alerts" icon={Bell} active={location.pathname === "/alerts"} />
      <button aria-label={session ? "Open profile menu" : "Login"} onClick={() => session ? setProfileOpen((open) => !open) : setAuthOpen(true)} className="mobile-nav-item"><UserRound size={23} /><span>Profile</span></button>
    </nav>
    </>
  );
}

function MobileLink({ to, label, icon: Icon, active }) {
  return <Link to={to} className={`mobile-nav-item ${active ? "is-active" : ""}`}><Icon size={23} /><span>{label}</span></Link>;
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
