import { BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, Download, Eye, FileQuestion, FileUp, Play, RefreshCw, Search, Trash2, UploadCloud, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import QuizTimer from "../components/QuizTimer";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, deleteJson, patchJson } from "../utils/api";

const departments = ["Accounting and Finance", "Money and Banking", "Management", "ORGS", "Marketing", "Insurance and Security"];

export default function Quiz() {
  const { viewRole } = useApp();
  return viewRole === "staff" ? <StaffAcademicTools /> : <StudentEvaluation />;
}

function StaffAcademicTools() {
  const { user, requireAuth, setToast } = useApp();
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState("notes");
  const [aiStatus, setAiStatus] = useState(null);
  const [recordsQuiz, setRecordsQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const replaceRef = useRef(null);

  async function load() {
    const [quizData, noteData, aiData] = await Promise.all([
      api("/quizzes"),
      api("/notes").catch(() => ({ notes: [] })),
      api("/ai/ping").catch((error) => ({ ok: false, error: error.message })),
    ]);
    setQuizzes(quizData.quizzes || []);
    setNotes(noteData.notes || []);
    setAiStatus(aiData);
  }

  useEffect(() => { load().catch((error) => setToast(error.message)); }, []);

  async function publishNote(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    const formElement = event.currentTarget;
    setBusy("note");
    try {
      const data = await api("/notes", { method: "POST", body: new FormData(formElement) });
      setNotes(data.notes || []);
      formElement.reset();
      setToast("Lecture note published successfully");
      setOpen("uploads");
    } catch (error) { setToast(error.message); } finally { setBusy(""); }
  }

  async function generate(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy("quiz");
    try {
      const data = await api("/ai/evaluations/generate", { method: "POST", body: JSON.stringify(values) });
      setQuizzes(data.quizzes || []);
      setToast("AI draft generated. Review it before publishing.");
    } catch (error) { setToast(error.message); } finally { setBusy(""); }
  }

  async function publish(quizId) {
    try { const data = await patchJson(`/quizzes/${quizId}`, { status: "published" }); setQuizzes(data.quizzes || []); setToast("Evaluation published to students"); }
    catch (error) { setToast(error.message); }
  }

  async function removeEvaluation(quiz) {
    if (!confirm(`Delete ${quiz.title} and all participation records?`)) return;
    try {
      const data = await deleteJson(`/evaluations/${quiz.id}`);
      setQuizzes(data.quizzes || []);
      if (recordsQuiz?.id === quiz.id) { setRecordsQuiz(null); setAttempts([]); }
      setToast("Evaluation and its records deleted");
    } catch (error) { setToast(error.message); }
  }

  async function showRecords(quiz) {
    setBusy(`records-${quiz.id}`);
    try { const data = await api(`/evaluations/${quiz.id}/results`); setRecordsQuiz(quiz); setAttempts(data.attempts || []); setOpen("records"); }
    catch (error) { setToast(error.message); } finally { setBusy(""); }
  }

  async function removeAttempt(attempt) {
    if (!confirm(`Delete the result record for ${attempt.name || attempt.matricule}?`)) return;
    try { await deleteJson(`/evaluation-attempts/${attempt.id}`); setAttempts((current) => current.filter((item) => item.id !== attempt.id)); setToast("Participation record deleted"); }
    catch (error) { setToast(error.message); }
  }

  async function toggleNote(note) {
    try { const data = await patchJson(`/notes/${note.id}`, { status: note.status === "published" ? "unpublished" : "published" }); setNotes(data.notes || []); setToast(note.status === "published" ? "Note unpublished" : "Note published"); }
    catch (error) { setToast(error.message); }
  }

  async function removeNote(note) {
    if (!confirm(`Delete ${note.course_code} - ${note.original_name}?`)) return;
    try { const data = await deleteJson(`/notes/${note.id}`); setNotes(data.notes || []); setToast("Lecture note deleted"); }
    catch (error) { setToast(error.message); }
  }

  async function replaceNote(event) {
    const file = event.target.files?.[0];
    if (!file || !replaceTarget) return;
    const form = new FormData();
    form.append("note", file);
    setBusy(`note-${replaceTarget.id}`);
    try { const data = await api(`/notes/${replaceTarget.id}/replace`, { method: "POST", body: form }); setNotes(data.notes || []); setToast("Lecture note overwritten with a new version"); }
    catch (error) { setToast(error.message); }
    finally { event.target.value = ""; setReplaceTarget(null); setBusy(""); }
  }

  return (
    <main className="portal-canvas">
      <div className="portal-frame max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="portal-page-title border-0 p-0">Academic Tools</p><p className={`mt-1 text-xs font-bold ${aiStatus?.ok ? "text-emerald-700" : "text-amber-700"}`}>{aiStatus === null ? "Checking AI service..." : aiStatus.ok ? `Groq connected: ${aiStatus.model}` : aiStatus.error || "Groq unavailable"}</p></div><button onClick={() => load().catch((error) => setToast(error.message))} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 text-teal-800" aria-label="Refresh academic tools" title="Refresh"><RefreshCw size={18} /></button></div>

        <ToolAccordion title="Upload Lecture Notes" icon={UploadCloud} open={open === "notes"} onClick={() => setOpen(open === "notes" ? "" : "notes")}>
          <form onSubmit={publishNote} className="academic-form">
            <AcademicFields lecturer={user?.name} />
            <UploadField name="note" label="Upload PDF or DOCX" />
            <button disabled={busy === "note"} className="btn-primary w-full py-3"><UploadCloud size={18} />{busy === "note" ? "Publishing..." : "Publish Notes"}</button>
          </form>
        </ToolAccordion>

        <ToolAccordion title="Create MCQ Evaluation" icon={FileQuestion} open={open === "evaluation"} onClick={() => setOpen(open === "evaluation" ? "" : "evaluation")}>
          <form onSubmit={generate} className="academic-form">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course Code"><input name="courseCode" className="field" placeholder="e.g. ACC 204" required /></Field>
              <Field label="Course Title"><input name="title" className="field" placeholder="e.g. Financial Accounting" required /></Field>
              <Field label="Department"><select name="department" className="field" required><option value="">Select Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Level"><select name="level" className="field" required><option value="">Select Level</option><option>Level 200</option><option>Level 300</option><option>Level 400</option></select></Field>
              <Field label="Semester"><select name="semester" className="field" required><option value="">Select Semester</option><option>First Semester</option><option>Second Semester</option></select></Field>
              <Field label="Academic Year"><input name="academicYear" className="field" placeholder="2026/2027" required /></Field>
              <Field label="Difficulty"><select name="difficulty" className="field" defaultValue="medium"><option>easy</option><option>medium</option><option>hard</option></select></Field>
              <Field label="Number of Questions"><input name="count" type="number" min="1" max="20" defaultValue="5" className="field" required /></Field>
              <Field label="Test Duration (minutes)"><input name="durationMinutes" type="number" min="1" max="240" defaultValue="30" className="field" required /></Field>
              <Field label="Source Lecture Note"><select name="noteName" className="field"><option value="Course outline and lecturer guidance">Use course metadata</option>{notes.map((note) => <option key={note.id} value={note.original_name}>{note.course_code} - {note.course_title}</option>)}</select></Field>
            </div>
            <button disabled={busy === "quiz" || aiStatus?.ok === false} className="btn-primary w-full py-3"><Wand2 size={18} />{busy === "quiz" ? "Generating with Groq..." : "Generate editable draft"}</button>
            <p className="text-xs leading-5 text-slate-500">The countdown starts only when a student opens the published evaluation. Attempts are timed and scored on the server.</p>
          </form>
        </ToolAccordion>

        <ToolAccordion title="My Uploaded Notes" icon={BookOpen} open={open === "uploads"} onClick={() => setOpen(open === "uploads" ? "" : "uploads")}>
          <input ref={replaceRef} className="sr-only" type="file" accept=".pdf,.docx" onChange={replaceNote} />
          <div className="divide-y divide-slate-200 px-4 pb-4 sm:px-6">
            {notes.length ? notes.map((note) => <ManagedNoteRow key={note.id} note={note} busy={busy === `note-${note.id}`} onToggle={toggleNote} onReplace={() => { setReplaceTarget(note); replaceRef.current?.click(); }} onDelete={removeNote} />) : <Empty text="No lecture notes published yet." />}
          </div>
        </ToolAccordion>

        <ToolAccordion title="MCQ Tests and Participation Records" icon={ClipboardCheck} open={open === "records"} onClick={() => setOpen(open === "records" ? "" : "records")}>
          <div className="px-4 pb-5 sm:px-6">
            <div className="divide-y divide-slate-200 border-y border-slate-200">{quizzes.map((quiz) => <EvaluationRow key={quiz.id} quiz={quiz} busy={busy === `records-${quiz.id}`} onPublish={publish} onRecords={showRecords} onDelete={removeEvaluation} />)}{!quizzes.length && <Empty text="No MCQ tests created yet." />}</div>
            {recordsQuiz && <section className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-navy">{recordsQuiz.title}</h3><p className="text-sm text-slate-500">Student participation and scores</p></div><a className="btn-secondary" href={`/api/evaluations/${recordsQuiz.id}/export`}><Download size={16} /> Export CSV</a></div><div className="mt-4 overflow-x-auto border-y border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Student</th><th className="p-3">Matricule</th><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3">Submitted</th><th className="p-3">Action</th></tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id} className="border-t border-slate-200"><td className="p-3 font-bold">{attempt.name || "Deleted account"}</td><td className="p-3">{attempt.matricule || "-"}</td><td className="p-3"><StatusBadge status={attempt.status} /></td><td className="p-3 font-black">{attempt.score ?? "-"}/{attempt.total_marks ?? "-"}</td><td className="p-3 text-xs">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "In progress"}</td><td className="p-3"><button onClick={() => removeAttempt(attempt)} className="grid h-9 w-9 place-items-center text-rose-700" aria-label={`Delete result for ${attempt.name || attempt.matricule}`} title="Delete result"><Trash2 size={16} /></button></td></tr>)}</tbody></table>{!attempts.length && <p className="p-6 text-center text-sm text-slate-500">No student has taken this test.</p>}</div></section>}
          </div>
        </ToolAccordion>
      </div>
    </main>
  );
}

function StudentEvaluation() {
  const { requireAuth, setToast } = useApp();
  const [courseCode, setCourseCode] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [searched, setSearched] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [busy, setBusy] = useState(false);

  async function search(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    try { const normalized = courseCode.trim().toUpperCase(); const data = await api(`/quizzes?courseCode=${encodeURIComponent(normalized)}`); setQuizzes(data.quizzes || []); setSearched(true); }
    catch (error) { setToast(error.message); }
  }

  async function start(quiz) {
    setBusy(true);
    try { const data = await api(`/evaluations/${quiz.id}/start`, { method: "POST", body: JSON.stringify({}) }); setAttempt(data.attempt); }
    catch (error) { setToast(error.message); }
    finally { setBusy(false); }
  }

  async function selectAnswer(questionId, selectedOptionIndex) {
    if (!attempt || attempt.status !== "active") return;
    setAttempt((current) => ({ ...current, questions: current.questions.map((question) => question.id === questionId ? { ...question, selectedOptionIndex } : question) }));
    try { await patchJson(`/evaluation-attempts/${attempt.id}/answers`, { questionId, selectedOptionIndex }); }
    catch (error) { setToast(error.message); }
  }

  const submit = useCallback(async () => {
    if (!attempt || attempt.status !== "active" || busy) return;
    setBusy(true);
    try { const data = await api(`/evaluation-attempts/${attempt.id}/submit`, { method: "POST", body: JSON.stringify({}) }); setAttempt(data.attempt); setToast(data.attempt.status === "timed_out" ? "Time expired. Evaluation submitted." : "Evaluation submitted"); }
    catch (error) { setToast(error.message); }
    finally { setBusy(false); }
  }, [attempt, busy, setToast]);

  if (attempt) {
    const finished = attempt.status !== "active";
    const percent = finished && Number(attempt.totalMarks) > 0 ? Math.round((Number(attempt.score) / Number(attempt.totalMarks)) * 100) : 0;
    return <main className="page-shell max-w-5xl"><section className="panel p-4 sm:p-6"><div className="sticky top-[76px] z-20 -mx-4 -mt-4 mb-6 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6"><div><p className="text-xs font-bold uppercase text-teal-700">{attempt.courseCode}</p><h1 className="text-lg font-extrabold text-navy">{attempt.title}</h1></div><QuizTimer seconds={attempt.remainingSeconds} active={!finished} onExpire={submit} /></div>{attempt.instructions && <p className="mb-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">{attempt.instructions}</p>}<div className="grid gap-5">{attempt.questions.map((question, index) => <fieldset key={question.id} className="border-b border-slate-200 pb-5 last:border-0"><legend className="font-bold leading-6 text-navy">{index + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`answer-option ${Number(question.selectedOptionIndex) === optionIndex ? "is-selected" : ""}`}><input disabled={finished} type="radio" name={`q-${question.id}`} checked={Number(question.selectedOptionIndex) === optionIndex} onChange={() => selectAnswer(question.id, optionIndex)} /><span>{option}</span></label>)}</div>{finished && question.explanation && <p className="mt-3 text-sm text-slate-500">{question.explanation}</p>}</fieldset>)}</div>{finished ? <div className="mt-6 bg-emerald-50 p-6 text-center text-emerald-950"><CheckCircle2 className="mx-auto" /><p className="mt-2 text-sm font-bold">Final score</p><p className="text-4xl font-black">{attempt.score}/{attempt.totalMarks}</p><p className="font-bold">{percent}%</p><button onClick={() => setAttempt(null)} className="btn-secondary mt-4">Return to evaluations</button></div> : <button onClick={submit} disabled={busy} className="btn-primary mt-6 w-full py-3">{busy ? "Submitting..." : "Submit Evaluation"}</button>}</section></main>;
  }

  return <main className="portal-canvas"><div className="portal-frame max-w-4xl p-5 sm:p-8"><p className="text-sm font-bold text-teal-700">Academics</p><h1 className="mt-1 text-2xl font-extrabold text-navy">Evaluation</h1><p className="mt-2 text-sm leading-6 text-slate-600">Enter the course code provided by your lecturer to find an active evaluation for your department.</p><form onSubmit={search} className="mt-6 flex flex-col gap-3 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">Course code</span><input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} className="field py-3 uppercase" placeholder="e.g. ACC 204" required /></label><button className="btn-primary px-6 py-3"><Search size={18} /> Find Evaluation</button></form><div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">{searched && !quizzes.length ? <Empty text="No active evaluation for this course and department" /> : quizzes.map((quiz) => <button key={quiz.id} disabled={busy} onClick={() => start(quiz)} className="flex w-full items-center gap-4 py-4 text-left disabled:opacity-50"><span className="portal-icon-ring h-11 w-11"><FileQuestion size={21} /></span><span className="min-w-0 flex-1"><span className="block font-bold text-navy">{quiz.title}</span><span className="text-sm text-slate-500">{quiz.question_count} questions | {Math.round(quiz.duration_seconds / 60)} minutes</span></span><Play size={20} className="text-teal-700" /></button>)}</div></div></main>;
}

function AcademicFields({ lecturer }) {
  return <><div className="grid gap-4 sm:grid-cols-2"><Field label="Course Code"><input name="courseCode" className="field" placeholder="e.g. ACC 204" required /></Field><Field label="Course Title"><input name="courseTitle" className="field" placeholder="e.g. Financial Accounting" required /></Field></div><Field label="Department"><select name="department" className="field" required><option value="">Select Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Level"><select name="level" className="field" required><option value="">Select Level</option><option>Level 200</option><option>Level 300</option><option>Level 400</option></select></Field><Field label="Semester"><select name="semester" className="field" required><option value="">Select Semester</option><option>First Semester</option><option>Second Semester</option></select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Academic Year"><input name="academicYear" className="field" placeholder="2026/2027" required /></Field><Field label="Lecturer"><input className="field bg-slate-50" value={lecturer || "Current staff account"} readOnly /></Field></div></>;
}

function ManagedNoteRow({ note, busy, onToggle, onReplace, onDelete }) {
  return <div className="flex flex-wrap items-center gap-3 py-4"><BookOpen className="text-navy" /><a href={note.file_url} target="_blank" rel="noreferrer" className="min-w-48 flex-1"><span className="block font-bold text-navy">{note.course_code} - {note.course_title}</span><span className="block truncate text-sm text-slate-500">{note.department} | {note.original_name}</span></a><StatusBadge status={note.status} /><button disabled={busy} onClick={() => onToggle(note)} className="grid h-9 w-9 place-items-center text-slate-600" aria-label={note.status === "published" ? `Unpublish ${note.course_code}` : `Publish ${note.course_code}`} title={note.status === "published" ? "Unpublish" : "Publish"}><FileUp size={17} /></button><button disabled={busy} onClick={onReplace} className="grid h-9 w-9 place-items-center text-teal-800" aria-label={`Overwrite ${note.course_code}`} title="Overwrite with a new file"><UploadCloud size={17} /></button><button disabled={busy} onClick={() => onDelete(note)} className="grid h-9 w-9 place-items-center text-rose-700" aria-label={`Delete ${note.course_code}`} title="Delete"><Trash2 size={17} /></button></div>;
}

function EvaluationRow({ quiz, busy, onPublish, onRecords, onDelete }) {
  return <div className="flex flex-wrap items-center gap-3 p-3 text-sm"><ClipboardCheck className="text-teal-700" size={21} /><span className="min-w-48 flex-1"><span className="block font-semibold text-navy">{quiz.course_code || "General"} - {quiz.title}</span><span className="text-xs text-slate-500">{quiz.question_count || quiz.questions?.length || 0} MCQs | {Math.round(quiz.duration_seconds / 60)} minutes | {quiz.department || "All departments"}</span></span><StatusBadge status={quiz.status || "published"} />{quiz.status === "draft" && <button onClick={() => onPublish(quiz.id)} className="btn-primary px-3 py-1.5">Publish</button>}<button disabled={busy} onClick={() => onRecords(quiz)} className="btn-secondary px-3 py-1.5"><Eye size={15} /> Records</button><button onClick={() => onDelete(quiz)} className="grid h-9 w-9 place-items-center text-rose-700" aria-label={`Delete evaluation ${quiz.title}`} title="Delete evaluation"><Trash2 size={16} /></button></div>;
}

function Field({ label, children }) { return <label className="grid gap-1"><span className="label">{label}</span>{children}</label>; }
function UploadField({ name, label }) { return <label className="upload-dropzone"><UploadCloud size={30} /><span className="font-bold text-navy">{label}</span><span className="text-sm text-slate-500">Drag and drop or click to browse, maximum 20 MB</span><input name={name} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" required /></label>; }
function ToolAccordion({ title, icon: Icon, open, onClick, children }) { return <section className="border-b border-slate-200"><button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-4 px-5 text-left sm:px-6"><span className="portal-icon-ring h-10 w-10"><Icon size={21} /></span><span className="flex-1 text-base font-bold text-navy sm:text-lg">{title}</span><ChevronDown className={open ? "rotate-180" : ""} size={21} /></button>{open && children}</section>; }
function Empty({ text }) { return <div className="py-10 text-center"><FileUp className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-500">{text}</p></div>; }
