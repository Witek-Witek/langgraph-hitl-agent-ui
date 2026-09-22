import { useEffect, useState } from "react";
import { useAgentSession, can } from "./hooks/useAgentSession";
import { ThreadPicker, loadThreads, saveThreads } from "./components/ThreadPicker";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { GatePanel } from "./components/GatePanel";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const [threads, setThreads] = useState(() => {
    const saved = loadThreads();
    if (saved.length) return saved;
    const first = [{ id: crypto.randomUUID(), label: "Wątek 1" }];
    saveThreads(first);
    return first;
  });
  const [currentId, setCurrentId] = useState(() => threads[0].id);

  const newThread = () => {
    const t = { id: crypto.randomUUID(), label: `Wątek ${threads.length + 1}` };
    const next = [t, ...threads];
    setThreads(next);
    saveThreads(next);
    setCurrentId(t.id);
  };

  const s = useAgentSession(currentId);

  return (
    <div className="app">
      <header className="app__head">
        <ThreadPicker
          threads={threads}
          current={currentId}
          onOpen={setCurrentId}
          onNew={newThread}
        />
      </header>

      <main className="app__main">
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
        />
      </footer>
    </div>
  );
}