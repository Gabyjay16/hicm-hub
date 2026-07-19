import { MessageSquareText, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

const linkPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s)/i;

export default function Forums() {
  const { requireAuth, setToast, user } = useApp();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  async function load() {
    const data = await api("/forums/General/messages");
    setMessages(data.messages || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
    const timer = setInterval(() => load().catch(() => {}), 12000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    if (linkPattern.test(body)) { setToast("Links are not allowed in the General Forum."); return; }
    try {
      const data = await postJson("/forums/General/messages", { body: body.trim() });
      setMessages(data.messages || []);
      setBody("");
    } catch (error) { setToast(error.message); }
  }

  return (
    <main className="portal-canvas">
      <div className="portal-frame flex min-h-[calc(100vh-132px)] max-w-4xl flex-col sm:min-h-[680px]">
        <header className="flex items-center gap-4 border-b border-slate-200 px-5 py-4">
          <span className="portal-icon-ring h-11 w-11"><MessageSquareText size={22} /></span>
          <div><h1 className="text-lg font-extrabold text-navy">General Forum</h1><p className="text-xs text-slate-500">Campus-wide conversation</p></div>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7" aria-live="polite">
          {loading ? <p className="text-center text-sm text-slate-500">Loading conversation...</p> : messages.map((message) => {
            const mine = message.author === user?.name;
            return <article key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-md px-4 py-3 sm:max-w-[72%] ${mine ? "bg-teal-700 text-white" : "bg-slate-100 text-navy"}`}><p className="text-xs font-bold opacity-70">{message.author}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p></div></article>;
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-4">
          <label className="min-w-0 flex-1"><span className="sr-only">Message General Forum</span><input className="field py-3" value={body} maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder="Write a message" /></label>
          <button className="btn-primary h-11 w-11 px-0" aria-label="Send message"><Send size={18} /></button>
        </form>
      </div>
    </main>
  );
}
