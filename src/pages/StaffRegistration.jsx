import { CheckCircle2, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { postJson } from "../utils/api";

export default function StaffRegistration() {
  const [params] = useSearchParams();
  const code = String(params.get("code") || "").trim().toUpperCase();
  const navigate = useNavigate();
  const { authenticate, setToast } = useApp();
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    postJson("/auth/resolve", { name: "New staff", credential: code }).then((data) => setValid(data.mode === "staff-registration")).catch(() => setValid(false)).finally(() => setValidating(false));
  }, [code]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) { setToast("The passwords do not match."); return; }
    setBusy(true);
    try {
      await authenticate({ role: "staff", name: form.get("name"), credential: code, accessCode: code, position: form.get("position"), phone: form.get("phone"), password, confirmPassword });
      navigate("/");
    } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }

  if (validating) return <main className="portal-canvas"><div className="portal-frame p-8 text-center text-slate-500">Validating staff access code...</div></main>;
  if (!valid) return <main className="portal-canvas"><div className="portal-frame p-8 text-center"><KeyRound className="mx-auto text-rose-700" size={34} /><h1 className="mt-4 text-xl font-black text-navy">Staff code unavailable</h1><p className="mt-2 text-slate-600">This code is invalid, expired, revoked, or already used.</p><button className="btn-secondary mt-5" onClick={() => navigate("/")}>Return to login</button></div></main>;

  return <main className="portal-canvas"><div className="portal-frame max-w-2xl p-6 sm:p-9"><div className="flex items-start gap-4 border-b border-slate-200 pb-6"><span className="portal-icon-ring"><CheckCircle2 size={24} /></span><div><h1 className="text-2xl font-black text-navy">Staff Registration</h1><p className="mt-1 text-sm text-slate-500">Your one-time admin code is valid. Create your staff account below.</p></div></div><form onSubmit={submit} className="mt-6 grid gap-4">
    <Field label="Full Name"><input className="field" name="name" autoComplete="name" required /></Field>
    <Field label="Position"><input className="field" name="position" placeholder="e.g. Lecturer" required /></Field>
    <Field label="Phone Number"><input className="field" name="phone" inputMode="tel" placeholder="e.g. 6XX XXX XXX" required /></Field>
    <Field label="Password"><input className="field" name="password" type="password" minLength={8} autoComplete="new-password" required /></Field>
    <Field label="Confirm Password"><input className="field" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></Field>
    <button className="btn-primary mt-2" disabled={busy}>{busy ? "Creating staff account..." : "Create staff account"}</button>
  </form></div></main>;
}

function Field({ label, children }) { return <label className="grid gap-1"><span className="label">{label}</span>{children}</label>; }
