import { Activity, Ban, Check, ClipboardList, KeyRound, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, patchJson, postJson } from "../utils/api";

const tabs = ["Overview", "Users", "Staff Codes", "Forum", "Analysis", "Audit", "Security"];

export default function Admin() {
  const { user, setToast, setAuthOpen } = useApp();
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState({ metrics: {}, users: [], codes: [], reports: [], jobs: [], logs: [], forumSettings: {} });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const endpoints = ["/admin/overview", "/admin/users", "/admin/staff-codes", "/admin/forum/reports", "/admin/analysis", "/admin/audit", "/admin/forum/settings"];
    const [overview, users, codes, reports, jobs, logs, forumSettings] = await Promise.all(endpoints.map((path) => api(path)));
    setData({ metrics: overview.metrics, users: users.users, codes: codes.codes, reports: reports.reports, jobs: jobs.jobs, logs: logs.logs, forumSettings: forumSettings.settings || {} });
    setLoading(false);
  }

  useEffect(() => { if (user?.role === "admin") load().catch((error) => { setToast(error.message); setLoading(false); }); }, [user?.role]);

  if (!user) return <AccessPanel title="Administrator sign-in required" action={() => setAuthOpen(true)} actionLabel="Open sign in" />;
  if (user.role !== "admin") return <AccessPanel title="This workspace is limited to platform administrators" />;

  async function createCode(hours) {
    const result = await postJson("/admin/staff-codes", { expiresInHours: hours });
    await navigator.clipboard?.writeText(result.code);
    setToast(`Single-use code ${result.code} created and copied`);
    await load();
  }

  async function revokeCode(codeId) {
    await patchJson(`/admin/staff-codes/${codeId}`, { revoked: true });
    setToast("Staff access code revoked");
    await load();
  }

  async function updateUser(account, changes) {
    await patchJson(`/admin/users/${account.id}`, {
      accountStatus: changes.accountStatus ?? account.account_status,
      forumAccess: changes.forumAccess ?? Boolean(account.forum_access),
      moderationAccess: changes.moderationAccess ?? Boolean(account.moderation_access),
    });
    setToast("Account controls updated");
    await load();
  }

  async function reviewReport(reportId, status) {
    await patchJson(`/admin/forum/reports/${reportId}`, { status });
    await load();
  }

  async function updateForumSettings(changes) {
    await patchJson("/admin/forum/settings", { channel: "General", ...changes });
    setToast(changes.suspended ? "General Forum suspended" : "General Forum reopened");
    await load();
  }

  async function changePassword(currentPassword, newPassword) {
    try {
      await patchJson("/account/password", { currentPassword, newPassword });
      setToast("Password changed and other sessions revoked");
      return true;
    } catch (error) {
      setToast(error.message);
      return false;
    }
  }

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader eyebrow="Control plane" title="Administration" description="Accounts, access codes, forum governance, analysis operations, and immutable audit events." /><button onClick={load} className="btn-secondary mt-2"><RefreshCw size={16} /> Refresh</button></div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold ${tab === item ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500"}`}>{item}</button>)}</div>
      {loading ? <div className="panel p-8 text-slate-500">Loading administration data...</div> : <AdminTab tab={tab} data={data} createCode={createCode} revokeCode={revokeCode} updateUser={updateUser} reviewReport={reviewReport} updateForumSettings={updateForumSettings} changePassword={changePassword} />}
    </div>
  );
}

function AdminTab({ tab, data, createCode, revokeCode, updateUser, reviewReport, updateForumSettings, changePassword }) {
  if (tab === "Overview") return <Overview metrics={data.metrics} />;
  if (tab === "Users") return <UsersTable users={data.users} updateUser={updateUser} />;
  if (tab === "Staff Codes") return <Codes codes={data.codes} createCode={createCode} revokeCode={revokeCode} />;
  if (tab === "Forum") return <ForumAdmin reports={data.reports} settings={data.forumSettings} reviewReport={reviewReport} updateSettings={updateForumSettings} />;
  if (tab === "Analysis") return <AnalysisJobs jobs={data.jobs} />;
  if (tab === "Audit") return <Audit logs={data.logs} />;
  return <Security changePassword={changePassword} />;
}

function Overview({ metrics }) {
  const items = [
    ["All users", metrics.users, Users], ["Students", metrics.students, Users], ["Staff", metrics.staff, ShieldCheck],
    ["Open complaints", metrics.openComplaints, ClipboardList], ["Pending payments", metrics.pendingPayments, Activity],
    ["Analysis attention", metrics.queuedAnalysis, Activity], ["Forum reports", metrics.openForumReports, Ban],
  ];
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value, Icon]) => <div key={label} className="panel p-5"><Icon size={21} className="text-teal-700" /><p className="mt-4 text-3xl font-black text-navy">{value ?? 0}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>)}</div>;
}

function UsersTable({ users, updateUser }) {
  return <Table headers={["Account", "Role", "Status", "Forum", "Moderation", "Actions"]}>{users.map((account) => <tr key={account.id} className="border-t border-slate-200"><td className="p-4"><p className="font-bold">{account.name}</p><p className="text-xs text-slate-500">{account.matricule || account.position}</p></td><td className="p-4 capitalize">{account.is_admin ? "admin" : account.role}</td><td className="p-4"><StatusBadge status={account.account_status} /></td><td className="p-4">{account.role === "staff" ? <Toggle checked={Boolean(account.forum_access || account.is_admin)} disabled={Boolean(account.is_admin)} onChange={(checked) => updateUser(account, { forumAccess: checked })} label="Forum access" /> : "Student"}</td><td className="p-4">{account.role === "staff" ? <Toggle checked={Boolean(account.moderation_access || account.is_admin)} disabled={Boolean(account.is_admin)} onChange={(checked) => updateUser(account, { moderationAccess: checked })} label="Moderation access" /> : "-"}</td><td className="p-4"><button onClick={() => updateUser(account, { accountStatus: account.account_status === "blocked" ? "active" : "blocked" })} className="btn-secondary px-3 py-1.5" disabled={Boolean(account.is_admin)}>{account.account_status === "blocked" ? <Check size={15} /> : <Ban size={15} />}{account.account_status === "blocked" ? "Activate" : "Block"}</button></td></tr>)}</Table>;
}

function Codes({ codes, createCode, revokeCode }) {
  return <div className="grid gap-5"><div className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-black text-navy">Issue a single-use registration code</h2><p className="mt-1 text-sm text-slate-500">The code expires automatically and is atomically consumed by one staff account.</p></div><div className="flex gap-2"><button onClick={() => createCode(24)} className="btn-primary"><KeyRound size={17} /> 24 hours</button><button onClick={() => createCode(168)} className="btn-secondary">7 days</button></div></div><Table headers={["Code", "Created by", "Expires", "State", "Action"]}>{codes.map((code) => { const state = code.used_at ? "Used" : code.revoked_at ? "Revoked" : new Date(code.expires_at) < new Date() ? "Expired" : "Active"; return <tr key={code.id} className="border-t border-slate-200"><td className="p-4 font-mono font-bold">{code.code}</td><td className="p-4">{code.creator_name || "System"}</td><td className="p-4 text-sm">{new Date(code.expires_at).toLocaleString()}</td><td className="p-4"><StatusBadge status={state} /></td><td className="p-4">{state === "Active" && <button onClick={() => revokeCode(code.id)} className="btn-secondary px-3 py-1.5"><X size={15} /> Revoke</button>}</td></tr>; })}</Table></div>;
}

function ForumAdmin({ reports, settings, reviewReport, updateSettings }) {
  const suspended = Boolean(settings?.suspended);
  return <div className="grid gap-5"><div className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-black text-navy">General Forum availability</h2><p className="mt-1 text-sm text-slate-500">Suspension immediately prevents every participant from sending messages.</p></div><Toggle checked={!suspended} onChange={(open) => updateSettings({ suspended: !open, suspensionMessage: "The General Forum is temporarily suspended by administration." })} label="Forum open" /></div><Table headers={["Message", "Reporter", "Reason", "Status", "Actions"]}>{reports.map((report) => <tr key={report.id} className="border-t border-slate-200"><td className="max-w-sm p-4"><p className="font-bold">{report.author}</p><p className="truncate text-sm text-slate-500">{report.body}</p></td><td className="p-4">{report.reporter_name}</td><td className="p-4">{report.reason}</td><td className="p-4"><StatusBadge status={report.status} /></td><td className="p-4"><div className="flex gap-2">{report.status === "open" && <><button onClick={() => reviewReport(report.id, "actioned")} className="btn-primary px-3 py-1.5">Remove</button><button onClick={() => reviewReport(report.id, "dismissed")} className="btn-secondary px-3 py-1.5">Dismiss</button></>}</div></td></tr>)}</Table></div>;
}

function AnalysisJobs({ jobs }) {
  return <Table headers={["Student", "Document", "Status", "Progress", "Similarity", "Created"]}>{jobs.map((job) => <tr key={job.id} className="border-t border-slate-200"><td className="p-4"><p className="font-bold">{job.student_name}</p><p className="text-xs text-slate-500">{job.matricule}</p></td><td className="p-4">{job.original_name}</td><td className="p-4"><StatusBadge status={job.status} /></td><td className="p-4">{job.progress}%</td><td className="p-4 font-bold">{job.similarity_percent == null ? "-" : `${job.similarity_percent}%`}</td><td className="p-4 text-sm">{new Date(job.created_at).toLocaleString()}</td></tr>)}</Table>;
}

function Audit({ logs }) {
  return <Table headers={["Time", "Actor", "Action", "Target", "Metadata"]}>{logs.map((log) => <tr key={log.id} className="border-t border-slate-200"><td className="p-4 text-sm">{new Date(log.created_at).toLocaleString()}</td><td className="p-4">{log.actor_name || "System"}</td><td className="p-4 font-mono text-xs">{log.action}</td><td className="p-4">{log.target_type || "-"}</td><td className="max-w-xs truncate p-4 font-mono text-xs text-slate-500">{log.metadata_json || "{}"}</td></tr>)}</Table>;
}

function Security({ changePassword }) {
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try { if (await changePassword(form.get("currentPassword"), form.get("newPassword"))) event.currentTarget.reset(); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel max-w-xl p-6"><h2 className="text-lg font-black text-navy">Administrator password</h2><p className="mt-2 text-sm leading-6 text-slate-500">Changing this password immediately revokes every other session for your account.</p><label className="mt-5 grid gap-2"><span className="label">Current password</span><input className="field" name="currentPassword" type="password" autoComplete="current-password" required /></label><label className="mt-4 grid gap-2"><span className="label">New password</span><input className="field" name="newPassword" type="password" minLength="12" autoComplete="new-password" required /></label><button disabled={busy} className="btn-primary mt-5">{busy ? "Changing password..." : "Change password"}</button></form>;
}

function Table({ headers, children }) { return <div className="panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="p-4">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Toggle({ checked, onChange, label, disabled }) { return <button type="button" disabled={disabled} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-teal-700" : "bg-slate-300"} disabled:opacity-50`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button>; }
function AccessPanel({ title, action, actionLabel }) { return <div className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><ShieldCheck className="mx-auto text-teal-700" size={38} /><h1 className="mt-4 text-xl font-black">{title}</h1>{action && <button onClick={action} className="btn-primary mt-5">{actionLabel}</button>}<Link to="/" className="mt-4 block text-sm font-bold text-teal-800">Return to portal</Link></div></div>; }
