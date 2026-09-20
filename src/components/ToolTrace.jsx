const LABEL = {
  running: "w toku",
  ok: "wykonane",
  error: "błąd",
  unresolved: "nierozstrzygnięte",
};

export function ToolTrace({ tools }) {
  if (!tools?.length) return null;

  return (
    <div className="trace">
      {tools.map((t) => (
        <div key={t.id} className={`trace__item trace__item--${t.status}`}>
          <code>{t.name}</code>
          <span className="trace__status">{LABEL[t.status]}</span>
          {t.result && <span className="trace__result">{t.result}</span>}
        </div>
      ))}
    </div>
  );
}