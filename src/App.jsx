import { useEffect, useRef, useState } from "react";
import { useAgentSession, can } from "./hooks/useAgentSession";
import { ThreadPicker, loadThreads, saveThreads } from "./components/ThreadPicker";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { GatePanel } from "./components/GatePanel";
import { StatusBar } from "./components/StatusBar";
import { useConfigOptions } from "./hooks/useConfigOptions";
import { SettingsPanel } from "./components/SettingsPanel";

export default function App() {
  const [threads, setThreads] = useState(() => {
    const saved = loadThreads();
    if (saved.length) return saved;
    const first = [{ id: crypto.randomUUID(), label: "Wątek 1" }];
    saveThreads(first);
    return first;
  });
  const [currentId, setCurrentId] = useState(() => threads[0].id);
  const [settings, setSettings] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("agent.settings"));
      return { profile: "", persona: "", ...(raw ?? {}) };
    } catch { return { profile: "", persona: "" }; }
  });

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
      // 40 px zapasu — użytkownik "jest przy dole" także tuż nad nim
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


  const newThread = () => {
    const t = { id: crypto.randomUUID(), label: `Wątek ${threads.length + 1}` };
    const next = [t, ...threads];
    setThreads(next);
    saveThreads(next);
    setCurrentId(t.id);
  };

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
        <SettingsPanel 
          options={options} 
          {...settings} 
          onChange={updateSettings}
          disabled={turnInProgress} 
        />
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