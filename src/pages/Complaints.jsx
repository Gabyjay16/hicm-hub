import { FileUp, LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, patchJson } from "../utils/api";

const categories = ["Mark Complaint", "Bio-Data Correction", "Sexual Harassment"];

export default function Complaints() {
  const { viewRole, requireAuth, setToast } = useApp();
  const [complaints, setComplaints] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ category: "Mark Complaint", description: "", proof: null });

  async function load() {
    const data = await api("/complaints");
    setComplaints(data.complaints);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [viewRole]);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    const data = new FormData();
    data.append("category", form.category);
    data.append("description", form.description);
    if (form.proof) data.append("proof", form.proof);
    try {
      const response = await api("/complaints", { method: "POST", body: data });
      setComplaints(response.complaints);
      setForm({ category: "Mark Complaint", description: "", proof: null });
      setStep(1);
      setToast("Complaint submitted");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function setStatus(id, status) {
    const data = await patchJson(`/complaints/${id}`, { status });
    setComplaints(data.complaints);
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Student Services" title="Complaints Desk" description="Submit trackable tickets, including confidential sexual harassment reports with protected proof uploads." />

      {viewRole === "student" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submit} className="panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">New Complaint</h2>
              <span className="badge bg-slate-100 text-slate-700">Step {step} of 2</span>
            </div>

            {step === 1 ? (
              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="label">Category</span>
                  <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                {form.category === "Sexual Harassment" && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">
                    <span className="badge bg-rose-700 text-white"><LockKeyhole size={13} className="mr-1" /> Strictly Confidential</span>
                    <p className="mt-2 text-sm leading-6">This ticket is visible only in admin review and should include proof if available.</p>
                  </div>
                )}
                <button type="button" onClick={() => setStep(2)} className="btn-primary">Continue</button>
              </div>
            ) : (
              <div className="grid gap-4">
                <textarea className="field min-h-32" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the issue clearly..." required />
                {form.category === "Sexual Harassment" && (
                  <label className="grid gap-2 rounded-lg border border-dashed border-rose-300 bg-rose-50 p-4">
                    <span className="label flex items-center gap-2 text-rose-900"><FileUp size={17} /> Proof Upload</span>
                    <input type="file" className="text-sm" onChange={(event) => setForm({ ...form, proof: event.target.files?.[0] })} />
                  </label>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                  <button className="btn-primary">Submit Ticket</button>
                </div>
              </div>
            )}
          </form>

          <ComplaintTable complaints={complaints} />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-black">Admin Ticket Dashboard</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="p-4">Student</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {complaints.map((item) => (
                  <tr key={item.id}>
                    <td className="p-4 font-bold">{item.student_name}<span className="block text-xs text-slate-500">{item.matricule}</span></td>
                    <td className="p-4">{item.category}</td>
                    <td className="p-4 text-slate-600">{item.description}</td>
                    <td className="p-4"><StatusBadge status={item.status} /></td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {["Pending", "Reviewing", "Resolved"].map((status) => <button key={status} onClick={() => setStatus(item.id, status)} className="btn-secondary px-3 py-1.5"><RefreshCw size={14} /> {status}</button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplaintTable({ complaints }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black">My Submitted Complaints</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Progress</th><th className="p-4">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {complaints.map((item) => (
              <tr key={item.id}>
                <td className="p-4 font-bold">{item.category}</td>
                <td className="p-4 text-slate-600">{item.description}</td>
                <td className="p-4"><StatusBadge status={item.status} /></td>
                <td className="p-4 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!complaints.length && <tr><td className="p-6 text-slate-500" colSpan="4">No complaints submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
