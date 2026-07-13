import { X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function AuthModal() {
  const { authOpen, setAuthOpen, authenticate, setToast } = useApp();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ name: "", matricule: "", position: "", phone: "" });
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await authenticate({ role, ...form });
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">Login / Register</h2>
            <p className="text-sm text-slate-500">One secure session for the whole HICM HUB.</p>
          </div>
          <button type="button" onClick={() => setAuthOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-5 pb-0">
          {["student", "staff"].map((tab) => (
            <button key={tab} type="button" onClick={() => setRole(tab)} className={`rounded-md px-4 py-2 text-sm font-black capitalize ${role === tab ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-5">
          <label className="grid gap-1">
            <span className="label">Full Name</span>
            <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          {role === "student" ? (
            <label className="grid gap-1">
              <span className="label">Matricule</span>
              <input className="field" value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value.toUpperCase() })} placeholder="HICM2026..." required />
            </label>
          ) : (
            <label className="grid gap-1">
              <span className="label">Position</span>
              <input className="field" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="Registrar, Lecturer, Admin Officer..." required />
            </label>
          )}
          <label className="grid gap-1">
            <span className="label">Phone Number</span>
            <input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="681597837" required />
          </label>
          <button disabled={busy} className="btn-primary w-full">{busy ? "Opening portal..." : "Continue"}</button>
        </div>
      </form>
    </div>
  );
}
