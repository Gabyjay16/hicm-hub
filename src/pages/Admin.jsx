import { Activity, Ban, Check, ClipboardList, FileCheck2, FileSpreadsheet, KeyRound, RefreshCw, ShieldCheck, Trash2, Upload, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { api, deleteJson, patchJson, postJson } from "../utils/api";
import { readMatricules } from "../utils/matriculeFile";

const tabs = ["Overview", "Users", "Student Registry", "Staff Codes", "Documents", "Forum", "Analysis", "Audit", "Security"];

export default function Admin() {
  const { user, setToast, setAuthOpen } = useApp();
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState({ metrics: {}, users: [], codes: [], reports: [], jobs: [], logs: [], forumSettings: [], registry: {}, documentRequests: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const endpoints = ["/admin/overview", "/admin/users", "/admin/staff-codes", "/admin/forum/reports", "/admin/analysis", "/admin/audit", "/admin/forum/settings", "/admin/matricule-registry", "/document-requests"];
    const [overview, users, codes, reports, jobs, logs, forumSettings, registry, documents] = await Promise.all(endpoints.map((path) => api(path)));
    setData({ metrics: overview.metrics, users: users.users, codes: codes.codes, reports: reports.reports, jobs: jobs.jobs, logs: logs.logs, forumSettings: forumSettings.settings || [], registry, documentRequests: documents.requests || [] });
    setLoading(false);
  }

  useEffect(() => { if (user?.role === "admin") load().catch((error) => { setToast(error.message); setLoading(false); }); }, [user?.role]);

  if (!user) return <AccessPanel title="Administrator sign-in required" action={() => setAuthOpen(true)} actionLabel="Open sign in" />;
  if (user.role !== "admin") return <AccessPanel title="This workspace is limited to platform administrators" />;

  async function perform(action, success) {
    try { await action(); if (success) setToast(success); await load(); } catch (error) { setToast(error.message); }
  }

  const actions = {
    createCode: async (hours) => perform(async () => { const result = await postJson("/admin/staff-codes", { expiresInHours: hours }); await navigator.clipboard?.writeText(result.code); setToast(`Single-use code ${result.code} created and copied`); }, ""),
    revokeCode: (codeId) => perform(() => patchJson(`/admin/staff-codes/${codeId}`, { revoked: true }), "Staff access code revoked"),
    updateUser: (account, changes) => perform(() => patchJson(`/admin/users/${account.id}`, { accountStatus: changes.accountStatus ?? account.account_status, forumAccess: changes.forumAccess ?? Boolean(account.forum_access), moderationAccess: changes.moderationAccess ?? Boolean(account.moderation_access) }), "Account controls updated"),
    reviewReport: (reportId, status) => perform(() => patchJson(`/admin/forum/reports/${reportId}`, { status }), "Forum report updated"),
    updateForumSettings: (channel, changes) => perform(() => patchJson("/admin/forum/settings", { channel, ...changes }), changes.suspended ? `${channel} suspended` : `${channel} reopened`),
    updateRegistry: (changes) => perform(() => patchJson("/admin/matricule-registry/settings", changes), changes.enforced ? "Matricule verification enabled" : "Matricule verification disabled"),
    clearRegistry: () => perform(() => deleteJson("/admin/matricule-registry"), "Matricule registry cleared"),
    uploadRegistry: (matricules, sourceName) => perform(() => postJson("/admin/matricule-registry", { matricules, sourceName }), `${matricules.length} matricules imported`),
    reviewDocument: (requestId, form) => perform(() => api(`/document-requests/${requestId}`, { method: "PATCH", body: form }), "Document request updated"),
    publishResult: (jobId, values) => perform(() => patchJson(`/admin/analysis/${jobId}/publish-result`, values), "Official thesis result published"),
    reportError: (message) => setToast(message),
  };

  async function changePassword(currentPassword, newPassword) {
    try { await patchJson("/account/password", { currentPassword, newPassword }); setToast("Password changed and other sessions revoked"); return true; }
    catch (error) { setToast(error.message); return false; }
  }

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader eyebrow="Control Plane" title="Administration" description="Manage identity, student services, academic records, forums, and platform security." /><button onClick={load} className="btn-secondary mt-2"><RefreshCw size={16} /> Refresh</button></div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold ${tab === item ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500"}`}>{item}</button>)}</div>
      {loading ? <div className="panel p-8 text-slate-500">Loading administration data...</div> : <AdminTab tab={tab} data={data} actions={actions} changePassword={changePassword} />}
    </div>
  );
}

function AdminTab({ tab, data, actions, changePassword }) {
  if (tab === "Overview") return <Overview metrics={data.metrics} />;
  if (tab === "Users") return <UsersTable users={data.users} updateUser={actions.updateUser} />;
  if (tab === "Student Registry") return <RegistryAdmin registry={data.registry} actions={actions} />;
  if (tab === "Staff Codes") return <Codes codes={data.codes} createCode={actions.createCode} revokeCode={actions.revokeCode} />;
  if (tab === "Documents") return <DocumentAdmin requests={data.documentRequests} onReview={actions.reviewDocument} />;
  if (tab === "Forum") return <ForumAdmin reports={data.reports} settings={data.forumSettings} reviewReport={actions.reviewReport} updateSettings={actions.updateForumSettings} />;
  if (tab === "Analysis") return <AnalysisJobs jobs={data.jobs} publishResult={actions.publishResult} />;
  if (tab === "Audit") return <Audit logs={data.logs} />;
  return <Security changePassword={changePassword} />;
}

function Overview({ metrics }) {
  const items = [["All users", metrics.users, Users], ["Students", metrics.students, Users], ["Staff", metrics.staff, ShieldCheck], ["Open complaints", metrics.openComplaints, ClipboardList], ["Pending payments", metrics.pendingPayments, Activity], ["Analysis attention", metrics.queuedAnalysis, Activity], ["Forum reports", metrics.openForumReports, Ban]];
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value, Icon]) => <div key={label} className="panel p-5"><Icon size={21} className="text-teal-700" /><p className="mt-4 text-3xl font-black text-navy">{value ?? 0}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>)}</div>;
}

function UsersTable({ users, updateUser }) {
  return <Table headers={["Account", "Role", "Department", "Status", "Forum", "Moderation", "Actions"]}>{users.map((account) => <tr key={account.id} className="border-t border-slate-200"><td className="p-4"><p className="font-bold">{account.name}</p><p className="text-xs text-slate-500">{account.matricule || account.position}</p></td><td className="p-4 capitalize">{account.is_admin ? "admin" : account.role}</td><td className="p-4 text-sm">{account.department || "-"}</td><td className="p-4"><StatusBadge status={account.account_status} /></td><td className="p-4">{account.role === "staff" ? <Toggle checked={Boolean(account.forum_access || account.is_admin)} disabled={Boolean(account.is_admin)} onChange={(checked) => updateUser(account, { forumAccess: checked })} label="Forum access" /> : "Student"}</td><td className="p-4">{account.role === "staff" ? <Toggle checked={Boolean(account.moderation_access || account.is_admin)} disabled={Boolean(account.is_admin)} onChange={(checked) => updateUser(account, { moderationAccess: checked })} label="Moderation access" /> : "-"}</td><td className="p-4"><button onClick={() => updateUser(account, { accountStatus: account.account_status === "blocked" ? "active" : "blocked" })} className="btn-secondary px-3 py-1.5" disabled={Boolean(account.is_admin)}>{account.account_status === "blocked" ? <Check size={15} /> : <Ban size={15} />}{account.account_status === "blocked" ? "Activate" : "Block"}</button></td></tr>)}</Table>;
}

function RegistryAdmin({ registry, actions }) {
  const [reading, setReading] = useState(false);
  const settings = registry.settings || {};
  async function upload(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get("registry");
    setReading(true);
    try { const matricules = await readMatricules(file); await actions.uploadRegistry(matricules, file.name); formElement.reset(); }
    catch (error) { actions.reportError(error.message); }
    finally { setReading(false); }
  }
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><section className="panel p-6"><FileSpreadsheet className="text-teal-700" size={28} /><h2 className="mt-4 text-lg font-black text-navy">HICM Matricule Registry</h2><div className="mt-5 flex items-center justify-between gap-4 rounded-md bg-slate-50 p-4"><div><p className="font-bold text-navy">Verify registrations</p><p className="text-xs text-slate-500">Disabled by default</p></div><Toggle checked={Boolean(settings.enforced)} onChange={(enforced) => actions.updateRegistry({ enforced })} label="Verify student matricules" /></div><form onSubmit={upload} className="mt-5 grid gap-3"><input className="field" name="registry" type="file" accept=".xlsx,.csv" required /><button disabled={reading} className="btn-primary"><Upload size={17} />{reading ? "Reading spreadsheet..." : "Upload Excel / CSV"}</button></form>{Number(settings.total_records) > 0 && <button onClick={actions.clearRegistry} className="btn-secondary mt-3 w-full text-rose-700"><Trash2 size={17} /> Clear Registry</button>}</section><section className="panel overflow-hidden"><div className="border-b border-slate-200 p-5"><p className="text-3xl font-black text-navy">{settings.total_records || 0}</p><p className="text-sm font-semibold text-slate-500">registered matricules in {settings.source_name || "no uploaded file"}</p>{settings.uploaded_at && <p className="mt-1 text-xs text-slate-400">Uploaded {new Date(settings.uploaded_at).toLocaleString()}</p>}</div><div className="grid max-h-96 grid-cols-2 gap-px overflow-y-auto bg-slate-200 sm:grid-cols-3">{(registry.preview || []).map((matricule) => <span key={matricule} className="bg-white p-3 font-mono text-sm font-bold text-navy">{matricule}</span>)}</div></section></div>;
}

function Codes({ codes, createCode, revokeCode }) {
  return <div className="grid gap-5"><div className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-black text-navy">Issue a single-use registration code</h2><p className="mt-1 text-sm text-slate-500">The code expires automatically and is consumed by one staff account.</p></div><div className="flex gap-2"><button onClick={() => createCode(24)} className="btn-primary"><KeyRound size={17} /> 24 hours</button><button onClick={() => createCode(168)} className="btn-secondary">7 days</button></div></div><Table headers={["Code", "Created by", "Expires", "State", "Action"]}>{codes.map((code) => { const state = code.used_at ? "Used" : code.revoked_at ? "Revoked" : new Date(code.expires_at) < new Date() ? "Expired" : "Active"; return <tr key={code.id} className="border-t border-slate-200"><td className="p-4 font-mono font-bold">{code.code}</td><td className="p-4">{code.creator_name || "System"}</td><td className="p-4 text-sm">{new Date(code.expires_at).toLocaleString()}</td><td className="p-4"><StatusBadge status={state} /></td><td className="p-4">{state === "Active" && <button onClick={() => revokeCode(code.id)} className="btn-secondary px-3 py-1.5"><X size={15} /> Revoke</button>}</td></tr>; })}</Table></div>;
}

function DocumentAdmin({ requests, onReview }) {
  async function submit(event, requestId) { event.preventDefault(); const form = new FormData(event.currentTarget); await onReview(requestId, form); }
  return <div className="grid gap-4">{requests.map((item) => <form key={item.id} onSubmit={(event) => submit(event, item.id)} className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-navy">{item.request_type}</h2><p className="mt-1 text-sm text-slate-500">{item.student_name} · {item.matricule} · {item.department || "No department"}</p></div><StatusBadge status={item.status.replace("_", " ")} /></div>{item.details && <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{item.details}</p>}<div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(220px,0.8fr)_auto]"><select className="field" name="status" defaultValue={item.status}><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="needs_information">Needs information</option><option value="rejected">Rejected</option><option value="ready">Ready</option></select><input className="field" name="comment" defaultValue={item.admin_comment || ""} placeholder="Comment visible to student" /><input className="field" name="document" type="file" accept="application/pdf,.pdf" /><button className="btn-primary"><FileCheck2 size={17} /> Update</button></div>{item.download_url && <a className="mt-3 inline-block text-sm font-bold text-teal-800" href={item.download_url}>Open current PDF</a>}</form>)}{!requests.length && <div className="panel p-8 text-center text-sm text-slate-500">No student document requests yet.</div>}</div>;
}

function ForumAdmin({ reports, settings, reviewReport, updateSettings }) {
  return <div className="grid gap-5"><section className="panel overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="font-black text-navy">Forum Availability</h2></div><div className="divide-y divide-slate-200">{settings.map((channel) => <div key={channel.channel} className="flex items-center justify-between gap-4 p-4"><div><p className="font-bold text-navy">#{channel.channel}</p><p className="text-xs text-slate-500">{channel.suspended ? "Posting suspended" : "Open for messages"}</p></div><Toggle checked={!channel.suspended} onChange={(open) => updateSettings(channel.channel, { suspended: !open, suspensionMessage: `#${channel.channel} is temporarily suspended by administration.` })} label={`${channel.channel} open`} /></div>)}</div></section><Table headers={["Channel", "Message", "Reporter", "Reason", "Status", "Actions"]}>{reports.map((report) => <tr key={report.id} className="border-t border-slate-200"><td className="p-4 font-bold">#{report.channel}</td><td className="max-w-sm p-4"><p className="font-bold">{report.author}</p><p className="truncate text-sm text-slate-500">{report.body}</p></td><td className="p-4">{report.reporter_name}</td><td className="p-4">{report.reason}</td><td className="p-4"><StatusBadge status={report.status} /></td><td className="p-4">{report.status === "open" && <div className="flex gap-2"><button onClick={() => reviewReport(report.id, "actioned")} className="btn-primary px-3 py-1.5">Remove</button><button onClick={() => reviewReport(report.id, "dismissed")} className="btn-secondary px-3 py-1.5">Dismiss</button></div>}</td></tr>)}</Table></div>;
}

function AnalysisJobs({ jobs, publishResult }) {
  async function submit(event, jobId) { event.preventDefault(); const form = new FormData(event.currentTarget); await publishResult(jobId, { thesisTitle: form.get("thesisTitle"), plagiarismPercent: Number(form.get("plagiarismPercent")), aiUsePercent: Number(form.get("aiUsePercent")) }); }
  return <div className="grid gap-4">{jobs.map((job) => <form key={job.id} onSubmit={(event) => submit(event, job.id)} className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-navy">{job.student_name}</h2><p className="mt-1 text-sm text-slate-500">{job.matricule} · {job.original_name}</p></div><StatusBadge status={job.status} /></div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_auto]"><input className="field" name="thesisTitle" defaultValue={job.thesis_title || job.original_name?.replace(/\.[^.]+$/, "")} placeholder="Thesis title" required /><input className="field" name="plagiarismPercent" type="number" min="0" max="100" step="0.1" defaultValue={job.plagiarism_percent ?? job.similarity_percent ?? 0} aria-label="Plagiarism percentage" required /><input className="field" name="aiUsePercent" type="number" min="0" max="100" step="0.1" defaultValue={job.ai_use_percent ?? 0} aria-label="AI use percentage" required /><button disabled={job.status !== "completed"} className="btn-primary">Publish Result</button></div>{job.verification_code && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-950"><span className="font-bold">Verification code</span><code className="font-black">{job.verification_code}</code><span className="text-xs">Published {new Date(job.published_at).toLocaleString()}</span></div>}</form>)}{!jobs.length && <div className="panel p-8 text-center text-sm text-slate-500">No thesis analyses submitted yet.</div>}</div>;
}

function Audit({ logs }) { return <Table headers={["Time", "Actor", "Action", "Target", "Metadata"]}>{logs.map((log) => <tr key={log.id} className="border-t border-slate-200"><td className="p-4 text-sm">{new Date(log.created_at).toLocaleString()}</td><td className="p-4">{log.actor_name || "System"}</td><td className="p-4 font-mono text-xs">{log.action}</td><td className="p-4">{log.target_type || "-"}</td><td className="max-w-xs truncate p-4 font-mono text-xs text-slate-500">{log.metadata_json || "{}"}</td></tr>)}</Table>; }

function Security({ changePassword }) {
  const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy(true); try { if (await changePassword(form.get("currentPassword"), form.get("newPassword"))) formElement.reset(); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="panel max-w-xl p-6"><h2 className="text-lg font-black text-navy">Administrator Password</h2><label className="mt-5 grid gap-2"><span className="label">Current Password</span><input className="field" name="currentPassword" type="password" autoComplete="current-password" required /></label><label className="mt-4 grid gap-2"><span className="label">New Password</span><input className="field" name="newPassword" type="password" minLength="12" autoComplete="new-password" required /></label><button disabled={busy} className="btn-primary mt-5">{busy ? "Changing password..." : "Change Password"}</button></form>;
}

function Table({ headers, children }) { return <div className="panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="p-4">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Toggle({ checked, onChange, label, disabled }) { return <button type="button" disabled={disabled} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-teal-700" : "bg-slate-300"} disabled:opacity-50`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button>; }
function AccessPanel({ title, action, actionLabel }) { return <div className="page-shell"><div className="panel mx-auto max-w-xl p-8 text-center"><ShieldCheck className="mx-auto text-teal-700" size={38} /><h1 className="mt-4 text-xl font-black">{title}</h1>{action && <button onClick={action} className="btn-primary mt-5">{actionLabel}</button>}<Link to="/" className="mt-4 block text-sm font-bold text-teal-800">Return to portal</Link></div></div>; }
