import { Eye, EyeOff, Flag, Hash, ImagePlus, Mic, MoreHorizontal, Reply, Search, Send, Settings2, Square, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, apiBlob, deleteJson, patchJson, postJson } from "../utils/api";

export const forumLinkPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s)/i;

export default function Forums() {
  const { channels: availableChannels, refreshSession, requireAuth, setToast, user } = useApp();
  const [channel, setChannel] = useState("General");
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState({ links_enabled: 0, images_enabled: 1, audio_enabled: 1 });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [useAlias, setUseAlias] = useState(Boolean(user?.forumAlias));
  const [alias, setAlias] = useState(user?.forumAlias || "");
  const [density, setDensity] = useState(user?.forumDensity || "compact");
  const [openedMedia, setOpenedMedia] = useState({});
  const [openingMedia, setOpeningMedia] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const imageInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recorderChunksRef = useRef([]);

  async function load(reset = false, searchTerm = search.trim()) {
    if (!channel || !availableChannels.includes(channel)) { setLoading(false); return; }
    const last = !reset && !searchTerm && messages[messages.length - 1]?.created_at;
    const params = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : last ? `?after=${encodeURIComponent(last)}` : "";
    const data = await api(`/forums/${encodeURIComponent(channel)}/messages${params}`);
    setSettings(data.settings || {});
    setMessages((current) => last ? mergeMessages(current, data.messages || []) : data.messages || []);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    if (availableChannels.length && !availableChannels.includes(channel)) setChannel(availableChannels[0]);
  }, [availableChannels.join("|")]);

  useEffect(() => {
    setMessages([]); setLoading(true); setError(""); setReplyTo(null); clearOpenedMedia();
    const timer = setTimeout(() => load(true, search.trim()).catch((loadError) => { setError(loadError.message); setLoading(false); }), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [channel, user?.id, search]);

  useEffect(() => {
    if (search.trim()) return undefined;
    const timer = setInterval(() => load(false).catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, [channel, messages.length, search]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => () => stopRecorderStream(), []);

  async function submit(event) {
    event.preventDefault();
    if (!requireAuth() || (!body.trim() && !attachment)) return;
    if (!settings.links_enabled && forumLinkPattern.test(body)) { setToast("Links are disabled in this forum channel."); return; }
    const form = new FormData();
    form.set("body", body.trim());
    if (replyTo?.id) form.set("parentMessageId", replyTo.id);
    if (attachment) form.set("attachment", attachment);
    form.set("viewOnce", attachment && viewOnce ? "true" : "false");
    try {
      const data = await api(`/forums/${encodeURIComponent(channel)}/messages`, { method: "POST", body: form });
      if (search.trim()) await load(true, search.trim());
      else setMessages(data.messages || []);
      setBody(""); setReplyTo(null); setAttachment(null); setViewOnce(false);
    } catch (submitError) { setToast(submitError.message); }
  }

  async function saveIdentity(event) {
    event.preventDefault();
    try {
      await patchJson("/forums/profile", { useAlias, alias, density });
      await refreshSession();
      await load(true);
      setIdentityOpen(false);
      setToast("Forum preferences saved");
    } catch (saveError) { setToast(saveError.message); }
  }

  async function report(message) {
    try {
      await postJson(`/forums/messages/${message.id}/report`, { reason: "Inappropriate or unsafe content" });
      setToast("Message reported to an administrator");
    } catch (reportError) { setToast(reportError.message); }
  }

  async function deleteMessage(message) {
    try {
      await deleteJson(`/forums/messages/${message.id}`);
      dismissMedia(message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      if (replyTo?.id === message.id) setReplyTo(null);
      setToast("Message deleted");
    } catch (deleteError) { setToast(deleteError.message); }
  }

  async function openOnce(message) {
    setOpeningMedia(message.id);
    try {
      const blob = await apiBlob(`/forums/messages/${message.id}/media`, { method: "POST" });
      setOpenedMedia((current) => ({ ...current, [message.id]: URL.createObjectURL(blob) }));
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, can_open_once: false, media_viewed: true } : item));
    } catch (mediaError) { setToast(mediaError.message); }
    finally { setOpeningMedia(""); }
  }

  function dismissMedia(messageId) {
    const url = openedMedia[messageId];
    if (url) URL.revokeObjectURL(url);
    setOpenedMedia((current) => { const next = { ...current }; delete next[messageId]; return next; });
  }

  function clearOpenedMedia() {
    Object.values(openedMedia).forEach((url) => URL.revokeObjectURL(url));
    setOpenedMedia({});
  }

  function choosePicture(event) {
    const file = event.target.files?.[0];
    if (file) { setAttachment(file); setViewOnce(false); }
    event.target.value = "";
  }

  async function startRecording() {
    if (!settings.audio_enabled) { setToast("Voice notes are disabled in this channel."); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setToast("Voice recording is not supported by this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(recorderChunksRef.current, { type });
        if (blob.size) setAttachment(new File([blob], `voice-${Date.now()}.${extension}`, { type }));
        setViewOnce(false); setRecording(false); stopRecorderStream();
      };
      recorder.start(); setRecordingSeconds(0); setRecording(true);
    } catch { setToast("Microphone permission is required to record a voice note."); stopRecorderStream(); }
  }

  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }
  function stopRecorderStream() { recorderStreamRef.current?.getTracks().forEach((track) => track.stop()); recorderStreamRef.current = null; }

  return (
    <main className="portal-canvas">
      <div className="portal-frame forum-layout min-h-[calc(100vh-132px)] max-w-6xl sm:min-h-[680px]">
        <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5"><span className="portal-icon-ring h-10 w-10"><UserRound size={20} /></span><div><h1 className="font-extrabold text-navy">Forums</h1><p className="text-xs text-slate-500">HICM channels</p></div></div>
          <nav className="flex gap-2 overflow-x-auto p-3 lg:grid" aria-label="Forum channels">{availableChannels.map((item) => <button key={item} onClick={() => { setChannel(item); setSearch(""); }} className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-bold ${channel === item ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-white"}`}><Hash size={16} />{item}</button>)}{!availableChannels.length && <p className="p-3 text-sm text-slate-500">Forum access has not been enabled for this account.</p>}</nav>
        </aside>
        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4"><div className="min-w-0 flex-1"><h2 className="font-extrabold text-navy">#{channel}</h2><p className="text-xs text-slate-500">Replies notify the original author</p></div><div className="relative order-3 w-full sm:order-none sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input className="field h-10 py-2 pl-10 pr-10" value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder={`Search #${channel}`} aria-label="Search messages" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate-500" aria-label="Clear message search" title="Clear search"><X size={16} /></button>}</div><button onClick={() => setIdentityOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 text-teal-800" aria-label="Forum settings" title="Forum settings"><Settings2 size={19} /></button></header>
          {identityOpen && <form onSubmit={saveIdentity} className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="grid gap-3">{user?.role === "student" && <div className="grid gap-3 sm:grid-cols-[auto_minmax(180px,1fr)] sm:items-center"><label className="flex items-center gap-2 text-sm font-bold text-navy"><input type="checkbox" checked={useAlias} onChange={(event) => setUseAlias(event.target.checked)} /> Use another username</label><input className="field" value={alias} onChange={(event) => setAlias(event.target.value)} disabled={!useAlias} maxLength={30} placeholder="Forum username" aria-label="Forum username" /></div>}<div className="flex flex-wrap items-center gap-2" role="group" aria-label="Message size"><span className="mr-2 text-sm font-bold text-navy">Message size</span>{[["compact", "Compact"], ["standard", "Standard"]].map(([value, label]) => <button key={value} type="button" aria-pressed={density === value} onClick={() => setDensity(value)} className={`rounded-md border px-3 py-2 text-xs font-bold ${density === value ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-300 text-slate-600"}`}>{label}</button>)}</div></div><button className="btn-primary self-end">Save</button></form>}
          <div className={`min-h-0 flex-1 overflow-y-auto px-4 sm:px-7 ${density === "compact" ? "space-y-2 py-3" : "space-y-5 py-6"}`} aria-live="polite">
            {loading && <p className="text-center text-sm text-slate-500">Loading conversation...</p>}
            {error && <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">{error}</div>}
            {!loading && !error && messages.map((message) => <ForumMessage key={message.id} message={message} mine={message.user_id === user?.id} density={density} openedUrl={openedMedia[message.id]} opening={openingMedia === message.id} onOpenOnce={openOnce} onDismiss={dismissMedia} onReply={setReplyTo} onReport={report} onDelete={deleteMessage} />)}
            {!loading && !error && !messages.length && <p className="text-center text-sm text-slate-500">{search.trim() ? "No messages match your search." : "No messages yet. Start the conversation."}</p>}
            <div ref={endRef} />
          </div>
          {replyTo && <div className="flex items-center gap-3 border-t border-slate-200 bg-teal-50 px-4 py-2 text-xs text-teal-950"><Reply size={14} /><span className="min-w-0 flex-1 truncate">Replying to <b>{replyTo.author}</b>: {replyTo.body || "Media"}</span><button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={16} /></button></div>}
          {attachment && <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="min-w-0 flex-1 truncate font-bold text-navy">{attachment.name}</span><label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={viewOnce} onChange={(event) => setViewOnce(event.target.checked)} /> View once</label><button type="button" onClick={() => { setAttachment(null); setViewOnce(false); }} className="grid h-9 w-9 place-items-center text-rose-700" aria-label="Remove attachment" title="Remove attachment"><Trash2 size={17} /></button></div>}
          {settings.suspended ? <div role="status" className="border-t border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-amber-950">{settings.suspension_message || `#${channel} is temporarily suspended by administration.`}</div> : availableChannels.length > 0 && <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4"><input ref={imageInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePicture} /><button type="button" onClick={() => imageInputRef.current?.click()} disabled={!settings.images_enabled || recording} className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-300 text-teal-800 disabled:text-slate-300" aria-label="Attach picture" title="Attach picture"><ImagePlus size={20} /></button>{recording ? <button type="button" onClick={stopRecording} className="grid h-11 min-w-11 shrink-0 place-items-center rounded-md bg-rose-700 px-2 text-white" aria-label="Stop voice recording" title="Stop voice recording"><Square size={17} /><span className="sr-only">{formatDuration(recordingSeconds)}</span></button> : <button type="button" onClick={startRecording} disabled={!settings.audio_enabled} className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-300 text-teal-800 disabled:text-slate-300" aria-label="Record voice note" title="Record voice note"><Mic size={20} /></button>}<label className="min-w-0 flex-1"><span className="sr-only">Message {channel}</span><input className="field h-11 py-3" value={body} maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder={recording ? `Recording ${formatDuration(recordingSeconds)}` : replyTo ? `Reply to ${replyTo.author}` : "Write a message"} disabled={recording} /></label><button className="btn-primary h-11 w-11 shrink-0 px-0" aria-label="Send message" disabled={recording || (!body.trim() && !attachment)}><Send size={18} /></button></form>}
        </section>
      </div>
    </main>
  );
}

function ForumMessage({ message, mine, density, openedUrl, opening, onOpenOnce, onDismiss, onReply, onReport, onDelete }) {
  const mediaUrl = openedUrl || message.media_url;
  const [actionsOpen, setActionsOpen] = useState(false);
  const pressTimer = useRef(null);
  useEffect(() => () => clearTimeout(pressTimer.current), []);
  function startPress() { clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => setActionsOpen(true), 550); }
  function endPress() { clearTimeout(pressTimer.current); }
  const compact = density === "compact";
  return <article className={`flex ${mine ? "justify-end" : "justify-start"}`}><div onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); setActionsOpen(true); }} className={`relative max-w-[92%] rounded-md sm:max-w-[76%] ${compact ? "px-3 py-2" : "px-4 py-3"} ${mine ? "bg-teal-700 text-white" : "bg-slate-100 text-navy"}`}>{message.parent_message_id && <div className={`border-l-2 pl-2 text-xs ${compact ? "mb-1" : "mb-2"} ${mine ? "border-white/60 text-white/80" : "border-teal-700 text-slate-500"}`}><b>{message.parent_author}</b><p className="truncate">{message.parent_body || "Media"}</p></div>}<div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-[11px] font-bold opacity-75">{message.author}{message.real_author_name && message.real_author_name !== message.author ? ` | ${message.real_author_name}` : ""}</p><time className="shrink-0 text-[10px] opacity-60" dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time><button type="button" onClick={() => setActionsOpen((open) => !open)} className="grid h-6 w-6 shrink-0 place-items-center opacity-60 hover:opacity-100" aria-label="Message actions" title="Message actions"><MoreHorizontal size={15} /></button></div>{message.body && <p className={`mt-0.5 whitespace-pre-wrap break-words ${compact ? "text-xs leading-5" : "text-sm leading-6"}`}>{message.body}</p>}{mediaUrl && message.message_type === "image" && <div className={compact ? "mt-2" : "mt-3"}><img src={mediaUrl} alt="Forum attachment" className={`${compact ? "max-h-56" : "max-h-80"} w-full rounded-md object-contain`} />{openedUrl && <button onClick={() => onDismiss(message.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold"><EyeOff size={14} /> Dismiss</button>}</div>}{mediaUrl && message.message_type === "audio" && <audio className={`${compact ? "mt-2" : "mt-3"} w-full min-w-52`} controls src={mediaUrl} onEnded={() => openedUrl && onDismiss(message.id)} />}{message.can_open_once && <button onClick={() => onOpenOnce(message)} disabled={opening} className={`mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${mine ? "border-white/40" : "border-teal-700 text-teal-800"}`}><Eye size={16} />{opening ? "Opening..." : message.message_type === "audio" ? "Play voice note once" : "Open photo once"}</button>}{message.media_viewed && !openedUrl && <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold opacity-60"><EyeOff size={15} /> View-once media opened</p>}{message.view_once && message.media_url && <p className="mt-1 text-[10px] font-bold opacity-60">View once</p>}{actionsOpen && <div className={`mt-2 flex flex-wrap gap-3 border-t pt-2 text-xs font-bold ${mine ? "border-white/30" : "border-slate-300"}`}><button onClick={() => { onReply(message); setActionsOpen(false); }} className="inline-flex items-center gap-1"><Reply size={13} /> Reply</button>{mine && <button onClick={() => { onDelete(message); setActionsOpen(false); }} className="inline-flex items-center gap-1" aria-label="Delete message"><Trash2 size={13} /> Delete</button>}{!mine && message.user_id !== "system" && <button onClick={() => { onReport(message); setActionsOpen(false); }} className="inline-flex items-center gap-1"><Flag size={13} /> Report</button>}<button onClick={() => setActionsOpen(false)} className="ml-auto opacity-70" aria-label="Close message actions"><X size={13} /></button></div>}</div></article>;
}

function mergeMessages(current, incoming) {
  const seen = new Set(current.map((message) => message.id));
  return [...current, ...incoming.filter((message) => !seen.has(message.id))];
}

function formatDuration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === today.toDateString() ? time : `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}
