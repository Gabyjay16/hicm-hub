import { BookOpen, Download, Eye, FileUp, Search, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, deleteJson, patchJson } from "../utils/api";

export default function LectureNotes() {
  const { user, setToast } = useApp();
  const [notes, setNotes] = useState([]);
  const [filters, setFilters] = useState({ q: "", department: "", level: "", semester: "", academicYear: "" });
  const [loading, setLoading] = useState(true);
  const replaceRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const canManage = user?.role === "staff" || user?.role === "admin";

  async function load(next = filters) {
    setLoading(true);
    try { const params = new URLSearchParams(Object.entries(next).filter(([, value]) => value)); const data = await api(`/notes?${params}`); setNotes(data.notes || []); } finally { setLoading(false); }
  }
  useEffect(() => { load().catch((error) => setToast(error.message)); }, [user?.id]);

  async function search(event) { event.preventDefault(); try { await load(); } catch (error) { setToast(error.message); } }
  async function toggle(note) { const data = await patchJson(`/notes/${note.id}`, { status: note.status === "published" ? "unpublished" : "published" }); setNotes(data.notes); setToast(note.status === "published" ? "Note unpublished" : "Note published"); }
  async function remove(note) { if (!confirm(`Delete ${note.course_code} - ${note.original_name}?`)) return; const data = await deleteJson(`/notes/${note.id}`); setNotes(data.notes); setToast("Lecture note deleted"); }
  async function replace(event) { const file = event.target.files?.[0]; if (!file || !replaceTarget) return; const form = new FormData(); form.append("note", file); try { const data = await api(`/notes/${replaceTarget.id}/replace`, { method: "POST", body: form }); setNotes(data.notes); setToast("Lecture note replaced"); } catch (error) { setToast(error.message); } finally { event.target.value = ""; setReplaceTarget(null); } }

  return <div className="page-shell"><PageHeader eyebrow="Academics" title="Lecture Notes" description="Search published course material and open it securely from the portal." />
    <form onSubmit={search} className="mb-6 grid gap-3 border-y border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"><label className="lg:col-span-2"><span className="sr-only">Search notes</span><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input className="field pl-10" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Course code, title, or lecturer" /></div></label><Filter label="Department" value={filters.department} onChange={(value) => setFilters({ ...filters, department: value })} options={["Computer Science", "Business Administration", "Accounting", "Banking and Finance", "Management"]} /><Filter label="Level" value={filters.level} onChange={(value) => setFilters({ ...filters, level: value })} options={["Level 200", "Level 300", "Level 400"]} /><Filter label="Semester" value={filters.semester} onChange={(value) => setFilters({ ...filters, semester: value })} options={["First Semester", "Second Semester"]} /><button className="btn-primary"><Search size={17} /> Search</button></form>
    <input ref={replaceRef} className="sr-only" type="file" accept=".pdf,.docx" onChange={replace} />
    <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Course</th><th className="p-4">Lecturer</th><th className="p-4">Class</th><th className="p-4">File</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{!loading && notes.map((note) => <tr className="border-t border-slate-200" key={note.id}><td className="p-4"><p className="font-black text-navy">{note.course_code}</p><p className="text-slate-500">{note.course_title}</p></td><td className="p-4">{note.lecturer_name}</td><td className="p-4 text-slate-600">{note.level}<br />{note.semester} · {note.academic_year}</td><td className="p-4"><BookOpen className="mr-2 inline text-teal-700" size={17} />{note.original_name}</td><td className="p-4"><StatusBadge status={note.status || (note.published ? "published" : "unpublished")} /></td><td className="p-4"><div className="flex items-center gap-1"><a className="p-2 text-teal-800" href={note.file_url} target="_blank" rel="noreferrer" aria-label="View note"><Eye size={18} /></a><a className="p-2 text-teal-800" href={note.download_url} aria-label="Download note"><Download size={18} /></a>{canManage && <><button className="p-2 text-slate-600" onClick={() => toggle(note)} aria-label={note.status === "published" ? "Unpublish note" : "Publish note"}><FileUp size={18} /></button><button className="p-2 text-slate-600" onClick={() => { setReplaceTarget(note); replaceRef.current?.click(); }} aria-label="Replace note"><UploadCloud size={18} /></button><button className="p-2 text-rose-700" onClick={() => remove(note)} aria-label="Delete note"><Trash2 size={18} /></button></>}</div></td></tr>)}</tbody></table>{loading && <p className="p-8 text-center text-sm text-slate-500">Loading lecture notes...</p>}{!loading && !notes.length && <p className="p-8 text-center text-sm text-slate-500">No lecture notes match this search.</p>}</div>
  </div>;
}

function Filter({ label, value, onChange, options }) { return <label><span className="sr-only">{label}</span><select className="field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All {label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
