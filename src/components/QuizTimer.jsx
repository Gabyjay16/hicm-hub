import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function QuizTimer({ seconds, active, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);
  const deadlineRef = useRef(Date.now() + Number(seconds || 0) * 1000);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    deadlineRef.current = Date.now() + Number(seconds || 0) * 1000;
    expiredRef.current = false;
    setRemaining(Math.max(0, Number(seconds || 0)));
  }, [seconds]);

  useEffect(() => {
    if (!active) return undefined;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !expiredRef.current) { expiredRef.current = true; onExpireRef.current(); }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [active, seconds]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <div className="sticky top-20 z-20 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-black text-white shadow-soft">
      <Clock size={18} />
      {mins}:{secs}
    </div>
  );
}
