import { BadgeCheck, FileSearch, Search } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

export default function VerifyThesis() {
  const { user, setToast } = useApp();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user?.role !== "staff" && user?.role !== "admin") return <main className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><FileSearch className="mx-auto text-slate-400" size={38} /><h1 className="mt-4 text-xl font-black text-navy">Staff access required</h1></div></main>;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setResult(null);
    try {
      const data = await api(`/thesis/verify?code=${encodeURIComponent(String(form.get("code") || "").trim())}`);
      setResult(data.result);
    } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow="Academic Records" title="Verify Plagiarism Result" description="Validate an official HICM thesis analysis using its publication code." />
      <form onSubmit={submit} className="panel mx-auto max-w-2xl p-6">
        <label className="grid gap-2"><span className="label">Verification Code</span><div className="flex gap-2"><input className="field min-w-0 flex-1 uppercase" name="code" placeholder="HICM-PLG-XXXX-XXXX" autoComplete="off" required /><button disabled={busy} className="btn-primary"><Search size={17} />{busy ? "Checking..." : "Verify"}</button></div></label>
      </form>
      {result && <section className="panel mx-auto mt-6 max-w-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-teal-200 bg-teal-50 p-5 text-teal-950"><BadgeCheck size={25} /><div><h2 className="font-black">Verified HICM Result</h2><p className="text-xs">Published {new Date(result.published_at).toLocaleString()}</p></div></div>
        <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
          <ResultItem label="Student Name" value={result.student_name} />
          <ResultItem label="Matricule" value={result.matricule} />
          <ResultItem label="Department" value={result.department || "Not recorded"} />
          <ResultItem label="Verification Code" value={result.verification_code} mono />
          <ResultItem label="Thesis Title" value={result.thesis_title} wide />
          <ResultItem label="Plagiarism Detected" value={`${result.plagiarism_percent}%`} />
          <ResultItem label="AI Generated Content" value={`${result.ai_use_percent}%`} />
        </dl>
      </section>}
    </main>
  );
}

function ResultItem({ label, value, wide, mono }) {
  return <div className={`bg-white p-5 ${wide ? "sm:col-span-2" : ""}`}><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className={`mt-2 font-black text-navy ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
