import { useState } from "react";
import { can } from "../hooks/useAgentSession";

const HINT = {
  streaming: "Agent odpowiada…",
  waiting_gate: "Wątek czeka na Twoją decyzję.",
  pending_execution: "Wątek ma niedokończone wykonanie — dokończ albo zacznij nowy.",
};

export function Composer({ status, onSend, onAbort }) {
  const [text, setText] = useState("");
  const enabled = can(status, "send");

  const submit = () => {
    console.log("submit:", { status, enabled, text });
    if (!enabled || !text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="composer">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={!enabled}
        placeholder={enabled ? "Napisz wiadomość…" : HINT[status] ?? ""}
        rows={3}
      />
      {can(status, "abort") ? (
        <button onClick={onAbort} className="btn btn--stop">Stop</button>
      ) : (
        <button onClick={submit} disabled={!enabled || !text.trim()} className="btn">
          Wyślij
        </button>
      )}
    </div>
  );
}