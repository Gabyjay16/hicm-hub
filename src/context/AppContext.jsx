import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, patchJson, postJson, setCsrfToken } from "../utils/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [channels, setChannels] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function refreshSession() {
    const data = await api("/session");
    setSession(data.session);
    setCsrfToken(data.session?.csrfToken || "");
    setCandidates(data.candidates || []);
    setChannels(data.channels || []);
    setLoading(false);
    return data.session;
  }

  useEffect(() => {
    refreshSession().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    const expired = () => { setSession(null); setCsrfToken(""); setSessionExpired(true); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("hicm:session-expired", expired);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("hicm:session-expired", expired);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return undefined;
    }
    refreshNotifications().catch(() => {});
    const timer = setInterval(() => refreshNotifications().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);

  async function refreshNotifications() {
    const data = await api("/notifications");
    setUnreadCount(data.unread || 0);
    return data;
  }

  async function authenticate(payload) {
    const data = await postJson("/auth", payload);
    setSession(data.session);
    setCsrfToken(data.session?.csrfToken || "");
    setSessionExpired(false);
    setAuthOpen(false);
    setToast(`Signed in as ${data.session.user.name}`);
  }

  async function logout() {
    await postJson("/logout", {});
    setSession(null);
    setCsrfToken("");
    setToast("Signed out");
  }

  async function toggleRole() {
    if (!session) {
      setAuthOpen(true);
      return;
    }
    const next = session.viewRole === "staff" ? "student" : "staff";
    const data = await patchJson("/session/role", { viewRole: next });
    setSession(data.session);
    setToast(`${data.session.viewRole === "staff" ? "Staff" : "Student"} portal enabled`);
  }

  function requireAuth() {
    if (!session) {
      setAuthOpen(true);
      return false;
    }
    return true;
  }

  const value = useMemo(() => ({
    session,
    viewRole: session?.viewRole || "student",
    user: session?.user || null,
    candidates,
    channels,
    loading,
    authOpen,
    setAuthOpen,
    authenticate,
    logout,
    toggleRole,
    requireAuth,
    refreshSession,
    refreshNotifications,
    unreadCount,
    toast,
    setToast,
    offline,
    sessionExpired,
    dismissSessionExpired: () => setSessionExpired(false),
  }), [session, candidates, channels, loading, authOpen, toast, unreadCount, offline, sessionExpired]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
