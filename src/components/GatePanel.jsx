import { useState } from "react";

export function GatePanel({ gate, onDecide, disabled }) {
  const [note, setNote] = useState("");
  if (!gate) return null;

  const calls = gate.calls ?? [];

  return (
    <div className="gate">
      <div className="gate__question">{gate.question ?? "Wymagana decyzja."}</div>

      <ul className="gate__calls">
        {calls.map((c, i) => (
          <li key={c.id ??`${c.name}-${i}`} className={c.sensitive ? "call call--sensitive" : "call"}>
            {c.sensitive && <span className="call__mark" title="Operacja wrażliwa">⚠</span>}
            <code>{c.name}</code>
            <pre className="call__args">{JSON.stringify(c.args ?? {}, null, 2)}</pre>
          </li>
        ))}
      </ul>

      <textarea
        className="gate__note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notatka (opcjonalna, dołączana przy odmowie)"
        rows={2}
        disabled={disabled}
      />

      <div className="gate__actions">
        <button
          className="btn btn--approve"
          onClick={() => onDecide("approve", note)}
          disabled={disabled}
        >
          Zatwierdź
        </button>
        <button
          className="btn btn--reject"
          onClick={() => onDecide("reject", note)}
          disabled={disabled}
        >
          Odrzuć
        </button>
      </div>
    </div>
  );
}