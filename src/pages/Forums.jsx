import { Hash, Send } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

export default function Forums() {
  const { channels, requireAuth, setToast, user } = useApp();
  const [active, setActive] = useState("General");
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");

  async function load(channel = active) {
    const data = await api(`/forums/${encodeURIComponent(channel)}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    load(active).catch(() => {});
  }, [active]);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    try {
      const data = await postJson(`/forums/${encodeURIComponent(active)}/messages`, { body });
      setMessages(data.messages);
      setBody("");
    } catch (error) {
      setToast(error.message);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Campus Life" title="Categorized Chat Forums" description="Modern channel-based discussion spaces for schoolwide and level-specific conversations." />

      <div className="panel grid min-h-[620px] overflow-hidden lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs font-black uppercase text-slate-500">Channels</p>
          <div className="grid gap-2">
            {(channels.length ? channels : ["General", "Level-200 (Year 1)", "Level-300 (Year 2)", "Level-400 (Year 3)"]).map((channel) => (
              <button key={channel} onClick={() => setActive(channel)} className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold ${active === channel ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-white"}`}>
                <Hash size={16} /> {channel}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col">
          <div className="border-b border-slate-200 p-4">
            <h2 className="flex items-center gap-2 text-lg font-black"><Hash size={19} /> {active}</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-white p-5">
            {messages.map((message) => {
              const mine = message.author === user?.name;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-lg p-4 ${mine ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-900"}`}>
                    <p className="text-xs font-black opacity-75">{message.author}</p>
                    <p className="mt-1 leading-6">{message.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-4">
            <input className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Message #${active}`} />
            <button className="btn-primary px-4"><Send size={18} /></button>
          </form>
        </section>
      </div>
    </div>
  );
}
