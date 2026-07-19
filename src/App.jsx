import { Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/voting" element={<Voting />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/thesis" element={<Thesis />} />
        </Routes>
      </main>
      <AuthModal />
      <Toast />
    </div>
  );
}
