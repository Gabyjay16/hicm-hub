import { GraduationCap, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const departments = [
  "Accounting and Finance",
  "Money and Banking",
  "Management",
  "ORGS",
  "Marketing",
  "Insurance and Security",
];

export default function StudentRegistration() {
  const { authenticate, setAuthOpen, setToast } = useApp();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) { setToast("The passwords do not match."); return; }
    setBusy(true);
    try {
      await authenticate({
        mode: "student-register",
        name: form.get("name"),
        matricule: form.get("matricule"),
        phone: form.get("phone"),
        department: form.get("department"),
        password,
        confirmPassword,
        remember: true,
      });
      navigate("/");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="portal-canvas">
      <div className="portal-frame max-w-2xl p-6 sm:p-9">
        <div className="flex items-start gap-4 border-b border-slate-200 pb-6">
          <span className="portal-icon-ring"><GraduationCap size={24} /></span>
          <div><h1 className="text-2xl font-black text-navy">Student Registration</h1><p className="mt-1 text-sm text-slate-500">Create your HICM student account.</p></div>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" wide><input className="field" name="name" autoComplete="name" required /></Field>
          <Field label="Matricule"><input className="field" name="matricule" autoComplete="username" placeholder="e.g. Uba23C001" required /></Field>
          <Field label="Phone Number"><input className="field" name="phone" inputMode="tel" autoComplete="tel" placeholder="e.g. 6XX XXX XXX" required /></Field>
          <Field label="Department" wide><select className="field" name="department" defaultValue="" required><option value="" disabled>Select Department</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></Field>
          <Field label="Password"><input className="field" name="password" type="password" minLength={8} autoComplete="new-password" required /></Field>
          <Field label="Confirm Password"><input className="field" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></Field>
          <button className="btn-primary mt-2 sm:col-span-2" disabled={busy}><UserPlus size={18} />{busy ? "Creating account..." : "Create student account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link to="/" onClick={() => setAuthOpen(true)} className="font-bold text-teal-800 underline-offset-4 hover:underline">Login</Link></p>
      </div>
    </main>
  );
}

function Field({ label, children, wide }) {
  return <label className={`grid gap-1 ${wide ? "sm:col-span-2" : ""}`}><span className="label">{label}</span>{children}</label>;
}
