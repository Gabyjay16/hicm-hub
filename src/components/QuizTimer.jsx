import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function QuizTimer({ seconds, active, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!active) return undefined;
    if (remaining <= 0) {
      onExpire();
      return undefined;
    }
    const timer = setTimeout(() => setRemaining((time) => time - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, active, onExpire]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <div className="sticky top-20 z-20 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-black text-white shadow-soft">
      <Clock size={18} />
      {mins}:{secs}
    </div>
  );
}
