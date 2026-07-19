import { Flag, Hash, MessageSquareText, Reply, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

export const forumLinkPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s)/i;

export default function Forums() {
  const { channels, requireAuth, setToast, user } = useApp();
  const availableChannels = channels.length ? channels : ["General", "Level-200 (Year 1)", "Level-300 (Year 2)", "Level-400 (Year 3)"];
  const [channel, setChannel] = useState("General");
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({ links_enabled: 0 });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  async function load(reset = false) {
    const last = !reset && messages[messages.length - 1]?.created_at;
    const data = await api(`/forums/${encodeURIComponent(channel)}/messages${last ? `?after=${encodeURIComponent(last)}` : ""}`);
    setSettings(data.settings || {});
    setMessages((current) => last ? mergeMessages(current, data.messages || []) : data.messages || []);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    setMessages([]); setLoading(true); setError(""); setReplyTo(null);
    load(true).catch((loadError) => { setError(loadError.message); setLoading(false); });
  }, [channel, user?.id]);

  useEffect(() => {
    const timer = setInterval(() => load(false).catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, [channel, messages.length]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    if (!settings.links_enabled && forumLinkPattern.test(body)) { setToast("Links are disabled in this forum channel."); return; }
    try {
      const data = await postJson(`/forums/${encodeURIComponent(channel)}/messages`, { body: body.trim(), parentMessageId: replyTo?.id });
      setMessages(data.messages || []); setBody(""); setReplyTo(null);
    } catch (submitError) { setToast(submitError.message); }
  }

  async function report(message) {
    try {
      await postJson(`/forums/messages/${message.id}/report`, { reason: "Inappropriate or unsafe content" });
      setToast("Message reported to an administrator");
    } catch (reportError) { setToast(reportError.message); }
  }

  return (
    <main className="portal-canvas">
      <div className="portal-frame forum-layout min-h-[calc(100vh-132px)] max-w-6xl sm:min-h-[680px]">
        <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5"><span className="portal-icon-ring h-10 w-10"><MessageSquareText size={20} /></span><div><h1 className="font-extrabold text-navy">Forums</h1><p className="text-xs text-slate-500">HICM channels</p></div></div>
          <nav className="flex gap-2 overflow-x-auto p-3 lg:grid" aria-label="Forum channels">{availableChannels.map((item) => <button key={item} onClick={() => setChannel(item)} className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-bold ${channel === item ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-white"}`}><Hash size={16} />{item}</button>)}</nav>
        </aside>
        <section className="flex min-h-0 flex-col">
          <header className="border-b border-slate-200 px-5 py-4"><h2 className="font-extrabold text-navy">#{channel}</h2><p className="text-xs text-slate-500">Replies notify the original author</p></header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7" aria-live="polite">
            {loading && <p className="text-center text-sm text-slate-500">Loading conversation...</p>}
            {error && <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">{error}</div>}
            {!loading && !error && messages.map((message) => {
              const mine = message.user_id === user?.id;
              return <article key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] rounded-md px-4 py-3 sm:max-w-[76%] ${mine ? "bg-teal-700 text-white" : "bg-slate-100 text-navy"}`}>{message.parent_message_id && <div className={`mb-2 border-l-2 pl-2 text-xs ${mine ? "border-white/60 text-white/80" : "border-teal-700 text-slate-500"}`}><b>{message.parent_author}</b><p className="truncate">{message.parent_body}</p></div>}<p className="text-xs font-bold opacity-70">{message.author}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><div className={`mt-2 flex gap-3 text-xs font-bold opacity-0 transition group-hover:opacity-80 focus-within:opacity-80 ${mine ? "justify-end" : ""}`}><button onClick={() => setReplyTo(message)} className="inline-flex items-center gap-1"><Reply size={13} /> Reply</button>{!mine && message.user_id !== "system" && <button onClick={() => report(message)} className="inline-flex items-center gap-1"><Flag size={13} /> Report</button>}</div></div></article>;
            })}
            <div ref={endRef} />
          </div>
          {replyTo && <div className="flex items-center gap-3 border-t border-slate-200 bg-teal-50 px-4 py-2 text-xs text-teal-950"><Reply size={14} /><span className="min-w-0 flex-1 truncate">Replying to <b>{replyTo.author}</b>: {replyTo.body}</span><button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={16} /></button></div>}
          <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-4"><label className="min-w-0 flex-1"><span className="sr-only">Message {channel}</span><input className="field py-3" value={body} maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? `Reply to ${replyTo.author}` : "Write a message"} /></label><button className="btn-primary h-11 w-11 px-0" aria-label="Send message"><Send size={18} /></button></form>
        </section>
      </div>
    </main>
  );
}

function mergeMessages(current, incoming) {
  const seen = new Set(current.map((message) => message.id));
  return [...current, ...incoming.filter((message) => !seen.has(message.id))];
}
