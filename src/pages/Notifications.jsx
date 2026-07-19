import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { patchJson, postJson } from "../utils/api";

export default function Notifications() {
  const { session, requireAuth, refreshNotifications, setToast } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) {
      setLoading(false);
      return;
    }
    const data = await refreshNotifications();
    setItems(data.notifications || []);
    setLoading(false);
  }

  useEffect(() => { load().catch((error) => { setToast(error.message); setLoading(false); }); }, [session?.user?.id]);

  async function markRead(item) {
    if (item.read_at) return;
    const data = await patchJson(`/notifications/${item.id}`, {});
    setItems(data.notifications || []);
    await refreshNotifications();
  }

  async function readAll() {
    const data = await postJson("/notifications/read-all", {});
    setItems(data.notifications || []);
    await refreshNotifications();
  }

  if (!session) return <div className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><Bell className="mx-auto text-teal-700" size={36} /><h1 className="mt-4 text-2xl font-black">Your alerts are private</h1><button onClick={requireAuth} className="btn-primary mt-5">Sign in to view alerts</button></div></div>;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Account" title="Notifications" description="Status updates, official notices, and replies addressed to your account." />
      <div className="mb-4 flex justify-end"><button onClick={readAll} className="btn-secondary"><CheckCheck size={17} /> Mark all read</button></div>
      <div className="panel divide-y divide-slate-200 overflow-hidden">
        {loading && <p className="p-6 text-sm text-slate-500">Loading notifications...</p>}
        {!loading && items.map((item) => (
          <article key={item.id} onClick={() => markRead(item)} className={`flex gap-4 p-5 ${item.read_at ? "bg-white" : "bg-teal-50"}`}>
            <span className="portal-icon-ring h-10 w-10"><Bell size={18} /></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-navy">{item.title}</h2>{!item.read_at && <span className="badge bg-teal-700 text-white">New</span>}</div><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div>
            {item.deep_link && <Link to={item.deep_link} onClick={() => markRead(item)} className="grid h-9 w-9 place-items-center text-teal-800" aria-label={`Open ${item.title}`}><ExternalLink size={18} /></Link>}
          </article>
        ))}
        {!loading && !items.length && <div className="p-10 text-center text-slate-500">No notifications yet.</div>}
      </div>
    </div>
  );
}
