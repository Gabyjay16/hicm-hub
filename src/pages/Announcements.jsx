import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

export default function Announcements() {
  const { viewRole, requireAuth, setToast } = useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: "", body: "" });

  async function load() {
    const data = await api("/announcements");
    setAnnouncements(data.announcements);
  }

  useEffect(() => {
    load().catch((error) => setToast(error.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    try {
      const data = await postJson("/announcements", form);
      setAnnouncements(data.announcements);
      setForm({ title: "", body: "" });
      setToast("Announcement posted");
    } catch (error) {
      setToast(error.message);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Campus Life" title="Announcements Board" description="A clean official bulletin feed for academic and administrative notices." />

      {viewRole === "staff" && (
        <form onSubmit={submit} className="panel mb-8 grid gap-4 p-5">
          <h2 className="text-lg font-black text-slate-950">Create Official Notice</h2>
          <input className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Notice title" required />
          <textarea className="field min-h-28" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Write the announcement..." required />
          <button className="btn-primary w-fit"><Send size={17} /> Post Notice</button>
        </form>
      )}

      <div className="relative grid gap-4 before:absolute before:left-4 before:top-2 before:h-full before:w-px before:bg-slate-200">
        {announcements.map((item) => (
          <article key={item.id} className="relative ml-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="absolute -left-[2.65rem] top-6 h-4 w-4 rounded-full border-4 border-white bg-teal-700 shadow" />
            <p className="text-xs font-black uppercase text-teal-700">{new Date(item.created_at).toLocaleString()}</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">{item.title}</h2>
            <p className="mt-3 leading-7 text-slate-600">{item.body}</p>
            <p className="mt-4 text-sm font-bold text-slate-500">Posted by {item.author}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
