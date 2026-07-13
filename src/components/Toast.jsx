import { useEffect } from "react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast, setToast } = useApp();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-soft">
      {toast}
    </div>
  );
}
