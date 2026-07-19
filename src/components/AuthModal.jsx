import { LockKeyhole, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { postJson } from "../utils/api";

export default function AuthModal() {
  const { authOpen, setAuthOpen, authenticate, setToast } = useApp();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!authOpen) return null;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") || "").trim();
    setBusy(true);
    try {
      if (/^STF-/i.test(identifier)) {
        const resolution = await postJson("/auth/resolve", { credential: identifier });
        if (resolution.mode === "staff-registration") {
          setAuthOpen(false);
          navigate(`/staff-register?code=${encodeURIComponent(identifier.toUpperCase())}`);
          return;
        }
      }
      await authenticate({
        mode: "login",
        identifier,
        password: form.get("password"),
        remember: form.get("remember") === "on",
      });
      navigate("/");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <span className="portal-icon-ring h-10 w-10"><LockKeyhole size={20} /></span>
            <div><h2 id="auth-title" className="text-xl font-black text-slate-950">Login</h2><p className="text-sm text-slate-500">Access your HICM account.</p></div>
          </div>
          <button type="button" onClick={() => setAuthOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="grid gap-4 p-5">
          <Field label="Matricule / Staff Name">
            <input className="field" name="identifier" autoComplete="username" placeholder="e.g. Uba23C001" required />
          </Field>
          <Field label="Password">
            <input className="field" name="password" type="password" minLength={8} autoComplete="current-password" required />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input className="h-4 w-4 accent-teal-700" name="remember" type="checkbox" />
            Remember me on this device
          </label>
          <button disabled={busy} className="btn-primary w-full">{busy ? "Signing in..." : "Login"}</button>
          <p className="text-center text-sm text-slate-600">New HICM student? <Link to="/register" onClick={() => setAuthOpen(false)} className="font-bold text-teal-800 underline-offset-4 hover:underline">Register</Link></p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="grid gap-1"><span className="label">{label}</span>{children}</label>;
}
