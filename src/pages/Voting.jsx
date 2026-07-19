import { BarChart3, CheckCircle2, Vote as VoteIcon } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

export default function Voting() {
  const { user, requireAuth, setToast } = useApp();
  const [elections, setElections] = useState([]);
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await api("/elections");
    setElections(data.elections || []);
  }

  useEffect(() => { load().catch((error) => setToast(error.message)); }, []);

  async function vote(election, candidateId) {
    if (!requireAuth()) return;
    setBusy(election.id);
    try {
      const data = await postJson(`/elections/${election.id}/vote`, { candidateId });
      setElections(data.elections || []);
      setToast(`Vote recorded for matricule ${user?.matricule}`);
    } catch (error) { setToast(error.message); }
    finally { setBusy(""); }
  }

  return <div className="page-shell"><PageHeader eyebrow="Campus Life" title="Student Voting System" description="Each registered student may vote once in every open election." /><div className="grid gap-8">{elections.map((election) => <section key={election.id} className="border-y border-slate-200 bg-white"><header className="flex flex-wrap items-start gap-4 border-b border-slate-200 p-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-navy">{election.title}</h2><StatusBadge status={election.timing} /></div>{election.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{election.description}</p>}<p className="mt-2 text-xs font-semibold text-slate-500">{new Date(election.opens_at).toLocaleString()} to {new Date(election.closes_at).toLocaleString()}</p></div>{election.results_visible ? <span className="inline-flex items-center gap-2 text-sm font-bold text-teal-800"><BarChart3 size={17} /> Statistics visible</span> : <span className="text-sm font-bold text-slate-500">Statistics hidden until voting closes</span>}</header>{election.myVote && <div className="border-b border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-950"><CheckCircle2 className="mr-2 inline" size={18} />Vote confirmed for matricule {user?.matricule}. Thank you for participating.</div>}<div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">{election.candidates.map((candidate, index) => <article key={candidate.id} className="bg-white p-5"><div className={`grid h-14 w-14 place-items-center rounded-full text-lg font-black text-white ${["bg-teal-700", "bg-amber-600", "bg-indigo-700"][index % 3]}`}>{initials(candidate.name)}</div><p className="mt-4 text-xs font-black uppercase text-slate-500">{candidate.position_title}</p><h3 className="mt-1 text-lg font-black text-navy">{candidate.name}</h3><p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">{candidate.manifesto || "Candidate statement pending."}</p><div className="mt-5 flex items-center justify-between gap-3">{election.results_visible ? <span className="text-sm font-black text-slate-700">{candidate.vote_count || 0} votes</span> : <span className="text-xs font-bold text-slate-400">Results hidden</span>}{user?.role === "student" && election.timing === "open" && <button disabled={Boolean(election.myVote) || busy === election.id} onClick={() => vote(election, candidate.id)} className="btn-primary"><VoteIcon size={17} /> Vote</button>}</div></article>)}</div></section>)}{!elections.length && <div className="panel p-10 text-center"><VoteIcon className="mx-auto text-slate-400" size={32} /><p className="mt-3 font-bold text-slate-500">No student election has been published.</p></div>}</div></div>;
}

function initials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
