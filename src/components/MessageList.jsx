import { useState } from "react";

const asText = (c) =>
  typeof c === "string" ? c
  : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text).join("")
  : "";

function ToolHistory({ tools }) {
  const [open, setOpen] = useState(false);
  if (!tools?.length) return null;

  return (
    <div className="tool-history">
      <button className="link" onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} narzędzia ({tools.length})
      </button>
      {open && (
        <ul>
          {tools.map((t) => (
            <li key={t.id} className={`tool tool--${t.status}`}>
              <code>{t.name}</code>
              <span className="tool__args">{JSON.stringify(t.args)}</span>
              {t.result && <span className="tool__result">
                {typeof t.result === "object" ? JSON.stringify(t.result) : t.result}
                </span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MessageList({ messages, liveTools }) {
  const lastAiId = messages.findLast((m) => m.role === "ai")?.id;


  return (
    <div className="messages">
      {messages.map((m) => (
        <div key={m.id} className={`bubble bubble--${m.role}`}>
          <div className="bubble__content">{asText(m.content)}</div>
          {m.role === "ai" && (
            <ToolHistory tools={m.toolHistory ?? (m.id === lastAiId ? liveTools : null)} />
          )}
        </div>
      ))}
    </div>
  );
}