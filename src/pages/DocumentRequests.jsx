import { Download, FileCheck2, FileText, MessageSquareText, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

const requestTypes = ["Attestation of Completion of Studies", "Draft Transcript", "Admission Letter", "Student Attendance", "Others"];

export default function DocumentRequests() {
  const { user, setToast } = useApp();
  const [requests, setRequests] = useState([]);
  const [requestType, setRequestType] = useState(requestTypes[0]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api("/document-requests");
    setRequests(data.requests || []);
  }

  useEffect(() => { if (user?.role === "student") load().catch((error) => setToast(error.message)); }, [user?.id]);

  if (user?.role === "admin") return <main className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><FileCheck2 className="mx-auto text-teal-700" size={38} /><h1 className="mt-4 text-xl font-black text-navy">Document Request Administration</h1><Link to="/admin" className="btn-primary mt-5">Open Administration</Link></div></main>;
  if (user?.role !== "student") return <main className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><FileText className="mx-auto text-slate-400" size={38} /><h1 className="mt-4 text-xl font-black text-navy">Student document requests</h1><p className="mt-2 text-sm text-slate-500">This service is available to student accounts.</p></div></main>;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const data = await postJson("/document-requests", { requestType, details: form.get("details") });
      setRequests(data.requests || []);
      event.currentTarget.reset();
      setRequestType(requestTypes[0]);
      setToast("Document request submitted");
    } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow="Student Services" title="Document Requests" description="Request an official academic document and receive the completed PDF in your account." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="panel h-fit p-6">
          <h2 className="text-lg font-black text-navy">New Request</h2>
          <label className="mt-5 grid gap-2"><span className="label">Document Type</span><select className="field" value={requestType} onChange={(event) => setRequestType(event.target.value)}>{requestTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="mt-4 grid gap-2"><span className="label">Additional Details {requestType === "Others" ? "(required)" : "(optional)"}</span><textarea className="field min-h-28" name="details" required={requestType === "Others"} placeholder={requestType === "Others" ? "Describe the document you need" : "Add any useful information"} /></label>
          <button disabled={busy} className="btn-primary mt-5 w-full"><Send size={17} />{busy ? "Submitting..." : "Submit Request"}</button>
        </form>

        <section>
          <h2 className="mb-3 text-lg font-black text-navy">My Requests</h2>
          <div className="grid gap-3">
            {requests.map((item) => <article key={item.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-navy">{item.request_type}</h3><p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.created_at).toLocaleString()}</p></div><StatusBadge status={item.status.replace("_", " ")} /></div>
              {item.details && <p className="mt-4 text-sm leading-6 text-slate-600">{item.details}</p>}
              {item.admin_comment && <div className="mt-4 flex items-start gap-3 rounded-md bg-teal-50 p-4 text-sm text-teal-950"><MessageSquareText className="mt-0.5 shrink-0" size={17} /><p>{item.admin_comment}</p></div>}
              {item.download_url && <a className="btn-primary mt-4" href={item.download_url}><Download size={17} /> Download PDF</a>}
            </article>)}
            {!requests.length && <div className="panel p-8 text-center text-sm text-slate-500">No document requests submitted yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
