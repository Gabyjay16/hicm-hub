import { Archive, ImagePlus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api, deleteJson, patchJson } from "../utils/api";

export default function Announcements() {
  const { setToast } = useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [permissions, setPermissions] = useState({ canCreate: false, canManageAll: false });
  function applyData(data) { setAnnouncements(data.announcements || []); setPermissions(data.permissions || { canCreate: false, canManageAll: false }); }
  async function load() { applyData(await api("/announcements")); }
  useEffect(() => { load().catch((error) => setToast(error.message)); }, []);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { const data = await api("/announcements", { method: "POST", body: form }); applyData(data); event.currentTarget.reset(); setToast("Announcement published"); } catch (error) { setToast(error.message); }
  }
  async function archive(item) { try { applyData(await patchJson(`/announcements/${item.id}`, { title: item.title, body: item.body, status: "archived", publishAt: item.publish_at })); setToast("Announcement archived"); } catch (error) { setToast(error.message); } }
  async function remove(item) { if (!confirm(`Delete "${item.title}"?`)) return; try { applyData(await deleteJson(`/announcements/${item.id}`)); setToast("Announcement deleted"); } catch (error) { setToast(error.message); } }

  return <div className="page-shell"><PageHeader eyebrow="Campus Life" title="Announcements" description="Official academic and administrative notices." />
    {permissions.canCreate && <form onSubmit={submit} className="panel mb-8 grid gap-4 p-5"><h2 className="text-lg font-black text-navy">Publish announcement</h2><label className="grid gap-1"><span className="label">Title</span><input className="field" name="title" required /></label><label className="grid gap-1"><span className="label">Message</span><textarea className="field min-h-28" name="body" required /></label><label className="upload-dropzone"><ImagePlus size={28} /><span className="font-bold">Add a picture or video</span><span className="text-xs text-slate-500">JPG, PNG, WebP, MP4, or WebM</span><input className="sr-only" type="file" name="media" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" /></label><input type="hidden" name="status" value="published" /><button className="btn-primary w-fit"><Send size={17} /> Publish</button></form>}
    <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">{announcements.map((item) => <article key={item.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-teal-700">{item.status} | {new Date(item.publish_at || item.created_at).toLocaleString()}</p><h2 className="mt-2 text-xl font-black text-navy">{item.title}</h2></div>{item.can_manage && <div className="flex gap-1"><button className="p-2 text-slate-500 hover:text-teal-700" aria-label="Archive announcement" onClick={() => archive(item)}><Archive size={18} /></button><button className="p-2 text-slate-500 hover:text-rose-700" aria-label="Delete announcement" onClick={() => remove(item)}><Trash2 size={18} /></button></div>}</div><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{item.body}</p>{item.media_url && (item.media_type?.startsWith("video/") ? <video className="mt-4 max-h-[480px] w-full bg-black" controls src={item.media_url} /> : <img className="mt-4 max-h-[560px] w-full object-contain" src={item.media_url} alt={item.title} />)}</article>)}</div>
  </div>;
}
