import { BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, FileQuestion, FileUp, Play, Search, UploadCloud, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import QuizTimer from "../components/QuizTimer";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";
import { patchJson } from "../utils/api";

const departments = ["Business Administration", "Computer Science", "Accounting", "Banking and Finance", "Management"];

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

  async function load() {
    const [quizData, noteData] = await Promise.all([api("/quizzes"), api("/notes").catch(() => ({ notes: [] }))]);
    setQuizzes(quizData.quizzes || []);
    setNotes(noteData.notes || []);
  }

  useEffect(() => { load().catch((error) => setToast(error.message)); }, []);

  async function publishNote(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    setBusy("note");
    try {
      const data = await api("/notes", { method: "POST", body: new FormData(event.currentTarget) });
      setNotes(data.notes || []);
      event.currentTarget.reset();
      setToast("Lecture note published successfully");
    } catch (error) { setToast(error.message); } finally { setBusy(""); }
  }

  async function generate(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    setBusy("quiz");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const data = await api("/ai/evaluations/generate", { method: "POST", body: JSON.stringify(values) });
      setQuizzes(data.quizzes || []);
      setToast("AI draft generated. Review every answer before publishing.");
    } catch (error) { setToast(error.message); } finally { setBusy(""); }
  }

  async function publish(quizId) {
    try {
      const data = await patchJson(`/quizzes/${quizId}`, { status: "published" });
      setQuizzes(data.quizzes || []);
      setToast("Evaluation published to students");
    } catch (error) { setToast(error.message); }
  }

  return (
    <main className="portal-canvas">
      <div className="portal-frame max-w-5xl">
        <div className="portal-page-title">Academic Tools</div>

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
              <Field label="Course Code"><input name="courseCode" className="field" placeholder="e.g. CSC 204" required /></Field>
              <Field label="Course Title"><input name="title" className="field" placeholder="e.g. Database Management" required /></Field>
              <Field label="Difficulty"><select name="difficulty" className="field"><option>easy</option><option selected>medium</option><option>hard</option></select></Field>
              <Field label="Number of Questions"><input name="count" type="number" min="1" max="20" defaultValue="5" className="field" required /></Field>
            </div>
            <label className="grid gap-1"><span className="label">Source Lecture Note</span><select name="noteName" className="field"><option value="Course outline and lecturer guidance">Use course metadata</option>{notes.map((note) => <option key={note.id} value={note.original_name}>{note.course_code} - {note.course_title}</option>)}</select></label>
            <button disabled={busy === "quiz"} className="btn-primary w-full py-3"><Wand2 size={18} />{busy === "quiz" ? "Generating with Groq..." : "Generate editable draft"}</button>
            <p className="text-xs leading-5 text-slate-500">Generated questions remain drafts. Staff must verify the correct answer, explanation, and source section before publication.</p>
          </form>
        </ToolAccordion>

        <ToolAccordion title="My Uploaded Notes" icon={BookOpen} open={open === "uploads"} onClick={() => setOpen(open === "uploads" ? "" : "uploads")}>
          <div className="divide-y divide-slate-200 px-4 pb-4 sm:px-6">
            {notes.length ? notes.slice(0, 8).map((note) => <NoteRow key={note.id} note={note} />) : <Empty text="No lecture notes published yet." />}
          </div>
        </ToolAccordion>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-sm font-bold text-navy">Recent evaluation drafts</p>
          <div className="mt-3 divide-y divide-slate-200 border border-slate-200">
            {quizzes.slice(0, 4).map((quiz) => <div key={quiz.id} className="flex flex-wrap items-center gap-3 p-3 text-sm"><ClipboardCheck className="text-teal-700" size={21} /><span className="min-w-48 flex-1 font-semibold text-navy">{quiz.course_code || "General"} - {quiz.title}</span><span className="text-slate-500">{quiz.questions.length} MCQs · {quiz.status || "published"}</span>{quiz.status === "draft" && <button onClick={() => publish(quiz.id)} className="btn-primary px-3 py-1.5">Publish</button>}</div>)}
          </div>
        </div>
      </div>
    </main>
  );
}

function StudentEvaluation() {
  const { requireAuth, setToast } = useApp();
  const [courseCode, setCourseCode] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [searched, setSearched] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  async function search(event) {
    event.preventDefault();
    if (!requireAuth()) return;
    try {
      const normalized = courseCode.trim().toUpperCase();
      const data = await api(`/quizzes?courseCode=${encodeURIComponent(normalized)}`);
      setQuizzes(data.quizzes || []);
      setSearched(true);
    } catch (error) { setToast(error.message); }
  }

  const submit = useCallback(async () => {
    if (!activeQuiz || result) return;
    try {
      const data = await api(`/quizzes/${activeQuiz.id}/submit`, { method: "POST", body: JSON.stringify({ answers }) });
      setResult(data);
      setToast("Evaluation submitted");
    } catch (error) { setToast(error.message); }
  }, [activeQuiz, answers, result, setToast]);

  if (activeQuiz) return (
    <main className="page-shell max-w-5xl">
      <section className="panel p-4 sm:p-6">
        <div className="sticky top-[76px] z-20 -mx-4 -mt-4 mb-6 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
          <div><p className="text-xs font-bold uppercase text-teal-700">{activeQuiz.course_code || courseCode}</p><h1 className="text-lg font-extrabold text-navy">{activeQuiz.title}</h1></div>
          <QuizTimer seconds={activeQuiz.duration_seconds} active={!result} onExpire={submit} />
        </div>
        <div className="grid gap-5">
          {activeQuiz.questions.map((question, index) => (
            <fieldset key={`${question.question}-${index}`} className="border-b border-slate-200 pb-5 last:border-0">
              <legend className="font-bold leading-6 text-navy">{index + 1}. {question.question}</legend>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => <label key={optionIndex} className={`answer-option ${Number(answers[index]) === optionIndex ? "is-selected" : ""}`}><input disabled={!!result} type="radio" name={`q-${index}`} checked={Number(answers[index]) === optionIndex} onChange={() => setAnswers({ ...answers, [index]: optionIndex })} /><span>{option}</span></label>)}
              </div>
            </fieldset>
          ))}
        </div>
        {result ? <div className="mt-6 bg-emerald-50 p-6 text-center text-emerald-950"><CheckCircle2 className="mx-auto" /><p className="mt-2 text-sm font-bold">Final score</p><p className="text-4xl font-black">{result.score}/{result.total}</p><p className="font-bold">{result.percent}%</p></div> : <button onClick={submit} className="btn-primary mt-6 w-full py-3">Submit Evaluation</button>}
      </section>
    </main>
  );

  return (
    <main className="portal-canvas">
      <div className="portal-frame max-w-4xl p-5 sm:p-8">
        <p className="text-sm font-bold text-teal-700">Academics</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">Evaluation</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter the course code provided by your lecturer to find an active evaluation.</p>
        <form onSubmit={search} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1"><span className="sr-only">Course code</span><input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} className="field py-3 uppercase" placeholder="e.g. CSC 204" required /></label>
          <button className="btn-primary px-6 py-3"><Search size={18} /> Find Evaluation</button>
        </form>
        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
          {searched && !quizzes.length ? <Empty text="No active evaluation for this course" /> : quizzes.map((quiz) => <button key={quiz.id} onClick={() => { setActiveQuiz(quiz); setAnswers({}); setResult(null); }} className="flex w-full items-center gap-4 py-4 text-left"><span className="portal-icon-ring h-11 w-11"><FileQuestion size={21} /></span><span className="min-w-0 flex-1"><span className="block font-bold text-navy">{quiz.title}</span><span className="text-sm text-slate-500">{quiz.questions.length} questions · {Math.round(quiz.duration_seconds / 60)} minutes</span></span><Play size={20} className="text-teal-700" /></button>)}
        </div>
      </div>
    </main>
  );
}

function AcademicFields({ lecturer }) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Course Code"><input name="courseCode" className="field" placeholder="e.g. CSC 204" required /></Field><Field label="Course Title"><input name="courseTitle" className="field" placeholder="e.g. Database Management" required /></Field></div>
    <Field label="Department"><select name="department" className="field" required><option value="">Select Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Level"><select name="level" className="field" required><option value="">Select Level</option><option>Level 200</option><option>Level 300</option><option>Level 400</option></select></Field><Field label="Semester"><select name="semester" className="field" required><option value="">Select Semester</option><option>First Semester</option><option>Second Semester</option></select></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Academic Year"><input name="academicYear" className="field" placeholder="2026/2027" required /></Field><Field label="Lecturer"><input className="field bg-slate-50" value={lecturer || "Current staff account"} readOnly /></Field></div>
  </>;
}

function Field({ label, children }) { return <label className="grid gap-1"><span className="label">{label}</span>{children}</label>; }
function UploadField({ name, label }) { return <label className="upload-dropzone"><UploadCloud size={30} /><span className="font-bold text-navy">{label}</span><span className="text-sm text-slate-500">Drag and drop or click to browse, maximum 20 MB</span><input name={name} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" required /></label>; }
function ToolAccordion({ title, icon: Icon, open, onClick, children }) { return <section className="border-b border-slate-200"><button onClick={onClick} className="flex min-h-16 w-full items-center gap-4 px-5 text-left sm:px-6"><span className="portal-icon-ring h-10 w-10"><Icon size={21} /></span><span className="flex-1 text-base font-bold text-navy sm:text-lg">{title}</span><ChevronDown className={open ? "rotate-180" : ""} size={21} /></button>{open && children}</section>; }
function NoteRow({ note }) { return <a href={note.file_url} className="flex items-center gap-3 py-4"><BookOpen className="text-navy" /><span className="min-w-0 flex-1"><span className="block font-bold text-navy">{note.course_code}</span><span className="block truncate text-sm text-slate-500">{note.course_title} · {note.original_name}</span></span><span className="text-xs text-slate-500">{note.level}</span></a>; }
function Empty({ text }) { return <div className="py-10 text-center"><FileUp className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-500">{text}</p></div>; }
