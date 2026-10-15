// const KEY = "agent.threads";

// export function loadThreads() {
//   try {
//     return JSON.parse(localStorage.getItem(KEY)) ?? [];
//   } catch {
//     return [];
//   }
// }

// export function saveThreads(threads) {
//   try {
//     localStorage.setItem(KEY, JSON.stringify(threads));
//   } catch {
//     /* quota / tryb prywatny — lista wątków jest wygodą, nie wymogiem */
//   }
// }

export function ThreadPicker({ threads, current, onOpen, onNew }) {
  return (
    <div className="threads">
      <select value={current ?? ""} onChange={(e) => onOpen(e.target.value)}>
        {threads.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
      <button className="btn btn--small" onClick={onNew}>Nowy wątek</button>
    </div>
  );
}