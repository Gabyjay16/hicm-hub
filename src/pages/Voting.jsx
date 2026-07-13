import { CheckCircle2, Vote as VoteIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api, postJson } from "../utils/api";

export default function Voting() {
  const { user, requireAuth, setToast } = useApp();
  const [candidates, setCandidates] = useState([]);
  const [totals, setTotals] = useState([]);
  const [myVote, setMyVote] = useState(null);

  async function load() {
    const data = await api("/votes");
    setCandidates(data.candidates);
    setTotals(data.totals);
    setMyVote(data.myVote);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function vote(candidateId) {
    if (!requireAuth()) return;
    try {
      const data = await postJson("/votes", { candidateId });
      setCandidates(data.candidates);
      setTotals(data.totals);
      setMyVote(data.myVote);
      setToast(`Vote recorded for matricule ${user?.matricule}`);
    } catch (error) {
      setToast(error.message);
    }
  }

  const totalMap = useMemo(() => Object.fromEntries(totals.map((item) => [item.candidate_id, item.total])), [totals]);

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Campus Life" title="Student Voting System" description="Matricule-based voting ensures each student can vote once only." />

      {myVote && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-950">
          <CheckCircle2 className="mr-2 inline" size={18} />
          Vote confirmed for matricule {myVote.matricule}. Thank you for participating.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {candidates.map((candidate, index) => (
          <article key={candidate.id} className="panel overflow-hidden">
            <div className={`h-28 ${["bg-teal-700", "bg-amber-600", "bg-indigo-700"][index % 3]} p-5 text-white`}>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-2xl font-black">{candidate.name.split(" ").map((part) => part[0]).join("")}</div>
            </div>
            <div className="p-5">
              <p className="text-xs font-black uppercase text-slate-500">{candidate.post}</p>
              <h2 className="mt-2 text-xl font-black">{candidate.name}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">{candidate.vision}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-black text-slate-700">{totalMap[candidate.id] || 0} votes</span>
                <button disabled={!!myVote} onClick={() => vote(candidate.id)} className="btn-primary"><VoteIcon size={17} /> Vote</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
