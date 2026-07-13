import { FileQuestion, FileUp, Play, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import QuizTimer from "../components/QuizTimer";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

export default function Quiz() {
  const { viewRole, requireAuth, setToast } = useApp();
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const data = await api("/quizzes");
    setQuizzes(data.quizzes);
  }

  useEffect(() => {
    load().catch((error) => setToast(error.message));
  }, []);

  async function generate(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    setGenerating(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/quizzes/generate", { method: "POST", body: form });
      setQuizzes(data.quizzes);
      event.currentTarget.reset();
      setToast("Quiz generated from lecture note");
    } catch (error) {
      setToast(error.message);
    } finally {
      setGenerating(false);
    }
  }

  const submit = useCallback(async () => {
    if (!activeQuiz || result) return;
    try {
      const data = await api(`/quizzes/${activeQuiz.id}/submit`, { method: "POST", body: JSON.stringify({ answers }) });
      setResult(data);
      setToast("Quiz submitted");
    } catch (error) {
      setToast(error.message);
    }
  }, [activeQuiz, answers, result, setToast]);

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Academics" title="AI Quiz Generator & Execution Platform" description="Staff simulate lecture-note upload and MCQ generation while students take timed quizzes with automatic scoring." />

      {viewRole === "staff" && (
        <form onSubmit={generate} className="panel mb-8 grid gap-4 p-5 md:grid-cols-[1fr_170px_auto] md:items-end">
          <label className="grid gap-1">
            <span className="label">Lecture Note Upload</span>
            <input name="note" type="file" accept=".pdf,.doc,.docx" className="field" />
          </label>
          <label className="grid gap-1">
            <span className="label">Questions</span>
            <input name="count" type="number" min="1" max="20" defaultValue="5" className="field" />
          </label>
          <button disabled={generating} className="btn-primary"><Wand2 size={17} /> {generating ? "Generating..." : "Generate"}</button>
        </form>
      )}

      {!activeQuiz ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <article key={quiz.id} className="panel p-5">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-indigo-700 text-white"><FileQuestion /></span>
              <h2 className="mt-5 text-lg font-black">{quiz.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{quiz.questions.length} questions • {Math.round(quiz.duration_seconds / 60)} minutes</p>
              <button onClick={() => { if (requireAuth()) { setActiveQuiz(quiz); setAnswers({}); setResult(null); } }} className="btn-primary mt-5"><Play size={17} /> Start Quiz</button>
            </article>
          ))}
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="panel p-5">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-black">{activeQuiz.title}</h2>
              <QuizTimer seconds={activeQuiz.duration_seconds} active={!result} onExpire={submit} />
            </div>

            <div className="grid gap-5">
              {activeQuiz.questions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-black text-slate-950">{question.question}</p>
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${Number(answers[index]) === optionIndex ? "border-teal-700 bg-teal-50" : "border-slate-200"}`}>
                        <input disabled={!!result} type="radio" name={`q-${index}`} checked={Number(answers[index]) === optionIndex} onChange={() => setAnswers({ ...answers, [index]: optionIndex })} />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!result && <button onClick={submit} className="btn-primary mt-6">Submit Quiz</button>}
          </div>

          <aside className="panel h-fit p-5">
            <h3 className="text-lg font-black">Quiz Status</h3>
            {result ? (
              <div className="mt-4 rounded-lg bg-emerald-50 p-5 text-emerald-950">
                <p className="text-sm font-bold">Final Score</p>
                <p className="mt-2 text-4xl font-black">{result.score}/{result.total}</p>
                <p className="mt-1 font-bold">{result.percent}%</p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-amber-50 p-5 text-amber-950">
                <FileUp className="mb-3" />
                <p className="text-sm font-semibold">The timer auto-submits immediately when it reaches zero.</p>
              </div>
            )}
            <button onClick={() => setActiveQuiz(null)} className="btn-secondary mt-4 w-full">Back to Quizzes</button>
          </aside>
        </section>
      )}
    </div>
  );
}
