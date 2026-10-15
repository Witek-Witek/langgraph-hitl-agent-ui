import { useEffect, useRef, useState } from "react";
import { useAgentSession, can } from "./hooks/useAgentSession";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { GatePanel } from "./components/GatePanel";
import { StatusBar } from "./components/StatusBar";
import { useConfigOptions } from "./hooks/useConfigOptions";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAuth } from "./hooks/useAuth";
import { LoginPanel } from "./components/LoginPanel";
import { listThreads, createThread } from "./api/client";
import { ThreadPicker } from "./components/ThreadPicker";


function AgentApp({ session, onSignOut }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("agent.settings"));
      return { profile: "", persona: "", ...(raw ?? {}) };
    } catch { return { profile: "", persona: "" }; }
  });

  const [threads, setThreads] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [threadsError, setThreadsError] = useState(null);
  const initRef = useRef(false);
  const lastKey = `agent.lastThread.${session.user.id}`;

  useEffect(() => {
    if (initRef.current) return;          // StrictMode zachowuje ref między podwójnym montażem
    initRef.current = true;
    (async () => {
      try {
        let list = await listThreads();
        if (!list.length) list = [await createThread("Wątek 1")];
        setThreads(list);
        setThreadsError(null);
        const last = localStorage.getItem(lastKey);
        setCurrentId(list.some((t) => t.id === last) ? last : list[0].id);
      } catch (e) {
        if (String(e.message).startsWith("HTTP 401")) { onSignOut(); return; }
        setThreadsError(e.message ?? "Nie udało się pobrać listy wątków.");
      }
    })();
  }, [lastKey, onSignOut]);

  useEffect(() => {
    if (currentId) try { localStorage.setItem(lastKey, currentId); } catch { /* wygoda */ }
  }, [currentId, lastKey]);

  const newThread = async () => {
    const t = await createThread(`Wątek ${threads.length + 1}`);
    setThreads((prev) => [t, ...prev]);
    setCurrentId(t.id);
  };

  const mainRef = useRef(null);
  const stickRef = useRef(true);          // czy trzymać się dołu


  const s = useAgentSession(currentId, settings);
  const { options, mismatch } = useConfigOptions();

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem("agent.settings", JSON.stringify(next)); } catch { /* wygoda, nie wymóg */ }
  };


  // Klucz z localStorage może już nie istnieć w katalogu serwera → 422 przy pierwszym send.
  useEffect(() => {
    if (!options) return;
    const ok = (list = [], v) => !v || list.some((x) => x.key === v);
    const p = ok(options.profiles, settings.profile) ? settings.profile : "";
    const s2 = ok(options.personas, settings.persona) ? settings.persona : "";
    if (p !== settings.profile || s2 !== settings.persona) updateSettings({ profile: p, persona: s2 });
  }, [options]);   // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      // 150 px zapasu — użytkownik "jest przy dole" także tuż nad nim
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (el && stickRef.current) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: s.status === "streaming" ? "auto" : "smooth",
      });
    }
  }, [s.messages, s.status]);

  useEffect(() => {
    if (!s.gate) return;
    stickRef.current = true;
    const el = mainRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [s.gate]);


  // const newThread = () => {
  //   const t = { id: crypto.randomUUID(), label: `Wątek ${threads.length + 1}` };
  //   const next = [t, ...threads];
  //   setThreads(next);
  //   saveThreads(next);
  //   setCurrentId(t.id);
  // };

  // const mainRef = useRef(null);

  // useEffect(() => {
  //   const el = mainRef.current;
  //   el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  // }, [s.messages, s.gate]);

  const turnInProgress = s.status === "streaming" || s.status === "waiting_gate";


  return (
    <div className="app">
      <header className="app__head">
        <ThreadPicker
          threads={threads}
          current={currentId}
          onOpen={setCurrentId}
          onNew={newThread}
        />
        {threadsError && (
          <span className="statusbar__error">{threadsError}</span>
        )}
        <SettingsPanel 
          options={options} 
          {...settings} 
          onChange={updateSettings}
          disabled={turnInProgress} 
        />
        <button className="btn btn--ghost" onClick={onSignOut}>Wyloguj</button>
      </header>

      <main className="app__main" ref={mainRef}>
        <MessageList messages={s.messages} liveTools={s.tools}/>
        <GatePanel
          gate={s.gate}
          onDecide={s.decide}
          disabled={!can(s.status, "decide")}
        />
      </main>

      <footer className="app__foot">
        <Composer status={s.status} onSend={s.send} onAbort={s.abort} />
        <StatusBar
          status={s.status}
          liveness={s.liveness}
          error={s.error}
          contractErrors={s.contractErrors}
          threadId={currentId}
          onFinish={s.finish}
          mismatch={mismatch}
        />
      </footer>
    </div>
  );
}


export default function App() {
  const { session, ready, signIn, signOut } = useAuth();
  if (!ready) return null;
  if (!session) return <LoginPanel onSignIn={signIn} />;
  return <AgentApp key={session.user.id} session={session} onSignOut={signOut} />;
}
