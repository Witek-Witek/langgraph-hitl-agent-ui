const API = import.meta.env.VITE_API_URL;

export class ConflictError extends Error {
  constructor(detail) {
    super(detail || "Operacja niezgodna ze stanem wątku.");
    this.name = "ConflictError";
    this.detail = detail;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    throw new ConflictError(body.detail);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function mapThreadState(raw) {
  const kind = raw.pending_kind;
  return {
    status:
      kind === "gate" ? "waiting_gate" :
      kind === "execution" ? "pending_execution" :
      "idle",
    gate: raw.gate ?? null,
    pendingNode: raw.pending_node ?? null,
    sideEffectsPossible: Boolean(raw.side_effects_possible),
  };
}

export const getHealth = () => request(`/health`);

export const getThreadState = (id) =>
  request(`/threads/${encodeURIComponent(id)}/state`).then(mapThreadState);

export const getHistory = (id) =>
  request(`/threads/${encodeURIComponent(id)}/history`);

export const getOptions = () => request("/config/options");