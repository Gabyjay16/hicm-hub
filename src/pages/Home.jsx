import { ArrowRight, Bell, FileCheck2, MessageCircle, Search, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

const modules = [
  { title: "Announcements", text: "Official notices from academic and administrative staff.", to: "/announcements", icon: Bell, color: "bg-teal-700" },
  { title: "Complaints Desk", text: "Submit and track academic, bio-data, or confidential complaints.", to: "/complaints", icon: FileCheck2, color: "bg-rose-700" },
  { title: "AI Quiz Platform", text: "Staff generate MCQs; students take timed tests with auto-submit.", to: "/quiz", icon: Search, color: "bg-indigo-700" },
  { title: "Student Voting", text: "One vote per matricule with immediate confirmation.", to: "/voting", icon: Vote, color: "bg-amber-600" },
  { title: "Chat Forums", text: "Level-based channels for useful academic discussion.", to: "/forums", icon: MessageCircle, color: "bg-emerald-700" },
  { title: "Thesis Analysis", text: "Premium admin-approved plagiarism and AI writing insights.", to: "/thesis", icon: FileCheck2, color: "bg-slate-800" },
];

export default function Home() {
  const { session, viewRole, setAuthOpen } = useApp();

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="page-shell grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-teal-700">HICM University digital campus</p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Academic tools, student services, and campus life in one functional hub.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              HICM HUB runs as a Cloudflare Pages application with server-side data, secure session cookies, D1 records, and R2-backed file uploads.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {session ? (
                <Link to="/announcements" className="btn-primary">Open Dashboard <ArrowRight size={18} /></Link>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="btn-primary">Login / Register <ArrowRight size={18} /></button>
              )}
              <span className="inline-flex items-center rounded-md bg-amber-50 px-4 py-2 text-sm font-black text-amber-900">
                Current mode: {viewRole === "staff" ? "Staff/Admin" : "Student"}
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-stone-50 p-4">
            <div className="rounded-lg bg-teal-700 p-6 text-white">
              <p className="text-sm font-bold uppercase text-teal-100">Live Portal Snapshot</p>
              <p className="mt-6 text-3xl font-black">8 connected services</p>
              <p className="mt-2 text-teal-50">Built for students, lecturers, and administrators.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Storage" value="D1 + R2" />
              <Metric label="Hosting" value="Pages" />
              <Metric label="Auth" value="Cookie" />
              <Metric label="Build" value="/dist" />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.title} to={module.to} className="panel group p-5 transition hover:-translate-y-1 hover:shadow-soft">
                <span className={`mb-5 grid h-12 w-12 place-items-center rounded-lg text-white ${module.color}`}>
                  <Icon size={23} />
                </span>
                <h2 className="text-lg font-black text-slate-950">{module.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{module.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-teal-700">
                  Open <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
