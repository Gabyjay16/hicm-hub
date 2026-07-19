import { FileUp, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, deleteJson, patchJson, postJson } from "../utils/api";

const categories = ["Mark Complaint", "Bio-Data Correction", "Others"];

export default function Complaints() {
  const { user, setToast } = useApp();
  const [complaints, setComplaints] = useState([]);
  const [fields, setFields] = useState([]);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Mark Complaint");
  const admin = user?.role === "admin";

  async function load() {
    const [complaintData, fieldData] = await Promise.all([api("/complaints"), api("/complaint-fields")]);
    setComplaints(complaintData.complaints || []); setFields(fieldData.fields || []);
  }
  useEffect(() => { load().catch((error) => setToast(error.message)); }, [user?.id]);

  async function submit(event) {
    event.preventDefault();
    try { const data = await api("/complaints", { method: "POST", body: new FormData(event.currentTarget) }); setComplaints(data.complaints); event.currentTarget.reset(); setCategory("Mark Complaint"); setStep(1); setToast("Complaint submitted"); } catch (error) { setToast(error.message); }
  }
  async function setStatus(id, status, response = "") { const data = await patchJson(`/complaints/${id}`, { status, response }); setComplaints(data.complaints); setToast("Complaint updated"); }
  async function addField(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const options = String(form.get("options") || "").split(",").map((item) => item.trim()).filter(Boolean);
    try { const data = await postJson("/admin/complaint-fields", { label: form.get("label"), fieldType: form.get("fieldType"), required: form.get("required") === "on", options }); setFields(data.fields); event.currentTarget.reset(); setToast("Complaint field added"); } catch (error) { setToast(error.message); }
  }
  async function removeField(field) { const data = await deleteJson(`/admin/complaint-fields/${field.id}`); setFields(data.fields); setToast("Complaint field removed from new forms"); }

  return <div className="page-shell"><PageHeader eyebrow="Student Services" title="Complaints Desk" description="Submit an issue and follow every response from the administration." />
    {admin ? <AdminDesk complaints={complaints} fields={fields} setStatus={setStatus} addField={addField} removeField={removeField} /> : user?.role === "student" ? <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submit} className="panel p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">New Complaint</h2><span className="badge bg-slate-100 text-slate-700">Step {step} of 2</span></div>
      <input type="hidden" name="category" value={category} />
      {step === 1 ? <div className="grid gap-4"><label className="grid gap-1"><span className="label">Category</span><select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>{category === "Mark Complaint" && <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">Mark complaints use a structured academic form on the next step.</div>}<button type="button" onClick={() => setStep(2)} className="btn-primary">Continue</button></div>
      : <div className="grid gap-4">{category === "Mark Complaint" && <><Field label="Course Name"><input className="field" name="courseName" required /></Field><Field label="Course Code"><input className="field uppercase" name="courseCode" placeholder="e.g. CSC 204" required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Year"><input className="field" name="academicYear" placeholder="e.g. 2026/2027" required /></Field><Field label="Semester"><select className="field" name="semester" required><option value="">Select semester</option><option>First Semester</option><option>Second Semester</option></select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Matricule"><input className="field bg-slate-50" value={user.matricule || ""} readOnly /></Field><Field label="Phone Number"><input className="field" name="phone" defaultValue={user.phone || ""} placeholder="e.g. 6XX XXX XXX" required /></Field></div></>}
        <Field label="Complaint details"><textarea className="field min-h-32" name="description" placeholder="Describe what happened and the outcome you need..." minLength={20} required /></Field>{fields.map((field) => <CustomField key={field.id} field={field} />)}<label className="grid gap-2 border border-dashed border-slate-300 p-4"><span className="label flex items-center gap-2"><FileUp size={17} /> Optional evidence</span><input type="file" name="proof" className="text-sm" /></label><div className="flex gap-2"><button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button><button className="btn-primary">Submit complaint</button></div></div>}
    </form><ComplaintTable complaints={complaints} /></div> : <div className="panel p-8 text-center text-slate-600">Complaint records are available to students and administrators.</div>}
  </div>;
}

function AdminDesk({ complaints, fields, setStatus, addField, removeField }) {
  return <div className="grid gap-6"><section className="panel p-5"><div className="flex items-center gap-3"><Settings2 className="text-teal-700" /><div><h2 className="text-lg font-black text-navy">Complaint form fields</h2><p className="text-sm text-slate-500">Added fields appear on every new student complaint. Removing one preserves previous answers.</p></div></div><form onSubmit={addField} className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1.4fr_auto_auto]"><input className="field" name="label" placeholder="Field label" required /><select className="field" name="fieldType"><option value="text">Short text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option></select><input className="field" name="options" placeholder="Select options, comma separated" /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="required" /> Required</label><button className="btn-primary"><Plus size={17} /> Add</button></form><div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">{fields.map((field) => <div key={field.id} className="flex items-center gap-3 py-3"><span className="flex-1 font-semibold">{field.label}</span><span className="text-xs uppercase text-slate-500">{field.field_type}{field.required ? " · required" : ""}</span><button onClick={() => removeField(field)} className="p-2 text-rose-700" aria-label={`Delete ${field.label}`}><Trash2 size={17} /></button></div>)}{!fields.length && <p className="py-4 text-sm text-slate-500">No custom fields added.</p>}</div></section>
    <section className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Student</th><th className="p-4">Category</th><th className="p-4">Academic details</th><th className="p-4">Description</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{complaints.map((item) => <AdminComplaintRow key={item.id} item={item} setStatus={setStatus} />)}</tbody></table></section></div>;
}

function AdminComplaintRow({ item, setStatus }) {
  const [response, setResponse] = useState("");
  return <tr className="border-t border-slate-200"><td className="p-4 font-bold">{item.student_name}<span className="block text-xs text-slate-500">{item.matricule}<br />{item.contact_phone}</span></td><td className="p-4">{item.category}</td><td className="p-4 text-slate-600">{item.course_name || "-"}<br />{item.course_code || ""} {item.academic_year || ""} {item.semester || ""}</td><td className="max-w-xs p-4 text-slate-600">{item.description}</td><td className="p-4"><StatusBadge status={item.status} /></td><td className="p-4"><textarea className="field min-h-16" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Response to student" /><div className="mt-2 flex gap-1">{["Reviewing", "Resolved"].map((status) => <button key={status} onClick={() => setStatus(item.id, status, response)} className="btn-secondary px-2 py-1"><RefreshCw size={13} /> {status}</button>)}</div></td></tr>;
}

function ComplaintTable({ complaints }) { return <div className="panel overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black">My Complaints</h2></div><div className="divide-y divide-slate-200">{complaints.map((item) => <div key={item.id} className="p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold">{item.category}</p><StatusBadge status={item.status} /></div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></div>)}{!complaints.length && <p className="p-6 text-sm text-slate-500">No complaints submitted yet.</p>}</div></div>; }
function Field({ label, children }) { return <label className="grid gap-1"><span className="label">{label}</span>{children}</label>; }
function CustomField({ field }) { const props = { className: "field", name: `custom_${field.id}`, required: Boolean(field.required) }; return <Field label={`${field.label}${field.required ? " *" : ""}`}>{field.field_type === "textarea" ? <textarea {...props} /> : field.field_type === "select" ? <select {...props}><option value="">Select</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input {...props} type={field.field_type} />}</Field>; }
