import {
  Bell, BookOpen, Building2, CheckSquare, ClipboardCheck, FileSearch, GraduationCap,
  Landmark, MessageSquareText, Search, UploadCloud, UsersRound, Vote,
} from "lucide-react";
import { Link } from "react-router-dom";
import PortalSection, { PortalRow } from "../components/PortalSection";
import { useApp } from "../context/AppContext";

export default function Home() {
  const { session, user, viewRole, setAuthOpen } = useApp();

  if (!session) return <Welcome setAuthOpen={setAuthOpen} />;
  return viewRole === "staff" ? <StaffHome name={user?.name} /> : <StudentHome name={user?.name} />;
}

function StudentHome({ name }) {
  const firstName = name?.split(" ")[0] || "Student";

  return (
    <main className="portal-canvas">
      <div className="portal-frame">
        <div className="portal-welcome">Welcome back, {firstName}!</div>
        <Link to="/announcements" className="announcement-strip">
          <Bell size={22} className="text-teal-700" />
          <span className="min-w-0 flex-1 truncate">Exam and campus updates are available in Announcements.</span>
          <span className="font-bold text-teal-800">View all</span>
        </Link>

        <PortalSection icon={GraduationCap} title="Academics" defaultOpen>
          <PortalRow icon={ClipboardCheck} label="Evaluation" to="/quiz" />
          <PortalRow icon={BookOpen} label="Lecture Notes" to="/quiz?tab=notes" />
          <PortalRow icon={FileSearch} label="Plagiarism Test" to="/thesis" />
        </PortalSection>

        <PortalSection icon={UsersRound} title="Student Services">
          <PortalRow icon={CheckSquare} label="Complaints Desk" to="/complaints" />
          <PortalRow icon={Search} label="Lost & Found" to="/lost-found" />
        </PortalSection>

        <PortalSection icon={Landmark} title="Campus Life">
          <PortalRow icon={Bell} label="Announcements" to="/announcements" />
          <PortalRow icon={Vote} label="Student Voting" to="/voting" />
        </PortalSection>

        <Link to="/forums" className="portal-standalone-row">
          <span className="portal-icon-ring"><MessageSquareText size={24} /></span>
          <span className="flex-1 text-lg font-extrabold text-navy sm:text-xl">General Forum</span>
          <span className="portal-count">1</span>
          <span aria-hidden="true" className="text-2xl font-light">›</span>
        </Link>
      </div>
    </main>
  );
}

function StaffHome({ name }) {
  return (
    <main className="portal-canvas">
      <div className="portal-frame">
        <div className="portal-page-title">Academic Tools</div>
        <PortalSection icon={UploadCloud} title="Upload Lecture Notes" defaultOpen>
          <div className="px-4 pb-5 sm:px-6">
            <p className="mb-4 text-sm leading-6 text-slate-600">Publish a PDF or DOCX privately for the right department, level, and semester.</p>
            <Link to="/quiz?tab=notes" className="btn-primary w-full"><UploadCloud size={18} /> Open lecture note uploader</Link>
          </div>
        </PortalSection>
        <PortalSection icon={ClipboardCheck} title="Create MCQ Evaluation">
          <div className="px-4 pb-5 sm:px-6">
            <p className="mb-4 text-sm leading-6 text-slate-600">Create a course evaluation manually or generate an editable draft with Groq.</p>
            <Link to="/quiz?tab=evaluation" className="btn-primary w-full"><ClipboardCheck size={18} /> Open evaluation builder</Link>
          </div>
        </PortalSection>
        <PortalSection icon={BookOpen} title="My Uploaded Notes">
          <div className="px-4 pb-5 sm:px-6">
            <div className="recent-upload">
              <BookOpen size={24} />
              <div className="min-w-0 flex-1"><p className="font-bold text-navy">No recent upload</p><p className="text-sm text-slate-500">Your published notes will appear here.</p></div>
            </div>
          </div>
        </PortalSection>
        <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">Signed in as {name}</div>
      </div>
    </main>
  );
}

function Welcome({ setAuthOpen }) {
  return (
    <main className="portal-canvas">
      <section className="portal-frame grid min-h-[620px] place-items-center px-6 py-12 text-center">
        <div className="max-w-xl">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-sm bg-navy text-white"><Building2 size={42} /></span>
          <p className="mt-7 text-sm font-extrabold uppercase text-teal-700">Higher Institute of Commerce and Management</p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-navy sm:text-5xl">HICM Portal</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-600">Your secure place for academic tools, student services, campus notices, and the General Forum.</p>
          <button onClick={() => setAuthOpen(true)} className="btn-primary mt-7 px-7 py-3">Login or register</button>
        </div>
      </section>
    </main>
  );
}
