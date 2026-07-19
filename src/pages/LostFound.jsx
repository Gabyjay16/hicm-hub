import { CheckCircle2, Image as ImageIcon, MapPin, MessageSquareText, Phone, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api, patchJson } from "../utils/api";

export default function LostFound() {
  const { setToast, user } = useApp();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("LOST");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    const data = await api("/lost-found");
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((error) => setToast(error.message));
    const timer = setInterval(() => load().catch(() => {}), 60000);
    return () => clearInterval(timer);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => item.type === filter && (!needle || [item.title, item.location, item.description].some((value) => String(value || "").toLowerCase().includes(needle))));
  }, [items, filter, query]);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    try {
      const data = await api("/lost-found", { method: "POST", body: new FormData(formElement) });
      setItems(data.items || []); setFilter(formElement.elements.namedItem("type").value); setFormOpen(false); formElement.reset();
      setToast("Item added to Lost & Found");
    } catch (error) { setToast(error.message); }
    finally { setSubmitting(false); }
  }

  async function markFound(item) {
    try {
      const data = await patchJson(`/lost-found/${item.id}`, { status: "resolved" });
      setItems(data.items || []);
      setToast("Item marked as found. It will be deleted after one hour.");
    } catch (error) { setToast(error.message); }
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Student Services" title="Lost & Found" description="Report missing property, share found items, and contact the student who posted them.">
        {user?.role === "student" && <button onClick={() => setFormOpen((open) => !open)} className="btn-primary">{formOpen ? <X size={17} /> : <Plus size={17} />}{formOpen ? "Close" : "Add Item"}</button>}
      </PageHeader>

      {formOpen && <form onSubmit={submit} className="mb-7 grid gap-4 border-y border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1"><span className="label">Report type</span><select className="field" name="type" defaultValue="LOST"><option value="LOST">Missing item</option><option value="FOUND">Found item</option></select></label>
        <label className="grid gap-1 sm:col-span-1 lg:col-span-2"><span className="label">Item title</span><input className="field" name="title" placeholder="e.g. Black scientific calculator" required /></label>
        <label className="grid gap-1"><span className="label">Date</span><input className="field" name="itemDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
        <label className="grid gap-1 sm:col-span-2"><span className="label">Location</span><input className="field" name="location" placeholder="Where it was lost or found" required /></label>
        <label className="grid gap-1"><span className="label">Contact</span><select className="field" name="contactPreference" defaultValue="phone"><option value="phone">Phone number</option><option value="in-app">In-app contact</option></select></label>
        <label className="grid gap-1"><span className="label">Picture</span><input className="field" name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="grid gap-1 sm:col-span-2 lg:col-span-4"><span className="label">Description</span><textarea className="field min-h-24" name="description" placeholder="Colour, brand, identifying details, and where you last saw it" required /></label>
        <button disabled={submitting} className="btn-primary sm:col-span-2 lg:col-span-1">{submitting ? "Publishing..." : "Publish Item"}</button>
      </form>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-md border border-slate-200 bg-white p-1">
          {["LOST", "FOUND"].map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-md px-4 py-2 text-sm font-black ${filter === tab ? "bg-teal-700 text-white" : "text-slate-700"}`}>{tab === "LOST" ? "MISSING" : "FOUND"}</button>)}
        </div>
        <label className="relative w-full sm:max-w-xs"><span className="sr-only">Search items</span><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items or locations" /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => <ItemCard key={item.id} item={item} mine={item.user_id === user?.id} onMarkFound={markFound} />)}
      </div>
      {!visible.length && <div className="border-y border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No matching {filter === "LOST" ? "missing" : "found"} items.</div>}
    </div>
  );
}

function ItemCard({ item, mine, onMarkFound }) {
  return <article className="panel overflow-hidden">
    <div className="grid aspect-[4/3] place-items-center bg-slate-100 text-slate-400">
      {item.image_url ? <img className="h-full w-full object-cover" src={item.image_url} alt={item.title} /> : <ImageIcon size={42} />}
    </div>
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className={`badge ${item.status === "resolved" ? "bg-teal-100 text-teal-900" : item.type === "LOST" ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900"}`}>{item.status === "resolved" ? "FOUND" : item.type}</span>{item.status === "resolved" && <Expiry expiresAt={item.expires_at} />}</div>
      <h2 className="mt-3 text-lg font-black text-navy">{item.title}</h2>
      <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 shrink-0" size={16} /> {item.location}</p>
      {item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.description}</p>}
      <p className="mt-3 text-xs font-semibold text-slate-400">Posted by {item.owner_name || "HICM student"}</p>
      {item.status === "active" && <div className="mt-4 grid gap-2">{item.contact_preference === "phone" && item.contact && <a href={`tel:${item.contact}`} className="btn-secondary w-full"><Phone size={16} /> Contact</a>}{item.contact_preference !== "phone" && <a href="/forums" className="btn-secondary w-full"><MessageSquareText size={16} /> Open Forums</a>}{mine && item.type === "LOST" && <button onClick={() => onMarkFound(item)} className="btn-primary w-full"><CheckCircle2 size={17} /> Mark as Found</button>}</div>}
    </div>
  </article>;
}

function Expiry({ expiresAt }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(expiresAt) - Date.now()));
  useEffect(() => { const timer = setInterval(() => setRemaining(Math.max(0, Date.parse(expiresAt) - Date.now())), 30000); return () => clearInterval(timer); }, [expiresAt]);
  const minutes = Math.max(1, Math.ceil(remaining / 60000));
  return <span className="text-[11px] font-bold text-slate-500">Removes in {minutes}m</span>;
}
