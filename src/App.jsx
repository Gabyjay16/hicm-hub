import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import Toast from "./components/Toast";
import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import Complaints from "./pages/Complaints";
import Quiz from "./pages/Quiz";
import Voting from "./pages/Voting";
import LostFound from "./pages/LostFound";
import Forums from "./pages/Forums";
import Thesis from "./pages/Thesis";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import { useApp } from "./context/AppContext";
import StaffRegistration from "./pages/StaffRegistration";
import LectureNotes from "./pages/LectureNotes";
import StudentRegistration from "./pages/StudentRegistration";
import DocumentRequests from "./pages/DocumentRequests";
import VerifyThesis from "./pages/VerifyThesis";
import InstallAppPrompt from "./components/InstallAppPrompt";

export default function App() {
  const { offline, sessionExpired, dismissSessionExpired, setAuthOpen } = useApp();
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {offline && <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-950">You are offline. Saved server data will be available when the connection returns.</div>}
      {sessionExpired && <div role="alert" className="flex items-center justify-center gap-3 bg-rose-100 px-4 py-2 text-sm font-bold text-rose-950"><span>Your session expired.</span><button className="underline" onClick={() => { dismissSessionExpired(); setAuthOpen(true); }}>Sign in again</button></div>}
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/staff-register" element={<StaffRegistration />} />
          <Route path="/register" element={<StudentRegistration />} />
          <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
          <Route path="/complaints" element={<Protected><Complaints /></Protected>} />
          <Route path="/quiz" element={<Protected><Quiz /></Protected>} />
          <Route path="/notes" element={<Protected><LectureNotes /></Protected>} />
          <Route path="/voting" element={<Protected><Voting /></Protected>} />
          <Route path="/lost-found" element={<Protected><LostFound /></Protected>} />
          <Route path="/documents" element={<Protected><DocumentRequests /></Protected>} />
          <Route path="/forums" element={<Protected><Forums /></Protected>} />
          <Route path="/thesis" element={<Protected><Thesis /></Protected>} />
          <Route path="/verify-thesis" element={<Protected><VerifyThesis /></Protected>} />
          <Route path="/admin" element={<Protected><Admin /></Protected>} />
          <Route path="/alerts" element={<Protected><Notifications /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AuthModal />
      <InstallAppPrompt />
      <Toast />
    </div>
  );
}

function Protected({ children }) {
  const { session, loading } = useApp();
  if (loading) return <div className="page-shell text-center text-sm text-slate-500">Checking your session...</div>;
  return session ? children : <Navigate to="/" replace />;
}
