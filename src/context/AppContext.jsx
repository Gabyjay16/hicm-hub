import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, patchJson, postJson } from "../utils/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [channels, setChannels] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function refreshSession() {
    const data = await api("/session");
    setSession(data.session);
    setCandidates(data.candidates || []);
    setChannels(data.channels || []);
    setLoading(false);
    return data.session;
  }

  useEffect(() => {
    refreshSession().catch(() => setLoading(false));
  }, []);

  async function authenticate(payload) {
    const data = await postJson("/auth", payload);
    setSession(data.session);
    setAuthOpen(false);
    setToast(`Signed in as ${data.session.user.name}`);
  }

  async function logout() {
    await postJson("/logout", {});
    setSession(null);
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
    toast,
    setToast,
  }), [session, candidates, channels, loading, authOpen, toast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
