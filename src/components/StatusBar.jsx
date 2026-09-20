const STATUS_LABEL = {
  idle: "gotowy",
  streaming: "agent pracuje",
  waiting_gate: "czeka na decyzję",
  pending_execution: "niedokończone wykonanie",
  error: "błąd",
};

const LIVENESS_LABEL = {
  green: "połączenie aktywne",
  yellow: "brak odpowiedzi > 20 s",
  red: "brak odpowiedzi > 45 s",
};

export function StatusBar({ status, liveness, error, contractErrors, threadId, onFinish }) {
  return (
    <div className="statusbar">
      <span className={`statusbar__status statusbar__status--${status}`}>
        {STATUS_LABEL[status] ?? status}
      </span>

      {liveness !== "idle" && (
        <span className={`statusbar__live statusbar__live--${liveness}`} title={LIVENESS_LABEL[liveness]}>
          ●
        </span>
      )}

      <span className="statusbar__thread">wątek: {threadId}</span>

      {status === "pending_execution" && (
        <button className="btn btn--small" onClick={onFinish}>Dokończ</button>
      )}

      {error && <span className="statusbar__error">{error}</span>}

      {contractErrors > 0 && (
        <span className="statusbar__contract" title="Zdarzenia spoza kontraktu — pominięte">
          kontrakt: {contractErrors}
        </span>
      )}
    </div>
  );
}