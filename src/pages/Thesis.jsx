import { Check, FileSearch, FileUp, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, patchJson, postJson } from "../utils/api";

export default function Thesis() {
  const { viewRole, user, requireAuth, setToast } = useApp();
  const [data, setData] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    const response = await api("/thesis");
    setData(response);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [viewRole]);

  useEffect(() => {
    const status = data?.request?.analysisJob?.status;
    if (status !== "queued" && status !== "processing") return undefined;
    const timer = setInterval(() => load().catch(() => {}), 3500);
    return () => clearInterval(timer);
  }, [data?.request?.analysisJob?.status]);

  async function submitPayment(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    const form = new FormData(event.currentTarget);
    try {
      const response = await api("/thesis/payment", { method: "POST", body: form });
      setData(response);
      setToast("Payment screenshot submitted");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function review(id, status) {
    const response = await patchJson(`/thesis/${id}`, { status });
    setData(response);
  }

  async function uploadThesis(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    setProcessing(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await api("/thesis/upload", { method: "POST", body: form });
      setData(response);
      setToast("Thesis queued for deterministic analysis");
    } catch (error) {
      setToast(error.message);
    } finally {
      setProcessing(false);
    }
  }

  async function retry(jobId) {
    try {
      const response = await postJson(`/thesis/jobs/${jobId}/retry`, {});
      setData((current) => ({ ...current, request: { ...current.request, analysisJob: response.job } }));
      setToast("Analysis queued again");
    } catch (error) { setToast(error.message); }
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Academics" title="Plagiarism Test" description="Admin-gated AI-assisted originality report with payment screenshot verification." />

      {viewRole === "staff" && user?.role === "admin" ? (
        <AdminTable requests={data?.requests || []} onReview={review} />
      ) : viewRole === "staff" ? (
        <div className="panel mx-auto max-w-2xl p-8 text-center"><ShieldAlert className="mx-auto text-teal-700" size={36} /><h2 className="mt-4 text-xl font-black text-navy">Administrator approval required</h2><p className="mt-2 text-sm leading-6 text-slate-500">Payment screenshots and thesis reports contain private student records. Ask a platform administrator when a review is required.</p></div>
      ) : (
        <StudentWorkflow request={data?.request} processing={processing} onPayment={submitPayment} onUpload={uploadThesis} onRetry={retry} />
      )}
    </div>
  );
}

function StudentWorkflow({ request, processing, onPayment, onUpload, onRetry }) {
  if (!request || request.status === "locked" || request.status === "rejected") {
    return (
      <div className="mx-auto max-w-2xl panel overflow-hidden">
        <div className="bg-slate-950 p-6 text-white">
          <ShieldAlert size={34} />
          <h2 className="mt-4 text-2xl font-black">Premium Access Required</h2>
          <p className="mt-3 leading-7 text-slate-200">
            To access the AI Plagiarism & Writing Analysis tool, please pay 3,500 Frs to the number 681597837 (Name: Brandon Judmi).
          </p>
        </div>
        <form onSubmit={onPayment} className="grid gap-4 p-6">
          {request?.status === "rejected" && <div className="rounded-lg bg-rose-50 p-4 font-bold text-rose-900">Your previous payment screenshot was rejected. Please upload a clearer screenshot.</div>}
          <label className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-5">
            <span className="label flex items-center gap-2"><FileUp size={17} /> Payment Screenshot</span>
            <input name="screenshot" type="file" accept="image/*" required />
          </label>
          <button className="btn-primary">Submit for Admin Review</button>
        </form>
      </div>
    );
  }

  if (request.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-amber-950">
        <h2 className="text-2xl font-black">Payment Under Review</h2>
        <p className="mt-3 leading-7">Your payment screenshot is under review by Admin using your Matricule. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={onUpload} className="panel h-fit p-6">
        <h2 className="text-xl font-black">Upload Thesis</h2>
        <label className="mt-5 grid min-h-48 place-items-center gap-3 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 p-6 text-center">
          <FileSearch className="text-teal-800" size={38} />
          <span className="font-bold text-teal-950">Drop or select PDF/DOCX thesis file</span>
          <input name="thesis" type="file" accept=".pdf,.doc,.docx" className="text-sm" required />
        </label>
        <button disabled={processing} className="btn-primary mt-5 w-full">{processing ? "Processing thesis..." : "Run Analysis"}</button>
      </form>

      <div className="panel p-6">
        <h2 className="text-xl font-black">Analysis Dashboard</h2>
        {request.analysisJob?.status === "queued" || request.analysisJob?.status === "processing" ? (
          <div className="mt-6"><div className="flex items-center justify-between text-sm font-bold"><span>{request.analysisJob.status === "queued" ? "Waiting for an analysis worker" : "Extracting and comparing text"}</span><span>{request.analysisJob.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-700 transition-all" style={{ width: `${request.analysisJob.progress}%` }} /></div><p className="mt-4 text-sm leading-6 text-slate-500">You may leave this page. The job continues in Cloudflare and the report will be available here when complete.</p></div>
        ) : request.analysisJob?.status === "failed" ? (
          <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-5 text-rose-950"><h3 className="font-black">Analysis could not finish</h3><p className="mt-2 text-sm leading-6">{request.analysisJob.error}</p><button onClick={() => onRetry(request.analysisJob.id)} className="btn-secondary mt-4"><RefreshCw size={16} /> Retry analysis</button></div>
        ) : request.analysis ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Circle label="Measured Internal Similarity" value={request.analysis.similarity ?? 0} color="#007f7a" />
              <div className="rounded-lg border border-slate-200 p-5"><p className="font-black text-slate-800">Evidence Summary</p><p className="mt-3 text-3xl font-black text-navy">{request.analysis.matchedShingles} / {request.analysis.totalShingles}</p><p className="mt-2 text-sm leading-6 text-slate-600">unique seven-word sequences matched the internal corpus.</p></div>
            </div>
            <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-600">{request.analysis.coverage}</p>
            <section className="mt-6"><h3 className="font-black text-navy">Matched sources</h3><div className="mt-3 grid gap-3">{request.analysis.matches?.length ? request.analysis.matches.map((match, index) => <article key={`${match.sourceName}-${index}`} className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4"><div className="flex justify-between gap-4 text-sm font-black text-amber-950"><span className="truncate">{match.sourceName}</span><span>{match.similarity}%</span></div><p className="mt-2 text-sm leading-6 text-amber-950">...{match.excerpt}...</p></article>) : <p className="text-sm text-slate-500">No internal source produced an exact seven-word match.</p>}</div></section>
            <section className="mt-6"><h3 className="font-black text-navy">Review recommendations</h3><ul className="mt-3 grid gap-2">{request.analysis.recommendations?.map((item) => <li key={item} className="rounded-md border border-slate-200 p-3 text-sm leading-6 text-slate-700">{item}</li>)}</ul></section>
          </>
        ) : (
          <div className="mt-6 rounded-lg bg-slate-50 p-6 text-slate-600">Your access is approved. Upload a thesis to generate the analysis dashboard.</div>
        )}
      </div>
    </div>
  );
}

function AdminTable({ requests, onReview }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black">Payment Verification Queue</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-4">Student</th><th className="p-4">Matricule</th><th className="p-4">Screenshot</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="p-4 font-bold">{request.student_name}</td>
                <td className="p-4">{request.matricule}</td>
                <td className="p-4">
                  {request.screenshot_url ? <img src={request.screenshot_url} alt="Payment screenshot" className="h-16 w-24 rounded-md object-cover ring-1 ring-slate-200" /> : "No screenshot"}
                </td>
                <td className="p-4"><StatusBadge status={request.status} /></td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => onReview(request.id, "approved")} className="btn-primary px-3 py-1.5"><Check size={15} /> Approve</button>
                    <button onClick={() => onReview(request.id, "rejected")} className="btn-secondary px-3 py-1.5"><X size={15} /> Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!requests.length && <tr><td className="p-6 text-slate-500" colSpan="5">No payment screenshots submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Circle({ label, value, color }) {
  const background = `conic-gradient(${color} ${value * 3.6}deg, #e2e8f0 0deg)`;
  return (
    <div className="rounded-lg border border-slate-200 p-5 text-center">
      <div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background }}>
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
          <span className="text-3xl font-black" style={{ color }}>{value}%</span>
        </div>
      </div>
      <p className="mt-4 font-black text-slate-800">{label}</p>
    </div>
  );
}
