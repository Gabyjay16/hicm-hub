import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useApp } from "../context/AppContext";
import { postJson } from "../utils/api";

const formSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  credential: z.string().min(2, "Enter your matricule or password."),
  phone: z.string().optional(),
  position: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((values, context) => {
  if (values.phone && !/^\+?[0-9 ()-]{7,20}$/.test(values.phone)) context.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number." });
});

export default function AuthModal() {
  const { authOpen, setAuthOpen, authenticate, setToast } = useApp();
  const [mode, setMode] = useState("student");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", credential: "", phone: "", position: "", password: "", confirmPassword: "" },
  });
  const name = watch("name");
  const credential = watch("credential");

  useEffect(() => {
    if (!authOpen || (!name.trim() && !credential.trim())) return undefined;
    const timer = setTimeout(() => {
      postJson("/auth/resolve", { name, credential }).then((data) => {
        if (data.mode === "staff-registration") {
          setAuthOpen(false);
          navigate(`/staff-register?code=${encodeURIComponent(credential.trim().toUpperCase())}`);
          return;
        }
        setMode(data.mode);
      }).catch(() => setMode("student"));
    }, 350);
    return () => clearTimeout(timer);
  }, [authOpen, name, credential]);

  if (!authOpen) return null;

  async function submit(values) {
    setBusy(true);
    try {
      if (mode === "staff-login") {
        await authenticate({ role: "staff", name: values.name, credential: values.credential, password: values.credential });
      } else {
        await authenticate({ role: "student", name: values.name, credential: values.credential, matricule: values.credential, phone: values.phone || undefined });
      }
      reset();
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }

  const secondLabel = mode === "staff-login" ? "Password" : "Matricule";
  const heading = mode === "staff-login" ? "Staff sign in" : "Student access";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <form onSubmit={handleSubmit(submit)} className="w-full max-w-lg rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <span className="portal-icon-ring h-10 w-10">{mode === "student" ? <UserRound size={20} /> : <LockKeyhole size={20} />}</span>
            <div><h2 id="auth-title" className="text-xl font-black text-slate-950">{heading}</h2><p className="text-sm text-slate-500">Use your registered HICM details.</p></div>
          </div>
          <button type="button" onClick={() => setAuthOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="grid gap-4 p-5">
          <Field label="Full Name" error={errors.name?.message}><input className="field" autoComplete="name" {...register("name")} /></Field>
          <Field label={secondLabel} error={errors.credential?.message}><input className="field" type={mode === "staff-login" ? "password" : "text"} autoComplete={mode === "staff-login" ? "current-password" : "username"} placeholder={mode === "staff-login" ? "Staff password" : "e.g. Uba23C001 or staff code"} {...register("credential")} /></Field>

          {mode === "student" && <Field label="Phone Number (required for first registration)" error={errors.phone?.message}><input className="field" inputMode="tel" autoComplete="tel" placeholder="e.g. 6XX XXX XXX" {...register("phone")} /></Field>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Verifying..." : "Continue"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return <label className="grid gap-1"><span className="label">{label}</span>{children}{error && <span className="text-xs font-semibold text-rose-700">{error}</span>}</label>;
}
