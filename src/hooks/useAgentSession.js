import { useCallback, useEffect,  useRef, useState } from "react";
import { ConflictError, getThreadState, getHistory } from "../api/client";
import { streamRun } from "../api/stream";


const newId = () => crypto.randomUUID();


const ALLOWED = {
  idle:              new Set(["send"]),
  error:             new Set(["send"]),
  streaming:         new Set(["abort"]),
  waiting_gate:      new Set(["decide"]),
  pending_execution: new Set(["finish"]),
};
export const can = (status, action) => ALLOWED[status]?.has(action) ?? false;


export function useAgentSession(threadId) {
  const [status, setStatus] = useState("idle");
  const [gate, setGate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tools, setTools] = useState([]);
  const [error, setError] = useState(null);
  const [contractErrors, setContractErrors] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [lastEventAt, setLastEventAt] = useState(null);
  const abortRef = useRef(null);
  const busyRef = useRef(false);
  const toolsRef = useRef([]);


  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  
  const updateTools = useCallback((fn) => {
    const next = fn(toolsRef.current);
    toolsRef.current = next;
    setTools(next);
  }, []);
  
  const snapshotTools = useCallback((aiMsgId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === aiMsgId ? { ...m, toolHistory: toolsRef.current } : m))
    );
  }, []);


  const appendToken = useCallback((msgId, chunk) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: m.content + chunk } : m))
    );
  }, []);


  // Wspólna obsługa zdarzeń dla wszystkich operacji uruchamiających graf
  const handleEvent = useCallback(({ type, data }, aiMsgId) => {
    setLastEventAt(Date.now());            // KAŻDE zdarzenie odświeża żywotność
    switch (type) {
      case "token": appendToken(aiMsgId, data.content ?? ""); break;
      case "gate":  snapshotTools(aiMsgId); setGate(data); setStatus("waiting_gate"); break;
      case "done":  snapshotTools(aiMsgId); setStatus("idle"); break;
      case "error": setError(data.error ?? "nieznany błąd"); setStatus("error"); break;
      case "heartbeat": break;
      case "__truncated__": setError("Strumień urwany bez zakończenia."); setStatus("error"); break;         
      case "tool_start":
        updateTools((prev) => [
          ...prev,
          {
            id: data.id ?? newId(),
            name: data.name,
            args: data.args ?? {},
            status: "running",
            result: null,
          },
        ]);
        break;
      case "tool_end":
        updateTools((prev) => {
          const i = data.id
            ? prev.findIndex((t) => t.id === data.id)
            : prev.findIndex((t) => t.name === data.name && t.status === "running");
          if (i === -1) return prev;
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: data.status === "error" ? "error" : "ok",
            result: data.result,
          };
          return next;
        });
        break;
      default:  setContractErrors((n) => n + 1);
    }
  }, [appendToken, snapshotTools, updateTools]);


  const refreshState = useCallback(async () => {
    const s = await getThreadState(threadId);
    setStatus(s.status);
    setGate(s.gate);
    return s;
  }, [threadId]);

  
  const handleStreamError = useCallback(
    async (e) => {
      try {
        if (e.name === "AbortError") {
          await refreshState();                 // przerwanie ≠ zawieszenie statusu
          return;
        }
        if (e instanceof ConflictError) {
          setError(e.detail);
          await refreshState();
          return;
        }
        setError(e.message);
        setStatus("error");
      } catch {
        setError("Nie udało się odświeżyć stanu wątku.");
        setStatus("error");
      }
    },
    [refreshState]
  );


  const runStream = useCallback(
    async ({ path, body, userMsg }) => {
      if (busyRef.current) return;
      busyRef.current = true;

      const aiMsg = { id: newId(), role: "ai", content: "" };
      setMessages((prev) => [...prev, ...(userMsg ? [userMsg] : []), aiMsg]);
      setError(null);
      setGate(null);  
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamRun({
          path,
          body,
          signal: controller.signal,
          onEvent: (evt) => handleEvent(evt, aiMsg.id),
        });
      } catch (e) {
        await handleStreamError(e);
      } finally {
        abortRef.current = null;
        busyRef.current = false;
        updateTools((prev) =>
          prev.map((t) => (t.status === "running" ? { ...t, status: "unresolved" } : t))
        );
        setMessages((prev) =>
          prev.filter((m) => !(m.id === aiMsg.id && m.content === ""))   // pusty placeholder
        );
      }
    },
    [handleEvent, handleStreamError]
  );


  const send = useCallback(
    (text) => {
      if (!can(status, "send") || !text.trim()) return;  // było: if (status !== "idle" || !text.trim()) return;
      setTools([]);
      toolsRef.current = [];
      return runStream({
        path: "/chat/stream",
        body: { thread_id: threadId, message: text },
        userMsg: { id: newId(), role: "human", content: text },
      });
    },
    [status, threadId, runStream]
  );


  const decide = useCallback(
    (action, note) => {
      if (!can(status, "decide")) return;  //było: if (status !== "waiting_gate") return;
      return runStream({
        path: `/threads/${encodeURIComponent(threadId)}/resume`,
        body: { thread_id: threadId, action, note: note || null },
      });
    },
    [status, threadId, runStream]
  );  
  
  
  const finish = useCallback(() => {
    if (!can(status, "finish")) return;
    return runStream({ path: `/threads/${encodeURIComponent(threadId)}/finish` });
  }, [status, threadId, runStream]);


  const abort = useCallback(() => abortRef.current?.abort(), []);


  const openThread = useCallback(async () => {
    abortRef.current?.abort();
    setMessages([]);
    setTools([]);
    toolsRef.current = [];
    setGate(null);
    setError(null);
    setContractErrors(0);

    try {
      const s = await getThreadState(threadId);      // 1. CZY coś czeka
      setStatus(s.status);
      setGate(s.gate);

      const h = await getHistory(threadId);          // 2. historia
      if (busyRef.current) return;  
      setMessages(
        (h.messages ?? []).map((m) => ({ id: newId(), role: m.role, content: m.content }))
      );
    } catch (e) {
      if (e instanceof TypeError || e instanceof ReferenceError) {
        console.error("Błąd klienta (bug):", e);   
      }
      setError(e.message);
      setStatus("error");
    }
  }, [threadId]);

  useEffect(() => {
    if (threadId) openThread();
  }, [threadId, openThread]);
  

  const liveness =
  status !== "streaming" || !lastEventAt ? "idle"
  : now - lastEventAt > 45000 ? "red"
  : now - lastEventAt > 20000 ? "yellow"
  : "green";

  return {
    status,
    gate,
    messages,
    tools,
    error,
    contractErrors,
    liveness,
    send,
    decide,
    finish,
    refreshState,
    abort, 
    openThread,
    canExecute: (action) => can(status, action)
  };
}