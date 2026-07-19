import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

export default function InstallAppPrompt() {
  const { session } = useApp();
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const ready = (event) => { event.preventDefault(); setPromptEvent(event); };
    const installed = () => { setPromptEvent(null); setDismissed(true); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!session || standalone || dismissed || (!promptEvent && !ios)) return null;

  async function install() {
    if (promptEvent) {
      const result = await promptEvent.prompt();
      if (result.outcome === "accepted") setDismissed(true);
      setPromptEvent(null);
      return;
    }
    setIosHelp(true);
  }

  return <>
    <aside className="fixed bottom-[84px] left-3 right-3 z-40 flex items-center gap-3 rounded-lg border border-teal-200 bg-white p-3 shadow-soft sm:left-auto sm:right-5 sm:w-[360px] lg:bottom-5" aria-label="Install HICM Portal">
      <img src="/icon.svg" alt="" className="h-11 w-11 rounded-md" />
      <div className="min-w-0 flex-1"><p className="text-sm font-black text-navy">Install HICM Portal</p><p className="text-xs text-slate-500">Open it from your phone home screen.</p></div>
      <button onClick={install} className="btn-primary px-3"><Download size={16} /> Install</button>
      <button onClick={() => setDismissed(true)} className="grid h-9 w-9 shrink-0 place-items-center text-slate-500" aria-label="Dismiss install prompt" title="Dismiss"><X size={17} /></button>
    </aside>
    {iosHelp && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="ios-install-title"><div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-soft"><div className="flex items-start justify-between gap-4"><div><h2 id="ios-install-title" className="text-lg font-black text-navy">Install on iPhone or iPad</h2><p className="mt-2 text-sm leading-6 text-slate-600">In Safari, tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</p></div><button onClick={() => setIosHelp(false)} className="grid h-9 w-9 shrink-0 place-items-center text-slate-500" aria-label="Close"><X size={18} /></button></div><div className="mt-5 flex items-center gap-3 rounded-md bg-teal-50 p-4 text-sm font-bold text-teal-950"><Share size={20} /> Share, then Add to Home Screen</div></div></div>}
  </>;
}
